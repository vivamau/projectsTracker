import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../commoncomponents/Sidebar';
import Header from '../commoncomponents/Header';

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const toggle = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar collapsed={collapsed} onToggle={toggle} />

      <div
        className={`transition-all duration-300 ${
          collapsed ? 'ml-16' : 'ml-60'
        }`}
      >
        <Header onMenuClick={toggle} />

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
