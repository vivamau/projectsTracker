import { useAuth } from '../../hooks/useAuth';
import Card from '../../commoncomponents/Card';

export default function SettingsPage() {
  const { user } = useAuth();

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
    </div>
  );
}
