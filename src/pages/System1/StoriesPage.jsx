import React, { useState, useEffect } from 'react';
import { Plus, BookOpen, Trash2, Edit3 } from 'lucide-react';
import PageHeader from '../../components/Layout/PageHeader';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';

const api = window.api;

export default function StoriesPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [stories, setStories] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => { loadProjects(); }, []);
  useEffect(() => { if (selectedProject) loadStories(); }, [selectedProject]);

  async function loadProjects() {
    const data = await api.getProjects();
    setProjects(data);
    if (data.length > 0) setSelectedProject(data[0].id);
  }

  async function loadStories() {
    const data = await api.getStories(selectedProject);
    setStories(data);
  }

  async function handleDelete() {
    await api.deleteStory(deleting.id);
    setDeleting(null);
    loadStories();
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Story Development"
        subtitle="System 1 — Plot, Theme, Structure"
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)} disabled={!selectedProject}>
            <Plus className="w-4 h-4" /> New Story
          </button>
        }
      />

      <div className="mb-5">
        <select className="select" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {stories.length === 0 ? (
        <EmptyState icon={BookOpen} title="No stories yet" description="Start developing your story for this project." />
      ) : (
        <div className="space-y-3">
          {stories.map((story) => (
            <div key={story.id} className="card">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-t-1">{story.title}</h3>
                <div className="flex items-center gap-2">
                  <StatusBadge status={story.status} />
                  <button className="btn-icon" onClick={() => setEditing(story)}><Edit3 className="w-3.5 h-3.5" /></button>
                  <button className="btn-icon text-red-400" onClick={() => setDeleting(story)}><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {story.plot && <Field label="Plot" value={story.plot} />}
                {story.theme && <Field label="Theme" value={story.theme} />}
                {story.conflict && <Field label="Conflict" value={story.conflict} />}
                {story.resolution && <Field label="Resolution" value={story.resolution} />}
                {story.structure && <Field label="Structure" value={story.structure} />}
              </div>
              {story.notes && <p className="text-xs text-t-4 mt-2 italic">{story.notes}</p>}
            </div>
          ))}
        </div>
      )}

      <StoryModal
        isOpen={showCreate || !!editing}
        onClose={() => { setShowCreate(false); setEditing(null); }}
        projectId={selectedProject}
        story={editing}
        onSaved={() => { setShowCreate(false); setEditing(null); loadStories(); }}
      />

      <ConfirmDialog isOpen={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} title="Delete Story" message={`Delete "${deleting?.title}"?`} />
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <span className="text-t-4">{label}: </span>
      <span className="text-t-2">{value}</span>
    </div>
  );
}

function StoryModal({ isOpen, onClose, projectId, story, onSaved }) {
  const [form, setForm] = useState({ title: '', plot: '', theme: '', conflict: '', resolution: '', structure: '', notes: '', status: 'draft' });

  useEffect(() => {
    if (story) setForm({ title: story.title, plot: story.plot || '', theme: story.theme || '', conflict: story.conflict || '', resolution: story.resolution || '', structure: story.structure || '', notes: story.notes || '', status: story.status });
    else setForm({ title: '', plot: '', theme: '', conflict: '', resolution: '', structure: '', notes: '', status: 'draft' });
  }, [story, isOpen]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (story) {
      await api.updateStory(story.id, form);
    } else {
      await api.createStory({ ...form, project_id: projectId });
    }
    onSaved();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={story ? 'Edit Story' : 'New Story'} wide>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Title</label>
            <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="select w-full" value={form.status} onChange={(e) => set('status', e.target.value)}>
              {['draft', 'in_progress', 'review', 'approved'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Plot</label>
          <textarea className="textarea" value={form.plot} onChange={(e) => set('plot', e.target.value)} rows={3} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Theme</label>
            <textarea className="textarea" value={form.theme} onChange={(e) => set('theme', e.target.value)} rows={2} />
          </div>
          <div>
            <label className="label">Conflict</label>
            <textarea className="textarea" value={form.conflict} onChange={(e) => set('conflict', e.target.value)} rows={2} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Resolution</label>
            <textarea className="textarea" value={form.resolution} onChange={(e) => set('resolution', e.target.value)} rows={2} />
          </div>
          <div>
            <label className="label">Structure</label>
            <textarea className="textarea" value={form.structure} onChange={(e) => set('structure', e.target.value)} rows={2} />
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="textarea" value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary">{story ? 'Save' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  );
}
