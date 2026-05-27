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

  // Virtualization State
  const [scrollState, setScrollState] = useState({ left: 0, top: 0, viewW: 1000, viewH: 600 });
  const scrollRequestRef = useRef(null);

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
        userName: segment.userName,
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

  // Viewport tracking
  useEffect(() => {
    const updateSize = () => {
      if (bodyScrollRef.current) {
        setScrollState(prev => ({
          ...prev,
          viewW: bodyScrollRef.current.clientWidth,
          viewH: verticalScrollRef.current?.clientHeight || 600
        }));
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const onBodyScroll = (event) => {
    const { scrollLeft } = event.currentTarget;
    if (headerScrollRef.current) headerScrollRef.current.scrollLeft = scrollLeft;
    
    if (scrollRequestRef.current) cancelAnimationFrame(scrollRequestRef.current);
    scrollRequestRef.current = requestAnimationFrame(() => {
      setScrollState(prev => ({ ...prev, left: scrollLeft }));
    });
  };

  const onVerticalScroll = (event) => {
    const { scrollTop } = event.currentTarget;
    if (scrollRequestRef.current) cancelAnimationFrame(scrollRequestRef.current);
    scrollRequestRef.current = requestAnimationFrame(() => {
      setScrollState(prev => ({ ...prev, top: scrollTop }));
    });
  };

  useEffect(() => {
    const bodyViewport = bodyScrollRef.current;
    if (!bodyViewport) return;
    requestAnimationFrame(() => {
      bodyViewport.scrollLeft = 0;
      if (headerScrollRef.current) headerScrollRef.current.scrollLeft = 0;
      if (verticalScrollRef.current) verticalScrollRef.current.scrollTop = 0;
      setScrollState(prev => ({ ...prev, left: 0, top: 0 }));
    });
  }, [mapped.length]);

  if (mapped.length === 0) return null;

  const laneVisibleSegments = useMemo(() => mapped.filter((segment) => {
    if (!showSystemLane && segment.origLane === 'System') return false;
    if (!showIdleLane && segment.origLane === 'Idle') return false;
    return true;
  }), [mapped, showSystemLane, showIdleLane]);

  const { displayMinTs, displayMaxTs } = useMemo(() => {
    const boundsSegments = laneVisibleSegments.length > 0 ? laneVisibleSegments : mapped;
    const fMin = boundsSegments.reduce((min, item) => Math.min(min, item.startTs), boundsSegments[0].startTs);
    const fMax = boundsSegments.reduce((max, item) => Math.max(max, item.endTs), boundsSegments[0].endTs);
    const pad = Math.min(10 * 60 * 1000, Math.max(1 * 60 * 1000, (fMax - fMin) * 0.005));
    return { displayMinTs: fMin - pad, displayMaxTs: fMax + pad };
  }, [laneVisibleSegments, mapped]);

  const visibleSegments = useMemo(() => mapped.filter((segment) => {
    if (segment.endTs < displayMinTs || segment.startTs > displayMaxTs) return false;
    if (!showSystemLane && segment.origLane === 'System') return false;
    if (!showIdleLane && segment.origLane === 'Idle') return false;
    return true;
  }), [mapped, displayMinTs, displayMaxTs, showSystemLane, showIdleLane]);

  const COMPACTION_THRESHOLD_MS = 30 * 1000;
  const VISUAL_GAP_MS = 10 * 1000;

  const gapsInfo = useMemo(() => {
    if (!collapseGaps || visibleSegments.length === 0) return { gaps: [], compactedMinTs: displayMinTs, compactedMaxTs: displayMaxTs, totalExcess: 0 };
    
    const activeIntervals = [];
    visibleSegments.forEach((seg) => {
      activeIntervals.push({ start: seg.startTs, end: seg.endTs });
      if (Array.isArray(seg.reopenMarkerList)) {
        seg.reopenMarkerList.forEach((m) => activeIntervals.push({ start: m.ts, end: m.ts }));
      }
    });

    activeIntervals.sort((a, b) => a.start - b.start);

    const merged = [];
    activeIntervals.forEach((interval) => {
      const prev = merged[merged.length - 1];
      if (!prev) { merged.push({ ...interval }); return; }
      if (interval.start <= prev.end + 5000) { prev.end = Math.max(prev.end, interval.end); }
      else { merged.push({ ...interval }); }
    });

    const gaps = [];
    let lastTs = displayMinTs;
    let cumulativeExcess = 0;
    
    merged.forEach((interval) => {
      if (interval.start > lastTs + COMPACTION_THRESHOLD_MS) {
        const span = interval.start - lastTs;
        const excess = span - VISUAL_GAP_MS;
        gaps.push({ start: lastTs, end: interval.start, originalSpan: span, excessSpan: excess, cumulativeExcess });
        cumulativeExcess += excess;
      }
      lastTs = interval.end;
    });

    const lastSpan = displayMaxTs - lastTs;
    if (lastSpan > COMPACTION_THRESHOLD_MS) {
      const excess = lastSpan - VISUAL_GAP_MS;
      gaps.push({ start: lastTs, end: displayMaxTs, originalSpan: lastSpan, excessSpan: excess, cumulativeExcess });
      cumulativeExcess += excess;
    }

    return { gaps, compactedMinTs: displayMinTs, compactedMaxTs: displayMaxTs - cumulativeExcess, totalExcess: cumulativeExcess };
  }, [collapseGaps, visibleSegments, displayMinTs, displayMaxTs]);

  const getCompactedTs = (realTs) => {
    const { gaps } = gapsInfo;
    if (gaps.length === 0) return realTs;
    
    let low = 0, high = gaps.length - 1;
    let foundGap = null;
    let prevGapsExcess = 0;

    while (low <= high) {
      const mid = (low + high) >> 1;
      const gap = gaps[mid];
      if (realTs < gap.start) {
        high = mid - 1;
      } else if (realTs > gap.end) {
        prevGapsExcess = gap.cumulativeExcess + gap.excessSpan;
        low = mid + 1;
      } else {
        foundGap = gap;
        break;
      }
    }

    if (foundGap) {
      const fraction = (realTs - foundGap.start) / foundGap.originalSpan;
      return realTs - (foundGap.cumulativeExcess + fraction * foundGap.excessSpan);
    }
    return realTs - prevGapsExcess;
  };

  const displaySpanMs = Math.max(displayMaxTs - displayMinTs - gapsInfo.totalExcess, 60000);
  const displaySpanHours = displaySpanMs / 3600000;

  const pxPerHour = 120;
  const legendItems = GANTT_DRILL_GROUPS.filter((item) => {
    if (item.key === 'Reprocessing' || item.key === 'ReviewAutoClose') return false;
    if (!showIdleLane && item.key === 'Idle') return false;
    if (!showSystemLane && item.key === 'Processing') return false;
    if (!showStarMarkers && item.key === 'EditAndComplete') return false;
    return true;
  });

  const lanes = useMemo(() => {
    const laneDurationMap = {};
    visibleSegments.forEach((item) => {
      if (!laneDurationMap[item.lane]) laneDurationMap[item.lane] = 0;
      laneDurationMap[item.lane] += item.durationSeconds;
    });

    return Object.keys(laneDurationMap).sort((a, b) => {
      const p = (n) => n === 'System' ? 1 : (n === 'Idle' ? 2 : 3);
      const diff = p(a) - p(b);
      if (diff !== 0) return diff;
      return (laneDurationMap[b] - laneDurationMap[a]) || a.localeCompare(b);
    }).filter((l) => (showSystemLane || l !== 'System') && (showIdleLane || l !== 'Idle'));
  }, [visibleSegments, showSystemLane, showIdleLane]);

  const laneToSegments = useMemo(() => {
    const groups = {};
    visibleSegments.forEach(s => {
      if (!groups[s.lane]) groups[s.lane] = [];
      groups[s.lane].push(s);
    });
    const res = {};
    lanes.forEach(l => {
      const segs = (groups[l] || []).sort((a, b) => a.startTs - b.startTs);
      res[l] = mergeContinuousReprocessingSegments(segs);
    });
    return res;
  }, [lanes, visibleSegments]);

  const timelinePadLeft = 14;
  const timelinePadRight = 18;
  const minTimelinePx = collapseGaps ? (singleLane ? 1950 : 1600) : 2200;
  const baseTimelineWidth = Math.min(120000, Math.max(minTimelinePx, Math.round(displaySpanHours * pxPerHour)));
  const timelineWidth = Math.min(GANTT_MAX_TIMELINE_WIDTH_PX, Math.max(minTimelinePx, Math.round(baseTimelineWidth * zoomScale)));

  const baseCompactedTs = useMemo(() => getCompactedTs(displayMinTs), [displayMinTs, gapsInfo]);
  const pxPerMs = useMemo(() => timelineWidth / displaySpanMs, [timelineWidth, displaySpanMs]);

  const getX = (ts) => {
    const realTs = typeof ts === 'number' ? ts : Date.parse(String(ts));
    const nTs = Number.isFinite(realTs) ? realTs : displayMinTs;
    return timelinePadLeft + (getCompactedTs(nTs) - baseCompactedTs) * pxPerMs;
  };

  const laneToPositionedBars = useMemo(() => {
    const res = {};
    const bComp = baseCompactedTs;
    const ppm = pxPerMs;
    const padL = timelinePadLeft;
    
    lanes.forEach(l => {
      const bars = laneToSegments[l] || [];
      const positioned = [];
      let lastRight = -1;
      
      bars.forEach(s => {
        const x1 = padL + (getCompactedTs(Math.max(s.startTs, displayMinTs)) - bComp) * ppm;
        const x2 = padL + (getCompactedTs(Math.min(s.endTs, displayMaxTs)) - bComp) * ppm;
        
        let x = x1;
        const minW = s.segmentType === 'USER_UPLOADING' ? 14 : 8;
        const w = Math.max(minW, x2 - x1);
        
        if (x < lastRight + 1.5) {
          x = lastRight + 1.5;
        }
        
        positioned.push({ s, x, w });
        lastRight = x + w;
      });
      res[l] = positioned;
    });
    return res;
  }, [lanes, laneToSegments, timelineWidth, displayMinTs, displayMaxTs, baseCompactedTs, pxPerMs, gapsInfo]);

  const timelineSvgWidth = useMemo(() => {
    let maxR = timelinePadLeft + timelineWidth + timelinePadRight;
    lanes.forEach(l => {
      const pBars = laneToPositionedBars[l] || [];
      if (pBars.length > 0) {
        const last = pBars[pBars.length - 1];
        maxR = Math.max(maxR, last.x + last.w + timelinePadRight + 45);
      }
    });
    return maxR;
  }, [lanes, laneToPositionedBars, timelineWidth]);

  const laneLabelWidth = expanded ? 210 : 132;
  const headerHeight = 50;
  const rowHeight = 34;
  const rowGap = 10;
  const rowSlotHeight = rowHeight + rowGap;
  const rowTopPadding = 8;
  const bodyChartHeight = rowTopPadding + lanes.length * rowSlotHeight + 10;
  const timelineViewportHeight = expanded ? Math.max(rowSlotHeight + 12, lanes.length * rowSlotHeight + 12) : (Math.max(1, Math.min(7, lanes.length)) * rowSlotHeight + 12);

  const ticks = useMemo(() => {
    const stepCandidates = [1800000, 3600000, 7200000, 10800000, 14400000, 21600000, 28800000, 43200000, 86400000];
    const effPxPerHour = timelineWidth / Math.max(displaySpanHours, 1);
    const step = stepCandidates.find(c => (c / 3600000 * effPxPerHour) >= 120) || 86400000;
    const start = Math.floor(displayMinTs / step) * step;
    let res = [];
    for (let t = start; t <= displayMaxTs + step; t += step) {
      if (t >= displayMinTs && t <= displayMaxTs) res.push(t);
    }
    if (res.length === 0) res.push(displayMinTs);
    if (res[res.length - 1] < displayMaxTs) res.push(displayMaxTs);

    if (collapseGaps) {
      res = res.filter(t => t === displayMinTs || t === displayMaxTs || visibleSegments.some(s => t >= s.startTs - 120000 && t <= s.endTs + 120000));
    }

    const final = [];
    res.sort((a,b)=>a-b).forEach(t => {
      if (final.length === 0) { final.push(t); return; }
      const lastX = getX(final[final.length-1]);
      const currX = getX(t);
      if (t === displayMaxTs) {
        if (currX - lastX >= 65) final.push(t);
        else if (final.length > 1) final[final.length-1] = t;
      } else if (currX - lastX >= 65) final.push(t);
    });
    return final;
  }, [timelineWidth, displayMinTs, displayMaxTs, collapseGaps, visibleSegments, baseCompactedTs, pxPerMs, gapsInfo]);

  // Virtualization calculations
  const bufferLanes = 3;
  const startLaneIdx = Math.max(0, Math.floor((scrollState.top - rowTopPadding) / rowSlotHeight) - bufferLanes);
  const endLaneIdx = Math.min(lanes.length - 1, Math.ceil((scrollState.top + scrollState.viewH) / rowSlotHeight) + bufferLanes);
  
  const visibleLanes = lanes.slice(startLaneIdx, endLaneIdx + 1);
  const visibleTicks = ticks.filter(t => {
    const x = getX(t);
    return x >= scrollState.left - 200 && x <= scrollState.left + scrollState.viewW + 200;
  });

  const onDragStart = (e) => {
    if (!bodyScrollRef.current) return;
    dragRef.current = { active: true, startX: e.clientX, startScrollLeft: bodyScrollRef.current.scrollLeft };
  };

  const onDragMove = (e) => {
    if (!dragRef.current.active || !bodyScrollRef.current) return;
    bodyScrollRef.current.scrollLeft = dragRef.current.startScrollLeft - (e.clientX - dragRef.current.startX);
  };

  const onDragEnd = () => dragRef.current.active = false;

  useEffect(() => {
    const viewport = bodyScrollRef.current;
    if (!viewport) return;
    const onWheel = (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const zoomIn = e.deltaY < 0;
      const nextZoom = Math.max(GANTT_MIN_ZOOM_SCALE, Math.min(GANTT_MAX_ZOOM_SCALE, zoomScaleRef.current * (zoomIn ? 1.15 : 0.87)));
      if (Math.abs(nextZoom - zoomScaleRef.current) < 0.001) return;

      const rect = viewport.getBoundingClientRect();
      const anchorX = e.clientX - rect.left;
      const absoluteX = viewport.scrollLeft + anchorX;
      const time = displayMinTs + ((absoluteX - timelinePadLeft) / timelineWidth) * displaySpanMs;
      
      pendingZoomAnchorRef.current = { anchorX, time };
      zoomScaleRef.current = nextZoom;
      setZoomScale(nextZoom);
    };
    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', onWheel);
  }, [timelineWidth, displaySpanMs]);

  useLayoutEffect(() => {
    if (!pendingZoomAnchorRef.current || !bodyScrollRef.current) return;
    const { anchorX, time } = pendingZoomAnchorRef.current;
    const nextX = getX(time);
    bodyScrollRef.current.scrollLeft = nextX - anchorX;
    pendingZoomAnchorRef.current = null;
  }, [zoomScale]);

  const showTT = (e, s, l) => {
    if (!containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    setHoveredSegment({
      x: Math.max(8, Math.min(e.clientX - r.left + 12, r.width - 318)),
      y: Math.max(8, Math.min(e.clientY - r.top + 12, r.height - 132)),
      lane: l,
      groupLabel: GANTT_DRILL_GROUP_LABELS[s.drillGroup] || s.drillGroup,
      segmentType: s.segmentType,
      start: s.start,
      end: s.end,
      durationSeconds: s.durationSeconds,
    });
  };

  return (
    <div className="space-y-2 relative select-none" ref={containerRef}>
      {showGanttLegend && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 py-1 text-xs text-slate-600">
          {legendItems.map((item) => (
            <span key={item.key} className="inline-flex items-center gap-1.5">
              {item.key === 'EditAndComplete' ? (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={item.color}><polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" /></svg>
              ) : <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>}
              {item.label}
            </span>
          ))}
        </div>
      )}

      <div className="rounded-xl bg-slate-50/30 border border-slate-200 overflow-hidden shadow-sm">
        <div className="flex border-b border-slate-200 bg-slate-50/80 backdrop-blur-sm sticky top-0 z-20">
          <div style={{ width: laneLabelWidth }} className="shrink-0 border-r border-slate-200 p-3 flex items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lane</span>
          </div>
          <div ref={headerScrollRef} className="flex-1 overflow-hidden no-scrollbar">
            <svg width={timelineSvgWidth} height={headerHeight}>
              {visibleTicks.map((tick, idx) => {
                const x = getX(tick);
                const h = formatTickHeader(tick);
                const showDate = idx === 0 || !isSameCalendarDay(visibleTicks[idx-1], tick);
                return (
                  <g key={tick}>
                    <line x1={x} x2={x} y1={headerHeight-15} y2={headerHeight} stroke="#CBD5E1" />
                    <text x={x} y="18" textAnchor="middle" className="fill-slate-500 text-[10px] font-medium">
                      <tspan x={x}>{showDate ? h.dateLabel : ''}</tspan>
                      <tspan x={x} dy="13">{h.timeLabel}</tspan>
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <div 
          ref={verticalScrollRef} 
          onScroll={onVerticalScroll}
          className="overflow-y-auto no-scrollbar" 
          style={{ maxHeight: timelineViewportHeight }}
        >
          <div className="flex min-w-0" style={{ height: bodyChartHeight }}>
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

            <div
              ref={bodyScrollRef}
              onScroll={onBodyScroll}
              onMouseDown={onDragStart}
              onMouseMove={onDragMove}
              onMouseUp={onDragEnd}
              onMouseLeave={() => { onDragEnd(); setHoveredSegment(null); }}
              className="flex-1 overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing"
            >
              <svg width={timelineSvgWidth} height={bodyChartHeight} className="block bg-white/50">
                {visibleTicks.map(t => <line key={t} x1={getX(t)} x2={getX(t)} y1={0} y2={bodyChartHeight} stroke="#F1F5F9" />)}
                
                {visibleLanes.map((lane) => {
                  const laneIdx = lanes.indexOf(lane);
                  const y = rowTopPadding + laneIdx * rowSlotHeight;
                  const pBars = laneToPositionedBars[lane] || [];
                  const leftBound = scrollState.left - 500;
                  const rightBound = scrollState.left + scrollState.viewW + 500;

                  return (
                    <g key={lane}>
                      {pBars.map((p, bIdx) => {
                        const { s, x, w } = p;
                        if (x + w < leftBound || x > rightBound) return null;

                        const color = lane === 'Idle' ? '#94A3B8' : (GANTT_DRILL_GROUP_COLORS[s.drillGroup] || SEGMENT_COLORS[s.segmentType] || '#64748B');
                        return (
                          <g key={`${s.id}-${bIdx}`} onClick={() => pickSegment(s, lane)} onMouseEnter={e => showTT(e, s, lane)} onMouseMove={e => showTT(e, s, lane)} style={{ cursor: 'pointer' }}>
                            <rect x={x} y={y + 4} width={w} height={rowHeight - 8} rx="6" fill={color} opacity="0.9" />
                            {showStarMarkers && (
                              <g>
                                {(s.segmentType === 'USER_REVIEW_AUTO_TIMEOUT' || s.autoTimeout) && (
                                  <polygon points={buildAsteriskPoints(x + w - 2, y + rowHeight/2, 4, 2)} fill="#EF4444" />
                                )}
                                {toCompleteMarkerType(s) && (
                                  <polygon points={buildAsteriskPoints(x + w + 4, y + rowHeight/2, 4, 2)} fill={COMPLETE_MARKER_COLOR} />
                                )}
                                {s.reopenMarkerList && s.reopenMarkerList.length > 0 && (
                                  <polygon points={buildAsteriskPoints(x + 2, y + rowHeight/2, 4, 2)} fill="#A855F7" />
                                )}
                              </g>
                            )}
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

      {hoveredSegment && (
        <div 
          className="pointer-events-none fixed z-[200] w-[310px] rounded-xl border border-slate-200 bg-white/95 backdrop-blur-sm p-4 shadow-2xl animate-in fade-in zoom-in duration-150"
          style={{ left: hoveredSegment.x + (containerRef.current?.getBoundingClientRect().left || 0), top: hoveredSegment.y + (containerRef.current?.getBoundingClientRect().top || 0) }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <div className="text-xs font-bold text-slate-800 uppercase tracking-tight truncate">{toGanttSegmentTypeLabel(hoveredSegment.segmentType)}</div>
          </div>
          <div className="space-y-1 text-[10px] font-medium text-slate-500">
            <div className="flex justify-between"><span>Lane</span><span className="text-slate-800">{hoveredSegment.lane}</span></div>
            <div className="flex justify-between"><span>Duration</span><span className="text-slate-800">{formatDuration(hoveredSegment.durationSeconds)}</span></div>
            <div className="flex justify-between"><span>Time</span><span className="text-slate-800">{formatTimeTick(hoveredSegment.start)} - {formatTimeTick(hoveredSegment.end)}</span></div>
          </div>
        </div>
      )}
    </div>
  );
};
