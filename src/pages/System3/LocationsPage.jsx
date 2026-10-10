import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Trash2, Edit3, ChevronDown, ChevronRight, Layers, Clock } from 'lucide-react';
import PageHeader from '../../components/Layout/PageHeader';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import { LOCATION_TYPES, parseJson } from '../../utils/helpers';

const api = window.api;

export default function LocationsPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [worlds, setWorlds] = useState([]);
  const [selectedWorld, setSelectedWorld] = useState('');
  const [locations, setLocations] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [expandedLoc, setExpandedLoc] = useState(null);

  useEffect(() => { loadProjects(); }, []);
  useEffect(() => { if (selectedProject) loadWorlds(); }, [selectedProject]);
  useEffect(() => { if (selectedWorld) loadLocations(); else setLocations([]); }, [selectedWorld]);

  async function loadProjects() {
    const data = await api.getProjects();
    setProjects(data);
    if (data.length > 0) setSelectedProject(data[0].id);
  }
  async function loadWorlds() {
    const data = await api.getWorlds(selectedProject);
    setWorlds(data);
    if (data.length > 0) setSelectedWorld(data[0].id);
    else setSelectedWorld('');
  }
  async function loadLocations() {
    setLocations(await api.getLocations(selectedWorld));
  }
  async function handleDelete() {
    await api.deleteLocation(deleting.id);
    setDeleting(null);
    loadLocations();
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Locations"
        subtitle="System 3 — Places & Spaces in Your World"
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)} disabled={!selectedWorld}>
            <Plus className="w-4 h-4" /> New Location
          </button>
        }
      />

      <div className="flex gap-3 mb-5">
        <select className="select flex-1" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="select flex-1" value={selectedWorld} onChange={(e) => setSelectedWorld(e.target.value)}>
          <option value="">— Select World —</option>
          {worlds.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>

      {!selectedWorld ? (
        <EmptyState icon={MapPin} title="Select a world" description="Choose a project and world to view locations." />
      ) : locations.length === 0 ? (
        <EmptyState icon={MapPin} title="No locations yet" description="Define places in your world." />
      ) : (
        <div className="space-y-3">
          {locations.map((loc) => (
            <LocationCard
              key={loc.id}
              location={loc}
              expanded={expandedLoc === loc.id}
              onToggle={() => setExpandedLoc(expandedLoc === loc.id ? null : loc.id)}
              onEdit={() => setEditing(loc)}
              onDelete={() => setDeleting(loc)}
              onRefresh={loadLocations}
            />
          ))}
        </div>
      )}

      <LocationModal
        isOpen={showCreate || !!editing}
        onClose={() => { setShowCreate(false); setEditing(null); }}
        worldId={selectedWorld}
        projectId={selectedProject}
        location={editing}
        onSaved={() => { setShowCreate(false); setEditing(null); loadLocations(); }}
      />
      <ConfirmDialog isOpen={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} title="Delete Location" message={`Delete "${deleting?.name}" and all its environments?`} />
    </div>
  );
}

