import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Check, ChevronRight, ChevronDown,
  Trash2, Network, StickyNote, ListTodo, MoreHorizontal,
  AtSign, X
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Breadcrumb from './Breadcrumb';

const api = window.api;

// ── Todo Item (recursive) ───────────────────────
function TodoItem({ todo, allTodos, depth, onToggle, onUpdate, onDelete, onAddSub, onMention }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.content);
  const [showSub, setShowSub] = useState(true);
  const [showAddSub, setShowAddSub] = useState(false);
  const [subText, setSubText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const inputRef = useRef(null);
  const subInputRef = useRef(null);

  const children = allTodos.filter(t => t.parent_todo_id === todo.id);
  const completedChildren = children.filter(t => t.completed);
  const hasChildren = children.length > 0;

  useEffect(() => {
    if (isEditing && inputRef.current) inputRef.current.focus();
  }, [isEditing]);
  useEffect(() => {
    if (showAddSub && subInputRef.current) subInputRef.current.focus();
  }, [showAddSub]);

  function handleSaveEdit() {
    if (editText.trim() && editText.trim() !== todo.content) {
      onUpdate(todo.id, { content: editText.trim() });
    }
    setIsEditing(false);
  }

  function handleAddSubTodo(e) {
    e.preventDefault();
    if (!subText.trim()) return;
    onAddSub(todo.id, subText.trim());
    setSubText('');
    setShowAddSub(false);
  }

  // Render @ mentions in content
  function renderContent(text) {
    const parts = text.split(/(@\[[^\]]+\]\([^)]+\))/g);
    return parts.map((part, i) => {
      const match = part.match(/^@\[([^\]]+)\]\(([^)]+)\)$/);
      if (match) {
        return (
          <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-accent-600/15 text-accent-400 text-[11px] font-medium cursor-pointer hover:bg-accent-600/25 transition-colors mx-0.5">
            <AtSign className="w-2.5 h-2.5" />{match[1]}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  }

  return (
    <div className={`${depth > 0 ? 'ml-5 border-l border-s-6/20 pl-3' : ''}`}>
      <div className="group flex items-start gap-2 py-1.5 rounded-lg hover:bg-s-4/30 px-1.5 -mx-1.5 transition-colors">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(todo.id, !todo.completed)}
          className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all duration-200 ${
            todo.completed
              ? 'bg-accent-600 border-accent-600'
              : 'border-s-6 hover:border-accent-500/50'
          }`}
        >
          {todo.completed && <Check className="w-2.5 h-2.5 text-white" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              ref={inputRef}
              className="input text-xs py-1 px-2"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setIsEditing(false); }}
            />
          ) : (
            <div
              className={`text-xs leading-relaxed cursor-text ${todo.completed ? 'line-through text-t-4' : 'text-t-2'}`}
              onClick={() => setIsEditing(true)}
            >
              {renderContent(todo.content)}
            </div>
          )}

          {/* Subtask summary */}
          {hasChildren && (
            <button
              onClick={() => setShowSub(!showSub)}
              className="flex items-center gap-1 mt-1 text-[10px] text-t-4 hover:text-t-3 transition-colors"
            >
              {showSub ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {children.length} subtask{children.length > 1 ? 's' : ''}
              {completedChildren.length > 0 && ` · ${completedChildren.length}/${children.length} done`}
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
          <button onClick={() => setShowAddSub(true)} className="p-1 rounded-md hover:bg-s-5 text-t-4 hover:text-t-2" title="Add subtask">
            <Plus className="w-3 h-3" />
          </button>
          <button onClick={() => onDelete(todo.id)} className="p-1 rounded-md hover:bg-s-5 text-t-4 hover:text-red-400" title="Delete">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Add subtask inline */}
      {showAddSub && (
        <form onSubmit={handleAddSubTodo} className="ml-5 pl-3 border-l border-s-6/20 mt-1 mb-2">
          <div className="flex items-center gap-2">
            <input
              ref={subInputRef}
              className="input text-xs py-1.5 px-2 flex-1"
              value={subText}
              onChange={(e) => setSubText(e.target.value)}
              placeholder="Subtask..."
              onKeyDown={(e) => { if (e.key === 'Escape') { setShowAddSub(false); setSubText(''); } }}
            />
            <button type="button" className="p-1 text-t-4 hover:text-t-2" onClick={() => { setShowAddSub(false); setSubText(''); }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      )}

      {/* Recursive children */}
      {showSub && children.map(child => (
        <TodoItem
          key={child.id}
          todo={child}
          allTodos={allTodos}
          depth={depth + 1}
          onToggle={onToggle}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onAddSub={onAddSub}
          onMention={onMention}
        />
      ))}
    </div>
  );
}

// ── Note Item ───────────────────────────────────
function NoteItem({ note, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(note.content);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [isEditing]);

  function handleSave() {
    if (editText.trim() !== note.content) {
      onUpdate(note.id, { content: editText.trim() });
    }
    setIsEditing(false);
  }

  // Render @ mentions
  function renderContent(text) {
    const parts = text.split(/(@\[[^\]]+\]\([^)]+\))/g);
    return parts.map((part, i) => {
      const match = part.match(/^@\[([^\]]+)\]\(([^)]+)\)$/);
      if (match) {
        return (
          <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-accent-600/15 text-accent-400 text-[11px] font-medium cursor-pointer hover:bg-accent-600/25 transition-colors mx-0.5">
            <AtSign className="w-2.5 h-2.5" />{match[1]}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  }

  return (
    <div className="group relative rounded-xl bg-s-4/30 border border-s-6/20 p-3 hover:border-s-6/40 transition-all">
      {isEditing ? (
        <textarea
          ref={textareaRef}
          className="textarea text-xs min-h-[40px] resize-none bg-transparent border-none p-0 focus:ring-0"
          value={editText}
          onChange={(e) => {
            setEditText(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          onBlur={handleSave}
          onKeyDown={(e) => { if (e.key === 'Escape') { setEditText(note.content); setIsEditing(false); } }}
        />
      ) : (
        <div
          className="text-xs text-t-2 leading-relaxed cursor-text whitespace-pre-wrap"
          onClick={() => setIsEditing(true)}
        >
          {renderContent(note.content)}
        </div>
      )}
      <button
        onClick={() => onDelete(note.id)}
        className="absolute top-2 right-2 p-1 rounded-md text-t-4 hover:text-red-400 hover:bg-s-5 opacity-0 group-hover:opacity-100 transition-all"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

// ── @ Mention Dropdown ──────────────────────────
function MentionDropdown({ query, siblings, onSelect, onClose, position }) {
  const filtered = siblings.filter(s =>
    s.name.toLowerCase().includes(query.toLowerCase())
  );

  if (filtered.length === 0) return null;

  return (
    <div
      className="absolute z-50 bg-s-3 border border-s-6/50 rounded-xl shadow-elevated py-1 min-w-[180px] max-h-[200px] overflow-y-auto animate-slide-up"
      style={{ bottom: position === 'above' ? '100%' : undefined, top: position === 'below' ? '100%' : undefined }}
    >
      {filtered.map(node => (
        <button
          key={node.id}
          className="w-full text-left px-3 py-2 text-xs text-t-2 hover:bg-s-4/60 hover:text-t-1 flex items-center gap-2 transition-colors"
          onMouseDown={(e) => { e.preventDefault(); onSelect(node); }}
        >
          <Network className="w-3 h-3 text-accent-400" />
          {node.name}
        </button>
      ))}
    </div>
  );
}

// ── Text input with @ mention support ───────────
function MentionInput({ value, onChange, onMention, siblings, placeholder, inputClass, multiline }) {
  const [showMention, setShowMention] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const inputRef = useRef(null);

  function handleChange(e) {
    const text = e.target.value;
    const pos = e.target.selectionStart;
    onChange(text);
    setCursorPos(pos);

    // Detect @ trigger
    const before = text.substring(0, pos);
    const atMatch = before.match(/@([^@\s]*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setShowMention(true);
    } else {
      setShowMention(false);
    }
  }

  function handleMentionSelect(node) {
    const text = value;
    const before = text.substring(0, cursorPos);
    const atMatch = before.match(/@([^@\s]*)$/);
    if (atMatch) {
      const insertStart = cursorPos - atMatch[0].length;
      const mention = `@[${node.name}](${node.id})`;
      const newText = text.substring(0, insertStart) + mention + ' ' + text.substring(cursorPos);
      onChange(newText);
      onMention(node);
    }
    setShowMention(false);
  }

  const InputTag = multiline ? 'textarea' : 'input';

  return (
    <div className="relative">
      <InputTag
        ref={inputRef}
        className={inputClass || 'input text-xs'}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        onBlur={() => setTimeout(() => setShowMention(false), 200)}
        rows={multiline ? 3 : undefined}
        style={multiline ? { resize: 'none', minHeight: '60px' } : undefined}
      />
      {showMention && (
        <MentionDropdown
          query={mentionQuery}
          siblings={siblings}
          onSelect={handleMentionSelect}
          onClose={() => setShowMention(false)}
          position="below"
        />
      )}
    </div>
  );
}

// ── Main Workspace Page ─────────────────────────
export default function NodeWorkspacePage() {
  const { nodeId } = useParams();
  const navigate = useNavigate();

  const [node, setNode] = useState(null);
  const [todos, setTodos] = useState([]);
  const [notes, setNotes] = useState([]);
  const [siblings, setSiblings] = useState([]);
  const [connections, setConnections] = useState([]);
  const [ancestors, setAncestors] = useState([]);     // for breadcrumb

  // New todo / note inputs
  const [newTodoText, setNewTodoText] = useState('');
  const [newNoteText, setNewNoteText] = useState('');
  const [showCreateChild, setShowCreateChild] = useState(false);
  const [childName, setChildName] = useState('');

  const todoInputRef = useRef(null);

  useEffect(() => { loadAll(); }, [nodeId]);

  async function loadAll() {
    const [n, t, nt, conns] = await Promise.all([
      api.getWorkspaceNode(nodeId),
      api.getNodeTodos(nodeId),
      api.getNodeNotes(nodeId),
      api.getNodeConnections(nodeId),
    ]);
    setNode(n);
    setTodos(t);
    setNotes(nt);
    setConnections(conns);

    // Load siblings for @ mention (same parent context)
    if (n) {
      const sibs = await api.getWorkspaceSiblings(n.parent_id || null);
      setSiblings(sibs.filter(s => s.id !== nodeId));

      // Build ancestor chain for breadcrumb
      const chain = [];
      let current = n;
      while (current.parent_id) {
        const parent = await api.getWorkspaceNode(current.parent_id);
        if (!parent) break;
        chain.unshift(parent);
        current = parent;
      }
      setAncestors(chain);
    }
  }

  // ── Todo handlers ───────────────
  async function handleAddTodo(e) {
    e.preventDefault();
    if (!newTodoText.trim()) return;
    await api.createNodeTodo({
      node_id: nodeId,
      content: newTodoText.trim(),
      sort_order: todos.filter(t => !t.parent_todo_id).length,
    });
    setNewTodoText('');
    loadAll();
  }

  async function handleToggleTodo(todoId, completed) {
    await api.updateNodeTodo(todoId, { completed: completed ? 1 : 0 });
    loadAll();
  }

  async function handleUpdateTodo(todoId, data) {
    await api.updateNodeTodo(todoId, data);
    loadAll();
  }

  async function handleDeleteTodo(todoId) {
    await api.deleteNodeTodo(todoId);
    loadAll();
  }

  async function handleAddSubTodo(parentTodoId, content) {
    const parentTodo = todos.find(t => t.id === parentTodoId);
    const siblings = todos.filter(t => t.parent_todo_id === parentTodoId);
    await api.createNodeTodo({
      node_id: nodeId,
      parent_todo_id: parentTodoId,
      content,
      sort_order: siblings.length,
    });
    loadAll();
  }

  // ── Note handlers ───────────────
  async function handleAddNote(e) {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    // Split by double newline into separate notes
    const noteParts = newNoteText.trim().split(/\n\s*\n/).filter(p => p.trim());
    for (let i = 0; i < noteParts.length; i++) {
      await api.createNodeNote({
        node_id: nodeId,
        content: noteParts[i].trim(),
        sort_order: notes.length + i,
      });
    }
    setNewNoteText('');
    loadAll();
  }

  async function handleUpdateNote(noteId, data) {
    await api.updateNodeNote(noteId, data);
    loadAll();
  }

  async function handleDeleteNote(noteId) {
    await api.deleteNodeNote(noteId);
    loadAll();
  }

  // ── Mention handler (creates connection) ──────
  async function handleMention(targetNode) {
    await api.createNodeConnection({
      source_node_id: nodeId,
      target_node_id: targetNode.id,
    });
    loadAll();
  }

  // ── Create child node ─────────────────────────
  async function handleCreateChild(e) {
    e.preventDefault();
    if (!childName.trim()) return;
    const child = await api.createWorkspaceNode({
      name: childName.trim(),
      parent_id: nodeId,
    });
    setChildName('');
    setShowCreateChild(false);
    loadAll();
  }

  if (!node) {
    return <div className="flex items-center justify-center h-64 text-t-4">Loading...</div>;
  }

  const rootTodos = todos.filter(t => !t.parent_todo_id);
  const completedRootTodos = rootTodos.filter(t => t.completed);
  const connectedNodes = connections.map(c => {
    const otherId = c.source_node_id === nodeId ? c.target_node_id : c.source_node_id;
    const direction = c.source_node_id === nodeId ? 'outgoing' : 'incoming';
    return { ...c, otherId, direction };
  });

  return (
    <div className="w-full -mt-6 -mx-6 flex flex-col h-[calc(100vh)]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-s-6/30 bg-s-2 shrink-0">
        <div className="flex items-center gap-3">
          <button
            className="btn-ghost flex items-center gap-1 text-xs"
            onClick={() => navigate(node.parent_id ? `/node-canvas/${node.parent_id}` : '/node-canvas')}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="h-4 w-px bg-s-6/50" />
          <Breadcrumb items={[
            { label: 'Node Workspace', path: '/node-canvas', icon: <Network className="w-3 h-3" /> },
            ...ancestors.map((a, i) => ({
              label: a.name,
              path: i === 0 ? `/node-canvas/${a.id}` : `/node-workspace/${a.id}`,
              icon: i === 0 ? <span className="text-[10px]">👑</span> : undefined,
            })),
            { label: node.name },
          ]} />
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-ghost text-xs flex items-center gap-1"
            onClick={() => setShowCreateChild(true)}
          >
            <Plus className="w-3.5 h-3.5" /> Child Node
          </button>
        </div>
      </div>

      {/* Split workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: TODO panel */}
        <div className="w-1/2 border-r border-s-6/30 flex flex-col bg-s-1">
          <div className="px-4 py-3 border-b border-s-6/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-accent-400" />
              <span className="text-xs font-semibold text-t-2 uppercase tracking-wider">Todo</span>
            </div>
            {rootTodos.length > 0 && (
              <span className="text-[10px] text-t-4">
                {completedRootTodos.length}/{rootTodos.length} done
              </span>
            )}
          </div>

          {/* Todo list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5">
            {rootTodos.length === 0 && (
              <p className="text-xs text-t-4 text-center py-8">No todos yet</p>
            )}
            {rootTodos.map(todo => (
              <TodoItem
                key={todo.id}
                todo={todo}
                allTodos={todos}
                depth={0}
                onToggle={handleToggleTodo}
                onUpdate={handleUpdateTodo}
                onDelete={handleDeleteTodo}
                onAddSub={handleAddSubTodo}
                onMention={handleMention}
              />
            ))}
          </div>

          {/* Add todo input */}
          <form onSubmit={handleAddTodo} className="px-4 py-3 border-t border-s-6/20 shrink-0">
            <MentionInput
              value={newTodoText}
              onChange={setNewTodoText}
              onMention={handleMention}
              siblings={siblings}
              placeholder="Add a todo... (use @ to link nodes)"
              inputClass="input text-xs py-2"
            />
          </form>
        </div>

        {/* RIGHT: NOTE panel */}
        <div className="w-1/2 flex flex-col bg-s-1">
          <div className="px-4 py-3 border-b border-s-6/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-t-2 uppercase tracking-wider">Notes</span>
            </div>
            {notes.length > 0 && (
              <span className="text-[10px] text-t-4">{notes.length} note{notes.length > 1 ? 's' : ''}</span>
            )}
          </div>

          {/* Notes list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {notes.length === 0 && (
              <p className="text-xs text-t-4 text-center py-8">No notes yet</p>
            )}
            {notes.map(note => (
              <NoteItem
                key={note.id}
                note={note}
                onUpdate={handleUpdateNote}
                onDelete={handleDeleteNote}
              />
            ))}
          </div>

          {/* Add note input */}
          <form onSubmit={handleAddNote} className="px-4 py-3 border-t border-s-6/20 shrink-0">
            <MentionInput
              value={newNoteText}
              onChange={setNewNoteText}
              onMention={handleMention}
              siblings={siblings}
              placeholder="Write a note... (separate with blank lines for multiple notes, use @ to link)"
              inputClass="textarea text-xs py-2 min-h-[60px] resize-none"
              multiline
            />
            <div className="flex justify-end mt-2">
              <button type="submit" className="btn-primary text-xs" disabled={!newNoteText.trim()}>
                Add Note
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Connections bar */}
      {connectedNodes.length > 0 && (
        <div className="px-5 py-2.5 border-t border-s-6/30 bg-s-2 flex items-center gap-2 shrink-0 overflow-x-auto">
          <Network className="w-3.5 h-3.5 text-t-4 shrink-0" />
          <span className="text-[10px] text-t-4 shrink-0">Connections:</span>
          {connectedNodes.map(conn => (
            <ConnectionChip key={conn.id} conn={conn} nodeId={nodeId} onDelete={() => handleDeleteConnection(conn.id)} />
          ))}
        </div>
      )}

      {/* Create child node modal */}
      <Modal isOpen={showCreateChild} onClose={() => setShowCreateChild(false)} title="New Child Node">
        <form onSubmit={handleCreateChild} className="space-y-4">
          <div>
            <label className="label">Node Name</label>
            <input
              className="input"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              placeholder="e.g. Data Source Architecture"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowCreateChild(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!childName.trim()}>Create</button>
          </div>
        </form>
      </Modal>
    </div>
  );

  async function handleDeleteConnection(connId) {
    await api.deleteNodeConnection(connId);
    loadAll();
  }
}

// ── Connection chip ─────────────────────────────
function ConnectionChip({ conn, nodeId, onDelete }) {
  const navigate = useNavigate();
  const [otherName, setOtherName] = useState('...');

  useEffect(() => {
    api.getWorkspaceNode(conn.otherId).then(n => {
      if (n) setOtherName(n.name);
    });
  }, [conn.otherId]);

  return (
    <div className="group inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-accent-600/10 border border-accent-600/20 text-[11px] shrink-0">
      <span className="text-t-4">{conn.direction === 'outgoing' ? '→' : '←'}</span>
      <button
        className="text-accent-400 hover:text-accent-300 font-medium transition-colors"
        onClick={() => navigate(`/node-workspace/${conn.otherId}`)}
      >
        {otherName}
      </button>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-t-4 hover:text-red-400 transition-all"
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </div>
  );
}
