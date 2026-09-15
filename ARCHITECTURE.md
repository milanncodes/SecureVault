# Technical Specification & Architectural Whitepaper: SecureVault

**System Title:** Secure Digital Document Management System for Legal and Investigation Documents  
**Domain:** GovTech, LegalTech, Digital Forensics, Judicial Workflow Automation  
**Target Program:** Smart India Hackathon (SIH) — Ministry of Law & Justice / Ministry of Home Affairs  
**Compliance Mandate:** Bharatiya Sakshya Adhiniyam (BSA), 2023 / Section 65B Indian Evidence Act, Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023, Digital Personal Data Protection (DPDP) Act, 2023.

---

## 1. Executive Summary & Problem Analysis

### 1.1 The Core Challenge: The Digital Transformation of Criminal Justice
The Indian criminal justice pipeline is undergoing an epochal transition. With the enactment of the **Bharatiya Nyaya Sanhita (BNS)**, **Bharatiya Nagarik Suraksha Sanhita (BNSS)**, and **Bharatiya Sakshya Adhiniyam (BSA)**, the legal requirement for admissible electronic evidence and digital case management has moved from an optional convenience to a statutory mandate.

Historically, investigation workflows have suffered from acute systemic vulnerabilities:
1. **Physical Paper Degradation and Substitution:** Case diaries, witness statements under Section 161 CrPC (now BNSS), and physical seizure memos (panchnamas) are prone to physical tampering, retroactive pagination, and deliberate destruction.
2. **Fragmented Digital Silos (The CCTNS Bottleneck):** While the Crime and Criminal Tracking Network & Systems (CCTNS) digitizes FIR registration, evidentiary artifacts (forensic disk images, call detail records, CCTV footage, mobile extractions, ballistic reports) remain stored in ad-hoc, unlinked directories, external hard drives, or CD-ROMs without centralized verification.
3. **Chain of Custody Breaks:** Moving digital evidence between police stations, Forensic Science Laboratories (FSL), prosecutors, and judicial magistrates introduces unlogged access gaps where digital exhibits can be modified or substituted without cryptographic proof of origin or state.

```
+----------------------------------------------------------------------------------------------------+
|                         TRADITIONAL VS. SECUREVAULT EVIDENCE LIFECYCLE                             |
+----------------------------------------------------------------------------------------------------+
 TRADITIONAL FRAGMENTED FLOW (VULNERABLE):                                                           
 [ Crime Scene / FIR ] ──► [ Unencrypted USB/CD ] ──► [ CCTNS Folder ] ──► [ Court Presentation ]    
                                  │                            │                                      
                                  ▼ (No Tamper Evidence)       ▼ (Database Admin Can Alter Rows)      
                             TAMPER RISK                 INADMISSIBLE EVIDENCE                        
                                                                                                      
 SECUREVAULT CRYPTOGRAPHIC PIPELINE (IMMUTABLE):                                                     
 [ Ingestion / Exhibit ] ──► [ Client AES-256-GCM ] ──► [ MinIO (Encrypted S3) ]                      
           │                          │                            │                                  
           ▼                          ▼                            ▼                                  
 [ Baseline SHA-256 Hash ] ──► [ RFC 6962 Merkle Tree ] ──► [ Ed25519 Signed Root Head ]             
                                      │                            │                                  
                                      ▼                            ▼                                  
                              MATHEMATICAL PROOF           BSA 2023 / SEC 65B CERTIFICATE             
```

---

### 1.2 Failure of Conventional Enterprise Solutions in Legal Scrutiny
Commercial document management platforms (e.g., SharePoint, Google Drive, Box) and generic enterprise relational databases (ERP/DMS) are fundamentally unsuited for judicial evidentiary standards under the Bharatiya Sakshya Adhiniyam (BSA) for the following architectural reasons:

