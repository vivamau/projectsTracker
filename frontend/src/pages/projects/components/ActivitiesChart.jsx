import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const formatDate = (ts) =>
  new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface p-3 text-xs shadow-lg">
      <p className="mb-2 font-semibold text-text-primary">{formatDate(label)}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-text-secondary">{entry.name}:</span>
          <span className="font-medium text-text-primary">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function ActivitiesChart({ activities }) {
  if (!activities || activities.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-secondary">No activity data available</p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={activities} margin={{ top: 4, right: 16, left: -16, bottom: 4 }}>
        <CartesianGrid strokeDashArray="3 3" className="stroke-border" />
        <XAxis
          dataKey="activity_to"
          tickFormatter={formatDate}
          tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          formatter={(value) => <span className="text-text-secondary">{value}</span>}
        />
        <Line
          type="monotone"
          dataKey="activity_planned_tickets"
          name="Planned"
          stroke="var(--color-primary-500)"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="activity_closed_tickets"
          name="Closed"
          stroke="#22c55e"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="activity_bug_tickets"
          name="Open bugs"
          stroke="#ef4444"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="activity_bug_closed_tickets"
          name="Bugs closed"
          stroke="#f97316"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
