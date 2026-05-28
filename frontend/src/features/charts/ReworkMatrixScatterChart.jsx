import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SlidersHorizontal, Maximize2, RefreshCw } from 'lucide-react';
import { CHART_PALETTE } from '../../lib/constants.js';
import { safeNumber, formatDuration, formatPercent } from '../../lib/utils.js';

const VIBRANT_PALETTE = ['#F43F5E', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#D946EF', '#84CC16', '#F97316'];

export const ReworkMatrixScatterChart = React.memo(({ 
  rows = [], 
  expanded = false, 
  showQuadrants = false 
}) => {
  const svgRef = useRef(null);
  const dragRef = useRef({ active: false, x: 0, y: 0, view: null });
  const panFrameRef = useRef(null);
  const pendingViewRef = useRef(null);
  const [hoveredUser, setHoveredUser] = useState(null);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const sourceRows = Array.isArray(rows) ? rows : [];

  const prepared = useMemo(() => sourceRows
      .slice(0, 8)
      .map((row, idx) => ({
        user: row.user || `User ${idx + 1}`,
        avgTimePerDocSeconds: safeNumber(row.avgTimePerDocSeconds),
        reworkRate: Math.max(0, Math.min(1, safeNumber(row.reworkRate))),
        autoClosedRate: Math.max(0, Math.min(1, safeNumber(row.autoClosedRate))),
        totalActiveSeconds: safeNumber(row.totalActiveSeconds),
      }))
      .filter((row) => row.avgTimePerDocSeconds > 0 || row.reworkRate > 0 || row.totalActiveSeconds > 0),
    [sourceRows]
  );

  const maxX = prepared.reduce((max, row) => Math.max(max, row.avgTimePerDocSeconds), 0) || 1;
  const xDomainMax = Math.max(1, maxX * 1.08);
  const maxY = prepared.reduce((max, row) => Math.max(max, row.reworkRate), 0) || 0;
  const yDomainMax = Math.max(0.05, maxY * 1.1);
  const [view, setView] = useState({ xMin: 0, xMax: xDomainMax, yMin: 0, yMax: yDomainMax });

  useEffect(() => {
    setView({ xMin: 0, xMax: xDomainMax, yMin: 0, yMax: yDomainMax });
  }, [xDomainMax, yDomainMax, expanded]);

  const minActive = prepared.reduce(
    (min, row) => Math.min(min, row.totalActiveSeconds),
    prepared[0]?.totalActiveSeconds || 0
  );
  const maxActive = prepared.reduce((max, row) => Math.max(max, row.totalActiveSeconds), 0) || 1;
  const activeRange = Math.max(0, maxActive - minActive);

  const width = expanded ? 820 : 620;
  const height = expanded ? 420 : 350;
  const maxBubbleRadius = expanded ? 26 : 20;

  const margin = expanded
    ? { top: 30, right: 34, bottom: 58, left: 66 }
    : { top: 24, right: 24, bottom: 48, left: 56 };

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const clampView = (nextView) => {
    const minXSpan = xDomainMax / 8;
    const minYSpan = yDomainMax / 8;
    const xSpan = Math.min(xDomainMax, Math.max(minXSpan, nextView.xMax - nextView.xMin));
    const ySpan = Math.min(yDomainMax, Math.max(minYSpan, nextView.yMax - nextView.yMin));

    let xMin = nextView.xMin;
    let yMin = nextView.yMin;
    if (xMin < 0) xMin = 0;
    if (xMin + xSpan > xDomainMax) xMin = xDomainMax - xSpan;
    if (yMin < 0) yMin = 0;
    if (yMin + ySpan > yDomainMax) yMin = yDomainMax - ySpan;

    return { xMin, xMax: xMin + xSpan, yMin, yMax: yMin + ySpan };
  };

  const normalizedView = clampView(view.xMax <= xDomainMax && view.yMax <= yDomainMax ? view : { xMin: 0, xMax: xDomainMax, yMin: 0, yMax: yDomainMax });
  const xSpan = normalizedView.xMax - normalizedView.xMin;
  const ySpan = normalizedView.yMax - normalizedView.yMin;
  const isZoomed = xSpan < xDomainMax - 0.001 || ySpan < yDomainMax - 0.0001;
  const x = (v) => margin.left + ((safeNumber(v) - normalizedView.xMin) / xSpan) * innerWidth;
  const y = (v) => margin.top + ((normalizedView.yMax - Math.max(0, Math.min(yDomainMax, safeNumber(v)))) / ySpan) * innerHeight;
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((tick) => normalizedView.xMin + xSpan * tick);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((tick) => normalizedView.yMin + ySpan * tick);

  const bubbleRadius = (active) => {
    const minRadius = expanded ? 6 : 5;
    const maxRadius = maxBubbleRadius;
    if (activeRange <= 0) return (minRadius + maxRadius) / 2;

    const normalized = (Math.max(0, active) - minActive) / activeRange;
    return minRadius + Math.max(0, Math.min(1, normalized)) * (maxRadius - minRadius);
  };

  const zoomAt = (scaleFactor, anchorX = 0.5, anchorY = 0.5) => {
    const current = clampView(view);
    const currentXSpan = current.xMax - current.xMin;
    const currentYSpan = current.yMax - current.yMin;
    const nextXSpan = currentXSpan / scaleFactor;
    const nextYSpan = currentYSpan / scaleFactor;
    const xAnchor = current.xMin + currentXSpan * anchorX;
    const yAnchor = current.yMax - currentYSpan * anchorY;

    setView(clampView({
      xMin: xAnchor - nextXSpan * anchorX,
      xMax: xAnchor + nextXSpan * (1 - anchorX),
      yMin: yAnchor - nextYSpan * (1 - anchorY),
      yMax: yAnchor + nextYSpan * anchorY,
    }));
  };

  const getSvgPoint = (event) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: ((event.clientX - rect.left) / rect.width) * width,
      y: ((event.clientY - rect.top) / rect.height) * height,
    };
  };

  const onWheel = (event) => {
    if (event.ctrlKey) {
      event.preventDefault();
      const point = getSvgPoint(event);
      if (!point) return;
      const anchorX = Math.max(0, Math.min(1, (point.x - margin.left) / innerWidth));
      const anchorY = Math.max(0, Math.min(1, (point.y - margin.top) / innerHeight));
      zoomAt(event.deltaY < 0 ? 1.18 : 0.85, anchorX, anchorY);
      return;
    }

    if (!isZoomed) return;

    event.preventDefault();
    const deltaUnit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 120 : 1;
    const current = clampView(view);
    const currentXSpan = current.xMax - current.xMin;
    const currentYSpan = current.yMax - current.yMin;
    const xShift = (event.deltaX * deltaUnit / innerWidth) * currentXSpan;
    const yShift = -(event.deltaY * deltaUnit / innerHeight) * currentYSpan;

    setView(clampView({
      xMin: current.xMin + xShift,
      xMax: current.xMax + xShift,
      yMin: current.yMin + yShift,
      yMax: current.yMax + yShift,
    }));
  };

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;

    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  const onPointerDown = (event) => {
    if (!isZoomed) return;
    const point = getSvgPoint(event);
    if (!point) return;
    dragRef.current = { active: true, x: point.x, y: point.y, view: normalizedView };
  };

  const onPointerMove = (event) => {
    if (!dragRef.current.active) return;
    const point = getSvgPoint(event);
    if (!point) return;
    const { x: startX, y: startY, view: startView } = dragRef.current;
    const nextXShift = -((point.x - startX) / innerWidth) * (startView.xMax - startView.xMin);
    const nextYShift = ((point.y - startY) / innerHeight) * (startView.yMax - startView.yMin);
    pendingViewRef.current = clampView({
      xMin: startView.xMin + nextXShift,
      xMax: startView.xMax + nextXShift,
      yMin: startView.yMin + nextYShift,
      yMax: startView.yMax + nextYShift,
    });

    if (panFrameRef.current) return;
    panFrameRef.current = requestAnimationFrame(() => {
      panFrameRef.current = null;
      if (pendingViewRef.current) setView(pendingViewRef.current);
    });
  };

  const onPointerUp = (event) => {
    dragRef.current.active = false;
  };

  const onPointerLeave = () => {
    dragRef.current.active = false;
    setHoveredUser(null);
  };

  const clipId = `quality-edit-plot-${expanded ? 'expanded' : 'compact'}`;

  if (prepared.length === 0) return null;

  const hoveredData = hoveredUser ? prepared.find(p => p.user === hoveredUser) : null;
  const occupiedLabelBoxes = [];
  const getPointLabelPosition = (row, pointX, pointY, pointRadius, shortLabel) => {
    const labelWidth = Math.max(46, shortLabel.length * 6.8);
    const labelHeight = 14;
    const candidates = [
      { x: pointX, y: pointY - pointRadius - 9, anchor: 'middle' },
      { x: pointX, y: pointY + pointRadius + 17, anchor: 'middle' },
      { x: pointX + pointRadius + 9, y: pointY + 4, anchor: 'start' },
      { x: pointX - pointRadius - 9, y: pointY + 4, anchor: 'end' },
    ];

    const boundsFor = (candidate) => {
      const left = candidate.anchor === 'middle'
        ? candidate.x - labelWidth / 2
        : candidate.anchor === 'end'
          ? candidate.x - labelWidth
          : candidate.x;
      return {
        left,
        right: left + labelWidth,
        top: candidate.y - labelHeight,
        bottom: candidate.y + 3,
      };
    };

    const overlaps = (box) => occupiedLabelBoxes.some((used) => (
      box.left < used.right + 3
      && box.right > used.left - 3
      && box.top < used.bottom + 2
      && box.bottom > used.top - 2
    ));

    const inPlot = (box) => (
      box.left >= margin.left + 2
      && box.right <= width - margin.right - 2
      && box.top >= margin.top + 2
      && box.bottom <= height - margin.bottom - 2
    );

    const selected = candidates.find((candidate) => {
      const box = boundsFor(candidate);
      return inPlot(box) && !overlaps(box);
    }) || candidates.find((candidate) => inPlot(boundsFor(candidate))) || candidates[0];

    const selectedBox = boundsFor(selected);
    occupiedLabelBoxes.push(selectedBox);
    return selected;
  };

  return (
    <div className={`mt-1 overflow-hidden relative group ${expanded ? 'w-full max-w-[900px] mx-auto px-1' : ''}`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto bg-white block cursor-default"
        style={{ overflow: 'hidden', touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}
      >
        <defs>
          <clipPath id={clipId}>
            <rect
              x={margin.left - maxBubbleRadius}
              y={margin.top - maxBubbleRadius}
              width={innerWidth + maxBubbleRadius * 2}
              height={innerHeight + maxBubbleRadius * 2}
            />
          </clipPath>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Quadrant Background Colors */}
        {showQuadrants && !isZoomed && (
          <g opacity="0.05" className="pointer-events-none">
            <rect x={margin.left} y={margin.top} width={innerWidth / 2} height={innerHeight / 2} fill="#F59E0B" />
            <rect x={margin.left + innerWidth / 2} y={margin.top} width={innerWidth / 2} height={innerHeight / 2} fill="#EF4444" />
            <rect x={margin.left} y={margin.top + innerHeight / 2} width={innerWidth / 2} height={innerHeight / 2} fill="#10B981" />
            <rect x={margin.left + innerWidth / 2} y={margin.top + innerHeight / 2} width={innerWidth / 2} height={innerHeight / 2} fill="#3B82F6" />
          </g>
        )}

        {/* Grid Lines */}
        {yTicks.map((tick) => (
          <line
            key={`h-${tick}`}
            className="pointer-events-none"
            x1={margin.left}
            x2={width - margin.right}
            y1={y(tick)}
            y2={y(tick)}
            stroke={tick <= 0.001 ? '#CBD5E1' : '#F1F5F9'}
            strokeWidth={tick <= 0.001 ? '1.5' : '1'}
            strokeDasharray={tick <= 0.001 ? '0' : '3 3'}
          />
        ))}
        {xTicks.map((tick) => (
          <line
            key={`v-${tick}`}
            className="pointer-events-none"
            y1={margin.top}
            y2={height - margin.bottom}
            x1={x(tick)}
            x2={x(tick)}
            stroke={tick <= 0.001 ? '#CBD5E1' : '#F1F5F9'}
            strokeWidth={tick <= 0.001 ? '1.5' : '1'}
            strokeDasharray={tick <= 0.001 ? '0' : '3 3'}
          />
        ))}

        {/* Hover Crosshairs */}
        {hoveredData && (
          <g className="pointer-events-none transition-opacity duration-300">
            <line 
              x1={margin.left} x2={x(hoveredData.avgTimePerDocSeconds)} 
              y1={y(hoveredData.reworkRate)} y2={y(hoveredData.reworkRate)} 
              stroke="#94A3B8" strokeWidth="1" strokeDasharray="4 4" 
            />
            <line 
              x1={x(hoveredData.avgTimePerDocSeconds)} x2={x(hoveredData.avgTimePerDocSeconds)} 
              y1={y(hoveredData.reworkRate)} y2={height - margin.bottom} 
              stroke="#94A3B8" strokeWidth="1" strokeDasharray="4 4" 
            />
          </g>
        )}

        {/* Quadrant Text Labels */}
        {showQuadrants && !isZoomed && (
          <g className="pointer-events-none select-none" opacity="0.85">
            <text x={margin.left + 14} y={margin.top + 28} className="fill-amber-600/70 text-[12px] font-black italic uppercase">FAST ITERATION</text>
            <text x={width - margin.right - 14} y={margin.top + 28} textAnchor="end" className="fill-red-600/70 text-[12px] font-black italic uppercase">HIGH COMPLEXITY</text>
            <text x={margin.left + 14} y={height - margin.bottom - 12} className="fill-emerald-600/70 text-[12px] font-black italic uppercase">PRECISION SPEED</text>
            <text x={width - margin.right - 14} y={height - margin.bottom - 12} textAnchor="end" className="fill-[#2563EB] opacity-70 text-[12px] font-black italic uppercase">CAREFUL ANALYSIS</text>
          </g>
        )}

        {/* Axis Ticks */}
        {yTicks.map((tick) => (
          <text key={`yt-${tick}`} x={margin.left - 12} y={y(tick) + 4} textAnchor="end" className="fill-black text-[11px] pointer-events-none">
            {Math.round(tick * 1000) / 10}%
          </text>
        ))}
        {xTicks.map((tick) => (
          <text key={`xt-${tick}`} x={x(tick)} y={height - margin.bottom + 18} textAnchor="middle" className="fill-black text-[11px] pointer-events-none">
            {formatDuration(tick)}
          </text>
        ))}

        <g clipPath={`url(#${clipId})`}>
          {prepared.map((row, idx) => {
            const px = x(row.avgTimePerDocSeconds);
            const py = y(row.reworkRate);
            const pointRadius = bubbleRadius(row.totalActiveSeconds);
            const color = VIBRANT_PALETTE[idx % VIBRANT_PALETTE.length];
            const shortUserLabel = row.user.length > 14 ? `${row.user.slice(0, 14)}...` : row.user;
            const isHovered = hoveredUser === row.user;
            
            if (px + pointRadius < margin.left - 10 || px - pointRadius > width - margin.right + 10 || py + pointRadius < margin.top - 10 || py - pointRadius > height - margin.bottom + 10) return null;

            const labelPosition = getPointLabelPosition(row, px, py, pointRadius, shortUserLabel);
            
            return (
              <g 
                key={row.user} 
                className="cursor-pointer"
                onMouseEnter={() => setHoveredUser(row.user)}
                onMouseLeave={() => setHoveredUser(null)}
              >
                <circle 
                  cx={px} 
                  cy={py} 
                  r={mounted ? (isHovered ? pointRadius * 1.15 : pointRadius) : 0} 
                  fill={color} 
                  opacity={isHovered ? 1 : 0.85} 
                  stroke="#ffffff" 
                  strokeWidth={isHovered ? 3 : 2}
                  filter={isHovered ? 'url(#glow)' : ''}
                  className="transition-all duration-300 ease-out"
                />
                <text 
                  x={labelPosition.x}
                  y={labelPosition.y}
                  textAnchor={labelPosition.anchor}
                  className={`fill-black text-[11px] pointer-events-none transition-all duration-300 ${isHovered ? 'font-bold' : 'font-semibold'} ${mounted ? 'opacity-100' : 'opacity-0'}`}
                >
                  {shortUserLabel}
                </text>
              </g>
            );
          })}
        </g>

        {/* Custom Rich Tooltip */}
        {hoveredData && (
          <g className="pointer-events-none">
            {(() => {
              const tx = x(hoveredData.avgTimePerDocSeconds);
              const ty = y(hoveredData.reworkRate);
              const tr = bubbleRadius(hoveredData.totalActiveSeconds);
              const tooltipW = 160;
              const tooltipH = 85;
              const boxX = Math.max(margin.left + 5, Math.min(width - margin.right - tooltipW - 5, tx + tr + 10));
              const boxY = Math.max(margin.top + 5, Math.min(height - margin.bottom - tooltipH - 5, ty - tooltipH / 2));
              
              return (
                <g transform={`translate(${boxX}, ${boxY})`} className="drop-shadow-lg">
                  <rect width={tooltipW} height={tooltipH} rx="8" fill="white" stroke="#E2E8F0" strokeWidth="1" />
                  <rect width="4" height={tooltipH} rx="2" fill={VIBRANT_PALETTE[prepared.findIndex(p => p.user === hoveredUser) % VIBRANT_PALETTE.length]} />
                  <text x="12" y="20" className="fill-black text-[12px] font-bold">{hoveredData.user}</text>
                  <text x="12" y="42" className="fill-slate-500 text-[9px] uppercase font-bold tracking-wider">Avg Time</text>
                  <text x="150" y="42" textAnchor="end" className="fill-black text-[11px] font-semibold">{formatDuration(hoveredData.avgTimePerDocSeconds)}</text>
                  <text x="12" y="58" className="fill-slate-500 text-[9px] uppercase font-bold tracking-wider">Edit Rate</text>
                  <text x="150" y="58" textAnchor="end" className="fill-black text-[11px] font-semibold">{formatPercent(hoveredData.reworkRate)}</text>
                  <text x="12" y="74" className="fill-slate-500 text-[9px] uppercase font-bold tracking-wider">Total Active</text>
                  <text x="150" y="74" textAnchor="end" className="fill-black text-[11px] font-semibold">{formatDuration(hoveredData.totalActiveSeconds)}</text>
                </g>
              );
            })()}
          </g>
        )}

        <text x={margin.left + innerWidth / 2} y={height - 15} textAnchor="middle" className="fill-black text-[12px] font-medium pointer-events-none">
          Avg Time per Document
        </text>
        <text transform={`translate(16 ${margin.top + innerHeight / 2}) rotate(-90)`} textAnchor="middle" className="fill-black text-[12px] font-medium pointer-events-none">
          Edit Rate
        </text>
      </svg>
    </div>
  );
});
