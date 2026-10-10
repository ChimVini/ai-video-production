import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, ChevronDown, Check } from 'lucide-react';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import { RESOURCE_TYPES, SOURCE_SYSTEMS, parseJson } from '../../utils/helpers';

/**
 * ResourcePicker — modal for selecting a resource catalog entry.
 * Used by the Production Canvas when creating DATA nodes.
 *
 * Props:
 *   isOpen: boolean
 *   onClose: () => void
 *   onSelect: (entry) => void — called with the selected catalog entry
 *   filterType: string (optional) — pre-filter by resource_type
 *   filterSystem: string (optional) — pre-filter by source_system
 *   excludeIds: string[] (optional) — IDs to exclude (already in workflow)
 */
export default function ResourcePicker({ isOpen, onClose, onSelect, filterType = '', filterSystem = '', excludeIds = [] }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState(filterType);
  const [systemFilter, setSystemFilter] = useState(filterSystem);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {};
      if (typeFilter) filters.resource_type = typeFilter;
      if (systemFilter) filters.source_system = systemFilter;
      if (search) filters.search = search;
      const data = await window.api.getResourceCatalog(filters);
      setEntries(data.filter(e => !excludeIds.includes(e.id)));
    } catch (err) {
      console.error('ResourcePicker: Failed to load:', err);
    }
    setLoading(false);
  }, [typeFilter, systemFilter, search, excludeIds]);

  useEffect(() => {
    if (isOpen) loadEntries();
  }, [isOpen, loadEntries]);

  const handleSelect = (entry) => {
    onSelect(entry);
    onClose();
  };

  const getTypeInfo = (type) => RESOURCE_TYPES.find(t => t.value === type) || { label: type, icon: '•' };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Resource" wide>
      <div className="space-y-4">
        {/* Search & Filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-t-4" />
            <input
              type="text"
              placeholder="Search resources..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9 w-full"
              autoFocus
            />
          </div>
          <div className="relative">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="select pr-8 appearance-none text-xs"
            >
              <option value="">All Types</option>
              {RESOURCE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-t-4 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={systemFilter}
              onChange={e => setSystemFilter(e.target.value)}
              className="select pr-8 appearance-none text-xs"
            >
              <option value="">All Systems</option>
              {SOURCE_SYSTEMS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-t-4 pointer-events-none" />
          </div>
        </div>

        {/* Entry List */}
        <div className="max-h-[400px] overflow-y-auto space-y-1.5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <RefreshCw className="w-5 h-5 text-t-4 animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-10 text-sm text-t-4">
              No resources found. Try syncing the catalog first.
            </div>
          ) : (
            entries.map(entry => {
              const info = getTypeInfo(entry.resource_type);
              const tags = parseJson(entry.tags, []);
              return (
                <button
                  key={entry.id}
                  onClick={() => handleSelect(entry)}
                  className="w-full text-left px-3 py-2.5 rounded-lg border border-s-6/30 hover:border-accent-500/50 hover:bg-s-4/30 transition-colors flex items-center gap-3 group"
                >
                  <span className="text-lg flex-shrink-0">{info.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-t-1 truncate">{entry.name}</div>
                    <div className="text-xs text-t-4 flex items-center gap-1.5 mt-0.5">
                      <span>{info.label}</span>
                      {entry.version_id && <span>· v{entry.version_id}</span>}
                      {tags.length > 0 && <span>· {tags.length} tags</span>}
                    </div>
                  </div>
                  <StatusBadge status={entry.status} />
                  <Check className="w-4 h-4 text-accent-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