| Failure Vector | Conventional Solutions (SharePoint, Drive, Relational DBs) | SecureVault GovTech Architecture |
|:---|:---|:---|
| **Trust Model & Privileged Access** | **Centralized Admin Superuser:** Root DBAs, cloud admins, or tenant owners can alter files, timestamps, or database audit rows directly on disk with zero cryptographic trace. | **Zero-Trust Cryptographic Ledger:** Even a compromised root admin cannot alter historical records without mathematically invalidating the append-only RFC 6962 Merkle root and Ed25519 signature chain. |
| **Evidentiary Integrity Verification** | **Implicit Trust / Checksums:** Relies on operating system metadata (`mtime`, `ctime`) which can be altered via standard shell utilities (`touch -t`). | **Dual SHA-256 Baseline Enveloping:** Computes pre-encryption raw bit digests and stores AES-256-GCM authentication tags alongside immutable Merkle inclusion proofs. |
| **Data Redaction & Sanitization** | **Client-Side Blackout Overlays:** Black rectangles placed over text in vector PDFs leave underlying text and OCR streams fully extractable via PDF stream analyzers. | **Pixel-Level Hardened Rasterization:** Permanently strips vector text layers and renders bounding boxes directly into bitmap pixels at 300 DPI, preventing OCR desynchronization. |
| **Exfiltration & Interception** | **Unrestricted Attachments:** Documents are exported as raw attachments or emailed, leaking unwatermarked files into unmonitored environments. | **Zero-Attachment Ephemeral Viewing:** Enforces time-bombed, single-use presigned viewing sessions with dynamic $45^\circ$ forensic watermarking (Officer ID, IP, ISO8601 Timestamp). |
| **Privacy & Statutory Air-Gapping** | **Third-Party Cloud AI Egress:** Cloud-based OCR/NER APIs (e.g., Azure Cognitive Services, OpenAI) transmit sensitive criminal investigation data to external servers, violating the DPDP Act. | **100% Zero-Egress Local Containerized Inference:** Tesseract 5.x and SpaCy legal entity extractors execute inside firewall-isolated local worker containers. |

---

### 1.3 Resolution of the SIH Problem Statement Discrepancy
Certain problem statement summaries occasionally miscategorize this initiative under the generic umbrella of *"police physical inventory/asset management"* (tracking police vehicles, wireless sets, or armory equipment). 

**Authoritative Mandate Clarification:**  
This architecture strictly targets the core, mission-critical mandate: **Secure Digital Document Management System for Legal and Investigation Documents**. The system manages the entire intellectual and evidential lifecycle of criminal investigations—from FIR registration, chargesheets, witness statements, and forensic exhibits to judicial branch routing, dynamic redaction, and Section 65B evidence certificate generation.

---

## 2. Stakeholder & Ecosystem Mapping

The judicial and investigative ecosystem demands strict, non-overlapping access boundaries. Access is governed not merely by identity, but by **Role, Clearance Level, Station/Jurisdiction Code, Case Assignment, and Temporal Validity**.

```
+----------------------------------------------------------------------------------------------------+
|                                    STAKEHOLDER ECOSYSTEM TOPOLOGY                                  |
+----------------------------------------------------------------------------------------------------+
                                                                                                      
                     ┌─────────────────────────────────────────┐                                      
                     │       Judiciary (Magistrate/Judge)      │                                      
                     │  • Full Unredacted Case Records         │                                      
                     │  • Order Sheet Issuance & Sealing       │                                      
                     └────────────────────┬────────────────────┘                                      
                                          │ Access Approval & Subpoena                                
                                          ▼                                                           
 ┌───────────────────────────┐  Delegated Access  ┌───────────────────────────┐                       
 │  Station House Officer    │ ◄────────────────► │     Public Prosecutor     │                       
 │  • Jurisdiction Approval  │                    │  • Chargesheet Review     │                       
 │  • Branch Lock & Endorse  │                    │  • Evidence Scrutiny      │                       
 └─────────────┬─────────────┘                    └─────────────┬─────────────┘                       
               │                                                │                                     
               ▼                                                ▼                                     
 ┌───────────────────────────┐                    ┌───────────────────────────┐                       
 │ Investigating Officer (IO)│                    │  Defense Counsel (Bar)    │                       
 │ • Evidence Ingestion      │                    │  • Redacted View-Only     │                       
 │ • Witness Record Upload   │                    │  • Time-Bombed Session    │                       
 └─────────────┬─────────────┘                    └───────────────────────────┘                       
               │                                                                                      
               ▼ Direct Exhibit Submission                                                            
 ┌───────────────────────────┐                                                                        
 │ Forensic Laboratory (FSL) │                                                                        
 │ • Lab Report Append Only  │                                                                        
 │ • Hardware Cryptographic  │                                                                        
 └───────────────────────────┘                                                                        
```

### Comprehensive Access & Authorization Matrix

