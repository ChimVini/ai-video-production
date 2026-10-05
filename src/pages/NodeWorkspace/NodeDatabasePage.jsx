import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Plus, Trash2, Network, ChevronRight, ChevronDown,
  Check, Eye, Pencil, ArrowLeft, ListTodo, StickyNote
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Breadcrumb from './Breadcrumb';

const api = window.api;

/* ═══════════════════════════════════════════════
   Helper: count all descendants recursively
   ═══════════════════════════════════════════════ */
function countDescendants(node) {
  if (!node._children || node._children.length === 0) return 0;
  return node._children.reduce((s, c) => s + 1 + countDescendants(c), 0);
}
function sumTodos(node) {
  let total = node._todoCount || 0, done = node._todoCompleted || 0, notes = node._noteCount || 0;
  if (node._children) {
    node._children.forEach(c => {
      const sub = sumTodos(c);
      total += sub.total; done += sub.done; notes += sub.notes;
    });
  }
  return { total, done, notes };
}

/* ═══════════════════════════════════════════════
   Child row — recursive, expandable (inside root table)
   ═══════════════════════════════════════════════ */
function ChildRow({ node, depth, expanded, onToggle, onSelect, selectedId, onDelete, onRename }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const isOpen = expanded[node.id];
  const isSelected = selectedId === node.id;
  const hasChildren = node._childCount > 0;
  const progress = node._todoCount > 0 ? (node._todoCompleted / node._todoCount) * 100 : 0;

  function handleSave() {
    if (editName.trim() && editName.trim() !== node.name) onRename(node.id, editName.trim());
    setIsEditing(false);
  }

  return (
    <>
      <tr className={`group border-b border-s-6/10 transition-colors cursor-pointer ${
        isSelected ? 'bg-accent-600/10' : 'hover:bg-s-4/30'
      }`} onClick={() => onSelect(node.id)}>
        {/* Name */}
        <td className="py-2 px-3">
          <div className="flex items-center gap-1" style={{ paddingLeft: depth * 24 }}>
            <button
              className={`p-0.5 rounded transition-colors shrink-0 ${hasChildren ? 'hover:bg-s-5 text-t-4 hover:text-t-2' : 'invisible'}`}
              onClick={e => { e.stopPropagation(); if (hasChildren) onToggle(node.id); }}>
              {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            <span className="w-2 h-2 rounded-full shrink-0 mr-0.5"
              style={{ background: `hsl(${260 - (depth + 1) * 25}, 60%, ${55 - (depth + 1) * 5}%)` }} />
            {isEditing ? (
              <input className="bg-s-4 border border-s-6/30 rounded px-2 py-0.5 text-xs text-t-1 outline-none focus:border-accent-500/50 w-48"
                value={editName} onChange={e => setEditName(e.target.value)}
                onClick={e => e.stopPropagation()} onBlur={handleSave}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setEditName(node.name); setIsEditing(false); } }}
                autoFocus />
            ) : (
              <span className="text-xs font-medium text-t-1 truncate max-w-[260px]"
                onDoubleClick={e => { e.stopPropagation(); setIsEditing(true); }}>
                {node.name}
              </span>
            )}
          </div>
        </td>
        {/* Depth */}
        <td className="py-2 px-3 text-center">
          <span className="text-[10px] text-t-4 bg-s-4/50 px-1.5 py-0.5 rounded-full">Lv.{depth + 1}</span>
        </td>
        {/* Children */}
        <td className="py-2 px-3 text-center">
          {node._childCount > 0 ? <span className="text-xs text-t-3">{node._childCount}</span> : <span className="text-xs text-t-4">—</span>}
        </td>
        {/* Todos */}
        <td className="py-2 px-3">
          {node._todoCount > 0 ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-s-4 rounded-full h-1.5 max-w-[60px]">
                <div className="rounded-full h-1.5 transition-all"
                  style={{ width: `${progress}%`, background: progress === 100 ? '#22c55e' : '#8b5cf6' }} />
              </div>
              <span className="text-[10px] text-t-4 whitespace-nowrap">{node._todoCompleted}/{node._todoCount}</span>
            </div>
          ) : <span className="text-xs text-t-4">—</span>}
        </td>
        {/* Notes */}
        <td className="py-2 px-3 text-center">
          {node._noteCount > 0 ? <span className="text-xs text-t-3">{node._noteCount}</span> : <span className="text-xs text-t-4">—</span>}
        </td>
        {/* Actions */}
        <td className="py-2 px-3">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
            <button className="p-1 rounded hover:bg-s-5 text-t-4 hover:text-t-2" title="Rename"
              onClick={e => { e.stopPropagation(); setIsEditing(true); }}><Pencil className="w-3 h-3" /></button>
            <button className="p-1 rounded hover:bg-s-5 text-t-4 hover:text-red-400" title="Delete"
              onClick={e => { e.stopPropagation(); onDelete(node); }}><Trash2 className="w-3 h-3" /></button>
          </div>
        </td>
      </tr>
      {isOpen && node._children && node._children.map(child => (
        <ChildRow key={child.id} node={child} depth={depth + 1}
          expanded={expanded} onToggle={onToggle} onSelect={onSelect} selectedId={selectedId}
          onDelete={onDelete} onRename={onRename} />
      ))}
    </>
  );
}

