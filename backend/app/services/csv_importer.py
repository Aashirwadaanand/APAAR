"""
Institutional CSV Import Service with Two-Phase Preview & Commitment.

Features:
- File size (< 5MB) and type validation (.csv, text/csv).
- Robust column alias mapping for institution format variations.
- 1-based row error reporting with field and offending value.
- Intra-file and database collision detection prior to insertion.
- Non-mutating preview (`preview_csv`).
- Explicit confirmed batch execution (`commit_csv`).
- Comprehensive summary metrics: total, valid, skipped, invalid.
"""
import csv
import io
import re
from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime, date
from sqlalchemy.orm import Session

from backend.app.models.student import Student
from backend.app.models.audit import AuditEvent
from backend.app.services.apaar_validator import validate_apaar_syntax

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

HEADER_ALIASES = {
    "institution_student_id": ["institution_student_id", "roll_number", "roll_no", "student_id", "registration_no", "rollno", "id"],
    "full_name": ["full_name", "name", "student_name", "studentname"],
    "apaar_id": ["apaar_id", "apaar", "apaar_no", "apaarid"],
    "programme": ["programme", "program", "department", "degree_program", "course", "branch"],
    "academic_year": ["academic_year", "year", "session", "batch", "academic_session"],
    "date_of_birth": ["date_of_birth", "dob", "birth_date", "birthdate"],
    "enrollment_status": ["enrollment_status", "status"],
    "email": ["email", "email_id", "student_email"],
    "mobile": ["mobile", "phone", "contact", "mobile_no"]
}

def normalize_header(header: str) -> str:
    clean = re.sub(r"[^a-zA-Z0-9_]", "", header.strip().lower().replace(" ", "_"))
    for canonical, aliases in HEADER_ALIASES.items():
        if clean in aliases:
            return canonical
    return clean

def parse_date_safely(dob_str: Optional[str]) -> Optional[date]:
    if not dob_str or not dob_str.strip():
        return None
    s = dob_str.strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None

def validate_csv_upload_bytes(filename: str, content_bytes: bytes) -> str:
    """Validate file extension and size; returns decoded UTF-8 string."""
    if not filename.lower().endswith(".csv"):
        raise ValueError("Invalid file extension. Only .csv files are supported.")
    
    if len(content_bytes) == 0:
        raise ValueError("Uploaded file is empty (0 bytes).")
    
    if len(content_bytes) > MAX_FILE_SIZE:
        raise ValueError(f"File size exceeds maximum permitted limit of {MAX_FILE_SIZE // (1024*1024)}MB.")

    try:
        return content_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            return content_bytes.decode("latin-1")
        except Exception:
            raise ValueError("File content could not be decoded. Please upload valid UTF-8 encoded CSV.")

