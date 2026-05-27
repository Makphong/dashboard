import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Users, Server, Clock, Timer, RefreshCw, AlertTriangle, Star,
  Search, Calendar, ChevronDown, User, LayoutDashboard,
  Menu, X, ChevronLeft, ChevronRight, Database, UploadCloud, Link2,
  FileText, FileSpreadsheet, Trash2, CheckCircle2, Plus, Maximize2,
  SlidersHorizontal, Eye, EyeOff
} from 'lucide-react';
import {
  REOPEN_MARKER_TYPES,
  GANTT_DRILL_GROUPS,
  GANTT_MIN_ZOOM_SCALE,
  GANTT_MAX_ZOOM_SCALE,
  GANTT_MAX_TIMELINE_WIDTH_PX,
  GANTT_DRILL_GROUP_COLORS,
  GANTT_DRILL_GROUP_LABELS,
  SEGMENT_COLORS,
  COMPLETE_MARKER_COLOR,
  MARKER_STAR_OUTER_RADIUS,
  MARKER_STAR_INNER_RADIUS,
  MARKER_STAR_MIN_GAP_PX
} from '../../lib/constants.js';
import {
  toTimelineLane,
  toDrillGroup,
  safeNumber,
  mergeContinuousReprocessingSegments,
  formatDuration,
  toGanttSegmentTypeLabel,
  toDisplaySegmentTypeCode,
  formatTimeTick,
  toDisplayDate,
  formatTickHeader,
  isSameCalendarDay,
  toCompleteMarkerType,
  spreadMarkerPositions,
  buildAsteriskPoints
} from '../../lib/utils.js';

