import { Target, Trash2 } from 'lucide-react';

function getMilestoneState(completion) {
  if (completion.completion_value === 100) {
    return 'completed';
  }
  if (completion.completion_value === 0 && completion.completion_start_date) {
    const startDate = new Date(completion.completion_start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (startDate > today) {
      return 'future';
    }
  }
  return 'inprogress';
}

function formatDateRange(completion, formatDate) {
  if (completion.completion_start_date && completion.completion_end_date) {
    return `${formatDate(completion.completion_start_date)} – ${formatDate(completion.completion_end_date)}`;
  }
  if (completion.completion_start_date) {
    return `Started: ${formatDate(completion.completion_start_date)}`;
  }
  if (completion.completion_end_date) {
    return `Due: ${formatDate(completion.completion_end_date)}`;
  }
  return `Created: ${formatDate(completion.completion_create_date)}`;
}

const stateConfig = {
  completed: {
    dot: 'bg-success-500',
    ring: '',
    badge: 'bg-success-50 text-success-600',
  },
  inprogress: {
    dot: 'bg-primary-500 ring-2 ring-primary-200',
    ring: '',
    badge: 'bg-primary-50 text-primary-600',
  },
  future: {
    dot: 'bg-surface border-2 border-border-dark',
    ring: '',
    badge: 'bg-surface text-text-secondary',
  },
};

export default function MilestoneTimeline({ completions, isAdmin, onDelete, formatDate }) {
  if (completions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-text-secondary">
        <Target size={32} className="opacity-40" />
        <p className="text-sm">No milestones recorded yet</p>
      </div>
    );
  }

  const sorted = [...completions].sort((a, b) => {
    const ta = a.completion_start_date ?? a.completion_create_date;
    const tb = b.completion_start_date ?? b.completion_create_date;
    return ta - tb;
  });

  return (
    <div className="space-y-0">
      {sorted.map((completion, index) => {
        const state = getMilestoneState(completion);
        const config = stateConfig[state];
        const dateRange = formatDateRange(completion, formatDate);
        const authorLine = completion.user_name
          ? `${completion.user_name}${completion.user_lastname ? ` ${completion.user_lastname}` : ''}`
          : null;

        return (
          <div key={completion.id} className="flex gap-3">
            {/* Left Column: Dot and Connector Line */}
            <div className="flex flex-col items-center flex-shrink-0">
              {/* Dot */}
              <div
                className={`w-4 h-4 rounded-full flex-shrink-0 mt-1 ${config.dot}`}
              />
              {/* Connector Line (not on last item) */}
              {index < sorted.length - 1 && (
                <div className="w-px flex-1 min-h-[2rem] bg-border" />
              )}
            </div>

            {/* Right Column: Content */}
            <div className="flex-1 min-w-0 pb-4">
              {/* Top Row: Badge, Comment, Delete Button */}
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-start gap-2 min-w-0">
                  {/* Badge */}
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold flex-shrink-0 mt-0.5 ${config.badge}`}
                  >
                    {completion.completion_value}%
                  </span>
                  {/* Comment */}
                  <p className="text-sm font-medium text-text-primary min-w-0 break-words">
                    {completion.completion_comment || 'Milestone update'}
                  </p>
                </div>
                {/* Delete Button */}
                {isAdmin && (
                  <button
                    onClick={() => onDelete(completion.id)}
                    className="text-text-secondary hover:text-error-500 transition-colors flex-shrink-0 p-1"
                    title="Remove milestone"
                    type="button"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {/* Date Range Row */}
              <p className="text-xs text-text-secondary mb-1">{dateRange}</p>

              {/* Author Row */}
              {authorLine && (
                <p className="text-xs text-text-secondary">{authorLine}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
