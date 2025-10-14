import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
} from "recharts";

/*
  Redesigned using Recharts for richer interactivity & a visual style similar to the provided reference:
  - Soft card background + subtle border & shadow
  - Smoothed lines with area fill opacity
  - Custom tooltip styling
  - Legend with colored dots
  - Responsive width
*/

export const MonthlyUsageTrendSection = ({
  series = [],
  months = ["January","February","March","April","May","June","July","August","September","October","November","December"],
}) => {
  // Build combined data for Recharts: one object per month { month, Series1Label: value, ... }
  const data = useMemo(() => {
    return months.map((m, idx) => {
      const o = { month: m };
      series.forEach((s) => {
        o[s.label] = s.data?.[idx] ?? 0;
      });
      return o;
    });
  }, [months, series]);

  // Determine a nice max domain
  const maxY = useMemo(() => {
    const vals = series.flatMap((s) => s.data || []);
    const m = Math.max(0, ...vals, 0);
    if (m <= 10) return 10; // small cap
    const pow = Math.pow(10, Math.floor(Math.log10(m)));
    return Math.ceil(m / pow) * pow;
  }, [series]);

  const colors = series.map((s, i) => s.color || ["#2563eb","#dc2626","#059669"][i % 3]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    // De-duplicate entries (Area + Line produce two payload entries per dataKey)
    const unique = [];
    const seen = new Set();
    payload.forEach(p => {
      if (!seen.has(p.dataKey)) {
        seen.add(p.dataKey);
        unique.push(p);
      }
    });
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 px-4 py-3 text-xs">
        <div className="font-semibold text-gray-900 mb-1">{label}</div>
        <div className="space-y-1">
          {unique.map((p) => (
            <div key={p.dataKey} className="flex items-center gap-2 text-gray-700">
              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="min-w-[90px]">{p.dataKey}</span>
              <span className="font-semibold">{p.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderLegend = ({ payload }) => {
    if (!payload) return null;
    const unique = [];
    const seen = new Set();
    payload.forEach(p => {
      if (!seen.has(p.value)) {
        seen.add(p.value);
        unique.push(p);
      }
    });
    return (
      <div className="flex flex-wrap gap-x-6 gap-y-2 px-2 pb-2 text-xs font-medium">
        {unique.map(entry => (
          <div key={entry.value} className="flex items-center gap-1.5 text-gray-700">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.value}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full min-h-[16rem] bg-gradient-to-r from-amber-50 via-white to-amber-50 rounded-xl shadow border border-amber-100 p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 20% 20%, rgba(255,212,130,0.25), transparent 60%)" }} />
      <div className="h-full flex flex-col">
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={data} margin={{ top: 10, left: 10, right: 10, bottom: 0 }}>
              <defs>
                {series.map((s, i) => (
                  <linearGradient key={s.label} id={`color-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors[i]} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={colors[i]} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280' }} stroke="#D1D5DB" axisLine={{ stroke: '#E5E7EB' }} tickLine={false} />
              <YAxis domain={[0, maxY]} tick={{ fontSize: 11, fill: '#6B7280' }} stroke="#D1D5DB" axisLine={{ stroke: '#E5E7EB' }} tickLine={false} width={38} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#374151', strokeOpacity: 0.15 }} />
              <Legend verticalAlign="top" align="left" content={renderLegend} height={36} />
              {series.map((s, i) => (
                <React.Fragment key={`series-${s.label}-${i}`}>
                  <Area
                    type="monotone"
                    dataKey={s.label}
                    stroke={colors[i]}
                    strokeWidth={2.5}
                    fill={`url(#color-${i})`}
                    fillOpacity={0.12}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    key={`l-${s.label}`}
                    type="monotone"
                    dataKey={s.label}
                    stroke={colors[i]}
                    strokeWidth={2.5}
                    dot={{ r: 3, stroke: '#fff', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                    strokeDasharray={i === 0 ? '' : i === 1 ? '6 4' : '2 4'}
                  />
                </React.Fragment>
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};