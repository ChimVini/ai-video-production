import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Clapperboard, Film, Trash2, Play, Clock } from 'lucide-react';
import PageHeader from '../../components/Layout/PageHeader';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import { SHOT_DURATIONS, SHOT_DOT_COLORS, SHOT_BLOCK_COLORS, formatStatus, PRODUCTION_MODES } from '../../utils/helpers';

const api = window.api;

export default function ProductionPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [episodes, setEpisodes] = useState([]);
  const [selectedEpisode, setSelectedEpisode] = useState('');
  const [scenes, setScenes] = useState([]);
  const [shotsMap, setShotsMap] = useState({});
  const [showAddScene, setShowAddScene] = useState(false);
  const [showAddShot, setShowAddShot] = useState(null);
  const [project, setProject] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { loadProjects(); }, []);
  useEffect(() => { if (selectedProject) loadProjectData(); }, [selectedProject]);
  useEffect(() => { loadScenes(); }, [selectedEpisode, selectedProject]);

  async function loadProjects() {
    const data = await api.getProjects();
    setProjects(data);
    if (data.length > 0) setSelectedProject(data[0].id);
  }

  async function loadProjectData() {
    const [p, eps] = await Promise.all([
      api.getProject(selectedProject),
      api.getEpisodes(selectedProject),
    ]);
    setProject(p);
    setEpisodes(eps);
    if (p.type === 'single') {
      setSelectedEpisode('');
    } else if (eps.length > 0) {
      setSelectedEpisode(eps[0].id);
    }
  }

  async function loadScenes() {
    let scenesList = [];
    if (project?.type === 'single') {
      scenesList = await api.getScenesByProject(selectedProject);
    } else if (selectedEpisode) {
      scenesList = await api.getScenes(selectedEpisode);
    }
    setScenes(scenesList);

    const map = {};
    for (const scene of scenesList) {
      map[scene.id] = await api.getShots(scene.id);
    }
    setShotsMap(map);
  }

  const allShots = Object.values(shotsMap).flat();
  const totalDuration = allShots.reduce((sum, s) => sum + (s.duration || 0), 0);
  const completedShots = allShots.filter(s => s.status === 'final').length;

  return (
    <div className="w-full">
      <PageHeader
        title="Production Pipeline"
        subtitle="Script → Scene → Shot → Prompt → Generate → Review"
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowAddScene(true)} disabled={!selectedProject}>
            <Plus className="w-4 h-4" /> Add Scene
          </button>
        }
      />

      {/* Project + Episode selector */}
      <div className="flex items-center gap-3 mb-5">
        <select className="select" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {project?.type !== 'single' && episodes.length > 0 && (
          <select className="select" value={selectedEpisode} onChange={(e) => setSelectedEpisode(e.target.value)}>
            {episodes.map((ep) => (
              <option key={ep.id} value={ep.id}>EP{String(ep.episode_number).padStart(2, '0')} — {ep.title}</option>
            ))}
          </select>
        )}
      </div>

      {/* Production Mode Banner */}
      {project && (
        <div className="mb-5 px-4 py-3 rounded-xl border border-s-6/30 bg-s-3/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs text-t-3 uppercase tracking-wider">Production Mode:</span>
            <span className="text-sm font-semibold text-t-1">
              {PRODUCTION_MODES.find(m => m.value === project.production_mode)?.label || 'Reference-driven'}
            </span>
            <span className="text-xs text-t-4">
              — {PRODUCTION_MODES.find(m => m.value === project.production_mode)?.description || ''}
            </span>
          </div>
          {project.production_mode === 'shot_controlled' && (
            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
              Full control: each shot requires explicit state vectors
            </span>
          )}
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="stat-card flex items-center gap-3">
          <Film className="w-4 h-4 text-accent-400" />
          <div>
            <div className="text-lg font-bold text-t-1">{scenes.length}</div>
            <div className="text-2xs text-t-4">Scenes</div>
          </div>
        </div>
        <div className="stat-card flex items-center gap-3">
          <Clapperboard className="w-4 h-4 text-amber-400" />
          <div>
            <div className="text-lg font-bold text-t-1">{allShots.length}</div>
            <div className="text-2xs text-t-4">Total Shots</div>
          </div>
        </div>
        <div className="stat-card flex items-center gap-3">
          <Clock className="w-4 h-4 text-cyan-400" />
          <div>
            <div className="text-lg font-bold text-t-1">{totalDuration}s</div>
            <div className="text-2xs text-t-4">Total Duration</div>
          </div>
        </div>
        <div className="stat-card flex items-center gap-3">
          <Play className="w-4 h-4 text-emerald-400" />
          <div>
            <div className="text-lg font-bold text-t-1">{completedShots}/{allShots.length}</div>
            <div className="text-2xs text-t-4">Completed</div>
          </div>
        </div>
      </div>

      {/* Scene list with shots */}
      {scenes.length === 0 ? (
        <EmptyState icon={Clapperboard} title="No scenes yet" description="Add scenes to start planning your video production." />
      ) : (
        <div className="space-y-4">
          {scenes.sort((a, b) => a.scene_number - b.scene_number).map((scene) => {
            const shots = shotsMap[scene.id] || [];
            const sceneDuration = shots.reduce((s, sh) => s + (sh.duration || 0), 0);

            return (
              <div key={scene.id} className="card">
                {/* Scene header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-t-4">SCENE {String(scene.scene_number).padStart(2, '0')}</span>
                    <h3 className="text-sm font-medium text-t-1">{scene.title || scene.description || 'Untitled'}</h3>
                    <StatusBadge status={scene.status} />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-t-4">
                    <span>{shots.length} shots · {sceneDuration}s</span>
                    <button
                      className="btn-ghost text-xs"
                      onClick={() => setShowAddShot(scene.id)}
                    >
                      <Plus className="w-3.5 h-3.5" /> Shot
                    </button>
                  </div>
                </div>

                {/* Scene details */}
                {(scene.location || scene.emotion || scene.camera_notes) && (
                  <div className="flex flex-wrap gap-3 mb-3 text-xs">
                    {scene.location && <span className="text-t-4">Location: <span className="text-t-2">{scene.location}</span></span>}
                    {scene.emotion && <span className="text-t-4">Emotion: <span className="text-t-2">{scene.emotion}</span></span>}
                    {scene.camera_notes && <span className="text-t-4">Camera: <span className="text-t-2">{scene.camera_notes}</span></span>}
                  </div>
                )}

                {/* Shot timeline */}
                {shots.length > 0 ? (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {shots.sort((a, b) => a.shot_number - b.shot_number).map((shot) => (
                      <div
                        key={shot.id}
                        onClick={() => navigate(`/production/shot/${shot.id}`)}
                        className="shot-card"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-mono text-t-4">SHOT {String(shot.shot_number).padStart(2, '0')}</span>
                          <div className={`w-2 h-2 rounded-full ${SHOT_DOT_COLORS[shot.status] || 'bg-t-4'}`} />
                        </div>
                        <div className="text-xs text-t-2 line-clamp-2 mb-1.5 min-h-[2rem]">
                          {shot.description || 'No description'}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-accent-400">{shot.duration}s</span>
                          <span className="text-[10px] text-t-4">{formatStatus(shot.status)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-t-4">No shots yet. Add shots to this scene.</p>
                )}

                {/* Progress bar */}
                {shots.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="progress-bar flex-1">
                      <div
                        className="progress-fill"
                        style={{ width: `${(shots.filter(s => s.status === 'final').length / shots.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-t-4">
                      {shots.filter(s => s.status === 'final').length}/{shots.length}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Timeline overview */}
      {allShots.length > 0 && (
        <div className="card mt-5">
          <h3 className="text-sm font-medium text-t-2 mb-3">Video Timeline — {totalDuration}s total</h3>
          <div className="flex gap-0.5 h-8 rounded-xl overflow-hidden">
            {scenes.sort((a, b) => a.scene_number - b.scene_number).flatMap((scene) =>
              (shotsMap[scene.id] || []).sort((a, b) => a.shot_number - b.shot_number).map((shot) => (
                <div
                  key={shot.id}
                  className={`h-full ${SHOT_BLOCK_COLORS[shot.status] || 'bg-s-6'} opacity-80 hover:opacity-100 cursor-pointer transition-opacity`}
                  style={{ width: `${(shot.duration / totalDuration) * 100}%`, minWidth: '8px' }}
                  title={`Shot ${shot.shot_number} · ${shot.duration}s · ${formatStatus(shot.status)}`}
                  onClick={() => navigate(`/production/shot/${shot.id}`)}
                />
              ))
            )}
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-t-4">
            <span>0s</span>
            <span>{totalDuration}s</span>
          </div>
        </div>
      )}

      <AddSceneModal isOpen={showAddScene} onClose={() => setShowAddScene(false)} projectId={selectedProject} episodeId={project?.type === 'single' ? null : selectedEpisode} nextNumber={scenes.length + 1} onCreated={loadScenes} />
      <AddShotModal isOpen={!!showAddShot} onClose={() => setShowAddShot(null)} sceneId={showAddShot} nextNumber={(shotsMap[showAddShot] || []).length + 1} onCreated={loadScenes} />
    </div>
  );
}

function AddSceneModal({ isOpen, onClose, projectId, episodeId, nextNumber, onCreated }) {
  const [form, setForm] = useState({ title: '', location: '', description: '', emotion: '', camera_notes: '', lighting: '', sound: '' });
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    await api.createScene({
      project_id: projectId,
      episode_id: episodeId,
      scene_number: nextNumber,
      ...form,
    });
    setForm({ title: '', location: '', description: '', emotion: '', camera_notes: '', lighting: '', sound: '' });
    onCreated();
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Add Scene ${nextNumber}`} wide>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Title</label>
            <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label">Location</label>
            <input className="input" value={form.location} onChange={(e) => set('location', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="textarea" value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Emotion</label>
            <input className="input" value={form.emotion} onChange={(e) => set('emotion', e.target.value)} />
          </div>
          <div>
            <label className="label">Camera</label>
            <input className="input" value={form.camera_notes} onChange={(e) => set('camera_notes', e.target.value)} />
          </div>
          <div>
            <label className="label">Lighting</label>
            <input className="input" value={form.lighting} onChange={(e) => set('lighting', e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary">Add Scene</button>
        </div>
      </form>
    </Modal>
  );
}

function AddShotModal({ isOpen, onClose, sceneId, nextNumber, onCreated }) {
  const [form, setForm] = useState({ description: '', duration: 6, camera_angle: '', camera_movement: '' });
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!sceneId) return;
    await api.createShot({
      scene_id: sceneId,
      shot_number: nextNumber,
      duration: parseInt(form.duration),
      description: form.description,
      camera_angle: form.camera_angle,
      camera_movement: form.camera_movement,
    });
    setForm({ description: '', duration: 6, camera_angle: '', camera_movement: '' });
    onCreated();
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Add Shot ${nextNumber}`}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="label">Description</label>
          <textarea className="textarea" value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} autoFocus />
        </div>
        <div>
          <label className="label">Duration</label>
          <div className="flex gap-2">
            {SHOT_DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => set('duration', d)}
                className={`px-4 py-2 rounded-xl text-sm font-mono font-medium transition-all duration-200 ${
                  form.duration === d
                    ? 'bg-accent-600 text-white shadow-glow-sm'
                    : 'bg-s-4/60 text-t-3 hover:text-t-1'
                }`}
              >
                {d}s
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Camera Angle</label>
            <input className="input" value={form.camera_angle} onChange={(e) => set('camera_angle', e.target.value)} placeholder="e.g. Close-up, Wide shot" />
          </div>
          <div>
            <label className="label">Camera Movement</label>
            <input className="input" value={form.camera_movement} onChange={(e) => set('camera_movement', e.target.value)} placeholder="e.g. Pan left, Dolly in" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary">Add Shot</button>
        </div>
      </form>
    </Modal>
  );
}
