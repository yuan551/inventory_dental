import React, { useMemo } from "react";

export const MonthlyUsageTrendSection = ({ series = [], months = ["Jan","Feb","Mar","Apr","May","Jun"] }) => {
  const width = 400;
  const height = 200;
  const padding = { left: 28, right: 12, top: 10, bottom: 22 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const maxY = useMemo(() => {
    const flat = series.flatMap(s => s.data || []);
    const m = Math.max(1, ...flat, 0);
    // round up to a neat step
    const step = 50;
    return Math.ceil(m / step) * step;
  }, [series]);

  const yTicks = useMemo(() => {
    const ticks = [];
    const steps = 6;
    for (let i = steps; i >= 0; i--) {
      ticks.push(Math.round((maxY / steps) * i));
    }
    return ticks;
  }, [maxY]);

  const pathFor = (arr) => {
    if (!arr || arr.length === 0) return '';
    const stepX = innerW / (months.length - 1);
    const points = arr.map((v, i) => {
      const x = padding.left + i * stepX;
      const y = padding.top + innerH * (1 - (v / maxY));
      return [x, y];
    });
    return points.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  };

  // Tooltip state
  const [hover, setHover] = React.useState(null); // {x,y, monthIndex, values: [{label,color,value}]}

  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const stepX = innerW / (months.length - 1);
    let i = Math.round((x - padding.left) / stepX);
    i = Math.max(0, Math.min(months.length - 1, i));
    const cx = padding.left + i * stepX;
    const cy = padding.top; // not used; just place tooltip relative to cursor
    const values = series.map((s) => ({ label: s.label, color: s.color, value: s.data?.[i] ?? 0 }));
    setHover({ x: cx, y: cy, monthIndex: i, values });
  };
  const handleLeave = () => setHover(null);

  return (
    <div className="h-64 bg-gradient-to-br from-purple-100 via-blue-100 to-teal-100 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100 relative overflow-hidden p-4">
      {/* Y-axis labels */}
      <div className="absolute left-2 top-4 bottom-8 flex flex-col justify-between text-xs text-gray-500">
        {yTicks.map((t) => (<span key={t}>{t}</span>))}
      </div>

      {/* Chart Area */}
      <div className="ml-8 mr-4 h-full relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full absolute inset-0"
             onMouseMove={handleMove} onMouseLeave={handleLeave}>
          {/* Lines */}
          {series.map((s, idx) => (
            <path key={idx} d={pathFor(s.data)} stroke={s.color || '#3bc3de'} strokeWidth="3" fill="none" opacity="0.9" />
          ))}
          {/* Hover guide and points */}
          {hover && (
            <>
              <line x1={hover.x} y1={padding.top} x2={hover.x} y2={height - padding.bottom} stroke="#111827" strokeOpacity="0.15" />
              {series.map((s, idx) => {
                const stepX = innerW / (months.length - 1);
                const x = padding.left + hover.monthIndex * stepX;
                const val = s.data?.[hover.monthIndex] ?? 0;
                const y = padding.top + innerH * (1 - (val / maxY));
                return <circle key={idx} cx={x} cy={y} r={4} fill={s.color || '#3bc3de'} stroke="#fff" strokeWidth={2} />;
              })}
            </>
          )}
        </svg>
        {/* Tooltip */}
        {hover && (
          <div className="absolute z-10 bg-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-gray-200 px-3 py-2"
               style={{ left: Math.min(Math.max(hover.x + 10, 8), width - 160), top: 12 }}>
            <div className="[font-family:'Inter',Helvetica] text-gray-900 text-xs font-semibold mb-1">{months[hover.monthIndex]}</div>
            <div className="space-y-1">
              {hover.values.map((v) => (
                <div key={v.label} className="flex items-center gap-2 text-xs text-gray-700">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: v.color }} />
                  <span className="min-w-[80px]">{v.label}</span>
                  <span className="font-semibold">{v.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* X-axis labels */}
      <div className="absolute bottom-2 left-8 right-4 flex justify-between text-xs text-gray-500">
        {months.map((m) => (<span key={m}>{m}</span>))}
      </div>
    </div>
  );
};