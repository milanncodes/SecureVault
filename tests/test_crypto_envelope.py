"""
SecureVault: Phase 2 Test Suite – Component 1
Verification of AES-256-GCM Cryptographic Envelope and MinIO Storage Engine.
Ensures zero-knowledge, bit-level integrity, and tamper-resistance compliant with
Bharatiya Sakshya Adhiniyam (BSA), 2023 & Section 65B Indian Evidence Act.
"""

import os
import pytest
from cryptography.exceptions import InvalidTag
from crypto_vault import CryptoStorageVault, IntegrityError


@pytest.fixture(scope="module")
def vault_client():
    """Initializes the CryptoStorageVault connected to the containerized MinIO service."""
    return CryptoStorageVault()


def test_roundtrip_integrity(vault_client: CryptoStorageVault):
    """
    Test 1: Round-Trip Integrity Verification.
    Generates a realistic synthetic legal FIR / evidentiary charge-sheet document payload,
    computes the baseline SHA-256 hash, seals it within an AES-256-GCM envelope,
    persists it into MinIO S3 object storage, then downloads, decrypts, and verifies bit-for-bit parity.
    """
    # 1. Synthetic multi-page police investigation FIR document
    mock_fir_document = (
        b"CONFIDENTIAL LEGAL EVIDENCE -- FIRST INFORMATION REPORT (FIR)\n"
        b"Case Reference: DL-CR-2024-00891\n"
        b"Police Station: Cyber Crime Investigation Division, New Delhi\n"
        b"Statutory Jurisdiction: Bharatiya Nyaya Sanhita (BNS) Sec 103, 316 / IT Act Sec 66D\n"
        b"Complainant: Registrar General, High Court of Delhi\n"
        b"Seized Hardware Evidence: 1x NVMe SSD, Serial No: WDX-9948210\n"
        b"Forensic Custodian: Insp. Vikram Singh (Badge #DL-8821)\n"
        b"------------------------------------------------------------------------\n"
        b"PRELIMINARY INVESTIGATION FINDINGS:\n"
        b"Digital ledger records extracted from seized storage indicate unauthorized\n"
        b"system access attempts logged at UTC 2026-09-15T18:22:00Z.\n"
        b"All cryptographic signatures matched known threat actor public key.\n"
        b"------------------------------------------------------------------------\n"
        + (b"EVIDENTIARY LOG BLOCK DATA STREAM: " + os.urandom(2048) + b"\n") * 5
    )

    # 2. Compute baseline SHA-256
    baseline_sha256 = vault_client.compute_sha256(mock_fir_document)
    assert len(baseline_sha256) == 64, "SHA-256 digest must be 64 hex characters"

    # 3. Encrypt payload
    ciphertext, metadata = vault_client.encrypt_payload(mock_fir_document)
    assert ciphertext != mock_fir_document, "Ciphertext must never match plaintext"
    assert metadata["original_sha256"] == baseline_sha256
    assert "nonce" in metadata and "dek" in metadata

    # 4. Upload sealed envelope to MinIO
    object_key = "cases/DL-CR-2024-00891/fir_evidence_sealed.enc"
    upload_status = vault_client.upload_envelope(object_key, ciphertext, metadata)
    assert upload_status is True, "Upload to MinIO must succeed"

    # 5. Download sealed envelope from MinIO
    downloaded_ciphertext, downloaded_meta = vault_client.download_envelope(object_key)
    assert downloaded_ciphertext == ciphertext, "Downloaded ciphertext must match uploaded bytes"

    # 6. Decrypt and verify payload
    nonce_bytes = bytes.fromhex(metadata["nonce"])
    dek_bytes = bytes.fromhex(metadata["dek"])

    decrypted_bytes = vault_client.decrypt_payload(
        ciphertext=downloaded_ciphertext,
        nonce=nonce_bytes,
        dek=dek_bytes,
        expected_sha256=metadata["original_sha256"],
    )

    # 7. Assertions: Bit-for-bit equality and SHA-256 chain of custody match
    assert decrypted_bytes == mock_fir_document, "Decrypted document must match original bit-for-bit"
    post_sha256 = vault_client.compute_sha256(decrypted_bytes)
    assert post_sha256 == baseline_sha256, "Pre-encryption and post-decryption SHA-256 hashes must match perfectly"


def test_tamper_detection(vault_client: CryptoStorageVault):
    """
    Test 2: Cryptographic Tamper Detection (1-Bit Attack & Auth Tag Verification).
    Simulates a rogue actor or corrupt storage admin attempting to modify 1 single bit
    in the encrypted MinIO blob. Asserts that AES-256-GCM authentication detects the tamper
    and immediately raises InvalidTag, preventing corrupted evidence from being decrypted.
    """
    # 1. Create sensitive deposition transcript
    deposition_text = (
        b"WITNESS DEPOSITION UNDER SECTION 164 CrPC / SECTION 183 BNSS:\n"
        b"Witness: Rajesh Sharma, Lead Database Administrator\n"
        b"Statement: I confirm that access logs from 2026-09-10 were modified by account 'admin_root'.\n"
    )
    baseline_sha256 = vault_client.compute_sha256(deposition_text)

    # 2. Encrypt and upload
    ciphertext, metadata = vault_client.encrypt_payload(deposition_text)
    object_key = "cases/DL-CR-2024-00891/witness_deposition_sealed.enc"
    vault_client.upload_envelope(object_key, ciphertext, metadata)

    # 3. Retrieve object and intentionally flip 1 bit in ciphertext (simulating storage tamper)
    retrieved_ciphertext, _ = vault_client.download_envelope(object_key)
    corrupted_bytes = bytearray(retrieved_ciphertext)

    # Invert the lowest bit of the 10th byte in ciphertext
    corrupted_bytes[10] ^= 0x01
    corrupted_ciphertext = bytes(corrupted_bytes)

    # 4. Re-upload corrupted ciphertext to MinIO
    vault_client.upload_envelope(object_key, corrupted_ciphertext, metadata)

    # 5. Fetch tampered blob and attempt decryption
    tampered_download, _ = vault_client.download_envelope(object_key)
    nonce_bytes = bytes.fromhex(metadata["nonce"])
    dek_bytes = bytes.fromhex(metadata["dek"])

    # 6. Assert: AES-GCM must reject the tampered payload with InvalidTag
    with pytest.raises(InvalidTag):
        vault_client.decrypt_payload(
            ciphertext=tampered_download,
            nonce=nonce_bytes,
            dek=dek_bytes,
            expected_sha256=metadata["original_sha256"],
        )


def test_sha256_mismatch_integrity_error(vault_client: CryptoStorageVault):
    """
    Test 3: Baseline SHA-256 Mismatch Handling.
    Ensures that if expected_sha256 differs from decrypted payload (e.g. metadata tampering),
    IntegrityError is explicitly raised.
    """
    payload = b"FORENSIC BALLISTICS REPORT: Fired cartridge matches firearm Exhibit A-14."
    ciphertext, metadata = vault_client.encrypt_payload(payload)

    nonce_bytes = bytes.fromhex(metadata["nonce"])
    dek_bytes = bytes.fromhex(metadata["dek"])
    wrong_expected_sha256 = "0" * 64

    with pytest.raises(IntegrityError) as exc_info:
        vault_client.decrypt_payload(
            ciphertext=ciphertext,
            nonce=nonce_bytes,
            dek=dek_bytes,
            expected_sha256=wrong_expected_sha256,
        )

    assert "Payload integrity compromised" in str(exc_info.value)
