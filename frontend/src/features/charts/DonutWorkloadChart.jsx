import React, { useState, useEffect } from 'react';
import { CHART_PALETTE } from '../../lib/constants.js';
import { safeNumber, formatDuration, formatPercent } from '../../lib/utils.js';

export const DonutWorkloadChart = ({ rows, expanded = false }) => {
  const [focusedUser, setFocusedUser] = useState('');
  const totalSeconds = rows.reduce((sum, row) => sum + safeNumber(row.totalSeconds), 0);
  if (totalSeconds <= 0) return null;

  let startRatio = 0;
  const segments = rows
    .map((row, idx) => {
      const value = safeNumber(row.totalSeconds);
      if (value <= 0) return null;
      const fraction = value / totalSeconds;
      const segment = {
        user: row.user || `User ${idx + 1}`,
        value,
        fraction,
        startRatio,
        color: CHART_PALETTE[idx % CHART_PALETTE.length],
      };
      startRatio += fraction;
      return segment;
    })
    .filter(Boolean);

  const focusedSegment = focusedUser ? segments.find((segment) => segment.user === focusedUser) || null : null;
  const hasFocus = Boolean(focusedSegment);
  const legendSegments = focusedSegment ? [focusedSegment] : segments;

  useEffect(() => {
    if (!focusedUser) return;
    if (!segments.some((segment) => segment.user === focusedUser)) {
      setFocusedUser('');
    }
  }, [segments, focusedUser]);

  const size = expanded ? 440 : 220;
  const center = size / 2;
  const radius = expanded ? 150 : 70;
  const stroke = expanded ? 56 : 28;
  const circumference = 2 * Math.PI * radius;
  const focusLabel = focusedSegment
    ? (focusedSegment.user.length > (expanded ? 24 : 14) ? `${focusedSegment.user.slice(0, expanded ? 24 : 14)}...` : focusedSegment.user)
    : '';

  const showFocus = (segment) => {
    setFocusedUser(segment.user);
  };

  const clearFocus = () => {
    setFocusedUser('');
  };

  return (
    <div className={`mt-4 grid grid-cols-1 ${expanded ? 'xl:grid-cols-[460px_360px] justify-center gap-8 items-start' : 'lg:grid-cols-[210px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)] gap-4 items-start'}`}>
      <div
        onMouseLeave={clearFocus}
        className={`mx-auto relative ${expanded ? 'w-[440px]' : 'w-[210px] xl:w-[220px]'}`}
      >
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto">
          <circle cx={center} cy={center} r={radius} stroke="#E2E8F0" strokeWidth={stroke} fill="none" />
          <g transform={`rotate(-90 ${center} ${center})`}>
            {segments.map((segment) => {
              const isFocused = focusedSegment?.user === segment.user;
              return (
                <circle
                  key={segment.user}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={hasFocus && !isFocused ? '#CBD5E1' : segment.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${segment.fraction * circumference} ${circumference}`}
                  strokeDashoffset={-segment.startRatio * circumference}
                  strokeLinecap="round"
                  opacity={hasFocus && !isFocused ? 0.4 : 1}
                  style={{ cursor: 'pointer', transition: 'all 160ms ease' }}
                  onMouseEnter={() => showFocus(segment)}
                />
              );
            })}
          </g>
          <text x={center} y={center - 4} textAnchor="middle" className={`fill-slate-900 font-bold ${expanded ? 'text-[18px]' : 'text-[16px]'}`}>
            {formatDuration(focusedSegment ? focusedSegment.value : totalSeconds)}
          </text>
          {focusedSegment ? (
            <>
              <text x={center} y={center + 16} textAnchor="middle" className={`fill-slate-500 ${expanded ? 'text-[12px]' : 'text-[11px]'}`}>
                {formatPercent(focusedSegment.fraction)}
              </text>
              <text x={center} y={center + 30} textAnchor="middle" className={`fill-slate-500 ${expanded ? 'text-[11px]' : 'text-[10px]'}`}>
                {focusLabel}
              </text>
            </>
          ) : (
            <text x={center} y={center + 16} textAnchor="middle" className={`fill-slate-500 ${expanded ? 'text-[12px]' : 'text-[11px]'}`}>
              Active Time
            </text>
          )}
        </svg>
      </div>

      <div className={`space-y-2 min-w-0 w-full ${expanded ? 'max-w-[360px] mx-auto max-h-[62vh] overflow-y-auto no-scrollbar pr-1' : 'max-h-[260px] lg:max-h-[300px] overflow-y-auto no-scrollbar pr-1'}`}>
        {legendSegments.map((segment) => (
          <div key={segment.user} className={`flex items-center justify-between gap-3 rounded-lg border ${focusedSegment ? 'border-blue-200 bg-blue-50/50' : 'border-slate-100'} ${expanded ? 'px-3 py-2.5' : 'px-3 py-2'}`}>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: segment.color }}></span>
              <span className={`font-medium text-slate-700 truncate ${expanded ? 'text-sm max-w-[220px]' : 'text-sm'}`} title={segment.user}>{segment.user}</span>
            </div>
            <div className="text-xs text-slate-500 whitespace-nowrap" title={`${segment.user}: ${formatDuration(segment.value)}`}>
              {expanded ? `${formatPercent(segment.fraction)} | ${formatDuration(segment.value)}` : formatPercent(segment.fraction)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
