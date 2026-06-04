import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  GANTT_MAX_TIMELINE_WIDTH_PX,
  GANTT_MAX_ZOOM_SCALE,
  GANTT_MIN_ZOOM_SCALE,
  GANTT_DRILL_GROUP_LABELS
} from '../../lib/constants.js';
import { mapSegmentsToRows } from './timelineUtils.js';
import {
  buildGanttDisplayBounds,
  buildGanttGapInfo,
  buildGanttLaneSegments,
  buildGanttLanes,
  buildGanttLegendItems,
  buildGanttPositionedBars,
  buildGanttTicks,
  compactGanttTimestamp,
  getGanttVisibleLaneWindow
} from './ganttLayoutUtils.js';
import {
  GanttBarsSvg,
  GanttHeader,
  GanttLaneLabels,
  GanttLegend,
  GanttTooltip
} from './GanttTimelineParts.jsx';

export const GanttTimelineChart = ({
  segments,
  onSelectSegment,
  expanded = false,
  singleLane = false,
  showSystemLane = true,
  showIdleLane = true,
  showStarMarkers = true,
  collapseGaps = false,
  showGanttLegend = true,
}) => {
  const containerRef = useRef(null);
  const headerScrollRef = useRef(null);
  const bodyScrollRef = useRef(null);
  const verticalScrollRef = useRef(null);
  const dragRef = useRef({ active: false, startX: 0, startScrollLeft: 0 });
  const zoomScaleRef = useRef(1);
  const pendingZoomAnchorRef = useRef(null);
  const scrollRequestRef = useRef(null);
  const tooltipFrameRef = useRef(null);

  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [scrollState, setScrollState] = useState({ left: 0, top: 0, viewW: 1000, viewH: 600 });

  const mapped = useMemo(() => mapSegmentsToRows(segments, singleLane), [segments, singleLane]);

  useEffect(() => {
    const updateSize = () => {
      if (!bodyScrollRef.current) return;
      setScrollState((prev) => ({
        ...prev,
        viewW: bodyScrollRef.current.clientWidth,
        viewH: verticalScrollRef.current?.clientHeight || 600,
      }));
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const bodyViewport = bodyScrollRef.current;
    if (!bodyViewport) return;
    requestAnimationFrame(() => {
      bodyViewport.scrollLeft = 0;
      if (headerScrollRef.current) headerScrollRef.current.scrollLeft = 0;
      if (verticalScrollRef.current) verticalScrollRef.current.scrollTop = 0;
      setScrollState((prev) => ({ ...prev, left: 0, top: 0 }));
    });
  }, [mapped.length]);

  const laneVisibleSegments = useMemo(() => mapped.filter((segment) => {
    if (!showSystemLane && segment.origLane === 'System') return false;
    if (!showIdleLane && segment.origLane === 'Idle') return false;
    return true;
  }), [mapped, showSystemLane, showIdleLane]);

  const { displayMinTs, displayMaxTs } = useMemo(
    () => buildGanttDisplayBounds(laneVisibleSegments, mapped),
    [laneVisibleSegments, mapped]
  );

  const visibleSegments = useMemo(() => mapped.filter((segment) => {
    if (segment.endTs < displayMinTs || segment.startTs > displayMaxTs) return false;
    if (!showSystemLane && segment.origLane === 'System') return false;
    if (!showIdleLane && segment.origLane === 'Idle') return false;
    return true;
  }), [mapped, displayMinTs, displayMaxTs, showSystemLane, showIdleLane]);

  const gapsInfo = useMemo(
    () => buildGanttGapInfo(collapseGaps, visibleSegments, displayMinTs, displayMaxTs),
    [collapseGaps, visibleSegments, displayMinTs, displayMaxTs]
  );

  const compactTs = useCallback(
    (realTs) => compactGanttTimestamp(realTs, gapsInfo.gaps),
    [gapsInfo]
  );

  const displaySpanMs = Math.max(displayMaxTs - displayMinTs - gapsInfo.totalExcess, 60000);
  const displaySpanHours = displaySpanMs / 3600000;
  const pxPerHour = 120;
  const legendItems = useMemo(
    () => buildGanttLegendItems(showIdleLane, showSystemLane, showStarMarkers),
    [showIdleLane, showSystemLane, showStarMarkers]
  );

  const lanes = useMemo(
    () => buildGanttLanes(visibleSegments, showSystemLane, showIdleLane),
    [visibleSegments, showSystemLane, showIdleLane]
  );

  const laneToSegments = useMemo(
    () => buildGanttLaneSegments(lanes, visibleSegments),
    [lanes, visibleSegments]
  );

  const timelinePadLeft = 14;
  const timelinePadRight = 18;
  const minTimelinePx = collapseGaps ? (singleLane ? 1950 : 1600) : 2200;
  const baseTimelineWidth = Math.min(120000, Math.max(minTimelinePx, Math.round(displaySpanHours * pxPerHour)));
  const timelineWidth = Math.min(GANTT_MAX_TIMELINE_WIDTH_PX, Math.max(minTimelinePx, Math.round(baseTimelineWidth * zoomScale)));
  const baseCompactedTs = useMemo(() => compactTs(displayMinTs), [compactTs, displayMinTs]);
  const pxPerMs = useMemo(() => timelineWidth / displaySpanMs, [timelineWidth, displaySpanMs]);

  const getX = useCallback((ts) => {
    const realTs = typeof ts === 'number' ? ts : Date.parse(String(ts));
    const normalizedTs = Number.isFinite(realTs) ? realTs : displayMinTs;
    return timelinePadLeft + (compactTs(normalizedTs) - baseCompactedTs) * pxPerMs;
  }, [compactTs, displayMinTs, baseCompactedTs, pxPerMs]);

  const laneToPositionedBars = useMemo(() => buildGanttPositionedBars({
    lanes,
    laneToSegments,
    compactTs,
    displayMinTs,
    displayMaxTs,
    baseCompactedTs,
    pxPerMs,
    timelinePadLeft,
  }), [lanes, laneToSegments, compactTs, displayMinTs, displayMaxTs, baseCompactedTs, pxPerMs]);

  const timelineSvgWidth = useMemo(() => {
    let maxRight = timelinePadLeft + timelineWidth + timelinePadRight;
    lanes.forEach((lane) => {
      const positionedBars = laneToPositionedBars[lane] || [];
      if (positionedBars.length > 0) {
        const last = positionedBars[positionedBars.length - 1];
        maxRight = Math.max(maxRight, last.x + last.w + timelinePadRight + 45);
      }
    });
    return maxRight;
  }, [lanes, laneToPositionedBars, timelineWidth]);

  const laneLabelWidth = expanded ? 210 : 132;
  const headerHeight = 50;
  const rowHeight = 34;
  const rowGap = 10;
  const rowSlotHeight = rowHeight + rowGap;
  const rowTopPadding = 8;
  const bodyChartHeight = rowTopPadding + lanes.length * rowSlotHeight + 10;
  const timelineViewportHeight = expanded
    ? Math.max(rowSlotHeight + 12, lanes.length * rowSlotHeight + 12)
    : (Math.max(1, Math.min(7, lanes.length)) * rowSlotHeight + 12);

  const ticks = useMemo(() => buildGanttTicks({
    timelineWidth,
    displaySpanHours,
    displayMinTs,
    displayMaxTs,
    collapseGaps,
    visibleSegments,
    getX,
  }), [timelineWidth, displaySpanHours, displayMinTs, displayMaxTs, collapseGaps, visibleSegments, getX]);

  const { startLaneIdx, endLaneIdx } = getGanttVisibleLaneWindow(scrollState, rowTopPadding, rowSlotHeight, lanes.length);
  const visibleLanes = lanes.slice(startLaneIdx, endLaneIdx + 1);
  const visibleTicks = ticks.filter((tick) => {
    const x = getX(tick);
    return x >= scrollState.left - 200 && x <= scrollState.left + scrollState.viewW + 200;
  });

  const onBodyScroll = (event) => {
    const { scrollLeft } = event.currentTarget;
    if (headerScrollRef.current) headerScrollRef.current.scrollLeft = scrollLeft;

    if (scrollRequestRef.current) cancelAnimationFrame(scrollRequestRef.current);
    scrollRequestRef.current = requestAnimationFrame(() => {
      setScrollState((prev) => ({ ...prev, left: scrollLeft }));
    });
  };

  const onVerticalScroll = (event) => {
    const { scrollTop } = event.currentTarget;
    if (scrollRequestRef.current) cancelAnimationFrame(scrollRequestRef.current);
    scrollRequestRef.current = requestAnimationFrame(() => {
      setScrollState((prev) => ({ ...prev, top: scrollTop }));
    });
  };

  const onDragStart = (event) => {
    if (!bodyScrollRef.current) return;
    dragRef.current = { active: true, startX: event.clientX, startScrollLeft: bodyScrollRef.current.scrollLeft };
  };

  const onDragMove = (event) => {
    if (!dragRef.current.active || !bodyScrollRef.current) return;
    bodyScrollRef.current.scrollLeft = dragRef.current.startScrollLeft - (event.clientX - dragRef.current.startX);
  };

  const onDragEnd = () => {
    dragRef.current.active = false;
  };

  useEffect(() => {
    const viewport = bodyScrollRef.current;
    if (!viewport) return;

    const onWheel = (event) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      const zoomIn = event.deltaY < 0;
      const nextZoom = Math.max(
        GANTT_MIN_ZOOM_SCALE,
        Math.min(GANTT_MAX_ZOOM_SCALE, zoomScaleRef.current * (zoomIn ? 1.15 : 0.87))
      );
      if (Math.abs(nextZoom - zoomScaleRef.current) < 0.001) return;

      const rect = viewport.getBoundingClientRect();
      const anchorX = event.clientX - rect.left;
      const absoluteX = viewport.scrollLeft + anchorX;
      const time = displayMinTs + ((absoluteX - timelinePadLeft) / timelineWidth) * displaySpanMs;

      pendingZoomAnchorRef.current = { anchorX, time };
      zoomScaleRef.current = nextZoom;
      setZoomScale(nextZoom);
    };

    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', onWheel);
  }, [timelineWidth, displaySpanMs, displayMinTs]);

  useLayoutEffect(() => {
    if (!pendingZoomAnchorRef.current || !bodyScrollRef.current) return;
    const { anchorX, time } = pendingZoomAnchorRef.current;
    const nextX = getX(time);
    bodyScrollRef.current.scrollLeft = nextX - anchorX;
    pendingZoomAnchorRef.current = null;
  }, [zoomScale, getX]);

  const pickSegment = (segment) => {
    if (typeof onSelectSegment === 'function') onSelectSegment(segment);
  };

  const showTooltip = (event, segment, lane, color) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const nextHoveredSegment = {
      x: Math.max(8, Math.min(x + 12, rect.width - 318)),
      y: Math.max(8, Math.min(y + 12, rect.height - 132)),
      lane,
      color,
      groupLabel: GANTT_DRILL_GROUP_LABELS[segment.drillGroup] || segment.drillGroup,
      segmentType: segment.segmentType,
      start: segment.start,
      end: segment.end,
      durationSeconds: segment.durationSeconds,
    };

    if (tooltipFrameRef.current) cancelAnimationFrame(tooltipFrameRef.current);
    tooltipFrameRef.current = requestAnimationFrame(() => {
      setHoveredSegment((prev) => {
        if (
          prev &&
          prev.x === nextHoveredSegment.x &&
          prev.y === nextHoveredSegment.y &&
          prev.lane === nextHoveredSegment.lane &&
          prev.color === nextHoveredSegment.color &&
          prev.segmentType === nextHoveredSegment.segmentType &&
          prev.start === nextHoveredSegment.start &&
          prev.end === nextHoveredSegment.end &&
          prev.durationSeconds === nextHoveredSegment.durationSeconds
        ) {
          return prev;
        }
        return nextHoveredSegment;
      });
    });
  };

  useEffect(() => () => {
    if (scrollRequestRef.current) cancelAnimationFrame(scrollRequestRef.current);
    if (tooltipFrameRef.current) cancelAnimationFrame(tooltipFrameRef.current);
  }, []);

  if (mapped.length === 0) return null;

  return (
    <div className="space-y-2 relative select-none" ref={containerRef}>
      {showGanttLegend && <GanttLegend items={legendItems} />}

      <div className="rounded-xl bg-slate-50/30 border border-slate-200 overflow-hidden shadow-sm">
        <GanttHeader
          laneLabelWidth={laneLabelWidth}
          headerScrollRef={headerScrollRef}
          timelineSvgWidth={timelineSvgWidth}
          headerHeight={headerHeight}
          visibleTicks={visibleTicks}
          getX={getX}
        />

        <div
          ref={verticalScrollRef}
          onScroll={onVerticalScroll}
          className="overflow-y-auto no-scrollbar"
          style={{ maxHeight: timelineViewportHeight }}
        >
          <div className="flex min-w-0" style={{ height: bodyChartHeight }}>
            <GanttLaneLabels
              visibleLanes={visibleLanes}
              lanes={lanes}
              laneLabelWidth={laneLabelWidth}
              rowTopPadding={rowTopPadding}
              rowSlotHeight={rowSlotHeight}
              rowHeight={rowHeight}
            />

            <div
              ref={bodyScrollRef}
              onScroll={onBodyScroll}
              onMouseDown={onDragStart}
              onMouseMove={onDragMove}
              onMouseUp={onDragEnd}
              onMouseLeave={() => { onDragEnd(); setHoveredSegment(null); }}
              className="flex-1 overflow-x-auto no-scrollbar cursor-default"
            >
              <GanttBarsSvg
                timelineSvgWidth={timelineSvgWidth}
                bodyChartHeight={bodyChartHeight}
                visibleTicks={visibleTicks}
                visibleLanes={visibleLanes}
                lanes={lanes}
                laneToPositionedBars={laneToPositionedBars}
                rowTopPadding={rowTopPadding}
                rowSlotHeight={rowSlotHeight}
                rowHeight={rowHeight}
                scrollState={scrollState}
                showStarMarkers={showStarMarkers}
                getX={getX}
                onPickSegment={pickSegment}
                onShowTooltip={showTooltip}
                onHideTooltip={() => setHoveredSegment(null)}
              />
            </div>
          </div>
        </div>
      </div>

      <GanttTooltip hoveredSegment={hoveredSegment} containerRef={containerRef} />
    </div>
  );
};