/* ═══════════════════════════════════════════════
   Root Node Card — overview grid item
   ═══════════════════════════════════════════════ */
function RootNodeCard({ node, onClick, onDelete, onRename }) {
  const stats = sumTodos(node);
  const descendants = countDescendants(node);
  const progress = stats.total > 0 ? (stats.done / stats.total) * 100 : 0;

  return (
    <div onClick={onClick}
      className="group bg-s-2 rounded-xl border border-s-6/20 p-4 hover:border-accent-500/40 hover:bg-s-3/50 transition-all cursor-pointer relative">
      {/* Actions */}
      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="p-1 rounded hover:bg-s-5 text-t-4 hover:text-t-2" title="Rename"
          onClick={e => { e.stopPropagation(); onRename(node); }}><Pencil className="w-3 h-3" /></button>
        <button className="p-1 rounded hover:bg-s-5 text-t-4 hover:text-red-400" title="Delete"
          onClick={e => { e.stopPropagation(); onDelete(node); }}><Trash2 className="w-3 h-3" /></button>
      </div>

      {/* Crown + Name */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">👑</span>
        <h3 className="text-sm font-bold text-t-1 truncate">{node.name}</h3>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <div className="text-base font-bold text-accent-400">{node._childCount}</div>
          <div className="text-[9px] text-t-4 uppercase">Children</div>
        </div>
        <div className="text-center">
          <div className="text-base font-bold text-blue-400">{descendants}</div>
          <div className="text-[9px] text-t-4 uppercase">Total</div>
        </div>
        <div className="text-center">
          <div className="text-base font-bold text-emerald-400">{stats.notes}</div>
          <div className="text-[9px] text-t-4 uppercase">Notes</div>
        </div>
      </div>

      {/* Todo progress */}
      {stats.total > 0 ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-s-4 rounded-full h-1.5">
            <div className="rounded-full h-1.5 transition-all"
              style={{ width: `${progress}%`, background: progress === 100 ? '#22c55e' : '#8b5cf6' }} />
          </div>
          <span className="text-[10px] text-t-4 whitespace-nowrap shrink-0">
            <Check className="w-2.5 h-2.5 inline mr-0.5" />{stats.done}/{stats.total}
          </span>
        </div>
      ) : (
        <div className="text-[10px] text-t-4">No todos yet</div>
      )}

      {/* Hint */}
      <div className="mt-3 text-[10px] text-t-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight className="w-3 h-3" /> Click to manage children
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Main: Overview (no rootId) or Root Detail (rootId)
   ═══════════════════════════════════════════════ */
export default function NodeDatabasePage() {
  const navigate = useNavigate();
  const { rootId } = useParams();

  const [roots, setRoots] = useState([]);         // enriched root nodes with _children
  const [flatAll, setFlatAll] = useState([]);      // flat list of all nodes (for global stats)
  const [expanded, setExpanded] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateChild, setShowCreateChild] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showRename, setShowRename] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameName, setRenameName] = useState('');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const rootNodes = await api.getWorkspaceRootNodes();
    const flat = [];

    async function loadRecursive(nodes, depth) {
      const result = [];
      for (const node of nodes) {
        const [todos, notes, children] = await Promise.all([
          api.getNodeTodos(node.id),
          api.getNodeNotes(node.id),
          api.getWorkspaceChildren(node.id),
        ]);
        const rootTodos = todos.filter(t => !t.parent_todo_id);
        const enriched = {
          ...node, _depth: depth,
          _todoCount: rootTodos.length,
          _todoCompleted: rootTodos.filter(t => t.completed).length,
          _noteCount: notes.length,
          _childCount: children.length,
          _children: children.length > 0 ? await loadRecursive(children, depth + 1) : [],
        };
        result.push(enriched);
        flat.push(enriched);
      }
      return result;
    }

    const tree = await loadRecursive(rootNodes, 0);
    setRoots(tree);
    setFlatAll(flat);
  }

  // ── CRUD ─────────────────────────────────────
  async function handleCreateRoot(name) {
    await api.createWorkspaceNode({ name, parent_id: null, pos_x: Math.round(Math.random() * 200 - 100), pos_y: Math.round(Math.random() * 200 - 100) });
    setShowCreate(false);
    loadAll();
  }

  async function handleCreateChild(name) {
    const parentId = selectedId || rootId;
    if (!parentId) return;
    const parent = flatAll.find(n => n.id === parentId);
    await api.createWorkspaceNode({ name, parent_id: parentId, pos_x: Math.round((parent?.pos_x || 0) + Math.random() * 80 - 40), pos_y: Math.round((parent?.pos_y || 0) + 120 + Math.random() * 40) });
    setShowCreateChild(false);
    setExpanded(prev => ({ ...prev, [parentId]: true }));
    loadAll();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await api.deleteWorkspaceNode(deleteTarget.id);
    if (selectedId === deleteTarget.id) setSelectedId(null);
    setShowDelete(false); setDeleteTarget(null);
    // If deleting the root we're inside, go back
    if (deleteTarget.id === rootId) navigate('/node-canvas');
    loadAll();
  }

  async function handleRename() {
    if (!renameTarget || !renameName.trim()) return;
    await api.updateWorkspaceNode(renameTarget.id, { name: renameName.trim() });
    setShowRename(false); setRenameTarget(null);
    loadAll();
  }

  async function handleInlineRename(id, name) {
    await api.updateWorkspaceNode(id, { name });
    loadAll();
  }

  function toggleExpand(id) { setExpanded(prev => ({ ...prev, [id]: !prev[id] })); }

  // ── Computed ─────────────────────────────────
  const currentRoot = roots.find(r => r.id === rootId);
  const globalTodos = flatAll.reduce((s, n) => s + n._todoCount, 0);
  const globalDone = flatAll.reduce((s, n) => s + n._todoCompleted, 0);
  const globalNotes = flatAll.reduce((s, n) => s + n._noteCount, 0);

  // ═════════════════════════════════════════════
  // VIEW: Root Detail — table of children
  // ═════════════════════════════════════════════
  if (rootId && currentRoot) {
    const rootStats = sumTodos(currentRoot);
    const descendants = countDescendants(currentRoot);
    const selectedNode = flatAll.find(n => n.id === selectedId);

    function expandAllChildren() {
      const all = { ...expanded };
      function walk(node) { if (node._childCount > 0) { all[node.id] = true; node._children?.forEach(walk); } }
      currentRoot._children?.forEach(walk);
      setExpanded(all);
    }

    return (
      <div className="space-y-4">
        {/* Breadcrumb */}
        <Breadcrumb items={[
          { label: 'Node Workspace', path: '/node-canvas', icon: <Network className="w-3 h-3" /> },
          { label: currentRoot.name, icon: <span className="text-xs">👑</span> },
        ]} />

        {/* Header with back */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-xl hover:bg-s-4 text-t-4 hover:text-t-2 transition-colors"
              onClick={() => navigate('/node-canvas')}>
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-lg">👑</span>
            <div>
              <h1 className="text-lg font-bold text-t-1">{currentRoot.name}</h1>
              <p className="text-xs text-t-4">{descendants} descendant{descendants !== 1 ? 's' : ''} · Depth tree</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost text-xs flex items-center gap-1.5"
              onClick={() => navigate(`/node-canvas/view/${rootId}`)}>
              <Eye className="w-3.5 h-3.5" /> Canvas View
            </button>
            <button className="btn-primary text-xs flex items-center gap-1.5"
              onClick={() => { setSelectedId(rootId); setShowCreateChild(true); }}>
              <Plus className="w-3.5 h-3.5" /> Add Child
            </button>
          </div>
        </div>

        {/* Root stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Direct Children', value: currentRoot._childCount, color: 'text-accent-400' },
            { label: 'All Descendants', value: descendants, color: 'text-blue-400' },
            { label: 'Todos', value: `${rootStats.done}/${rootStats.total}`, color: 'text-green-400' },
            { label: 'Notes', value: rootStats.notes, color: 'text-amber-400' },
          ].map(s => (
            <div key={s.label} className="bg-s-2 rounded-xl border border-s-6/20 p-3 text-center">
              <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-t-4 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between bg-s-2 rounded-xl border border-s-6/20 px-4 py-2">
          <div className="flex items-center gap-2">
            <button className="btn-ghost text-[10px]" onClick={expandAllChildren}>Expand All</button>
            <button className="btn-ghost text-[10px]" onClick={() => setExpanded({})}>Collapse All</button>
          </div>
          {selectedId && selectedId !== rootId && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-t-4">Selected: <span className="text-t-2 font-medium">{selectedNode?.name}</span></span>
              <button className="btn-ghost text-[10px] flex items-center gap-1 text-green-400"
                onClick={() => setShowCreateChild(true)}>
                <Plus className="w-3 h-3" /> Add Child
              </button>
            </div>
          )}
        </div>

        {/* Children table */}
        <div className="bg-s-2 rounded-xl border border-s-6/20 overflow-hidden">
          {currentRoot._children.length === 0 ? (
            <div className="text-center py-12">
              <Network className="w-8 h-8 text-t-4 mx-auto mb-2 opacity-40" />
              <p className="text-xs text-t-3 mb-1">No children yet</p>
              <p className="text-[10px] text-t-4 mb-3">Add child nodes to break down this thinking unit</p>
              <button className="btn-primary text-xs" onClick={() => { setSelectedId(rootId); setShowCreateChild(true); }}>
                <Plus className="w-3.5 h-3.5 mr-1 inline" /> Add Child
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-s-6/30 bg-s-3/50">
                  <th className="text-left text-[10px] text-t-4 uppercase tracking-wider font-semibold py-2.5 px-3 w-[40%]">Node Name</th>
                  <th className="text-center text-[10px] text-t-4 uppercase tracking-wider font-semibold py-2.5 px-3 w-[8%]">Depth</th>
                  <th className="text-center text-[10px] text-t-4 uppercase tracking-wider font-semibold py-2.5 px-3 w-[10%]">Children</th>
                  <th className="text-left text-[10px] text-t-4 uppercase tracking-wider font-semibold py-2.5 px-3 w-[18%]">Todos</th>
                  <th className="text-center text-[10px] text-t-4 uppercase tracking-wider font-semibold py-2.5 px-3 w-[10%]">Notes</th>
                  <th className="text-right text-[10px] text-t-4 uppercase tracking-wider font-semibold py-2.5 px-3 w-[14%]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentRoot._children.map(child => (
                  <ChildRow key={child.id} node={child} depth={0}
                    expanded={expanded} onToggle={toggleExpand}
                    onSelect={setSelectedId} selectedId={selectedId}
                    onDelete={n => { setDeleteTarget(n); setShowDelete(true); }}
                    onRename={handleInlineRename} />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Create child modal */}
        <CreateNodeModal isOpen={showCreateChild} onClose={() => setShowCreateChild(false)}
          onCreated={handleCreateChild}
          title={`Add Child to "${(selectedId === rootId ? currentRoot : selectedNode)?.name || ''}"`}
          desc="Child node will appear nested under the selected parent." />

        {/* Delete confirm */}
        <ConfirmDialog isOpen={showDelete} onClose={() => { setShowDelete(false); setDeleteTarget(null); }}
          onConfirm={handleDelete} title="Delete Node"
          message={`Delete "${deleteTarget?.name}" and all its children, todos & notes? This cannot be undone.`} />
      </div>
    );
  }

  // ═════════════════════════════════════════════
  // VIEW: Overview — all root nodes as cards
  // ═════════════════════════════════════════════
  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Node Workspace', icon: <Network className="w-3 h-3" /> },
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent-600/15 flex items-center justify-center">
            <Network className="w-5 h-5 text-accent-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-t-1">Node Workspace</h1>
            <p className="text-xs text-t-4">Quản lý các đơn vị tư duy — từ tổng quan đến chi tiết</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost text-xs flex items-center gap-1.5"
            onClick={() => navigate('/node-canvas/view')}>
            <Eye className="w-3.5 h-3.5" /> Canvas View
          </button>
          <button className="btn-primary text-xs flex items-center gap-1.5"
            onClick={() => setShowCreate(true)}>
            <Plus className="w-3.5 h-3.5" /> New Root Node
          </button>
        </div>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Root Nodes', value: roots.length, color: 'text-amber-400' },
          { label: 'Total Nodes', value: flatAll.length, color: 'text-accent-400' },
          { label: 'Todos', value: `${globalDone}/${globalTodos}`, color: 'text-green-400' },
          { label: 'Notes', value: globalNotes, color: 'text-blue-400' },
        ].map(s => (
          <div key={s.label} className="bg-s-2 rounded-xl border border-s-6/20 p-3 text-center">
            <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-t-4 uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Root node cards grid */}
      {roots.length === 0 ? (
        <div className="bg-s-2 rounded-xl border border-s-6/20 text-center py-16">
          <Network className="w-10 h-10 text-t-4 mx-auto mb-3 opacity-40" />
          <p className="text-sm text-t-3 mb-1">Chưa có node nào</p>
          <p className="text-xs text-t-4 mb-4">Tạo root node đầu tiên để bắt đầu tổ chức tư duy</p>
          <button className="btn-primary text-xs" onClick={() => setShowCreate(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5 inline" /> New Root Node
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {roots.map(root => (
            <RootNodeCard key={root.id} node={root}
              onClick={() => navigate(`/node-canvas/${root.id}`)}
              onDelete={n => { setDeleteTarget(n); setShowDelete(true); }}
              onRename={n => { setRenameTarget(n); setRenameName(n.name); setShowRename(true); }} />
          ))}

          {/* New root card */}
          <div onClick={() => setShowCreate(true)}
            className="bg-s-2 rounded-xl border-2 border-dashed border-s-6/20 p-4 hover:border-accent-500/40 hover:bg-s-3/30 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[160px]">
            <Plus className="w-6 h-6 text-t-4 mb-2" />
            <span className="text-xs text-t-4">New Root Node</span>
          </div>
        </div>
      )}

      {/* Create root modal */}
      <CreateNodeModal isOpen={showCreate} onClose={() => setShowCreate(false)}
        onCreated={handleCreateRoot} title="New Root Node"
        desc="Root nodes appear at the top level with a 👑 crown." />

      {/* Rename modal */}
      <Modal isOpen={showRename} onClose={() => { setShowRename(false); setRenameTarget(null); }} title="Rename Node">
        <form onSubmit={e => { e.preventDefault(); handleRename(); }} className="space-y-4">
          <div>
            <label className="label">Node Name</label>
            <input className="input" value={renameName} onChange={e => setRenameName(e.target.value)} autoFocus />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => { setShowRename(false); setRenameTarget(null); }}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!renameName.trim()}>Save</button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog isOpen={showDelete} onClose={() => { setShowDelete(false); setDeleteTarget(null); }}
        onConfirm={handleDelete} title="Delete Node"
        message={`Delete "${deleteTarget?.name}" and all its children, todos & notes? This cannot be undone.`} />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Create node modal (shared)
   ═══════════════════════════════════════════════ */
function CreateNodeModal({ isOpen, onClose, onCreated, title, desc }) {
  const [name, setName] = useState('');
  useEffect(() => { if (isOpen) setName(''); }, [isOpen]);
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={e => { e.preventDefault(); if (name.trim()) onCreated(name.trim()); }} className="space-y-4">
        <div>
          <label className="label">Node Name</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Build Script System" autoFocus />
          {desc && <p className="text-2xs text-t-4 mt-1.5">{desc}</p>}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={!name.trim()}>Create</button>
        </div>
      </form>
    </Modal>
  );
}
