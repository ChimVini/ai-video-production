import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FolderKanban, BookOpen, Users, Globe,
  Palette, Clapperboard, Library, Film, Network
} from 'lucide-react';

const navItems = [
  {
    section: 'Overview',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/projects', icon: FolderKanban, label: 'Projects' },
    ],
  },
  {
    section: 'System 1 — Development',
    items: [
      { to: '/stories', icon: BookOpen, label: 'Stories' },
      { to: '/characters', icon: Users, label: 'Characters' },
      { to: '/worlds', icon: Globe, label: 'Worlds' },
    ],
  },
  {
    section: 'System 2 — Visual',
    items: [
      { to: '/visual-assets', icon: Palette, label: 'Visual Assets' },
    ],
  },
  {
    section: 'System 3 — Production',
    items: [
      { to: '/production', icon: Clapperboard, label: 'Production' },
    ],
  },
  {
    section: 'Workspace',
    items: [
      { to: '/node-canvas', icon: Network, label: 'Node Workspace' },
    ],
  },
  {
    section: 'Library',
    items: [
      { to: '/resources', icon: Library, label: 'Resources' },
    ],
  },
];

export default function Sidebar() {
  return (
    <aside className="w-56 h-screen bg-s-2 border-r border-s-6/30 flex flex-col shrink-0">
      {/* App title */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-s-6/30 shrink-0 draggable">
        <div className="w-7 h-7 rounded-lg bg-accent-600/20 flex items-center justify-center">
          <Film className="w-4 h-4 text-accent-400" />
        </div>
        <span className="font-semibold text-sm text-t-1 tracking-tight">AI Video</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {navItems.map((group) => (
          <div key={group.section}>
            <div className="section-label">{group.section}</div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'active' : ''}`
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="h-12 border-t border-s-6/30 flex items-center px-4">
        <span className="text-[10px] text-t-4">v1.0.0 — MVP</span>
      </div>
    </aside>
  );
}
