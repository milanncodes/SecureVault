"""
SecureVault SIH 2026 Data Seeder.
Primes the PostgreSQL + pgvector database with realistic law enforcement cases,
README summaries, branch hierarchies, and dense vector embeddings.
"""

import uuid
import sys

try:
    from database import (
        init_db,
        get_db_session,
        User,
        Case,
        MatterBranch,
        Document,
        RoleType,
        CaseStatus,
        BranchName,
    )
    from semantic_search import generate_embedding
except ImportError:
    from .database import (
        init_db,
        get_db_session,
        User,
        Case,
        MatterBranch,
        Document,
        RoleType,
        CaseStatus,
        BranchName,
    )
    from .semantic_search import generate_embedding


def seed_database():
    print("=====================================================")
    print("  Initializing SecureVault Database & pgvector Schema")
    print("=====================================================")
    init_db()

    session_gen = get_db_session()
    db = next(session_gen)

    try:
        # 1. Seed Core Officers
        print("[1/3] Seeding Law Enforcement Users...")
        officers = [
            {
                "badge_number": "IO_RAJESH_902",
                "role_type": RoleType.IO,
                "station_code": "STATION_ASSAM_01",
                "clearance_tier": 3,
            },
            {
                "badge_number": "SHO_KUMAR_101",
                "role_type": RoleType.SHO,
                "station_code": "STATION_ASSAM_01",
                "clearance_tier": 3,
            },
            {
                "badge_number": "FSL_ANALYST_44",
                "role_type": RoleType.FSL,
                "station_code": "FSL_STATE_HQ",
                "clearance_tier": 2,
            },
            {
                "badge_number": "JUDGE_VERMA_01",
                "role_type": RoleType.JUDGE,
                "station_code": "SESSION_COURT_01",
                "clearance_tier": 3,
            },
        ]

        for off in officers:
            existing = db.query(User).filter(User.badge_number == off["badge_number"]).first()
            if not existing:
                user = User(
                    id=uuid.uuid4(),
                    badge_number=off["badge_number"],
                    role_type=off["role_type"],
                    station_code=off["station_code"],
                    clearance_tier=off["clearance_tier"],
                )
                db.add(user)
        db.commit()

        # 2. Seed Cases with SIH 2026 Legal Scenarios
        print("[2/3] Seeding SIH 2026 Cases & Calculating Vector Embeddings...")

        cases_data = [
            {
                "case_number": "FIR-45/2024",
                "title": "State vs. Cyber Syndicate (Ransomware Attack on Hospital)",
                "origin_station": "STATION_ASSAM_01",
                "classification_tier": 2,
                "status": CaseStatus.OPEN,
                "tags": ["OPEN", "CYBER_CRIME", "RANSOMWARE", "CRITICAL_INFRASTRUCTURE", "BNS_316"],
                "summary": (
                    "# Case FIR No. 45/2024: State vs. Cyber Syndicate (Ransomware Attack)\n\n"
                    "## Executive Summary\n"
                    "Investigation into an **advanced persistent threat (APT)** ransomware attack targeting the central database "
                    "of Guwahati City Hospital. The threat actors encrypted critical healthcare and patient records demanding `15 BTC`.\n\n"
                    "## Statutory Provisions\n"
                    "- Section 66 & 66F Information Technology Act, 2000 (Cyber Terrorism)\n"
                    "- Section 316 & 318 Bharatiya Nyaya Sanhita, 2023 (Cheating and Extortion)\n"
                    "- Section 420 Indian Penal Code\n\n"
                    "## Evidentiary Assets & Branches\n"
                    "- Memory dumps from server gateway `STN-09`\n"
                    "- Ransom note communication logs and darknet Bitcoin wallet clustering analysis\n"
                ),
                "branches": [
                    {
                        "name": BranchName.FIR,
                        "min_clearance": 1,
                        "docs": [
                            {"filename": "Registered_FIR_45_2024.pdf", "hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}
                        ],
                    },
                    {
                        "name": BranchName.FORENSICS,
                        "min_clearance": 2,
                        "docs": [
                            {"filename": "Server_Memory_Analysis_FSL.pdf", "hash": "17387d89045b85a3c63b7e71350a4980eb2160d708304192b6a505b38f8cf622"},
                            {"filename": "Crypto_Wallet_Trace_Report.pdf", "hash": "b2f56740de4d5e4b6c6b3e71350a4980eb2160d708304192b6a505b38f8cf789"},
                        ],
                    },
                ],
            },
            {
                "case_number": "FIR-88/2024",
                "title": "Financial Fraud Investigation (Fake UPI Gateway)",
                "origin_station": "STATION_ASSAM_01",
                "classification_tier": 1,
                "status": CaseStatus.OPEN,
                "tags": ["OPEN", "FINANCIAL_FRAUD", "UPI_PHISHING", "MULE_ACCOUNTS", "BNS_318"],
                "summary": (
                    "# Case FIR No. 88/2024: Financial Fraud via Spoofed UPI Merchant Gateways\n\n"
                    "## Executive Summary\n"
                    "Inter-state syndicate deploying counterfeit **QR codes** and spoofed payment settlement gateways "
                    "diverting `INR 3.8 Crores` across multiple micro-banking mule accounts.\n\n"
                    "## Statutory Provisions\n"
                    "- Section 318(4) Bharatiya Nyaya Sanhita, 2023\n"
                    "- Section 66D Information Technology Act\n\n"
                    "## Key Evidence\n"
                    "- Bank transaction ledger reconciliation\n"
                    "- Device IMEI tracking and SIM card registration certificates\n"
                ),
                "branches": [
                    {
                        "name": BranchName.FIR,
                        "min_clearance": 1,
                        "docs": [
                            {"filename": "FIR_88_2024_UPI_Fraud.pdf", "hash": "9f83c07629a565b8f12351740ff394c706645b2b4f654f67d90d1e0d01813692"}
                        ],
                    },
                    {
                        "name": BranchName.WITNESS_STATEMENTS,
                        "min_clearance": 1,
                        "docs": [
                            {"filename": "Merchant_Victim_Statements.pdf", "hash": "c51a7e2b83b4b5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0"}
                        ],
                    },
                ],
            },
            {
                "case_number": "FIR-12/2023",
                "title": "Narcotics Smuggling Route Alpha",
                "origin_station": "STATION_ASSAM_01",
                "classification_tier": 3,
                "status": CaseStatus.CLOSED,
                "tags": ["CLOSED", "NARCOTICS", "NDPS", "CROSS_BORDER", "RESTRICTED"],
                "summary": (
                    "# Case FIR No. 12/2023: Operation Narc-Shield (Route Alpha Seizure)\n\n"
                    "## Executive Summary\n"
                    "Special tactical operations intercepted cross-border narcotics consignment carrying **Grade-A contraband** "
                    "disguised inside commercial freight trucks along `National Highway 37`.\n\n"
                    "## Statutory Provisions\n"
                    "- Section 21 & 29 Narcotic Drugs and Psychotropic Substances (NDPS) Act, 1985\n"
                    "- Section 61 Bharatiya Nyaya Sanhita, 2023 (Criminal Conspiracy)\n\n"
                    "## Confidential Forensics\n"
                    "- Chemical purity assay from State Forensic Science Laboratory\n"
                    "- Seizure memo signed under Section 65B certified chain of custody\n"
                ),
                "branches": [
                    {
                        "name": BranchName.FORENSICS,
                        "min_clearance": 3,
                        "docs": [
                            {"filename": "Chemical_Purity_Analysis_NDPS.pdf", "hash": "3a7b9c1d0e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b"}
                        ],
                    },
                    {
                        "name": BranchName.CHARGESHEET,
                        "min_clearance": 3,
                        "docs": [
                            {"filename": "Final_ChargeSheet_Convicted.pdf", "hash": "5d41402abc4b2a76b9719d911017c5926c483a9f0f9b6b7a8c9d0e1f2a3b4c5d"}
                        ],
                    },
                ],
            },
        ]

        for case_info in cases_data:
            existing_case = db.query(Case).filter(Case.case_number == case_info["case_number"]).first()
            if existing_case:
                case_obj = existing_case
                case_obj.title = case_info["title"]
                case_obj.summary = case_info["summary"]
                case_obj.tags = case_info["tags"]
                case_obj.classification_tier = case_info["classification_tier"]
                case_obj.status = case_info["status"]
            else:
                case_obj = Case(
                    id=uuid.uuid4(),
                    case_number=case_info["case_number"],
                    title=case_info["title"],
                    origin_station=case_info["origin_station"],
                    classification_tier=case_info["classification_tier"],
                    status=case_info["status"],
                    summary=case_info["summary"],
                    tags=case_info["tags"],
                )
                db.add(case_obj)
                db.flush()

            # Compute and attach vector embedding
            embedding_vector = generate_embedding(case_info["summary"])
            case_obj.semantic_embedding = embedding_vector

            # Create branches and documents
            for br in case_info["branches"]:
                branch_obj = (
                    db.query(MatterBranch)
                    .filter(MatterBranch.case_id == case_obj.id, MatterBranch.branch_name == br["name"])
                    .first()
                )
                if not branch_obj:
                    branch_obj = MatterBranch(
                        id=uuid.uuid4(),
                        case_id=case_obj.id,
                        branch_name=br["name"],
                        min_clearance=br["min_clearance"],
                    )
                    db.add(branch_obj)
                    db.flush()

                for doc_data in br["docs"]:
                    storage_key = f"cases/{case_obj.case_number}/{br['name'].value}/{doc_data['filename']}"
                    existing_doc = db.query(Document).filter(Document.storage_key == storage_key).first()
                    if not existing_doc:
                        doc_embedding = generate_embedding(f"{case_info['title']} - {doc_data['filename']}")
                        doc_obj = Document(
                            id=uuid.uuid4(),
                            branch_id=branch_obj.id,
                            filename=doc_data["filename"],
                            storage_key=storage_key,
                            file_hash=doc_data["hash"],
                            is_sealed=False,
                            semantic_embedding=doc_embedding,
                        )
                        db.add(doc_obj)

        db.commit()
        print("[3/3] Successfully seeded SIH 2026 cases, branches, and pgvector embeddings!")
        print("=====================================================")
    except Exception as exc:
        db.rollback()
        print(f"Error seeding database: {exc}", file=sys.stderr)
        raise exc
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
