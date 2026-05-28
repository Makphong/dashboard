import React, { useState, useMemo } from 'react';
import { safeNumber, clampPercent, formatDuration, formatPercent } from '../../lib/utils.js';

/**
 * Top User Work Mix (Restored Original Styles with Interactive Tooltips)
 */
export const UserContributionStackChart = React.memo(({ rows = [], expanded = false }) => {
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, content: '', color: '' });
  const containerRef = React.useRef(null);

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

  const maxVisibleRows = 4;
  const rowSlotHeight = 63.5; 
  const useScroll = prepared.length > maxVisibleRows;
  const wrapperStyle = useScroll ? { maxHeight: `${maxVisibleRows * rowSlotHeight}px` } : undefined;

  const handleMouseMove = (e, content, color) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltip({
      show: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      content,
      color
    });
  };

  return (
    <div className="space-y-4 relative" ref={containerRef}>
      <div className="flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 px-1">
        <div className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00a4e4] shadow-[0_0_8px_rgba(0,164,228,0.4)]"></span>
          Review
        </div>
        <div className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
          Edit
        </div>
      </div>

      <div 
        className={`${useScroll ? 'overflow-y-auto no-scrollbar pr-2 pb-2' : ''} space-y-1`} 
        style={wrapperStyle}
      >
        {prepared.map((row) => {
          const currentMax = maxTotal || 1;
          const totalWidth = clampPercent(Math.max((row.total / currentMax) * 100, 12));
          const reviewWidth = row.total > 0 ? clampPercent((row.review / row.total) * 100) : 0;
          const editWidth = row.total > 0 ? clampPercent((row.edit / row.total) * 100) : 0;

          return (
            <div key={row.user} className="py-2.5 transition-all group border-b border-slate-50 last:border-0 hover:bg-slate-50/50 rounded-xl px-2 -mx-2">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-bold text-[#17335f] truncate">{row.user}</span>
                <span className="text-[11px] font-bold text-slate-400">{formatDuration(row.total)}</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100/80 overflow-hidden shadow-inner">
                <div className="h-full rounded-full overflow-hidden flex shadow-sm" style={{ width: `${totalWidth}%` }}>
                  <div 
                    onMouseEnter={(e) => handleMouseMove(e, `Review: ${formatDuration(row.review)} (${formatPercent(row.review / (row.total || 1))})`, '#00a4e4')}
                    onMouseMove={(e) => handleMouseMove(e, `Review: ${formatDuration(row.review)} (${formatPercent(row.review / (row.total || 1))})`, '#00a4e4')}
                    onMouseLeave={() => setTooltip(prev => ({ ...prev, show: false }))}
                    className="h-full bg-[#00a4e4] cursor-pointer transition-all hover:brightness-110" 
                    style={{ width: `${reviewWidth}%` }}
                  />
                  <div 
                    onMouseEnter={(e) => handleMouseMove(e, `Edit: ${formatDuration(row.edit)} (${formatPercent(row.edit / (row.total || 1))})`, '#10B981')}
                    onMouseMove={(e) => handleMouseMove(e, `Edit: ${formatDuration(row.edit)} (${formatPercent(row.edit / (row.total || 1))})`, '#10B981')}
                    onMouseLeave={() => setTooltip(prev => ({ ...prev, show: false }))}
                    className="h-full bg-emerald-500 cursor-pointer transition-all hover:brightness-110" 
                    style={{ width: `${editWidth}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating tooltip (absolute theme) */}
      {tooltip.show && (
        <div 
          className="absolute pointer-events-none z-[200] animate-in fade-in zoom-in duration-150"
          style={{ 
            left: Math.max(0, Math.min(tooltip.x + 10, (containerRef.current?.clientWidth || 0) - 190)), 
            top: tooltip.y - 10,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="bg-white/95 backdrop-blur-md text-[#17335f] px-3 py-1.5 rounded-xl shadow-ktb border border-[#d7e8f6] flex items-center gap-2 min-w-[170px]">
            <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: tooltip.color }}></div>
            <span className="text-[12px] font-bold tracking-tight whitespace-nowrap">{tooltip.content}</span>
          </div>
        </div>
      )}
    </div>
  );
});
;
