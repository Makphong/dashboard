import React from 'react';
import {
  COMPLETE_MARKER_COLOR,
  GANTT_DRILL_GROUP_COLORS,
  MARKER_STAR_INNER_RADIUS,
  MARKER_STAR_OUTER_RADIUS,
  SEGMENT_COLORS
} from '../../lib/constants.js';
import {
  buildAsteriskPoints,
  formatDuration,
  formatTickHeader,
  formatTimeTick,
  isSameCalendarDay,
  toCompleteMarkerType,
  toGanttSegmentTypeLabel
} from '../../lib/utils.js';

export const GanttLegend = ({ items }) => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 py-1 text-xs text-slate-600">
    {items.map((item) => (
      <span key={item.key} className="inline-flex items-center gap-1.5">
        {item.key === 'EditAndComplete' ? (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={item.color}>
            <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
          </svg>
        ) : (
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
        )}
        {item.label}
      </span>
    ))}
  </div>
);

export const GanttHeader = ({ laneLabelWidth, headerScrollRef, timelineSvgWidth, headerHeight, visibleTicks, getX }) => (
  <div className="flex border-b border-slate-200 bg-slate-50/80 backdrop-blur-sm sticky top-0 z-20">
    <div style={{ width: laneLabelWidth }} className="shrink-0 border-r border-slate-200 p-3 flex items-center">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lane</span>
    </div>
    <div ref={headerScrollRef} className="flex-1 overflow-hidden no-scrollbar">
      <svg width={timelineSvgWidth} height={headerHeight}>
        {visibleTicks.map((tick, idx) => {
          const x = getX(tick);
          const header = formatTickHeader(tick);
          const showDate = idx === 0 || !isSameCalendarDay(visibleTicks[idx - 1], tick);
          return (
            <g key={tick}>
              <line x1={x} x2={x} y1={headerHeight - 15} y2={headerHeight} stroke="#CBD5E1" />
              <text x={x} y="18" textAnchor="middle" className="fill-slate-500 text-[10px] font-medium">
                <tspan x={x}>{showDate ? header.dateLabel : ''}</tspan>
                <tspan x={x} dy="13">{header.timeLabel}</tspan>
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  </div>
);

export const GanttLaneLabels = ({ visibleLanes, lanes, laneLabelWidth, rowTopPadding, rowSlotHeight, rowHeight }) => (
  <div style={{ width: laneLabelWidth }} className="shrink-0 border-r border-slate-200 bg-white relative">
    {visibleLanes.map((lane) => {
      const idx = lanes.indexOf(lane);
      const y = rowTopPadding + idx * rowSlotHeight;
      return (
        <div key={lane} style={{ position: 'absolute', top: y, width: '100%', height: rowHeight }} className="px-3 flex items-center border-b border-slate-50">
          <span className="text-[11px] font-semibold text-slate-700 truncate">{lane}</span>
        </div>
      );
    })}
  </div>
);

export const GanttBarsSvg = ({
  timelineSvgWidth,
  bodyChartHeight,
  visibleTicks,
  visibleLanes,
  lanes,
  laneToPositionedBars,
  rowTopPadding,
  rowSlotHeight,
  rowHeight,
  scrollState,
  showStarMarkers,
  getX,
  onPickSegment,
  onShowTooltip,
  onHideTooltip,
}) => (
  <svg width={timelineSvgWidth} height={bodyChartHeight} className="block bg-white/50">
    {visibleTicks.map((tick) => (
      <line key={tick} x1={getX(tick)} x2={getX(tick)} y1={0} y2={bodyChartHeight} stroke="#F1F5F9" />
    ))}

    {visibleLanes.map((lane) => {
      const laneIdx = lanes.indexOf(lane);
      const y = rowTopPadding + laneIdx * rowSlotHeight;
      const positionedBars = laneToPositionedBars[lane] || [];
      const leftBound = scrollState.left - 500;
      const rightBound = scrollState.left + scrollState.viewW + 500;

      return (
        <g key={`bars-${lane}`}>
          {positionedBars.map((positioned, barIdx) => {
            const { s, x, w } = positioned;
            if (x + w < leftBound || x > rightBound) return null;

            const color = lane === 'Idle'
              ? '#94A3B8'
              : (GANTT_DRILL_GROUP_COLORS[s.drillGroup] || SEGMENT_COLORS[s.segmentType] || '#64748B');
            return (
              <g
                key={`${s.id}-${barIdx}`}
                onClick={() => onPickSegment(s)}
                onMouseEnter={(event) => onShowTooltip(event, s, lane)}
                onMouseMove={(event) => onShowTooltip(event, s, lane)}
                onMouseLeave={onHideTooltip}
                style={{ cursor: 'pointer' }}
              >
                <rect x={x} y={y + 4} width={w} height={rowHeight - 8} rx="6" fill={color} opacity="0.9" />
              </g>
            );
          })}
        </g>
      );
    })}

    {showStarMarkers && visibleLanes.map((lane) => {
      const laneIdx = lanes.indexOf(lane);
      const y = rowTopPadding + laneIdx * rowSlotHeight;
      const positionedBars = laneToPositionedBars[lane] || [];
      const leftBound = scrollState.left - 500;
      const rightBound = scrollState.left + scrollState.viewW + 500;

      return (
        <g key={`stars-${lane}`}>
          {positionedBars.map((positioned, barIdx) => {
            const { s, x, w } = positioned;
            if (x + w < leftBound || x > rightBound) return null;
            const hasStars = (s.segmentType === 'USER_REVIEW_AUTO_TIMEOUT' || s.autoTimeout)
              || toCompleteMarkerType(s)
              || (s.reopenMarkerList && s.reopenMarkerList.length > 0);
            if (!hasStars) return null;

            return (
              <g
                key={`star-${s.id}-${barIdx}`}
                onClick={() => onPickSegment(s)}
                onMouseEnter={(event) => onShowTooltip(event, s, lane)}
                onMouseMove={(event) => onShowTooltip(event, s, lane)}
                onMouseLeave={onHideTooltip}
                style={{ cursor: 'pointer' }}
              >
                {(s.segmentType === 'USER_REVIEW_AUTO_TIMEOUT' || s.autoTimeout) && (
                  <polygon points={buildAsteriskPoints(x + w - 2, y + rowHeight / 2, MARKER_STAR_OUTER_RADIUS, MARKER_STAR_INNER_RADIUS)} fill="#EF4444" />
                )}
                {toCompleteMarkerType(s) && (
                  <polygon points={buildAsteriskPoints(x + w + 4, y + rowHeight / 2, MARKER_STAR_OUTER_RADIUS, MARKER_STAR_INNER_RADIUS)} fill={COMPLETE_MARKER_COLOR} />
                )}
                {s.reopenMarkerList && s.reopenMarkerList.length > 0 && (
                  <polygon points={buildAsteriskPoints(x + 2, y + rowHeight / 2, MARKER_STAR_OUTER_RADIUS, MARKER_STAR_INNER_RADIUS)} fill="#A855F7" />
                )}
              </g>
            );
          })}
        </g>
      );
    })}
  </svg>
);

export const GanttTooltip = ({ hoveredSegment, containerRef }) => {
  if (!hoveredSegment) return null;

  return (
    <div
      className="pointer-events-none fixed z-[200] w-[310px] rounded-xl border border-slate-200 bg-white/95 backdrop-blur-sm p-4 shadow-2xl animate-in fade-in zoom-in duration-150"
      style={{
        left: hoveredSegment.x + (containerRef.current?.getBoundingClientRect().left || 0),
        top: hoveredSegment.y + (containerRef.current?.getBoundingClientRect().top || 0),
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full bg-[#2563EB]"></div>
        <div className="text-xs font-bold text-slate-800 uppercase tracking-tight truncate">{toGanttSegmentTypeLabel(hoveredSegment.segmentType)}</div>
      </div>
      <div className="space-y-1 text-[10px] font-medium text-slate-500">
        <div className="flex justify-between"><span>Lane</span><span className="text-slate-800">{hoveredSegment.lane}</span></div>
        <div className="flex justify-between"><span>Duration</span><span className="text-slate-800">{formatDuration(hoveredSegment.durationSeconds)}</span></div>
        <div className="flex justify-between"><span>Time</span><span className="text-slate-800">{formatTimeTick(hoveredSegment.start)} - {formatTimeTick(hoveredSegment.end)}</span></div>
      </div>
    </div>
  );
};
