"""
Unit & Evidentiary Integrity Tests for Component 4 (Ledger & PKI Engine)
Verifies Section 65B Indian Evidence Act compliance, non-repudiation,
and Merkle Tree immutability proofs.
"""

import hashlib
import pytest
from cryptography.exceptions import InvalidSignature
from ledger import PKIEngine, MerkleTree, AuditLog


def test_non_repudiation_pki():
    """
    Validates Ed25519 PKI digital signature non-repudiation.
    Verifies that an Investigating Officer's signature validates correctly
    on authentic document hashes and strictly fails on altered document hashes.
    """
    # 1. Generate IO's Ed25519 keypair
    io_private_key_pem, io_public_key_pem = PKIEngine.generate_keypair()
    assert b"BEGIN PRIVATE KEY" in io_private_key_pem
    assert b"BEGIN PUBLIC KEY" in io_public_key_pem

    # 2. Mock Document Hash (e.g. Charge Sheet SHA-256)
    charge_sheet_content = b"STATE vs ACCUSED - Final Charge Sheet U/S 316 BNS, IPC 420. FIR No: 45/2024."
    doc_hash = hashlib.sha256(charge_sheet_content).hexdigest()

    # 3. Sign the document hash
    signature = PKIEngine.sign_payload(
        private_key_pem=io_private_key_pem,
        payload=doc_hash.encode("utf-8"),
    )
    assert isinstance(signature, bytes)
    assert len(signature) == 64  # Ed25519 signatures are 64 bytes

    # 4. Verify authentic signature
    is_valid = PKIEngine.verify_signature(
        public_key_pem=io_public_key_pem,
        signature=signature,
        payload=doc_hash.encode("utf-8"),
    )
    assert is_valid is True

    # 5. Tamper with the document hash by altering 1 character
    tampered_doc_hash = doc_hash[:-1] + ("0" if doc_hash[-1] != "0" else "1")
    assert tampered_doc_hash != doc_hash

    # 6. Assert verification fails on tampered payload
    with pytest.raises(InvalidSignature):
        PKIEngine.verify_signature(
            public_key_pem=io_public_key_pem,
            signature=signature,
            payload=tampered_doc_hash.encode("utf-8"),
        )


def test_merkle_immutability_proof():
    """
    Validates Merkle Tree cryptographic immutability.
    Proves that altering historical transaction records at index 0
    mathematically alters the root hash, triggering system-wide tamper detection.
    """
    # 1. Initialize Merkle Tree
    tree = MerkleTree()

    # 2. Append 3 distinct transaction records
    tx1 = "FIR_CREATED: Case-2024-CR-001 | Police Station: Central | Date: 2024-01-10"
    tx2 = "WITNESS_STATEMENT: Witness #1 statement recorded under Section 161 CrPC"
    tx3 = "EVIDENCE_UPLOADED: CCTV Footage Hash sha256:e3b0c44298fc1c149afbf4c8996fb924"

    leaf1 = tree.append_leaf(tx1)
    leaf2 = tree.append_leaf(tx2)
    leaf3 = tree.append_leaf(tx3)

    assert len(tree.leaves) == 3
    assert leaf1 == hashlib.sha256(tx1.encode("utf-8")).hexdigest()

    # 3. Compute baseline Merkle Root
    baseline_root = tree.get_root()
    assert isinstance(baseline_root, str)
    assert len(baseline_root) == 64

    # 4. Simulate a database compromise: Alter transaction 0 in the ledger
    compromised_tx1 = "FIR_CREATED: Case-2024-CR-001 | Accused Name Altered | Date: 2024-01-10"
    compromised_leaf1 = hashlib.sha256(compromised_tx1.encode("utf-8")).hexdigest()

    # Tamper with leaf 0
    tree.leaves[0] = compromised_leaf1

    # 5. Calculate compromised root
    compromised_root = tree.get_root()

    # 6. Mathematically assert root change
    assert baseline_root != compromised_root, (
        "Merkle Root must change if any historical transaction is altered."
    )


def test_audit_log_workflow():
    """
    Validates the integrated AuditLog workflow with signature verification and root chaining.
    """
    audit_log = AuditLog()
    io_priv, io_pub = PKIEngine.generate_keypair()

    doc_hash = hashlib.sha256(b"Forensic Report Serial 892").hexdigest()
    sig = PKIEngine.sign_payload(io_priv, doc_hash.encode("utf-8"))

    # Log action successfully
    leaf_hash = audit_log.log_action(
        doc_hash=doc_hash,
        signature=sig,
        user_pub_key=io_pub,
        action="FORENSIC_EVIDENCE_ATTACHED",
        metadata={"badge_number": "POLICE-9021"},
    )
    assert leaf_hash is not None
    assert len(audit_log.entries) == 1

    root = audit_log.get_ledger_root()
    assert root == leaf_hash  # Single leaf root is the leaf hash itself

    # Tampered signature should be rejected before appending to ledger
    tampered_sig = bytes([(b + 1) % 256 for b in sig])
    with pytest.raises(InvalidSignature):
        audit_log.log_action(
            doc_hash=doc_hash,
            signature=tampered_sig,
            user_pub_key=io_pub,
            action="TAMPERED_EVENT",
        )
    # Ensure invalid entry was not appended
    assert len(audit_log.entries) == 1
