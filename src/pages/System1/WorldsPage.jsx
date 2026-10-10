import React, { useState, useEffect } from 'react';
import { Plus, Globe, Trash2, Edit3 } from 'lucide-react';
import PageHeader from '../../components/Layout/PageHeader';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';

const api = window.api;

export default function WorldsPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [worlds, setWorlds] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => { loadProjects(); }, []);
  useEffect(() => { if (selectedProject) loadWorlds(); }, [selectedProject]);

  async function loadProjects() {
    const data = await api.getProjects();
    setProjects(data);
    if (data.length > 0) setSelectedProject(data[0].id);
  }
  async function loadWorlds() {
    setWorlds(await api.getWorlds(selectedProject));
  }
  async function handleDelete() {
    await api.deleteWorld(deleting.id);
    setDeleting(null);
    loadWorlds();
  }

  return (
    <div className="w-full">
      <PageHeader
        title="World Development"
        subtitle="Rules, Locations, Settings"
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)} disabled={!selectedProject}>
            <Plus className="w-4 h-4" /> New World
          </button>
        }
      />

      <div className="mb-5">
        <select className="select" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {worlds.length === 0 ? (
        <EmptyState icon={Globe} title="No worlds yet" description="Build the world for your story." />
      ) : (
        <div className="space-y-3">
          {worlds.map((world) => (
            <div key={world.id} className="card">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-t-1">{world.name}</h3>
                <div className="flex items-center gap-2">
                  <StatusBadge status={world.status} />
                  <button className="btn-icon" onClick={() => setEditing(world)}><Edit3 className="w-3.5 h-3.5" /></button>
                  <button className="btn-icon text-red-400" onClick={() => setDeleting(world)}><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="text-xs space-y-1">
                {world.description && <p className="text-t-2">{world.description}</p>}
                {world.time_period && <p><span className="text-t-4">Time Period: </span><span className="text-t-2">{world.time_period}</span></p>}
                {world.atmosphere && <p><span className="text-t-4">Atmosphere: </span><span className="text-t-2">{world.atmosphere}</span></p>}
                {world.rules && <p><span className="text-t-4">Rules: </span><span className="text-t-2">{world.rules}</span></p>}
                {world.key_elements && <p><span className="text-t-4">Key Elements: </span><span className="text-t-2">{world.key_elements}</span></p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <WorldModal
        isOpen={showCreate || !!editing}
        onClose={() => { setShowCreate(false); setEditing(null); }}
        projectId={selectedProject}
        world={editing}
        onSaved={() => { setShowCreate(false); setEditing(null); loadWorlds(); }}
      />
      <ConfirmDialog isOpen={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} title="Delete World" message={`Delete "${deleting?.name}"?`} />
    </div>
  );
}

function WorldModal({ isOpen, onClose, projectId, world, onSaved }) {
  const [form, setForm] = useState({
    name: '', description: '', rules: '', time_period: '', atmosphere: '', key_elements: '', notes: '', status: 'draft',
  });

  useEffect(() => {
    if (world) {
      setForm({
        name: world.name, description: world.description || '', rules: world.rules || '',
        time_period: world.time_period || '', atmosphere: world.atmosphere || '',
        key_elements: world.key_elements || '', notes: world.notes || '', status: world.status,
      });
    } else {
      setForm({ name: '', description: '', rules: '', time_period: '', atmosphere: '', key_elements: '', notes: '', status: 'draft' });
    }
  }, [world, isOpen]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (world) await api.updateWorld(world.id, form);
    else await api.createWorld({ ...form, project_id: projectId });
    onSaved();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={world ? 'Edit World' : 'New World'} wide>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="select w-full" value={form.status} onChange={(e) => set('status', e.target.value)}>
              {['draft', 'in_progress', 'review', 'approved'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="textarea" value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Time Period</label>
            <input className="input" value={form.time_period} onChange={(e) => set('time_period', e.target.value)} />
          </div>
          <div>
            <label className="label">Atmosphere</label>
            <input className="input" value={form.atmosphere} onChange={(e) => set('atmosphere', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">World Rules</label>
          <textarea className="textarea" value={form.rules} onChange={(e) => set('rules', e.target.value)} rows={3} />
        </div>
        <div>
          <label className="label">Key Elements</label>
          <textarea className="textarea" value={form.key_elements} onChange={(e) => set('key_elements', e.target.value)} rows={2} />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="textarea" value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary">{world ? 'Save' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  );
}
