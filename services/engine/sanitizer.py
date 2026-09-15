"""
Document Redaction & Dynamic Watermarking Engine (Component 5)
Provides zero-leak in-memory PDF redaction, dynamic NLP entity visual highlighting,
and forensic anti-leak dynamic watermarking under Section 65B Indian Evidence Act standards.
"""

from typing import Dict, List, Tuple, Union
import fitz  # PyMuPDF


class DocumentSanitizer:
    """
    In-memory PDF Sanitizer for permanent redaction, NLP highlighting,
    and dynamic forensic watermarking.
    """

    @staticmethod
    def apply_redaction(
        pdf_bytes: bytes,
        page_redactions: Dict[int, List[Union[Tuple[float, float, float, float], fitz.Rect]]],
    ) -> bytes:
        """
        Permanently wipes underlying text, images, and vector paths for specified bounding boxes.

        Args:
            pdf_bytes: Raw bytes of the PDF document.
            page_redactions: Mapping of page index (0-indexed) to list of bounding boxes
                             (x0, y0, x1, y1).

        Returns:
            bytes: Sanitized PDF with permanently destroyed redacted content.
        """
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")

        for page_idx, rects in page_redactions.items():
            if 0 <= page_idx < len(doc):
                page = doc[page_idx]
                for rect_coords in rects:
                    if isinstance(rect_coords, fitz.Rect):
                        rect = rect_coords
                    else:
                        rect = fitz.Rect(*rect_coords)
                    # Add black filled redaction annotation
                    page.add_redact_annot(rect, fill=(0, 0, 0))
                # Permanently destroy underlying text and graphic streams
                page.apply_redactions()

        sanitized_bytes = doc.tobytes(garbage=3, deflate=True)
        doc.close()
        return sanitized_bytes

    @staticmethod
    def apply_nlp_highlights(pdf_bytes: bytes, keywords: List[str]) -> bytes:
        """
        Dynamically applies semi-transparent yellow highlight annotations over extracted NLP keywords.

        Args:
            pdf_bytes: Raw bytes of the PDF document.
            keywords: List of entity keywords (names, statutory sections, dates, etc.) to highlight.

        Returns:
            bytes: Highlighted PDF bytes.
        """
        if not keywords:
            return pdf_bytes

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        for page in doc:
            for keyword in keywords:
                clean_kw = str(keyword).strip()
                if not clean_kw or len(clean_kw) < 2:
                    continue
                # Search for all occurrences of the keyword
                text_instances = page.search_for(clean_kw)
                for inst in text_instances:
                    annot = page.add_highlight_annot(inst)
                    annot.set_colors(stroke=(1.0, 0.9, 0.2))  # Vivid yellow highlight
                    annot.update()

        highlighted_bytes = doc.tobytes(garbage=3, deflate=True)
        doc.close()
        return highlighted_bytes

    @staticmethod
    def apply_dynamic_watermark(
        pdf_bytes: bytes,
        user_id: str,
        client_ip: str,
        timestamp: str,
    ) -> bytes:
        """
        Applies a forensic dynamic watermark diagonally across every page of the PDF.

        Args:
            pdf_bytes: Raw bytes of the PDF document.
            user_id: Identification badge or UUID of the viewing user.
            client_ip: IP address of the requesting client.
            timestamp: Access ISO timestamp string.

        Returns:
            bytes: Watermarked PDF bytes.
        """
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        watermark_text = f"VIEW ONLY | {user_id} | {client_ip} | {timestamp}"

        for page in doc:
            rect = page.rect
            # Position diagonally across the page center using morph transformation matrix (45 deg)
            insert_point = fitz.Point(rect.width * 0.1, rect.height * 0.5)
            rot_matrix = fitz.Matrix(45)

            # Insert diagonal watermark in light gray with morph matrix
            page.insert_text(
                insert_point,
                watermark_text,
                fontsize=13,
                color=(0.75, 0.75, 0.75),
                morph=(insert_point, rot_matrix),
                overlay=True,
            )

        watermarked_bytes = doc.tobytes(garbage=3, deflate=True)
        doc.close()
        return watermarked_bytes
