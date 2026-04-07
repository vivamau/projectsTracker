import Card from '../../../commoncomponents/Card';

// Color by known type id; unknown types get gray
const colorById = {
  1: { bar: 'bg-error-500',   dot: 'bg-error-500' },
  2: { bar: 'bg-warning-500', dot: 'bg-warning-500' },
  3: { bar: 'bg-success-500', dot: 'bg-success-500' },
};
const fallbackColor = { bar: 'bg-gray-300', dot: 'bg-gray-300' };

export default function HealthChart({ distribution = [] }) {
  const total = distribution.reduce((sum, h) => sum + h.count, 0);

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
        {distribution.map((h) => {
          const colors = colorById[h.id] || fallbackColor;
          const pct = (h.count / total) * 100;
          return (
            <div
              key={h.id}
              className={`${colors.bar} transition-all duration-500`}
              style={{ width: `${pct}%` }}
              title={`${h.name || 'Unknown'}: ${h.count}`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {distribution.map((h) => {
          const colors = colorById[h.id] || fallbackColor;
          const pct = Math.round((h.count / total) * 100);
          return (
            <div key={h.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${colors.dot}`} />
                <span className="text-text-primary">{h.name || 'Unknown'}</span>
              </div>
              <span className="font-medium text-text-secondary">
                {h.count} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
