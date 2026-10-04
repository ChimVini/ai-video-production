import React, { useState, useEffect, useRef } from 'react';
import {
  X, Minus, Plus, Check, ChevronRight, ChevronDown,
  Trash2, ListTodo, StickyNote, AtSign, Network
} from 'lucide-react';

const api = window.api;

/* ═══════════════════════════════════════════════
   Floating Todo / Note window
   — Facebook Messenger-style chat window
   ═══════════════════════════════════════════════ */

// ── Render @mentions in text ───────────────────
function renderMentions(text) {
  const parts = text.split(/(@\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const match = part.match(/^@\[([^\]]+)\]\(([^)]+)\)$/);
    if (match) {
      return (
        <span key={i} className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-accent-600/15 text-accent-400 text-[10px] font-medium mx-0.5">
          <AtSign className="w-2 h-2" />{match[1]}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ── Mini Todo Item (recursive) ─────────────────
function MiniTodoItem({ todo, allTodos, depth, onToggle, onUpdate, onDelete, onAddSub }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.content);
  const [showChildren, setShowChildren] = useState(true);
  const [showAddSub, setShowAddSub] = useState(false);
  const [subText, setSubText] = useState('');
  const inputRef = useRef(null);

  const children = allTodos.filter(t => t.parent_todo_id === todo.id);

  useEffect(() => { if (isEditing && inputRef.current) inputRef.current.focus(); }, [isEditing]);

  function handleSave() {
    if (editText.trim() && editText.trim() !== todo.content) onUpdate(todo.id, { content: editText.trim() });
    setIsEditing(false);
  }

  return (
    <div className={depth > 0 ? 'ml-4 border-l border-s-6/20 pl-2' : ''}>
      <div className="group flex items-start gap-1.5 py-1 px-1 -mx-1 rounded hover:bg-s-4/30 transition-colors">
        <button onClick={() => onToggle(todo.id, !todo.completed)}
          className={`mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${
            todo.completed ? 'bg-accent-600 border-accent-600' : 'border-s-6 hover:border-accent-500/50'
          }`}>
          {todo.completed && <Check className="w-2 h-2 text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input ref={inputRef} className="w-full bg-s-4 border border-s-6/30 rounded px-1.5 py-0.5 text-[11px] text-t-1 outline-none focus:border-accent-500/50"
              value={editText} onChange={e => setEditText(e.target.value)}
              onBlur={handleSave} onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setIsEditing(false); }} />
          ) : (
            <div className={`text-[11px] leading-snug cursor-text ${todo.completed ? 'line-through text-t-4' : 'text-t-2'}`}
              onClick={() => setIsEditing(true)}>
              {renderMentions(todo.content)}
            </div>
          )}
          {children.length > 0 && (
            <button onClick={() => setShowChildren(!showChildren)}
              className="flex items-center gap-0.5 mt-0.5 text-[9px] text-t-4 hover:text-t-3">
              {showChildren ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
              {children.length} sub
            </button>
          )}
        </div>

        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0">
          <button onClick={() => setShowAddSub(true)} className="p-0.5 rounded hover:bg-s-5 text-t-4 hover:text-t-2">
            <Plus className="w-2.5 h-2.5" />
          </button>
          <button onClick={() => onDelete(todo.id)} className="p-0.5 rounded hover:bg-s-5 text-t-4 hover:text-red-400">
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      {showAddSub && (
        <form onSubmit={e => { e.preventDefault(); if (subText.trim()) { onAddSub(todo.id, subText.trim()); setSubText(''); setShowAddSub(false); } }}
          className="ml-4 pl-2 border-l border-s-6/20 mt-0.5 mb-1">
          <div className="flex items-center gap-1">
            <input className="flex-1 bg-s-4 border border-s-6/30 rounded px-1.5 py-0.5 text-[11px] text-t-1 outline-none focus:border-accent-500/50"
              value={subText} onChange={e => setSubText(e.target.value)} placeholder="Subtask..." autoFocus
              onKeyDown={e => { if (e.key === 'Escape') { setShowAddSub(false); setSubText(''); } }} />
            <button type="button" onClick={() => { setShowAddSub(false); setSubText(''); }} className="p-0.5 text-t-4 hover:text-t-2">
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        </form>
      )}

      {showChildren && children.map(c => (
        <MiniTodoItem key={c.id} todo={c} allTodos={allTodos} depth={depth + 1}
          onToggle={onToggle} onUpdate={onUpdate} onDelete={onDelete} onAddSub={onAddSub} />
      ))}
    </div>
  );
}

