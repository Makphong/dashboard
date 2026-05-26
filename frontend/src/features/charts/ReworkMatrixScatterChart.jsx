import React from 'react';
import { CHART_PALETTE } from '../../lib/constants.js';
import { safeNumber, formatDuration, formatPercent } from '../../lib/utils.js';

export const ReworkMatrixScatterChart = ({ rows, expanded = false }) => {
  const prepared = rows
    .slice(0, 8)
    .map((row, idx) => ({
      user: row.user || `User ${idx + 1}`,
      avgTimePerDocSeconds: safeNumber(row.avgTimePerDocSeconds),
      reworkRate: Math.max(0, Math.min(1, safeNumber(row.reworkRate))),
      autoClosedRate: Math.max(0, Math.min(1, safeNumber(row.autoClosedRate))),
      totalActiveSeconds: safeNumber(row.totalActiveSeconds),
    }))
    .filter((row) => row.avgTimePerDocSeconds > 0 || row.reworkRate > 0 || row.totalActiveSeconds > 0);

  if (prepared.length === 0) return null;

  const maxX = prepared.reduce((max, row) => Math.max(max, row.avgTimePerDocSeconds), 0) || 1;
  const maxActive = prepared.reduce((max, row) => Math.max(max, row.totalActiveSeconds), 0) || 1;

  const width = expanded ? 760 : 520;
  const height = expanded ? 350 : 260;
  const margin = expanded
    ? { top: 18, right: 26, bottom: 46, left: 56 }
    : { top: 16, right: 18, bottom: 42, left: 44 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  const xDomainMax = Math.max(1, maxX * 1.08);
  const x = (v) => margin.left + (safeNumber(v) / xDomainMax) * innerWidth;
  const y = (v) => margin.top + (1 - Math.max(0, Math.min(1, safeNumber(v)))) * innerHeight;
  const bubbleRadius = (active) => {
    const base = expanded ? 7 : 5;
    const span = expanded ? 11 : 8;
    return base + Math.sqrt(Math.max(0, active) / maxActive) * span;
  };

  return (
    <div className={`mt-2 overflow-hidden ${expanded ? 'w-full max-w-[820px] mx-auto px-1' : ''}`}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto rounded-xl border border-slate-100 bg-white block" style={{ overflow: 'hidden' }}>
        {ticks.map((tick) => (
          <line
            key={`h-${tick}`}
            x1={margin.left}
            x2={width - margin.right}
            y1={y(tick)}
            y2={y(tick)}
            stroke={tick === 0 ? '#94A3B8' : '#E2E8F0'}
            strokeDasharray={tick === 0 ? '0' : '3 3'}
          />
        ))}
        {ticks.map((tick) => (
          <line
            key={`v-${tick}`}
            y1={margin.top}
            y2={height - margin.bottom}
            x1={margin.left + tick * innerWidth}
            x2={margin.left + tick * innerWidth}
            stroke={tick === 0 ? '#94A3B8' : '#E2E8F0'}
            strokeDasharray={tick === 0 ? '0' : '3 3'}
          />
        ))}

        {ticks.map((tick) => (
          <text key={`yt-${tick}`} x={margin.left - 8} y={y(tick) + 4} textAnchor="end" className="fill-slate-500 text-[10px]">
            {Math.round(tick * 100)}%
          </text>
        ))}
        {ticks.map((tick) => (
          <text key={`xt-${tick}`} x={margin.left + tick * innerWidth} y={height - 16} textAnchor="middle" className="fill-slate-500 text-[10px]">
            {formatDuration(xDomainMax * tick)}
          </text>
        ))}

        {prepared.map((row, idx) => {
          const px = x(row.avgTimePerDocSeconds);
          const py = y(row.reworkRate);
          const pointRadius = bubbleRadius(row.totalActiveSeconds);
          const color = CHART_PALETTE[idx % CHART_PALETTE.length];
          const shortUserLabel = row.user.length > 14 ? `${row.user.slice(0, 14)}...` : row.user;
          const labelX = Math.max(margin.left + 8, Math.min(width - margin.right - 8, px));
          const labelAnchor = 'middle';
          const labelY = Math.max(margin.top + 12, py - pointRadius - 8);
          return (
            <g key={row.user}>
              <circle cx={px} cy={py} r={pointRadius} fill={color} opacity="0.8" stroke="#ffffff" strokeWidth="2">
                <title>{`${row.user} | Avg/Doc ${formatDuration(row.avgTimePerDocSeconds)} | Edit ${formatPercent(row.reworkRate)} | Auto Closed ${formatPercent(row.autoClosedRate)}`}</title>
              </circle>
              <text x={labelX} y={labelY} textAnchor={labelAnchor} className="fill-slate-700 text-[10px] font-medium">
                {shortUserLabel}
              </text>
            </g>
          );
        })}

        <text x={width / 2} y={height - 8} textAnchor="middle" className="fill-slate-500 text-[11px]">
          Avg Time per Document
        </text>
        <text transform={`translate(14 ${height / 2}) rotate(-90)`} textAnchor="middle" className="fill-slate-500 text-[11px]">
          Edit Rate
        </text>
      </svg>
    </div>
  );
};
