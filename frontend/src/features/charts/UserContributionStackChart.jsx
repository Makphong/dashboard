import React, { useState, useMemo } from 'react';
import { safeNumber, clampPercent, formatDuration, formatPercent } from '../../lib/utils.js';

/**
 * Top User Work Mix (Restored Original Styles with Interactive Tooltips)
 */
export const UserContributionStackChart = ({ rows = [] }) => {
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, content: '', color: '' });

  const prepared = useMemo(() => {
    if (!Array.isArray(rows)) return [];
    return rows
      .map((row) => {
        const review = safeNumber(row.reviewSeconds);
        const edit = safeNumber(row.editSeconds);
        const total = review + edit;
        return {
          user: row.user || 'Unknown User',
          review,
          edit,
          total,
          reworkRate: safeNumber(row.reworkRate),
        };
      })
      .filter((row) => row.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [rows]);

  const maxTotal = useMemo(() => {
    if (prepared.length === 0) return 1;
    return Math.max(...prepared.map(d => d.total), 1);
  }, [prepared]);

  if (prepared.length === 0) return null;

  // Stable 4-user view height - precisely calibrated to hide the 5th row
  const maxVisibleRows = 4;
  const rowSlotHeight = 63.5; 
  const useScroll = prepared.length > maxVisibleRows;
  const wrapperStyle = useScroll ? { maxHeight: `${maxVisibleRows * rowSlotHeight}px` } : undefined;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-1 px-1">
        <div className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] shadow-[0_0_8px_rgba(37,99,235,0.2)]"></span>
          Review
        </div>
        <div className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.2)]"></span>
          Edit
        </div>
      </div>

      <div 
        className={`${useScroll ? 'overflow-y-auto no-scrollbar pr-2 pb-4 space-y-0.5' : 'space-y-0.5'}`} 
        style={wrapperStyle}
      >
        {prepared.map((row) => {
          const currentMax = maxTotal || 1;
          const totalWidth = clampPercent(Math.max((row.total / currentMax) * 100, 8));
          const reviewWidth = row.total > 0 ? clampPercent((row.review / row.total) * 100) : 0;
          const editWidth = row.total > 0 ? clampPercent((row.edit / row.total) * 100) : 0;

          return (
            <div key={row.user} className="py-2.5 transition-all group border-b border-slate-50 last:border-0">
              <div className="flex items-center justify-between text-sm mb-2 px-0.5">
                <span className="font-semibold text-slate-700 truncate">{row.user}</span>
                <span className="text-slate-500">{formatDuration(row.total)}</span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full overflow-hidden flex" style={{ width: `${totalWidth}%` }}>
                  <div 
                    onMouseEnter={(e) => setTooltip({
                      show: true,
                      x: e.clientX,
                      y: e.clientY,
                      content: `Review: ${formatDuration(row.review)} (${formatPercent(row.review / (row.total || 1))})`,
                      color: '#2563EB'
                    })}
                    onMouseMove={(e) => setTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }))}
                    onMouseLeave={() => setTooltip(prev => ({ ...prev, show: false }))}
                    className="h-full bg-[#2563EB] cursor-pointer transition-opacity hover:opacity-80" 
                    style={{ width: `${reviewWidth}%` }}
                  />
                  <div 
                    onMouseEnter={(e) => setTooltip({
                      show: true,
                      x: e.clientX,
                      y: e.clientY,
                      content: `Edit: ${formatDuration(row.edit)} (${formatPercent(row.edit / (row.total || 1))})`,
                      color: '#10B981'
                    })}
                    onMouseMove={(e) => setTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }))}
                    onMouseLeave={() => setTooltip(prev => ({ ...prev, show: false }))}
                    className="h-full bg-[#10B981] cursor-pointer transition-opacity hover:opacity-80" 
                    style={{ width: `${editWidth}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating tooltip (white theme) */}
      {tooltip.show && (
        <div 
          className="fixed pointer-events-none z-[9999]"
          style={{ 
            left: Math.min(tooltip.x + 12, window.innerWidth - 180), 
            top: Math.max(tooltip.y - 12, 100),
            transform: 'translate(0, -100%)'
          }}
        >
          <div className="bg-white text-slate-800 px-3 py-1.5 rounded-lg shadow-lg border border-slate-200 flex items-center gap-2 animate-in fade-in zoom-in duration-150">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tooltip.color }}></div>
            <span className="text-[11px] font-bold tracking-wide whitespace-nowrap">{tooltip.content}</span>
          </div>
        </div>
      )}
    </div>
  );
};
;
