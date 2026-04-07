import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

function CustomTooltip({ active, payload, total }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const value = payload[0].value;
    const percentage = ((value / total) * 100).toFixed(1);
    return (
      <div className="bg-surface-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium text-text-primary">{data.name}</p>
        <p className="text-sm text-text-secondary">
          {value} ({percentage}%)
        </p>
      </div>
    );
  }
  return null;
}

export default function RechartsDonutChart({ data, colors, dataKey = "count", nameKey = "name" }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-80">
        <span className="text-sm text-text-secondary italic">No data</span>
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d[dataKey], 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center w-full h-80">
        <span className="text-sm text-text-secondary italic">No data</span>
      </div>
    );
  }

  // Transform data to work with recharts - add name field if needed
  const chartData = data.map((item) => ({
    ...item,
    name: item[nameKey],
    value: item[dataKey],
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(entry) => {
            const percentage = ((entry.value / total) * 100).toFixed(0);
            return percentage > 5 ? `${percentage}%` : "";
          }}
          outerRadius={120}
          innerRadius={60}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip total={total} />} />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(value, entry) => entry.payload.name}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
