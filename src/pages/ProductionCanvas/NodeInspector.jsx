import React, { useState, useEffect } from 'react';
import { X, Trash2, Edit3, Check, Link, Zap, Settings, Download, Upload } from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import { NODE_SUBTYPES, NODE_TYPES, formatDate, parseJson } from '../../utils/helpers';
import { NODE_TYPE_COLORS } from './canvasUtils';
import { inferCapability, loadMatchingProviders, buildExportPackage, parseImportResult } from './providerAdapter';

/**
 * NodeInspector — right sidebar for viewing/editing selected workflow node properties.
 * Shows node type, label, config, resource reference, and connections.
 */
export default function NodeInspector({ node, connections, allNodes, onClose, onUpdate, onDelete }) {
  const [editLabel, setEditLabel] = useState(node.label);
  const [isEditing, setIsEditing] = useState(false);
  const [config, setConfig] = useState(() => parseJson(node.config, {}));
  const [matchingProviders, setMatchingProviders] = useState([]);

  useEffect(() => {
    setEditLabel(node.label);
    setIsEditing(false);
    setConfig(parseJson(node.config, {}));
  }, [node.id]);

  // Load matching providers for PROCESS nodes
  useEffect(() => {
    if (node.node_type !== 'PROCESS') return;
    const cap = inferCapability(node.node_subtype);
    loadMatchingProviders(cap).then(setMatchingProviders).catch(() => setMatchingProviders([]));
  }, [node.id, node.node_type, node.node_subtype]);

  const subtypeInfo = NODE_SUBTYPES[node.node_subtype] || { icon: '•', label: node.node_subtype };
  const typeInfo = NODE_TYPES[node.node_type] || { label: node.node_type };
  const colors = NODE_TYPE_COLORS[node.node_type] || NODE_TYPE_COLORS.DATA;
  const resourceRef = parseJson(node.resource_ref, null);

  // Connections to/from this node
  const inboundConns = connections.filter(c => c.target_node_id === node.id);
  const outboundConns = connections.filter(c => c.source_node_id === node.id);

  function handleSaveLabel() {
    if (editLabel.trim() && editLabel.trim() !== node.label) {
      onUpdate({ label: editLabel.trim() });
    }
    setIsEditing(false);
  }

  function handleConfigChange(key, value) {
    const next = { ...config, [key]: value };
    setConfig(next);
    onUpdate({ config: JSON.stringify(next) });
  }

  function getNodeLabel(nodeId) {
    const n = allNodes.find(nd => nd.id === nodeId);
    return n ? n.label : nodeId;
  }

  return (
    <div className="w-72 bg-s-2 border-l border-s-6/30 flex flex-col shrink-0 h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-s-6/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors.accent }} />
          <span className="text-[10px] font-semibold text-t-3 uppercase tracking-wider">Node Inspector</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-s-4 text-t-4 hover:text-t-2 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Node Identity */}
        <div className="px-4 py-3 border-b border-s-6/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{subtypeInfo.icon}</span>
            {isEditing ? (
              <div className="flex-1 flex items-center gap-1">
                <input
                  className="input text-sm font-semibold flex-1"
                  value={editLabel}
                  autoFocus
                  onChange={e => setEditLabel(e.target.value)}
                  onBlur={handleSaveLabel}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveLabel();
                    if (e.key === 'Escape') { setEditLabel(node.label); setIsEditing(false); }
                  }}
                />
                <button onClick={handleSaveLabel} className="p-1 text-green-400">
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <h2
                className="text-sm font-semibold text-t-1 cursor-pointer hover:text-accent-400 transition-colors flex-1 truncate"
                onClick={() => setIsEditing(true)}
              >
                {node.label}
              </h2>
            )}
            {!isEditing && (
              <button onClick={() => setIsEditing(true)} className="p-1 text-t-4 hover:text-t-2">
                <Edit3 className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium"
              style={{ backgroundColor: colors.fill, color: colors.label, border: `1px solid ${colors.stroke}` }}>
              {typeInfo.label}
            </span>
            <span className="text-[10px] text-t-4">{subtypeInfo.label}</span>
            {node.status && <StatusBadge status={node.status} />}
          </div>
        </div>

        {/* Resource Reference (DATA nodes) */}
        {resourceRef && (
          <div className="px-4 py-3 border-b border-s-6/20">
            <h4 className="text-[10px] text-t-4 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Link className="w-3 h-3" /> Resource Reference
            </h4>
            <div className="card p-2.5 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-t-4">Catalog ID</span>
                <span className="text-t-2 font-mono text-[10px] truncate max-w-[140px]">{resourceRef.catalogId}</span>
              </div>
              {resourceRef.name && (
                <div className="flex justify-between text-xs">
                  <span className="text-t-4">Name</span>
                  <span className="text-t-2 truncate max-w-[140px]">{resourceRef.name}</span>
                </div>
              )}
              {resourceRef.type && (
                <div className="flex justify-between text-xs">
                  <span className="text-t-4">Type</span>
                  <span className="text-t-2">{resourceRef.type}</span>
                </div>
              )}
              {resourceRef.versionId && (
                <div className="flex justify-between text-xs">
                  <span className="text-t-4">Version</span>
                  <span className="text-t-2">v{resourceRef.versionId}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Config (PROCESS nodes) */}
        {node.node_type === 'PROCESS' && (
          <div className="px-4 py-3 border-b border-s-6/20">
            <h4 className="text-[10px] text-t-4 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Settings className="w-3 h-3" /> Configuration
            </h4>
            <div className="space-y-2">
              {/* Provider selection */}
              <div>
                <label className="text-[10px] text-t-4">Provider</label>
                {matchingProviders.length > 0 ? (
                  <select
                    className="input text-xs mt-0.5"
                    value={config.providerId || ''}
                    onChange={e => {
                      const sel = matchingProviders.find(p => p.id === e.target.value);
                      handleConfigChange('providerId', e.target.value);
                      handleConfigChange('provider', sel ? sel.name : '');
                      handleConfigChange('providerType', sel ? sel.provider_type : '');
                    }}
                  >
                    <option value="">Select provider...</option>
                    {matchingProviders.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.provider_type.replace(/_/g, ' ')})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="input text-xs mt-0.5"
                    value={config.provider || ''}
                    placeholder="e.g. kling, runway, manual"
                    onChange={e => handleConfigChange('provider', e.target.value)}
                  />
                )}
                {config.providerType === 'manual' && (
                  <div className="flex gap-1.5 mt-1.5">
                    <button
                      className="btn-ghost text-[10px] flex items-center gap-1 px-2 py-1"
                      onClick={() => {
                        const pkg = buildExportPackage({}, parseJson(node.config, {}), { name: config.provider, provider_type: 'manual' });
                        const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = `export-${node.label.replace(/\s+/g, '_')}.json`; a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      <Download className="w-3 h-3" /> Export Inputs
                    </button>
                    <label className="btn-ghost text-[10px] flex items-center gap-1 px-2 py-1 cursor-pointer">
                      <Upload className="w-3 h-3" /> Import Result
                      <input type="file" accept=".json" className="hidden" onChange={async e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const text = await file.text();
                        const parsed = parseImportResult(text);
                        if (parsed.valid) {
                          handleConfigChange('importedResult', parsed.result);
                        } else {
                          alert(parsed.error);
                        }
                        e.target.value = '';
                      }} />
                    </label>
                  </div>
                )}
              </div>
              {/* Prompt template */}
              {(node.node_subtype === 'build_prompt' || node.node_subtype === 'compose_scene') && (
                <div>
                  <label className="text-[10px] text-t-4">Template</label>
                  <textarea
                    className="input text-xs mt-0.5 min-h-[60px] resize-y"
                    value={config.template || ''}
                    placeholder="Prompt template..."
                    onChange={e => handleConfigChange('template', e.target.value)}
                  />
                </div>
              )}
              {/* Notes */}
              <div>
                <label className="text-[10px] text-t-4">Notes</label>
                <textarea
                  className="input text-xs mt-0.5 min-h-[40px] resize-y"
                  value={config.notes || ''}
                  placeholder="Processing notes..."
                  onChange={e => handleConfigChange('notes', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Connections */}
        <div className="px-4 py-3 border-b border-s-6/20">
          <h4 className="text-[10px] text-t-4 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Zap className="w-3 h-3" /> Connections
          </h4>
          {inboundConns.length === 0 && outboundConns.length === 0 ? (
            <p className="text-[10px] text-t-4">No connections yet.</p>
          ) : (
            <div className="space-y-2">
              {/* Inbound */}
              {inboundConns.length > 0 && (
                <div>
                  <span className="text-[9px] text-t-4 uppercase">Inputs ({inboundConns.length})</span>
                  <div className="space-y-1 mt-1">
                    {inboundConns.map(c => (
                      <div key={c.id} className="text-[11px] text-t-3 px-2 py-1 rounded bg-s-4/30 flex items-center gap-1.5">
                        <span className="text-t-4">←</span>
                        <span className="truncate">{getNodeLabel(c.source_node_id)}</span>
                        {c.data_type && (
                          <span className="text-[9px] text-t-4 ml-auto font-mono">{c.data_type}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Outbound */}
              {outboundConns.length > 0 && (
                <div>
                  <span className="text-[9px] text-t-4 uppercase">Outputs ({outboundConns.length})</span>
                  <div className="space-y-1 mt-1">
                    {outboundConns.map(c => (
                      <div key={c.id} className="text-[11px] text-t-3 px-2 py-1 rounded bg-s-4/30 flex items-center gap-1.5">
                        <span className="text-t-4">→</span>
                        <span className="truncate">{getNodeLabel(c.target_node_id)}</span>
                        {c.data_type && (
                          <span className="text-[9px] text-t-4 ml-auto font-mono">{c.data_type}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="px-4 py-3 border-b border-s-6/20 text-xs text-t-4 space-y-1">
          <div>ID: <span className="font-mono text-[10px] text-t-3">{node.id}</span></div>
          <div>Position: ({Math.round(node.position_x || 0)}, {Math.round(node.position_y || 0)})</div>
          <div>Created: {formatDate(node.created_at)}</div>
          <div>Updated: {formatDate(node.updated_at)}</div>
        </div>
      </div>

      {/* Delete */}
      <div className="px-4 py-3 border-t border-s-6/30 shrink-0">
        <button
          className="btn-ghost w-full text-xs text-red-400 hover:text-red-300 flex items-center gap-2 justify-center py-2"
          onClick={onDelete}
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete Node
        </button>
      </div>
    </div>
  );
}
