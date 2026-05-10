export default function ActivityStatsCard({ activityStats = {} }) {
  const { openTickets = 0, closedTickets = 0, openBugs = 0, closedBugs = 0,
          projectsReporting = 0, projectsNotReporting = 0 } = activityStats;

  return (
    <div className="rounded-lg border border-border bg-surface-card p-5 shadow-sm">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <p className="w-12 shrink-0 text-xs font-semibold uppercase tracking-wide text-text-secondary">Tickets</p>
          <div className="flex flex-1 gap-2">
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

        <div className="flex items-center gap-2">
          <p className="w-12 shrink-0 text-xs font-semibold uppercase tracking-wide text-text-secondary">Bugs</p>
          <div className="flex flex-1 gap-2">
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
