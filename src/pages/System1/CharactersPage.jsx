import React, { useState, useEffect } from 'react';
import { Plus, Users, Trash2, Edit3, ChevronDown, ChevronRight, Layers, FileText, ClipboardList, PenTool, Image, Eye, ShieldCheck, Film, CheckCircle, ArrowRight } from 'lucide-react';
import PageHeader from '../../components/Layout/PageHeader';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import { CHARACTER_VARIANT_TYPES, parseJson } from '../../utils/helpers';

const api = window.api;
const ROLES = ['', 'protagonist', 'antagonist', 'supporting', 'minor', 'extra'];

/* Character Design Workflow (Spec §7.1) */
const CHARACTER_DESIGN_STAGES = [
  { key: 'brief', label: 'Design Brief', icon: FileText, desc: 'Purpose, style, constraints' },
  { key: 'spec', label: 'Design Spec', icon: ClipboardList, desc: 'Full profile, attributes, proportions' },
  { key: 'prompt', label: 'Design Prompt', icon: PenTool, desc: 'Visual generation prompt' },
  { key: 'reference', label: 'Reference Gen', icon: Image, desc: 'Generate reference images' },
  { key: 'review', label: 'Review', icon: Eye, desc: 'Compare with spec, select best' },
  { key: 'master', label: 'Approved Master', icon: ShieldCheck, desc: 'Locked reference set' },
  { key: 'usage', label: 'Scene Usage', icon: Film, desc: 'Attach to scenes/shots' },
];

