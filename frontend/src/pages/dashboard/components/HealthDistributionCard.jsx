const colorById = {
  1: '#f5222d',
  2: '#faad14',
  3: '#52c41a',
};
const fallbackColor = '#8c8c8c';

export default function HealthDistributionCard({ distribution = [] }) {
  const total = distribution.reduce((sum, h) => sum + h.count, 0);

  return (
    <div className="rounded-lg border border-border bg-surface-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-text-secondary">Health Distribution</p>
        <span className="text-2xl font-bold text-text-primary">{total}</span>
      </div>

      {total > 0 && (
        <div className="mb-3 flex h-2 overflow-hidden rounded-full bg-surface">
          {distribution.map(h => {
            const color = colorById[h.id] || fallbackColor;
            return (
              <div
                key={h.id}
                style={{ width: `${(h.count / total) * 100}%`, backgroundColor: color }}
                title={`${h.name || 'Unknown'}: ${h.count}`}
              />
            );
          })}
        </div>
      )}

      {total === 0 ? (
        <p className="text-xs text-text-secondary">No data</p>
      ) : (
        <div className="space-y-1.5">
          {distribution.map(h => {
            const color = colorById[h.id] || fallbackColor;
            const pct = Math.round((h.count / total) * 100);
            return (
              <div key={h.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs text-text-secondary">{h.name || 'Unknown'}</span>
                </div>
                <span className="text-xs font-semibold text-text-primary">{h.count} <span className="font-normal text-text-secondary">({pct}%)</span></span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
