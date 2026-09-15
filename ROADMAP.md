# Production Execution Roadmap: Secure Digital Document Management System for Legal & Investigation Documents (SecureVault)

## Executive Summary & Engineering Philosophy

**Project Title:** Secure Digital Document Management System for Legal and Investigation Documents  
**Target Environment:** EndeavourOS (Arch Linux) | Hardware Profile: Intel Core i5 / 16GB RAM  
**Target Event:** Smart India Hackathon (SIH) — Legal & Investigation Track  
**Statutory Compliance Focus:** Bharatiya Sakshya Adhiniyam, 2023 (BSA) / Section 65B Indian Evidence Act Compliance, Chain of Custody Proofs, Zero-Trust Data Isolation.

---

### Core Engineering Principles

1. **Zero System Pollution (Pure Containerization):**
   * Absolute isolation: The host OS remains untouched. Zero globally installed database daemons, OCR libraries, or Python runtime packages.
   * All state, databases, object stores, and models are mounted via deterministic local directory binds (`./data/postgres`, `./data/minio`, `./data/models`).
   * Tearing down the stack leaves zero residue on the host.

2. **Bottom-Up Isolated Verification (TDD for Systems Engineering):**
   * No component is wired into an API, worker, or UI before passing an isolated standalone Python verification harness.
   * Every component is validated against explicit cryptographic and mathematical boundary conditions (e.g., bit-flip authentication failure, invalid Merkle path rejection).

3. **Lightweight & Deterministic Architecture:**
   * Replaces resource-prohibitive enterprise bloat (e.g., multi-node Hyperledger Fabric/Kafka requiring >12GB RAM) with mathematically equivalent, audit-compliant primitives:
     * **RFC 6962-Compliant Merkle Transparency Trees** with **Ed25519** digital signatures.
     * **Alpine PostgreSQL 16** with indexed JSONB and Row-Level Security for Attribute-Based Access Control (ABAC).
     * **MinIO Object Store** utilizing local NVMe bind-mounts for encrypted S3 blobs.
     * **FastAPI Async Pipeline** using Redis/asyncio queues for zero-egress local OCR and entity recognition.

```
+----------------------------------------------------------------------------------------------------+
|                                    SECUREVAULT HIGH-LEVEL PIPELINE                                 |
+----------------------------------------------------------------------------------------------------+
                                                                                                      
 [ Client / Law Enforcement Agent ]                                                                   
                │                                                                                     
                ▼                                                                                     
 ┌──────────────────────────────┐       Pre-Hash (SHA-256)                                            
 │  Client-Side Crypto Engine   │ ─────────────────────────────┐                                      
 │  • AES-256-GCM Encryption    │                              │                                      
 │  • Ephemeral IV + Tag        │                              ▼                                      
 └──────────────┬───────────────┘                   ┌──────────────────────┐                          
                │ Encrypted Stream (Ciphertext)     │  RFC 6962 Merkle     │ ──► Ed25519 Signature    
                ▼                                   │  Audit Ledger Engine │     (Immutable Proof)    
 ┌──────────────────────────────┐                   └──────────────────────┘                          
 │  FastAPI Ingestion Gateway   │                              │                                      
 └──────────────┬───────────────┘                              │ Append Leaf Entry                    
                ├──────────────────────────────────────────────┼─────────────────────┐                
                ▼                                              ▼                     ▼                
 ┌──────────────────────────────┐                   ┌────────────────────┐ ┌────────────────────┐     
 │  MinIO Encrypted Blob Store  │                   │ PostgreSQL 16 DB   │ │ Zero-Egress OCR    │     
 │  (Isolated NVMe Bind Mount)  │                   │ • Dynamic ABAC     │ │ • Tesseract Engine │     
 └──────────────────────────────┘                   │ • Relational Audit │ │ • SpaCy NER (BNS)  │     
                                                    └────────────────────┘ └────────────────────┘     
```

---

## Master Phase Index