| Stakeholder Role | Read Permissions | Write / Ingestion Permissions | Modification & Branching | Redaction & Export Rights | Judicial Approval Authority |
|:---|:---|:---|:---|:---|:---|
| **Investigating Officer (IO)** | Cases assigned to their Officer ID and jurisdiction; unsealed branches. | Uploads FIRs, Section 161 statements, panchnamas, digital exhibits. | Appends new versions to active branches. Cannot overwrite historical leaves. | Requests bounding-box redaction for sensitive witness identities. | None. Submits chargesheet for SHO endorsement. |
| **Station House Officer (SHO / SP)** | All active and archived cases within their police station/district. | Endorsement notes, final chargesheets, departmental directives. | Freezes case branches; initiates inter-agency case transfers. | Approves redactions prior to public prosecutor submission. | Endorses chargesheets under Section 173 CrPC (BNSS). |
| **Forensic Science Lab (FSL Analyst)** | Specific evidentiary exhibits assigned under formal forensic requisition. | Uploads ballistic reports, DNA analysis, cyber forensic disk image reports. | Appends specialized `FORENSIC_FSL` branch. Zero access to unrelated case branches. | None. Uploads cryptographic baseline hashes of raw exhibits. | Certifies technical integrity of forensic extractions. |
| **Public Prosecutor** | Full chargesheet, exhibits, and forensic branches for trial-scheduled cases. | Scrutiny notes, legal defect notices, supplementary evidence requests. | Cannot alter investigation documents; creates scrutiny memos. | Can view unredacted evidence; approves trial disclosure bundles. | Files documents in the Court of Record. |
| **Defense Counsel** | Court-approved discovery documents; strictly restricted to unsealed, shared files. | Bail applications, defense petitions, list of defense witnesses. | Zero modification rights to prosecution case files. | **Strictly view-only** via time-bombed watermarked links. Redacted only. | None. |
| **Judiciary (Magistrate / Trial Judge)** | Unrestricted global access to all branches, sealed documents, and logs. | Judicial orders, bail rulings, framing of charges, trial judgments. | Can order the permanent cryptographic sealing of sensitive case branches. | Can toggle between raw unredacted exhibits and public-redacted records. | Final authority on document admissibility and sealing. |
| **System Administrator** | System telemetry, infrastructure health logs, cryptographic proof states. | Infrastructure maintenance, certificate rotation. | **Zero read/write access** to document plaintext or cryptographic envelope keys. | None. | Technical infrastructure certification only. |

---

## 3. Core Architectural Pillars

```
+----------------------------------------------------------------------------------------------------+
|                                    SECUREVAULT 5-PILLAR ARCHITECTURE                                |
+----------------------------------------------------------------------------------------------------+
  PILLAR 1: Composite Envelopes      PILLAR 2: Zero-Egress AI         PILLAR 3: Matter-Centric ABAC   
 ┌──────────────────────────────┐   ┌──────────────────────────────┐   ┌──────────────────────────────┐
 │ • Raw Ciphertext (AES-256)   │   │ • Containerized Tesseract 5  │   │ • Case ID -> Branch -> Doc   │
 │ • SHA-256 Pre-Hash Digest    │   │ • SpaCy BNS/IPC Rule Matcher │   │ • Dynamic Clearance Match    │
 │ • Ephemeral IV + Auth Tag    │   │ • <85% Confidence HITL Queue │   │ • Station Code Isolation     │
 └──────────────────────────────┘   └──────────────────────────────┘   └──────────────────────────────┘
                                    
               PILLAR 4: Cryptographic Immutability       PILLAR 5: Anti-Leak Pipeline                
              ┌─────────────────────────────────────┐   ┌─────────────────────────────────────┐       
              │ • RFC 6962 Merkle Transparency Tree │   │ • 300 DPI Hardened Rasterization    │       
              │ • Ed25519 Authority Root Signatures │   │ • Time-Bombed HMAC Presigned Links  │       
              │ • O(log N) Verifiable Proofs        │   │ • Translucent Dynamic Watermarking  │       
              └─────────────────────────────────────┘   └─────────────────────────────────────┘       
```

---

### Pillar 1: Secure Ingestion & Composite Document Containers

SecureVault treats every legal artifact not as an isolated file, but as a **Composite Cryptographic Document Container (CCDC)**. The container decouples metadata indexing from raw binary payloads, guaranteeing that no plaintext ever touches persistent storage.

