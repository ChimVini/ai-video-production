import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw, Filter, Grid3X3, List, ChevronDown, ExternalLink, Tag, Clock, Box } from 'lucide-react';
import PageHeader from '../../components/Layout/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import { RESOURCE_TYPES, SOURCE_SYSTEMS, formatDate, formatStatus, parseJson } from '../../utils/helpers';

const CATALOG_STATUSES = ['draft', 'review', 'approved', 'locked', 'archived'];

export default function ResourceLibraryPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterSystem, setFilterSystem] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // grid | list
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [syncResults, setSyncResults] = useState(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {};
      if (filterType) filters.resource_type = filterType;
      if (filterSystem) filters.source_system = filterSystem;
      if (filterStatus) filters.status = filterStatus;
      if (search) filters.search = search;
      const data = await window.api.getResourceCatalog(filters);
      setEntries(data);
    } catch (err) {
      console.error('Failed to load resource catalog:', err);
    }
    setLoading(false);
  }, [filterType, filterSystem, filterStatus, search]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResults(null);
    try {
      const results = await window.api.syncResourceCatalog();
      setSyncResults(results);
      await loadEntries();
    } catch (err) {
      console.error('Sync failed:', err);
    }
    setSyncing(false);
    // Auto-dismiss sync results after 5s
    setTimeout(() => setSyncResults(null), 5000);
  };

  const getTypeInfo = (type) => RESOURCE_TYPES.find(t => t.value === type) || { label: type, icon: '•' };
  const getSystemLabel = (sys) => SOURCE_SYSTEMS.find(s => s.value === sys)?.label || sys;

  const totalSynced = syncResults
    ? Object.values(syncResults).reduce((sum, r) => sum + r.created + r.updated, 0)
    : 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Resource Library"
        subtitle={`${entries.length} resources cataloged`}
        actions={
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn-primary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Catalog'}
          </button>
        }
      />

      {/* Sync Results Banner */}
      {syncResults && (
        <div className="mx-6 mb-3 px-4 py-2.5 rounded-lg bg-accent-500/10 border border-accent-500/30 text-sm text-accent-300 flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          <span>
            Sync complete: {totalSynced} changes
            {totalSynced > 0 && (
              <span className="text-t-4 ml-2">
                ({Object.entries(syncResults).map(([k, v]) =>
                  (v.created + v.updated > 0) ? `${k}: +${v.created} ~${v.updated}` : null
                ).filter(Boolean).join(', ')})
              </span>
            )}
          </span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="px-6 pb-4 flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-t-4" />
          <input
            type="text"
            placeholder="Search resources..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9 w-full"
          />
        </div>

        {/* Type Filter */}
        <div className="relative">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="select pr-8 appearance-none"
          >
            <option value="">All Types</option>
            {RESOURCE_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-t-4 pointer-events-none" />
        </div>

        {/* Source System Filter */}
        <div className="relative">
          <select
            value={filterSystem}
            onChange={e => setFilterSystem(e.target.value)}
            className="select pr-8 appearance-none"
          >
            <option value="">All Systems</option>
            {SOURCE_SYSTEMS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-t-4 pointer-events-none" />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="select pr-8 appearance-none"
          >
            <option value="">All Status</option>
            {CATALOG_STATUSES.map(s => (
              <option key={s} value={s}>{formatStatus(s)}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-t-4 pointer-events-none" />
        </div>

        {/* View Toggle */}
        <div className="flex items-center border border-s-6/50 rounded-lg overflow-hidden ml-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 ${viewMode === 'grid' ? 'bg-accent-500/20 text-accent-400' : 'text-t-4 hover:text-t-2'}`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 ${viewMode === 'list' ? 'bg-accent-500/20 text-accent-400' : 'text-t-4 hover:text-t-2'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 text-t-4 animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={Box}
            title="No resources cataloged"
            description="Click 'Sync Catalog' to index resources from your Content, Character, and Context systems."
            action={
              <button onClick={handleSync} className="btn-primary mt-2">
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Now
              </button>
            }
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {entries.map(entry => (
              <ResourceCard
                key={entry.id}
                entry={entry}
                getTypeInfo={getTypeInfo}
                getSystemLabel={getSystemLabel}
                onClick={() => setSelectedEntry(entry)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map(entry => (
              <ResourceRow
                key={entry.id}
                entry={entry}
                getTypeInfo={getTypeInfo}
                getSystemLabel={getSystemLabel}
                onClick={() => setSelectedEntry(entry)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedEntry && (
        <ResourceDetailPanel
          entry={selectedEntry}
          getTypeInfo={getTypeInfo}
          getSystemLabel={getSystemLabel}
          onClose={() => setSelectedEntry(null)}
          navigate={navigate}
        />
      )}
    </div>
  );
}

// ── Grid Card ─────────────────────────────────
function ResourceCard({ entry, getTypeInfo, getSystemLabel, onClick }) {
  const typeInfo = getTypeInfo(entry.resource_type);
  const tags = parseJson(entry.tags, []);

  return (
    <div
      onClick={onClick}
      className="card-hover cursor-pointer p-4 flex flex-col gap-2"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg flex-shrink-0">{typeInfo.icon}</span>
          <span className="text-sm font-medium text-t-1 truncate">{entry.name}</span>
        </div>
        <StatusBadge status={entry.status} />
      </div>

      {/* Type & Source */}
      <div className="flex items-center gap-2 text-xs text-t-4">
        <span className="badge badge-gray">{typeInfo.label}</span>
        <span>{getSystemLabel(entry.source_system)}</span>
      </div>

      {/* Version */}
      {entry.version_id && (
        <div className="text-xs text-t-4">
          v{entry.version_id}
          {entry.variant_id && <span className="ml-2 text-accent-400">{entry.variant_id}</span>}
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {tags.slice(0, 3).map((tag, i) => (
            <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-s-5/50 text-t-3">{tag}</span>
          ))}
          {tags.length > 3 && <span className="text-[10px] text-t-4">+{tags.length - 3}</span>}
        </div>
      )}

      {/* Footer */}
      <div className="text-[10px] text-t-4 mt-auto pt-1 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {formatDate(entry.updated_at)}
      </div>
    </div>
  );
}

// ── List Row ──────────────────────────────────
function ResourceRow({ entry, getTypeInfo, getSystemLabel, onClick }) {
  const typeInfo = getTypeInfo(entry.resource_type);
  const tags = parseJson(entry.tags, []);

  return (
    <div
      onClick={onClick}
      className="card-hover cursor-pointer px-4 py-3 flex items-center gap-4"
    >
      <span className="text-lg flex-shrink-0 w-8 text-center">{typeInfo.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-t-1 truncate">{entry.name}</div>
        <div className="text-xs text-t-4 flex items-center gap-2 mt-0.5">
          <span>{typeInfo.label}</span>
          <span>·</span>
          <span>{getSystemLabel(entry.source_system)}</span>
          {entry.version_id && (
            <>
              <span>·</span>
              <span>v{entry.version_id}</span>
            </>
          )}
        </div>
      </div>
      {tags.length > 0 && (
        <div className="flex items-center gap-1">
          <Tag className="w-3 h-3 text-t-4" />
          <span className="text-xs text-t-4">{tags.length}</span>
        </div>
      )}
      <StatusBadge status={entry.status} />
      <span className="text-xs text-t-4 w-24 text-right">{formatDate(entry.updated_at)}</span>
    </div>
  );
}

// ── Detail Panel (slide-in from right) ────────
function ResourceDetailPanel({ entry, getTypeInfo, getSystemLabel, onClose, navigate }) {
  const typeInfo = getTypeInfo(entry.resource_type);
  const tags = parseJson(entry.tags, []);
  const metadata = parseJson(entry.metadata, {});

  // Map source_system to navigation routes
  const SOURCE_ROUTES = {
    CONTENT_SYSTEM: { route: '/stories', label: 'Content & Script' },
    CHARACTER_SYSTEM: { route: '/characters', label: 'Characters' },
    CONTEXT_SYSTEM: { route: '/worlds', label: 'World & Context' },
  };
  const sourceRoute = SOURCE_ROUTES[entry.source_system];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[420px] bg-s-2 border-l border-s-6/50 overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="px-5 py-4 border-b border-s-6/30 flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl">{typeInfo.icon}</span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-t-1 truncate">{entry.name}</h3>
              <p className="text-xs text-t-4">{typeInfo.label} · {getSystemLabel(entry.source_system)}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon flex-shrink-0">✕</button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Actions */}
          <div className="flex items-center gap-2">
            {sourceRoute && (
              <button
                onClick={() => { onClose(); navigate(sourceRoute.route); }}
                className="btn-secondary flex items-center gap-1.5 text-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open in {sourceRoute.label}
              </button>
            )}
          </div>

          {/* Status & Version */}
          <div className="flex items-center gap-3">
            <StatusBadge status={entry.status} />
            {entry.version_id && (
              <span className="text-sm text-t-3">Version {entry.version_id}</span>
            )}
            {entry.variant_id && (
              <span className="text-sm text-accent-400">Variant: {entry.variant_id}</span>
            )}
          </div>

          {/* Source Reference */}
          <div className="card p-3 space-y-2">
            <h4 className="text-xs font-medium text-t-3 uppercase tracking-wider">Source Reference</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-t-4">System</span>
                <p className="text-t-2">{getSystemLabel(entry.source_system)}</p>
              </div>
              <div>
                <span className="text-t-4">Source ID</span>
                <p className="text-t-2 font-mono text-[10px] truncate">{entry.source_id}</p>
              </div>
              <div>
                <span className="text-t-4">Type</span>
                <p className="text-t-2">{typeInfo.label}</p>
              </div>
              <div>
                <span className="text-t-4">Catalog ID</span>
                <p className="text-t-2 font-mono text-[10px] truncate">{entry.id}</p>
              </div>
            </div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-t-3 uppercase tracking-wider mb-2">Tags</h4>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag, i) => (
                  <span key={i} className="px-2 py-1 rounded-md text-xs bg-s-5/50 text-t-2 border border-s-6/30">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          {Object.keys(metadata).length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-t-3 uppercase tracking-wider mb-2">Metadata</h4>
              <div className="card p-3 space-y-1">
                {Object.entries(metadata).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-xs">
                    <span className="text-t-4">{formatStatus(key)}</span>
                    <span className="text-t-2 font-mono">{typeof value === 'string' ? value : JSON.stringify(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="text-xs text-t-4 space-y-1 pt-2 border-t border-s-6/30">
            <div>Created: {formatDate(entry.created_at)}</div>
            <div>Updated: {formatDate(entry.updated_at)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
