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
} from 'lucide-react';
import { api } from '../services/api';
import type { VerificationScenarioInfo, VerificationRun } from '../types';
import { useToast } from '../context/ToastContext';

const SCENARIO_DEFAULTS: Record<string, { apaar_id: string; full_name: string; date_of_birth: string }> = {
  success: {
    apaar_id: '910000000018',
    full_name: 'Aarav Sharma',
    date_of_birth: '2004-03-15',
  },
  unknown_identifier: {
    apaar_id: '910000000999',
    full_name: 'Rohit K. Verma',
    date_of_birth: '2003-07-22',
  },
  attribute_mismatch: {
    apaar_id: '910000000025',
    full_name: 'Priya Patel',
    date_of_birth: '2004-11-10', // Differs from registry 2003-01-01
  },
  consent_denied: {
    apaar_id: '910000000032',
    full_name: 'Vikram Joshi',
    date_of_birth: '2004-02-18',
  },
  timeout: {
    apaar_id: '910000000018',
    full_name: 'Simulated Timeout Test',
    date_of_birth: '2004-01-01',
  },
  rate_limited: {
    apaar_id: '910000000018',
    full_name: 'Rate Limit Threshold Test',
    date_of_birth: '2004-01-01',
  },
  unavailable: {
    apaar_id: '910000000018',
    full_name: 'Maintenance Mode Test',
    date_of_birth: '2004-01-01',
  },
};

