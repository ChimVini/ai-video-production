import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Workflow, Clock, RefreshCw, Trash2, Copy, BookmarkPlus,
  Bookmark, Play, ChevronRight, LayoutTemplate, X
} from 'lucide-react';
import PageHeader from '../../components/Layout/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { formatDate } from '../../utils/helpers';

const api = window.api;

export default function WorkflowListPage() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewMode, setViewMode] = useState('workflows'); // 'workflows' | 'templates'

  const loadWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      const [data, tpls] = await Promise.all([
        api.getWorkflows(),
        api.getWorkflowTemplates(),
      ]);
      setWorkflows(data.filter(w => !w.is_template));
      setTemplates(tpls);
    } catch (err) {
      console.error('Failed to load workflows:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadWorkflows(); }, [loadWorkflows]);

  async function handleCreate(name, description) {
    try {
      const wf = await api.createWorkflow({ name, description, status: 'draft' });
      setShowCreate(false);
      navigate(`/workflows/${wf.id}`);
    } catch (err) {
      console.error('Failed to create workflow:', err);
    }
  }

  async function handleCreateFromTemplate(templateId) {
    try {
      const wf = await api.duplicateWorkflow(templateId, { asTemplate: false });
      setShowTemplates(false);
      navigate(`/workflows/${wf.id}`);
    } catch (err) {
      console.error('Failed to create from template:', err);
    }
  }

  async function handleDuplicate(workflow) {
    try {
      const wf = await api.duplicateWorkflow(workflow.id);
      setWorkflows(prev => [wf, ...prev]);
    } catch (err) {
      console.error('Failed to duplicate workflow:', err);
    }
  }

  async function handleSaveAsTemplate(workflow) {
    try {
      const updated = await api.saveWorkflowAsTemplate(workflow.id);
      setWorkflows(prev => prev.filter(w => w.id !== workflow.id));
      setTemplates(prev => [updated, ...prev]);
    } catch (err) {
      console.error('Failed to save as template:', err);
    }
  }

  async function handleUnsetTemplate(workflow) {
    try {
      const updated = await api.unsetWorkflowTemplate(workflow.id);
      setTemplates(prev => prev.filter(t => t.id !== workflow.id));
      setWorkflows(prev => [updated, ...prev]);
    } catch (err) {
      console.error('Failed to unset template:', err);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await api.deleteWorkflow(deleteTarget.id);
      setWorkflows(prev => prev.filter(w => w.id !== deleteTarget.id));
      setTemplates(prev => prev.filter(t => t.id !== deleteTarget.id));
    } catch (err) {
      console.error('Failed to delete workflow:', err);
    }
    setDeleteTarget(null);
  }

  const displayList = viewMode === 'templates' ? templates : workflows;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Production Workflows"
        subtitle={`${workflows.length} workflow${workflows.length !== 1 ? 's' : ''} · ${templates.length} template${templates.length !== 1 ? 's' : ''}`}
        actions={
          <div className="flex items-center gap-2">
            {templates.length > 0 && (
              <button onClick={() => setShowTemplates(true)} className="btn-secondary flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4" /> From Template
              </button>
            )}
            <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Workflow
            </button>
          </div>
        }
      />

      {/* View toggle */}
      <div className="px-6 mb-4">
        <div className="inline-flex rounded-lg bg-s-3 p-0.5 border border-s-6/30">
          <button
            onClick={() => setViewMode('workflows')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === 'workflows'
                ? 'bg-accent-600/20 text-accent-400'
                : 'text-t-3 hover:text-t-1'
            }`}
          >
            Workflows ({workflows.length})
          </button>
          <button
            onClick={() => setViewMode('templates')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === 'templates'
                ? 'bg-accent-600/20 text-accent-400'
                : 'text-t-3 hover:text-t-1'
            }`}
          >
            Templates ({templates.length})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 text-t-4 animate-spin" />
          </div>
        ) : displayList.length === 0 ? (
          <EmptyState
            icon={viewMode === 'templates' ? LayoutTemplate : Workflow}
            title={viewMode === 'templates' ? 'No templates yet' : 'No workflows yet'}
            description={
              viewMode === 'templates'
                ? 'Save a workflow as a template to reuse its node layout and connections.'
                : 'Create a workflow to start building your production pipeline with visual nodes.'
            }
            action={
              viewMode === 'workflows' ? (
                <button onClick={() => setShowCreate(true)} className="btn-primary mt-2">
                  <Plus className="w-4 h-4 mr-2" /> Create Workflow
                </button>
              ) : null
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {displayList.map(wf => (
              <WorkflowCard
                key={wf.id}
                workflow={wf}
                isTemplate={viewMode === 'templates'}
                onClick={() => navigate(`/workflows/${wf.id}`)}
                onDelete={() => setDeleteTarget(wf)}
                onDuplicate={() => handleDuplicate(wf)}
                onSaveAsTemplate={() => handleSaveAsTemplate(wf)}
                onUnsetTemplate={() => handleUnsetTemplate(wf)}
                onCreateFromTemplate={() => handleCreateFromTemplate(wf.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      <CreateWorkflowModal isOpen={showCreate} onClose={() => setShowCreate(false)} onCreated={handleCreate} />

      {/* Template picker modal */}
      <TemplatePicker
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        templates={templates}
        onSelect={handleCreateFromTemplate}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={deleteTarget?.is_template ? 'Delete Template' : 'Delete Workflow'}
        message={`Delete "${deleteTarget?.name}"? ${deleteTarget?.is_template ? 'Workflows created from this template will not be affected.' : 'All nodes and connections will be removed.'} This cannot be undone.`}
      />
    </div>
  );
}

function WorkflowCard({ workflow, isTemplate, onClick, onDelete, onDuplicate, onSaveAsTemplate, onUnsetTemplate, onCreateFromTemplate }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      onClick={onClick}
      className="card-hover cursor-pointer p-4 flex flex-col gap-3 group relative"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            isTemplate ? 'bg-cyan-600/15' : 'bg-accent-600/15'
          }`}>
            {isTemplate
              ? <LayoutTemplate className="w-4 h-4 text-cyan-400" />
              : <Workflow className="w-4 h-4 text-accent-400" />
            }
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-t-1 truncate">{workflow.name}</h3>
            {workflow.description && (
              <p className="text-[11px] text-t-4 truncate mt-0.5">{workflow.description}</p>
            )}
          </div>
        </div>

        {/* Context menu trigger */}
        <div className="relative">
          <button
            onClick={e => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="p-1 rounded-md text-t-4 hover:text-t-2 hover:bg-s-4 opacity-0 group-hover:opacity-100 transition-all"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
              <circle cx="8" cy="3" r="1.5" />
              <circle cx="8" cy="8" r="1.5" />
              <circle cx="8" cy="13" r="1.5" />
            </svg>
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={e => { e.stopPropagation(); setShowMenu(false); }} />
              <div className="absolute right-0 top-8 z-50 w-48 bg-s-3 border border-s-6/30 rounded-xl shadow-xl py-1 text-xs">
                {isTemplate ? (
                  <>
                    <MenuBtn icon={Play} label="Create from template" onClick={e => { e.stopPropagation(); setShowMenu(false); onCreateFromTemplate(); }} />
                    <MenuBtn icon={Copy} label="Duplicate template" onClick={e => { e.stopPropagation(); setShowMenu(false); onDuplicate(); }} />
                    <MenuBtn icon={Bookmark} label="Unmark as template" onClick={e => { e.stopPropagation(); setShowMenu(false); onUnsetTemplate(); }} />
                    <div className="border-t border-s-6/30 my-1" />
                    <MenuBtn icon={Trash2} label="Delete template" danger onClick={e => { e.stopPropagation(); setShowMenu(false); onDelete(); }} />
                  </>
                ) : (
                  <>
                    <MenuBtn icon={Copy} label="Duplicate" onClick={e => { e.stopPropagation(); setShowMenu(false); onDuplicate(); }} />
                    <MenuBtn icon={BookmarkPlus} label="Save as template" onClick={e => { e.stopPropagation(); setShowMenu(false); onSaveAsTemplate(); }} />
                    <div className="border-t border-s-6/30 my-1" />
                    <MenuBtn icon={Trash2} label="Delete" danger onClick={e => { e.stopPropagation(); setShowMenu(false); onDelete(); }} />
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isTemplate ? (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
            Template
          </span>
        ) : (
          <StatusBadge status={workflow.status || 'draft'} />
        )}
        <div className="flex items-center gap-1 text-[10px] text-t-4 ml-auto">
          <Clock className="w-3 h-3" />
          {formatDate(workflow.updated_at || workflow.created_at)}
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-s-6/20">
        <span className="text-[10px] text-t-4">
          {isTemplate ? 'Open template' : 'Open canvas'}
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-t-4 group-hover:text-accent-400 transition-colors" />
      </div>
    </div>
  );
}

function MenuBtn({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
        danger
          ? 'text-red-400 hover:bg-red-500/10'
          : 'text-t-2 hover:bg-s-4'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

function TemplatePicker({ isOpen, onClose, templates, onSelect }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-s-2 rounded-2xl border border-s-6/30 shadow-2xl w-full max-w-lg max-h-[70vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-s-6/30">
          <div>
            <h2 className="text-base font-semibold text-t-1">Create from Template</h2>
            <p className="text-xs text-t-4 mt-0.5">Choose a template to create a new workflow</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-s-4 text-t-4 hover:text-t-2">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {templates.length === 0 ? (
            <p className="text-sm text-t-4 text-center py-8">No templates available.</p>
          ) : (
            templates.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => onSelect(tpl.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-s-3 border border-s-6/30 hover:bg-s-4 hover:border-accent-500/20 transition-all text-left group"
              >
                <div className="w-9 h-9 rounded-lg bg-cyan-600/15 flex items-center justify-center shrink-0">
                  <LayoutTemplate className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-t-1 truncate">{tpl.name}</h3>
                  {tpl.description && (
                    <p className="text-[11px] text-t-4 truncate mt-0.5">{tpl.description}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-t-4 group-hover:text-accent-400 shrink-0 transition-colors" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function CreateWorkflowModal({ isOpen, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => { if (isOpen) { setName(''); setDescription(''); } }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Workflow">
      <form onSubmit={e => { e.preventDefault(); if (name.trim()) onCreated(name.trim(), description.trim()); }} className="space-y-4">
        <div>
          <label className="label">Workflow Name</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Episode 1 — Scene 3 Pipeline" autoFocus />
        </div>
        <div>
          <label className="label">Description (optional)</label>
          <textarea className="input min-h-[60px] resize-y" value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What this workflow produces..." />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={!name.trim()}>Create & Open</button>
        </div>
      </form>
    </Modal>
  );
}
