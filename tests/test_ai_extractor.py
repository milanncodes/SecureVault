"""
Unit tests for Zero-Egress OCR & NER Extraction Engine.
Validates local CPU inference, statutory entity recognition (BNS, IPC, FIR),
and deterministic HITL confidence-based routing.
"""

import io
import pytest
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from ai_extractor import ZeroEgressExtractor


@pytest.fixture(scope="module")
def extractor():
    """Initialize the ZeroEgressExtractor instance once for tests."""
    return ZeroEgressExtractor()


def create_synthetic_image(text: str, degraded: bool = False) -> bytes:
    """
    Generate a high-contrast synthetic document image in memory.
    If degraded is True, applies heavy Gaussian blur and noise to simulate illegible regional handwriting.
    """
    width, height = 1200, 200
    img = Image.new("RGB", (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Use default font or scaled text
    # Draw clear dark text with margin
    draw.text((20, 80), text, fill=(0, 0, 0))

    if degraded:
        # Apply heavy blur to degrade OCR confidence below 85.0 threshold
        img = img.filter(ImageFilter.GaussianBlur(radius=6))

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_high_quality_extraction(extractor: ZeroEgressExtractor):
    """
    Test 1: High-Quality Document Processing.
    - Clear synthetic text containing statutory BNS, IPC, FIR, and Persona entities.
    - Asserts HITL is NOT required (confidence >= 85.0).
    - Asserts BNS_SECTIONS contains '316', IPC_SECTIONS contains '420', PERSON contains 'John Doe'.
    """
    legal_text = (
        "FIR No. 45/2024 registered against John Doe under Section 316 BNS and IPC 420 on 12-10-2024."
    )
    img_bytes = create_synthetic_image(legal_text, degraded=False)

    result = extractor.process_document(file_bytes=img_bytes, is_pdf=False)

    assert result["hitl_required"] is False, (
        f"High quality image should not trigger HITL, got confidence {result['confidence']}"
    )
    assert result["confidence"] >= 85.0

    entities = result["entities"]
    assert "316" in entities["BNS_SECTIONS"], f"Expected '316' in BNS_SECTIONS, got {entities['BNS_SECTIONS']}"
    assert "420" in entities["IPC_SECTIONS"], f"Expected '420' in IPC_SECTIONS, got {entities['IPC_SECTIONS']}"
    assert any("John Doe" in p for p in entities["PERSON"]), f"Expected 'John Doe' in PERSON, got {entities['PERSON']}"
    assert any("45/2024" in fir for fir in entities["FIR_NUMBER"]), f"Expected '45/2024' in FIR_NUMBER, got {entities['FIR_NUMBER']}"


def test_low_quality_hitl_routing(extractor: ZeroEgressExtractor):
    """
    Test 2: Low-Quality / Blurred Document HITL Routing.
    - Degraded image simulating illegible handwriting or noisy scan.
    - Asserts OCR confidence drops below 85.0.
    - Asserts hitl_required is True.
    """
    legal_text = "Faded handwriting witness deposition statement under section 164"
    degraded_bytes = create_synthetic_image(legal_text, degraded=True)

    result = extractor.process_document(file_bytes=degraded_bytes, is_pdf=False)

    assert result["hitl_required"] is True, (
        f"Degraded image must trigger HITL routing (confidence was {result['confidence']})"
    )
    assert result["confidence"] < 85.0
