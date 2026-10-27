import pytest
from backend.app.services.apaar_validator import (
    validate_verhoeff,
    generate_verhoeff_checksum,
    validate_apaar_syntax,
    format_apaar_id
)

def test_verhoeff_checksum_generation_and_validation():
    # Known test string
    base = "98421054321"
    checksum = generate_verhoeff_checksum(base)
    full_apaar = f"{base}{checksum}"
    
    assert len(full_apaar) == 12
    assert validate_verhoeff(full_apaar) is True

def test_invalid_verhoeff_checksum_detected():
    base = "98421054321"
    correct_checksum = generate_verhoeff_checksum(base)
    # Intentionally alter the check digit
    wrong_checksum = (correct_checksum + 1) % 10
    tampered = f"{base}{wrong_checksum}"
    
    assert validate_verhoeff(tampered) is False

def test_validate_apaar_syntax_valid():
    base = "98421054321"
    checksum = generate_verhoeff_checksum(base)
    valid_id = f"{base}{checksum}"
    
    is_valid, msg = validate_apaar_syntax(valid_id)
    assert is_valid is True
    assert "Pending Registry Verification" in msg

def test_validate_apaar_syntax_invalid_length():
    is_valid, msg = validate_apaar_syntax("12345678901")  # 11 digits
    assert is_valid is False
    assert "12 digits" in msg

def test_validate_apaar_syntax_repeated_digits():
    is_valid, msg = validate_apaar_syntax("000000000000")
    assert is_valid is False
    assert "identical repeated digits" in msg

def test_format_apaar_id():
    formatted = format_apaar_id("984210543219")
    assert formatted == "9842 1054 3219"