/* ── Location Card with expandable Environments ── */
function LocationCard({ location, expanded, onToggle, onEdit, onDelete, onRefresh }) {
  const [environments, setEnvironments] = useState([]);
  const [showAddEnv, setShowAddEnv] = useState(false);
  const [editingEnv, setEditingEnv] = useState(null);
  const [deletingEnv, setDeletingEnv] = useState(null);

  useEffect(() => { if (expanded) loadEnvs(); }, [expanded]);

  async function loadEnvs() {
    setEnvironments(await api.getEnvironments(location.id));
  }
  async function handleDeleteEnv() {
    await api.deleteEnvironment(deletingEnv.id);
    setDeletingEnv(null);
    loadEnvs();
  }

  const locType = LOCATION_TYPES.find(t => t.value === location.location_type);
  const landmarks = parseJson(location.landmarks);

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <button className="flex items-center gap-2 text-left flex-1" onClick={onToggle}>
          {expanded ? <ChevronDown className="w-4 h-4 text-t-4" /> : <ChevronRight className="w-4 h-4 text-t-4" />}
          <MapPin className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-t-1">{location.name}</h3>
          {locType?.label && locType.value && (
            <span className="badge badge-blue">{locType.label}</span>
          )}
        </button>
        <div className="flex items-center gap-2">
          <StatusBadge status={location.status} />
          <button className="btn-icon" onClick={onEdit}><Edit3 className="w-3.5 h-3.5" /></button>
          <button className="btn-icon text-red-400" onClick={onDelete}><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {location.description && <p className="text-xs text-t-3 mt-1 ml-10">{location.description}</p>}

      {landmarks.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 ml-10">
          {landmarks.map((lm, i) => <span key={i} className="badge badge-purple">{lm}</span>)}
        </div>
      )}

      {expanded && (
        <div className="mt-4 ml-6 border-l-2 border-s-5 pl-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-t-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Environments
            </span>
            <button className="btn-ghost text-2xs flex items-center gap-1" onClick={() => setShowAddEnv(true)}>
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          {environments.length === 0 ? (
            <p className="text-xs text-t-4 italic">No environments defined</p>
          ) : (
            <div className="space-y-2">
              {environments.map((env) => (
                <EnvironmentCard key={env.id} environment={env} onEdit={() => setEditingEnv(env)} onDelete={() => setDeletingEnv(env)} />
              ))}
            </div>
          )}

          <EnvironmentModal
            isOpen={showAddEnv || !!editingEnv}
            onClose={() => { setShowAddEnv(false); setEditingEnv(null); }}
            locationId={location.id}
            projectId={location.project_id}
            environment={editingEnv}
            onSaved={() => { setShowAddEnv(false); setEditingEnv(null); loadEnvs(); }}
          />
          <ConfirmDialog isOpen={!!deletingEnv} onClose={() => setDeletingEnv(null)} onConfirm={handleDeleteEnv} title="Delete Environment" message={`Delete "${deletingEnv?.name}"?`} />
        </div>
      )}
    </div>
  );
}

/* ── Environment Card ── */
function EnvironmentCard({ environment, onEdit, onDelete }) {
  return (
    <div className="bg-s-3 rounded-xl p-3 border border-s-5/30">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-t-1">{environment.name}</span>
        <div className="flex items-center gap-1.5">
          <StatusBadge status={environment.status} />
          <button className="btn-icon" onClick={onEdit}><Edit3 className="w-3 h-3" /></button>
          <button className="btn-icon text-red-400" onClick={onDelete}><Trash2 className="w-3 h-3" /></button>
        </div>
      </div>
      <div className="text-2xs text-t-3 space-y-0.5">
        {environment.lighting && <p><span className="text-t-4">Lighting: </span>{environment.lighting}</p>}
        {environment.atmosphere && <p><span className="text-t-4">Atmosphere: </span>{environment.atmosphere}</p>}
        {environment.time_of_day && <p><span className="text-t-4">Time: </span>{environment.time_of_day}</p>}
        {environment.color_palette && <p><span className="text-t-4">Palette: </span>{environment.color_palette}</p>}
      </div>
    </div>
  );
}

