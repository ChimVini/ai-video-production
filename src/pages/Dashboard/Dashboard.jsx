import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban, Clapperboard, CheckCircle2, Film,
  Library, TrendingUp
} from 'lucide-react';
import PageHeader from '../../components/Layout/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import { PROJECT_TYPES, formatDate } from '../../utils/helpers';

const api = window.api;

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="stat-card group">
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

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const data = await api.getDashboardStats();
    setStats(data);
  }

  if (!stats) {
    return <div className="flex items-center justify-center h-64 text-t-4">Loading...</div>;
  }

  return (
    <div className="w-full">
      <PageHeader title="Dashboard" subtitle="AI Video Production Pipeline Overview" />

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard icon={FolderKanban} label="Total Projects" value={stats.totalProjects} color="bg-accent-600/20 text-accent-400" />
        <StatCard icon={Clapperboard} label="In Production" value={stats.inProduction} color="bg-amber-600/20 text-amber-400" />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} color="bg-emerald-600/20 text-emerald-400" />
        <StatCard icon={Film} label="Total Shots" value={stats.totalShots} color="bg-purple-600/20 text-purple-400" />
        <StatCard icon={TrendingUp} label="Approved Shots" value={stats.approvedShots} color="bg-cyan-600/20 text-cyan-400" />
        <StatCard icon={Library} label="Resources" value={stats.totalResources} color="bg-pink-600/20 text-pink-400" />
      </div>

      {/* Recent projects */}
      <div className="card">
        <h2 className="text-sm font-semibold text-t-2 mb-4">Recent Projects</h2>
        {stats.recentProjects.length === 0 ? (
          <p className="text-sm text-t-4 py-4 text-center">No projects yet. Create your first project to get started.</p>
        ) : (
          <div className="space-y-1">
            {stats.recentProjects.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-s-4/50 cursor-pointer transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <FolderKanban className="w-4 h-4 text-t-4" />
                  <div>
                    <div className="text-sm font-medium text-t-1">{p.name}</div>
                    <div className="text-xs text-t-4">{PROJECT_TYPES[p.type]} · {formatDate(p.updated_at)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={p.production_status} />
                  <StatusBadge status={p.publishing_status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pipeline overview */}
      <div className="card mt-4">
        <h2 className="text-sm font-semibold text-t-2 mb-4">Production Pipeline</h2>
        <div className="flex items-center justify-between gap-2">
          {['Idea', 'Development', 'Visual Dev', 'Planning', 'Generation', 'Editing', 'Completed'].map((stage, i) => (
            <React.Fragment key={stage}>
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-8 h-8 rounded-full bg-s-4 border border-s-6/30 flex items-center justify-center text-xs font-bold text-t-3">
                  {i + 1}
                </div>
                <span className="text-[10px] text-t-4 text-center">{stage}</span>
              </div>
              {i < 6 && (
                <div className="flex-1 h-px bg-gradient-to-r from-s-6/60 to-s-6/20" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
