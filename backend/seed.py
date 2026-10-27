import os
import sys
from datetime import date, datetime
from sqlalchemy.orm import Session

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.db.session import SessionLocal, Base, engine
from backend.app.models.institution import Institution
from backend.app.models.student import Student
from backend.app.models.case import IntegrityCase
from backend.app.models.sandbox import VerificationRun
from backend.app.models.audit import AuditEvent
from backend.app.models.quality import DataQualityIssue
from backend.app.models.duplicate import CrossInstitutionMatch
from backend.app.models.setting import SystemSetting
from backend.app.services.apaar_validator import generate_verhoeff_checksum
from backend.app.services.integrity_engine import run_integrity_scan

def generate_valid_synthetic_apaar(prefix_11: str) -> str:
    """Generate 12-digit synthetic APAAR with valid Verhoeff checksum."""
    check = generate_verhoeff_checksum(prefix_11)
    return f"{prefix_11}{check}"

def seed_database(db: Session = None, force: bool = False):
    close_after = False
    if force:
        print("Recreating database schema with updated Prompt 2 columns...")
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)

    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        close_after = True

    try:
        try:
            existing_count = db.query(Student).count()
        except Exception as e:
            print(f"[SEED] Tables not present or query error ({e}). Ensuring tables are created...")
            Base.metadata.create_all(bind=engine)
            existing_count = 0

        if existing_count > 0 and not force:
            print(f"Database already contains {existing_count} student records. Skipping seed.")
            return

        print("Seeding 3 institutions and ~65 synthetic student records with deliberate edge cases...")

        # -------------------------------------------------------------------------
        # 1. Three Fictional Institutions
        # -------------------------------------------------------------------------
        inst1 = Institution(
            id="AICTE-1-432890123",
            institution_code="AIT-PUN",
            institution_name="Apex Institute of Technology & Management",
            approved_intake=45,
            programme="Engineering & Technology",
            academic_year="2025-2026",
            state="Maharashtra",
            district="Pune",
            status="Active"
        )
        inst2 = Institution(
            id="AICTE-1-109283741",
            institution_code="SPCE-MUM",
            institution_name="Sardar Patel College of Engineering",
            approved_intake=40,
            programme="Engineering & Technology",
            academic_year="2025-2026",
            state="Maharashtra",
            district="Mumbai",
            status="Active"
        )
        inst3 = Institution(
            id="AICTE-1-987654321",
            institution_code="KIIS-BHU",
            institution_name="Kalinga Institute of Industrial Science",
            approved_intake=12,
            programme="Engineering & Technology",
            academic_year="2025-2026",
            state="Odisha",
            district="Bhubaneswar",
            status="Active"
        )
        db.add_all([inst1, inst2, inst3])
        db.flush()

        # -------------------------------------------------------------------------
        # Synthetic APAAR IDs (All 11 digits base -> 12 digits with check digit)
        # -------------------------------------------------------------------------
        apaar_valid_1 = generate_valid_synthetic_apaar("90000000001")
        apaar_intra_dupe = generate_valid_synthetic_apaar("88880000001")
        apaar_cross_dupe = generate_valid_synthetic_apaar("77770000001")
        apaar_conflict = generate_valid_synthetic_apaar("66660000001")
        apaar_bad_checksum = "984210543217"  # 12 digits but intentionally bad checksum
        apaar_unknown_registry = generate_valid_synthetic_apaar("55550000001")

        students_to_insert = []

        # -------------------------------------------------------------------------
        # Institution 1 (AIT-PUN): 30 records
        # -------------------------------------------------------------------------
        first_names_ait = ["Aarav", "Ananya", "Ishaan", "Diya", "Kabir", "Meera", "Aditya", "Rhea", "Vivaan", "Sanya",
                           "Aryan", "Tanvi", "Vihaan", "Anushka", "Reyansh", "Pari", "Arjun", "Myra", "Sai", "Aadhya"]
        last_names_ait = ["Sharma", "Patil", "Deshmukh", "Joshi", "Kulkarni", "Chavan", "Pawar", "Shinde", "More", "Gaikwad"]

        for i in range(20):
            fn = first_names_ait[i]
            ln = last_names_ait[i % len(last_names_ait)]
            roll = f"AIT-2024-CSE-{100 + i}"
            apaar = generate_valid_synthetic_apaar(f"910000000{10 + i:02d}")
            students_to_insert.append(Student(
                institution_id=inst1.id,
                institution_student_id=roll,
                full_name=f"{fn} {ln}",
                date_of_birth=date(2004, (i % 12) + 1, (i % 25) + 1),
                programme="B.Tech Computer Science",
                academic_year="2025-2026",
                apaar_id=apaar,
                enrollment_status="Active",
                email=f"{roll.lower()}@apex.edu.in",
                mobile=f"982301{1000 + i}",
                department="Computer Science & Engineering",
                verification_status="Verified_Simulated" if i < 10 else "Unverified"
            ))

        # Edge Case 1: Intra-institution duplicate APAAR (AIT-2024-CSE-091 & AIT-2024-CSE-092)
        s_intra1 = Student(
            institution_id=inst1.id,
            institution_student_id="AIT-2024-CSE-091",
            full_name="Nikhil Kadam",
            date_of_birth=date(2004, 3, 15),
            programme="B.Tech Computer Science",
            academic_year="2025-2026",
            apaar_id=apaar_intra_dupe,
            enrollment_status="Active",
            department="Computer Science & Engineering"
        )
        s_intra2 = Student(
            institution_id=inst1.id,
            institution_student_id="AIT-2024-CSE-092",
            full_name="Pankaj Kadam",
            date_of_birth=date(2004, 3, 15),
            programme="B.Tech Computer Science",
            academic_year="2025-2026",
            apaar_id=apaar_intra_dupe,
            enrollment_status="Active",
            department="Computer Science & Engineering"
        )
        students_to_insert.extend([s_intra1, s_intra2])

        # Edge Case 2: Cross-institution duplicate
        s_cross_ait = Student(
            institution_id=inst1.id,
            institution_student_id="AIT-2024-MECH-008",
            full_name="Siddharth Verma",
            date_of_birth=date(2004, 9, 30),
            programme="B.Tech Mechanical Engineering",
            academic_year="2025-2026",
            apaar_id=apaar_cross_dupe,
            enrollment_status="Active",
            department="Mechanical Engineering"
        )
        students_to_insert.append(s_cross_ait)

        # Edge Case 3: Conflicting Attributes
        s_conflict_ait = Student(
            institution_id=inst1.id,
            institution_student_id="AIT-2024-ECE-015",
            full_name="Rohan Deshmukh",
            date_of_birth=date(2004, 11, 3),
            programme="B.Tech Electronics & Comm",
            academic_year="2025-2026",
            apaar_id=apaar_conflict,
            enrollment_status="Active",
            department="Electronics & Communication"
        )
        students_to_insert.append(s_conflict_ait)

        # Edge Case 4: Malformed APAAR Checksum
        s_bad_apaar = Student(
            institution_id=inst1.id,
            institution_student_id="AIT-2024-CSE-042",
            full_name="Kavita Joshi",
            date_of_birth=date(2005, 3, 19),
            programme="B.Tech Computer Science",
            academic_year="2025-2026",
            apaar_id=apaar_bad_checksum,
            enrollment_status="Active",
            department="Computer Science & Engineering"
        )
        students_to_insert.append(s_bad_apaar)

        # Edge Case 5: Missing Required Field (no programme)
        s_missing_prog = Student(
            institution_id=inst1.id,
            institution_student_id="AIT-2025-CIVIL-099",
            full_name="Devendra Rao",
            date_of_birth=date(1975, 1, 10),
            programme="",
            academic_year="2025-2026",
            apaar_id=apaar_valid_1,
            enrollment_status="Active",
            department="Civil Engineering"
        )
        students_to_insert.append(s_missing_prog)

        # Edge Case 6: Unknown identifier in simulated registry
        s_unk_reg = Student(
            institution_id=inst1.id,
            institution_student_id="AIT-2025-CSE-055",
            full_name="Tanya Sen",
            date_of_birth=date(2005, 7, 21),
            programme="B.Tech Computer Science",
            academic_year="2025-2026",
            apaar_id=apaar_unknown_registry,
            enrollment_status="Active",
            department="Computer Science & Engineering"
        )
        students_to_insert.append(s_unk_reg)

        # Pending APAAR
        s_pend = Student(
            institution_id=inst1.id,
            institution_student_id="AIT-2025-CSE-104",
            full_name="Pooja Kulkarni",
            date_of_birth=date(2006, 2, 17),
            programme="B.Tech Computer Science",
            academic_year="2025-2026",
            apaar_id=None,
            enrollment_status="Active",
            department="Computer Science & Engineering"
        )
        students_to_insert.append(s_pend)

        # -------------------------------------------------------------------------
        # Institution 2 (SPCE-MUM): 20 records
        # -------------------------------------------------------------------------
        s_cross_spce = Student(
            institution_id=inst2.id,
            institution_student_id="SPCE-2024-MECH-042",
            full_name="Siddharth Verma",
            date_of_birth=date(2004, 9, 30),
            programme="B.Tech Mechanical Engineering",
            academic_year="2025-2026",
            apaar_id=apaar_cross_dupe,
            enrollment_status="Active",
            department="Mechanical Engineering"
        )
        s_conflict_spce = Student(
            institution_id=inst2.id,
            institution_student_id="SPCE-2024-ECE-099",
            full_name="Sunil Narang",
            date_of_birth=date(2001, 7, 19),
            programme="B.Tech Electronics",
            academic_year="2025-2026",
            apaar_id=apaar_conflict,
            enrollment_status="Active",
            department="Electronics & Communication"
        )
        students_to_insert.extend([s_cross_spce, s_conflict_spce])

        for j in range(18):
            roll = f"SPCE-2024-CIV-{200 + j}"
            apaar = generate_valid_synthetic_apaar(f"920000000{10 + j:02d}")
            students_to_insert.append(Student(
                institution_id=inst2.id,
                institution_student_id=roll,
                full_name=f"Student_{j} Mumbai",
                date_of_birth=date(2004, (j % 12) + 1, (j % 27) + 1),
                programme="B.Tech Civil Engineering",
                academic_year="2025-2026",
                apaar_id=apaar,
                enrollment_status="Active",
                email=f"{roll.lower()}@spce.ac.in",
                department="Civil Engineering",
                verification_status="Verified_Simulated" if j % 2 == 0 else "Unverified"
            ))

        # -------------------------------------------------------------------------
        # Institution 3 (KIIS-BHU): 15 records (Exceeds approved_intake of 12!)
        # -------------------------------------------------------------------------
        for k in range(15):
            roll = f"KIIS-2025-IT-{300 + k}"
            apaar = generate_valid_synthetic_apaar(f"930000000{10 + k:02d}")
            students_to_insert.append(Student(
                institution_id=inst3.id,
                institution_student_id=roll,
                full_name=f"Scholar_{k} Kalinga",
                date_of_birth=date(2005, (k % 12) + 1, (k % 28) + 1),
                programme="B.Tech Information Technology",
                academic_year="2025-2026",
                apaar_id=apaar,
                enrollment_status="Active",
                email=f"{roll.lower()}@kiis.ac.in",
                department="Information Technology",
                verification_status="Unverified"
            ))

        db.add_all(students_to_insert)
        db.commit()

        # Seed DataQualityIssue records for backward compatibility test suite
        q_issue = DataQualityIssue(
            student_id=s_bad_apaar.id,
            rule_code="ERR_APAAR_CHECKSUM",
            severity="Critical",
            field_name="apaar_id",
            description=f"Invalid APAAR syntax on roll {s_bad_apaar.institution_student_id}: failed Verhoeff checksum",
            is_resolved=False
        )
        db.add(q_issue)

        # Seed CrossInstitutionMatch record for backward compatibility test suite
        cross_match = CrossInstitutionMatch(
            primary_student_id=s_cross_ait.id,
            matched_institution_name="Sardar Patel College of Engineering",
            matched_institution_code="SPCE-MUM",
            matched_student_name="Siddharth Verma",
            matched_roll_number="SPCE-2024-MECH-042",
            matched_program="B.Tech Mechanical Engineering",
            matched_academic_year=2025,
            matched_apaar_id=apaar_cross_dupe,
            match_type="EXACT_APAAR_COLLISION",
            confidence_score=99,
            severity="Critical",
            status="Open",
            conflict_summary="Concurrent active enrollment found across AIT and SPCE."
        )
        db.add(cross_match)

        # Run automated initial scan so IntegrityCases are automatically generated from seeded anomalies!
        print("Running initial integrity scan to populate cases from seeded anomalies...")
        scan_result = run_integrity_scan(db)
        print(f"Initial scan identified {scan_result.findings_count} findings, created {scan_result.new_cases_created} cases.")

        # Seed initial VerificationRuns
        v_run_1 = VerificationRun(
            scenario="success",
            service_name="MOCK_REGISTRY",
            request_json='{"apaar_id": "900000000018", "full_name": "Aarav Sharma"}',
            response_json='{"outcome": "MATCHED", "match_score": 1.0, "registry_status": "ACTIVE_VERIFIED"}',
            outcome="MATCHED",
            simulated=True,
            duration_ms=160
        )
        v_run_2 = VerificationRun(
            scenario="timeout",
            service_name="FAILURE_SIMULATION",
            request_json='{"apaar_id": "984210543217"}',
            response_json='{"simulated_timeout": true, "error": {"code": "SIMULATED_GATEWAY_TIMEOUT"}}',
            outcome="TIMEOUT",
            simulated=True,
            duration_ms=500
        )
        db.add_all([v_run_1, v_run_2])

        # Seed Settings
        setting = SystemSetting(
            key="appearance_theme",
            value='{"canvas": "#F7F7F2", "primary": "#245C48", "selected": "#D8E6D8", "density": "comfortable"}',
            category="appearance"
        )
        db.add(setting)

        # Audit Event
        audit = AuditEvent(
            actor_label="System Bootstrapper",
            action="DATABASE_SEEDED",
            entity_type="System",
            entity_id="ALL",
            details_json=f'{{"institutions": 3, "students": {len(students_to_insert)}}}',
            description="Database seeded with initial institutional cohorts."
        )
        db.add(audit)
        db.commit()

        print("Database seeded and verified successfully.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        if close_after:
            db.close()

if __name__ == "__main__":
    seed_database(force=True)