* [Phase 1: Zero-Pollution Infrastructure Scaffolding](#phase-1-zero-pollution-infrastructure-scaffolding)
* [Phase 2: Component 1 – Cryptographic Envelope & Storage Engine](#phase-2-component-1--cryptographic-envelope--storage-engine)
* [Phase 3: Component 2 – Relational Schema & ABAC Engine](#phase-3-component-2--relational-schema--abac-engine)
* [Phase 4: Component 3 – Zero-Egress OCR & NER Engine](#phase-4-component-3--zero-egress-ocr--ner-engine)
* [Phase 5: Component 4 – Cryptographic Ledger & Audit Engine](#phase-5-component-4--cryptographic-ledger--audit-engine)
* [Phase 6: Component 5 – Raster Redaction & Dynamic Watermarking Engine](#phase-6-component-5--raster-redaction--dynamic-watermarking-engine)
* [Phase 7: Component 6 – FastAPI Async Pipeline Orchestrator](#phase-7-component-6--fastapi-async-pipeline-orchestrator)
* [Phase 8: Component 7 – Matter-Centric Frontend in Next.js](#phase-8-component-7--matter-centric-frontend-in-nextjs)
* [Phase 9: Final Defense & Judge Proofing](#phase-9-final-defense--judge-proofing)

---

## Phase 1: Zero-Pollution Infrastructure Scaffolding

### 1.1 Strict Objective
Stand up a self-contained, containerized local cloud environment with deterministic data mounts on EndeavourOS. Ensure strict resource fencing (budgeted for i5/16GB RAM), non-overlapping subnet isolation, persistent storage directories, and health checks across PostgreSQL, MinIO, and Redis before executing any application code.

### 1.2 Architectural Mechanisms & Specifications

#### Host Directory Layout
```bash
secureVault/
├── data/
│   ├── postgres/      # Bind mount for PostgreSQL 16 data
│   ├── minio/         # Bind mount for MinIO S3 object storage
│   ├── redis/         # Bind mount for Celery/Redis queue persistence
│   └── models/        # SpaCy / Tesseract local weights (Zero host download)
├── docker-compose.yml
├── .env.example
└── scripts/
    └── infra_healthcheck.sh
```

#### Service Topography
* **Database:** `postgres:16-alpine` (Memory limit: 1.5GB, Shm size: 256MB)
* **Object Store:** `minio/minio:RELEASE.2024-01-16T16-07-38Z` (Memory limit: 1.5GB)
* **Queue / Broker:** `redis:7.2-alpine` (Memory limit: 512MB)
* **Network:** `securevault_internal_bridge` (`172.28.0.0/16`, driver: `bridge`, internal isolation)

```yaml
# Infrastructure Manifest (docker-compose.yml snippet)
version: '3.8'

networks:
  securevault_net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16

services:
  postgres:
    image: postgres:16-alpine
    container_name: securevault_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: securevault_db
      POSTGRES_USER: ${POSTGRES_USER:-vault_admin}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-vault_secret_pass}
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5432:5432"
    networks:
      - securevault_net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U vault_admin -d securevault_db"]
      interval: 5s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 1536M

  minio:
    image: minio/minio:latest
    container_name: securevault_minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minio_admin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minio_master_secret}
    volumes:
      - ./data/minio:/data
    ports:
      - "127.0.0.1:9000:9000"
      - "127.0.0.1:9001:9001"
    networks:
      - securevault_net
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 5s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 1536M

  redis:
    image: redis:7.2-alpine
    container_name: securevault_redis
    restart: unless-stopped
    volumes:
      - ./data/redis:/data
    ports:
      - "127.0.0.1:6379:6379"
    networks:
      - securevault_net
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 512M
```

### 1.3 Definite Verification Gate (Pass/Fail Test Criteria)

#### Execution Command
```bash
./scripts/infra_healthcheck.sh
```

#### Pass/Fail Criteria
* **PASS:**
  1. `docker compose ps --format json` reveals `postgres`, `minio`, and `redis` in status `healthy`.
  2. TCP sockets bound strictly to `127.0.0.1` (`5432`, `9000`, `9001`, `6379`) preventing external LAN leakage.
  3. Writing a sample byte buffer to `./data/minio` and Postgres rows to `./data/postgres` persists across `docker compose down` and `docker compose up`.
* **FAIL:** Any service fails health checks within 30 seconds, containers listen on `0.0.0.0`, or host RAM consumption exceeds 4.0GB baseline.

---

## Phase 2: Component 1 – Cryptographic Envelope & Storage Engine

### 2.1 Strict Objective
Implement an end-to-end client/ingestion cryptographic envelope guaranteeing **confidentiality**, **integrity**, and **authenticity** for all legal evidence documents. Plaintext must never reach the MinIO storage backend or disk. The engine must compute baseline SHA-256 pre-encryption hashes (for evidentiary chain-of-custody) and stream AES-256-GCM encrypted ciphertexts directly to MinIO.

### 2.2 Architectural Mechanisms & Libraries
* **Cryptographic Primitives:**
  * AES-256 in Galois/Counter Mode (GCM) via `cryptography.hazmat.primitives.ciphers.aead.AESGCM`.
  * Key Derivation: PBKDF2-HMAC-SHA256 (600,000 iterations) or HKDF with cryptographically secure random 32-byte master secrets.
  * 96-bit (12-byte) cryptographically secure pseudorandom IV generated via `os.urandom(12)` per payload.
  * SHA-256 digest computation on raw plaintext pre-encryption (RFC 6234).
* **Storage Protocol:**
  * MinIO S3 streaming via `boto3` client with stream chunking.
  * Encrypted Envelope Header format:
    ```
    +-----------------------+---------------------+-----------------------+------------------------+
    | Magic Bytes (4B)      | 96-bit IV (12B)     | 128-bit Tag (16B)     | Ciphertext Stream (N)  |
    | 0x53 0x56 0x4C 0x54   | [Random Nonce]      | [AES-GCM Auth Tag]    | [Encrypted Payload]    |
    +-----------------------+---------------------+-----------------------+------------------------+
    ```

```python
# Conceptual Test Harness Structure: crypto_envelope_test.py
import os, hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

class CryptographicEnvelope:
    MAGIC = b"SVLT"

    def __init__(self, key: bytes):
        assert len(key) == 32, "Master key must be 256-bit"
        self.aesgcm = AESGCM(key)

    def seal(self, plaintext: bytes, associated_data: bytes = b"") -> tuple[bytes, str]:
        pre_hash = hashlib.sha256(plaintext).hexdigest()
        iv = os.urandom(12)
        # AESGCM in cryptography appends the 16-byte tag to the ciphertext
        encrypted = self.aesgcm.encrypt(iv, plaintext, associated_data)
        ciphertext = encrypted[:-16]
        tag = encrypted[-16:]
        envelope = self.MAGIC + iv + tag + ciphertext
        return envelope, pre_hash

    def open(self, envelope: bytes, associated_data: bytes = b"") -> tuple[bytes, str]:
        assert envelope[:4] == self.MAGIC, "Corrupted Envelope Magic Bytes"
        iv = envelope[4:16]
        tag = envelope[16:32]
        ciphertext = envelope[32:]
        decrypted = self.aesgcm.decrypt(iv, ciphertext + tag, associated_data)
        post_hash = hashlib.sha256(decrypted).hexdigest()
        return decrypted, post_hash
```

### 2.3 Definite Verification Gate (Pass/Fail Test Criteria)

#### Execution Command
```bash
docker run --rm -v $(pwd):/app -w /app python:3.11-slim python tests/test_crypto_envelope.py
```

#### Pass/Fail Criteria
* **PASS:**
  1. **Round-Trip Fidelity:** Plaintext $\to$ Seal $\to$ Store S3 $\to$ Fetch S3 $\to$ Open produces exact byte equality and matching pre/post SHA-256 hashes.
  2. **1-Bit Corruption Failure:** Modifying a single bit in the ciphertext or authentication tag in MinIO storage causes `AESGCM.decrypt` to immediately raise `cryptography.exceptions.InvalidTag`.
  3. **Associated Data Tamper Test:** Modifying case-bound AAD metadata (e.g., changing `CaseID: 101` to `CaseID: 102`) throws `InvalidTag` rejection.
* **FAIL:** Any modified byte payload successfully decrypts or SHA-256 pre-hash deviates from decrypted post-hash.

---

## Phase 3: Component 2 – Relational Schema & ABAC Engine

### 3.1 Strict Objective
Design and deploy a PostgreSQL 16 schema engineered for complex evidentiary workflows. Implement an **Attribute-Based Access Control (ABAC)** engine that dynamically computes access decisions based on User Role, Clearance Level, Department/Jurisdiction, Case Assignment, and Time Window, enforcing strict multi-tenant and cross-departmental isolation.

### 3.2 Architectural Mechanisms & Database Schema

#### Schema Definition (PostgreSQL 16)
* **`users`:** `id (UUID)`, `email`, `role (enum: INVESTIGATOR, JUDGE, FORENSIC_ANALYST, CLERK, ADMIN)`, `clearance_level (int 1-5)`, `jurisdiction_id (UUID)`.
* **`cases`:** `id (UUID)`, `case_number (indexed unique)`, `status (enum: ACTIVE, ARCHIVED, SEALED)`, `classification_level (int 1-5)`, `lead_investigator_id (FK)`, `jurisdiction_id (UUID)`.
* **`case_access_rules`:** `id (UUID)`, `case_id (FK)`, `granted_user_id (FK null)`, `granted_role (enum null)`, `granted_department (UUID null)`, `expires_at (timestamp null)`.
* **`matter_branches`:** `id (UUID)`, `case_id (FK)`, `branch_name (e.g. 'FORENSIC_ACCOUNTS', 'BALLISTICS')`, `created_at`.
* **`documents`:** `id (UUID)`, `case_id (FK)`, `branch_id (FK)`, `title`, `mime_type`, `is_sealed (bool)`.
* **`document_versions`:** `id (UUID)`, `document_id (FK)`, `version_number (int)`, `s3_object_key`, `sha256_hash`, `encryption_iv`, `encryption_tag`, `created_by (FK)`, `merkle_leaf_hash`.
* **`audit_logs`:** `id (UUID)`, `actor_id (FK)`, `action`, `resource_id`, `context_abac (JSONB)`, `timestamp`, `merkle_leaf_index`.

```sql
-- Dynamic ABAC Evaluation Function (PostgreSQL PL/pgSQL / Python policy representation)
CREATE OR REPLACE FUNCTION evaluate_abac_access(
    p_user_id UUID,
    p_user_role VARCHAR,
    p_clearance INT,
    p_user_jurisdiction UUID,
    p_case_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_case_classification INT;
    v_case_jurisdiction UUID;
    v_is_sealed BOOLEAN;
    v_rule_exists BOOLEAN;
BEGIN
    SELECT classification_level, jurisdiction_id, (status = 'SEALED')
    INTO v_case_classification, v_case_jurisdiction, v_is_sealed
    FROM cases WHERE id = p_case_id;

    -- Rule 1: Clearance must be >= Classification
    IF p_clearance < v_case_classification THEN
        RETURN FALSE;
    END IF;

    -- Rule 2: Sealed cases require explicit JUDGE or Lead Investigator rule
    IF v_is_sealed AND p_user_role != 'JUDGE' THEN
        SELECT EXISTS(
            SELECT 1 FROM cases 
            WHERE id = p_case_id AND lead_investigator_id = p_user_id
        ) INTO v_rule_exists;
        IF NOT v_rule_exists THEN
            RETURN FALSE;
        END IF;
    END IF;

    -- Rule 3: Direct Rule / Jurisdiction Match
    IF p_user_jurisdiction = v_case_jurisdiction THEN
        RETURN TRUE;
    END IF;

    -- Rule 4: Explicit Delegation in case_access_rules
    SELECT EXISTS(
        SELECT 1 FROM case_access_rules
        WHERE case_id = p_case_id
          AND (granted_user_id = p_user_id OR granted_role = p_user_role)
          AND (expires_at IS NULL OR expires_at > NOW())
    ) INTO v_rule_exists;

    RETURN v_rule_exists;
END;
$$ LANGUAGE plpgsql;
```

### 3.3 Definite Verification Gate (Pass/Fail Test Criteria)

#### Execution Command
```bash
docker run --rm -v $(pwd):/app -w /app python:3.11-slim pytest tests/test_abac_engine.py
```

#### Pass/Fail Criteria
* **PASS:**
  1. **Clearance Barrier:** User with Clearance Level 2 attempting access to Level 3 Case document receives `ACCESS_DENIED`.
  2. **Cross-Jurisdiction Barrier:** Investigator from "Jurisdiction A" cannot query Case from "Jurisdiction B" without active delegation in `case_access_rules`.
  3. **Time-Bombed Access Revocation:** An expired delegation rule immediately returns `ACCESS_DENIED` as soon as `expires_at < NOW()`.
  4. **Sealed Case Defense:** Sealed case documents return 403 Forbidden to ordinary investigators, permitting only authorized Judges and designated lead officers.
* **FAIL:** Any policy leak permitting unauthorized document metadata retrieval or unauthorized decryption key issuance.

---

## Phase 4: Component 3 – Zero-Egress OCR & NER Engine

### 4.1 Strict Objective
Implement an entirely on-premise, zero-network-egress text extraction and legal Named Entity Recognition (NER) pipeline. Compute OCR confidence scores per token/bounding box and extract Bharatiya Nyaya Sanhita (BNS) / Indian Penal Code (IPC) sections, judge names, accused names, and monetary sums. Enforce automated routing to a **Human-in-the-Loop (HITL)** review queue whenever aggregate extraction confidence falls below **85%**.

### 4.2 Architectural Mechanisms & Specifications
* **OCR Layer:**
  * `pytesseract` + Tesseract 5.x engine running within an isolated worker container.
  * PDF rasterization: `pdf2image` with Poppler utilities at 300 DPI.
  * Extract bounding boxes ($x, y, w, h$) and word-level confidence metrics ($c_i \in [0, 100]$).
  * Aggregate Document Confidence formulation:
    $$C_{doc} = \frac{1}{N} \sum_{i=1}^{N} c_i$$
* **Legal NER & Extraction Layer:**
  * SpaCy lightweight transformer/CNN pipeline (`en_core_web_sm` / fine-tuned legal pattern matcher).
  * Custom Entity Rulers for Indian legal syntax:
    * `LAW_SECTION`: Regex matching `(?:Section|Sec\.|u/s)\s+(\d+[A-Z]?)\s+(?:IPC|BNS|CrPC|BNSS|IEA|BSA)`
    * `FIR_NUMBER`: Regex matching `FIR\s+No\.?\s+\d+/\d{4}`
    * `ACCUSED`: Named entity `PERSON` conditioned on context windows preceding `"accused of"`, `"arrested on"`, `"petitioner"`, `"respondent"`.
* **Zero Egress Enforcement:**
  * Worker container executed with `network_mode: none` or restricted strictly to internal Redis communication.

```python
# Legal Rule Matcher Architecture
import spacy
from spacy.pipeline import EntityRuler

def build_legal_ner_pipeline():
    nlp = spacy.load("en_core_web_sm", disable=["ner"])
    ruler = nlp.add_pipe("entity_ruler")
    patterns = [
        {"label": "BNS_SECTION", "pattern": [{"TEXT": {"REGEX": "^(?i)(section|sec|u/s)$"}}, {"IS_DIGIT": True}, {"TEXT": {"REGEX": "^(?i)(bns|ipc)$"}}]},
        {"label": "FIR_ID", "pattern": [{"TEXT": {"REGEX": "^(?i)fir$"}}, {"TEXT": {"REGEX": "^(?i)no\.?$"}}, {"TEXT": {"REGEX": "^\d+/\d{2,4}$"}}]}
    ]
    ruler.add_patterns(patterns)
    return nlp
```

### 4.3 Definite Verification Gate (Pass/Fail Test Criteria)

#### Execution Command
```bash
docker run --rm -v $(pwd):/app -w /app python:3.11-slim python tests/test_ocr_ner_engine.py
```

#### Pass/Fail Criteria
* **PASS:**
  1. **Synthesized Court FIR Extraction:** Extraction on synthetic charge sheet accurately extracts target sections (e.g. `Section 302 IPC` / `Section 103 BNS`) and accused names with zero external API calls.
  2. **HITL Trigger Validation:** Processing a degraded/blurred document with an OCR confidence of $78.4\%$ flags `hitl_required = True` and pushes job to the review queue. High-clarity scan ($96.2\%$) flags `hitl_required = False`.
  3. **Zero Network Egress:** The test execution running in a container with `--network none` executes with 0 socket errors.
* **FAIL:** Any external network call is made or degraded document bypasses the 85% threshold check.

---

## Phase 5: Component 4 – Cryptographic Ledger & Audit Engine

### 5.1 Strict Objective
Construct an append-only, mathematically auditable **RFC 6962-Compliant Merkle Transparency Tree** coupled with **Ed25519** asymmetric cryptographic signatures. This replaces Hyperledger Fabric with a verifiable, lightweight cryptographic proof engine. Provide functions to generate logarithmic inclusion proofs for any document version, and detect any historical modification in $O(\log N)$ time.

### 5.2 Architectural Specifications & Mathematical Formulations

```
                 Root Hash (Signed by Ed25519 Authority Key)
                                 R = H(N3 || N4)
                               /                 \
                     N3 = H(N1 || N2)            N4 = H(L3 || L4)
                       /          \                 /          \
              N1 = H(L1||L2)     ...              L3           L4
                /        \
              L1          L2
              │           │
          Doc V1.0    Doc V1.1 (SHA-256 Hashes)
```

#### RFC 6962 Hashing Rules
* Leaf Node Hash: $H(0x00 \ || \ \text{Payload Data})$
* Interior Node Hash: $H(0x01 \ || \ \text{Left Child Hash} \ || \ \text{Right Child Hash})$
* Prefix byte segregation ($0x00$ vs $0x01$) mathematically prevents second-preimage attacks.

#### Key Mechanics
1. **Append-Only Tree Operations:**
   * Each document check-in or version mutation appends a new Leaf Hash containing:
     $$\text{Leaf} = \text{SHA-256}(\text{DocID} \ || \ \text{Version} \ || \ \text{DocHash} \ || \ \text{Timestamp} \ || \ \text{ActorID})$$
2. **Ed25519 Tree Head Signing:**
   * The tree authority periodically signs the Root Hash:
     $$\Sigma = \text{Sign}_{\text{Ed25519}}(\text{RootHash} \ || \ \text{TreeSize} \ || \ \text{Timestamp})$$
3. **Audit Proof Generation (Inclusion Proof):**
   * Output the audit path of length $\lceil \log_2 N \rceil$ verifying that a specific document version resides within the immutable root.

### 5.3 Definite Verification Gate (Pass/Fail Test Criteria)

#### Execution Command
```bash
docker run --rm -v $(pwd):/app -w /app python:3.11-slim python tests/test_merkle_ledger.py
```

#### Pass/Fail Criteria
* **PASS:**
  1. **Cryptographic Proof Validation:** Generation and verification of Merkle Inclusion Proof for Leaf $K$ in a tree of 10,000 leaves validates in $< 2\text{ms}$.
  2. **Mathematical Tamper Detection:** Tampering with a single character in document record #43 out of 1,000 recalculates a divergent root; proof verification fails with `MerkleVerificationError`.
  3. **Ed25519 Signature Verification:** `Ed25519.verify(Signature, RootHash)` verifies authentic origins; forged signatures are rejected.
* **FAIL:** Tampered ledger records validate successfully or inclusion proofs exceed $O(\log N)$ complexity.

---

## Phase 6: Component 5 – Raster Redaction & Dynamic Watermarking Engine

### 6.1 Strict Objective
Implement an irreversible, byte-level raster redaction engine and dynamic on-the-fly forensic watermarking service for sensitive legal records. Redaction must sanitize underlying PDF vector/text layers to prevent "black box over text" extraction flaws. Dynamic watermarking must embed user identity, IP address, and timestamp across view sessions at a 45-degree angle.

### 6.2 Architectural Mechanisms & Libraries
* **Libraries:** `PyMuPDF` (`fitz`), `Pillow` (PIL), `reportlab`.
* **True Irreversible Redaction Pipeline:**
  1. Load target page and parse requested redaction bounding boxes: $[(x_0, y_0, x_1, y_1), \dots]$.
  2. Apply `page.add_redact_annot(rect)` followed by `page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_PIXELS)`.
  3. Rasterize page to high-res bitmap (300 DPI) to completely eliminate all underlying text vector layers, metadata, and hidden font encodings.
* **Dynamic Forensic Watermark Injection:**
  1. Generate transparent PDF watermark overlay with `reportlab`:
     * Text: `RESTRICTED LEGAL EVIDENCE | USER: {UUID} | IP: {IP} | TS: {ISO8601} | JURISDICTION: {ID}`
     * Transformation: $45^\circ$ diagonal rotation, $15\%$ opacity, multi-line tiled grid.
  2. Merge watermark layer with redacted raster using alpha-channel blending.

```
+------------------------------------------------------------------------------------+
|                                REDACTION PIPELINE                                  |
+------------------------------------------------------------------------------------+
 [ Source Vector PDF ] ──► [ Redaction BBox ] ──► [ Vector Text Sanitization ] 
                                                          │
                                                          ▼
 [ Hardened Export ]  ◄── [ 45° Watermark ]  ◄── [ High-Res Pixel Rasterization ]
```

### 6.3 Definite Verification Gate (Pass/Fail Test Criteria)

#### Execution Command
```bash
docker run --rm -v $(pwd):/app -w /app python:3.11-slim python tests/test_redaction_watermark.py
```

#### Pass/Fail Criteria
* **PASS:**
  1. **Zero Text Leaks:** Searching or extracting text (via `pdfminer`, `pdftotext`, or raw byte grep) from redacted regions returns $0$ matches.
  2. **Irreversible Pixel Replacement:** Pixel matrix inspection confirms target bounding box pixels are replaced with uniform black ($0x000000$) or white ($0xFFFFFF$).
  3. **Watermark Presence:** Resulting rendered output contains visible watermarking metadata with verifiable actor details.
* **FAIL:** Text behind the redaction box remains extractable via PDF stream analyzers.

---

## Phase 7: Component 6 – FastAPI Async Pipeline Orchestrator

### 7.1 Strict Objective
Integrate all verified components into a high-throughput, non-blocking asynchronous FastAPI backend. Build endpoints for file upload, envelope encryption, background OCR/NER job scheduling via Redis, ABAC-authenticated streaming, time-bombed view-only presigned access links, and cryptographic proof verification.

### 7.2 Architectural Topography & Endpoint Manifest

```
                 ┌──────────────────────────────────────────────┐
                 │          FastAPI Ingestion Gateway           │
                 └──────────────────────┬───────────────────────┘
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           ▼                            ▼                            ▼
  [ POST /api/v1/docs ]       [ GET /api/v1/docs/{id} ]     [ GET /api/v1/audit/proof ]
  • Client AES-GCM Envelope   • ABAC Policy Evaluation      • Merkle Inclusion Proof
  • Pre-Hash Verification     • Ephemeral Decryption Key    • Ed25519 Signed Root Head
  • Redis Ingestion Task      • Dynamic Watermark Inject    • Instant Verification API
```

#### Core API Endpoint Specifications
* `POST /api/v1/cases`: Create case with classification level and jurisdiction.
* `POST /api/v1/documents/ingest`:
  * Multipart upload: Encrypted stream + Metadata AAD.
  * Writes blob to MinIO, records metadata in Postgres, queues OCR/NER in Redis, and appends leaf to Merkle Ledger.
* `GET /api/v1/documents/{id}/stream`:
  * Evaluates ABAC policy against JWT Claims.
  * Streams decrypted & dynamically watermarked PDF buffer.
* `POST /api/v1/documents/{id}/redact`:
  * Receives redaction coordinates, applies raster sanitization, generates new version in `document_versions`, and appends new Merkle leaf.
* `GET /api/v1/audit/proof/{doc_version_id}`:
  * Returns leaf index, sibling hashes, current Merkle Root, and Ed25519 signature.
* `POST /api/v1/documents/{id}/share-link`:
  * Generates a time-bombed HMAC-signed URL valid for $N$ seconds (view-only, watermarked).

### 7.3 Definite Verification Gate (Pass/Fail Test Criteria)

#### Execution Command
```bash
docker compose up -d
docker run --network host --rm -v $(pwd):/app -w /app python:3.11-slim pytest tests/test_api_orchestrator.py
```

#### Pass/Fail Criteria
* **PASS:**
  1. **Async Ingestion Performance:** 50 concurrent document ingestion requests complete with $100\%$ delivery, 0 deadlocks, and background workers successfully parse OCR/NER queues.
  2. **Security Interceptor:** Requests with expired or malformed JWT tokens or invalid ABAC permissions are rejected with HTTP 403.
  3. **Presigned Link Time-Bomb:** Time-bombed link expires after designated TTL (e.g., 60 seconds), returning HTTP 410 Gone.
* **FAIL:** Any API unhandled 500 error or unauthorized access path to MinIO blobs.

---

## Phase 8: Component 7 – Matter-Centric Frontend in Next.js

### 8.1 Strict Objective
Build a lightweight, responsive Next.js (App Router, Tailwind CSS, Lucide icons) frontend tailored for legal, investigation, and judicial workflows. The UI must feature a hierarchical Matter/Case explorer, an interactive Canvas document viewer with dynamic raster redaction tools, and a live Merkle Audit Dashboard with interactive proof validation.

### 8.2 Architectural Layout & UI Components

#### UI Component Hierarchy
```
src/
├── app/
│   ├── cases/
│   │   └── [caseId]/
│   │       ├── page.tsx            # Case Explorer & Branch Tree
│   │       ├── viewer/[docId]/     # Canvas PDF Viewer & Redaction Tool
│   │       └── audit/              # Merkle Ledger Live Visualizer
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── CaseTreeExplorer.tsx        # File/branch navigation with clearance badges
│   ├── DocumentCanvasViewer.tsx    # PDF rendering with watermarking and BBox selector
│   ├── RedactionToolbar.tsx        # Redaction commit tool with confirmation modal
│   ├── MerkleProofVisualizer.tsx   # Visual binary tree with path highlight
│   └── ChainOfCustodyCard.tsx      # BSA Sec 65B Certificate generator modal
```

#### Key Interface Capabilities
1. **Matter / Branch Explorer:**
   * Tree view displaying case matters, sub-investigations, and sealed records tagged with classification levels.
2. **Interactive Redaction Canvas:**
   * Overlay bounding box selection tool directly on top of rendered document canvas.
   * "Commit Redaction" triggers the backend irreversible rasterization pipeline and displays updated version.
3. **Live Merkle Audit Inspector:**
   * Real-time visual tree rendering showing leaf inclusion paths, hash calculations, and green/red tamper verification status badges.

### 8.3 Definite Verification Gate (Pass/Fail Test Criteria)

#### Execution Command
```bash
npm run build && npm run test:e2e
```

#### Pass/Fail Criteria
* **PASS:**
  1. Next.js build succeeds with zero TypeScript errors.
  2. Bounding box coordinates accurately map to document coordinates on high-DPI displays.
  3. Live Merkle component fetches proof from `/api/v1/audit/proof`, calculates root client-side using WebCrypto SHA-256, and confirms match against the server's signed root.
* **FAIL:** Any client-side crash during PDF stream rendering or failure to compute root hashes.

---

## Phase 9: Final Defense & Judge Proofing

### 9.1 Strict Objective
Prepare an ironclad live demonstration suite designed to prove system resilience, tamper-evidence, and legal compliance before technical judges. Demonstrate an interactive **"Corrupt Database Admin"** attack scenario where unauthorized database or S3 tampering is instantly detected, and automatically generate a **Bharatiya Sakshya Adhiniyam (BSA), 2023 / Section 65B Electronic Evidence Certificate**.

### 9.2 Demonstration Arsenal & Compliance Scripts

#### 1. The "Corrupt Admin" Live Attack Script (`scripts/demo_tamper_attack.sh`)
* **Step 1:** System ingests an authentic legal FIR / Evidence Document. Shows green verification status in the UI.
* **Step 2:** Operator simulates a rogue database administrator with direct root access to PostgreSQL and MinIO:
  ```bash
  # Maliciously alter document bytes in MinIO or modify metadata in PostgreSQL
  docker exec -it securevault_postgres psql -U vault_admin -d securevault_db \
    -c "UPDATE document_versions SET sha256_hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' WHERE version_number = 1;"
  ```
* **Step 3:** Refresh Audit View in UI or run verification script.
* **Step 4:** **System Response:** Merkle proof verification immediately fails; root hash mismatch alert turns UI glowing red; AES-GCM decryption raises authentication tag failure; audit log flags unauthorized state modification.

```
+------------------------------------------------------------------------------------+
|                                TAMPER DEFENSE WORKFLOW                             |
+------------------------------------------------------------------------------------+
 [ Ingest Doc ] ──► [ Green Merkle Tree ] ──► [ DB Admin Injects Byte Tamper ]
                                                           │
                                                           ▼
 [ UI Alerts Security Breach ] ◄── [ GCM Tag / Merkle Root Hash Mismatch ]
```

#### 2. Bharatiya Sakshya Adhiniyam (BSA) / Sec 65B Certificate Generation
Automated generation of an evidentiary certificate containing:
* SHA-256 cryptographic hashes of raw and encrypted envelopes.
* Timestamps derived from trusted local hardware/container clock.
* Merkle Inclusion Proof and cryptographic signatures verifying chain of custody.
* Machine/Container identification details and hash algorithms used.

### 9.3 Definite Verification Gate (Pass/Fail Test Criteria)

#### Execution Command
```bash
./scripts/demo_tamper_attack.sh
```

#### Pass/Fail Criteria
* **PASS:**
  1. The direct database/storage tamper is caught 100% of the time by the cryptographic engine with zero false negatives.
  2. The Section 65B / BSA certificate outputs a valid, verifiable JSON/PDF report containing complete Merkle audit paths and valid signatures.
  3. Complete live demo workflow executes on the local i5/16GB machine without exceeding 50% CPU or 6GB RAM utilization.
* **FAIL:** Any tampered document passes verification or certificate generator fails to prove chain of custody.

---

## Implementation Execution Timeline (Solo Sprint Matrix)

| Milestone | Focus Domain | Primary Deliverable | Target Pass Gate |
|:---|:---|:---|:---|
| **Day 1** | Phase 1 & 2 | Compose Infra + AES-256-GCM Envelope Engine | `test_crypto_envelope.py` PASS |
| **Day 2** | Phase 3 & 4 | Postgres Schema + ABAC + Zero-Egress OCR/NER | `test_abac_engine.py` & `test_ocr_ner_engine.py` PASS |
| **Day 3** | Phase 5 & 6 | RFC 6962 Merkle Ledger + Irreversible Redaction | `test_merkle_ledger.py` & `test_redaction_watermark.py` PASS |
| **Day 4** | Phase 7 | FastAPI Async Ingestion & Streaming Gateways | `test_api_orchestrator.py` PASS |
| **Day 5** | Phase 8 | Next.js Case Tree + Canvas Viewer + Audit UI | End-to-End Workflow PASS |
| **Day 6** | Phase 9 | "Corrupt Admin" Demo Script + BSA 65B Generator | Live Judge Simulation PASS |

---
*Roadmap generated for SecureVault. Engineering execution strictly bound to local containerized workspace.*
