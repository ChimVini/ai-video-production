import React, { useState, useEffect, useCallback } from 'react';
import {
  GitBranch, AlertTriangle, CheckCircle, XCircle, RefreshCw,
  ChevronDown, ChevronRight, ArrowRight, Shield, Trash2, Plus
} from 'lucide-react';
import {
  STATUS_COLORS, formatDate, formatStatus, parseJson,
  DEPENDENCY_TYPES, DEPENDENCY_STATUSES, IMPACT_LEVELS, ENTITY_TYPE_LABELS
} from '../../utils/helpers';

export default function ImpactDependencyPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [dependencies, setDependencies] = useState([]);
  const [impactSummary, setImpactSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedSource, setExpandedSource] = useState(null);

  useEffect(() => {
    window.api.getProjects().then(setProjects);
  }, []);

  const loadData = useCallback(async (pid) => {
    if (!pid) return;
    setLoading(true);
    try {
      const [deps, summary] = await Promise.all([
        window.api.getDependencyRecords(pid),
        window.api.getDependencyImpactSummary(pid),
      ]);
      setDependencies(deps);
      setImpactSummary(summary);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProject) loadData(selectedProject);
  }, [selectedProject, loadData]);

  const handleResolve = async (depId) => {
    await window.api.resolveDependency(depId);
    loadData(selectedProject);
  };

  const handleDelete = async (depId) => {
    await window.api.deleteDependencyRecord(depId);
    loadData(selectedProject);
  };

  const handlePropagate = async (sourceType, sourceId) => {
    const result = await window.api.propagateDependencyChange(sourceType, sourceId);
    loadData(selectedProject);
  };

  // Group dependencies by source entity
  const grouped = dependencies.reduce((acc, dep) => {
    const key = `${dep.source_entity_type}::${dep.source_entity_id}`;
    if (!acc[key]) acc[key] = { sourceType: dep.source_entity_type, sourceId: dep.source_entity_id, deps: [] };
    acc[key].deps.push(dep);
    return acc;
  }, {});

  const statusIcon = (status) => {
    if (status === 'current') return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    if (status === 'needs_review') return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    return <XCircle className="w-4 h-4 text-red-400" />;
  };

  const impactColor = (level) => {
    const map = { low: 'text-t-3', medium: 'text-amber-400', high: 'text-orange-400', critical: 'text-red-400' };
    return map[level] || 'text-t-3';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-600/20 flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-accent-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-t-1">Impact & Dependency View</h1>
            <p className="text-sm text-t-3">Track dependencies between entities and propagate changes</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="input-field w-56"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            <option value="">Select project...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {selectedProject && (
            <button className="btn-primary text-sm" onClick={() => setShowCreate(!showCreate)}>
              <Plus className="w-4 h-4" /> Add Dependency
            </button>
          )}
        </div>
      </div>

      {!selectedProject && (
        <div className="card p-12 text-center text-t-3">
          Select a project to view its dependency graph
        </div>
      )}

      {selectedProject && (
        <>
          {/* Impact Summary Cards */}
          {impactSummary && (
            <div className="grid grid-cols-4 gap-4">
              {DEPENDENCY_STATUSES.map((s) => {
                const count = impactSummary.byStatus?.find((x) => x.status === s.value)?.count || 0;
                return (
                  <div key={s.value} className="card p-4">
                    <div className="flex items-center gap-2 mb-1">
                      {statusIcon(s.value)}
                      <span className="text-sm text-t-2 font-medium">{s.label}</span>
                    </div>
                    <div className="text-2xl font-bold text-t-1">{count}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Critical Issues */}
          {impactSummary?.critical?.length > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-t-1 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Issues Requiring Attention ({impactSummary.critical.length})
              </h3>
              <div className="space-y-2">
                {impactSummary.critical.map((dep) => (
                  <div key={dep.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-s-3/50">
                    <div className="flex items-center gap-3">
                      {statusIcon(dep.status)}
                      <span className="text-sm text-t-2">
                        <span className="font-medium">{ENTITY_TYPE_LABELS[dep.source_entity_type] || dep.source_entity_type}</span>
                        <ArrowRight className="w-3 h-3 inline mx-1 text-t-4" />
                        <span className="font-medium">{ENTITY_TYPE_LABELS[dep.dependent_entity_type] || dep.dependent_entity_type}</span>
                      </span>
                      <span className={`text-xs ${impactColor(dep.impact_level)}`}>
                        {formatStatus(dep.impact_level)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[dep.status] || 'badge-gray'}`}>
                        {formatStatus(dep.status)}
                      </span>
                      <button
                        className="text-xs text-accent-400 hover:text-accent-300"
                        onClick={() => handleResolve(dep.id)}
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create Dependency Form */}
          {showCreate && (
            <CreateDependencyForm
              projectId={selectedProject}
              onCreated={() => { setShowCreate(false); loadData(selectedProject); }}
              onCancel={() => setShowCreate(false)}
            />
          )}

          {/* Dependency Graph (grouped by source) */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-t-1 mb-4">
              Dependency Records ({dependencies.length})
            </h3>
            {Object.keys(grouped).length === 0 && (
              <div className="text-center text-t-4 py-8">No dependencies tracked yet</div>
            )}
            <div className="space-y-2">
              {Object.entries(grouped).map(([key, group]) => (
                <div key={key} className="border border-s-6/20 rounded-lg overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 bg-s-3/30 hover:bg-s-3/50"
                    onClick={() => setExpandedSource(expandedSource === key ? null : key)}
                  >
                    <div className="flex items-center gap-3">
                      {expandedSource === key ? <ChevronDown className="w-4 h-4 text-t-3" /> : <ChevronRight className="w-4 h-4 text-t-3" />}
                      <span className="text-sm font-medium text-t-1">
                        {ENTITY_TYPE_LABELS[group.sourceType] || group.sourceType}
                      </span>
                      <span className="text-xs text-t-4 font-mono">{group.sourceId.slice(0, 12)}...</span>
                      <span className="text-xs text-t-3">→ {group.deps.length} dependents</span>
                    </div>
                    <button
                      className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                      onClick={(e) => { e.stopPropagation(); handlePropagate(group.sourceType, group.sourceId); }}
                      title="Simulate change: mark all dependents as needs_review"
                    >
                      <RefreshCw className="w-3 h-3 inline mr-1" /> Propagate Change
                    </button>
                  </button>

                  {expandedSource === key && (
                    <div className="divide-y divide-s-6/20">
                      {group.deps.map((dep) => (
                        <div key={dep.id} className="flex items-center justify-between px-4 py-2.5 pl-12 bg-s-2/50">
                          <div className="flex items-center gap-3">
                            {statusIcon(dep.status)}
                            <ArrowRight className="w-3 h-3 text-t-4" />
                            <span className="text-sm text-t-2">
                              {ENTITY_TYPE_LABELS[dep.dependent_entity_type] || dep.dependent_entity_type}
                            </span>
                            <span className="text-xs text-t-4 font-mono">{dep.dependent_entity_id.slice(0, 12)}...</span>
                            <span className={`text-xs ${impactColor(dep.impact_level)}`}>
                              {formatStatus(dep.impact_level)}
                            </span>
                            <span className="text-xs text-t-4">
                              {DEPENDENCY_TYPES.find(t => t.value === dep.dependency_type)?.label || dep.dependency_type}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[dep.status] || 'badge-gray'}`}>
                              {formatStatus(dep.status)}
                            </span>
                            {dep.status !== 'current' && (
                              <button
                                className="text-xs text-emerald-400 hover:text-emerald-300"
                                onClick={() => handleResolve(dep.id)}
                              >
                                <Shield className="w-3 h-3 inline mr-0.5" /> Resolve
                              </button>
                            )}
                            <button
                              className="text-xs text-red-400/60 hover:text-red-400"
                              onClick={() => handleDelete(dep.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Create dependency form ──────────────────────── */
function CreateDependencyForm({ projectId, onCreated, onCancel }) {
  const [form, setForm] = useState({
    source_entity_type: 'character',
    source_entity_id: '',
    dependent_entity_type: 'shot',
    dependent_entity_id: '',
    dependency_type: 'reference',
    impact_level: 'medium',
    notes: '',
  });

  const entityTypes = Object.keys(ENTITY_TYPE_LABELS);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await window.api.createDependencyRecord({ ...form, project_id: projectId });
    onCreated();
  };

  return (
    <form onSubmit={handleSubmit} className="card p-4 space-y-4 border border-accent-500/30">
      <h3 className="text-sm font-semibold text-t-1">Add Dependency Record</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-t-3 mb-1">Source Entity Type</label>
          <select className="input-field w-full" value={form.source_entity_type}
            onChange={(e) => setForm({ ...form, source_entity_type: e.target.value })}>
            {entityTypes.map(t => <option key={t} value={t}>{ENTITY_TYPE_LABELS[t]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-t-3 mb-1">Source Entity ID</label>
          <input className="input-field w-full" value={form.source_entity_id}
            onChange={(e) => setForm({ ...form, source_entity_id: e.target.value })}
            placeholder="Paste entity ID..." required />
        </div>
        <div>
          <label className="block text-xs text-t-3 mb-1">Dependent Entity Type</label>
          <select className="input-field w-full" value={form.dependent_entity_type}
            onChange={(e) => setForm({ ...form, dependent_entity_type: e.target.value })}>
            {entityTypes.map(t => <option key={t} value={t}>{ENTITY_TYPE_LABELS[t]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-t-3 mb-1">Dependent Entity ID</label>
          <input className="input-field w-full" value={form.dependent_entity_id}
            onChange={(e) => setForm({ ...form, dependent_entity_id: e.target.value })}
            placeholder="Paste entity ID..." required />
        </div>
        <div>
          <label className="block text-xs text-t-3 mb-1">Dependency Type</label>
          <select className="input-field w-full" value={form.dependency_type}
            onChange={(e) => setForm({ ...form, dependency_type: e.target.value })}>
            {DEPENDENCY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-t-3 mb-1">Impact Level</label>
          <select className="input-field w-full" value={form.impact_level}
            onChange={(e) => setForm({ ...form, impact_level: e.target.value })}>
            {IMPACT_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-t-3 mb-1">Notes</label>
        <textarea className="input-field w-full" rows={2} value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary text-sm" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary text-sm">Create</button>
      </div>
    </form>
  );
}
