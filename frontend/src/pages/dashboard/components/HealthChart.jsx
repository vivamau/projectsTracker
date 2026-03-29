import Card from '../../../commoncomponents/Card';

const healthLabels = {
  1: { label: 'At Risk', color: 'bg-error-500' },
  2: { label: 'Needs Attention', color: 'bg-warning-500' },
  3: { label: 'On Track', color: 'bg-success-500' },
  none: { label: 'No Status', color: 'bg-gray-300' },
};

export default function HealthChart({ distribution = {} }) {
  const entries = Object.entries(distribution);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  if (total === 0) {
    return (
      <Card title="Health Distribution">
        <p className="text-center text-sm text-text-secondary py-8">No data available</p>
      </Card>
    );
  }

  return (
    <Card title="Health Distribution">
      {/* Bar */}
      <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-surface">
        {entries.map(([key, count]) => {
          const config = healthLabels[key] || healthLabels.none;
          const pct = (count / total) * 100;
          return (
            <div
              key={key}
              className={`${config.color} transition-all duration-500`}
              style={{ width: `${pct}%` }}
              title={`${config.label}: ${count}`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {entries.map(([key, count]) => {
          const config = healthLabels[key] || healthLabels.none;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={key} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${config.color}`} />
                <span className="text-text-primary">{config.label}</span>
              </div>
              <span className="font-medium text-text-secondary">
                {count} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