/* ── Location Create/Edit Modal ── */
function LocationModal({ isOpen, onClose, worldId, projectId, location, onSaved }) {
  const [form, setForm] = useState({
    name: '', description: '', location_type: '', spatial_layout: '', prompt_notes: '', status: 'draft',
  });

  useEffect(() => {
    if (location) {
      setForm({
        name: location.name, description: location.description || '',
        location_type: location.location_type || '', spatial_layout: location.spatial_layout || '',
        prompt_notes: location.prompt_notes || '', status: location.status,
      });
    } else {
      setForm({ name: '', description: '', location_type: '', spatial_layout: '', prompt_notes: '', status: 'draft' });
    }
  }, [location, isOpen]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (location) await api.updateLocation(location.id, form);
    else await api.createLocation({ ...form, world_id: worldId, project_id: projectId });
    onSaved();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={location ? 'Edit Location' : 'New Location'} wide>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="select w-full" value={form.location_type} onChange={(e) => set('location_type', e.target.value)}>
              {LOCATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="textarea" value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} />
        </div>
        <div>
          <label className="label">Spatial Layout</label>
          <textarea className="textarea" value={form.spatial_layout} onChange={(e) => set('spatial_layout', e.target.value)} rows={2} placeholder="Describe the spatial arrangement..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Prompt Notes</label>
            <textarea className="textarea" value={form.prompt_notes} onChange={(e) => set('prompt_notes', e.target.value)} rows={2} placeholder="Hints for AI generation..." />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="select w-full" value={form.status} onChange={(e) => set('status', e.target.value)}>
              {['draft', 'in_progress', 'review', 'approved'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary">{location ? 'Save' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  );
}

/* ── Environment Create/Edit Modal ── */
function EnvironmentModal({ isOpen, onClose, locationId, projectId, environment, onSaved }) {
  const [form, setForm] = useState({
    name: '', architecture: '', materials: '', color_palette: '', lighting: '',
    weather: '', atmosphere: '', time_of_day: '', visual_direction: '', prompt_notes: '', status: 'draft',
  });

  useEffect(() => {
    if (environment) {
      setForm({
        name: environment.name, architecture: environment.architecture || '',
        materials: environment.materials || '', color_palette: environment.color_palette || '',
        lighting: environment.lighting || '', weather: environment.weather || '',
        atmosphere: environment.atmosphere || '', time_of_day: environment.time_of_day || '',
        visual_direction: environment.visual_direction || '', prompt_notes: environment.prompt_notes || '',
        status: environment.status,
      });
    } else {
      setForm({ name: '', architecture: '', materials: '', color_palette: '', lighting: '', weather: '', atmosphere: '', time_of_day: '', visual_direction: '', prompt_notes: '', status: 'draft' });
    }
  }, [environment, isOpen]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (environment) await api.updateEnvironment(environment.id, form);
    else await api.createEnvironment({ ...form, location_id: locationId, project_id: projectId });
    onSaved();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={environment ? 'Edit Environment' : 'New Environment'} wide>
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Lighting</label>
            <input className="input" value={form.lighting} onChange={(e) => set('lighting', e.target.value)} placeholder="e.g. Warm golden hour" />
          </div>
          <div>
            <label className="label">Time of Day</label>
            <input className="input" value={form.time_of_day} onChange={(e) => set('time_of_day', e.target.value)} placeholder="e.g. Late afternoon" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Weather</label>
            <input className="input" value={form.weather} onChange={(e) => set('weather', e.target.value)} placeholder="e.g. Light rain" />
          </div>
          <div>
            <label className="label">Atmosphere</label>
            <input className="input" value={form.atmosphere} onChange={(e) => set('atmosphere', e.target.value)} placeholder="e.g. Tense, mysterious" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Color Palette</label>
            <input className="input" value={form.color_palette} onChange={(e) => set('color_palette', e.target.value)} placeholder="e.g. Muted blues and grays" />
          </div>
          <div>
            <label className="label">Materials</label>
            <input className="input" value={form.materials} onChange={(e) => set('materials', e.target.value)} placeholder="e.g. Concrete, steel, glass" />
          </div>
        </div>
        <div>
          <label className="label">Architecture</label>
          <textarea className="textarea" value={form.architecture} onChange={(e) => set('architecture', e.target.value)} rows={2} placeholder="Describe the architectural style..." />
        </div>
        <div>
          <label className="label">Visual Direction</label>
          <textarea className="textarea" value={form.visual_direction} onChange={(e) => set('visual_direction', e.target.value)} rows={2} placeholder="Camera angles, composition notes..." />
        </div>
        <div>
          <label className="label">Prompt Notes</label>
          <textarea className="textarea" value={form.prompt_notes} onChange={(e) => set('prompt_notes', e.target.value)} rows={2} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary">{environment ? 'Save' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  );
}
