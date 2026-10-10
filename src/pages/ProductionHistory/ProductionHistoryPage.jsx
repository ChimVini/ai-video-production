import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Search, Filter, CheckCircle2, XCircle, Eye, Clock,
  ChevronDown, ChevronRight, Workflow, RotateCcw, MessageSquare,
  Download, FileJson, AlertTriangle, GitCompare, ArrowLeftRight
} from 'lucide-react';
import PageHeader from '../../components/Layout/PageHeader';
import { formatDate } from '../../utils/helpers';

const api = window.api;

const STATUS_CONFIG = {
  generating: { label: 'Generating', badge: 'badge-cyan', icon: Clock },
  generated:  { label: 'Generated',  badge: 'badge-blue', icon: Sparkles },
  review:     { label: 'Review',     badge: 'badge-yellow', icon: Eye },
  approved:   { label: 'Approved',   badge: 'badge-green', icon: CheckCircle2 },
  rejected:   { label: 'Rejected',   badge: 'badge-red', icon: XCircle },
  failed:     { label: 'Failed',     badge: 'badge-red', icon: AlertTriangle },
};

const STATUS_FILTERS = ['all', 'generating', 'generated', 'review', 'approved', 'rejected', 'failed'];

function VersionComparisonPanel({ currentAttempt, previousAttemptId }) {
  const [prevAttempt, setPrevAttempt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (previousAttemptId) {
      setLoading(true);
      api.getGenerationAttempt(previousAttemptId)
        .then(setPrevAttempt)
        .catch(() => setPrevAttempt(null))
        .finally(() => setLoading(false));
    }
  }, [previousAttemptId]);

  if (loading) return <p className="text-xs text-t-4">Loading previous version...</p>;
  if (!prevAttempt) return <p className="text-xs text-t-4">Previous version not found.</p>;

  let prevInput, currInput, prevOutput, currOutput;
  try { prevInput = prevAttempt.input_snapshot ? JSON.parse(prevAttempt.input_snapshot) : null; } catch { prevInput = null; }
  try { currInput = currentAttempt.input_snapshot ? JSON.parse(currentAttempt.input_snapshot) : null; } catch { currInput = null; }
  try { prevOutput = prevAttempt.output_data ? JSON.parse(prevAttempt.output_data) : null; } catch { prevOutput = null; }
  try { currOutput = currentAttempt.output_data ? JSON.parse(currentAttempt.output_data) : null; } catch { currOutput = null; }

  const prevSc = STATUS_CONFIG[prevAttempt.status] || STATUS_CONFIG.generating;
  const currSc = STATUS_CONFIG[currentAttempt.status] || STATUS_CONFIG.generating;

  return (
    <div className="mb-6">
      <h3 className="section-label mb-2 flex items-center gap-1.5">
        <GitCompare className="w-3.5 h-3.5" /> Version Comparison
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {/* Header row */}
        <div className="bg-s-3 rounded-lg p-2 border border-s-6/30">
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${prevSc.badge}`}>{prevSc.label}</span>
            <span className="text-2xs text-t-4">Previous (#{prevAttempt.attempt_number})</span>
          </div>
          <div className="text-2xs text-t-4 mt-1">{formatDate(prevAttempt.created_at)}</div>
        </div>
        <div className="bg-s-3 rounded-lg p-2 border border-accent-500/20">
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${currSc.badge}`}>{currSc.label}</span>
            <span className="text-2xs text-accent-400">Current (#{currentAttempt.attempt_number})</span>
          </div>
          <div className="text-2xs text-t-4 mt-1">{formatDate(currentAttempt.created_at)}</div>
        </div>

        {/* Provider comparison */}
        <div className="bg-s-3/50 rounded-lg p-2 text-2xs">
          <span className="text-t-4">Provider: </span>
          <span className="text-t-2 font-mono">{prevAttempt.provider || '—'}</span>
        </div>
        <div className="bg-s-3/50 rounded-lg p-2 text-2xs">
          <span className="text-t-4">Provider: </span>
          <span className={`font-mono ${prevAttempt.provider !== currentAttempt.provider ? 'text-accent-400' : 'text-t-2'}`}>
            {currentAttempt.provider || '—'}
          </span>
        </div>

        {/* Input snapshot comparison */}
        <div className="bg-s-3/50 rounded-lg p-2">
          <span className="text-2xs text-t-4 block mb-1">Input</span>
          <pre className="text-[10px] text-t-3 font-mono overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto">
            {prevInput ? JSON.stringify(prevInput, null, 2) : '—'}
          </pre>
        </div>
        <div className="bg-s-3/50 rounded-lg p-2">
          <span className="text-2xs text-t-4 block mb-1">Input</span>
          <pre className="text-[10px] text-t-3 font-mono overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto">
            {currInput ? JSON.stringify(currInput, null, 2) : '—'}
          </pre>
        </div>

        {/* Error comparison (only if either had errors) */}
        {(prevAttempt.error_message || currentAttempt.error_message) && (
          <>
            <div className="bg-s-3/50 rounded-lg p-2">
              <span className="text-2xs text-t-4 block mb-1">Error</span>
              <p className="text-[10px] text-red-400">{prevAttempt.error_message || '—'}</p>
            </div>
            <div className="bg-s-3/50 rounded-lg p-2">
              <span className="text-2xs text-t-4 block mb-1">Error</span>
              <p className="text-[10px] text-red-400">{currentAttempt.error_message || '—'}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AttemptDetailPanel({ attempt, onClose }) {
  const [reviews, setReviews] = useState([]);
  const [feedback, setFeedback] = useState([]);

  useEffect(() => {
    if (attempt) {
      api.getReviewsByAttempt(attempt.id).then(setReviews);
      api.getFeedbackByAttempt(attempt.id).then(setFeedback);
    }
  }, [attempt]);

  if (!attempt) return null;

  let inputSnapshot = null;
  try {
    inputSnapshot = attempt.input_snapshot ? JSON.parse(attempt.input_snapshot) : null;
  } catch { /* ignore */ }

  let outputData = null;
  try {
    outputData = attempt.output_data ? JSON.parse(attempt.output_data) : null;
  } catch { /* ignore */ }

  const sc = STATUS_CONFIG[attempt.status] || STATUS_CONFIG.generating;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end" onClick={onClose}>
      <div
        className="w-[520px] h-full bg-s-2 border-l border-s-6/30 overflow-y-auto p-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-semibold text-t-1">
              {attempt.node_label || 'Generation'} #{attempt.attempt_number}
            </h2>
            <p className="text-xs text-t-4 mt-0.5">{attempt.workflow_name}</p>
          </div>
          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${sc.badge}`}>
            {sc.label}
          </span>
        </div>

        {/* Metadata */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-t-3">Created</span>
            <span className="text-t-1">{formatDate(attempt.created_at)}</span>
          </div>
          {attempt.provider && (
            <div className="flex justify-between text-sm">
              <span className="text-t-3">Provider</span>
              <span className="text-t-1 font-mono text-xs">{attempt.provider}</span>
            </div>
          )}
          {attempt.node_subtype && (
            <div className="flex justify-between text-sm">
              <span className="text-t-3">Process</span>
              <span className="text-t-1">{attempt.node_subtype.replace(/_/g, ' ')}</span>
            </div>
          )}
          {attempt.previous_attempt_id && (
            <div className="flex justify-between text-sm">
              <span className="text-t-3">Regenerated from</span>
              <span className="text-t-1 font-mono text-xs">#{attempt.previous_attempt_id.slice(0, 8)}</span>
            </div>
          )}
        </div>

        {/* Version comparison — shown when this attempt is a regeneration */}
        {attempt.previous_attempt_id && (
          <VersionComparisonPanel currentAttempt={attempt} previousAttemptId={attempt.previous_attempt_id} />
        )}

        {/* Input snapshot */}
        {inputSnapshot && (
          <div className="mb-6">
            <h3 className="section-label mb-2">Input Snapshot</h3>
            <div className="bg-s-3 rounded-xl p-3 border border-s-6/30">
              <pre className="text-xs text-t-2 font-mono overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                {JSON.stringify(inputSnapshot, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Output data */}
        {outputData && (
          <div className="mb-6">
            <h3 className="section-label mb-2">Output</h3>
            <div className="bg-s-3 rounded-xl p-3 border border-s-6/30">
              <pre className="text-xs text-t-2 font-mono overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                {JSON.stringify(outputData, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Error */}
        {attempt.error_message && (
          <div className="mb-6">
            <h3 className="section-label mb-2">Error</h3>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <p className="text-sm text-red-400">{attempt.error_message}</p>
            </div>
          </div>
        )}

        {/* Reviews */}
        <div className="mb-6">
          <h3 className="section-label mb-2">Reviews ({reviews.length})</h3>
          {reviews.length === 0 ? (
            <p className="text-xs text-t-4">No reviews yet.</p>
          ) : (
            <div className="space-y-2">
              {reviews.map(r => (
                <div key={r.id} className="bg-s-3 rounded-xl p-3 border border-s-6/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-t-2">{r.review_type}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      r.status === 'approved' ? 'badge-green' :
                      r.status === 'rejected' ? 'badge-red' : 'badge-yellow'
                    }`}>
                      {r.status}
                    </span>
                  </div>
                  {r.notes && <p className="text-xs text-t-3">{r.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Feedback */}
        <div className="mb-6">
          <h3 className="section-label mb-2">Feedback ({feedback.length})</h3>
          {feedback.length === 0 ? (
            <p className="text-xs text-t-4">No feedback yet.</p>
          ) : (
            <div className="space-y-2">
              {feedback.map(f => (
                <div key={f.id} className="bg-s-3 rounded-xl p-3 border border-s-6/30">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      f.type === 'issue' ? 'badge-red' :
                      f.type === 'lesson' ? 'badge-purple' : 'badge-blue'
                    }`}>
                      {f.type}
                    </span>
                  </div>
                  <p className="text-xs text-t-2">{f.content}</p>
                  {f.next_action && (
                    <p className="text-xs text-t-4 mt-1">Next: {f.next_action}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="btn-secondary w-full"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default function ProductionHistoryPage() {
  const [attempts, setAttempts] = useState([]);
  const [total, setTotal] = useState(0);
  const [historyStats, setHistoryStats] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [page, setPage] = useState(0);
  const navigate = useNavigate();
  const pageSize = 30;

  const loadHistory = useCallback(async () => {
    const filters = { limit: pageSize, offset: page * pageSize };
    if (statusFilter !== 'all') filters.status = statusFilter;
    if (search.trim()) filters.search = search.trim();
    const result = await api.getProductionHistory(filters);
    setAttempts(result.rows);
    setTotal(result.total);
  }, [statusFilter, search, page]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    api.getProductionHistoryStats().then(setHistoryStats);
  }, []);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="w-full">
      <PageHeader
        title="Production History"
        subtitle="Generation attempts, reviews and feedback across all workflows"
      />

      {/* Status breakdown */}
      {historyStats && (
        <div className="flex gap-2 mb-6 flex-wrap">
          {historyStats.byStatus.map(s => {
            const sc = STATUS_CONFIG[s.status] || { label: s.status, badge: 'badge-gray', icon: Clock };
            const Icon = sc.icon;
            return (
              <button
                key={s.status}
                onClick={() => { setStatusFilter(s.status); setPage(0); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${statusFilter === s.status
                    ? 'bg-accent-600/20 text-accent-400 border border-accent-500/30'
                    : 'bg-s-3 text-t-3 border border-s-6/30 hover:bg-s-4'
                  }`}
              >
                <Icon className="w-3 h-3" />
                {sc.label} ({s.count})
              </button>
            );
          })}
          {statusFilter !== 'all' && (
            <button
              onClick={() => { setStatusFilter('all'); setPage(0); }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-s-4 text-t-2 border border-s-6/30 hover:bg-s-5"
            >
              <RotateCcw className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="w-4 h-4 text-t-4 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by node, workflow or provider..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          className="input pl-9 w-full"
        />
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-t-4">{total} generation{total !== 1 ? 's' : ''} found</span>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="text-xs text-t-3 hover:text-t-1 disabled:text-t-4 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-xs text-t-3">{page + 1} / {totalPages}</span>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className="text-xs text-t-3 hover:text-t-1 disabled:text-t-4 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Attempts list */}
      <div className="card">
        {attempts.length === 0 ? (
          <p className="text-sm text-t-4 py-8 text-center">
            {search || statusFilter !== 'all' ? 'No results match your filters.' : 'No generation attempts yet.'}
          </p>
        ) : (
          <div className="space-y-0.5">
            {attempts.map(a => {
              const sc = STATUS_CONFIG[a.status] || STATUS_CONFIG.generating;
              const Icon = sc.icon;
              return (
                <div
                  key={a.id}
                  onClick={() => setSelectedAttempt(a)}
                  className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-s-4/50 cursor-pointer transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      a.status === 'approved' ? 'bg-emerald-600/15' :
                      a.status === 'rejected' || a.status === 'failed' ? 'bg-red-600/15' :
                      a.status === 'review' || a.status === 'generated' ? 'bg-amber-600/15' :
                      'bg-cyan-600/15'
                    }`}>
                      <Icon className={`w-4 h-4 ${
                        a.status === 'approved' ? 'text-emerald-400' :
                        a.status === 'rejected' || a.status === 'failed' ? 'text-red-400' :
                        a.status === 'review' || a.status === 'generated' ? 'text-amber-400' :
                        'text-cyan-400'
                      }`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-t-1 truncate">
                          {a.node_label || 'Generation'}
                        </span>
                        <span className="text-xs text-t-4">#{a.attempt_number}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-t-4">
                        <Workflow className="w-3 h-3" />
                        <span className="truncate">{a.workflow_name || 'Unknown'}</span>
                        <span>·</span>
                        <span>{formatDate(a.created_at)}</span>
                        {a.provider && (
                          <>
                            <span>·</span>
                            <span className="font-mono">{a.provider}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {a.previous_attempt_id && (
                      <RotateCcw className="w-3 h-3 text-t-4" title="Regenerated" />
                    )}
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${sc.badge}`}>
                      {sc.label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-t-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Workflow breakdown */}
      {historyStats && historyStats.byWorkflow.length > 0 && (
        <div className="card mt-4">
          <h2 className="text-sm font-semibold text-t-2 mb-3">Generations by Workflow</h2>
          <div className="space-y-2">
            {historyStats.byWorkflow.map(w => (
              <div
                key={w.id}
                onClick={() => navigate(`/workflows/${w.id}`)}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-s-4/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Workflow className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm text-t-1">{w.name}</span>
                </div>
                <span className="text-xs text-t-3 font-mono">{w.count} attempts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail panel */}
      {selectedAttempt && (
        <AttemptDetailPanel
          attempt={selectedAttempt}
          onClose={() => setSelectedAttempt(null)}
        />
      )}
    </div>
  );
}
