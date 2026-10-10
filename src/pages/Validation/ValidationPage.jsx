import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, AlertTriangle, CheckCircle, XCircle,
  ChevronDown, ChevronRight, Play, BarChart3
} from 'lucide-react';
import {
  STATUS_COLORS, formatDate, formatStatus, parseJson,
  VALIDATION_LEVELS, DATA_CONFIDENCE_LEVELS, ENTITY_TYPE_LABELS
} from '../../utils/helpers';

export default function ValidationPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gateResult, setGateResult] = useState(null);
  const [shotIdForGate, setShotIdForGate] = useState('');

  useEffect(() => {
    window.api.getProjects().then(setProjects);
  }, []);

  const loadResults = useCallback(async () => {
    if (!selectedProject) return;
    setLoading(true);
    try {
      const data = await window.api.getValidationResults(selectedProject, selectedLevel || undefined);
      setResults(data);
    } finally {
      setLoading(false);
    }
  }, [selectedProject, selectedLevel]);

  useEffect(() => {
    if (selectedProject) loadResults();
  }, [selectedProject, selectedLevel, loadResults]);

  const runGateCheck = async () => {
    if (!shotIdForGate || !selectedProject) return;
    const result = await window.api.runGateCheck(selectedProject, shotIdForGate);
    setGateResult(result);
  };

  // Group results by validation_level
  const grouped = results.reduce((acc, r) => {
    if (!acc[r.validation_level]) acc[r.validation_level] = [];
    acc[r.validation_level].push(r);
    return acc;
  }, {});

  const statusIcon = (status) => {
    const map = {
      passed: <CheckCircle className="w-4 h-4 text-emerald-400" />,
      warning: <AlertTriangle className="w-4 h-4 text-amber-400" />,
      failed: <XCircle className="w-4 h-4 text-red-400" />,
      pending: <div className="w-4 h-4 rounded-full border-2 border-t-4" />,
      skipped: <div className="w-4 h-4 rounded-full bg-s-5" />,
    };
    return map[status] || map.pending;
  };

  const confidenceBadge = (conf) => {
    const item = DATA_CONFIDENCE_LEVELS.find(c => c.value === conf);
    if (!item) return null;
    return (
      <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_COLORS[conf] || 'badge-gray'}`}>
        {item.icon} {item.label}
      </span>
    );
  };

  const statCounts = {
    passed: results.filter(r => r.status === 'passed').length,
    warning: results.filter(r => r.status === 'warning').length,
    failed: results.filter(r => r.status === 'failed').length,
    pending: results.filter(r => r.status === 'pending').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-t-1">Validation Center</h1>
            <p className="text-sm text-t-3">Multi-level validation and gate checks</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="input-field w-56"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            <option value="">Select project...</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select
            className="input-field w-40"
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
          >
            <option value="">All Levels</option>
            {VALIDATION_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
      </div>

      {!selectedProject ? (
        <div className="card p-12 text-center text-t-3">Select a project to view validation results</div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Passed', count: statCounts.passed, icon: <CheckCircle className="w-4 h-4 text-emerald-400" /> },
              { label: 'Warnings', count: statCounts.warning, icon: <AlertTriangle className="w-4 h-4 text-amber-400" /> },
              { label: 'Failed', count: statCounts.failed, icon: <XCircle className="w-4 h-4 text-red-400" /> },
              { label: 'Pending', count: statCounts.pending, icon: <BarChart3 className="w-4 h-4 text-t-3" /> },
            ].map(s => (
              <div key={s.label} className="card p-4">
                <div className="flex items-center gap-2 mb-1">{s.icon}<span className="text-sm text-t-2">{s.label}</span></div>
                <div className="text-2xl font-bold text-t-1">{s.count}</div>
              </div>
            ))}
          </div>

          {/* Gate Check */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-t-1 mb-3 flex items-center gap-2">
              <Play className="w-4 h-4 text-accent-400" />
              Pre-Generation Gate Check
            </h3>
            <div className="flex items-center gap-3">
              <input
                className="input-field flex-1"
                placeholder="Enter Shot ID for gate validation..."
                value={shotIdForGate}
                onChange={(e) => setShotIdForGate(e.target.value)}
              />
              <button className="btn-primary text-sm" onClick={runGateCheck}>
                Run Gate Check
              </button>
            </div>
            {gateResult && (
              <div className="mt-4 p-3 rounded-lg bg-s-3/50">
                <div className="flex items-center gap-2 mb-2">
                  {gateResult.passed
                    ? <CheckCircle className="w-5 h-5 text-emerald-400" />
                    : <XCircle className="w-5 h-5 text-red-400" />
                  }
                  <span className={`font-semibold ${gateResult.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                    {gateResult.passed ? 'Gate Passed' : 'Gate Failed'}
                  </span>
                  {gateResult.production_mode && (
                    <span className="text-xs text-t-3 ml-2">Mode: {formatStatus(gateResult.production_mode)}</span>
                  )}
                </div>
                {gateResult.errors?.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {gateResult.errors.map((err, i) => (
                      <div key={i} className="text-sm text-red-400 flex items-center gap-1.5">
                        <XCircle className="w-3 h-3" /> {err}
                      </div>
                    ))}
                  </div>
                )}
                {gateResult.warnings?.length > 0 && (
                  <div className="space-y-1">
                    {gateResult.warnings.map((w, i) => (
                      <div key={i} className="text-sm text-amber-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3" /> {w}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Validation Results by Level */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-t-1 mb-4">
              Validation Results ({results.length})
            </h3>
            {results.length === 0 && (
              <div className="text-center text-t-4 py-8">No validation results yet</div>
            )}
            {VALIDATION_LEVELS.map(level => {
              const items = grouped[level.value];
              if (!items || items.length === 0) return null;
              return (
                <ValidationLevelGroup
                  key={level.value}
                  level={level}
                  items={items}
                  statusIcon={statusIcon}
                  confidenceBadge={confidenceBadge}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function ValidationLevelGroup({ level, items, statusIcon, confidenceBadge }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="mb-3">
      <button
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-s-3/30 hover:bg-s-3/50 mb-1"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="w-4 h-4 text-t-3" /> : <ChevronRight className="w-4 h-4 text-t-3" />}
          <span className="text-sm font-medium text-t-1">{level.label}</span>
          <span className="text-xs text-t-4">({items.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-emerald-400">{items.filter(i => i.status === 'passed').length} passed</span>
          <span className="text-xs text-amber-400">{items.filter(i => i.status === 'warning').length} warn</span>
          <span className="text-xs text-red-400">{items.filter(i => i.status === 'failed').length} fail</span>
        </div>
      </button>
      {expanded && (
        <div className="space-y-1 pl-6">
          {items.map(result => (
            <div key={result.id} className="flex items-center justify-between px-3 py-2 rounded bg-s-2/50">
              <div className="flex items-center gap-3">
                {statusIcon(result.status)}
                <span className="text-sm text-t-2">
                  {ENTITY_TYPE_LABELS[result.target_entity_type] || result.target_entity_type}
                </span>
                <span className="text-xs text-t-4 font-mono">{result.target_entity_id?.slice(0, 12)}</span>
                {confidenceBadge(result.data_confidence)}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-t-4">{formatDate(result.created_at)}</span>
                {result.issues && parseJson(result.issues, []).length > 0 && (
                  <span className="text-xs text-red-400">{parseJson(result.issues, []).length} issues</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
