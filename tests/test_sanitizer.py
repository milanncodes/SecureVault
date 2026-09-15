"""
Unit & Evidentiary Anti-Leak Tests for Component 5 (Document Sanitizer)
Verifies permanent underlying byte redaction and dynamic forensic watermarking
under Section 65B Indian Evidence Act guidelines.
"""

import fitz
from sanitizer import DocumentSanitizer


def _create_mock_pdf(text: str) -> bytes:
    """Helper to generate a clean single-page PDF containing the specified text."""
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)  # Standard A4
    page.insert_text(fitz.Point(72, 100), text, fontsize=12)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_permanent_redaction():
    """
    Validates zero-leak permanent redaction.
    Ensures that applying redaction permanently wipes underlying text from the PDF
    content stream rather than simply drawing an overlay rectangle.
    """
    initial_text = "SUSPECT NAME: JOHN DOE"
    original_pdf = _create_mock_pdf(initial_text)

    # 1. Locate the exact bounding box for "JOHN DOE"
    doc_initial = fitz.open(stream=original_pdf, filetype="pdf")
    search_rects = doc_initial[0].search_for("JOHN DOE")
    assert len(search_rects) > 0, "Target search token 'JOHN DOE' must be found"
    target_rect = search_rects[0]
    doc_initial.close()

    # 2. Apply permanent redaction
    redacted_pdf_bytes = DocumentSanitizer.apply_redaction(
        pdf_bytes=original_pdf,
        page_redactions={0: [(target_rect.x0, target_rect.y0, target_rect.x1, target_rect.y1)]},
    )

    # 3. Inspect sanitized PDF text extraction
    doc_sanitized = fitz.open(stream=redacted_pdf_bytes, filetype="pdf")
    sanitized_text = doc_sanitized[0].get_text()
    doc_sanitized.close()

    # 4. Strict assertion: "SUSPECT NAME:" remains, "JOHN DOE" is completely wiped
    assert "SUSPECT NAME:" in sanitized_text
    assert "JOHN DOE" not in sanitized_text, (
        "Redacted sensitive text 'JOHN DOE' must be completely removed from the stream."
    )


def test_dynamic_watermarking():
    """
    Validates forensic dynamic watermark insertion.
    Ensures that user badge, client IP, and access timestamp are embedded into the PDF.
    """
    sample_text = "CONFIDENTIAL POLICE CASE DIARY - RESTRICTED ACCESS"
    original_pdf = _create_mock_pdf(sample_text)

    mock_badge = "IO_SHARMA_104"
    mock_ip = "192.168.1.55"
    mock_ts = "2026-09-16T00:00:00Z"

    # 1. Apply dynamic watermark
    watermarked_bytes = DocumentSanitizer.apply_dynamic_watermark(
        pdf_bytes=original_pdf,
        user_id=mock_badge,
        client_ip=mock_ip,
        timestamp=mock_ts,
    )

    # 2. Extract text from watermarked PDF
    doc_watermarked = fitz.open(stream=watermarked_bytes, filetype="pdf")
    extracted_text = doc_watermarked[0].get_text()
    doc_watermarked.close()

    # 3. Assert presence of original text and watermark tokens
    assert "CONFIDENTIAL POLICE CASE DIARY" in extracted_text
    assert mock_badge in extracted_text
    assert mock_ip in extracted_text
    assert mock_ts in extracted_text
