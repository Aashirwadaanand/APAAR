export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentColor = 'forest' | 'slate' | 'terracotta';
export type DensityMode = 'comfortable' | 'compact';
export type DashboardLayoutMode = 'standard' | 'compliance';

export interface AppearanceSettings {
  theme: ThemeMode;
  accent: AccentColor;
  density: DensityMode;
  sidebarCollapsed: boolean;
  dashboardLayout: DashboardLayoutMode;
  reducedMotion: boolean;
}

export interface Institution {
  id: string;
  institution_code: string;
  institution_name: string;
  approved_intake: number;
  programme: string;
  academic_year: string;
  state?: string;
  district?: string;
  status: string;
  created_at?: string;
}

export interface Student {
  id: number;
  institution_id: string;
  institution_student_id: string;
  roll_number?: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  gender?: string;
  father_name?: string;
  date_of_birth?: string | null;
  programme: string;
  academic_year: string;
  apaar_id?: string | null;
  abc_id?: string | null;
  aadhaar_vault_ref?: string | null;
  enrollment_status: 'Active' | 'Suspended' | 'Graduated' | 'Transferred' | string;
  verification_status: 'Unverified' | 'In_Sandbox_Verification' | 'Verified_Simulated' | 'Flagged' | 'Rejected' | string;
  quality_score: number;
  email?: string;
  mobile?: string;
  department?: string;
  degree_program?: string;
  admission_year?: number;
  created_at?: string;
  updated_at?: string;
}

export interface StudentListResponse {
  total: number;
  page: number;
  page_size: number;
  items: Student[];
}

export interface IntegrityCase {
  id: number;
  case_type: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED' | string;
  institution_id?: string | null;
  student_id?: number | null;
  summary: string;
  evidence_json: string;
  recommended_action: string;
  created_at: string;
  updated_at?: string | null;
  resolved_at?: string | null;
  resolution_note?: string | null;
}

export interface CaseResolvePayload {
  resolution_note: string;
  status: 'RESOLVED' | 'DISMISSED';
}

export interface IntegrityScanResponse {
  scanned_students: number;
  scanned_institutions: number;
  findings_count: number;
  new_cases_created: number;
  existing_cases_updated: number;
  message: string;
}

export interface VerificationScenarioInfo {
  label: string;
  description: string;
  expected_outcome: string;
  default_service: string;
}

export interface VerificationRun {
  id: number;
  scenario: string;
  service_name: string;
  request_json: string;
  response_json: string;
  outcome: string;
  simulated: boolean;
  duration_ms: number;
  created_at: string;
  student_id?: number | null;
}

export interface VerificationRunPayload {
  scenario: string;
  apaar_id?: string;
  full_name?: string;
  date_of_birth?: string;
  student_id?: number;
}

export interface AuditEvent {
  id: number;
  actor_label: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details_json: string;
  created_at: string;
  severity?: string;
  actor_name?: string;
  actor_role?: string;
  module?: string;
  description?: string;
}

export interface CsvRowError {
  row: number;
  field: string;
  error: string;
  value: string;
}

export interface CsvPreviewRecord {
  row_number: number;
  institution_id: string;
  institution_student_id: string;
  full_name: string;
  programme: string;
  academic_year: string;
  apaar_id?: string | null;
  date_of_birth?: string | null;
  enrollment_status: string;
  email: string;
  mobile: string;
}

export interface CsvPreviewResponse {
  institution_id: string;
  total_rows_evaluated: number;
  valid_rows_count: number;
  invalid_rows_count: number;
  duplicate_count: number;
  mapped_headers: string[];
  errors: CsvRowError[];
  preview_records: CsvPreviewRecord[];
  can_import: boolean;
  all_valid_records: CsvPreviewRecord[];
}

export interface CsvImportCommitResponse {
  status: string;
  institution_id: string;
  imported_count: number;
  skipped_count: number;
  message: string;
}

export interface InstitutionIntakeComparison {
  institution_id: string;
  institution_code: string;
  institution_name: string;
  approved_intake: number;
  enrolled_count: number;
  open_cases: number;
  status: 'NORMAL' | 'EXCEEDED';
  over_by: number;
}

export interface RecentIntegrityCase {
  id: number;
  case_type: string;
  severity: string;
  status: string;
  summary: string;
  created_at: string;
  institution_id?: string | null;
}

export interface DashboardStats {
  total_students: number;
  active_enrollments: number;
  apaar_registered_count: number;
  apaar_coverage_percentage: number;
  verified_count: number;
  verification_rate_percentage: number;
  flagged_issues_count: number;
  open_review_cases: number;
  critical_dual_enrollments: number;
  average_data_quality_score: number;
}

export interface DepartmentMetric {
  department: string;
  student_count: number;
  apaar_coverage: number;
  verified_count: number;
}

export interface VerificationBreakdown {
  unverified: number;
  in_sandbox: number;
  verified_simulated: number;
  flagged: number;
  rejected: number;
}

export interface DashboardSummary {
  stats: DashboardStats;
  department_metrics: DepartmentMetric[];
  verification_breakdown: VerificationBreakdown;
  recent_audit_events: Array<{
    id: number;
    action: string;
    actor: string;
    timestamp: string;
    description: string;
    module: string;
  }>;
  institutions_count: number;
  open_integrity_cases: number;
  records_requiring_review: number;
  intake_exceptions: number;
  institution_intake_comparison: InstitutionIntakeComparison[];
  cases_by_severity: Record<string, number>;
  cases_by_type: Record<string, number>;
  recent_cases: RecentIntegrityCase[];
}
