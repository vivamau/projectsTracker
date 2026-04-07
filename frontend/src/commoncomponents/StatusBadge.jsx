const statusConfig = {
  1: { label: 'At Risk', color: 'bg-error-50 text-error-600', dot: 'bg-error-500' },
  2: { label: 'N.Att', color: 'bg-warning-50 text-warning-600', dot: 'bg-warning-500' },
  3: { label: 'On Track', color: 'bg-success-50 text-success-600', dot: 'bg-success-500' },
};

const fallbackStyle = { color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };

export default function StatusBadge({ value, name }) {
  const config = statusConfig[value];
  const style = config || fallbackStyle;
  const label = name || config?.label;
  if (!label) return <span className="text-text-secondary text-sm">No status</span>;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {label}
    </span>
  );
}
