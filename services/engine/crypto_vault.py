"""
SecureVault: Component 1 – Cryptographic Envelope & Storage Engine
Implements zero-trust AES-256-GCM envelope encryption and MinIO S3 integration.
Complies with Bharatiya Sakshya Adhiniyam, 2023 / Section 65B forensic chain-of-custody.
"""

import os
import hashlib
from typing import Optional, Tuple, Dict, Any
import boto3
from botocore.client import Config
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.exceptions import InvalidTag


class IntegrityError(Exception):
    """Raised when decrypted payload SHA-256 does not match the recorded baseline."""
    pass


class CryptoStorageVault:
    """
    Cryptographic Envelope & Object Storage Engine.
    Guarantees that raw document plaintext never touches S3 storage or disk unencrypted.
    """

    CIPHER_VERSION = "AES-256-GCM"

    def __init__(
        self,
        endpoint_url: Optional[str] = None,
        access_key: Optional[str] = None,
        secret_key: Optional[str] = None,
        bucket_name: Optional[str] = None,
    ):
        self.endpoint_url = endpoint_url or os.getenv("S3_ENDPOINT_URL") or os.getenv("MINIO_ENDPOINT", "http://minio:9000")
        self.access_key = access_key or os.getenv("AWS_ACCESS_KEY_ID") or os.getenv("MINIO_ROOT_USER", "minio_admin")
        self.secret_key = secret_key or os.getenv("AWS_SECRET_ACCESS_KEY") or os.getenv("MINIO_ROOT_PASSWORD", "minio_secure_vault_2024")
        self.bucket_name = bucket_name or os.getenv("MINIO_DEFAULT_BUCKET", "legal-documents-vault")

        self.s3_client = boto3.client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            config=Config(signature_version="s3v4"),
            region_name="us-east-1",
        )

    @staticmethod
    def compute_sha256(data: bytes) -> str:
        """
        Computes the cryptographic SHA-256 digest of raw byte content.
        Used for statutory chain of custody (BSA / Sec 65B).
        """
        return hashlib.sha256(data).hexdigest()

    def encrypt_payload(
        self,
        plaintext_bytes: bytes,
        dek: Optional[bytes] = None,
        associated_data: Optional[bytes] = None,
    ) -> Tuple[bytes, Dict[str, Any]]:
        """
        Encrypts plaintext bytes using AES-256-GCM with a 96-bit ephemeral IV/Nonce.
        Returns the combined ciphertext (including 16-byte authentication tag) and envelope metadata.
        """
        if dek is None:
            dek = AESGCM.generate_key(bit_length=256)
        elif len(dek) != 32:
            raise ValueError("AES-256 DEK must be exactly 32 bytes (256 bits).")

        # 96-bit (12-byte) cryptographically secure pseudorandom Nonce
        nonce = os.urandom(12)
        original_sha256 = self.compute_sha256(plaintext_bytes)

        aesgcm = AESGCM(dek)
        # AESGCM.encrypt appends the 16-byte auth tag to the end of the ciphertext
        ciphertext_with_tag = aesgcm.encrypt(nonce, plaintext_bytes, associated_data)

        envelope_metadata = {
            "nonce": nonce.hex(),
            "original_sha256": original_sha256,
            "dek": dek.hex(),
            "cipher": self.CIPHER_VERSION,
        }

        return ciphertext_with_tag, envelope_metadata

    def decrypt_payload(
        self,
        ciphertext: bytes,
        nonce: bytes,
        dek: bytes,
        expected_sha256: str,
        associated_data: Optional[bytes] = None,
    ) -> bytes:
        """
        Decrypts an AES-256-GCM envelope and validates payload integrity.
        Raises InvalidTag if tampered or corrupted.
        Raises IntegrityError if decrypted SHA-256 doesn't match expected_sha256.
        """
        if len(dek) != 32:
            raise ValueError("AES-256 DEK must be exactly 32 bytes (256 bits).")
        if len(nonce) != 12:
            raise ValueError("AES-GCM Nonce must be exactly 12 bytes (96 bits).")

        aesgcm = AESGCM(dek)
        # Decrypt payload (will raise InvalidTag if tag mismatch or 1-bit corruption)
        decrypted_bytes = aesgcm.decrypt(nonce, ciphertext, associated_data)

        # Validate post-decryption SHA-256 against baseline
        computed_sha256 = self.compute_sha256(decrypted_bytes)
        if computed_sha256 != expected_sha256:
            raise IntegrityError(
                f"Payload integrity compromised! Baseline SHA-256: {expected_sha256}, "
                f"Decrypted SHA-256: {computed_sha256}"
            )

        return decrypted_bytes

    def upload_envelope(
        self,
        object_key: str,
        ciphertext: bytes,
        metadata: Dict[str, Any],
    ) -> bool:
        """
        Uploads encrypted ciphertext stream to MinIO with attached envelope metadata.
        """
        s3_metadata = {
            "nonce": str(metadata.get("nonce", "")),
            "original_sha256": str(metadata.get("original_sha256", "")),
            "cipher": str(metadata.get("cipher", self.CIPHER_VERSION)),
        }

        self.s3_client.put_object(
            Bucket=self.bucket_name,
            Key=object_key,
            Body=ciphertext,
            Metadata=s3_metadata,
            ContentType="application/octet-stream",
        )
        return True

    def download_envelope(self, object_key: str) -> Tuple[bytes, Dict[str, Any]]:
        """
        Retrieves raw ciphertext and envelope metadata from MinIO.
        """
        response = self.s3_client.get_object(
            Bucket=self.bucket_name,
            Key=object_key,
        )
        ciphertext = response["Body"].read()
        metadata = response.get("Metadata", {})
        return ciphertext, metadata
