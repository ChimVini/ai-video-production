import React, { useState, useEffect } from 'react';
import { Plus, Users, Trash2, Edit3 } from 'lucide-react';
import PageHeader from '../../components/Layout/PageHeader';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';

const api = window.api;
const ROLES = ['', 'protagonist', 'antagonist', 'supporting', 'minor', 'extra'];

export default function CharactersPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [characters, setCharacters] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => { loadProjects(); }, []);
  useEffect(() => { if (selectedProject) loadCharacters(); }, [selectedProject]);

  async function loadProjects() {
    const data = await api.getProjects();
    setProjects(data);
    if (data.length > 0) setSelectedProject(data[0].id);
  }
  async function loadCharacters() {
    setCharacters(await api.getCharacters(selectedProject));
  }
  async function handleDelete() {
    await api.deleteCharacter(deleting.id);
    setDeleting(null);
    loadCharacters();
  }

  const roleColor = { protagonist: 'badge-green', antagonist: 'badge-red', supporting: 'badge-blue', minor: 'badge-gray', extra: 'badge-gray' };

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Character Development"
        subtitle="System 1 — Personality, Background, Relationships"
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)} disabled={!selectedProject}>
            <Plus className="w-4 h-4" /> New Character
          </button>
        }
      />

      <div className="mb-5">
        <select className="select" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {characters.length === 0 ? (
        <EmptyState icon={Users} title="No characters yet" description="Create characters for this project." />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {characters.map((ch) => (
            <div key={ch.id} className="card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-accent-600/20 flex items-center justify-center text-accent-400 text-xs font-bold">
                    {ch.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-t-1">{ch.name}</h3>
                    {ch.role && <span className={`badge ${roleColor[ch.role] || 'badge-gray'} text-[10px]`}>{ch.role}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <StatusBadge status={ch.status} />
                  <button className="btn-icon" onClick={() => setEditing(ch)}><Edit3 className="w-3.5 h-3.5" /></button>
                  <button className="btn-icon text-red-400" onClick={() => setDeleting(ch)}><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="text-xs space-y-1">
                {ch.personality && <p><span className="text-t-4">Personality: </span><span className="text-t-2">{ch.personality}</span></p>}
                {ch.background && <p><span className="text-t-4">Background: </span><span className="text-t-2">{ch.background}</span></p>}
                {ch.motivation && <p><span className="text-t-4">Motivation: </span><span className="text-t-2">{ch.motivation}</span></p>}
                {ch.arc && <p><span className="text-t-4">Arc: </span><span className="text-t-2">{ch.arc}</span></p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <CharacterModal
        isOpen={showCreate || !!editing}
        onClose={() => { setShowCreate(false); setEditing(null); }}
        projectId={selectedProject}
        character={editing}
        onSaved={() => { setShowCreate(false); setEditing(null); loadCharacters(); }}
      />
      <ConfirmDialog isOpen={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} title="Delete Character" message={`Delete "${deleting?.name}"?`} />
    </div>
  );
}

function CharacterModal({ isOpen, onClose, projectId, character, onSaved }) {
  const [form, setForm] = useState({
    name: '', role: '', personality: '', background: '', motivation: '', arc: '',
    physical_description: '', relationships: '[]', notes: '', status: 'draft',
  });

  useEffect(() => {
    if (character) {
      setForm({
        name: character.name, role: character.role || '', personality: character.personality || '',
        background: character.background || '', motivation: character.motivation || '',
        arc: character.arc || '', physical_description: character.physical_description || '',
        relationships: character.relationships || '[]', notes: character.notes || '', status: character.status,
      });
    } else {
      setForm({ name: '', role: '', personality: '', background: '', motivation: '', arc: '', physical_description: '', relationships: '[]', notes: '', status: 'draft' });
    }
  }, [character, isOpen]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (character) await api.updateCharacter(character.id, form);
    else await api.createCharacter({ ...form, project_id: projectId });
    onSaved();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={character ? 'Edit Character' : 'New Character'} wide>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="select w-full" value={form.role} onChange={(e) => set('role', e.target.value)}>
              {ROLES.map(r => <option key={r} value={r}>{r || '— None —'}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="select w-full" value={form.status} onChange={(e) => set('status', e.target.value)}>
              {['draft', 'in_progress', 'review', 'approved'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Personality</label>
          <textarea className="textarea" value={form.personality} onChange={(e) => set('personality', e.target.value)} rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Background</label>
            <textarea className="textarea" value={form.background} onChange={(e) => set('background', e.target.value)} rows={2} />
          </div>
          <div>
            <label className="label">Motivation</label>
            <textarea className="textarea" value={form.motivation} onChange={(e) => set('motivation', e.target.value)} rows={2} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Character Arc</label>
            <textarea className="textarea" value={form.arc} onChange={(e) => set('arc', e.target.value)} rows={2} />
          </div>
          <div>
            <label className="label">Physical Description</label>
            <textarea className="textarea" value={form.physical_description} onChange={(e) => set('physical_description', e.target.value)} rows={2} />
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="textarea" value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary">{character ? 'Save' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  );
}
