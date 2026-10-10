import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban, Clapperboard, CheckCircle2, Film,
  Workflow, Box, Server, Sparkles, Eye, Clock,
  ArrowRight, Play, AlertTriangle, GitBranch, ShieldCheck, Activity
} from 'lucide-react';
import PageHeader from '../../components/Layout/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import { PROJECT_TYPES, formatDate, formatStatus, GENERATION_STATUSES } from '../../utils/helpers';

const api = window.api;

function StatCard({ icon: Icon, label, value, color, onClick }) {
  return (
    <div
      className={`stat-card group ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-2xl font-bold text-t-1">{value}</div>
          <div className="text-xs text-t-3">{label}</div>
        </div>
      </div>
    </div>
  );
}

const ATTEMPT_STATUS_STYLE = {
  generating: 'badge-cyan',
  generated: 'badge-blue',
  review: 'badge-yellow',
  approved: 'badge-green',
  rejected: 'badge-red',
  failed: 'badge-red',
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [enhanced, setEnhanced] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const data = await api.getDashboardStats();
    setStats(data);
    // Load enhanced stats (dependency/validation overview)
    try {
      const enh = await api.getEnhancedDashboardStats();
      setEnhanced(enh);
    } catch { /* enhanced stats are optional */ }
  }

  if (!stats) {
    return <div className="flex items-center justify-center h-64 text-t-4">Loading...</div>;
  }

  return (
    <div className="w-full">
      <PageHeader title="Dashboard" subtitle="AI Video Production Workspace" />

      {/* Top stats — 2 rows */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard icon={FolderKanban} label="Projects" value={stats.totalProjects} color="bg-accent-600/20 text-accent-400" onClick={() => navigate('/projects')} />
        <StatCard icon={Workflow} label="Workflows" value={stats.totalWorkflows} color="bg-cyan-600/20 text-cyan-400" onClick={() => navigate('/workflows')} />
        <StatCard icon={Sparkles} label="Generations" value={stats.totalAttempts} color="bg-purple-600/20 text-purple-400" onClick={() => navigate('/history')} />
        <StatCard icon={Box} label="Catalog Resources" value={stats.totalCatalogEntries} color="bg-pink-600/20 text-pink-400" onClick={() => navigate('/resource-library')} />
      </div>

      <div className="grid grid-cols-4 gap-3 mb-8">
        <StatCard icon={Clapperboard} label="In Production" value={stats.inProduction} color="bg-amber-600/20 text-amber-400" />
        <StatCard icon={Play} label="Workflow Runs" value={stats.totalRuns} color="bg-teal-600/20 text-teal-400" />
        <StatCard icon={Eye} label="Pending Reviews" value={stats.pendingReviews} color="bg-yellow-600/20 text-yellow-400" onClick={() => navigate('/history')} />
        <StatCard icon={Server} label="Active Providers" value={stats.activeProviders} color="bg-emerald-600/20 text-emerald-400" onClick={() => navigate('/providers')} />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-2 gap-4">
        {/* Recent projects */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-t-2">Recent Projects</h2>
            <button onClick={() => navigate('/projects')} className="text-xs text-accent-400 hover:text-accent-300 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {stats.recentProjects.length === 0 ? (
            <p className="text-sm text-t-4 py-4 text-center">No projects yet.</p>
          ) : (
            <div className="space-y-1">
              {stats.recentProjects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-s-4/50 cursor-pointer transition-all duration-200"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FolderKanban className="w-4 h-4 text-t-4 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-t-1 truncate">{p.name}</div>
                      <div className="text-xs text-t-4">{PROJECT_TYPES[p.type]} · {formatDate(p.updated_at)}</div>
                    </div>
                  </div>
                  <StatusBadge status={p.production_status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent workflows */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-t-2">Recent Workflows</h2>
            <button onClick={() => navigate('/workflows')} className="text-xs text-accent-400 hover:text-accent-300 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {stats.recentWorkflows.length === 0 ? (
            <p className="text-sm text-t-4 py-4 text-center">No workflows yet.</p>
          ) : (
            <div className="space-y-1">
              {stats.recentWorkflows.map((w) => (
                <div
                  key={w.id}
                  onClick={() => navigate(`/workflows/${w.id}`)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-s-4/50 cursor-pointer transition-all duration-200"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Workflow className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-t-1 truncate">{w.name}</div>
                      <div className="text-xs text-t-4">{formatDate(w.updated_at)}</div>
                    </div>
                  </div>
                  <StatusBadge status={w.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent generation attempts */}
      <div className="card mt-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-t-2">Recent Generations</h2>
          <button onClick={() => navigate('/history')} className="text-xs text-accent-400 hover:text-accent-300 flex items-center gap-1">
            View history <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {stats.recentAttempts.length === 0 ? (
          <p className="text-sm text-t-4 py-4 text-center">No generation attempts yet. Create a workflow and run it to generate content.</p>
        ) : (
          <div className="space-y-1">
            {stats.recentAttempts.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-s-4/50 transition-all duration-200"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-t-1 truncate">
                      {a.node_label || 'Unknown Node'} · #{a.attempt_number}
                    </div>
                    <div className="text-xs text-t-4">
                      {a.workflow_name || 'Unknown Workflow'} · {formatDate(a.created_at)}
                    </div>
                  </div>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${ATTEMPT_STATUS_STYLE[a.status] || 'badge-gray'}`}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Production Health Panel */}
      {enhanced && (
        <div className="grid grid-cols-3 gap-4 mt-4">
          {/* Running Jobs */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-t-2">Active Jobs</h2>
            </div>
            <div className="text-3xl font-bold text-t-1 mb-1">{enhanced.runningJobs}</div>
            <div className="text-xs text-t-4">workflow runs in progress</div>
            {enhanced.recentAttempts?.length > 0 && (
              <div className="mt-3 space-y-1">
                {enhanced.recentAttempts.map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-t-3">{formatStatus(a.status)}</span>
                    <span className="text-t-1 font-medium">{a.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dependency Issues */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <GitBranch className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-t-2">Dependency Health</h2>
            </div>
            {enhanced.depIssues?.length === 0 ? (
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">All Clear</span>
              </div>
            ) : (
              <div className="space-y-1">
                {enhanced.depIssues.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className={d.status === 'broken' || d.status === 'outdated' ? 'text-red-400' : 'text-amber-400'}>
                      {formatStatus(d.status)}
                    </span>
                    <span className="text-t-1 font-medium">{d.count}</span>
                  </div>
                ))}
              </div>
            )}
            <button
              className="mt-3 text-xs text-accent-400 hover:text-accent-300 flex items-center gap-1"
              onClick={() => navigate('/impact')}
            >
              View details <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Validation */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-t-2">Validation</h2>
            </div>
            {enhanced.validationSummary?.length === 0 ? (
              <div className="text-xs text-t-4 py-2">No validations run yet</div>
            ) : (
              <div className="space-y-1">
                {enhanced.validationSummary.slice(0, 6).map((v, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-t-3">{formatStatus(v.validation_level)} · {formatStatus(v.status)}</span>
                    <span className="text-t-1 font-medium">{v.count}</span>
                  </div>
                ))}
              </div>
            )}
            <button
              className="mt-3 text-xs text-accent-400 hover:text-accent-300 flex items-center gap-1"
              onClick={() => navigate('/validation')}
            >
              Validation center <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="card mt-4">
        <h2 className="text-sm font-semibold text-t-2 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'New Project', icon: FolderKanban, to: '/projects', color: 'text-accent-400' },
            { label: 'New Workflow', icon: Workflow, to: '/workflows', color: 'text-cyan-400' },
            { label: 'Resource Library', icon: Box, to: '/resource-library', color: 'text-pink-400' },
            { label: 'Configure Providers', icon: Server, to: '/providers', color: 'text-emerald-400' },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.to)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-s-3/50 border border-s-6/30 hover:border-accent-500/30 hover:bg-s-4/50 transition-all duration-200"
            >
              <action.icon className={`w-4 h-4 ${action.color}`} />
              <span className="text-sm font-medium text-t-2">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
