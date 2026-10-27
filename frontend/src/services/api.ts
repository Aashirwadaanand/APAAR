import type {
  Student,
  StudentListResponse,
  Institution,
  IntegrityCase,
  CaseResolvePayload,
  IntegrityScanResponse,
  VerificationScenarioInfo,
  VerificationRun,
  VerificationRunPayload,
  AuditEvent,
  CsvPreviewResponse,
  CsvImportCommitResponse,
  CsvPreviewRecord,
  DashboardSummary
} from '../types';

// Resolve API base URL:
// In production on Render, VITE_API_BASE_URL points to the public Web Service URL
// (e.g. "https://apaar-backend.onrender.com"). We normalize it to include "/api".
// In local development, when unset, it defaults to "/api" which Vite proxies to http://127.0.0.1:8000.
const rawEnvUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
const cleanEnvUrl = rawEnvUrl.replace(/\/+$/, '');

export const BASE_URL = cleanEnvUrl
  ? cleanEnvUrl.endsWith('/api')
    ? cleanEnvUrl
    : `${cleanEnvUrl}/api`
  : '/api';


async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = `Request failed with status ${res.status}`;
    try {
      const errorData = await res.json();
      if (typeof errorData.detail === 'string') {
        errorDetail = errorData.detail;
      } else if (Array.isArray(errorData.detail)) {
        errorDetail = errorData.detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
      }
    } catch {
      // ignore JSON parse error
    }
    throw new Error(errorDetail);
  }
  return res.json();
}

export const api = {
  // System Health
  async getHealth(): Promise<{ status: string; app?: string; version?: string; database: string }> {
    return handleResponse(await fetch(`${BASE_URL}/health`));
  },

  // Dashboard Overview
  async getDashboardSummary(): Promise<DashboardSummary> {
    return handleResponse(await fetch(`${BASE_URL}/dashboard/summary`));
  },

  // Institutions
  async getInstitutions(): Promise<Institution[]> {
    return handleResponse(await fetch(`${BASE_URL}/institutions`));
  },

  async createInstitution(data: Partial<Institution>): Promise<Institution> {
    return handleResponse(await fetch(`${BASE_URL}/institutions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }));
  },

  // Student Registry
  async getStudents(params?: {
    page?: number;
    page_size?: number;
    institution_id?: string;
    status?: string;
    department?: string;
    search?: string;
  }): Promise<StudentListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.page_size) query.set('page_size', params.page_size.toString());
    if (params?.institution_id) query.set('institution_id', params.institution_id);
    if (params?.status) query.set('status', params.status);
    if (params?.department) query.set('department', params.department);
    if (params?.search) query.set('search', params.search);

    return handleResponse(await fetch(`${BASE_URL}/students?${query.toString()}`));
  },

  async getStudentById(id: number): Promise<Student> {
    return handleResponse(await fetch(`${BASE_URL}/students/${id}`));
  },

  async createStudent(payload: Partial<Student>): Promise<Student> {
    return handleResponse(await fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }));
  },

  async updateStudent(id: number, payload: Partial<Student>): Promise<Student> {
    return handleResponse(await fetch(`${BASE_URL}/students/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }));
  },

  // CSV Import (Two-phase)
  async previewCsvImport(file: File, institutionId: string = 'AICTE-1-432890123'): Promise<CsvPreviewResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('institution_id', institutionId);

    const res = await fetch(`${BASE_URL}/students/import-preview`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<CsvPreviewResponse>(res);
  },

  async confirmCsvImport(records: CsvPreviewRecord[], institutionId: string): Promise<CsvImportCommitResponse> {
    return handleResponse(await fetch(`${BASE_URL}/students/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        institution_id: institutionId,
        records: records,
      }),
    }));
  },

  // Integrity Engine
  async getIntegrityCases(params?: {
    status?: string;
    institution_id?: string;
    severity?: string;
  }): Promise<IntegrityCase[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.institution_id) query.set('institution_id', params.institution_id);
    if (params?.severity) query.set('severity', params.severity);

    return handleResponse(await fetch(`${BASE_URL}/integrity/cases?${query.toString()}`));
  },

  async getIntegrityCaseById(id: number): Promise<IntegrityCase> {
    return handleResponse(await fetch(`${BASE_URL}/integrity/cases/${id}`));
  },

  async runIntegrityScan(payload?: {
    institution_id?: string;
    intake_policy?: Record<string, any>;
  }): Promise<IntegrityScanResponse> {
    return handleResponse(await fetch(`${BASE_URL}/integrity/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    }));
  },

  async resolveIntegrityCase(id: number, payload: CaseResolvePayload): Promise<IntegrityCase> {
    return handleResponse(await fetch(`${BASE_URL}/integrity/cases/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }));
  },

  // Verification Sandbox
  async getVerificationScenarios(): Promise<Record<string, VerificationScenarioInfo>> {
    return handleResponse(await fetch(`${BASE_URL}/verification/scenarios`));
  },

  async runVerification(payload: VerificationRunPayload): Promise<VerificationRun> {
    return handleResponse(await fetch(`${BASE_URL}/verification/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }));
  },

  async getVerificationRuns(limit: number = 30, scenario?: string): Promise<VerificationRun[]> {
    const query = new URLSearchParams({ limit: limit.toString() });
    if (scenario) query.set('scenario', scenario);
    return handleResponse(await fetch(`${BASE_URL}/verification/runs?${query.toString()}`));
  },

  // Audit Trail
  async getAuditEvents(params?: {
    entity_type?: string;
    action?: string;
    limit?: number;
  }): Promise<AuditEvent[]> {
    const query = new URLSearchParams();
    if (params?.entity_type) query.set('entity_type', params.entity_type);
    if (params?.action) query.set('action', params.action);
    if (params?.limit) query.set('limit', params.limit.toString());

    return handleResponse(await fetch(`${BASE_URL}/audit?${query.toString()}`));
  },

  // Reports
  getExportStudentsCsvUrl(institutionId?: string): string {
    if (institutionId) {
      return `${BASE_URL}/reports/export.csv?institution_id=${encodeURIComponent(institutionId)}`;
    }
    return `${BASE_URL}/reports/export.csv`;
  },
};
