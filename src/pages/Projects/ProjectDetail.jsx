import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, Users, Globe, Palette, Clapperboard,
  Plus, Trash2, Edit3
} from 'lucide-react';
import PageHeader from '../../components/Layout/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Modal from '../../components/common/Modal';
import { PROJECT_TYPES, PRODUCTION_STATUSES, formatDate, formatStatus } from '../../utils/helpers';

const api = window.api;

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [stories, setStories] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [worlds, setWorlds] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [visualAssets, setVisualAssets] = useState([]);
  const [showDelete, setShowDelete] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showAddEpisode, setShowAddEpisode] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    const [p, s, c, w, e, va] = await Promise.all([
      api.getProject(id),
      api.getStories(id),
      api.getCharacters(id),
      api.getWorlds(id),
      api.getEpisodes(id),
      api.getVisualAssets(id),
    ]);
    setProject(p);
    setStories(s);
    setCharacters(c);
    setWorlds(w);
    setEpisodes(e);
    setVisualAssets(va);
  }

  async function handleDelete() {
    await api.deleteProject(id);
    navigate('/projects');
  }

  async function handleStatusChange(status) {
    await api.updateProject(id, { production_status: status });
    load();
  }

  if (!project) {
    return <div className="text-t-4">Loading...</div>;
  }

  const isSeries = project.type !== 'single';

  return (
    <div className="max-w-5xl">
      <button onClick={() => navigate('/projects')} className="btn-ghost mb-3 flex items-center gap-1">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Projects
      </button>

      <PageHeader
        title={project.name}
        subtitle={`${PROJECT_TYPES[project.type]} · Created ${formatDate(project.created_at)}`}
        actions={
          <div className="flex items-center gap-2">
            <select
              className="select text-xs"
              value={project.production_status}
              onChange={(e) => handleStatusChange(e.target.value)}
            >
              {PRODUCTION_STATUSES.map((s) => (
                <option key={s} value={s}>{formatStatus(s)}</option>
              ))}
            </select>
            <button className="btn-icon" onClick={() => setShowEdit(true)}><Edit3 className="w-4 h-4" /></button>
            <button className="btn-icon text-red-400 hover:text-red-300" onClick={() => setShowDelete(true)}><Trash2 className="w-4 h-4" /></button>
          </div>
        }
      />

      {project.description && (
        <p className="text-sm text-t-3 mb-6 -mt-4">{project.description}</p>
      )}

      {/* Status cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card">
          <div className="text-2xs uppercase tracking-widest text-t-4 mb-1.5">Production</div>
          <StatusBadge status={project.production_status} />
        </div>
        <div className="card">
          <div className="text-2xs uppercase tracking-widest text-t-4 mb-1.5">Publishing</div>
          <StatusBadge status={project.publishing_status} />
        </div>
      </div>

      {/* System 1 overview */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <SummaryCard icon={BookOpen} label="Stories" count={stories.length} items={stories.map(s => s.title)} />
        <SummaryCard icon={Users} label="Characters" count={characters.length} items={characters.map(c => c.name)} />
        <SummaryCard icon={Globe} label="Worlds" count={worlds.length} items={worlds.map(w => w.name)} />
      </div>

      {/* System 2 */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-accent-400" />
            <span className="text-sm font-medium text-t-1">Visual Assets</span>
          </div>
          <span className="text-xs text-t-4">{visualAssets.length} assets</span>
        </div>
        {visualAssets.length === 0 ? (
          <p className="text-xs text-t-4">No visual assets yet</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {visualAssets.slice(0, 8).map((a) => (
              <span key={a.id} className="badge badge-purple">{a.name}</span>
            ))}
            {visualAssets.length > 8 && <span className="badge badge-gray">+{visualAssets.length - 8}</span>}
          </div>
        )}
      </div>

      {/* Episodes (series only) */}
      {isSeries && (
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clapperboard className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-t-1">Episodes</span>
            </div>
            <button className="btn-ghost flex items-center gap-1" onClick={() => setShowAddEpisode(true)}>
              <Plus className="w-3.5 h-3.5" /> Add Episode
            </button>
          </div>
          {episodes.length === 0 ? (
            <p className="text-xs text-t-4">No episodes yet</p>
          ) : (
            <div className="space-y-1">
              {episodes.sort((a, b) => a.episode_number - b.episode_number).map((ep) => (
                <div key={ep.id} className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-s-4/50 cursor-pointer transition-all duration-200">
                  <div>
                    <span className="text-xs text-t-4 mr-2">EP{String(ep.episode_number).padStart(2, '0')}</span>
                    <span className="text-sm text-t-1">{ep.title}</span>
                  </div>
                  <StatusBadge status={ep.production_status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <ConfirmDialog isOpen={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete} title="Delete Project" message={`Delete "${project.name}" and all its data? This cannot be undone.`} />
      <EditProjectModal isOpen={showEdit} onClose={() => setShowEdit(false)} project={project} onSaved={load} />
      <AddEpisodeModal isOpen={showAddEpisode} onClose={() => setShowAddEpisode(false)} projectId={id} nextNumber={episodes.length + 1} onCreated={load} />
    </div>
  );
}

function SummaryCard({ icon: Icon, label, count, items }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-accent-400" />
        <span className="text-sm font-medium text-t-1">{label}</span>
        <span className="text-xs text-t-4 ml-auto">{count}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-t-4">None yet</p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {items.slice(0, 5).map((name, i) => (
            <span key={i} className="badge badge-blue">{name}</span>
          ))}
          {items.length > 5 && <span className="badge badge-gray">+{items.length - 5}</span>}
        </div>
      )}
    </div>
  );
}

function EditProjectModal({ isOpen, onClose, project, onSaved }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  useEffect(() => {
    if (project) { setName(project.name); setDesc(project.description || ''); }
  }, [project]);

  async function handleSave(e) {
    e.preventDefault();
    await api.updateProject(project.id, { name, description: desc });
    onSaved();
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Project">
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="label">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="textarea" value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary">Save</button>
        </div>
      </form>
    </Modal>
  );
}

function AddEpisodeModal({ isOpen, onClose, projectId, nextNumber, onCreated }) {
  const [title, setTitle] = useState('');
  const [synopsis, setSynopsis] = useState('');

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim()) return;
    await api.createEpisode({ project_id: projectId, episode_number: nextNumber, title: title.trim(), synopsis });
    setTitle(''); setSynopsis('');
    onCreated();
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Add Episode ${nextNumber}`}>
      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label className="label">Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Episode title" autoFocus />
        </div>
        <div>
          <label className="label">Synopsis</label>
          <textarea className="textarea" value={synopsis} onChange={(e) => setSynopsis(e.target.value)} rows={3} />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary">Add Episode</button>
        </div>
      </form>
    </Modal>
  );
}