// ── Mini Note Item ────────────────────────────
function MiniNoteItem({ note, onUpdate, onDelete }) {
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
    if (editText.trim() !== note.content) onUpdate(note.id, { content: editText.trim() });
    setIsEditing(false);
  }

  return (
    <div className="group relative rounded-lg bg-s-4/30 border border-s-6/20 p-2 hover:border-s-6/40 transition-all">
      {isEditing ? (
        <textarea ref={textareaRef}
          className="w-full bg-transparent text-[11px] text-t-1 resize-none outline-none min-h-[28px]"
          value={editText}
          onChange={e => { setEditText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
          onBlur={handleSave}
          onKeyDown={e => { if (e.key === 'Escape') { setEditText(note.content); setIsEditing(false); } }} />
      ) : (
        <div className="text-[11px] text-t-2 leading-snug cursor-text whitespace-pre-wrap"
          onClick={() => setIsEditing(true)}>
          {renderMentions(note.content)}
        </div>
      )}
      <button onClick={() => onDelete(note.id)}
        className="absolute top-1.5 right-1.5 p-0.5 rounded text-t-4 hover:text-red-400 hover:bg-s-5 opacity-0 group-hover:opacity-100 transition-all">
        <Trash2 className="w-2.5 h-2.5" />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Main floating window component
   ═══════════════════════════════════════════════ */
export default function FloatingTodoNote({ nodeId, minimized, onMinimize, onClose, onDataChange }) {
  const [tab, setTab] = useState('todo');
  const [node, setNode] = useState(null);
  const [todos, setTodos] = useState([]);
  const [notes, setNotes] = useState([]);
  const [newText, setNewText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { loadNode(); }, [nodeId]);

  async function loadNode() {
    const [n, t, nt] = await Promise.all([
      api.getWorkspaceNode(nodeId),
      api.getNodeTodos(nodeId),
      api.getNodeNotes(nodeId),
    ]);
    setNode(n);
    setTodos(t);
    setNotes(nt);
  }

  // ── Todo CRUD ─────────────────────────────────
  async function addTodo(e) {
    e.preventDefault();
    if (!newText.trim()) return;
    await api.createNodeTodo({ node_id: nodeId, content: newText.trim(), sort_order: todos.length });
    setNewText('');
    loadNode();
    onDataChange?.();
  }

  async function toggleTodo(id, completed) {
    await api.updateNodeTodo(id, { completed: completed ? 1 : 0 });
    loadNode();
    onDataChange?.();
  }

  async function updateTodo(id, data) {
    await api.updateNodeTodo(id, data);
    loadNode();
  }

  async function deleteTodo(id) {
    await api.deleteNodeTodo(id);
    loadNode();
    onDataChange?.();
  }

  async function addSubTodo(parentId, content) {
    await api.createNodeTodo({ node_id: nodeId, parent_todo_id: parentId, content, sort_order: 0 });
    loadNode();
    onDataChange?.();
  }

  // ── Note CRUD ─────────────────────────────────
  async function addNote(e) {
    e.preventDefault();
    if (!newText.trim()) return;
    await api.createNodeNote({ node_id: nodeId, content: newText.trim(), sort_order: notes.length });
    setNewText('');
    loadNode();
    onDataChange?.();
  }

  async function updateNote(id, data) {
    await api.updateNodeNote(id, data);
    loadNode();
  }

  async function deleteNote(id) {
    await api.deleteNodeNote(id);
    loadNode();
    onDataChange?.();
  }

  const rootTodos = todos.filter(t => !t.parent_todo_id);

  if (!node) return null;

  // ── Minimized state ───────────────────────────
  if (minimized) {
    return (
      <div onClick={onMinimize}
        className="w-56 bg-s-3 border border-s-6/40 rounded-t-xl shadow-elevated cursor-pointer hover:bg-s-4/50 transition-colors">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Network className="w-3 h-3 text-accent-400 shrink-0" />
            <span className="text-[11px] font-semibold text-t-1 truncate">{node.name}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={e => { e.stopPropagation(); onClose(); }}
              className="p-0.5 rounded hover:bg-s-5 text-t-4 hover:text-t-2">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Full window ───────────────────────────────
  return (
    <div className="w-72 bg-s-2 border border-s-6/40 rounded-t-xl shadow-elevated flex flex-col"
      style={{ maxHeight: '420px' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-s-6/30 shrink-0 bg-s-3 rounded-t-xl">
        <div className="flex items-center gap-1.5 min-w-0">
          <Network className="w-3 h-3 text-accent-400 shrink-0" />
          <span className="text-[11px] font-semibold text-t-1 truncate">{node.name}</span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={onMinimize} className="p-1 rounded hover:bg-s-5 text-t-4 hover:text-t-2" title="Minimize">
            <Minus className="w-3 h-3" />
          </button>
          <button onClick={onClose} className="p-1 rounded hover:bg-s-5 text-t-4 hover:text-t-2" title="Close">
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-s-6/30 shrink-0">
        <button onClick={() => setTab('todo')}
          className={`flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors ${
            tab === 'todo' ? 'text-accent-400 border-b-2 border-accent-500' : 'text-t-4 hover:text-t-3'
          }`}>
          <ListTodo className="w-3 h-3" /> Todos
          {rootTodos.length > 0 && (
            <span className="text-[9px] bg-s-4 px-1 rounded-full">{rootTodos.length}</span>
          )}
        </button>
        <button onClick={() => setTab('note')}
          className={`flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors ${
            tab === 'note' ? 'text-accent-400 border-b-2 border-accent-500' : 'text-t-4 hover:text-t-3'
          }`}>
          <StickyNote className="w-3 h-3" /> Notes
          {notes.length > 0 && (
            <span className="text-[9px] bg-s-4 px-1 rounded-full">{notes.length}</span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-2 min-h-[120px]" style={{ maxHeight: '280px' }}>
        {tab === 'todo' ? (
          rootTodos.length === 0 ? (
            <div className="text-[10px] text-t-4 text-center py-6">No todos yet</div>
          ) : (
            <div className="space-y-0.5">
              {rootTodos.map(todo => (
                <MiniTodoItem key={todo.id} todo={todo} allTodos={todos} depth={0}
                  onToggle={toggleTodo} onUpdate={updateTodo} onDelete={deleteTodo} onAddSub={addSubTodo} />
              ))}
            </div>
          )
        ) : (
          notes.length === 0 ? (
            <div className="text-[10px] text-t-4 text-center py-6">No notes yet</div>
          ) : (
            <div className="space-y-1.5">
              {notes.map(note => (
                <MiniNoteItem key={note.id} note={note} onUpdate={updateNote} onDelete={deleteNote} />
              ))}
            </div>
          )
        )}
      </div>

      {/* Input */}
      <form onSubmit={tab === 'todo' ? addTodo : addNote}
        className="px-3 py-2 border-t border-s-6/30 shrink-0">
        <div className="flex items-center gap-1.5">
          <input ref={inputRef}
            className="flex-1 bg-s-4 border border-s-6/30 rounded-lg px-2 py-1.5 text-[11px] text-t-1 placeholder:text-t-4 outline-none focus:border-accent-500/50 transition-colors"
            value={newText} onChange={e => setNewText(e.target.value)}
            placeholder={tab === 'todo' ? 'Add a todo...' : 'Add a note...'} />
          <button type="submit" disabled={!newText.trim()}
            className="p-1.5 rounded-lg bg-accent-600 hover:bg-accent-500 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors">
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </form>
    </div>
  );
}
