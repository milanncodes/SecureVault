"""
Cryptographic Ledger & Audit Engine (Component 4)
Provides RFC 6962-inspired Merkle Tree structures and Ed25519 PKI digital signatures
for tamper-evident audit logging and Section 65B Indian Evidence Act compliance.
"""

import hashlib
import json
from typing import Any, Dict, List, Optional, Tuple
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization
from cryptography.exceptions import InvalidSignature


class PKIEngine:
    """Ed25519 Public Key Infrastructure (PKI) Engine for non-repudiation."""

    @staticmethod
    def generate_keypair() -> Tuple[bytes, bytes]:
        """
        Generates an Ed25519 keypair and serializes them as PEM formatted bytes.
        
        Returns:
            Tuple[bytes, bytes]: (private_key_pem, public_key_pem)
        """
        private_key = ed25519.Ed25519PrivateKey.generate()
        public_key = private_key.public_key()

        private_key_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )

        public_key_pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )

        return private_key_pem, public_key_pem

    @staticmethod
    def sign_payload(private_key_pem: bytes, payload: bytes) -> bytes:
        """
        Signs arbitrary payload bytes using an Ed25519 private key.

        Args:
            private_key_pem: Private key in PEM format.
            payload: Data bytes to be signed.

        Returns:
            bytes: Cryptographic digital signature.
        """
        private_key = serialization.load_pem_private_key(
            private_key_pem,
            password=None,
        )
        if not isinstance(private_key, ed25519.Ed25519PrivateKey):
            raise TypeError("Expected an Ed25519 private key.")

        return private_key.sign(payload)

    @staticmethod
    def verify_signature(public_key_pem: bytes, signature: bytes, payload: bytes) -> bool:
        """
        Verifies an Ed25519 signature against the payload and public key.

        Args:
            public_key_pem: Public key in PEM format.
            signature: Digital signature bytes to verify.
            payload: Original data bytes that were signed.

        Returns:
            bool: True if signature is valid.

        Raises:
            InvalidSignature: If the signature is invalid or tampered with.
        """
        public_key = serialization.load_pem_public_key(public_key_pem)
        if not isinstance(public_key, ed25519.Ed25519PublicKey):
            raise TypeError("Expected an Ed25519 public key.")

        # public_key.verify raises InvalidSignature on verification failure
        public_key.verify(signature, payload)
        return True


class MerkleTree:
    """
    Append-only RFC 6962-inspired Merkle Tree.
    Guarantees historical tamper detection through root hash verification.
    """

    def __init__(self, leaves: Optional[List[str]] = None) -> None:
        """Initializes Merkle Tree with an empty or existing list of leaf hashes."""
        self.leaves: List[str] = list(leaves) if leaves else []

    @staticmethod
    def _hash(data: bytes) -> str:
        """Computes SHA-256 hexadecimal digest of input bytes."""
        return hashlib.sha256(data).hexdigest()

    def append_leaf(self, transaction_data: str) -> str:
        """
        Hashes transaction data, appends the hash to leaves list, and returns leaf hash.

        Args:
            transaction_data: Serialized transaction or event payload.

        Returns:
            str: SHA-256 leaf hash.
        """
        leaf_hash = self._hash(transaction_data.encode("utf-8"))
        self.leaves.append(leaf_hash)
        return leaf_hash

    def get_root(self) -> str:
        """
        Computes and returns the Merkle Root of all current leaves.
        If leaves count is odd, duplicates the last leaf for pairing.
        If empty, returns the SHA-256 hash of empty bytes.

        Returns:
            str: 64-character hexadecimal Merkle Root.
        """
        if not self.leaves:
            return self._hash(b"")

        current_level: List[str] = list(self.leaves)

        while len(current_level) > 1:
            next_level: List[str] = []
            # Duplicate the last leaf if count is odd
            if len(current_level) % 2 != 0:
                current_level.append(current_level[-1])

            for i in range(0, len(current_level), 2):
                combined = current_level[i] + current_level[i + 1]
                parent_hash = self._hash(combined.encode("utf-8"))
                next_level.append(parent_hash)

            current_level = next_level

        return current_level[0]


class AuditLog:
    """
    Wrapper binding PKI non-repudiation signatures and Merkle Tree immutability.
    Verifies signatures before committing audit entries to the cryptographic ledger.
    """

    def __init__(self, merkle_tree: Optional[MerkleTree] = None) -> None:
        self.merkle_tree: MerkleTree = merkle_tree if merkle_tree is not None else MerkleTree()
        self.entries: List[Dict[str, Any]] = []

    def log_action(
        self,
        doc_hash: str,
        signature: bytes,
        user_pub_key: bytes,
        action: str = "DOCUMENT_INGESTION",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Verifies PKI signature and commits entry to the Merkle Tree.

        Args:
            doc_hash: SHA-256 hash of the document.
            signature: Digital signature of the doc_hash by the actor.
            user_pub_key: Actor's Ed25519 public key in PEM format.
            action: Action descriptor.
            metadata: Optional additional context.

        Returns:
            str: Leaf hash added to the Merkle Tree.

        Raises:
            InvalidSignature: If signature does not verify against doc_hash and pub_key.
        """
        # Verify non-repudiation signature against doc_hash payload
        PKIEngine.verify_signature(
            public_key_pem=user_pub_key,
            signature=signature,
            payload=doc_hash.encode("utf-8"),
        )

        entry_record = {
            "action": action,
            "doc_hash": doc_hash,
            "signature": signature.hex(),
            "user_pub_key": user_pub_key.decode("utf-8"),
            "metadata": metadata or {},
        }

        serialized_entry = json.dumps(entry_record, sort_keys=True)
        leaf_hash = self.merkle_tree.append_leaf(serialized_entry)
        self.entries.append(entry_record)
        return leaf_hash

    def get_ledger_root(self) -> str:
        """Returns the current Merkle Root of the audit log."""
        return self.merkle_tree.get_root()
