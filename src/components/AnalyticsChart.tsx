'use client';

import React, { useId } from 'react';

/**
 * Diagram ringan berbasis SVG murni — sengaja TIDAK pakai library eksternal
 * (recharts/chart.js dkk) supaya tidak menambah dependency baru yang perlu
 * `npm install` ulang. Dipakai bareng oleh Creator Dashboard (Analytics tab)
 * dan Admin Panel (Overview tab).
 */

export interface BarDatum {
  label: string;
  value: number;
  tone?: 'terracotta' | 'success' | 'danger' | 'ink';
}

const TONE_FILL: Record<string, string> = {
  terracotta: '#d97757',
  success: '#2f9e64',
  danger: '#d9534f',
  ink: '#1c1a17',
};

export function BarChart({
  data,
  height = 180,
  valueFormatter = (v: number) => String(v),
}: {
  data: BarDatum[];
  height?: number;
  valueFormatter?: (value: number) => string;
}) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div className="w-full" role="img" aria-label="Bar chart">
      <div className="flex items-end gap-2 sm:gap-3" style={{ height }}>
        {data.map((d, i) => {
          const pct = Math.max(2, Math.round((d.value / max) * 100));
          return (
            <div key={`${d.label}-${i}`} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <span className="text-[11px] font-bold text-ink-900/70 tabular-nums">{valueFormatter(d.value)}</span>
              <div
                className="w-full rounded-t-md transition-all duration-500 ease-out"
                style={{
                  height: `${pct}%`,
                  minHeight: 4,
                  backgroundColor: TONE_FILL[d.tone || 'terracotta'],
                  opacity: 0.9,
                }}
              />
              <span className="max-w-full truncate text-[10px] font-bold uppercase tracking-wide text-ink-900/45" title={d.label}>
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface SeriesPoint {
  label: string;
  value: number;
}

/** Line/area chart sederhana — dipakai untuk tren harian (mis. addon baru per hari, sign-up per hari). */
export function LineChart({
  data,
  height = 160,
  color = '#d97757',
}: {
  data: SeriesPoint[];
  height?: number;
  color?: string;
}) {
  const gradientId = useId().replace(/[:]/g, '');
  const width = 100; // viewBox unit, scales responsively via SVG
  const max = Math.max(1, ...data.map(d => d.value));
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;
  const points = data.map((d, i) => {
    const x = data.length > 1 ? i * stepX : width / 2;
    const y = height - (d.value / max) * (height - 24) - 4;
    return { x, y };
  });
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1]?.x ?? width},${height} L0,${height} Z`;

  return (
    <div className="w-full" role="img" aria-label="Line chart">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-full w-full" style={{ height }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {data.length > 0 && <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />}
        {data.length > 0 && <path d={linePath} fill="none" stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={1.4} fill={color} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="mt-2 flex justify-between">
        {data.map((d, i) => (
          (data.length <= 8 || i % Math.ceil(data.length / 8) === 0) ? (
            <span key={i} className="text-[10px] font-bold uppercase tracking-wide text-ink-900/40">{d.label}</span>
          ) : <span key={i} />
        ))}
      </div>
    </div>
  );
}

/** Donut chart kecil buat proporsi (mis. status add-on: approved/pending/rejected). */
export function DonutChart({
  data,
  size = 120,
  thickness = 16,
}: {
  data: BarDatum[];
  size?: number;
  thickness?: number;
}) {
  const total = Math.max(1, data.reduce((sum, d) => sum + d.value, 0));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" className="text-ink-900/[0.06]" strokeWidth={thickness} />
        {data.map((d, i) => {
          const dash = (d.value / total) * circumference;
          const circle = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={TONE_FILL[d.tone || 'terracotta']}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += dash;
          return circle;
        })}
      </svg>
      <ul className="space-y-1.5">
        {data.map((d, i) => (
          <li key={i} className="flex items-center gap-2 text-xs font-bold text-ink-900/70">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TONE_FILL[d.tone || 'terracotta'] }} />
            {d.label} <span className="text-ink-900/40">({d.value})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