```
+------------------------------------------------------------------------------------+
|                      COMPOSITE DOCUMENT CONTAINER (CCDC) STRUCTURE                 |
+------------------------------------------------------------------------------------+
 ┌──────────────────────────────────────────────────────────────────────────────────┐
 │  ENVELOPE HEADER (Public Metadata & Cryptographic Proofs)                        │
 │  • Magic Identifier: 0x53564C54 ("SVLT")                                         │
 │  • Nonce / IV: 96-bit CSPRNG Salt                                                │
 │  • Pre-Encryption Hash: SHA-256(Raw Plaintext)                                   │
 │  • GCM Authentication Tag: 128-bit Integrity Check                               │
 │  • Merkle Leaf Hash: RFC 6962 Leaf Commitment                                    │
 ├──────────────────────────────────────────────────────────────────────────────────┤
 │  ENCRYPTED BINARY PAYLOAD (Stored in MinIO S3 Object Store)                      │
 │  • AES-256-GCM Ciphertext Stream (Chunked streaming via boto3)                   │
 ├──────────────────────────────────────────────────────────────────────────────────┤
 │  SEARCHABLE TEXT LAYER (Stored in PostgreSQL Indexed JSONB / Vector DB)          │
 │  • Local Zero-Egress OCR Extracted Text                                          │
 │  • Structured Legal Named Entities (BNS Sections, Accused, Officers)             │
 ├──────────────────────────────────────────────────────────────────────────────────┤
 │  DYNAMIC AUDIT CHAIN & NOTES                                                     │
 │  • Case Officer Annotation Layer                                                 │
 │  • Version Sequence Counter & Parent Leaf Pointers                               │
 └──────────────────────────────────────────────────────────────────────────────────┘
```

#### Cryptographic Sealing Process
1. **Baseline Pre-Hashing:** Compute $H_{\text{pre}} = \text{SHA-256}(\text{Plaintext})$ on raw bytes to establish the exact evidentiary baseline.
2. **Authenticated Envelope Encryption:** Generate a unique 96-bit initialization vector $IV \leftarrow \text{CSPRNG}(12)$. Encrypt plaintext using AES-256-GCM with Associated Authenticated Data ($AAD$) binding the Case ID, Branch ID, and Ingesting Officer ID:
   $$\text{Ciphertext}, \text{Tag} \leftarrow \text{AES-GCM}_{\text{Key}}(IV, \text{Plaintext}, AAD)$$
3. **Payload Streaming:** Stream the encrypted envelope directly to MinIO over internal socket channels without local disk caching.

---

### Pillar 2: Zero-Egress On-Premise Intelligence

Legal documents and case diaries contain state secrets, witness identities, and sensitive juvenile/victim data. SecureVault enforces an absolute **Zero-Egress Architecture**: zero telemetry, zero external API dependencies, and complete container-level network isolation.

```
+------------------------------------------------------------------------------------+
|                         ZERO-EGRESS OCR & NER INGESTION PIPELINE                   |
+------------------------------------------------------------------------------------+
 [ Scanned PDF / Exhibit ] ──► [ Poppler 300 DPI Rasterizer ]
                                      │
                                      ▼
                      [ Tesseract 5.x Engine (Local) ]
                                      │
                       ┌──────────────┴──────────────┐
                       ▼                             ▼
             [ Token Confidence ]           [ Text Stream ]
                       │                             │
                       ▼                             ▼
            Is Mean Conf >= 85%?             [ SpaCy Rule Matcher ]
               /            \                • BNS / IPC Sections
             YES             NO              • FIR Number / Dates
             /                \              • Accused / Victims
            ▼                  ▼                     │
    [ Auto-Ingest ]     [ Flag HITL Queue ] ◄────────┘
                        (Manual Officer Review)
```

1. **Local OCR Extraction:**
   * Tesseract 5.x engine optimized with OpenMP multi-threading within a hardened Alpine container.
   * Extracts per-word bounding boxes and confidence metrics $c_i \in [0, 100]$.
   * Computes aggregate confidence score: $C_{\text{doc}} = \frac{1}{N} \sum_{i=1}^{N} c_i$.
2. **Legal Named Entity Recognition (NER):**
   * Lightweight SpaCy pipeline utilizing a custom Indian Legal Rule Matcher.
   * Extracts legal entities:
     * `LAW_SECTION`: Regex mapping to IPC (e.g., *Sec 302, 420*), BNS (e.g., *Sec 103, 316*), CrPC/BNSS, and Evidence Act/BSA.
     * `FIR_DETAILS`: Police Station, District, Year, FIR Number.
     * `STAKEHOLDERS`: Accused, Complainant, Investigating Officer, Witnesses.
