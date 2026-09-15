"""
SecureVault Zero-Egress OCR & NER Extraction Engine.
Runs locally on CPU (<500MB RAM) using Tesseract OCR, Poppler, and SpaCy en_core_web_sm.
"""

import io
import re
from typing import Dict, List, Tuple, Union

import pdf2image
from PIL import Image
import pytesseract
import spacy


class ZeroEgressExtractor:
    """
    Zero-Egress Document Extractor for legal documents.
    Extracts text, confidence scores, standard NER entities,
    and Indian statutory patterns (BNS, IPC, FIR numbers).
    Routes low-confidence documents (<85.0) to HITL queue.
    """

    HITL_CONFIDENCE_THRESHOLD = 85.0

    def __init__(self, spacy_model: str = "en_core_web_sm"):
        """Initialize the extractor and load the local lightweight SpaCy NLP model."""
        self.nlp = spacy.load(spacy_model)

        # Indian Legal Statutory Pattern Matchers
        self.bns_regex = re.compile(
            r"(?:(?:U/S|u/s|Section|Sec\.?)\s*(\d+[A-Za-z]?)\s*(?:of\s+)?(?:the\s+)?BNS)|(?:BNS\s*(?:Section|Sec\.?)?\s*(\d+[A-Za-z]?))",
            re.IGNORECASE,
        )
        self.ipc_regex = re.compile(
            r"(?:(?:U/S|u/s|Section|Sec\.?)\s*(\d+[A-Za-z]?)\s*(?:of\s+)?(?:the\s+)?IPC)|(?:IPC\s*(?:Section|Sec\.?)?\s*(\d+[A-Za-z]?))",
            re.IGNORECASE,
        )
        self.fir_regex = re.compile(
            r"FIR\s*(?:No\.?|Number|#)?\s*([A-Za-z0-9\/\-]+)",
            re.IGNORECASE,
        )

    def extract_text_and_confidence(self, image_input: Union[bytes, Image.Image]) -> Tuple[str, float]:
        """
        Extract raw text and calculate average OCR confidence from image.
        """
        if isinstance(image_input, bytes):
            image = Image.open(io.BytesIO(image_input))
        else:
            image = image_input

        # Convert to RGB if palette/alpha
        if image.mode not in ("RGB", "L"):
            image = image.convert("RGB")

        # Extract per-word OCR data and confidence
        data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)

        confidences: List[float] = []
        words: List[str] = []

        for word, conf in zip(data.get("text", []), data.get("conf", [])):
            clean_word = str(word).strip()
            try:
                conf_val = float(conf)
            except (ValueError, TypeError):
                conf_val = -1.0

            if clean_word and conf_val >= 0:
                confidences.append(conf_val)
                words.append(clean_word)

        if confidences:
            avg_confidence = round(sum(confidences) / len(confidences), 2)
        else:
            avg_confidence = 0.0

        # Extract full formatted text
        full_text = pytesseract.image_to_string(image).strip()
        if not full_text and words:
            full_text = " ".join(words)

        return full_text, avg_confidence

    def extract_legal_entities(self, text: str) -> Dict[str, List[str]]:
        """
        Extract named entities using SpaCy and statutory patterns via Regex.
        """
        entities: Dict[str, List[str]] = {
            "PERSON": [],
            "DATE": [],
            "ORG": [],
            "BNS_SECTIONS": [],
            "IPC_SECTIONS": [],
            "FIR_NUMBER": [],
        }

        if not text:
            return entities

        # SpaCy standard entity extraction
        doc = self.nlp(text)
        for ent in doc.ents:
            if ent.label_ in ("PERSON", "DATE", "ORG"):
                clean_ent = ent.text.strip()
                if clean_ent and clean_ent not in entities[ent.label_]:
                    entities[ent.label_].append(clean_ent)

        # Regex Extraction: BNS Sections
        for match in self.bns_regex.finditer(text):
            section = match.group(1) or match.group(2)
            if section and section not in entities["BNS_SECTIONS"]:
                entities["BNS_SECTIONS"].append(section)

        # Regex Extraction: IPC Sections
        for match in self.ipc_regex.finditer(text):
            section = match.group(1) or match.group(2)
            if section and section not in entities["IPC_SECTIONS"]:
                entities["IPC_SECTIONS"].append(section)

        # Regex Extraction: FIR Numbers
        for match in self.fir_regex.finditer(text):
            fir_num = match.group(1)
            if fir_num and fir_num not in entities["FIR_NUMBER"]:
                entities["FIR_NUMBER"].append(fir_num)

        return entities

    def process_document(self, file_bytes: bytes, is_pdf: bool = False) -> Dict:
        """
        Unified document processing pipeline:
        1. Render page / load image.
        2. OCR text extraction & confidence evaluation.
        3. Legal & NLP entity recognition.
        4. Flatten keywords for dynamic visual highlighting.
        5. Deterministic HITL threshold routing.
        """
        if is_pdf:
            images = pdf2image.convert_from_bytes(file_bytes, first_page=1, last_page=1)
            if not images:
                return {
                    "raw_text": "",
                    "ocr_text": "",
                    "confidence": 0.0,
                    "entities": self.extract_legal_entities(""),
                    "highlight_keywords": [],
                    "hitl_required": True,
                }
            image = images[0]
            raw_text, confidence = self.extract_text_and_confidence(image)
        else:
            raw_text, confidence = self.extract_text_and_confidence(file_bytes)

        entities = self.extract_legal_entities(raw_text)
        hitl_required = confidence < self.HITL_CONFIDENCE_THRESHOLD

        # Collect flat list of unique non-empty keywords for dynamic highlighting
        highlight_keywords: List[str] = []
        for cat, items in entities.items():
            for item in items:
                clean_item = str(item).strip()
                if clean_item and len(clean_item) > 1 and clean_item not in highlight_keywords:
                    highlight_keywords.append(clean_item)

        return {
            "raw_text": raw_text,
            "ocr_text": raw_text,
            "confidence": confidence,
            "entities": entities,
            "highlight_keywords": highlight_keywords,
            "hitl_required": hitl_required,
        }
