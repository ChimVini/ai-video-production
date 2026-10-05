import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderKanban, Search } from 'lucide-react';
import PageHeader from '../../components/Layout/PageHeader';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import { PROJECT_TYPES, formatDate } from '../../utils/helpers';

const api = window.api;

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);

  async function load() {
    const data = await api.getProjects();
    setProjects(data);
  }

  const filtered = projects.filter((p) => {
    if (filter !== 'all' && p.type !== filter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Projects"
        subtitle="Manage all your video projects"
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> New Project
          </button>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-t-4" />
          <input
            className="input pl-9"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {['all', 'single', 'short_series', 'long_series'].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={filter === t ? 'chip-active' : 'chip-default'}
            >
              {t === 'all' ? 'All' : PROJECT_TYPES[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Project list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects found"
          description="Create your first project to start the production pipeline."
          action={
            <button className="btn-primary" onClick={() => setShowCreate(true)}>Create Project</button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((p) => (
            <div
              key={p.id}
              onClick={() => navigate(`/projects/${p.id}`)}
              className="card-hover"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-t-1">{p.name}</h3>
                  <p className="text-xs text-t-4 mt-0.5">
                    {PROJECT_TYPES[p.type]} · Created {formatDate(p.created_at)}
                  </p>
                  {p.description && (
                    <p className="text-xs text-t-3 mt-1 line-clamp-1">{p.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={p.production_status} />
                  <StatusBadge status={p.publishing_status} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <CreateProjectModal isOpen={showCreate} onClose={() => setShowCreate(false)} onCreated={(p) => { load(); setShowCreate(false); navigate(`/projects/${p.id}`); }} />
    </div>
  );
}

function CreateProjectModal({ isOpen, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('single');
  const [description, setDescription] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    const project = await api.createProject({ name: name.trim(), type, description: description.trim() });
    setName(''); setType('single'); setDescription('');
    onCreated(project);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Project">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Project Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Video Project" autoFocus />
        </div>
        <div>
          <label className="label">Type</label>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(PROJECT_TYPES).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setType(val)}
                className={`px-3 py-2.5 rounded-xl border text-xs font-medium transition-all duration-200 ${
                  type === val
                    ? 'border-accent-500/50 bg-accent-600/10 text-accent-400 shadow-glow-sm'
                    : 'border-s-6/50 bg-s-4/60 text-t-3 hover:border-s-7/60'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..." rows={3} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={!name.trim()}>Create Project</button>
        </div>
      </form>
    </Modal>
  );
}
