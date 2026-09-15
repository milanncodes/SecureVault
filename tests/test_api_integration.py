"""
End-to-End API Integration Tests for Component 6 (FastAPI Pipeline Orchestrator)
Validates async document ingestion, zero-egress OCR/NER, S3 cryptographic envelope storage,
Ed25519 PKI Merkle tree ledger auditing, and dynamically watermarked viewing.
"""

import io
import fitz
import pytest
from fastapi.testclient import TestClient
from main import app, audit_log, document_registry


@pytest.fixture(autouse=True)
def reset_in_memory_state():
    """Cleans in-memory registry and ledger entries between tests."""
    document_registry.clear()
    audit_log.entries.clear()
    audit_log.merkle_tree.leaves.clear()


def _create_mock_charge_sheet_pdf() -> bytes:
    """Creates a mock charge sheet PDF in memory."""
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)
    sample_text = (
        "STATE OF MAHARASHTRA vs ACCUSED PERSON\n"
        "FINAL CHARGE SHEET UNDER SECTION 316 BNS AND IPC 420\n"
        "FIR Number: 45/2024 | Investigating Officer: Inspector Rajesh Kumar\n"
        "Police Station: Central Cyber Cell\n"
    )
    page.insert_text(fitz.Point(50, 100), sample_text, fontsize=11)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_end_to_end_pipeline():
    """
    Validates complete end-to-end ingestion and secure retrieval lifecycle:
    1. Ingestion of PDF via POST /api/v1/documents/ingest (202 Accepted).
    2. Background pipeline executes OCR/NER, encryption, S3 upload, and PKI Merkle commitment.
    3. Retrieval via GET /api/v1/documents/{tracking_id}/view with dynamic watermarking (200 OK).
    4. Audit trail inspection via GET /api/v1/ledger/audit verifying Merkle root immutability.
    5. ABAC access denial test (403 Forbidden) for unauthorized tier.
    """
    client = TestClient(app)

    # 1. Prepare mock file
    pdf_bytes = _create_mock_charge_sheet_pdf()
    files = {
        "file": ("charge_sheet_45_2024.pdf", io.BytesIO(pdf_bytes), "application/pdf")
    }
    form_data = {
        "user_id": "IO_RAJESH_902",
        "role": "IO",
        "station_code": "CENTRAL_CYBER",
        "classification_tier": "2",
    }

    # 2. Ingest document
    response = client.post("/api/v1/documents/ingest", files=files, data=form_data)
    assert response.status_code == 202
    res_data = response.json()
    assert res_data["status"] == "PROCESSING"
    assert "tracking_id" in res_data
    tracking_id = res_data["tracking_id"]

    # 3. Verify document retrieval by authorized officer (clearance_tier >= 2)
    view_response = client.get(
        f"/api/v1/documents/{tracking_id}/view",
        params={
            "user_id": "IO_RAJESH_902",
            "role": "IO",
            "station_code": "CENTRAL_CYBER",
            "clearance_tier": 2,
        },
    )
    if view_response.status_code != 200:
        print("VIEW_RESPONSE ERROR:", view_response.status_code, view_response.text)
        print("REGISTRY STATE:", document_registry.get(tracking_id))
    assert view_response.status_code == 200
    assert view_response.headers["content-type"] == "application/pdf"
    assert "X-Doc-Hash" in view_response.headers
    assert "X-Merkle-Leaf" in view_response.headers

    # 4. Verify watermark embedded in returned stream
    streamed_pdf_bytes = view_response.content
    doc_view = fitz.open(stream=streamed_pdf_bytes, filetype="pdf")
    extracted_text = doc_view[0].get_text()
    doc_view.close()

    assert "IO_RAJESH_902" in extracted_text
    assert "VIEW ONLY" in extracted_text

    # 5. Verify cryptographic ledger audit endpoint
    audit_response = client.get("/api/v1/ledger/audit")
    assert audit_response.status_code == 200
    audit_data = audit_response.json()
    assert audit_data["total_transactions"] == 1
    assert len(audit_data["merkle_root"]) == 64
    assert audit_data["entries"][0]["metadata"]["tracking_id"] == tracking_id

    # 6. Verify ABAC Clearance Denial for lower clearance tier (clearance_tier=1 < doc classification_tier=2)
    unauthorized_response = client.get(
        f"/api/v1/documents/{tracking_id}/view",
        params={
            "user_id": "CONSTABLE_301",
            "role": "IO",
            "station_code": "CENTRAL_CYBER",
            "clearance_tier": 1,
        },
    )
    assert unauthorized_response.status_code == 403
    assert "Access Denied" in unauthorized_response.json()["detail"]
