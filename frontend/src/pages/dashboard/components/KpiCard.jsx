export default function KpiCard({ title, value, icon: Icon, color = 'primary', subtitle }) {
  const colorMap = {
    primary: 'bg-primary-50 text-primary-600',
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
    error: 'bg-error-50 text-error-600',
  };

  return (
    <div className="rounded-lg border border-border bg-surface-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-text-secondary">{title}</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-text-secondary">{subtitle}</p>
          )}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${colorMap[color]}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}
