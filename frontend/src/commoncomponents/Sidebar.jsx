import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Building2,
  Users,
  Settings,
  Route,
  Flag,
  Store,
  DollarSign,
  FileText,
  ChevronLeft,
  Shield,
  Globe,
  Bot
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Projects', path: '/projects', icon: FolderKanban },
  { label: 'Divisions', path: '/divisions', icon: Building2 },
  { label: 'Initiatives', path: '/initiatives', icon: Flag },
  { label: 'Delivery Paths', path: '/delivery-paths', icon: Route },
  { label: 'Countries', path: '/countries', icon: Globe },
  { label: 'Budgets', path: '/budgets', icon: DollarSign },
  { label: 'AI Assistant', path: '/agent', icon: Bot },
  { label: 'Vendors', path: '/vendors', icon: Store },
  { label: 'Users', path: '/users', icon: Users, roles: ['superadmin', 'admin'] },
  { label: 'Project Roles', path: '/project-roles', icon: Shield, roles: ['superadmin'] },
  { label: 'Logs', path: '/logs', icon: FileText, roles: ['superadmin'] },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { role } = useAuth();

  const filteredItems = navItems.filter(
    item => !item.roles || item.roles.includes(role)
  );

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen bg-surface-sidebar transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
        {!collapsed && (
          <span className="text-lg font-bold text-white tracking-tight">
            ProjectTracker
          </span>
        )}
        <button
          onClick={onToggle}
          className={`rounded-lg p-1.5 text-text-sidebar hover:text-white hover:bg-white/10 transition-colors ${
            collapsed ? 'mx-auto' : ''
          }`}
        >
          <ChevronLeft
            size={18}
            className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="mt-2 px-2">
        {!collapsed && (
          <p className="mb-2 px-3 pt-3 text-[11px] font-semibold uppercase tracking-wider text-text-sidebar/50">
            Navigation
          </p>
        )}
        <ul className="space-y-0.5">
          {filteredItems.map(({ label, path, icon: Icon }) => (
            <li key={path}>
              <NavLink
                to={path}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-500/15 text-primary-400'
                      : 'text-text-sidebar hover:bg-white/5 hover:text-text-sidebar-active'
                  } ${collapsed ? 'justify-center' : ''}`
                }
                title={collapsed ? label : undefined}
              >
                <Icon size={20} className="shrink-0" />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
