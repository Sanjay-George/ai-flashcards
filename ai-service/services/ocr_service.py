from PIL import Image
import pytesseract
import io
from typing import Optional


class OCRService:
    """Service for extracting text from images using Tesseract OCR."""

    async def extract_text(self, image_bytes: bytes) -> str:
        """Extract text from image bytes using OCR."""
        try:
            # Open image from bytes
            image = Image.open(io.BytesIO(image_bytes))

            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')

            # Extract text using pytesseract
            text = pytesseract.image_to_string(image)

            return text.strip()

        except Exception as e:
            raise Exception(f"OCR extraction failed: {str(e)}")