function CharacterDesignStepper({ character }) {
  const stage = deriveDesignStage(character);

  return (
    <div className="flex items-center gap-1 mb-3">
      {CHARACTER_DESIGN_STAGES.map((s, i) => {
        const isComplete = i < stage;
        const isCurrent = i === stage;
        return (
          <React.Fragment key={s.key}>
            <div
              className={`flex items-center gap-1 px-1.5 py-1 rounded text-[10px] transition-colors ${
                isComplete ? 'bg-green-500/15 text-green-400' :
                isCurrent ? 'bg-accent-600/20 text-accent-400' :
                'bg-s-3/50 text-t-4'
              }`}
              title={s.desc}
            >
              {isComplete ? <CheckCircle className="w-2.5 h-2.5" /> : <s.icon className="w-2.5 h-2.5" />}
              <span className="whitespace-nowrap">{s.label}</span>
            </div>
            {i < CHARACTER_DESIGN_STAGES.length - 1 && (
              <ArrowRight className={`w-2.5 h-2.5 shrink-0 ${isComplete ? 'text-green-500/40' : 'text-s-6/40'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function deriveDesignStage(ch) {
  if (!ch) return 0;
  // Map character status to design workflow stage
  if (ch.status === 'approved' && ch.locked) return 6; // Scene Usage
  if (ch.status === 'approved') return 5; // Approved Master
  if (ch.status === 'review') return 4; // Review
  if (ch.physical_description) return 2; // has spec → Design Prompt stage
  if (ch.personality || ch.background) return 1; // has brief data → Design Spec stage
  return 0; // Design Brief
}

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
    <div className="w-full">
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
            <CharacterCard
              key={ch.id}
              character={ch}
              roleColor={roleColor}
              projectId={selectedProject}
              onEdit={() => setEditing(ch)}
              onDelete={() => setDeleting(ch)}
            />
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

function CharacterCard({ character: ch, roleColor, projectId, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [variants, setVariants] = useState([]);
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [deletingVariant, setDeletingVariant] = useState(null);

  useEffect(() => { if (expanded) loadVariants(); }, [expanded]);

  async function loadVariants() {
    setVariants(await api.getCharacterVariants(ch.id));
  }
  async function handleDeleteVariant() {
    await api.deleteCharacterVariant(deletingVariant.id);
    setDeletingVariant(null);
    loadVariants();
  }

  return (
    <div className="card">
      {/* Character Design Flow (Spec §7.1) */}
      <CharacterDesignStepper character={ch} />
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
          <button className="btn-icon" onClick={onEdit}><Edit3 className="w-3.5 h-3.5" /></button>
          <button className="btn-icon text-red-400" onClick={onDelete}><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="text-xs space-y-1">
        {ch.personality && <p><span className="text-t-4">Personality: </span><span className="text-t-2">{ch.personality}</span></p>}
        {ch.background && <p><span className="text-t-4">Background: </span><span className="text-t-2">{ch.background}</span></p>}
        {ch.motivation && <p><span className="text-t-4">Motivation: </span><span className="text-t-2">{ch.motivation}</span></p>}
        {ch.arc && <p><span className="text-t-4">Arc: </span><span className="text-t-2">{ch.arc}</span></p>}
      </div>

      {/* Variants toggle */}
      <button
        className="flex items-center gap-1.5 mt-3 text-2xs text-accent-400 hover:text-accent-300"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <Layers className="w-3 h-3" />
        Variants
      </button>

      {expanded && (
        <div className="mt-2 border-t border-s-5/30 pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xs text-t-4">{variants.length} variant{variants.length !== 1 ? 's' : ''}</span>
            <button className="btn-ghost text-2xs flex items-center gap-1" onClick={() => setShowAddVariant(true)}>
              <Plus className="w-3 h-3" /> Add Variant
            </button>
          </div>
          {variants.length > 0 && (
            <div className="space-y-1.5">
              {variants.map((v) => {
                const vType = CHARACTER_VARIANT_TYPES.find(t => t.value === v.variant_type);
                return (
                  <div key={v.id} className="flex items-center justify-between bg-s-3 rounded-lg px-2.5 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-t-1">{v.name}</span>
                      {vType && <span className="badge badge-purple text-[10px]">{vType.label}</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <StatusBadge status={v.status} />
                      <button className="btn-icon" onClick={() => setEditingVariant(v)}><Edit3 className="w-3 h-3" /></button>
                      <button className="btn-icon text-red-400" onClick={() => setDeletingVariant(v)}><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <VariantModal
            isOpen={showAddVariant || !!editingVariant}
            onClose={() => { setShowAddVariant(false); setEditingVariant(null); }}
            characterId={ch.id}
            projectId={projectId}
            variant={editingVariant}
            onSaved={() => { setShowAddVariant(false); setEditingVariant(null); loadVariants(); }}
          />
          <ConfirmDialog isOpen={!!deletingVariant} onClose={() => setDeletingVariant(null)} onConfirm={handleDeleteVariant} title="Delete Variant" message={`Delete "${deletingVariant?.name}"?`} />
        </div>
      )}
    </div>
  );
}

function VariantModal({ isOpen, onClose, characterId, projectId, variant, onSaved }) {
  const [form, setForm] = useState({
    name: '', variant_type: 'costume', description: '', prompt_notes: '', status: 'draft',
  });

  useEffect(() => {
    if (variant) {
      setForm({
        name: variant.name, variant_type: variant.variant_type || 'costume',
        description: variant.description || '', prompt_notes: variant.prompt_notes || '',
        status: variant.status,
      });
    } else {
      setForm({ name: '', variant_type: 'costume', description: '', prompt_notes: '', status: 'draft' });
    }
  }, [variant, isOpen]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (variant) await api.updateCharacterVariant(variant.id, form);
    else await api.createCharacterVariant({ ...form, character_id: characterId, project_id: projectId });
    onSaved();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={variant ? 'Edit Variant' : 'New Variant'}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus placeholder="e.g. Winter Outfit" />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="select w-full" value={form.variant_type} onChange={(e) => set('variant_type', e.target.value)}>
              {CHARACTER_VARIANT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="textarea" value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} placeholder="Describe what changes in this variant..." />
        </div>
        <div>
          <label className="label">Prompt Notes</label>
          <textarea className="textarea" value={form.prompt_notes} onChange={(e) => set('prompt_notes', e.target.value)} rows={2} placeholder="AI generation hints for this variant..." />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="select w-full" value={form.status} onChange={(e) => set('status', e.target.value)}>
            {['draft', 'in_progress', 'review', 'approved'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary">{variant ? 'Save' : 'Create'}</button>
        </div>
      </form>
    </Modal>
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
