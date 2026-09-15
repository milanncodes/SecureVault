# 🏛️ SecureVault: GovTech Evidence & Document Management System

![GovTech Enterprise](https://img.shields.io/badge/UI_Standard-GovTech_Light-0f172a?style=for-the-badge&logo=gov.uk)
![Framework](https://img.shields.io/badge/Framework-Next.js_14-black?style=for-the-badge&logo=next.js)
![FastAPI](https://img.shields.io/badge/Engine-FastAPI-009688?style=for-the-badge&logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL_pgvector-4169E1?style=for-the-badge&logo=postgresql)

## 📌 Problem Statement (SIH 2026)
Law Enforcement Officers and Magistrates frequently deal with highly sensitive, legally binding evidence forms, cyber forensic disk dumps, and electronic FIRs under the Bharatiya Nyaya Sanhita (BNS) / Sec. 65B frameworks. Handling these documents securely across jurisdictions while tracing tampering, extracting NLP metadata out of unstructured documents, and maintaining a frictionless search interface is critical. 

**SecureVault** is an enterprise-grade digital evidentiary vault built strictly for government deployments, featuring cryptographic immutability, zero cloud egress processing (on-device AI models), and semantic vector searches built directly into an intuitive, high-readability GitHub-like visual layout.

---

## 🏗️ System Architecture

SecureVault operates in isolated containers using a Zero-Trust approach.
* **Frontend (`services/frontend`)**: A high-contrast Next.js 14 web client utilizing Tailwind CSS in an "Enterprise Slate/Light" pattern optimized for non-technical government staff. Features a robust file-explorer repository UI.
* **Backend Engine (`services/engine`)**: A highly concurrent FastAPI Python engine resolving GraphQL/REST requests, spawning asynchronous Merkle tree hashing pipelines, and executing local `spaCy`/`Tesseract` AI analysis without transmitting data explicitly off-instance.
* **Semantic Brain (`PostgreSQL + pgvector`)**: Cosine similarity matching natively attached to PostgreSQL allows natural language queries against the case evidence database.
* **Object Store (`MinIO`)**: 100% S3-compatible, on-premise local data lake storing the binary evidence dumps.

---

## 🚀 Quick Start (One-Click Setup)

To accommodate simple collaboration and instantaneous CI/CD test generation, the infrastructure is heavily containerized. **No local Node or Python installations are strictly required (only Docker).**

**1. Clone the Source**
```bash
git clone https://github.com/your-org/SecureVault.git
cd SecureVault
```

**2. Execute Automated Setup**
```bash
chmod +x setup.sh
./setup.sh
```

**That's it.** The `setup.sh` script automatically provisions `.env` configurations, bootstraps permissioned folder volumes, builds the backend AI instances, and deploys the Node servers via Docker Compose.

---

## 📂 Repository Graph

```text
SecureVault/
├── .github/workflows/         # Auto CI/CD build actions
├── services/
│   ├── engine/                # Python FastAPI Backend
│   │   ├── main.py            # API definitions
│   │   ├── semantic_search.py # pgvector vector engine logic
│   │   └── ai_extractor.py    # Local SpaCy & OCR extraction pipeline
│   │
│   └── frontend/              # Next.js 14 Dashboard App
│       ├── app/               # React Server Components (App Router)
│       └── components/        # Isolated gov-themed visual components
├── docker-compose.yml         # Container Orchestration mapping
├── setup.sh                   # Dev onboarding & launch bash script
└── .env.example               # Template environment credentials
```

---

## 🌐 Port Mappings

Ensure the following default ports are unblocked locally when orchestrating via Compose.

| Service | Protocol | Default Port | Internal Usage |
| ------- | ------------ | ----------- | ----------- |
| **Frontend UI** | HTTP | `3000` | User interaction / Officer dashboards |
| **Backend API** | HTTP | `8000` | Engine execution / Database binding |
| **MinIO Console** | HTTP | `9001` | S3 administrative bucket viewer |
| **PostgreSQL** | TCP | `5432` | DB Connection / pgvector |

---

## 🛡️ Collaboration & CI/CD Pipeline

To prevent regressions ahead of hackathon deadlines, this repository implements strict continuous integration pipelines via GitHub Actions.
1. Branch workflows (`push`, `pull_request`) run static type testing on `app/` configurations.
2. The `services/engine/tests/` module executes `pytest` tests validating API schemas and cryptographic anchoring logic.
3. Node `package-lock.json` builds run automatically against Node 20 architectures. 
(Check `.github/workflows/ci.yml` for exact hooks).

Developed securely for GovTech.
