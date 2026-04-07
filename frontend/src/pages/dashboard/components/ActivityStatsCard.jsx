export default function ActivityStatsCard({ activityStats = {} }) {
  const { openTickets = 0, closedTickets = 0, openBugs = 0, closedBugs = 0,
          projectsReporting = 0, projectsNotReporting = 0 } = activityStats;

  return (
    <div className="rounded-lg border border-border bg-surface-card p-5 shadow-sm">
      <div className="flex gap-3">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-1.5">Tickets</p>
          <div className="flex gap-2">
            <div className="flex-1 rounded-lg bg-surface px-2 py-1.5 text-center">
              <p className="text-lg font-bold text-warning-600">{openTickets}</p>
              <p className="text-xs text-text-secondary">Open</p>
            </div>
            <div className="flex-1 rounded-lg bg-surface px-2 py-1.5 text-center">
              <p className="text-lg font-bold text-success-600">{closedTickets}</p>
              <p className="text-xs text-text-secondary">Closed</p>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-1.5">Bugs</p>
          <div className="flex gap-2">
            <div className="flex-1 rounded-lg bg-surface px-2 py-1.5 text-center">
              <p className="text-lg font-bold text-error-600">{openBugs}</p>
              <p className="text-xs text-text-secondary">Open</p>
            </div>
            <div className="flex-1 rounded-lg bg-surface px-2 py-1.5 text-center">
              <p className="text-lg font-bold text-success-600">{closedBugs}</p>
              <p className="text-xs text-text-secondary">Closed</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 space-y-0.5">
        <p className="text-xs text-text-secondary"><span className="text-success-600 font-medium">{projectsReporting}</span> projects reporting</p>
        <p className="text-xs text-text-secondary"><span className="text-warning-600 font-medium">{projectsNotReporting}</span> projects not reporting</p>
      </div>
    </div>
  );
}
