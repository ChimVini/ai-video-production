import React, { useState, useEffect } from 'react';
import { Plus, Sparkles, Trash2, Edit3, Copy, Globe2 } from 'lucide-react';
import PageHeader from '../../components/Layout/PageHeader';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import { PROMPT_PURPOSES, PROMPT_OWNING_SYSTEMS, parseJson } from '../../utils/helpers';

const api = window.api;

export default function PromptTemplatesPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [templates, setTemplates] = useState([]);
  const [globalTemplates, setGlobalTemplates] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [filterPurpose, setFilterPurpose] = useState('');
  const [tab, setTab] = useState('project'); // 'project' | 'global'

  useEffect(() => { loadProjects(); loadGlobal(); }, []);
  useEffect(() => { if (selectedProject) loadTemplates(); }, [selectedProject]);

  async function loadProjects() {
    const data = await api.getProjects();
    setProjects(data);
    if (data.length > 0) setSelectedProject(data[0].id);
  }
  async function loadTemplates() {
    setTemplates(await api.getPromptTemplates(selectedProject));
  }
  async function loadGlobal() {
    setGlobalTemplates(await api.getGlobalPromptTemplates());
  }
  async function handleDelete() {
    await api.deletePromptTemplate(deleting.id);
    setDeleting(null);
    loadTemplates();
    loadGlobal();
  }
  async function handleDuplicate(tmpl) {
    const { id, created_at, updated_at, ...rest } = tmpl;
    await api.createPromptTemplate({ ...rest, name: `${tmpl.name} (Copy)` });
    loadTemplates();
    loadGlobal();
  }

  const displayList = tab === 'global' ? globalTemplates : templates;
  const filtered = filterPurpose
    ? displayList.filter(t => t.purpose === filterPurpose)
    : displayList;

  return (
    <div className="w-full">
      <PageHeader
        title="Prompt Templates"
        subtitle="System 4 — Reusable prompts for AI generation"
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> New Template
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        <button
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === 'project' ? 'bg-accent-600/20 text-accent-300' : 'text-t-3 hover:text-t-1'}`}
          onClick={() => setTab('project')}
        >
          Project Templates
        </button>
        <button
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${tab === 'global' ? 'bg-accent-600/20 text-accent-300' : 'text-t-3 hover:text-t-1'}`}
          onClick={() => setTab('global')}
        >
          <Globe2 className="w-3.5 h-3.5" /> Global Templates
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        {tab === 'project' && (
          <select className="select flex-1" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        <select className="select" value={filterPurpose} onChange={(e) => setFilterPurpose(e.target.value)}>
          <option value="">All Purposes</option>
          {PROMPT_PURPOSES.filter(p => p.value).map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Sparkles} title="No templates" description={tab === 'global' ? 'No global templates yet.' : 'Create prompt templates for this project.'} />
      ) : (
        <div className="space-y-3">
          {filtered.map((tmpl) => (
            <TemplateCard
              key={tmpl.id}
              template={tmpl}
              onEdit={() => setEditing(tmpl)}
              onDelete={() => setDeleting(tmpl)}
              onDuplicate={() => handleDuplicate(tmpl)}
            />
          ))}
        </div>
      )}

      <TemplateModal
        isOpen={showCreate || !!editing}
        onClose={() => { setShowCreate(false); setEditing(null); }}
        projectId={selectedProject}
        template={editing}
        onSaved={() => { setShowCreate(false); setEditing(null); loadTemplates(); loadGlobal(); }}
      />
      <ConfirmDialog isOpen={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} title="Delete Template" message={`Delete "${deleting?.name}"?`} />
    </div>
  );
}

