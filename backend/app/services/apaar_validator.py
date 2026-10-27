"""
APAAR ID Validation Service.

IMPORTANT COMPLIANCE & ARCHITECTURAL NOTE:
1. 12-digit length, non-repeated digits, and Verhoeff checksum algorithm checks are
   implemented here as internal institutional data-quality heuristics (patterned on
   standard 12-digit numerical identifier practices).
2. The Verhoeff checksum is NOT an officially published statutory requirement by the
   Ministry of Education or AICTE for APAAR IDs; institutions must not claim it as such.
3. Passing this syntax validation verifies structural consistency ONLY. It does NOT
   constitute authoritative verification of student identity, active enrolment, or ABC status.
"""
import re
from typing import Tuple

# The multiplication table (dihedral group D5)
_VERHOEFF_D = (
    (0, 1, 2, 3, 4, 5, 6, 7, 8, 9),
    (1, 2, 3, 4, 0, 6, 7, 8, 9, 5),
    (2, 3, 4, 0, 1, 7, 8, 9, 5, 6),
    (3, 4, 0, 1, 2, 8, 9, 5, 6, 7),
    (4, 0, 1, 2, 3, 9, 5, 6, 7, 8),
    (5, 9, 8, 7, 6, 0, 4, 3, 2, 1),
    (6, 5, 9, 8, 7, 1, 0, 4, 3, 2),
    (7, 6, 5, 9, 8, 2, 1, 0, 4, 3),
    (8, 7, 6, 5, 9, 3, 2, 1, 0, 4),
    (9, 8, 7, 6, 5, 4, 3, 2, 1, 0)
)

# The permutation table
_VERHOEFF_P = (
    (0, 1, 2, 3, 4, 5, 6, 7, 8, 9),
    (1, 5, 7, 6, 2, 8, 3, 0, 9, 4),
    (5, 8, 0, 3, 7, 9, 6, 1, 4, 2),
    (8, 9, 1, 6, 0, 4, 3, 5, 2, 7),
    (9, 4, 5, 3, 1, 2, 6, 8, 7, 0),
    (4, 2, 8, 6, 5, 7, 3, 9, 0, 1),
    (2, 7, 9, 3, 8, 0, 6, 4, 1, 5),
    (7, 0, 4, 6, 9, 1, 3, 2, 5, 8)
)

# The inverse table
_VERHOEFF_INV = (0, 4, 3, 2, 1, 5, 6, 7, 8, 9)


def validate_verhoeff(number_str: str) -> bool:
    """Validate a number string using the Verhoeff checksum algorithm."""
    if not number_str.isdigit():
        return False
    c = 0
    # Process from right to left
    reversed_str = number_str[::-1]
    for i, char in enumerate(reversed_str):
        c = _VERHOEFF_D[c][_VERHOEFF_P[i % 8][int(char)]]
    return c == 0


def generate_verhoeff_checksum(number_str: str) -> int:
    """Generate the check digit for a given numerical string."""
    if not number_str.isdigit():
        raise ValueError("Input must consist solely of digits")
    c = 0
    reversed_str = number_str[::-1]
    for i, char in enumerate(reversed_str):
        c = _VERHOEFF_D[c][_VERHOEFF_P[(i + 1) % 8][int(char)]]
    return _VERHOEFF_INV[c]


def format_apaar_id(apaar: str) -> str:
    """Format a 12-digit APAAR ID into standard institutional 4-4-4 groupings."""
    clean = re.sub(r"\D", "", apaar or "")
    if len(clean) == 12:
        return f"{clean[0:4]} {clean[4:8]} {clean[8:12]}"
    return clean


def validate_apaar_syntax(apaar: str) -> Tuple[bool, str]:
    """
    Validates structural syntax and Verhoeff checksum of an APAAR ID.
    Returns: (is_valid, descriptive_message)
    """
    if not apaar:
        return False, "APAAR ID is missing or empty"
    
    clean = re.sub(r"[\s\-]", "", apaar)
    
    if not clean.isdigit():
        return False, "APAAR ID must contain digits only"
    
    if len(clean) != 12:
        return False, f"APAAR ID must be exactly 12 digits (found {len(clean)})"
    
    # Check for all repeated digits (e.g., 000000000000, 111111111111)
    if len(set(clean)) == 1:
        return False, "APAAR ID cannot consist of identical repeated digits"
    
    if not validate_verhoeff(clean):
        return False, "APAAR ID failed Verhoeff checksum validation"
        
    return True, "Valid 12-digit format and Verhoeff checksum (Format Check Passed - Pending Registry Verification)"
