const statusConfig = {
  development:     { color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  improvement:     { color: 'bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-300' },
  maintenance:     { color: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' },
  support:         { color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  discovery:       { color: 'bg-warning-50 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300' },
  queued:          { color: 'bg-surface text-text-secondary border border-border' },
  discontinued:    { color: 'bg-error-50 text-error-700 dark:bg-error-900/30 dark:text-error-300' },
  ended:           { color: 'bg-surface text-text-secondary border border-border' },
  'support ended': { color: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
};

export default function ProjectStatusBadge({ status }) {
  if (!status) return <span className="text-text-secondary text-sm">—</span>;

  const key = status.toLowerCase();
  const config = statusConfig[key] || { color: 'bg-surface text-text-secondary border border-border' };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${config.color}`}>
      {status}
    </span>
  );
}