export const GanttTimelineChart = ({ segments, onSelectSegment, expanded = false, singleLane = false, showSystemLane = true, showIdleLane = true, showStarMarkers = true, collapseGaps = false, showGanttLegend = true }) => {
  const containerRef = useRef(null);
  const headerScrollRef = useRef(null);
  const bodyScrollRef = useRef(null);
  const verticalScrollRef = useRef(null);
  const dragRef = useRef({ active: false, startX: 0, startScrollLeft: 0 });
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [zoomScale, setZoomScale] = useState(1);
  const zoomScaleRef = useRef(1);
  const pendingZoomAnchorRef = useRef(null);
  const timelineMetricsRef = useRef({
    displayMinTs: 0,
    displaySpanMs: 1,
    baseTimelineWidth: 2200,
    timelineWidth: 2200,
    timelinePadLeft: 14,
    timelinePadRight: 18,
    timelineSvgWidth: 2232,
  });

  const mapped = useMemo(() => {
    const parsedRows = [];
    const reopenMarkers = [];

    (segments || []).forEach((segment, idx) => {
      const startTs = Date.parse(segment.start || '');
      const endTsRaw = Date.parse(segment.end || '');
      if (!Number.isFinite(startTs) || !Number.isFinite(endTsRaw)) return;

      const segmentType = String(segment.segmentType || 'UNKNOWN');
      const contextKey = String(segment.documentId || `${segment.fileName || ''}::${segment.pageName || ''}`);

      if (segmentType === 'AUTO_TIMEOUT_MARKER') return;
      if (REOPEN_MARKER_TYPES.has(segmentType)) {
        reopenMarkers.push({ contextKey, ts: startTs, markerType: segmentType });
        return;
      }

      const lane = singleLane ? 'All user' : toTimelineLane(segmentType, segment.userName);

      parsedRows.push({
        id: `${segmentType}-${idx}`,
        segmentType,
        lane,
        origLane: toTimelineLane(segmentType, segment.userName),
        startTs,
        endTs: Math.max(endTsRaw, startTs + 1000),
        durationSeconds: safeNumber(segment.durationSeconds),
        start: segment.start,
        end: segment.end,
        timeGroup: String(segment.timeGroup || ''),
        drillGroup: toDrillGroup(segmentType),
        documentId: segment.documentId || '',
        fileName: segment.fileName || '',
        pageName: segment.pageName || '',
        autoTimeout: Boolean(segment.autoTimeout),
        contextKey,
        reopenMarkerList: [],
        hasReprocessRound2CompleteMarker: segmentType === 'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2',
      });
    });

    if (reopenMarkers.length === 0 || parsedRows.length === 0) return parsedRows;

    const userBarsByContext = new Map();
    parsedRows.forEach((row) => {
      if (!String(row.segmentType || '').startsWith('USER_')) return;
      if (!userBarsByContext.has(row.contextKey)) userBarsByContext.set(row.contextKey, []);
      userBarsByContext.get(row.contextKey).push(row);
    });
    userBarsByContext.forEach((rows) => rows.sort((a, b) => a.startTs - b.startTs));

    reopenMarkers.forEach((marker) => {
      const candidateBars = userBarsByContext.get(marker.contextKey);
      if (!candidateBars || candidateBars.length === 0) return;

      let targetBar = candidateBars.find((bar) => marker.ts >= bar.startTs && marker.ts <= bar.endTs);
      if (!targetBar) targetBar = candidateBars.find((bar) => bar.startTs >= marker.ts);
      if (!targetBar) targetBar = candidateBars[candidateBars.length - 1];
      targetBar.reopenMarkerList.push({
        ts: marker.ts,
        markerType: marker.markerType || 'REOPEN_MARKER',
      });
    });

    return parsedRows;
  }, [segments, singleLane]);

  useEffect(() => {
    const bodyViewport = bodyScrollRef.current;
    if (!bodyViewport) return;
    requestAnimationFrame(() => {
      bodyViewport.scrollLeft = 0;
      if (headerScrollRef.current) headerScrollRef.current.scrollLeft = 0;
      if (verticalScrollRef.current) verticalScrollRef.current.scrollTop = 0;
    });
  }, [mapped.length]);

  if (mapped.length === 0) return null;

  const laneVisibleSegments = mapped.filter((segment) => {
    if (!showSystemLane && segment.origLane === 'System') return false;
    if (!showIdleLane && segment.origLane === 'Idle') return false;
    return true;
  });

  const boundsSegments = laneVisibleSegments.length > 0 ? laneVisibleSegments : mapped;
  const fullMinTs = boundsSegments.reduce((min, item) => Math.min(min, item.startTs), boundsSegments[0].startTs);
  const fullMaxTs = boundsSegments.reduce((max, item) => Math.max(max, item.endTs), boundsSegments[0].endTs);

  const rangePadMs = Math.min(10 * 60 * 1000, Math.max(1 * 60 * 1000, (fullMaxTs - fullMinTs) * 0.005));

  const displayMinTs = fullMinTs - rangePadMs;
  const displayMaxTs = fullMaxTs + rangePadMs;

  const visibleSegments = mapped.filter((segment) => {
    if (segment.endTs < displayMinTs || segment.startTs > displayMaxTs) return false;
    if (!showSystemLane && segment.origLane === 'System') return false;
    if (!showIdleLane && segment.origLane === 'Idle') return false;
    return true;
  });

  if (visibleSegments.length === 0) return null;

  const COMPACTION_THRESHOLD_MS = 30 * 1000;
  const VISUAL_GAP_MS = 10 * 1000;

  let getCompactedTs = (ts) => ts;
  let displaySpanMs = Math.max(displayMaxTs - displayMinTs, 60 * 1000);
  let displaySpanHours = displaySpanMs / (1000 * 60 * 60);

  if (collapseGaps) {
    const activeIntervals = [];
    visibleSegments.forEach((seg) => {
      if (seg.origLane === 'Idle' && !showIdleLane) return;
      if (seg.origLane === 'System' && !showSystemLane) return;
      activeIntervals.push({ start: seg.startTs, end: seg.endTs });
    });
    visibleSegments.forEach((seg) => {
      if (Array.isArray(seg.reopenMarkerList)) {
        seg.reopenMarkerList.forEach((m) => {
          activeIntervals.push({ start: m.ts, end: m.ts });
        });
      }
    });

    activeIntervals.sort((a, b) => a.start - b.start);

    const mergedIntervals = [];
    activeIntervals.forEach((interval) => {
      const prev = mergedIntervals[mergedIntervals.length - 1];
      if (!prev) {
        mergedIntervals.push({ ...interval });
        return;
      }
      if (interval.start <= prev.end + 5 * 1000) {
        prev.end = Math.max(prev.end, interval.end);
      } else {
        mergedIntervals.push({ ...interval });
      }
    });

    const gaps = [];
    let lastRealTs = displayMinTs;
    mergedIntervals.forEach((interval) => {
      if (interval.start > lastRealTs + COMPACTION_THRESHOLD_MS) {
        gaps.push({
          start: lastRealTs,
          end: interval.start,
          originalSpan: interval.start - lastRealTs,
          excessSpan: (interval.start - lastRealTs) - VISUAL_GAP_MS,
        });
      }
      lastRealTs = interval.end;
    });
    if (displayMaxTs > lastRealTs + COMPACTION_THRESHOLD_MS) {
      gaps.push({
        start: lastRealTs,
        end: displayMaxTs,
        originalSpan: displayMaxTs - lastRealTs,
        excessSpan: (displayMaxTs - lastRealTs) - VISUAL_GAP_MS,
      });
    }

    getCompactedTs = (realTs) => {
      let excessSum = 0;
      for (const gap of gaps) {
        if (realTs > gap.end) {
          excessSum += gap.excessSpan;
        } else if (realTs > gap.start) {
          const fraction = (realTs - gap.start) / gap.originalSpan;
          excessSum += fraction * gap.excessSpan;
        }
      }
      return realTs - excessSum;
    };

    const compactedMinTs = getCompactedTs(displayMinTs);
    const compactedMaxTs = getCompactedTs(displayMaxTs);
    displaySpanMs = Math.max(compactedMaxTs - compactedMinTs, 60 * 1000);
    displaySpanHours = displaySpanMs / (1000 * 60 * 60);
  }

  const pxPerHour = 120;
  const legendItems = GANTT_DRILL_GROUPS.filter((item) => {
    if (item.key === 'Reprocessing' || item.key === 'ReviewAutoClose') return false;
    if (!showIdleLane && item.key === 'Idle') return false;
    if (!showSystemLane && item.key === 'Processing') return false;
    if (!showStarMarkers && item.key === 'EditAndComplete') return false;
    return true;
  });

  const laneDurationMap = {};
  visibleSegments.forEach((item) => {
    if (!laneDurationMap[item.lane]) laneDurationMap[item.lane] = 0;
    laneDurationMap[item.lane] += item.durationSeconds;
  });

  const lanes = Object.keys(laneDurationMap).sort((a, b) => {
    const lanePriority = (laneName) => {
      if (laneName === 'System') return 1;
      if (laneName === 'Idle') return 2;
      return 3;
    };
    const priorityDiff = lanePriority(a) - lanePriority(b);
    if (priorityDiff !== 0) return priorityDiff;
    const durationDiff = laneDurationMap[b] - laneDurationMap[a];
    if (durationDiff !== 0) return durationDiff;
    return a.localeCompare(b);
  }).filter((lane) => {
    if (!showSystemLane && lane === 'System') return false;
    if (!showIdleLane && lane === 'Idle') return false;
    return true;
  });

  const laneToSegments = {};
  lanes.forEach((lane) => {
    const laneSegments = visibleSegments
      .filter((item) => item.lane === lane)
      .sort((a, b) => a.startTs - b.startTs);
    laneToSegments[lane] = mergeContinuousReprocessingSegments(laneSegments);
  });

  const timelinePadLeft = 14;
  const timelinePadRight = 18;
  const tempMinTimelinePx = collapseGaps ? (singleLane ? 1950 : 1600) : 2200;
  const tempBaseTimelineWidth = Math.min(120000, Math.max(tempMinTimelinePx, Math.round(displaySpanHours * pxPerHour)));
  const tempTimelineWidth = Math.min(
    GANTT_MAX_TIMELINE_WIDTH_PX,
    Math.max(tempMinTimelinePx, Math.round(tempBaseTimelineWidth * zoomScale))
  );

  const getTempX = (timeValue) => {
    const realTs = typeof timeValue === 'number' ? timeValue : Date.parse(String(timeValue));
    const normalizedTs = Number.isFinite(realTs) ? realTs : displayMinTs;
    const targetCompacted = getCompactedTs(normalizedTs);
    const baseCompacted = getCompactedTs(displayMinTs);
    return timelinePadLeft + ((targetCompacted - baseCompacted) / displaySpanMs) * tempTimelineWidth;
  };

  const laneToPositionedBars = {};
  let maxRightCoordinate = 0;

  lanes.forEach((lane) => {
    const bars = laneToSegments[lane] || [];
    const positionedBars = [];
    bars.forEach((segment, barIdx) => {
      const clippedStart = Math.max(segment.startTs, displayMinTs);
      const clippedEnd = Math.min(segment.endTs, displayMaxTs);
      const x1 = getTempX(clippedStart);
      const x2 = getTempX(clippedEnd);
      const naturalWidth = x2 - x1;
      const minBarWidth = segment.segmentType === 'USER_UPLOADING' ? 14 : 8;
      const barWidth = Math.max(minBarWidth, naturalWidth);

      let xRender = x1;
      if (barIdx > 0) {
        const prevBar = positionedBars[barIdx - 1];
        const minStart = prevBar.x + prevBar.width + 1.5;
        if (xRender < minStart) {
          xRender = minStart;
        }
      }

      positionedBars.push({
        segment,
        x: xRender,
        width: barWidth,
        clippedStart,
        clippedEnd,
      });

      if (xRender + barWidth > maxRightCoordinate) {
        maxRightCoordinate = xRender + barWidth;
      }
    });
    laneToPositionedBars[lane] = positionedBars;
  });

  const laneLabelWidth = expanded ? 210 : 132;
  const minTimelinePx = collapseGaps ? (singleLane ? 1950 : 1600) : 2200;
  const baseTimelineWidth = Math.min(120000, Math.max(minTimelinePx, Math.round(displaySpanHours * pxPerHour)));
  const timelineWidth = Math.min(
    GANTT_MAX_TIMELINE_WIDTH_PX,
    Math.max(minTimelinePx, Math.round(baseTimelineWidth * zoomScale))
  );

  const baseSvgWidth = timelinePadLeft + timelineWidth + timelinePadRight;
  const timelineSvgWidth = Math.max(baseSvgWidth, maxRightCoordinate + timelinePadRight + 45);
  const effectivePxPerHour = timelineWidth / Math.max(displaySpanHours, 1);
  const headerHeight = 50;
  const rowHeight = 34;
  const rowGap = 10;
  const laneVisibleLimit = expanded ? Math.max(7, lanes.length) : 7;
  const rowSlotHeight = rowHeight + rowGap;
  const rowTopPadding = 8;
  const bodyChartHeight = rowTopPadding + lanes.length * rowSlotHeight + 10;
  const timelineViewportHeight = expanded
    ? Math.max(rowSlotHeight + 12, lanes.length * rowSlotHeight + 12)
    : (Math.max(1, Math.min(laneVisibleLimit, lanes.length)) * rowSlotHeight + 12);

  const tickStepCandidatesMs = [
    30 * 60 * 1000,
    60 * 60 * 1000,
    2 * 60 * 60 * 1000,
    3 * 60 * 60 * 1000,
    4 * 60 * 60 * 1000,
    6 * 60 * 60 * 1000,
    8 * 60 * 60 * 1000,
    12 * 60 * 60 * 1000,
    24 * 60 * 60 * 1000,
  ];
  const minTickPx = 120;
  const tickStepMs = tickStepCandidatesMs.find(
    (candidate) => ((candidate / (60 * 60 * 1000)) * effectivePxPerHour) >= minTickPx
  ) || (24 * 60 * 60 * 1000);
  const alignedTickStart = Math.floor(displayMinTs / tickStepMs) * tickStepMs;
  let ticks = [];
  for (let tickTs = alignedTickStart; tickTs <= displayMaxTs + tickStepMs; tickTs += tickStepMs) {
    if (tickTs >= displayMinTs && tickTs <= displayMaxTs) {
      ticks.push(tickTs);
    }
  }
  if (ticks.length === 0) ticks.push(displayMinTs);
  if (ticks[ticks.length - 1] < displayMaxTs) ticks.push(displayMaxTs);

  if (collapseGaps) {
    ticks = ticks.filter((tickTs) => {
      if (tickTs === displayMinTs || tickTs === displayMaxTs) return true;
      const inActiveRange = visibleSegments.some((seg) => {
        return tickTs >= seg.startTs - 2 * 60 * 1000 && tickTs <= seg.endTs + 2 * 60 * 1000;
      });
      return inActiveRange;
    });
  }

  const getX = (timeValue) => {
    const realTs = typeof timeValue === 'number' ? timeValue : Date.parse(String(timeValue));
    const normalizedTs = Number.isFinite(realTs) ? realTs : displayMinTs;
    const targetCompacted = getCompactedTs(normalizedTs);
    const baseCompacted = getCompactedTs(displayMinTs);
    return timelinePadLeft + ((targetCompacted - baseCompacted) / displaySpanMs) * timelineWidth;
  };

  const minTickDistancePx = 65;
  const finalTicks = [];
  ticks.sort((a, b) => a - b).forEach((tick) => {
    if (finalTicks.length === 0) {
      finalTicks.push(tick);
      return;
    }
    const lastTick = finalTicks[finalTicks.length - 1];
    const currentX = getX(tick);
    const lastX = getX(lastTick);

    if (tick === displayMaxTs) {
      if (currentX - lastX >= minTickDistancePx) {
        finalTicks.push(tick);
      } else {
        if (finalTicks.length > 1) {
          const prevPrevTick = finalTicks[finalTicks.length - 2];
          if (currentX - getX(prevPrevTick) >= minTickDistancePx) {
            finalTicks[finalTicks.length - 1] = tick;
          }
        }
      }
    } else if (currentX - lastX >= minTickDistancePx) {
      finalTicks.push(tick);
    }
  });
  ticks = finalTicks;

  zoomScaleRef.current = zoomScale;
  timelineMetricsRef.current = {
    displayMinTs,
    displaySpanMs,
    baseTimelineWidth,
    timelineWidth,
    timelinePadLeft,
    timelinePadRight,
    timelineSvgWidth,
  };

  const onBodyScroll = (event) => {
    const headerViewport = headerScrollRef.current;
    if (!headerViewport) return;
    if (Math.abs(event.currentTarget.scrollLeft - headerViewport.scrollLeft) <= 1) return;
    headerViewport.scrollLeft = event.currentTarget.scrollLeft;
  };

  const onDragStart = (event) => {
    const viewport = bodyScrollRef.current;
    if (!viewport) return;
    dragRef.current.active = true;
    dragRef.current.startX = event.clientX;
    dragRef.current.startScrollLeft = viewport.scrollLeft;
  };

  const onDragMove = (event) => {
    const viewport = bodyScrollRef.current;
    if (!viewport || !dragRef.current.active) return;
    const delta = event.clientX - dragRef.current.startX;
    viewport.scrollLeft = dragRef.current.startScrollLeft - delta;
  };

  const onDragEnd = () => {
    dragRef.current.active = false;
  };

  useEffect(() => {
    const viewport = bodyScrollRef.current;
    if (!viewport) return undefined;

    const onNativeWheel = (event) => {
      if (!event.ctrlKey) return;
      const wheelDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (!wheelDelta) return;

      event.preventDefault();
      const metrics = timelineMetricsRef.current;
      const currentZoom = zoomScaleRef.current;
      const nextZoom = Math.max(
        GANTT_MIN_ZOOM_SCALE,
        Math.min(GANTT_MAX_ZOOM_SCALE, currentZoom * (wheelDelta < 0 ? 1.12 : (1 / 1.12)))
      );
      if (Math.abs(nextZoom - currentZoom) < 0.0001) return;

      const viewportRect = viewport.getBoundingClientRect();
      const anchorX = Math.max(0, Math.min(viewportRect.width, event.clientX - viewportRect.left));
      const absoluteContentX = viewport.scrollLeft + anchorX;
      const anchorTimelineX = Math.max(0, Math.min(metrics.timelineWidth, absoluteContentX - metrics.timelinePadLeft));
      const anchorTime = metrics.displayMinTs + (anchorTimelineX / Math.max(1, metrics.timelineWidth)) * metrics.displaySpanMs;

      pendingZoomAnchorRef.current = { anchorX, anchorTime };
      zoomScaleRef.current = nextZoom;
      setZoomScale(nextZoom);
    };

    viewport.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => {
      viewport.removeEventListener('wheel', onNativeWheel);
    };
  }, []);

  useLayoutEffect(() => {
    const viewport = bodyScrollRef.current;
    const pending = pendingZoomAnchorRef.current;
    if (!viewport || !pending) return;

    const metrics = timelineMetricsRef.current;
    const anchorTimeRatio = (pending.anchorTime - metrics.displayMinTs) / Math.max(1, metrics.displaySpanMs);
    const nextAnchorTimelineX = metrics.timelinePadLeft + (anchorTimeRatio * metrics.timelineWidth);
    const nextRawScrollLeft = nextAnchorTimelineX - pending.anchorX;
    const nextMaxScrollLeft = Math.max(0, metrics.timelineSvgWidth - viewport.clientWidth);
    const nextScrollLeft = Math.max(0, Math.min(nextMaxScrollLeft, nextRawScrollLeft));

    viewport.scrollLeft = nextScrollLeft;
    if (headerScrollRef.current) headerScrollRef.current.scrollLeft = nextScrollLeft;
    pendingZoomAnchorRef.current = null;
  }, [zoomScale]);

  const showHoverTooltip = (event, segment, lane) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const rawX = event.clientX - rect.left + 12;
    const rawY = event.clientY - rect.top + 12;
    const tooltipWidth = 310;
    const tooltipHeight = 124;
    const x = Math.max(8, Math.min(rawX, rect.width - tooltipWidth - 8));
    const y = Math.max(8, Math.min(rawY, rect.height - tooltipHeight - 8));
    const groupLabel = GANTT_DRILL_GROUP_LABELS[segment.drillGroup] || segment.drillGroup;
    setHoveredSegment({
      x,
      y,
      lane,
      groupLabel,
      segmentType: segment.segmentType,
      start: segment.start,
      end: segment.end,
      durationSeconds: segment.durationSeconds,
    });
  };

  const hideHoverTooltip = () => {
    setHoveredSegment(null);
  };

  const onBodyMouseLeave = () => {
    onDragEnd();
    hideHoverTooltip();
  };

  const pickSegment = (segment, lane) => {
    if (!onSelectSegment) return;
    onSelectSegment({
      lane,
      userName: segment.userName,
      actorType: segment.origLane === 'System' ? 'System' : 'User',
      segmentType: segment.segmentType,
      start: segment.start,
      end: segment.end,
      durationSeconds: segment.durationSeconds,
      documentId: segment.documentId,
      fileName: segment.fileName,
      pageName: segment.pageName,
      autoTimeout: segment.autoTimeout,
    });
  };

  return (
    <div className="space-y-2 relative" ref={containerRef}>
      {showGanttLegend && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 py-1 text-xs text-slate-600">
          {legendItems.map((item) => {
            const isCompleteStar = item.key === 'EditAndComplete';
            return (
              <span key={item.key} className="inline-flex items-center gap-1.5">
                {isCompleteStar ? (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={item.color}>
                    <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
                  </svg>
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                )}
                {item.label}
              </span>
            );
          })}
          {showStarMarkers && (
            <>
              <span className="inline-flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="#DC2626">
                  <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
                </svg>
                Auto Close
              </span>
              <span className="inline-flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="#A855F7">
                  <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
                </svg>
                Reopen
              </span>
            </>
          )}
        </div>
      )}

      <div className="rounded-xl bg-slate-50/30 overflow-hidden">
        <div className="sticky top-0 z-[6]">
          <div className="flex border-b border-slate-200 bg-slate-50">
            <svg width={laneLabelWidth} height={headerHeight} className="shrink-0 border-r border-slate-200 bg-slate-50/80">
              <text x="10" y="22" className="fill-slate-500 text-[10px] font-semibold uppercase tracking-[0.08em]">
                Lane
              </text>
            </svg>
            <div
              ref={headerScrollRef}
              className="flex-1 overflow-x-hidden no-scrollbar"
            >
              <svg width={timelineSvgWidth} height={headerHeight} className="block">
                <rect x="0" y="0" width={timelineSvgWidth} height={headerHeight} fill="#F8FAFC" />
                {ticks.map((tick, tickIdx) => {
                  const x = getX(tick);
                  const header = formatTickHeader(tick);
                  const prevTick = tickIdx > 0 ? ticks[tickIdx - 1] : null;
                  const showDate = tickIdx === 0 || !isSameCalendarDay(prevTick, tick);
                  const isFirst = tickIdx === 0;
                  const isLast = tickIdx === ticks.length - 1;
                  const textAnchor = isFirst ? 'start' : (isLast ? 'end' : 'middle');
                  const textX = isFirst ? x + 3 : (isLast ? x - 3 : x);
                  return (
                    <g key={tick}>
                      <line x1={x} x2={x} y1={headerHeight - 20} y2={headerHeight} stroke="#E2E8F0" strokeDasharray="4 4" />
                      <text x={textX} y="14" textAnchor={textAnchor} className="fill-slate-500 text-[10px]">
                        <tspan x={textX}>{showDate ? header.dateLabel : ''}</tspan>
                        <tspan x={textX} dy="12">{header.timeLabel}</tspan>
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>

        <div ref={verticalScrollRef} className="overflow-y-auto no-scrollbar" style={{ maxHeight: `${timelineViewportHeight}px` }}>
          <div className="flex min-w-0">
            <svg width={laneLabelWidth} height={bodyChartHeight} className="shrink-0 border-r border-slate-200 bg-slate-50/70">
              {lanes.map((lane, laneIdx) => {
                const y = rowTopPadding + laneIdx * rowSlotHeight;
                return (
                  <g key={lane}>
                    <rect x="0" y={y - 2} width={laneLabelWidth} height={rowHeight + 4} fill={laneIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'} />
                    <text x="10" y={y + rowHeight / 2 + 5} className="fill-slate-700 text-[11px] font-medium">
                      {lane}
                    </text>
                  </g>
                );
              })}
            </svg>

            <div
              ref={bodyScrollRef}
              className="flex-1 overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing"
              onScroll={onBodyScroll}
              onMouseDown={onDragStart}
              onMouseMove={onDragMove}
              onMouseUp={onDragEnd}
              onMouseLeave={onBodyMouseLeave}
            >
              <svg width={timelineSvgWidth} height={bodyChartHeight} className="block">
                {lanes.map((lane, laneIdx) => {
                  const y = rowTopPadding + laneIdx * rowSlotHeight;
                  return (
                    <rect key={`row-bg-${lane}`} x="0" y={y - 2} width={timelineSvgWidth} height={rowHeight + 4} fill={laneIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'} />
                  );
                })}

                {ticks.map((tick) => {
                  const x = getX(tick);
                  return (
                    <line key={`tick-${tick}`} x1={x} x2={x} y1="0" y2={bodyChartHeight} stroke="#E2E8F0" strokeDasharray="4 4" />
                  );
                })}

                {lanes.map((lane, laneIdx) => {
                  const y = rowTopPadding + laneIdx * rowSlotHeight;
                  const positionedBars = laneToPositionedBars[lane] || [];

                  return (
                    <g key={`bars-${lane}`}>
                      {positionedBars.map(({ segment, x, width }) => {
                        const color = lane === 'Idle'
                          ? '#94A3B8'
                          : (GANTT_DRILL_GROUP_COLORS[segment.drillGroup] || SEGMENT_COLORS[segment.segmentType] || '#64748B');
                        const groupLabel = GANTT_DRILL_GROUP_LABELS[segment.drillGroup] || segment.drillGroup;
                        const typeLabel = toGanttSegmentTypeLabel(segment.segmentType);
                        const label = `${groupLabel} | ${typeLabel} (${toDisplaySegmentTypeCode(segment.segmentType)}) | ${lane} | ${formatTimeTick(segment.start)} -> ${formatTimeTick(segment.end)} | ${formatDuration(segment.durationSeconds)}`;
                        const barOpacity = '0.94';

                        return (
                          <g
                            key={segment.id}
                            onClick={() => pickSegment(segment, lane)}
                            onMouseEnter={(event) => showHoverTooltip(event, segment, lane)}
                            onMouseMove={(event) => showHoverTooltip(event, segment, lane)}
                            onMouseLeave={hideHoverTooltip}
                            style={{ cursor: 'pointer' }}
                          >
                            <rect
                              x={x}
                              y={y + 4}
                              width={width}
                              height={rowHeight - 8}
                              rx="6"
                              fill={color}
                              stroke="none"
                              strokeWidth="0"
                              opacity={barOpacity}
                            >
                              <title>{label}</title>
                            </rect>
                          </g>
                        );
                      })}
                    </g>
                  );
                })}

                {showStarMarkers && lanes.map((lane, laneIdx) => {
                  const y = rowTopPadding + laneIdx * rowSlotHeight;
                  const positionedBars = laneToPositionedBars[lane] || [];

                  return (
                    <g key={`markers-${lane}`}>
                      {positionedBars.map(({ segment, x, width }) => {
                        const timeoutStarX = x + Math.max(4, width - 6);
                        const timeoutStarY = y + rowHeight / 2;
                        const isTimeoutAction = segment.segmentType === 'USER_REVIEW_AUTO_TIMEOUT' || segment.autoTimeout;
                        const completeMarkerType = toCompleteMarkerType(segment);
                        const hasCompleteMarker = completeMarkerType.length > 0;
                        const completeMarkerX = x + width;
                        const reopenMarkerList = Array.isArray(segment.reopenMarkerList) ? segment.reopenMarkerList : [];
                        const visibleReopenMarkers = reopenMarkerList.filter((marker) => marker.ts >= displayMinTs && marker.ts <= displayMaxTs);
                        const primaryReopenMarker = visibleReopenMarkers
                          .slice()
                          .sort((a, b) => {
                            const aType = String(a.markerType || 'REOPEN_MARKER');
                            const bType = String(b.markerType || 'REOPEN_MARKER');
                            if (aType === 'REOPEN_MARKER' && bType !== 'REOPEN_MARKER') return -1;
                            if (bType === 'REOPEN_MARKER' && aType !== 'REOPEN_MARKER') return 1;
                            return safeNumber(a.ts) - safeNumber(b.ts);
                          })[0] || null;
                        const reopenMarkerColor = GANTT_DRILL_GROUP_COLORS[toDrillGroup('REOPEN_MARKER')]
                          || SEGMENT_COLORS.REOPEN_MARKER
                          || '#64748B';

                        const markerItems = [];

                        if (isTimeoutAction) {
                          markerItems.push({
                            key: `timeout-marker-${segment.id}`,
                            rawX: timeoutStarX,
                            fill: '#DC2626',
                            markerSegment: {
                              ...segment,
                              segmentType: 'AUTO_TIMEOUT_MARKER',
                              start: segment.end,
                              end: segment.end,
                              durationSeconds: 0,
                            },
                          });
                        }

                        if (hasCompleteMarker) {
                          markerItems.push({
                            key: `complete-marker-${segment.id}`,
                            rawX: completeMarkerX,
                            fill: COMPLETE_MARKER_COLOR,
                            markerSegment: {
                              ...segment,
                              segmentType: completeMarkerType,
                              start: segment.end,
                              end: segment.end,
                              durationSeconds: 0,
                            },
                          });
                        }

                        if (primaryReopenMarker) {
                          const markerTs = primaryReopenMarker.ts;
                          const markerType = String(primaryReopenMarker.markerType || 'REOPEN_MARKER');
                          const markerTimestamp = new Date(markerTs).toISOString();
                          const relativeReopenX = x + (getX(markerTs) - getX(segment.startTs));
                          markerItems.push({
                            key: `reopen-marker-${segment.id}`,
                            rawX: Math.max(x, Math.min(x + width, relativeReopenX)),
                            fill: reopenMarkerColor,
                            markerSegment: {
                              ...segment,
                              segmentType: markerType,
                              start: markerTimestamp,
                              end: markerTimestamp,
                              durationSeconds: 0,
                            },
                          });
                        }

                        const positionedMarkers = spreadMarkerPositions(markerItems, MARKER_STAR_MIN_GAP_PX);

                        return (
                          <g key={`marker-layer-${segment.id}`}>
                            {positionedMarkers.map((markerItem) => (
                              <polygon
                                key={markerItem.key}
                                points={buildAsteriskPoints(
                                  markerItem.x,
                                  timeoutStarY,
                                  MARKER_STAR_OUTER_RADIUS,
                                  MARKER_STAR_INNER_RADIUS
                                )}
                                fill={markerItem.fill}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  pickSegment(markerItem.markerSegment, lane);
                                }}
                                onMouseEnter={(event) => showHoverTooltip(event, markerItem.markerSegment, lane)}
                                onMouseMove={(event) => showHoverTooltip(event, markerItem.markerSegment, lane)}
                                onMouseLeave={hideHoverTooltip}
                                style={{ cursor: 'pointer' }}
                              />
                            ))}
                          </g>
                        );
                      })}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      </div>
      {hoveredSegment ? (
        <div
          className="pointer-events-none absolute z-20 w-[310px] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-[0_16px_32px_-20px_rgba(15,23,42,0.65)]"
          style={{ left: `${hoveredSegment.x}px`, top: `${hoveredSegment.y}px` }}
        >
          <div className="text-[11px] font-semibold text-slate-800">
            {toGanttSegmentTypeLabel(hoveredSegment.segmentType)} ({toDisplaySegmentTypeCode(hoveredSegment.segmentType)})
          </div>
          <div className="mt-0.5 text-[11px] text-slate-600">Group: {hoveredSegment.groupLabel || '-'}</div>
          <div className="mt-1 text-[11px] text-slate-600">Lane: {hoveredSegment.lane || '-'}</div>
          <div className="mt-0.5 text-[11px] text-slate-600">Start: {toDisplayDate(hoveredSegment.start)}</div>
          <div className="mt-0.5 text-[11px] text-slate-600">End: {toDisplayDate(hoveredSegment.end)}</div>
          <div className="mt-0.5 text-[11px] text-slate-600">Duration: {formatDuration(hoveredSegment.durationSeconds)}</div>
        </div>
      ) : null}

    </div>
  );
};
