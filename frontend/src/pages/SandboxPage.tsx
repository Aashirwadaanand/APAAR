import React, { useEffect, useState } from 'react';
import {
  Terminal,
  Shield,
  Play,
  RotateCcw,
  Copy,
  Check,
  Clock,
  FileCode,
  History,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import type { VerificationScenarioInfo, VerificationRun } from '../types';
import { useToast } from '../context/ToastContext';

interface TestPreset {
  id: string;
  label: string;
  badge: string;
  badgeClass: string;
  scenario: string;
  apaar_id: string;
  full_name: string;
  date_of_birth: string;
  description: string;
}

const TEST_PRESETS: TestPreset[] = [
  {
    id: 'aarav_match',
    label: 'Aarav Sharma (Exact Registry Match)',
    badge: 'EXPECT: MATCHED (200)',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800',
    scenario: 'normal',
    apaar_id: '900000000018',
    full_name: 'Aarav Sharma',
    date_of_birth: '2004-03-15',
    description: 'Enrolled student record in Apex Institute (AIT-PUN). Both full name and date of birth match stored registry data.',
  },
  {
    id: 'name_mismatch',
    label: 'Name Discrepancy (Aarav Verma)',
    badge: 'EXPECT: MISMATCH (200)',
    badgeClass: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800',
    scenario: 'normal',
    apaar_id: '900000000018',
    full_name: 'Aarav Verma',
    date_of_birth: '2004-03-15',
    description: 'Identifier exists in registry and DOB matches, but submitted full name differs from stored record.',
  },
  {
    id: 'dob_mismatch',
    label: 'DOB Discrepancy (Year 2001 vs 2004)',
    badge: 'EXPECT: MISMATCH (200)',
    badgeClass: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800',
    scenario: 'normal',
    apaar_id: '900000000018',
    full_name: 'Aarav Sharma',
    date_of_birth: '2001-01-01',
    description: 'Identifier exists in registry and full name matches, but submitted date of birth differs from stored record.',
  },
  {
    id: 'unknown_id',
    label: 'Unregistered Identifier (404 Not Found)',
    badge: 'EXPECT: NOT_FOUND (404)',
    badgeClass: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700',
    scenario: 'normal',
    apaar_id: '999900000016',
    full_name: 'Unregistered Student',
    date_of_birth: '2004-01-01',
    description: 'Syntactically valid 12-digit APAAR with valid Verhoeff checksum, but not issued to any student in the registry.',
  },
];

export const SandboxPage: React.FC = () => {
  const { showToast } = useToast();

  const [scenarios, setScenarios] = useState<Record<string, VerificationScenarioInfo>>({});
  const [selectedScenarioKey, setSelectedScenarioKey] = useState<string>('normal');

  // Editable synthetic payload fields
  const [apaarId, setApaarId] = useState('900000000018');
  const [fullName, setFullName] = useState('Aarav Sharma');
  const [dob, setDob] = useState('2004-03-15');

  // Execution state
  const [executing, setExecuting] = useState(false);
  const [latestRun, setLatestRun] = useState<VerificationRun | null>(null);
  const [historyRuns, setHistoryRuns] = useState<VerificationRun[]>([]);
  const [copiedRequest, setCopiedRequest] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);

  // Synchronize a verification run across left request form and right response inspector
  const syncRunToUI = (run: VerificationRun) => {
    setLatestRun(run);
    try {
      const parsedReq = JSON.parse(run.request_json);
      if (parsedReq.apaar_id !== undefined) setApaarId(parsedReq.apaar_id);
      if (parsedReq.full_name !== undefined) setFullName(parsedReq.full_name);
      if (parsedReq.date_of_birth !== undefined) setDob(parsedReq.date_of_birth);
      if (run.scenario) setSelectedScenarioKey(run.scenario);
    } catch {
      // Ignore request json parse errors
    }
  };

  // Load scenarios and recent runs on mount
  useEffect(() => {
    api.getVerificationScenarios()
      .then((data) => {
        setScenarios(data);
      })
      .catch(() => {});

    fetchHistory(true);
  }, []);

  const fetchHistory = async (syncInitial: boolean = false) => {
    try {
      const runs = await api.getVerificationRuns(15);
      setHistoryRuns(runs);
      if (runs.length > 0 && syncInitial && !latestRun) {
        syncRunToUI(runs[0]);
      }
    } catch {
      // ignore
    }
  };

  const handleApplyPreset = (preset: TestPreset) => {
    setSelectedScenarioKey(preset.scenario);
    setApaarId(preset.apaar_id);
    setFullName(preset.full_name);
    setDob(preset.date_of_birth);
    showToast(`Loaded test preset: ${preset.label}`, 'info');
  };

  const handleReset = () => {
    const defaultPreset = TEST_PRESETS[0];
    setSelectedScenarioKey('normal');
    setApaarId(defaultPreset.apaar_id);
    setFullName(defaultPreset.full_name);
    setDob(defaultPreset.date_of_birth);
    showToast('Reset request fields to default student record (Aarav Sharma).', 'info');
  };

  const handleRunVerification = async () => {
    try {
      setExecuting(true);
      const res = await api.runVerification({
        scenario: selectedScenarioKey,
        apaar_id: apaarId,
        full_name: fullName,
        date_of_birth: dob,
      });
      syncRunToUI(res);
      showToast(
        `Verification executed: ${res.outcome} (${res.duration_ms}ms simulated latency)`,
        res.outcome === 'MATCHED' ? 'success' : res.outcome === 'MISMATCH' ? 'info' : 'warning',
        'Verification Sandbox'
      );
      fetchHistory(false);
    } catch (err: any) {
      showToast(err.message || 'Verification simulation failed', 'error');
    } finally {
      setExecuting(false);
    }
  };

  const copyToClipboard = (text: string, type: 'req' | 'res') => {
    navigator.clipboard.writeText(text);
    if (type === 'req') {
      setCopiedRequest(true);
      setTimeout(() => setCopiedRequest(false), 2000);
    } else {
      setCopiedResponse(true);
      setTimeout(() => setCopiedResponse(false), 2000);
    }
    showToast('Copied to clipboard', 'info');
  };

  // Helper to parse parsed latestRun response and request safely
  const parsedResponse = React.useMemo(() => {
    if (!latestRun) return null;
    try {
      return JSON.parse(latestRun.response_json);
    } catch {
      return null;
    }
  }, [latestRun]);

  const parsedRequest = React.useMemo(() => {
    if (!latestRun) return null;
    try {
      return JSON.parse(latestRun.request_json);
    } catch {
      return null;
    }
  }, [latestRun]);

  const activeScenarioInfo = scenarios[selectedScenarioKey];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-surface border border-institutional rounded-xl p-4 card-padded shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-institutional-main">Verification Sandbox</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 font-mono">
              DATA-DRIVEN LOOKUP
            </span>
          </div>
          <p className="text-xs text-institutional-muted mt-0.5">
            Submit candidate demographic records to evaluate dynamic registry lookup, field comparison discrepancies, or test simulation edge conditions.
          </p>
        </div>
      </div>

      {/* Prominent Architectural Simulation Disclaimer */}
      <div className="p-3.5 px-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-xs flex items-start gap-3">
        <Shield className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-amber-900 dark:text-amber-200">
          <strong className="font-semibold">Simulated Registry Environment:</strong> All verification queries look up candidate records against local synthetic student registry data. Zero network calls are made to live government UIDAI, ABC, or CIDR infrastructure. All tokens and response artifacts are strictly synthetic.
        </div>
      </div>

      {/* Two-Column Interactive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form & Request Construction (5 cols) */}
        <div className="lg:col-span-5 bg-surface border border-institutional rounded-xl shadow-xs overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-institutional bg-surface-secondary/40 flex items-center justify-between">
            <h3 className="text-xs font-bold text-institutional-main uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4 text-institutional-primary" />
              1. Candidate Verification Request
            </h3>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-institutional-muted hover:text-institutional-main flex items-center gap-1 transition-colors"
              title="Reset fields to canonical student record"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>

          <div className="p-5 space-y-4 text-xs">
            {/* Quick Presets / Personas */}
            <div>
              <label className="block text-institutional-muted font-medium mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-institutional-primary" />
                Quick Test Personas
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TEST_PRESETS.map((p) => {
                  const isMatch =
                    apaarId === p.apaar_id &&
                    fullName === p.full_name &&
                    dob === p.date_of_birth &&
                    selectedScenarioKey === p.scenario;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className={`text-left p-2 rounded-lg border transition-all text-[11px] ${
                        isMatch
                          ? 'border-institutional-primary bg-institutional-primary/10 font-semibold'
                          : 'border-institutional bg-surface-secondary hover:bg-surface-hover text-institutional-main'
                      }`}
                    >
                      <div className="font-medium truncate">{p.label}</div>
                      <span className={`inline-block mt-1 text-[9px] px-1.5 py-0.2 rounded font-mono font-bold border ${p.badgeClass}`}>
                        {p.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Editable Request Fields */}
            <div className="space-y-3 pt-3 border-t border-institutional">
              <div>
                <label className="block text-institutional-muted font-medium mb-1">
                  APAAR Identifier (12 Digits)
                </label>
                <input
                  type="text"
                  maxLength={14}
                  value={apaarId}
                  onChange={(e) => setApaarId(e.target.value.replace(/[^\d-]/g, ''))}
                  placeholder="900000000018"
                  className="w-full p-2 font-mono tracking-widest text-xs bg-surface-secondary border border-institutional rounded-lg text-institutional-main focus:outline-none focus:border-institutional-primary"
                />
              </div>

              <div>
                <label className="block text-institutional-muted font-medium mb-1">
                  Full Student Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Aarav Sharma"
                  className="w-full p-2 text-xs bg-surface-secondary border border-institutional rounded-lg text-institutional-main focus:outline-none focus:border-institutional-primary"
                />
              </div>

              <div>
                <label className="block text-institutional-muted font-medium mb-1">
                  Date of Birth (YYYY-MM-DD)
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full p-2 text-xs bg-surface-secondary border border-institutional rounded-lg text-institutional-main focus:outline-none focus:border-institutional-primary"
                />
              </div>
            </div>

            {/* Simulation Edge Conditions (Optional Testing Tool) */}
            <div className="pt-3 border-t border-institutional">
              <label className="block text-institutional-muted font-medium mb-1.5 flex items-center justify-between">
                <span>Simulation Tool / Gateway Fault Injection</span>
                <span className="text-[10px] text-institutional-muted font-normal">Optional</span>
              </label>
              <select
                value={selectedScenarioKey}
                onChange={(e) => setSelectedScenarioKey(e.target.value)}
                className="w-full p-2 bg-surface-secondary border border-institutional rounded-lg text-institutional-main font-medium focus:outline-none focus:border-institutional-primary text-xs"
              >
                <option value="normal">Normal Verification (Data-Driven Registry Lookup)</option>
                <optgroup label="Simulated Failure Testing Tools">
                  <option value="timeout">Simulated Central Gateway Timeout (HTTP 504)</option>
                  <option value="rate_limited">Institutional Rate Limit Exceeded (HTTP 429)</option>
                  <option value="unavailable">Service Unavailable / Maintenance (HTTP 503)</option>
                  <option value="consent_denied">Student Consent Denied / Revoked (HTTP 403)</option>
                </optgroup>
              </select>

              {activeScenarioInfo && (
                <p className="text-[11px] text-institutional-muted mt-2 bg-surface-secondary/60 p-2.5 rounded-lg border border-institutional leading-relaxed">
                  {selectedScenarioKey === 'normal'
                    ? 'Evaluates submitted APAAR identifier against synthetic student database records, comparing full name and date of birth to produce MATCH, MISMATCH, or NOT_FOUND.'
                    : activeScenarioInfo.description}
                </p>
              )}
            </div>

            {/* Request JSON Preview & Copy */}
            <div className="pt-2 border-t border-institutional">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-institutional-muted uppercase font-semibold">
                  Outbound Request JSON
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      JSON.stringify({ scenario: selectedScenarioKey, apaar_id: apaarId, full_name: fullName, date_of_birth: dob }, null, 2),
                      'req'
                    )
                  }
                  className="text-[11px] text-institutional-primary hover:underline flex items-center gap-1"
                >
                  {copiedRequest ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedRequest ? 'Copied' : 'Copy Request'}
                </button>
              </div>
              <pre className="p-2.5 bg-surface-secondary/80 border border-institutional rounded-lg font-mono text-[10px] text-institutional-main overflow-x-auto">
                {JSON.stringify({ scenario: selectedScenarioKey, apaar_id: apaarId, full_name: fullName, date_of_birth: dob }, null, 2)}
              </pre>
            </div>

            {/* Actions */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleRunVerification}
                disabled={executing}
                className="w-full py-2.5 px-4 bg-institutional-primary bg-institutional-primary-hover text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-xs cursor-pointer"
              >
                {executing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                    Querying Synthetic Registry...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    Execute Verification Lookup
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Response Inspector & Request History (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Response Inspector */}
          <div className="bg-surface border border-institutional rounded-xl shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-institutional bg-surface-secondary/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-institutional-primary" />
                <h3 className="text-xs font-bold text-institutional-main uppercase tracking-wider">
                  2. Response Inspector
                </h3>
              </div>
              {latestRun && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 uppercase">
                    SIMULATED RESPONSE
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(latestRun.response_json);
                        copyToClipboard(JSON.stringify(parsed, null, 2), 'res');
                      } catch {
                        copyToClipboard(latestRun.response_json, 'res');
                      }
                    }}
                    className="text-xs text-institutional-primary hover:underline flex items-center gap-1"
                  >
                    {copiedResponse ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedResponse ? 'Copied' : 'Copy Response'}
                  </button>
                </div>
              )}
            </div>

            {latestRun ? (
              <div className="p-5 space-y-4 text-xs">
                {/* Meta status bar */}
                <div className="grid grid-cols-3 gap-3 bg-surface-secondary/60 border border-institutional rounded-xl p-3">
                  <div>
                    <span className="text-institutional-muted block text-[11px]">Outcome</span>
                    <span
                      className={`inline-block mt-0.5 px-2 py-0.5 rounded font-bold font-mono text-xs ${
                        latestRun.outcome === 'MATCHED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300'
                          : latestRun.outcome === 'MISMATCH'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-300'
                          : latestRun.outcome === 'NOT_FOUND'
                          ? 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200 border border-red-300'
                      }`}
                    >
                      {latestRun.outcome}
                    </span>
                  </div>
                  <div>
                    <span className="text-institutional-muted block text-[11px]">Simulated Latency</span>
                    <span className="font-mono text-sm font-semibold text-institutional-primary flex items-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                      {latestRun.duration_ms}ms
                    </span>
                  </div>
                  <div>
                    <span className="text-institutional-muted block text-[11px]">Mock Service</span>
                    <span className="font-mono text-xs font-medium text-institutional-muted block mt-1">
                      {latestRun.service_name}
                    </span>
                  </div>
                </div>

                {/* Executed Request Summary Bar (Ensures 1-to-1 sync clarity) */}
                {parsedRequest && (
                  <div className="p-2.5 bg-surface-secondary/40 border border-institutional rounded-lg text-[11px] flex flex-wrap items-center justify-between gap-2">
                    <span className="text-institutional-muted font-medium">Executed Run #{latestRun.id} Query:</span>
                    <div className="flex items-center gap-3 font-mono text-institutional-main">
                      <span>APAAR: <strong className="text-institutional-primary">{parsedRequest.apaar_id || 'N/A'}</strong></span>
                      <span>Name: <strong>{parsedRequest.full_name || 'N/A'}</strong></span>
                      <span>DOB: <strong>{parsedRequest.date_of_birth || 'N/A'}</strong></span>
                    </div>
                  </div>
                )}

                {/* Structured Comparison Breakdown Cards */}
                {parsedResponse?.comparison && (
                  <div className="p-3.5 bg-surface-secondary/50 border border-institutional rounded-xl space-y-2.5">
                    <span className="text-[11px] text-institutional-muted uppercase font-semibold block">
                      Field-by-Field Comparison Breakdown
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      {/* APAAR Identifier Status */}
                      <div className="p-2.5 bg-surface rounded-lg border border-institutional flex items-center justify-between">
                        <span className="text-institutional-muted text-[11px]">Registry Record:</span>
                        {parsedResponse.comparison.apaar_id_found ? (
                          <span className="font-semibold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Located
                          </span>
                        ) : (
                          <span className="font-semibold text-red-600 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Not Found
                          </span>
                        )}
                      </div>

                      {/* Full Name Match */}
                      <div className="p-2.5 bg-surface rounded-lg border border-institutional flex items-center justify-between">
                        <span className="text-institutional-muted text-[11px]">Full Name:</span>
                        {parsedResponse.comparison.full_name_match === true ? (
                          <span className="font-semibold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Matched
                          </span>
                        ) : parsedResponse.comparison.full_name_match === false ? (
                          <span className="font-semibold text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> Discrepancy
                          </span>
                        ) : (
                          <span className="text-institutional-muted text-[11px]">N/A</span>
                        )}
                      </div>

                      {/* DOB Match */}
                      <div className="p-2.5 bg-surface rounded-lg border border-institutional flex items-center justify-between">
                        <span className="text-institutional-muted text-[11px]">Date of Birth:</span>
                        {parsedResponse.comparison.dob_match === true ? (
                          <span className="font-semibold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Matched
                          </span>
                        ) : parsedResponse.comparison.dob_match === false ? (
                          <span className="font-semibold text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> Discrepancy
                          </span>
                        ) : (
                          <span className="text-institutional-muted text-[11px]">N/A</span>
                        )}
                      </div>
                    </div>

                    {/* Discrepancy / Outcome Explanation */}
                    {parsedResponse.comparison.details && (
                      <div
                        className={`p-2.5 rounded-lg border text-[11px] leading-relaxed flex items-start gap-2 ${
                          latestRun.outcome === 'MATCHED'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200'
                            : latestRun.outcome === 'MISMATCH'
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200'
                            : 'bg-zinc-100 dark:bg-zinc-800/60 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200'
                        }`}
                      >
                        {latestRun.outcome === 'MATCHED' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : latestRun.outcome === 'MISMATCH' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <strong>Verification Analysis:</strong> {parsedResponse.comparison.details}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Formatted JSON Payload */}
                <div>
                  <span className="text-[11px] text-institutional-muted uppercase font-semibold block mb-1">
                    Response Payload (Synthetic)
                  </span>
                  <pre className="p-3.5 bg-surface-secondary/90 border border-institutional rounded-lg font-mono text-[11px] text-institutional-main overflow-x-auto max-h-72 leading-relaxed whitespace-pre-wrap">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(latestRun.response_json), null, 2);
                      } catch {
                        return latestRun.response_json;
                      }
                    })()}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-institutional-muted text-xs">
                <Terminal className="w-8 h-8 text-institutional-muted mx-auto mb-2 opacity-50" />
                Select a test persona or enter an APAAR ID, then click <strong>Execute Verification Lookup</strong> to inspect the synthetic registry comparison.
              </div>
            )}
          </div>

          {/* Request History Table */}
          <div className="bg-surface border border-institutional rounded-xl shadow-xs overflow-hidden">
            <div className="px-5 py-3 border-b border-institutional bg-surface-secondary/40 flex items-center justify-between">
              <h3 className="text-xs font-bold text-institutional-main uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-institutional-primary" />
                Simulation Run History
              </h3>
              <span className="text-xs font-mono text-institutional-muted">{historyRuns.length} runs</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-secondary/70 text-institutional-muted uppercase font-semibold text-[10px] border-b border-institutional">
                  <tr>
                    <th className="py-2 px-3">Run ID</th>
                    <th className="py-2 px-3">Identifier</th>
                    <th className="py-2 px-3">Scenario / Mode</th>
                    <th className="py-2 px-3">Outcome</th>
                    <th className="py-2 px-3 text-right">Latency</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-institutional">
                  {historyRuns.length > 0 ? (
                    historyRuns.map((run) => {
                      const isSelected = latestRun?.id === run.id;
                      let reqId = '—';
                      try {
                        const parsed = JSON.parse(run.request_json);
                        if (parsed.apaar_id) reqId = parsed.apaar_id;
                      } catch {
                        // ignore
                      }
                      return (
                        <tr
                          key={run.id}
                          className={`transition-colors ${
                            isSelected
                              ? 'bg-institutional-primary/10 font-semibold'
                              : 'hover:bg-surface-hover'
                          }`}
                        >
                          <td className="py-2 px-3 font-mono font-medium text-institutional-primary">#{run.id}</td>
                          <td className="py-2 px-3 font-mono text-[11px] text-institutional-main">{reqId}</td>
                          <td className="py-2 px-3 font-mono text-[11px] text-institutional-muted">{run.scenario}</td>
                          <td className="py-2 px-3 font-medium">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                                run.outcome === 'MATCHED'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                                  : run.outcome === 'TIMEOUT' || run.outcome === 'SERVICE_UNAVAILABLE'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
                                  : run.outcome === 'NOT_FOUND'
                                  ? 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                              }`}
                            >
                              {run.outcome}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-institutional-muted text-[11px]">
                            {run.duration_ms}ms
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => syncRunToUI(run)}
                              className="text-xs text-institutional-primary hover:underline font-medium cursor-pointer"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-institutional-muted text-xs">
                        No previous runs in session.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
