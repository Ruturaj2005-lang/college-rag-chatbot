import os
import pytest
from app.services.document_processor import clean_extracted_text, extract_from_txt, process_document_file


def test_clean_extracted_text():
    raw_text = "  Hello   world!  \r\n\r\n\r\n\r\nNew   paragraph.  "
    cleaned = clean_extracted_text(raw_text)
    assert cleaned == "Hello world!\n\nNew paragraph."


def test_extract_from_txt(tmp_path):
    sample_file = tmp_path / "sample.txt"
    sample_file.write_text("Line 1 of college document.\nLine 2 with information.", encoding="utf-8")
    
    pages = extract_from_txt(str(sample_file))
    assert len(pages) == 1
    assert pages[0].page_number == 1
    assert "Line 1 of college document." in pages[0].text


def test_process_document_file_unsupported(tmp_path):
    sample_file = tmp_path / "sample.xyz"
    sample_file.write_text("some content", encoding="utf-8")
    
    with pytest.raises(ValueError) as exc:
        process_document_file(str(sample_file), "xyz")
    assert "Unsupported file type" in str(exc.value)