3. **Deterministic Human-in-the-Loop (HITL) Fallback:**
   * If $C_{\text{doc}} < 85\%$ (common in handwritten case diaries or degraded carbon copies), the ingestion pipeline automatically routes the document to the **HITL Verification Queue**.
   * The Investigating Officer or Station Clerk is prompted with a side-by-side interactive correction interface before cryptographic sealing.

---

### Pillar 3: Matter-Centric Vault & Attribute-Based Access Control (ABAC)

SecureVault replaces flat folder hierarchies with a structured **Matter-Centric Legal Case Graph**.

```
CASE ROOT: FIR No. 402/2026 [State vs. Accused A & B] (Classification: Level 4)
 ├── 📂 BRANCH: INVESTIGATION_DIARY (Restricted: Lead IO + SHO)
 │    ├── 📄 Case_Diary_Day_01.svlt (v1.0) [Leaf #101]
 │    └── 📄 Witness_161_Statement_Ramesh.svlt (v1.0) [Leaf #102]
 ├── 📂 BRANCH: FORENSIC_LAB_FSL (Restricted: FSL Analyst + IO)
 │    ├── 📄 Ballistics_Report_9mm.svlt (v1.0) [Leaf #103]
 │    └── 📄 Mobile_Extraction_UFED.svlt (v1.0) [Leaf #104]
 ├── 📂 BRANCH: SEIZED_FINANCIALS (Sealed by Judicial Order)
 │    └── 📄 Bank_Ledger_SwissAccount.svlt (v1.0) [Leaf #105 - SEALED]
 └── 📂 BRANCH: COURT_SUBMISSIONS (Shared: Prosecutor + Defense)
      └── 📄 Chargesheet_Final_Signed.svlt (v1.0) [Leaf #106]
```

#### ABAC Evaluation Formalism
An access request tuple $R = \langle u, d, a, e \rangle$ (User, Document, Action, Environment) evaluates to $\text{ALLOW}$ if and only if:

$$\text{Clearance}(u) \ge \text{Classification}(d) \quad \land \quad \text{JurisdictionMatch}(u, d) \quad \land \quad \neg \text{IsSealedExclusion}(u, d) \quad \land \quad \text{TimeValid}(e)$$

```sql
-- Core ABAC Policy Schema Representation
CREATE TABLE case_access_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    granted_user_id UUID REFERENCES users(id),
    granted_role VARCHAR(32),
    granted_jurisdiction UUID,
    clearance_required INT NOT NULL DEFAULT 1,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_sealed_override BOOLEAN DEFAULT FALSE
);
```

---

### Pillar 4: Cryptographic Immutability & Verifiable Audit Trail

#### Why RFC 6962 Merkle Trees Over Hyperledger Fabric
Enterprise blockchains (e.g., Hyperledger Fabric, MultiChain) introduce massive resource bloat (Kafka/Raft consensus nodes, peer containers, chaincode JVMs, 10GB+ RAM overhead) without delivering greater mathematical certainty than a cryptographic transparency tree.

SecureVault uses an **RFC 6962-Compliant Merkle Transparency Log** paired with **Ed25519 Asymmetric Signatures**, matching the architecture used by Certificate Transparency (Google/RFC 6962):

```
                       Ed25519 Signed Root Head
                      Σ = Sign_SK(RootHash || Size || TS)
                                    │
                                    ▼
                                Root Hash
                              R = H(N3 || N4)
                             /               \
                   N3 = H(N1 || N2)          N4 = H(L3 || L4)
                     /          \               /          \
            N1 = H(L1||L2)     ...            L3           L4
              /        \
            L1          L2
            │           │
        Doc V1.0    Doc V1.1 (Append-Only Cryptographic Commitments)
```

1. **Prefix Segregation (Second-Preimage Attack Defense):**
   $$\text{Leaf Hash} = \text{SHA-256}(0x00 \ || \ \text{Payload})$$
   $$\text{Internal Node Hash} = \text{SHA-256}(0x01 \ || \ \text{Left} \ || \ \text{Right})$$
