import { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, LogOut, User, ChevronRight, Sun, Moon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import UserAvatar from './UserAvatar';

const pathLabels = {
  dashboard: 'Dashboard',
  projects: 'Projects',
  divisions: 'Divisions',
  initiatives: 'Initiatives',
  'delivery-paths': 'Delivery Paths',
  users: 'Users',
  settings: 'Settings',
  new: 'New',
  edit: 'Edit',
};

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const segments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = segments.map((seg, i) => ({
    label: pathLabels[seg] || (seg.match(/^\d+$/) ? `#${seg}` : seg),
    path: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1
  }));

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface-header px-6 shadow-sm transition-colors duration-200">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 hover:bg-surface-hover transition-colors lg:hidden"
        >
          <Menu size={20} />
        </button>

        <nav className="flex items-center gap-1 text-sm">
          <Link to="/dashboard" className="text-text-secondary hover:text-primary-500 transition-colors">
            Home
          </Link>
          {breadcrumbs.map((crumb) => (
            <span key={crumb.path} className="flex items-center gap-1">
              <ChevronRight size={14} className="text-text-secondary/50" />
              {crumb.isLast ? (
                <span className="font-medium text-text-primary">{crumb.label}</span>
              ) : (
                <Link to={crumb.path} className="text-text-secondary hover:text-primary-500 transition-colors">
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 hover:bg-surface-hover transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-hover transition-colors"
          >
            <UserAvatar seed={user?.user_avatar_seed || user?.user_email} name={user?.user_name} size={32} />
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium leading-tight">
                {user?.user_name} {user?.user_lastname}
              </p>
              <p className="text-xs text-text-secondary capitalize">{user?.role}</p>
            </div>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-border bg-surface-card py-1 shadow-lg">
              <div className="border-b border-border px-4 py-2">
                <p className="text-sm font-medium truncate">{user?.user_email}</p>
                <p className="text-xs text-text-secondary capitalize">{user?.role}</p>
              </div>
              <Link
                to="/settings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-text-primary hover:bg-surface-hover transition-colors"
              >
                <User size={16} />
                Profile
              </Link>
              <button
                onClick={() => { setMenuOpen(false); logout(); }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-error-500 hover:bg-error-50 transition-colors"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
