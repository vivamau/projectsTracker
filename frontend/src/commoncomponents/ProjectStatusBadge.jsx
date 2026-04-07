import { useTheme } from '../hooks/useTheme';

const statusConfig = {
  development:     { bg: '#dbeafe', text: '#1e40af', darkBg: '#1e3a5f', darkText: '#93c5fd' },
  improvement:     { bg: '#dcfce7', text: '#166534', darkBg: '#14532d', darkText: '#86efac' },
  maintenance:     { bg: '#ccfbf1', text: '#0f766e', darkBg: '#134e4a', darkText: '#5eead4' },
  support:         { bg: '#f3e8ff', text: '#6b21a8', darkBg: '#3b0764', darkText: '#d8b4fe' },
  discovery:       { bg: '#fef9c3', text: '#854d0e', darkBg: '#422006', darkText: '#fde047' },
  queued:          { bg: '#f3f4f6', text: '#374151', darkBg: '#1f2937', darkText: '#d1d5db' },
  discontinued:    { bg: '#fee2e2', text: '#991b1b', darkBg: '#450a0a', darkText: '#fca5a5' },
  ended:           { bg: '#f3f4f6', text: '#374151', darkBg: '#1f2937', darkText: '#d1d5db' },
  'support ended': { bg: '#ffedd5', text: '#9a3412', darkBg: '#431407', darkText: '#fdba74' },
};

const fallback = { bg: '#f3f4f6', text: '#374151', darkBg: '#1f2937', darkText: '#d1d5db' };

const displayLabel = {
  'support ended': 'S.Ended',
};

export default function ProjectStatusBadge({ status }) {
  const { theme } = useTheme();
  if (!status) return <span className="text-text-secondary text-sm">—</span>;

  const config = statusConfig[status.toLowerCase()] || fallback;
  const isDark = theme === 'dark';
  const label = displayLabel[status.toLowerCase()] ?? status;

  return (
    <span
      style={{
        backgroundColor: isDark ? config.darkBg : config.bg,
        color: isDark ? config.darkText : config.text,
      }}
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
    >
      {label}
    </span>
  );
}