2. **Logarithmic Audit Inclusion Proofs:**  
   To prove any document $L_k$ exists within a vault containing $N$ documents, the system outputs an audit path of length $\lceil \log_2 N \rceil$. Verification requires exactly $\lceil \log_2 N \rceil$ hash computations ($<2\text{ms}$ for 1,000,000 documents).
3. **Ed25519 Root Attestation:**  
   The state of the entire repository is periodically signed by an authorized judicial/departmental cryptographic key:
   $$\Sigma = \text{Ed25519\_Sign}(K_{\text{priv}}, \text{RootHash} \ || \ \text{TreeSize} \ || \ \text{Timestamp})$$

---

### Pillar 5: Zero-Attachment Collaboration & Anti-Leak Pipeline

To eliminate unauthorized evidence leaks, SecureVault enforces strict display isolation:

```
+------------------------------------------------------------------------------------+
|                         ZERO-ATTACHMENT ANTI-LEAK PIPELINE                         |
+------------------------------------------------------------------------------------+
 [ Encrypted Master File ] ──► [ Decrypt in Memory ]
                                      │
                                      ▼
                        [ Hardened Raster Redaction ]
                        • Strips underlying text vectors
                        • Burns black boxes into 300 DPI pixels
                                      │
                                      ▼
                        [ 45° Translucent Watermark ]
                        • Officer Name & Badge ID
                        • Client Remote IP Address
                        • Ephemeral ISO8601 Timestamp
                                      │
                                      ▼
                 [ Streaming Canvas View (No Raw File Download) ]
```

1. **True Irreversible Raster Redaction:**
   * Traditional PDF redactions that draw black vector rectangles leave the underlying font strings intact.
   * SecureVault uses PyMuPDF (`fitz`) to permanently excise text streams within target bounding boxes, then re-renders the page into a flattened 300 DPI bitmap matrix before transmission.
2. **Dynamic Forensic Watermarking:**
   * Every document stream is injected with an on-the-fly, semi-transparent diagonal ($45^\circ$) watermark grid containing the viewing officer's User UUID, Station Code, IP Address, and active UTC Timestamp.
   * Deters and tracks physical screen photography or unauthorized captures.
3. **Time-Bombed Ephemeral Presigned Links:**
   * External parties (e.g., Defense Counsel, Medical Officers) receive HMAC-SHA256 signed access URLs with strict, non-renewable lifetimes (e.g., 15 minutes), bound to specific browser sessions.

---

## 4. Legal & Regulatory Compliance

```
+----------------------------------------------------------------------------------------------------+
|                                    STATUTORY COMPLIANCE BLUEPRINT                                  |
+----------------------------------------------------------------------------------------------------+
                                                                                                      
 ┌──────────────────────────────────────────────────┐ ┌──────────────────────────────────────────────┐
 │    BHARATIYA SAKSHYA ADHINIYAM (BSA), 2023       │ │     DIGITAL PERSONAL DATA PROTECTION (DPDP)  │
 │    & SECTION 65B INDIAN EVIDENCE ACT             │ │     ACT, 2023                                │
 ├──────────────────────────────────────────────────┤ ├──────────────────────────────────────────────┤
 │ • SHA-256 Dual Baseline Pre-Hashing              │ │ • Complete Zero-Egress Local Processing      │
 │ • RFC 6962 Inclusion Proof of Chain of Custody   │ │ • Role-Based Anonymization & Redaction       │
 │ • Automated Form A/B Certificate Generation      │ │ • Comprehensive Access Audit Logging         │
 │ • Ed25519 Asymmetric Non-Repudiation Signatures │ │ • Automated Time-Bombed Access Expiration    │
 └──────────────────────────────────────────────────┘ └──────────────────────────────────────────────┘
```

### 4.1 Bharatiya Sakshya Adhiniyam, 2023 (BSA) & Section 65B Evidence Act
Under the BSA, 2023 (and Section 65B of the Indian Evidence Act), admissibility of electronic records requires proof of lawful custody, integrity of the computing device, and absence of intermediate tampering.

SecureVault automatically produces a **Cryptographic Section 65B / BSA Admissibility Certificate** detailing:
* Device & Container Node Hardware Fingerprint.
* Cryptographic Pre-Hash ($H_{\text{raw}}$) and Envelope Ciphertext Tag ($T_{\text{gcm}}$).
* Merkle Log Root Hash, Leaf Sequence Index, and Ed25519 Digital Signature.
* Chronological Append-Only Custody Log documenting all authorized access events.

