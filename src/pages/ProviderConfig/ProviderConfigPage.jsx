import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Trash2, Edit3, Check, X, Server, Globe, Code2,
  Webhook, Hand, ChevronDown, ChevronRight, Zap, ExternalLink
} from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import { PROVIDER_TYPES, PROVIDER_CAPABILITIES } from '../../utils/helpers';

const PROVIDER_ICONS = {
  rest_api: Globe,
  sdk: Code2,
  mcp: Server,
  webhook: Webhook,
  manual: Hand,
};

/**
 * ProviderConfigPage — management UI for AI generation provider configurations.
 * CRUD list + detail editing for provider_configs table.
 */
export default function ProviderConfigPage() {
  const [providers, setProviders] = useState([]);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null); // provider id being edited
  const [expandedId, setExpandedId] = useState(null);

  // Create form
  const [form, setForm] = useState({
    name: '',
    provider_type: 'rest_api',
    endpoint: '',
    capabilities: [],
    default_params: '{}',
    status: 'active',
  });

  const load = useCallback(async () => {
    try {
      const list = await window.api.getProviderConfigs();
      setProviders(list || []);
    } catch (err) {
      console.error('Failed to load providers:', err);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = providers.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.provider_type.toLowerCase().includes(search.toLowerCase())
  );

  function resetForm() {
    setForm({ name: '', provider_type: 'rest_api', endpoint: '', capabilities: [], default_params: '{}', status: 'active' });
  }

  async function handleCreate() {
    if (!form.name.trim()) return;
    let parsedParams;
    try {
      parsedParams = JSON.parse(form.default_params);
    } catch {
      alert('Invalid JSON in default parameters.');
      return;
    }
    await window.api.createProviderConfig({
      name: form.name.trim(),
      provider_type: form.provider_type,
      endpoint: form.endpoint.trim(),
      capabilities: form.capabilities,
      default_params: parsedParams,
      status: form.status,
    });
    resetForm();
    setShowCreate(false);
    load();
  }

  async function handleUpdate(id) {
    const prov = providers.find(p => p.id === id);
    if (!prov) return;
    let parsedParams;
    try {
      parsedParams = JSON.parse(prov._editParams || prov.default_params || '{}');
    } catch {
      alert('Invalid JSON in default parameters.');
      return;
    }
    await window.api.updateProviderConfig(id, {
      name: prov._editName ?? prov.name,
      provider_type: prov._editType ?? prov.provider_type,
      endpoint: prov._editEndpoint ?? prov.endpoint,
      capabilities: prov._editCaps ?? safeParse(prov.capabilities, []),
      default_params: parsedParams,
      status: prov._editStatus ?? prov.status,
    });
    setEditing(null);
    load();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this provider configuration?')) return;
    await window.api.deleteProviderConfig(id);
    if (expandedId === id) setExpandedId(null);
    load();
  }

  function safeParse(val, fallback) {
    if (!val) return fallback;
    if (Array.isArray(val)) return val;
    try { return JSON.parse(val); } catch { return fallback; }
  }

  function toggleCapability(cap) {
    setForm(prev => {
      const has = prev.capabilities.includes(cap);
      return { ...prev, capabilities: has ? prev.capabilities.filter(c => c !== cap) : [...prev.capabilities, cap] };
    });
  }

  function updateEditField(id, field, value) {
    setProviders(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  }

  const Icon = (type) => PROVIDER_ICONS[type] || Server;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-t-1">Provider Configurations</h1>
          <p className="text-sm text-t-4 mt-0.5">
            Manage AI generation providers — REST APIs, SDKs, MCP servers, webhooks, and manual flows.
          </p>
        </div>
        <button
          className="btn-primary flex items-center gap-1.5"
          onClick={() => { resetForm(); setShowCreate(true); }}
        >
          <Plus className="w-4 h-4" /> Add Provider
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-t-4" />
        <input
          className="input pl-9 text-sm"
          placeholder="Search providers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-s-2 rounded-xl border border-s-6/30 w-[520px] max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-s-6/30 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-t-1">New Provider</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 text-t-4 hover:text-t-2 rounded-md hover:bg-s-4">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              {/* Name */}
              <div>
                <label className="text-xs text-t-3 font-medium">Name *</label>
                <input className="input text-sm mt-1" placeholder="e.g. Kling v2" value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))} autoFocus />
              </div>
              {/* Type */}
              <div>
                <label className="text-xs text-t-3 font-medium">Provider Type</label>
                <select className="input text-sm mt-1" value={form.provider_type}
                  onChange={e => setForm(p => ({ ...p, provider_type: e.target.value }))}>
                  {PROVIDER_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              {/* Endpoint */}
              {form.provider_type !== 'manual' && (
                <div>
                  <label className="text-xs text-t-3 font-medium">Endpoint / URL</label>
                  <input className="input text-sm mt-1" placeholder="https://api.example.com/v1/generate" value={form.endpoint}
                    onChange={e => setForm(p => ({ ...p, endpoint: e.target.value }))} />
                </div>
              )}
              {/* Capabilities */}
              <div>
                <label className="text-xs text-t-3 font-medium mb-1.5 block">Capabilities</label>
                <div className="flex flex-wrap gap-1.5">
                  {PROVIDER_CAPABILITIES.map(cap => {
                    const active = form.capabilities.includes(cap);
                    return (
                      <button key={cap}
                        className={`px-2 py-1 rounded-md text-xs font-medium transition-colors border ${active
                          ? 'bg-accent-600/20 border-accent-500/40 text-accent-300'
                          : 'bg-s-4/30 border-s-6/20 text-t-4 hover:text-t-2'
                        }`}
                        onClick={() => toggleCapability(cap)}
                      >
                        {cap.replace(/_/g, ' ')}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Default Params */}
              <div>
                <label className="text-xs text-t-3 font-medium">Default Parameters (JSON)</label>
                <textarea className="input text-xs mt-1 font-mono min-h-[80px] resize-y"
                  value={form.default_params}
                  onChange={e => setForm(p => ({ ...p, default_params: e.target.value }))}
                  placeholder='{"model": "v2", "resolution": "1080p"}'
                />
              </div>
              {/* Status */}
              <div>
                <label className="text-xs text-t-3 font-medium">Status</label>
                <select className="input text-sm mt-1" value={form.status}
                  onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="testing">Testing</option>
                </select>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-s-6/30 flex justify-end gap-2">
              <button className="btn-ghost text-sm" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn-primary text-sm" onClick={handleCreate} disabled={!form.name.trim()}>
                Create Provider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Provider List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-t-4">
          <Server className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No providers configured yet.</p>
          <p className="text-xs mt-1">Add a provider to connect your workflow to AI generation services.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(prov => {
            const ProvIcon = Icon(prov.provider_type);
            const caps = safeParse(prov.capabilities, []);
            const params = safeParse(prov.default_params, {});
            const isExpanded = expandedId === prov.id;
            const isEdit = editing === prov.id;
            const typeLabel = PROVIDER_TYPES.find(t => t.value === prov.provider_type)?.label || prov.provider_type;

            return (
              <div key={prov.id} className="card">
                {/* Row header */}
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : prov.id)}>
                  <div className="w-8 h-8 rounded-lg bg-s-4/50 flex items-center justify-center shrink-0">
                    <ProvIcon className="w-4 h-4 text-accent-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-t-1 truncate">{prov.name}</span>
                      <StatusBadge status={prov.status} />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-t-4">{typeLabel}</span>
                      {caps.length > 0 && (
                        <span className="text-[10px] text-t-4">
                          &middot; {caps.length} capabilit{caps.length === 1 ? 'y' : 'ies'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button className="p-1.5 rounded-md hover:bg-s-4 text-t-4 hover:text-t-2"
                      onClick={e => { e.stopPropagation(); setEditing(isEdit ? null : prov.id); setExpandedId(prov.id); }}>
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 rounded-md hover:bg-s-4 text-t-4 hover:text-red-400"
                      onClick={e => { e.stopPropagation(); handleDelete(prov.id); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-t-4" /> : <ChevronRight className="w-3.5 h-3.5 text-t-4" />}
                  </div>
                </div>

                {/* Expanded detail / edit */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-s-6/20 pt-3 space-y-3">
                    {isEdit ? (
                      /* ─── Edit mode ─── */
                      <>
                        <div>
                          <label className="text-[10px] text-t-4 uppercase tracking-wider">Name</label>
                          <input className="input text-sm mt-0.5"
                            value={prov._editName ?? prov.name}
                            onChange={e => updateEditField(prov.id, '_editName', e.target.value)} />
                        </div>
                        <div>
                          <label className="text-[10px] text-t-4 uppercase tracking-wider">Type</label>
                          <select className="input text-sm mt-0.5"
                            value={prov._editType ?? prov.provider_type}
                            onChange={e => updateEditField(prov.id, '_editType', e.target.value)}>
                            {PROVIDER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </div>
                        {(prov._editType ?? prov.provider_type) !== 'manual' && (
                          <div>
                            <label className="text-[10px] text-t-4 uppercase tracking-wider">Endpoint</label>
                            <input className="input text-sm mt-0.5"
                              value={prov._editEndpoint ?? prov.endpoint}
                              onChange={e => updateEditField(prov.id, '_editEndpoint', e.target.value)} />
                          </div>
                        )}
                        <div>
                          <label className="text-[10px] text-t-4 uppercase tracking-wider mb-1 block">Capabilities</label>
                          <div className="flex flex-wrap gap-1.5">
                            {PROVIDER_CAPABILITIES.map(cap => {
                              const editCaps = prov._editCaps ?? safeParse(prov.capabilities, []);
                              const active = editCaps.includes(cap);
                              return (
                                <button key={cap}
                                  className={`px-2 py-1 rounded-md text-xs font-medium transition-colors border ${active
                                    ? 'bg-accent-600/20 border-accent-500/40 text-accent-300'
                                    : 'bg-s-4/30 border-s-6/20 text-t-4 hover:text-t-2'
                                  }`}
                                  onClick={() => {
                                    const prev = prov._editCaps ?? safeParse(prov.capabilities, []);
                                    updateEditField(prov.id, '_editCaps', active ? prev.filter(c => c !== cap) : [...prev, cap]);
                                  }}
                                >
                                  {cap.replace(/_/g, ' ')}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-t-4 uppercase tracking-wider">Default Parameters (JSON)</label>
                          <textarea className="input text-xs font-mono mt-0.5 min-h-[60px] resize-y"
                            value={prov._editParams ?? (typeof params === 'string' ? params : JSON.stringify(params, null, 2))}
                            onChange={e => updateEditField(prov.id, '_editParams', e.target.value)} />
                        </div>
                        <div>
                          <label className="text-[10px] text-t-4 uppercase tracking-wider">Status</label>
                          <select className="input text-sm mt-0.5"
                            value={prov._editStatus ?? prov.status}
                            onChange={e => updateEditField(prov.id, '_editStatus', e.target.value)}>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="testing">Testing</option>
                          </select>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button className="btn-ghost text-xs" onClick={() => setEditing(null)}>Cancel</button>
                          <button className="btn-primary text-xs flex items-center gap-1" onClick={() => handleUpdate(prov.id)}>
                            <Check className="w-3 h-3" /> Save
                          </button>
                        </div>
                      </>
                    ) : (
                      /* ─── Read-only detail ─── */
                      <>
                        {prov.endpoint && (
                          <div>
                            <span className="text-[10px] text-t-4 uppercase tracking-wider">Endpoint</span>
                            <div className="text-xs text-t-2 font-mono mt-0.5 flex items-center gap-1.5">
                              {prov.endpoint}
                              <ExternalLink className="w-3 h-3 text-t-4 shrink-0" />
                            </div>
                          </div>
                        )}
                        {caps.length > 0 && (
                          <div>
                            <span className="text-[10px] text-t-4 uppercase tracking-wider">Capabilities</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {caps.map(cap => (
                                <span key={cap} className="px-2 py-0.5 rounded bg-accent-600/10 border border-accent-500/20 text-[10px] text-accent-300 font-medium">
                                  {cap.replace(/_/g, ' ')}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {Object.keys(params).length > 0 && (
                          <div>
                            <span className="text-[10px] text-t-4 uppercase tracking-wider">Default Parameters</span>
                            <pre className="text-[10px] text-t-3 font-mono bg-s-4/20 rounded p-2 mt-1 overflow-x-auto">
                              {JSON.stringify(params, null, 2)}
                            </pre>
                          </div>
                        )}
                        <div className="text-[10px] text-t-4">
                          ID: <span className="font-mono text-t-3">{prov.id}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