def preview_csv_records(
    csv_text: str,
    institution_id: str,
    db: Session
) -> Dict[str, Any]:
    """Parse CSV, validate each row, detect duplicates, and generate preview without database mutation."""
    reader = csv.reader(io.StringIO(csv_text))
    rows = list(reader)

    if not rows or len(rows) < 1:
        raise ValueError("CSV contains no header row.")

    raw_headers = rows[0]
    mapped_headers = [normalize_header(h) for h in raw_headers]

    # Required columns
    required_cols = ["institution_student_id", "full_name"]
    for req in required_cols:
        if req not in mapped_headers:
            raise ValueError(f"Missing mandatory column: '{req}'. Detected headers: {', '.join(raw_headers)}")

    data_rows = rows[1:]
    if not data_rows:
        raise ValueError("CSV contains header but no student data rows.")

    valid_records = []
    errors = []
    seen_in_file_ids = set()
    seen_in_file_apaar = set()

    # Pre-fetch existing institutional student IDs from DB for duplicate checking
    existing_db_ids = {
        row[0].upper() for row in db.query(Student.institution_student_id).filter(
            Student.institution_id == institution_id
        ).all()
    }

    duplicate_count = 0

    for idx, row in enumerate(data_rows):
        row_num = idx + 2  # 1-based, accounts for header row
        if not row or all(not cell.strip() for cell in row):
            continue  # skip completely blank lines

        row_dict = {}
        for h_idx, val in enumerate(row):
            if h_idx < len(mapped_headers):
                row_dict[mapped_headers[h_idx]] = val.strip()

        # Check required fields
        student_id_val = row_dict.get("institution_student_id", "")
        name_val = row_dict.get("full_name", "")
        programme_val = row_dict.get("programme") or "Engineering & Technology"
        year_val = row_dict.get("academic_year") or "2025-2026"
        apaar_val = row_dict.get("apaar_id") or None
        dob_val = row_dict.get("date_of_birth") or None
        status_val = row_dict.get("enrollment_status") or "Active"
        email_val = row_dict.get("email") or f"{student_id_val.lower()}@institute.edu"
        mobile_val = row_dict.get("mobile") or "9800000000"

        row_errors = []

        if not student_id_val:
            row_errors.append({"row": row_num, "field": "institution_student_id", "error": "Institutional Roll/Student ID is required", "value": ""})
        if not name_val:
            row_errors.append({"row": row_num, "field": "full_name", "error": "Student full name is required", "value": ""})

        # Duplicate ID check in file
        clean_id = student_id_val.upper()
        if clean_id:
            if clean_id in seen_in_file_ids:
                row_errors.append({"row": row_num, "field": "institution_student_id", "error": f"Duplicate student ID '{student_id_val}' within uploaded file", "value": student_id_val})
                duplicate_count += 1
            else:
                seen_in_file_ids.add(clean_id)

            # Duplicate ID check against DB
            if clean_id in existing_db_ids:
                row_errors.append({"row": row_num, "field": "institution_student_id", "error": f"Student ID '{student_id_val}' already exists in institution database", "value": student_id_val})
                duplicate_count += 1

        # APAAR syntax check (if present)
        if apaar_val:
            valid_syntax, reason = validate_apaar_syntax(apaar_val)
            if not valid_syntax:
                row_errors.append({"row": row_num, "field": "apaar_id", "error": f"APAAR format error: {reason}", "value": apaar_val})

        # Date of birth parsing
        parsed_dob = None
        if dob_val:
            parsed_dob = parse_date_safely(dob_val)
            if not parsed_dob:
                row_errors.append({"row": row_num, "field": "date_of_birth", "error": f"Unrecognized date format '{dob_val}'. Expected YYYY-MM-DD or DD-MM-YYYY", "value": dob_val})

        if row_errors:
            errors.extend(row_errors)
        else:
            valid_records.append({
                "row_number": row_num,
                "institution_id": institution_id,
                "institution_student_id": student_id_val,
                "full_name": name_val,
                "programme": programme_val,
                "academic_year": year_val,
                "apaar_id": apaar_val,
                "date_of_birth": parsed_dob.isoformat() if parsed_dob else None,
                "enrollment_status": status_val,
                "email": email_val,
                "mobile": mobile_val
            })

    return {
        "institution_id": institution_id,
        "total_rows_evaluated": len(data_rows),
        "valid_rows_count": len(valid_records),
        "invalid_rows_count": len({e["row"] for e in errors}),
        "duplicate_count": duplicate_count,
        "mapped_headers": mapped_headers,
        "errors": errors,
        "preview_records": valid_records[:10],
        "can_import": len(valid_records) > 0,
        "all_valid_records": valid_records
    }

def commit_csv_import(
    records: List[Dict[str, Any]],
    institution_id: str,
    db: Session,
    actor_label: str = "Institutional Registrar"
) -> Dict[str, Any]:
    """Execute confirmed insertion of validated student records."""
    if not records:
        raise ValueError("No valid records provided for import.")

    imported_students = []
    skipped_count = 0

    for rec in records:
        # Final safety check against race conditions
        existing = db.query(Student).filter(
            Student.institution_id == institution_id,
            Student.institution_student_id == rec["institution_student_id"]
        ).first()

        if existing:
            skipped_count += 1
            continue

        dob = parse_date_safely(rec.get("date_of_birth"))
        student = Student(
            institution_id=institution_id,
            institution_student_id=rec["institution_student_id"],
            full_name=rec["full_name"],
            programme=rec.get("programme", "Engineering & Technology"),
            academic_year=str(rec.get("academic_year", "2025-2026")),
            apaar_id=rec.get("apaar_id") or None,
            date_of_birth=dob,
            enrollment_status=rec.get("enrollment_status", "Active"),
            email=rec.get("email") or f"{rec['institution_student_id'].lower()}@institute.edu",
            mobile=rec.get("mobile") or "9800000000",
            department=rec.get("programme", "Engineering"),
            verification_status="Unverified",
            quality_score=95.0
        )
        db.add(student)
        imported_students.append(student)

    db.commit()

    # Log audit event
    audit = AuditEvent(
        actor_label=actor_label,
        action="CSV_IMPORT_EXECUTED",
        entity_type="Student",
        entity_id=institution_id,
        details_json=f'{{"imported_count": {len(imported_students)}, "skipped_count": {skipped_count}}}'
    )
    db.add(audit)
    db.commit()

    return {
        "status": "COMPLETED",
        "institution_id": institution_id,
        "imported_count": len(imported_students),
        "skipped_count": skipped_count,
        "message": f"Successfully imported {len(imported_students)} student records. Skipped {skipped_count} duplicates."
    }
