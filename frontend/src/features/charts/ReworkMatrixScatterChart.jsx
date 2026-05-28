import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CHART_PALETTE } from '../../lib/constants.js';
import { safeNumber, formatDuration, formatPercent } from '../../lib/utils.js';

export const ReworkMatrixScatterChart = ({ rows = [], expanded = false }) => {
  const svgRef = useRef(null);
  const dragRef = useRef({ active: false, x: 0, y: 0, view: null });
  const panFrameRef = useRef(null);
  const pendingViewRef = useRef(null);
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
  const [view, setView] = useState({ xMin: 0, xMax: xDomainMax, yMin: 0, yMax: 1 });

  useEffect(() => {
    setView({ xMin: 0, xMax: xDomainMax, yMin: 0, yMax: 1 });
  }, [xDomainMax, expanded]);

  const minActive = prepared.reduce(
    (min, row) => Math.min(min, row.totalActiveSeconds),
    prepared[0]?.totalActiveSeconds || 0
  );
  const maxActive = prepared.reduce((max, row) => Math.max(max, row.totalActiveSeconds), 0) || 1;
  const activeRange = Math.max(0, maxActive - minActive);

  const width = expanded ? 760 : 520;
  const height = expanded ? 350 : 260;
  const margin = expanded
    ? { top: 30, right: 36, bottom: 52, left: 62 }
    : { top: 28, right: 28, bottom: 48, left: 50 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const maxBubbleRadius = expanded ? 25 : 18;

  const clampView = (nextView) => {
    const minXSpan = xDomainMax / 8;
    const minYSpan = 1 / 8;
    const xSpan = Math.min(xDomainMax, Math.max(minXSpan, nextView.xMax - nextView.xMin));
    const ySpan = Math.min(1, Math.max(minYSpan, nextView.yMax - nextView.yMin));

    let xMin = nextView.xMin;
    let yMin = nextView.yMin;
    if (xMin < 0) xMin = 0;
    if (xMin + xSpan > xDomainMax) xMin = xDomainMax - xSpan;
    if (yMin < 0) yMin = 0;
    if (yMin + ySpan > 1) yMin = 1 - ySpan;

    return { xMin, xMax: xMin + xSpan, yMin, yMax: yMin + ySpan };
  };

  const normalizedView = clampView(view.xMax <= xDomainMax ? view : { xMin: 0, xMax: xDomainMax, yMin: 0, yMax: 1 });
  const xSpan = normalizedView.xMax - normalizedView.xMin;
  const ySpan = normalizedView.yMax - normalizedView.yMin;
  const isZoomed = xSpan < xDomainMax - 0.001 || ySpan < 0.999;
  const x = (v) => margin.left + ((safeNumber(v) - normalizedView.xMin) / xSpan) * innerWidth;
  const y = (v) => margin.top + ((normalizedView.yMax - Math.max(0, Math.min(1, safeNumber(v)))) / ySpan) * innerHeight;
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((tick) => normalizedView.xMin + xSpan * tick);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((tick) => normalizedView.yMin + ySpan * tick);

  const bubbleRadius = (active) => {
    const minRadius = expanded ? 5 : 4;
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
  };

  const clipId = `quality-edit-plot-${expanded ? 'expanded' : 'compact'}`;

  if (prepared.length === 0) return null;

  return (
    <div className={`mt-2 overflow-hidden relative ${expanded ? 'w-full max-w-[820px] mx-auto px-1' : ''}`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto rounded-xl border border-slate-100 bg-white block cursor-grab active:cursor-grabbing"
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
        </defs>

        {yTicks.map((tick) => (
          <line
            key={`h-${tick}`}
            x1={margin.left}
            x2={width - margin.right}
            y1={y(tick)}
            y2={y(tick)}
            stroke={tick <= 0.001 ? '#94A3B8' : '#E2E8F0'}
            strokeDasharray={tick <= 0.001 ? '0' : '3 3'}
          />
        ))}
        {xTicks.map((tick) => (
          <line
            key={`v-${tick}`}
            y1={margin.top}
            y2={height - margin.bottom}
            x1={x(tick)}
            x2={x(tick)}
            stroke={tick <= 0.001 ? '#94A3B8' : '#E2E8F0'}
            strokeDasharray={tick <= 0.001 ? '0' : '3 3'}
          />
        ))}

        {yTicks.map((tick) => (
          <text key={`yt-${tick}`} x={margin.left - 8} y={y(tick) + 4} textAnchor="end" className="fill-slate-500 text-[10px]">
            {Math.round(tick * 100)}%
          </text>
        ))}
        {xTicks.map((tick) => (
          <text key={`xt-${tick}`} x={x(tick)} y={height - 16} textAnchor="middle" className="fill-slate-500 text-[10px]">
            {formatDuration(tick)}
          </text>
        ))}

        <g clipPath={`url(#${clipId})`}>
          {prepared.map((row, idx) => {
            const px = x(row.avgTimePerDocSeconds);
            const py = y(row.reworkRate);
            const pointRadius = bubbleRadius(row.totalActiveSeconds);
            const color = CHART_PALETTE[idx % CHART_PALETTE.length];
            const shortUserLabel = row.user.length > 14 ? `${row.user.slice(0, 14)}...` : row.user;
            const labelX = Math.max(margin.left + 18, Math.min(width - margin.right - 18, px));
            const labelAnchor = 'middle';
            const preferredLabelY = py - pointRadius - 8;
            const labelY = preferredLabelY < margin.top + 12
              ? Math.min(height - margin.bottom - 8, py + pointRadius + 14)
              : preferredLabelY;
            if (px + pointRadius < margin.left || px - pointRadius > width - margin.right || py + pointRadius < margin.top || py - pointRadius > height - margin.bottom) return null;
            return (
              <g key={row.user}>
                <circle cx={px} cy={py} r={pointRadius} fill={color} opacity="0.8" stroke="#ffffff" strokeWidth="2">
                  <title>{`${row.user} | Avg/Doc ${formatDuration(row.avgTimePerDocSeconds)} | Edit ${formatPercent(row.reworkRate)} | Active ${formatDuration(row.totalActiveSeconds)} | Auto Closed ${formatPercent(row.autoClosedRate)}`}</title>
                </circle>
                <text x={labelX} y={labelY} textAnchor={labelAnchor} className="fill-slate-700 text-[10px] font-medium">
                  {shortUserLabel}
                </text>
              </g>
            );
          })}
        </g>

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
