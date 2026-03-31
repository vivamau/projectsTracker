import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../commoncomponents/Card';
import SeniorityManagementModal from './SeniorityManagementModal';

export default function SettingsPage() {
  const { user } = useAuth();
  const [seniorityModalOpen, setSeniorityModalOpen] = useState(false);

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-sm text-text-secondary">Account information</p>
      </div>

      <Card title="Profile">
        <div className="flex items-center gap-4 mb-6">
          <img
            src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.user_email || '')}&backgroundColor=1677ff&textColor=ffffff&size=64`}
            alt="avatar"
            className="h-16 w-16 rounded-full"
            crossOrigin="anonymous"
          />
          <div>
            <p className="text-lg font-semibold">{user?.user_name} {user?.user_lastname}</p>
            <p className="text-sm text-text-secondary capitalize">{user?.role}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between border-b border-border pb-3">
            <span className="text-sm text-text-secondary">Email</span>
            <span className="text-sm font-medium">{user?.user_email}</span>
          </div>
          <div className="flex justify-between border-b border-border pb-3">
            <span className="text-sm text-text-secondary">Role</span>
            <span className="text-sm font-medium capitalize">{user?.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-text-secondary">Member since</span>
            <span className="text-sm font-medium">
              {user?.user_create_date ? new Date(user.user_create_date).toLocaleDateString() : '-'}
            </span>
          </div>
        </div>
      </Card>

      <Card title="Vendor Management" className="mt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <h3 className="font-medium text-text-primary">Seniority Levels</h3>
              <p className="text-sm text-text-secondary">Manage vendor staff seniority classifications</p>
            </div>
            <button
              onClick={() => setSeniorityModalOpen(true)}
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
            >
              Manage
            </button>
          </div>
        </div>
      </Card>

      <SeniorityManagementModal
        open={seniorityModalOpen}
        onClose={() => setSeniorityModalOpen(false)}
      />
    </div>
  );
}
