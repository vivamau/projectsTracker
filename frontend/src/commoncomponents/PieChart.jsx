function describeArc(cx, cy, r, startAngle, endAngle) {
  const clampedEnd = Math.min(endAngle, startAngle + 359.9999);
  const startRad = (clampedEnd - 90) * Math.PI / 180;
  const endRad = (startAngle - 90) * Math.PI / 180;

  const x1 = cx + r * Math.cos(endRad);
  const y1 = cy + r * Math.sin(endRad);
  const x2 = cx + r * Math.cos(startRad);
  const y2 = cy + r * Math.sin(startRad);

  const largeArc = clampedEnd - startAngle > 180 ? 1 : 0;

  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

export default function PieChart({ data, size = 200, colors }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-sm text-text-secondary italic">No data</span>
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-sm text-text-secondary italic">No data</span>
      </div>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 10;
  let currentAngle = 0;

  const slices = data.map((item, i) => {
    const percentage = (item.count / total) * 100;
    const sliceAngle = (item.count / total) * 360;
    const path = describeArc(cx, cy, r, currentAngle, currentAngle + sliceAngle);
    const midAngle = currentAngle + sliceAngle / 2;
    const midRad = (midAngle - 90) * Math.PI / 180;
    const labelX = cx + (r * 0.65) * Math.cos(midRad);
    const labelY = cy + (r * 0.65) * Math.sin(midRad);
    const startAngle = currentAngle;
    currentAngle += sliceAngle;

    return {
      path,
      labelX,
      labelY,
      percentage,
      color: colors[i % colors.length],
      label: item.action || item.entity_type || item.label
    };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((slice, i) => (
        <g key={i}>
          <path
            d={slice.path}
            fill={slice.color}
            stroke="var(--surface, #1e1e2e)"
            strokeWidth="2"
            className="transition-opacity hover:opacity-80"
          />
          {slice.percentage > 5 && (
            <text
              x={slice.labelX}
              y={slice.labelY}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-white text-xs font-bold pointer-events-none"
              style={{ fontSize: '11px' }}
            >
              {Math.round(slice.percentage)}%
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