export const SandboxPage: React.FC = () => {
  const { showToast } = useToast();

  const [scenarios, setScenarios] = useState<Record<string, VerificationScenarioInfo>>({});
  const [selectedScenarioKey, setSelectedScenarioKey] = useState<string>('success');

  // Editable synthetic payload fields
  const [apaarId, setApaarId] = useState('910000000018');
  const [fullName, setFullName] = useState('Aarav Sharma');
  const [dob, setDob] = useState('2004-03-15');

  // Execution state
  const [executing, setExecuting] = useState(false);
  const [latestRun, setLatestRun] = useState<VerificationRun | null>(null);
  const [historyRuns, setHistoryRuns] = useState<VerificationRun[]>([]);
  const [copiedRequest, setCopiedRequest] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);

  // Load scenarios and recent runs on mount
  useEffect(() => {
    api.getVerificationScenarios()
      .then((data) => {
        setScenarios(data);
      })
      .catch(() => {});

    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const runs = await api.getVerificationRuns(10);
      setHistoryRuns(runs);
      if (runs.length > 0 && !latestRun) {
        setLatestRun(runs[0]);
      }
    } catch {
      // ignore
    }
  };

  const handleScenarioChange = (key: string) => {
    setSelectedScenarioKey(key);
    const defaults = SCENARIO_DEFAULTS[key] || SCENARIO_DEFAULTS.success;
    setApaarId(defaults.apaar_id);
    setFullName(defaults.full_name);
    setDob(defaults.date_of_birth);
  };

  const handleReset = () => {
    const defaults = SCENARIO_DEFAULTS[selectedScenarioKey] || SCENARIO_DEFAULTS.success;
    setApaarId(defaults.apaar_id);
    setFullName(defaults.full_name);
    setDob(defaults.date_of_birth);
    showToast('Reset request fields to scenario defaults.', 'info');
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
      setLatestRun(res);
      showToast(
        `Simulation finished: ${res.outcome} (${res.duration_ms}ms simulated latency)`,
        res.outcome === 'MATCHED' ? 'success' : 'info',
        'Verification Sandbox'
      );
      fetchHistory();
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

  const activeScenarioInfo = scenarios[selectedScenarioKey];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-surface border border-institutional rounded-xl p-4 card-padded shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-institutional-main">Verification Sandbox</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 font-mono">
              SIMULATED ENVIRONMENT
            </span>
          </div>
          <p className="text-xs text-institutional-muted mt-0.5">
            Evaluate institutional gateway behavior against simulated external registries, demographic mismatches, and edge-case faults.
          </p>
        </div>
      </div>

      {/* Prominent Architectural Simulation Disclaimer */}
      <div className="p-3.5 px-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-xs flex items-start gap-3">
        <Shield className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-amber-900 dark:text-amber-200">
          <strong className="font-semibold">Simulated Verification Architecture:</strong> All external API responses are
          generated by local synthetic service adapters. Zero network requests are made to live UIDAI, CIDR, DigiLocker, or ABC production infrastructure.
          Latencies, checksums, and token receipts are completely synthetic.
        </div>
      </div>

      {/* Distinctive Two-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Scenario Selector & Editable Request Fields (5 cols) */}
        <div className="lg:col-span-5 bg-surface border border-institutional rounded-xl shadow-xs overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-institutional bg-surface-secondary/40 flex items-center justify-between">
            <h3 className="text-xs font-bold text-institutional-main uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4 text-institutional-primary" />
              1. Simulation Scenario & Request
            </h3>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-institutional-muted hover:text-institutional-main flex items-center gap-1"
              title="Reset fields to scenario defaults"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>

          <div className="p-5 space-y-4 text-xs">
            {/* Scenario Picker */}
            <div>
              <label className="block text-institutional-muted font-medium mb-1.5">
                Select Simulation Scenario
              </label>
              <select
                value={selectedScenarioKey}
                onChange={(e) => handleScenarioChange(e.target.value)}
                className="w-full p-2 bg-surface-secondary border border-institutional rounded-lg text-institutional-main font-medium focus:outline-none focus:border-institutional-primary"
              >
                <option value="success">Valid Synthetic Registry Match (200)</option>
                <option value="unknown_identifier">Unknown Identifier (404 Not Found)</option>
                <option value="attribute_mismatch">Attribute Discrepancy (DOB Mismatch)</option>
                <option value="consent_denied">Consent Denied / Revoked (403)</option>
                <option value="timeout">Simulated Central Gateway Timeout (504)</option>
                <option value="rate_limited">Institutional Rate Limit Exceeded (429)</option>
                <option value="unavailable">Service Unavailable / Maintenance (503)</option>
              </select>

              {activeScenarioInfo && (
                <p className="text-[11px] text-institutional-muted mt-2 bg-surface-secondary/60 p-2.5 rounded-lg border border-institutional leading-relaxed">
                  {activeScenarioInfo.description}
                </p>
              )}
            </div>

            {/* Editable Request Fields */}
            <div className="space-y-3 pt-3 border-t border-institutional">
              <div>
                <label className="block text-institutional-muted font-medium mb-1">
                  APAAR Identifier (12 Digits)
                </label>
                <input
                  type="text"
                  maxLength={12}
                  value={apaarId}
                  onChange={(e) => setApaarId(e.target.value.replace(/\D/g, ''))}
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
                      JSON.stringify({ apaar_id: apaarId, full_name: fullName, date_of_birth: dob }, null, 2),
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
                {JSON.stringify({ apaar_id: apaarId, full_name: fullName, date_of_birth: dob }, null, 2)}
              </pre>
            </div>

            {/* Actions */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleRunVerification}
                disabled={executing}
                className="w-full py-2.5 px-4 bg-institutional-primary bg-institutional-primary-hover text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-xs"
              >
                {executing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                    Executing Adapter Simulation...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    Execute Sandbox Verification
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
                    <span className="font-bold text-sm text-institutional-main">{latestRun.outcome}</span>
                  </div>
                  <div>
                    <span className="text-institutional-muted block text-[11px]">Simulated Latency</span>
                    <span className="font-mono text-sm font-semibold text-institutional-primary flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {latestRun.duration_ms}ms
                    </span>
                  </div>
                  <div>
                    <span className="text-institutional-muted block text-[11px]">Mock Service</span>
                    <span className="font-mono text-xs font-medium text-institutional-muted">
                      {latestRun.service_name}
                    </span>
                  </div>
                </div>

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
                Select a scenario and click <strong>Execute Sandbox Verification</strong> to inspect the simulated registry payload.
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
                    <th className="py-2 px-3">Scenario</th>
                    <th className="py-2 px-3">Outcome</th>
                    <th className="py-2 px-3 text-right">Latency</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-institutional">
                  {historyRuns.length > 0 ? (
                    historyRuns.map((run) => (
                      <tr key={run.id} className="hover:bg-surface-hover transition-colors">
                        <td className="py-2 px-3 font-mono font-medium text-institutional-primary">#{run.id}</td>
                        <td className="py-2 px-3 font-mono text-[11px] text-institutional-muted">{run.scenario}</td>
                        <td className="py-2 px-3 font-medium">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                              run.outcome === 'MATCHED'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                                : run.outcome === 'TIMEOUT' || run.outcome === 'SERVICE_UNAVAILABLE'
                                ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
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
                            onClick={() => setLatestRun(run)}
                            className="text-xs text-institutional-primary hover:underline font-medium"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-institutional-muted text-xs">
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