function TemplateCard({ template, onEdit, onDelete, onDuplicate }) {
  const [expanded, setExpanded] = useState(false);
  const purpose = PROMPT_PURPOSES.find(p => p.value === template.purpose);
  const system = PROMPT_OWNING_SYSTEMS.find(s => s.value === template.owning_system);
  const tags = parseJson(template.tags);
  const inputFields = parseJson(template.input_fields);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-400" />
          <h3 className="text-sm font-semibold text-t-1">{template.name}</h3>
          {template.is_global === 1 && <span className="badge badge-cyan">Global</span>}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={template.status} />
          <button className="btn-icon" title="Duplicate" onClick={onDuplicate}><Copy className="w-3.5 h-3.5" /></button>
          <button className="btn-icon" onClick={onEdit}><Edit3 className="w-3.5 h-3.5" /></button>
          <button className="btn-icon text-red-400" onClick={onDelete}><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        {purpose?.label && purpose.value && <span className="badge badge-purple">{purpose.label}</span>}
        {system?.label && system.value && <span className="badge badge-blue">{system.label}</span>}
        {tags.map((tag, i) => <span key={i} className="badge badge-gray">{tag}</span>)}
      </div>

      {inputFields.length > 0 && (
        <div className="text-2xs text-t-4 mb-1">
          Input fields: {inputFields.join(', ')}
        </div>
      )}

      <button className="text-2xs text-accent-400 hover:text-accent-300" onClick={() => setExpanded(!expanded)}>
        {expanded ? 'Hide template body' : 'Show template body'}
      </button>

      {expanded && template.template_body && (
        <pre className="mt-2 p-3 bg-s-1 rounded-lg text-2xs text-t-2 whitespace-pre-wrap border border-s-5/30 max-h-48 overflow-y-auto">
          {template.template_body}
        </pre>
      )}
    </div>
  );
}

function TemplateModal({ isOpen, onClose, projectId, template, onSaved }) {
  const [form, setForm] = useState({
    name: '', purpose: '', owning_system: '', template_body: '',
    output_format: '', is_global: 0, status: 'draft',
  });
  const [inputFieldsStr, setInputFieldsStr] = useState('');
  const [tagsStr, setTagsStr] = useState('');

  useEffect(() => {
    if (template) {
      setForm({
        name: template.name, purpose: template.purpose || '',
        owning_system: template.owning_system || '',
        template_body: template.template_body || '',
        output_format: template.output_format || '',
        is_global: template.is_global || 0,
        status: template.status,
      });
      setInputFieldsStr(parseJson(template.input_fields).join(', '));
      setTagsStr(parseJson(template.tags).join(', '));
    } else {
      setForm({ name: '', purpose: '', owning_system: '', template_body: '', output_format: '', is_global: 0, status: 'draft' });
      setInputFieldsStr('');
      setTagsStr('');
    }
  }, [template, isOpen]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const payload = {
      ...form,
      input_fields: JSON.stringify(inputFieldsStr.split(',').map(s => s.trim()).filter(Boolean)),
      tags: JSON.stringify(tagsStr.split(',').map(s => s.trim()).filter(Boolean)),
    };
    if (template) await api.updatePromptTemplate(template.id, payload);
    else await api.createPromptTemplate({ ...payload, project_id: projectId });
    onSaved();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={template ? 'Edit Template' : 'New Template'} wide>
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
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Purpose</label>
            <select className="select w-full" value={form.purpose} onChange={(e) => set('purpose', e.target.value)}>
              {PROMPT_PURPOSES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Owning System</label>
            <select className="select w-full" value={form.owning_system} onChange={(e) => set('owning_system', e.target.value)}>
              {PROMPT_OWNING_SYSTEMS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer h-[38px]">
              <input type="checkbox" checked={form.is_global === 1} onChange={(e) => set('is_global', e.target.checked ? 1 : 0)} className="w-4 h-4 rounded border-s-5 bg-s-3 text-accent-500 focus:ring-accent-500" />
              <span className="text-xs text-t-2">Global template</span>
            </label>
          </div>
        </div>
        <div>
          <label className="label">Template Body</label>
          <textarea className="textarea font-mono text-xs" value={form.template_body} onChange={(e) => set('template_body', e.target.value)} rows={8} placeholder="Write your prompt template here... Use {{field_name}} for variables." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Input Fields <span className="text-t-4">(comma-separated)</span></label>
            <input className="input" value={inputFieldsStr} onChange={(e) => setInputFieldsStr(e.target.value)} placeholder="scene_description, character_name, mood" />
          </div>
          <div>
            <label className="label">Output Format</label>
            <input className="input" value={form.output_format} onChange={(e) => set('output_format', e.target.value)} placeholder="e.g. JSON, text, structured prompt" />
          </div>
        </div>
        <div>
          <label className="label">Tags <span className="text-t-4">(comma-separated)</span></label>
          <input className="input" value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="cinematic, character, dialogue" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary">{template ? 'Save' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  );
}