### 4.2 Digital Personal Data Protection (DPDP) Act, 2023
* **Purpose Limitation & Data Minimization:** Forensic analysts only access exhibits explicitly assigned via judicial or SHO requisition.
* **On-Premise Processing:** Zero data transfers to third-party proprietary AI clouds.
* **Permanent Redaction of Non-Pertinent PII:** Built-in raster sanitization protects identities of juvenile offenders, sexual assault victims, and confidential informants.

---

## 5. Technical Stack & Lightweight Local Topology

The architecture is engineered to run seamlessly on a standard developer machine (**Intel Core i5, 16GB RAM, EndeavourOS/Arch Linux**) while delivering full production-grade security and strict system isolation.

```
+------------------------------------------------------------------------------------+
|                         LOCAL CONTAINER INFRASTRUCTURE TOPOLOGY                    |
+------------------------------------------------------------------------------------+
 HOST OS: EndeavourOS (Arch Linux) / Intel Core i5 / 16GB RAM (Zero Host Pollution)   
 │                                                                                    
 └── Docker Engine (Bridge Network: 172.28.0.0/16)                                    
      ├── 🐘 PostgreSQL 16 Alpine      [ RAM: 1.5GB | Port: 127.0.0.1:5432 ]          
      │    └── Mount: ./data/postgres (Relational Metadata & ABAC Policies)          
      ├── 🪣 MinIO Object Store        [ RAM: 1.5GB | Port: 127.0.0.1:9000 ]          
      │    └── Mount: ./data/minio    (AES-256-GCM Encrypted Blob Envelopes)         
      ├── ⚡ Redis 7.2 Alpine          [ RAM: 512MB | Port: 127.0.0.1:6379 ]          
      │    └── Mount: ./data/redis    (Async Ingestion Queue & Job State)            
      ├── ⚙️ FastAPI Worker Service    [ RAM: 2.0GB | Isolated Network ]             
      │    └── Engine: Tesseract 5.x + SpaCy Legal NER + PyMuPDF Engine               
      └── 💻 Next.js 14 Frontend       [ RAM: 1.0GB | Port: 127.0.0.1:3000 ]          
           └── Matter Explorer + Canvas PDF Viewer + Merkle Tree Inspector            
```

### Complete Component Stack

| Layer | Component Technology | Selection Rationale & Resource Profile |
|:---|:---|:---|
| **Storage Engine** | **MinIO (S3 Compatible)** | High-throughput blob store with native chunked streaming. Encrypted payloads stored locally with zero cloud dependencies. (RAM: ~1.5GB). |
| **Relational & ABAC DB**| **PostgreSQL 16 Alpine** | Robust ACID compliance, Row-Level Security, JSONB indexing for legal entities, and PL/pgSQL evaluation functions. (RAM: ~1.5GB). |
| **Broker & Queue** | **Redis 7.2 Alpine** | Lightweight task broker handling async ingestion, OCR queue distribution, and ephemeral token caching. (RAM: ~512MB). |
| **Backend Orchestrator**| **Python 3.11 / FastAPI** | Async ASGI framework offering sub-millisecond response latency, native Pydantic validation, and streaming I/O. (RAM: ~1.0GB). |
| **OCR & AI Engine** | **Tesseract 5.x + SpaCy** | 100% on-premise execution; zero internet egress; rule-based entity matching customized for Indian penal statutes. (RAM: ~2.0GB). |
| **Cryptographic Engine**| **Hazmat Cryptography** | Audited C-level bindings for AES-256-GCM, SHA-256, and Ed25519 asymmetric signing. Sub-millisecond execution. |
| **Frontend UI** | **Next.js 14 / Tailwind CSS** | Server-side rendered case tree explorer, HTML5 Canvas PDF document viewer, and real-time WebCrypto Merkle audit verification dashboard. (RAM: ~1.0GB). |

---

## 6. Summary & Verification Roadmap Reference

SecureVault represents a complete, mathematically auditable, and regulatory-compliant document management ecosystem purpose-built for India's modern digital criminal justice framework.

For step-by-step implementation milestones, test harness blueprints, and explicit Pass/Fail verification gates, refer to the master engineering execution document:
* **Engineering Execution Roadmap:** [`ROADMAP.md`](file:///home/milanm/WebstormProjects/secureVault/ROADMAP.md)

---
*SecureVault Technical Specification. Built for high-integrity GovTech and LegalTech deployments.*
