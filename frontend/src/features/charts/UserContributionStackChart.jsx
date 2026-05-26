import React from 'react';
import { safeNumber, clampPercent, formatDuration, formatPercent } from '../../lib/utils.js';

export const UserContributionStackChart = ({ rows, maxVisibleRows = 0 }) => {
  const prepared = rows
    .map((row) => {
      const review = safeNumber(row.reviewSeconds);
      const edit = safeNumber(row.editSeconds);
      const complete = safeNumber(row.completeSeconds);
      const total = review + edit + complete;
      return {
        user: row.user || 'Unknown User',
        review,
        edit,
        complete,
        total,
        reworkRate: safeNumber(row.reworkRate),
      };
    })
    .filter((row) => row.total > 0);

  if (prepared.length === 0) return null;
  const maxTotal = prepared.reduce((max, row) => Math.max(max, row.total), 0) || 1;

  const rowSlotHeight = 110;
  const useScroll = maxVisibleRows > 0 && prepared.length > maxVisibleRows;
  const wrapperStyle = useScroll ? { maxHeight: `${maxVisibleRows * rowSlotHeight}px` } : undefined;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        <div className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>Review</div>
        <div className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>Edit</div>
        <div className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-violet-500"></span>Complete</div>
      </div>
      <div className={`${useScroll ? 'overflow-y-auto no-scrollbar pr-2 pb-2 space-y-3' : 'space-y-3'}`} style={wrapperStyle}>
        {prepared.map((row) => {
          const totalWidth = clampPercent(Math.max((row.total / maxTotal) * 100, 8));
          const reviewWidth = row.total > 0 ? clampPercent((row.review / row.total) * 100) : 0;
          const editWidth = row.total > 0 ? clampPercent((row.edit / row.total) * 100) : 0;
          const completeWidth = row.total > 0 ? clampPercent((row.complete / row.total) * 100) : 0;

          return (
            <div key={row.user} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-semibold text-slate-800 truncate">{row.user}</span>
                <span className="text-slate-500">{formatDuration(row.total)}</span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full rounded-full overflow-hidden flex" style={{ width: `${totalWidth}%` }}>
                  <div className="h-full bg-blue-600" style={{ width: `${reviewWidth}%` }}></div>
                  <div className="h-full bg-emerald-500" style={{ width: `${editWidth}%` }}></div>
                  <div className="h-full bg-violet-500" style={{ width: `${completeWidth}%` }}></div>
                </div>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Review {formatDuration(row.review)} | Edit {formatDuration(row.edit)} | Complete {formatDuration(row.complete)} | Edit Rate {formatPercent(row.reworkRate)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
