const GROUPS = [
  { key: 'queued',    label: 'Queued',    color: '#faad14' },
  { key: 'discovery', label: 'Discovery', color: '#1677ff' },
  { key: 'active',    label: 'Active',    color: '#52c41a' },
  { key: 'ended',     label: 'Ended',     color: '#8c8c8c' },
];

export default function ProjectGroupsCard({ groupCounts = {} }) {
  const total = GROUPS.reduce((sum, g) => sum + (groupCounts[g.key] || 0), 0);

  return (
    <div className="rounded-lg border border-border bg-surface-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-text-secondary">Projects by Group</p>
        <span className="text-2xl font-bold text-text-primary">{total}</span>
      </div>

      {/* Stacked bar */}
      {total > 0 && (
        <div className="mb-3 flex h-2 overflow-hidden rounded-full bg-surface">
          {GROUPS.map(g => {
            const count = groupCounts[g.key] || 0;
            if (count === 0) return null;
            return (
              <div
                key={g.key}
                style={{ width: `${(count / total) * 100}%`, backgroundColor: g.color }}
                title={`${g.label}: ${count}`}
              />
            );
          })}
        </div>
      )}

      <div className="space-y-1.5">
        {GROUPS.map(g => (
          <div key={g.key} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: g.color }} />
              <span className="text-xs text-text-secondary">{g.label}</span>
            </div>
            <span className="text-xs font-semibold text-text-primary">{groupCounts[g.key] || 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
