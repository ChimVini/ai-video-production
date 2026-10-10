import React, { useState, useEffect, useCallback } from 'react';
import {
  Play, Square, Clock, CheckCircle, XCircle, AlertTriangle,
  ChevronDown, ChevronRight, RefreshCw, X, Info
} from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import { formatDate, parseJson, REJECT_REASONS } from '../../utils/helpers';
import { validateWorkflow, validateWorkflowAsync, topologicalSort, buildInputSnapshot } from './workflowValidation';
import { createAdapter, buildExportPackage, parseImportResult } from './providerAdapter';

const api = window.api;

/**
 * WorkflowRunPanel — bottom panel for managing workflow execution runs.
 * Handles validation, run creation, status tracking, and generation attempts.
 */
export default function WorkflowRunPanel({
  workflowId, nodes, connections,
  isOpen, onToggle, onNodeStatusChange,
}) {
  const [runs, setRuns] = useState([]);
  const [activeRun, setActiveRun] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [validation, setValidation] = useState(null);
  const [showValidation, setShowValidation] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load runs
  const loadRuns = useCallback(async () => {
    try {
      const data = await api.getWorkflowRuns(workflowId);
      setRuns(data);
      // Auto-select most recent non-completed run
      const active = data.find(r => ['pending', 'validating', 'running'].includes(r.status));
      if (active) {
        setActiveRun(active);
        loadAttempts(active.id);
      }
    } catch (err) {
      console.error('Failed to load runs:', err);
    }
  }, [workflowId]);

  useEffect(() => { if (isOpen) loadRuns(); }, [isOpen, loadRuns]);

  async function loadAttempts(runId) {
    try {
      const data = await api.getGenerationAttempts({ workflow_run_id: runId });
      setAttempts(data);
    } catch (err) {
      console.error('Failed to load attempts:', err);
    }
  }

  // ── Validation ──────────────────────────────
  function handleValidate() {
    const result = validateWorkflow(nodes, connections);
    setValidation(result);
    setShowValidation(true);
  }

  // ── Start new run ───────────────────────────
  async function handleStartRun() {
    setLoading(true);

    // Run async validation (checks resource existence + provider capability)
    try {
      const result = await validateWorkflowAsync(nodes, connections, api);
      setValidation(result);
      if (!result.valid) {
        setShowValidation(true);
        setLoading(false);
        return;
      }
      // Show warnings but don't block
      if (result.warnings.length > 0) {
        setShowValidation(true);
      }
    } catch (err) {
      setValidation({ valid: false, errors: [`Validation failed: ${err.message}`], warnings: [] });
      setShowValidation(true);
      setLoading(false);
      return;
    }

    try {
      // Build execution order
      const order = topologicalSort(nodes, connections);
      if (!order) {
        setValidation({ valid: false, errors: ['Cycle detected. Cannot determine execution order.'], warnings: [] });
        setShowValidation(true);
        setLoading(false);
        return;
      }

      // Create the run with input snapshot
      const inputSnapshot = {
        nodeOrder: order,
        nodeCount: nodes.length,
        connectionCount: connections.length,
        timestamp: new Date().toISOString(),
      };

      const run = await api.createWorkflowRun({
        workflow_id: workflowId,
        status: 'running',
        input_snapshot: inputSnapshot,
        metadata: { executionOrder: order },
      });

      setActiveRun(run);
      setRuns(prev => [run, ...prev]);

      // Create generation attempts for PROCESS nodes in order
      const processNodeIds = order.filter(id => {
        const n = nodes.find(nd => nd.id === id);
        return n && n.node_type === 'PROCESS';
      });

      let failedCount = 0;
      for (const nodeId of processNodeIds) {
        const node = nodes.find(n => n.id === nodeId);
        const snapshot = buildInputSnapshot(nodeId, nodes, connections);
        const config = parseJson(node.config, {});

        // Determine initial status based on provider type
        let initialStatus = 'generating';
        let adapterResult = null;
        let errorMsg = null;

        if (config.providerId) {
          try {
            const provConfig = await api.getProviderConfig(config.providerId);
            if (provConfig) {
              const adapter = createAdapter(provConfig);
              adapterResult = await adapter.submit(snapshot, config.providerParams || {});

              // Manual providers start in a "waiting" state for user export/import
              if (provConfig.provider_type === 'manual') {
                initialStatus = 'review'; // user needs to export, process, and import
              }
            } else {
              initialStatus = 'error';
              errorMsg = 'Provider configuration not found.';
              failedCount++;
            }
          } catch (err) {
            initialStatus = 'error';
            errorMsg = `Provider error: ${err.message || 'Submission failed'}`;
            failedCount++;
          }
        }

        await api.createGenerationAttempt({
          workflow_run_id: run.id,
          workflow_node_id: nodeId,
          scene_id: null,
          input_snapshot: snapshot,
          prompt: config.template || '',
          negative_prompt: config.negativePrompt || '',
          provider_id: config.providerId || null,
          provider_params: config.providerParams || {},
          status: initialStatus,
          error: errorMsg,
          metadata: adapterResult ? { adapterResult } : {},
        });

        // Update node status on canvas
        const canvasStatus = initialStatus === 'review' ? 'ready'
          : initialStatus === 'error' ? 'error'
          : 'running';
        onNodeStatusChange?.(nodeId, canvasStatus);
      }

      // If all nodes failed, mark run as failed
      if (failedCount > 0 && failedCount === processNodeIds.length) {
        await api.updateWorkflowRun(run.id, { status: 'failed' });
        setActiveRun(prev => ({ ...prev, status: 'failed' }));
        setRuns(prev => prev.map(r => r.id === run.id ? { ...r, status: 'failed' } : r));
      }

      // Reload attempts
      loadAttempts(run.id);
    } catch (err) {
      console.error('Failed to start run:', err);
      setValidation({ valid: false, errors: [`Run creation failed: ${err.message}`], warnings: [] });
      setShowValidation(true);
    }
    setLoading(false);
  }

  // ── Cancel run ──────────────────────────────
  async function handleCancelRun() {
    if (!activeRun) return;
    try {
      await api.updateWorkflowRun(activeRun.id, { status: 'cancelled' });
      setActiveRun(prev => ({ ...prev, status: 'cancelled' }));
      setRuns(prev => prev.map(r => r.id === activeRun.id ? { ...r, status: 'cancelled' } : r));
      // Reset node statuses
      nodes.forEach(n => {
        if (n.node_type === 'PROCESS') onNodeStatusChange?.(n.id, 'pending');
      });
    } catch (err) {
      console.error('Failed to cancel run:', err);
    }
  }

  // ── Attempt actions ─────────────────────────
  async function handleApproveAttempt(attemptId) {
    try {
      const updated = await api.updateGenerationAttempt(attemptId, { status: 'approved' });
      setAttempts(prev => prev.map(a => a.id === attemptId ? updated : a));
      // Update node status
      onNodeStatusChange?.(updated.workflow_node_id, 'completed');
      // Check if all PROCESS attempts are approved
      checkRunCompletion();
    } catch (err) {
      console.error('Failed to approve:', err);
    }
  }

  async function handleRejectAttempt(attemptId) {
    try {
      const updated = await api.updateGenerationAttempt(attemptId, { status: 'rejected' });
      setAttempts(prev => prev.map(a => a.id === attemptId ? updated : a));
      onNodeStatusChange?.(updated.workflow_node_id, 'error');
    } catch (err) {
      console.error('Failed to reject:', err);
    }
  }

  async function handleRegenerateAttempt(attemptId) {
    const original = attempts.find(a => a.id === attemptId);
    if (!original || !activeRun) return;
    try {
      const snapshot = buildInputSnapshot(original.workflow_node_id, nodes, connections);
      const newAttempt = await api.createGenerationAttempt({
        workflow_run_id: activeRun.id,
        workflow_node_id: original.workflow_node_id,
        scene_id: original.scene_id,
        input_snapshot: snapshot,
        prompt: original.prompt,
        negative_prompt: original.negative_prompt,
        provider_id: original.provider_id,
        provider_params: parseJson(original.provider_params, {}),
        status: 'generating',
        previous_attempt_id: attemptId,
      });
      setAttempts(prev => [newAttempt, ...prev]);
      onNodeStatusChange?.(original.workflow_node_id, 'running');
    } catch (err) {
      console.error('Failed to regenerate:', err);
    }
  }

  async function checkRunCompletion() {
    if (!activeRun) return;
    const currentAttempts = await api.getGenerationAttempts({ workflow_run_id: activeRun.id });
    const latestByNode = {};
    currentAttempts.forEach(a => {
      if (!latestByNode[a.workflow_node_id] || a.attempt_number > latestByNode[a.workflow_node_id].attempt_number) {
        latestByNode[a.workflow_node_id] = a;
      }
    });

    const allApproved = Object.values(latestByNode).every(a => a.status === 'approved');
    if (allApproved) {
      await api.updateWorkflowRun(activeRun.id, { status: 'completed' });
      setActiveRun(prev => ({ ...prev, status: 'completed' }));
      setRuns(prev => prev.map(r => r.id === activeRun.id ? { ...r, status: 'completed' } : r));
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 z-40 px-4 py-2 rounded-lg bg-s-3 border border-s-6/30
          text-xs text-t-3 hover:bg-s-4 transition-colors flex items-center gap-2 shadow-lg"
      >
        <Play className="w-3.5 h-3.5 text-accent-400" />
        Run Workflow
        {runs.length > 0 && <span className="bg-s-5 px-1.5 py-0.5 rounded text-[10px]">{runs.length}</span>}
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 left-52 right-0 z-40 bg-s-2 border-t border-s-6/30 shadow-2xl"
      style={{ maxHeight: '45vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-s-6/20">
        <div className="flex items-center gap-3">
          <h3 className="text-[11px] font-semibold text-t-2 uppercase tracking-wider">Workflow Runs</h3>
          <span className="text-[10px] text-t-4 bg-s-4/60 px-2 py-0.5 rounded-full">
            {runs.length} run{runs.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleValidate}
            className="btn-ghost text-[11px] flex items-center gap-1.5"
            title="Validate workflow">
            <CheckCircle className="w-3.5 h-3.5" /> Validate
          </button>
          {activeRun && ['running', 'pending'].includes(activeRun.status) ? (
            <button onClick={handleCancelRun}
              className="btn-ghost text-[11px] text-red-400 flex items-center gap-1.5">
              <Square className="w-3.5 h-3.5" /> Cancel Run
            </button>
          ) : (
            <button onClick={handleStartRun} disabled={loading}
              className="btn-primary text-[11px] flex items-center gap-1.5">
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {loading ? 'Starting...' : 'Start Run'}
            </button>
          )}
          <button onClick={onToggle} className="p-1 rounded-md hover:bg-s-4 text-t-4 hover:text-t-2">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Validation banner */}
      {showValidation && validation && (
        <div className={`mx-4 mt-2 px-3 py-2 rounded-lg text-xs ${
          validation.valid
            ? 'bg-green-500/10 border border-green-500/30 text-green-300'
            : 'bg-red-500/10 border border-red-500/30 text-red-300'
        }`}>
          <div className="flex items-start gap-2">
            {validation.valid
              ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
              : <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            }
            <div className="flex-1">
              <p className="font-medium">{validation.valid ? 'Workflow is valid' : 'Validation failed'}</p>
              {validation.errors.map((e, i) => (
                <p key={`e-${i}`} className="text-red-400 mt-0.5">• {e}</p>
              ))}
              {validation.warnings.map((w, i) => (
                <p key={`w-${i}`} className="text-amber-400 mt-0.5">⚠ {w}</p>
              ))}
            </div>
            <button onClick={() => setShowValidation(false)} className="text-t-4 hover:text-t-2">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(45vh - 48px)' }}>
        {runs.length === 0 ? (
          <div className="text-center py-8 text-sm text-t-4">
            No runs yet. Click "Start Run" to execute this workflow.
          </div>
        ) : (
          <div className="px-4 py-2 space-y-2">
            {runs.map(run => (
              <RunRow
                key={run.id}
                run={run}
                isActive={activeRun?.id === run.id}
                attempts={activeRun?.id === run.id ? attempts : []}
                nodes={nodes}
                onSelect={() => { setActiveRun(run); loadAttempts(run.id); }}
                onApprove={handleApproveAttempt}
                onReject={handleRejectAttempt}
                onRegenerate={handleRegenerateAttempt}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RunRow({ run, isActive, attempts, nodes, onSelect, onApprove, onReject, onRegenerate }) {
  const [expanded, setExpanded] = useState(isActive);

  useEffect(() => { setExpanded(isActive); }, [isActive]);

  const statusIcon = {
    pending: <Clock className="w-3.5 h-3.5 text-t-4" />,
    validating: <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />,
    running: <Play className="w-3.5 h-3.5 text-cyan-400" />,
    completed: <CheckCircle className="w-3.5 h-3.5 text-green-400" />,
    failed: <XCircle className="w-3.5 h-3.5 text-red-400" />,
    cancelled: <Square className="w-3.5 h-3.5 text-t-4" />,
  };

  return (
    <div className="rounded-lg border border-s-6/30 overflow-hidden">
      {/* Run header */}
      <button
        onClick={() => { setExpanded(!expanded); onSelect(); }}
        className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-s-4/30 transition-colors ${
          isActive ? 'bg-s-3/50' : ''
        }`}
      >
        {expanded ? <ChevronDown className="w-3 h-3 text-t-4" /> : <ChevronRight className="w-3 h-3 text-t-4" />}
        {statusIcon[run.status] || statusIcon.pending}
        <span className="text-xs font-medium text-t-2 flex-1">Run #{run.id.slice(0, 8)}</span>
        <StatusBadge status={run.status} />
        <span className="text-[10px] text-t-4">{formatDate(run.created_at)}</span>
      </button>

      {/* Expanded: show attempts */}
      {expanded && attempts.length > 0 && (
        <div className="border-t border-s-6/20 px-3 py-2 space-y-1.5">
          {attempts.map(attempt => {
            const node = nodes.find(n => n.id === attempt.workflow_node_id);
            return (
              <AttemptRow
                key={attempt.id}
                attempt={attempt}
                nodeLabel={node?.label || 'Unknown'}
                onApprove={() => onApprove(attempt.id)}
                onReject={() => onReject(attempt.id)}
                onRegenerate={() => onRegenerate(attempt.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function AttemptRow({ attempt, nodeLabel, onApprove, onReject, onRegenerate }) {
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewAction, setReviewAction] = useState(null); // 'approved' | 'rejected'
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackType, setFeedbackType] = useState('note');

  const statusColors = {
    generating: 'text-cyan-400',
    generated: 'text-amber-400',
    review: 'text-amber-400',
    approved: 'text-green-400',
    rejected: 'text-red-400',
    failed: 'text-red-400',
    error: 'text-red-400',
  };

  const canReview = ['generated', 'review'].includes(attempt.status);
  const canRegenerate = ['rejected', 'failed', 'error'].includes(attempt.status);
  const metadata = parseJson(attempt.metadata, {});
  const isManual = metadata.adapterResult?.status === 'awaiting_export';

  async function handleExportInputs() {
    const snapshot = parseJson(attempt.input_snapshot, {});
    const pkg = buildExportPackage(snapshot, parseJson(attempt.provider_params, {}), { name: 'Manual', provider_type: 'manual' });
    const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `export-attempt-${attempt.attempt_number}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportResult(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseImportResult(text);
    if (parsed.valid) {
      await api.updateGenerationAttempt(attempt.id, {
        status: 'generated',
        output_url: parsed.result.outputUrl || '',
        metadata: JSON.stringify({ ...metadata, importedResult: parsed.result }),
      });
      onApprove();
    } else {
      alert(parsed.error);
    }
    e.target.value = '';
  }

  function openReview(action) {
    setReviewAction(action);
    setReviewNotes('');
    setRejectReason('');
    setShowReviewForm(true);
  }

  async function submitReview() {
    try {
      // Create a review record with reject reason
      await api.createReview({
        generation_attempt_id: attempt.id,
        review_type: 'production',
        status: reviewAction,
        notes: reviewNotes.trim() || null,
        reject_reason: reviewAction === 'rejected' ? rejectReason : '',
      });
      // Update attempt status
      if (reviewAction === 'approved') {
        onApprove();
      } else {
        onReject();
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
    }
    setShowReviewForm(false);
  }

  async function submitFeedback() {
    if (!feedbackContent.trim()) return;
    try {
      await api.createFeedback({
        generation_attempt_id: attempt.id,
        feedback_type: feedbackType,
        content: feedbackContent.trim(),
        target_aspect: feedbackType === 'issue' ? 'regenerate' : '',
      });
      setFeedbackContent('');
      setShowFeedback(false);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    }
  }

  return (
    <div className="rounded bg-s-4/20">
      <div className="flex items-center gap-2 px-2 py-1.5 text-xs">
        <span className="text-t-3 truncate flex-1" title={nodeLabel}>
          {nodeLabel}
          <span className="text-[10px] text-t-4 ml-1">#{attempt.attempt_number}</span>
        </span>
        <span className={`text-[10px] font-medium ${statusColors[attempt.status] || 'text-t-4'}`}>
          {attempt.status}
        </span>
        {/* Manual provider: export/import buttons */}
        {isManual && attempt.status === 'review' && (
          <div className="flex items-center gap-1">
            <button onClick={handleExportInputs}
              className="p-1 rounded hover:bg-accent-500/20 text-accent-400" title="Export inputs">
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <label className="p-1 rounded hover:bg-green-500/20 text-green-400 cursor-pointer" title="Import result">
              <ChevronRight className="w-3.5 h-3.5" />
              <input type="file" accept=".json" className="hidden" onChange={handleImportResult} />
            </label>
          </div>
        )}
        {canReview && (
          <div className="flex items-center gap-1">
            <button onClick={() => openReview('approved')} className="p-1 rounded hover:bg-green-500/20 text-green-400" title="Approve">
              <CheckCircle className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => openReview('rejected')} className="p-1 rounded hover:bg-red-500/20 text-red-400" title="Reject">
              <XCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {canRegenerate && (
          <button onClick={onRegenerate} className="p-1 rounded hover:bg-accent-500/20 text-accent-400" title="Regenerate">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
        {/* Feedback toggle — always available */}
        <button
          onClick={() => setShowFeedback(!showFeedback)}
          className="p-1 rounded hover:bg-accent-500/20 text-t-4 hover:text-accent-400"
          title="Add feedback"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Error message */}
      {attempt.error && (
        <div className="mx-2 mb-1.5 px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-[10px] text-red-400">
          {attempt.error}
        </div>
      )}

      {/* Inline review form */}
      {showReviewForm && (
        <div className="mx-2 mb-1.5 p-2 rounded bg-s-3 border border-s-6/30 space-y-1.5">
          <div className="flex items-center gap-1.5">
            {reviewAction === 'approved'
              ? <CheckCircle className="w-3.5 h-3.5 text-green-400" />
              : <XCircle className="w-3.5 h-3.5 text-red-400" />
            }
            <span className="text-[11px] font-medium text-t-2">
              {reviewAction === 'approved' ? 'Approve' : 'Reject'} Generation
            </span>
          </div>
          {reviewAction === 'rejected' && (
            <select
              className="input text-[10px] py-0.5 w-full"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            >
              <option value="">Select reject reason...</option>
              {REJECT_REASONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          )}
          <textarea
            className="input text-[11px] w-full min-h-[36px] resize-y"
            placeholder="Review notes (optional)..."
            value={reviewNotes}
            onChange={e => setReviewNotes(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-1.5">
            <button onClick={() => setShowReviewForm(false)} className="text-[10px] text-t-4 hover:text-t-2 px-2 py-0.5">
              Cancel
            </button>
            <button
              onClick={submitReview}
              className={`text-[10px] font-medium px-2.5 py-0.5 rounded ${
                reviewAction === 'approved'
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              }`}
            >
              {reviewAction === 'approved' ? 'Approve' : 'Reject'}
            </button>
          </div>
        </div>
      )}

      {/* Inline feedback form */}
      {showFeedback && (
        <div className="mx-2 mb-1.5 p-2 rounded bg-s-3 border border-s-6/30 space-y-1.5">
          <div className="flex items-center gap-2">
            <select
              className="input text-[10px] py-0.5 w-20"
              value={feedbackType}
              onChange={e => setFeedbackType(e.target.value)}
            >
              <option value="note">Note</option>
              <option value="issue">Issue</option>
              <option value="lesson">Lesson</option>
            </select>
            <span className="text-[10px] text-t-4">Feedback</span>
          </div>
          <textarea
            className="input text-[11px] w-full min-h-[36px] resize-y"
            placeholder="Describe observation, issue, or lesson learned..."
            value={feedbackContent}
            onChange={e => setFeedbackContent(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-1.5">
            <button onClick={() => setShowFeedback(false)} className="text-[10px] text-t-4 hover:text-t-2 px-2 py-0.5">
              Cancel
            </button>
            <button
              onClick={submitFeedback}
              disabled={!feedbackContent.trim()}
              className="text-[10px] font-medium px-2.5 py-0.5 rounded bg-accent-600/20 text-accent-400 hover:bg-accent-600/30 disabled:opacity-40"
            >
              Save Feedback
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
