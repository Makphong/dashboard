import React, { Suspense, lazy } from 'react';
import { ChevronDown, Clock, User, X } from 'lucide-react';
import { GANTT_DRILL_GROUP_COLORS } from '../../../lib/constants.js';
import { mergeContinuousReprocessingSegments, toDrillGroup } from '../../../lib/segmentUtils.js';
import { buildAverageTransitionTimeData } from '../utils/transitionMetrics.js';
import { formatDuration, toDisplayDate, toGanttSegmentTypeLabel, toTimelineLane } from '../../../lib/utils.js';

const GanttTimelineChart = lazy(() => import('../../timeline/GanttTimelineChart.jsx').then((module) => ({ default: module.GanttTimelineChart })));
const DonutWorkloadChart = lazy(() => import('../../charts/DonutWorkloadChart.jsx').then((module) => ({ default: module.DonutWorkloadChart })));
const UserContributionStackChart = lazy(() => import('../../charts/UserContributionStackChart.jsx').then((module) => ({ default: module.UserContributionStackChart })));
const ProcessTimeBreakdownChart = lazy(() => import('../../charts/ProcessTimeBreakdownChart.jsx').then((module) => ({ default: module.ProcessTimeBreakdownChart })));

function ExpandedChartFallback() {
  return <div className="min-h-[420px] w-full rounded-[2rem] bg-slate-100 animate-pulse" />;
}

function buildChartAnimationKey(rows, fields) {
  if (!Array.isArray(rows) || rows.length === 0) return 'empty';
  return rows.map((row, index) => {
    const rowId = row.id || row.key || row.label || row.name || row.user || `row-${index}`;
    const values = fields.map((field) => String(row?.[field] ?? ''));
    return `${rowId}:${values.join(':')}`;
  }).join('|');
}

const POINT_IN_TIME_SEGMENT_TYPES = new Set([
  'AUTO_TIMEOUT_MARKER',
  'COMPLETE_BY_REVIEW_MARKER',
  'COMPLETE_BY_EDIT_MARKER',
  'COMPLETE_AFTER_REPROCESS_ROUND_2_MARKER',
  'REOPEN_MARKER',
  'REOPEN_TO_REVIEW_HANDOFF_MARKER',
]);

function isTimelineDurationSegment(segment) {
  const segmentType = String(segment?.segmentType || '');
  if (POINT_IN_TIME_SEGMENT_TYPES.has(segmentType)) return false;

  const rawStartTs = Date.parse(String(segment?.start || ''));
  const rawEndTs = Date.parse(String(segment?.end || ''));
  if (Number.isFinite(rawStartTs) && Number.isFinite(rawEndTs)) return rawEndTs > rawStartTs;

  const startTs = Number(segment?.startTs);
  const endTs = Number(segment?.endTs);
  return Number.isFinite(startTs) && Number.isFinite(endTs) && endTs > startTs;
}

function toTimelineDetailCountKey(segmentType) {
  const drillGroup = toDrillGroup(segmentType);
  if (drillGroup === 'Uploading') return 'Uploading';
  if (drillGroup === 'Processing') return 'Processing';
  if (drillGroup === 'Reprocessing') return 'Reprocessing';
  if (drillGroup === 'Review' || drillGroup === 'ReviewAutoClose') return 'Review';
  if (drillGroup === 'Edit' || drillGroup === 'EditAndComplete') return 'Edit';
  if (drillGroup === 'Idle') return 'Idle';
  return '';
}

function toTimelineBarLabel(segmentType) {
  const drillGroup = toDrillGroup(segmentType);
  if (drillGroup === 'Processing') return 'First Spread';
  if (drillGroup === 'Reprocessing') return 'Second Spread';
  return toGanttSegmentTypeLabel(segmentType);
}

function buildTimelineDetailData(segments) {
  const rawBars = (Array.isArray(segments) ? segments : [])
    .filter((segment) => isTimelineDurationSegment(segment))
    .map((segment, index) => {
      const countKey = toTimelineDetailCountKey(segment.segmentType);
      return {
        id: segment.id || `timeline-bar-${index}`,
        countKey,
        lane: toTimelineLane(segment.segmentType, segment.userName),
        userName: segment.userName || 'System',
        activity: toTimelineBarLabel(segment.segmentType),
        segmentType: String(segment.segmentType || 'UNKNOWN'),
        start: segment.start,
        end: segment.end,
        startTs: Number(segment.startTs) || Date.parse(String(segment.start || '')) || 0,
        durationSeconds: Number(segment.durationSeconds) || 0,
        documentLabel: segment.documentLabel || (segment.pageName ? `${segment.fileName || 'Unknown File'} / ${segment.pageName}` : (segment.fileName || 'Unknown File')),
      };
    })
    .sort((a, b) => a.startTs - b.startTs);

  const barsByLane = new Map();
  rawBars.forEach((bar) => {
    if (!barsByLane.has(bar.lane)) barsByLane.set(bar.lane, []);
    barsByLane.get(bar.lane).push(bar);
  });

  const bars = Array.from(barsByLane.values())
    .flatMap((laneBars) => mergeContinuousReprocessingSegments(laneBars))
    .map((bar) => ({
      ...bar,
      countKey: toTimelineDetailCountKey(bar.segmentType),
      activity: toTimelineBarLabel(bar.segmentType),
    }))
    .sort((a, b) => a.startTs - b.startTs);

  const summaryCounts = { Uploading: 0, Processing: 0, Reprocessing: 0, Review: 0, Edit: 0, Idle: 0 };
  const sourceMap = new Map();

  bars.forEach((bar) => {
    if (bar.countKey) summaryCounts[bar.countKey] += 1;

    const sourceKey = bar.activity;
    if (!sourceMap.has(sourceKey)) {
      sourceMap.set(sourceKey, {
        key: sourceKey,
        activity: bar.activity,
        segmentTypes: new Set(),
        count: 0,
        totalSeconds: 0,
      });
    }
    const source = sourceMap.get(sourceKey);
    source.segmentTypes.add(bar.segmentType);
    source.count += 1;
    source.totalSeconds += bar.durationSeconds;
  });

  return {
    bars,
    summaryCards: [
      { key: 'Uploading', label: 'Uploading', count: summaryCounts.Uploading, accentClass: 'text-[#6d28d9]' },
      { key: 'Processing', label: 'First Spread', count: summaryCounts.Processing, accentClass: 'text-[#0f172a]' },
      { key: 'Reprocessing', label: 'Second Spread', count: summaryCounts.Reprocessing, accentClass: 'text-[#3730a3]' },
      { key: 'Review', label: 'Review', count: summaryCounts.Review, accentClass: 'text-[#0f766e]' },
      { key: 'Edit', label: 'Edit', count: summaryCounts.Edit, accentClass: 'text-[#9a3412]' },
      { key: 'Idle', label: 'Idle', count: summaryCounts.Idle, accentClass: 'text-slate-500' },
    ],
    sourceRows: Array.from(sourceMap.values())
      .map((row) => ({
        ...row,
        segmentType: Array.from(row.segmentTypes).sort((a, b) => a.localeCompare(b)).join(', '),
      }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.activity.localeCompare(b.activity);
      }),
  };
}

function buildUserGroups(segments, workloadVisibleRows) {
  const safeSegments = Array.isArray(segments) ? segments : [];
  const safeRows = Array.isArray(workloadVisibleRows) ? workloadVisibleRows : [];

  const preferredUsers = safeRows
    .map((row) => String(row.user || '').trim())
    .filter((user) => user && user !== 'Idle');

  const preferredUserSet = new Set(preferredUsers);
  const grouped = new Map();

  safeSegments.forEach((segment) => {
    const lane = toTimelineLane(segment.segmentType, segment.userName);
    if (lane === 'Idle') return;
    if (preferredUserSet.size > 0 && !preferredUserSet.has(lane)) return;
    if (!grouped.has(lane)) grouped.set(lane, []);
    grouped.get(lane).push(segment);
  });

  const orderedUsers = preferredUsers.length > 0
    ? preferredUsers.filter((user) => grouped.has(user))
    : Array.from(grouped.keys()).sort((a, b) => a.localeCompare(b));

  return orderedUsers.map((user) => {
    const activities = (grouped.get(user) || [])
      .slice()
      .sort((a, b) => a.startTs - b.startTs)
      .map((segment, idx) => ({
        id: segment.id || `${user}-${idx}`,
        activity: toGanttSegmentTypeLabel(segment.segmentType),
        start: segment.start,
        end: segment.end,
        durationSeconds: Number(segment.durationSeconds) || 0,
        documentLabel: segment.documentLabel,
      }));

    return {
      user,
      totalSeconds: activities.reduce((sum, activity) => sum + activity.durationSeconds, 0),
      activities,
    };
  });
}

function buildUserBreakdownGroups(segments, contributionRows) {
  const safeSegments = Array.isArray(segments) ? segments : [];
  const safeRows = Array.isArray(contributionRows) ? contributionRows : [];
  const preferredUsers = safeRows
    .map((row) => String(row.user || '').trim())
    .filter(Boolean);

  const preferredUserSet = new Set(preferredUsers);
  const grouped = new Map();

  safeSegments.forEach((segment) => {
    const lane = toTimelineLane(segment.segmentType, segment.userName);
    if (!lane || lane === 'Idle' || lane === 'System') return;

    const drillGroup = toDrillGroup(segment.segmentType);
    const type = drillGroup === 'Review' || drillGroup === 'ReviewAutoClose'
      ? 'Review'
      : (drillGroup === 'Edit' || drillGroup === 'EditAndComplete' ? 'Edit' : '');
    if (!type) return;

    if (preferredUserSet.size > 0 && !preferredUserSet.has(lane)) return;
    if (!grouped.has(lane)) grouped.set(lane, []);
    grouped.get(lane).push({
      id: segment.id || `${lane}-${segment.startTs}-${segment.segmentType}`,
      type,
      activity: toGanttSegmentTypeLabel(segment.segmentType),
      start: segment.start,
      end: segment.end,
      startTs: segment.startTs,
      durationSeconds: Number(segment.durationSeconds) || 0,
      documentLabel: segment.documentLabel,
    });
  });

  const orderedUsers = preferredUsers.length > 0
    ? preferredUsers.filter((user) => grouped.has(user))
    : Array.from(grouped.keys()).sort((a, b) => a.localeCompare(b));

  return orderedUsers.map((user) => {
    const activities = (grouped.get(user) || []).slice().sort((a, b) => a.startTs - b.startTs);
    const reviewSeconds = activities.reduce((sum, item) => sum + (item.type === 'Review' ? item.durationSeconds : 0), 0);
    const editSeconds = activities.reduce((sum, item) => sum + (item.type === 'Edit' ? item.durationSeconds : 0), 0);
    return {
      user,
      reviewSeconds,
      editSeconds,
      totalSeconds: reviewSeconds + editSeconds,
      activities,
    };
  }).filter((row) => row.totalSeconds > 0);
}

function buildTimeBreakdownGroups(segments, selectedSegmentTypes, showProcessBreakdownIdle, mergeReviewAndEdit) {
  const safeSegments = Array.isArray(segments) ? segments : [];
  const safeSelected = Array.isArray(selectedSegmentTypes) ? selectedSegmentTypes : [];

  const resolveGroupKey = (segment) => {
    const drillGroup = toDrillGroup(segment.segmentType);
    const segmentGroup = drillGroup === 'Reprocessing'
      ? 'Reprocess'
      : (drillGroup === 'ReviewAutoClose' ? 'Review' : (drillGroup === 'EditAndComplete' ? 'Edit' : drillGroup));

    if (safeSelected.length > 0 && !safeSelected.includes(segmentGroup)) return null;
    if (!showProcessBreakdownIdle && drillGroup === 'Idle') return null;

    if (mergeReviewAndEdit && (drillGroup === 'Review' || drillGroup === 'ReviewAutoClose' || drillGroup === 'Edit' || drillGroup === 'EditAndComplete')) {
      return { key: 'review-edit', label: 'Review & Edit', colorClass: 'bg-[#fff7ed] text-[#c2410c]', dotClass: 'bg-[#F59E0B]' };
    }
    if (drillGroup === 'Uploading') return { key: 'uploading', label: 'Uploading', colorClass: 'bg-slate-100 text-slate-700', dotClass: 'bg-slate-500' };
    if (drillGroup === 'Processing') return { key: 'processing', label: 'First Spread', colorClass: 'bg-[#dbeafe] text-[#1d4ed8]', dotClass: 'bg-[#3b82f6]' };
    if (drillGroup === 'Reprocessing') return { key: 'reprocess', label: 'Second Spread', colorClass: 'bg-[#e0e7ff] text-[#4338ca]', dotClass: 'bg-[#6366f1]' };
    if (drillGroup === 'Review' || drillGroup === 'ReviewAutoClose') return { key: 'review', label: 'Review', colorClass: 'bg-[#ecfeff] text-[#0f766e]', dotClass: 'bg-[#06B6D4]' };
    if (drillGroup === 'Edit' || drillGroup === 'EditAndComplete') return { key: 'edit', label: 'Edit', colorClass: 'bg-[#fff7ed] text-[#c2410c]', dotClass: 'bg-[#F59E0B]' };
    if (drillGroup === 'Idle') return { key: 'idle', label: 'Idle', colorClass: 'bg-slate-100 text-slate-600', dotClass: 'bg-slate-400' };
    return null;
  };

  const grouped = new Map();
  safeSegments.forEach((segment) => {
    const groupMeta = resolveGroupKey(segment);
    if (!groupMeta) return;
    if (!grouped.has(groupMeta.key)) grouped.set(groupMeta.key, { ...groupMeta, activities: [], totalSeconds: 0 });
    const entry = grouped.get(groupMeta.key);
    const durationSeconds = Number(segment.durationSeconds) || 0;
    entry.activities.push({
      id: segment.id || `${groupMeta.key}-${segment.startTs}-${segment.segmentType}`,
      activity: toGanttSegmentTypeLabel(segment.segmentType),
      start: segment.start,
      end: segment.end,
      startTs: segment.startTs,
      durationSeconds,
      documentLabel: segment.documentLabel,
    });
    entry.totalSeconds += durationSeconds;
  });

  const order = mergeReviewAndEdit
    ? ['uploading', 'processing', 'reprocess', 'review-edit', 'idle']
    : ['uploading', 'processing', 'reprocess', 'review', 'edit', 'idle'];

  return order
    .filter((key) => grouped.has(key))
    .map((key) => {
      const group = grouped.get(key);
      return {
        ...group,
        activities: group.activities.slice().sort((a, b) => a.startTs - b.startTs),
      };
    })
    .filter((group) => group.totalSeconds > 0);
}

function buildTransitionBreakdownGroups(segments) {
  const sourceSegments = Array.isArray(segments) ? segments : [];
  const groupsByKey = new Map([
    ['after-processing', { key: 'after-processing', label: 'After Processing', colorClass: 'bg-[#dbeafe] text-[#1d4ed8]', dotClass: 'bg-[#3b82f6]', activities: [], totalSeconds: 0 }],
    ['after-reprocessing', { key: 'after-reprocessing', label: 'After Reprocessing', colorClass: 'bg-[#e0e7ff] text-[#4338ca]', dotClass: 'bg-[#6366f1]', activities: [], totalSeconds: 0 }],
    ['between-review-edit', { key: 'between-review-edit', label: 'Between Review & Edit', colorClass: 'bg-[#fff7ed] text-[#c2410c]', dotClass: 'bg-[#F59E0B]', activities: [], totalSeconds: 0 }],
  ]);

  const segmentGroups = new Map();
  sourceSegments.forEach((segment) => {
    if (!segmentGroups.has(segment.sheetKey)) segmentGroups.set(segment.sheetKey, []);
    segmentGroups.get(segment.sheetKey).push(segment);
  });

  segmentGroups.forEach((items) => {
    const sorted = [...items].sort((a, b) => a.startTs - b.startTs);
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const prevDrill = toDrillGroup(prev.segmentType);
      const currDrill = toDrillGroup(curr.segmentType);
      if (currDrill !== 'Idle') continue;

      let groupKey = '';
      if (prevDrill === 'Processing') {
        groupKey = 'after-processing';
      } else if (prevDrill === 'Reprocessing') {
        groupKey = 'after-reprocessing';
      } else if (prevDrill === 'Review' || prevDrill === 'Edit' || prevDrill === 'Uploading') {
        const hasFutureAction = sorted.slice(i + 1).some((s) => {
          const dg = toDrillGroup(s.segmentType);
          return dg === 'Review' || dg === 'Edit';
        });
        if (hasFutureAction) groupKey = 'between-review-edit';
      }
      if (!groupKey) continue;

      const group = groupsByKey.get(groupKey);
      const durationSeconds = Number(curr.durationSeconds) || 0;
      group.activities.push({
        id: curr.id || `${groupKey}-${curr.startTs}`,
        activity: toGanttSegmentTypeLabel(curr.segmentType),
        start: curr.start,
        end: curr.end,
        startTs: curr.startTs,
        durationSeconds,
        documentLabel: curr.documentLabel,
      });
      group.totalSeconds += durationSeconds;
    }
  });

  return Array.from(groupsByKey.values())
    .map((group) => ({
      ...group,
      averageSeconds: group.activities.length > 0 ? group.totalSeconds / group.activities.length : 0,
      activities: group.activities.slice().sort((a, b) => a.startTs - b.startTs),
    }))
    .filter((group) => group.activities.length > 0);
}

const TimelineDetailView = React.memo(({ segments }) => {
  const { bars, summaryCards, sourceRows } = React.useMemo(
    () => buildTimelineDetailData(segments),
    [segments]
  );

  if (bars.length === 0) {
    return (
      <div className="min-h-[320px] flex items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 text-slate-500">
        No timeline bar details available for the current filters.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="grid gap-3 md:grid-cols-5">
          {summaryCards.map((card) => (
            <div key={card.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{card.label}</div>
              <div className={`mt-2 text-3xl font-extrabold leading-none ${card.accentClass}`}>{card.count}</div>
              <div className="mt-2 text-xs font-medium text-slate-500">bars</div>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.5rem] bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Source detail</div>
          <div className="text-xl font-bold text-[#17335f]">Bars in the current timeline</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white">
              <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                <th className="px-5 py-3">No.</th>
                <th className="px-5 py-3">Lane</th>
                <th className="px-5 py-3">Bar</th>
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3">Start</th>
                <th className="px-5 py-3">End</th>
                <th className="px-5 py-3">Duration</th>
              </tr>
            </thead>
            <tbody>
              {bars.map((bar, index) => (
                <tr key={bar.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-5 py-4 font-medium text-slate-500">{index + 1}</td>
                  <td className="px-5 py-4 font-semibold text-[#17335f]">{bar.lane}</td>
                  <td className="px-5 py-4 font-semibold text-[#17335f]">{bar.activity}</td>
                  <td className="px-5 py-4 text-slate-600">{bar.documentLabel}</td>
                  <td className="px-5 py-4 font-medium text-slate-600">{toDisplayDate(bar.start)}</td>
                  <td className="px-5 py-4 font-medium text-slate-600">{toDisplayDate(bar.end)}</td>
                  <td className="px-5 py-4 font-bold text-[#00a4e4]">{formatDuration(bar.durationSeconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
});

const UserShareDetailView = React.memo(({ segments, workloadVisibleRows }) => {
  const [openUser, setOpenUser] = React.useState('');
  const [contentHeight, setContentHeight] = React.useState(0);
  const contentRef = React.useRef(null);

  const { userGroups, renderError } = React.useMemo(() => {
    try {
      return {
        userGroups: buildUserGroups(segments, workloadVisibleRows),
        renderError: '',
      };
    } catch (error) {
      return {
        userGroups: [],
        renderError: error instanceof Error ? error.message : String(error),
      };
    }
  }, [segments, workloadVisibleRows]);

  if (renderError) {
    return (
      <div className="rounded-[2rem] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        Failed to render user activity details: {renderError}
      </div>
    );
  }

  if (userGroups.length === 0) {
    return (
      <div className="min-h-[320px] flex items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 text-slate-500">
        No user activity details available for the current filters.
      </div>
    );
  }

  const toggleUser = (user) => {
    setOpenUser((current) => (current === user ? '' : user));
  };

  React.useLayoutEffect(() => {
    if (!openUser) {
      setContentHeight(0);
      return;
    }

    const measure = () => {
      const nextHeight = contentRef.current?.scrollHeight || 0;
      setContentHeight(nextHeight);
    };

    measure();

    if (typeof ResizeObserver === 'undefined' || !contentRef.current) return undefined;

    const observer = new ResizeObserver(() => {
      measure();
    });
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [openUser]);

  return (
    <div className="space-y-6">
      {userGroups.map((group, userIndex) => (
        <section key={group.user} className="overflow-hidden rounded-[1.5rem] bg-white">
          <button
            type="button"
            onClick={() => toggleUser(group.user)}
            className="flex w-full flex-col gap-3 px-5 py-4 text-left md:flex-row md:items-center md:justify-between"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f4f9fd] text-[#3860be]">
                <User className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">User {userIndex + 1}</div>
                <div className="truncate text-xl font-bold text-[#17335f]">{group.user}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 self-start md:self-auto">
              <div className="flex items-center gap-2 rounded-2xl bg-[#f8fbfe] px-4 py-2">
                <Clock className="h-4 w-4 text-[#00a4e4]" />
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Total Time</div>
                  <div className="text-base font-bold text-[#17335f]">{formatDuration(group.totalSeconds)}</div>
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${openUser === group.user ? 'rotate-180' : ''}`} />
            </div>
          </button>

          <div
            className={`overflow-hidden transition-all ease-[cubic-bezier(0.22,1,0.36,1)] ${
              openUser === group.user
                ? 'translate-y-0 duration-[2000ms]'
                : '-translate-y-1 duration-500'
            }`}
            style={{ height: openUser === group.user ? `${contentHeight}px` : '0px' }}
          >
            <div
              ref={openUser === group.user ? contentRef : null}
              className="overflow-x-auto border-t border-slate-200"
              style={{ contain: 'layout paint' }}
            >
              <table className="min-w-full text-sm">
                <thead className="bg-white">
                  <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    <th className="px-5 py-3">Activity</th>
                    <th className="px-5 py-3">Start</th>
                    <th className="px-5 py-3">End</th>
                    <th className="px-5 py-3">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {group.activities.map((activity) => (
                    <tr key={activity.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-[#17335f]">{activity.activity}</div>
                        {activity.documentLabel ? <div className="mt-1 text-xs text-slate-400">{activity.documentLabel}</div> : null}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-600">{toDisplayDate(activity.start)}</td>
                      <td className="px-5 py-4 font-medium text-slate-600">{toDisplayDate(activity.end)}</td>
                      <td className="px-5 py-4 font-bold text-[#00a4e4]">{formatDuration(activity.durationSeconds)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50/70">
                    <td className="px-5 py-4 text-sm font-bold text-[#17335f]">Total</td>
                    <td className="px-5 py-4" />
                    <td className="px-5 py-4" />
                    <td className="px-5 py-4 text-sm font-bold text-[#17335f]">{formatDuration(group.totalSeconds)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
});

const UserBreakdownDetailView = React.memo(({ rows, segments }) => {
  const [openUser, setOpenUser] = React.useState('');
  const [contentHeight, setContentHeight] = React.useState(0);
  const contentRef = React.useRef(null);

  const preparedRows = React.useMemo(
    () => buildUserBreakdownGroups(segments, rows),
    [segments, rows]
  );

  if (preparedRows.length === 0) {
    return (
      <div className="min-h-[320px] flex items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 text-slate-500">
        No user breakdown details available for the current filters.
      </div>
    );
  }

  React.useLayoutEffect(() => {
    if (!openUser) {
      setContentHeight(0);
      return;
    }

    const measure = () => {
      setContentHeight(contentRef.current?.scrollHeight || 0);
    };

    measure();
    if (typeof ResizeObserver === 'undefined' || !contentRef.current) return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [openUser]);

  return (
    <div className="space-y-5">
      {preparedRows.map((row, index) => {
        const isOpen = openUser === row.user;
        const editActivities = row.activities.filter((activity) => activity.type === 'Edit');
        const reviewActivities = row.activities.filter((activity) => activity.type === 'Review');

        return (
          <section key={row.user} className="overflow-hidden rounded-[1.5rem] bg-white">
            <button
              type="button"
              onClick={() => setOpenUser((current) => (current === row.user ? '' : row.user))}
              className="flex w-full flex-col gap-3 border-b border-slate-200 px-5 py-4 text-left md:flex-row md:items-center md:justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f4f9fd] text-[#3860be]">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">User {index + 1}</div>
                  <div className="truncate text-xl font-bold text-[#17335f]">{row.user}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-start md:self-auto">
                <div className="flex items-center gap-2 rounded-2xl bg-[#f8fbfe] px-4 py-2">
                  <Clock className="h-4 w-4 text-[#00a4e4]" />
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Total Time</div>
                    <div className="text-base font-bold text-[#17335f]">{formatDuration(row.totalSeconds)}</div>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            <div
              className={`overflow-hidden transition-all ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isOpen ? 'translate-y-0 duration-500' : '-translate-y-1 duration-300'
              }`}
              style={{ height: isOpen ? `${contentHeight}px` : '0px' }}
            >
              <div ref={isOpen ? contentRef : null} className="border-t border-slate-200" style={{ contain: 'layout paint' }}>
                <div className="space-y-6 px-5 py-4">
                  {editActivities.length > 0 ? (
                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                      <div className="flex items-center gap-2 bg-[#fff7ed] px-4 py-3 text-[#c2410c]">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" />
                        <span className="text-sm font-bold uppercase tracking-[0.18em]">Edit</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-white">
                            <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                              <th className="px-5 py-3">Activity</th>
                              <th className="px-5 py-3">Start</th>
                              <th className="px-5 py-3">End</th>
                              <th className="px-5 py-3">Duration</th>
                            </tr>
                          </thead>
                          <tbody>
                            {editActivities.map((activity) => (
                              <tr key={activity.id} className="border-b border-slate-100 last:border-b-0">
                                <td className="px-5 py-4">
                                  <div className="font-semibold text-[#17335f]">{activity.activity}</div>
                                  {activity.documentLabel ? <div className="mt-1 text-xs text-slate-400">{activity.documentLabel}</div> : null}
                                </td>
                                <td className="px-5 py-4 font-medium text-slate-600">{toDisplayDate(activity.start)}</td>
                                <td className="px-5 py-4 font-medium text-slate-600">{toDisplayDate(activity.end)}</td>
                                <td className="px-5 py-4 font-bold text-[#17335f]">{formatDuration(activity.durationSeconds)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-slate-200 bg-slate-50/70">
                              <td className="px-5 py-4 text-sm font-bold text-[#17335f]">Total</td>
                              <td className="px-5 py-4" />
                              <td className="px-5 py-4" />
                              <td className="px-5 py-4 text-sm font-bold text-[#17335f]">{formatDuration(row.editSeconds)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  ) : null}

                  {reviewActivities.length > 0 ? (
                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                      <div className="flex items-center gap-2 bg-[#ecfeff] px-4 py-3 text-[#0f766e]">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#06B6D4]" />
                        <span className="text-sm font-bold uppercase tracking-[0.18em]">Review</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-white">
                            <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                              <th className="px-5 py-3">Activity</th>
                              <th className="px-5 py-3">Start</th>
                              <th className="px-5 py-3">End</th>
                              <th className="px-5 py-3">Duration</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reviewActivities.map((activity) => (
                              <tr key={activity.id} className="border-b border-slate-100 last:border-b-0">
                                <td className="px-5 py-4">
                                  <div className="font-semibold text-[#17335f]">{activity.activity}</div>
                                  {activity.documentLabel ? <div className="mt-1 text-xs text-slate-400">{activity.documentLabel}</div> : null}
                                </td>
                                <td className="px-5 py-4 font-medium text-slate-600">{toDisplayDate(activity.start)}</td>
                                <td className="px-5 py-4 font-medium text-slate-600">{toDisplayDate(activity.end)}</td>
                                <td className="px-5 py-4 font-bold text-[#17335f]">{formatDuration(activity.durationSeconds)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-slate-200 bg-slate-50/70">
                              <td className="px-5 py-4 text-sm font-bold text-[#17335f]">Total</td>
                              <td className="px-5 py-4" />
                              <td className="px-5 py-4" />
                              <td className="px-5 py-4 text-sm font-bold text-[#17335f]">{formatDuration(row.reviewSeconds)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
});

const TimeBreakdownDetailView = React.memo(({
  segments,
  selectedSegmentTypes,
  showProcessBreakdownIdle,
  mergeReviewAndEdit,
}) => {
  const [openGroup, setOpenGroup] = React.useState('');
  const [contentHeight, setContentHeight] = React.useState(0);
  const contentRef = React.useRef(null);

  const groups = React.useMemo(
    () => buildTimeBreakdownGroups(segments, selectedSegmentTypes, showProcessBreakdownIdle, mergeReviewAndEdit),
    [segments, selectedSegmentTypes, showProcessBreakdownIdle, mergeReviewAndEdit]
  );

  React.useLayoutEffect(() => {
    if (!openGroup) {
      setContentHeight(0);
      return;
    }

    const measure = () => setContentHeight(contentRef.current?.scrollHeight || 0);
    measure();
    if (typeof ResizeObserver === 'undefined' || !contentRef.current) return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [openGroup]);

  if (groups.length === 0) {
    return (
      <div className="min-h-[320px] flex items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 text-slate-500">
        No time breakdown details available for the current filters.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group, index) => {
        const isOpen = openGroup === group.key;
        return (
          <section key={group.key} className="overflow-hidden rounded-[1.5rem] bg-white">
            <button
              type="button"
              onClick={() => setOpenGroup((current) => (current === group.key ? '' : group.key))}
              className="flex w-full flex-col gap-3 border-b border-slate-200 px-5 py-4 text-left md:flex-row md:items-center md:justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${group.colorClass}`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${group.dotClass}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Group {index + 1}</div>
                  <div className="truncate text-xl font-bold text-[#17335f]">{group.label}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-start md:self-auto">
                <div className="flex items-center gap-2 rounded-2xl bg-[#f8fbfe] px-4 py-2">
                  <Clock className="h-4 w-4 text-[#00a4e4]" />
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Total Time</div>
                    <div className="text-base font-bold text-[#17335f]">{formatDuration(group.totalSeconds)}</div>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            <div
              className={`overflow-hidden transition-all ease-[cubic-bezier(0.22,1,0.36,1)] ${isOpen ? 'translate-y-0 duration-500' : '-translate-y-1 duration-300'}`}
              style={{ height: isOpen ? `${contentHeight}px` : '0px' }}
            >
              <div ref={isOpen ? contentRef : null} className="overflow-x-auto border-t border-slate-200" style={{ contain: 'layout paint' }}>
                <table className="min-w-full text-sm">
                  <thead className="bg-white">
                    <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      <th className="px-5 py-3">Activity</th>
                      <th className="px-5 py-3">Start</th>
                      <th className="px-5 py-3">End</th>
                      <th className="px-5 py-3">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.activities.map((activity) => (
                      <tr key={activity.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-[#17335f]">{activity.activity}</div>
                          {activity.documentLabel ? <div className="mt-1 text-xs text-slate-400">{activity.documentLabel}</div> : null}
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-600">{toDisplayDate(activity.start)}</td>
                        <td className="px-5 py-4 font-medium text-slate-600">{toDisplayDate(activity.end)}</td>
                        <td className="px-5 py-4 font-bold text-[#17335f]">{formatDuration(activity.durationSeconds)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50/70">
                      <td className="px-5 py-4 text-sm font-bold text-[#17335f]">Total</td>
                      <td className="px-5 py-4" />
                      <td className="px-5 py-4" />
                      <td className="px-5 py-4 text-sm font-bold text-[#17335f]">{formatDuration(group.totalSeconds)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
});

const TransitionBreakdownDetailView = React.memo(({ segments }) => {
  const [openGroup, setOpenGroup] = React.useState('');
  const [contentHeight, setContentHeight] = React.useState(0);
  const contentRef = React.useRef(null);

  const groups = React.useMemo(() => buildTransitionBreakdownGroups(segments), [segments]);

  React.useLayoutEffect(() => {
    if (!openGroup) {
      setContentHeight(0);
      return;
    }
    const measure = () => setContentHeight(contentRef.current?.scrollHeight || 0);
    measure();
    if (typeof ResizeObserver === 'undefined' || !contentRef.current) return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [openGroup]);

  if (groups.length === 0) {
    return (
      <div className="min-h-[320px] flex items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 text-slate-500">
        No transition breakdown details available for the current filters.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group, index) => {
        const isOpen = openGroup === group.key;
        return (
          <section key={group.key} className="overflow-hidden rounded-[1.5rem] bg-white">
            <button
              type="button"
              onClick={() => setOpenGroup((current) => (current === group.key ? '' : group.key))}
              className="flex w-full flex-col gap-3 border-b border-slate-200 px-5 py-4 text-left md:flex-row md:items-center md:justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${group.colorClass}`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${group.dotClass}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Group {index + 1}</div>
                  <div className="truncate text-xl font-bold text-[#17335f]">{group.label}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-start md:self-auto">
                <div className="flex items-center gap-2 rounded-2xl bg-[#f8fbfe] px-4 py-2">
                  <Clock className="h-4 w-4 text-[#00a4e4]" />
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Average</div>
                    <div className="text-base font-bold text-[#17335f]">{formatDuration(group.averageSeconds)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-[#f8fbfe] px-4 py-2">
                  <Clock className="h-4 w-4 text-[#00a4e4]" />
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Total Time</div>
                    <div className="text-base font-bold text-[#17335f]">{formatDuration(group.totalSeconds)}</div>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            <div
              className={`overflow-hidden transition-all ease-[cubic-bezier(0.22,1,0.36,1)] ${isOpen ? 'translate-y-0 duration-500' : '-translate-y-1 duration-300'}`}
              style={{ height: isOpen ? `${contentHeight}px` : '0px' }}
            >
              <div ref={isOpen ? contentRef : null} className="overflow-x-auto border-t border-slate-200" style={{ contain: 'layout paint' }}>
                <table className="min-w-full text-sm">
                  <thead className="bg-white">
                    <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      <th className="px-5 py-3">Activity</th>
                      <th className="px-5 py-3">Start</th>
                      <th className="px-5 py-3">End</th>
                      <th className="px-5 py-3">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.activities.map((activity) => (
                      <tr key={activity.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-[#17335f]">{activity.activity}</div>
                          {activity.documentLabel ? <div className="mt-1 text-xs text-slate-400">{activity.documentLabel}</div> : null}
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-600">{toDisplayDate(activity.start)}</td>
                        <td className="px-5 py-4 font-medium text-slate-600">{toDisplayDate(activity.end)}</td>
                        <td className="px-5 py-4 font-bold text-[#17335f]">{formatDuration(activity.durationSeconds)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50/70">
                      <td className="px-5 py-4 text-sm font-bold text-[#17335f]">Total</td>
                      <td className="px-5 py-4" />
                      <td className="px-5 py-4" />
                      <td className="px-5 py-4 text-sm font-bold text-[#17335f]">
                        {formatDuration(group.totalSeconds)}
                        <span className="ml-2 text-xs font-semibold text-slate-500">/ {group.activities.length}</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
});

export const ExpandedVisualizationModal = React.memo(({ visualizationId, onClose, data }) => {
  if (!visualizationId) return null;

  const modalTitle = visualizationId === 'gantt-detail'
    ? 'Timeline Source Details'
    : visualizationId === 'donut-detail'
    ? 'Visualization Source Details'
    : visualizationId === 'contribution-detail'
      ? 'User Breakdown Details'
      : visualizationId === 'process-breakdown-detail'
        ? 'Time Breakdown Details'
        : visualizationId === 'matrix-detail'
          ? 'Average Transition Time Details'
      : 'Full View Analysis';
  const modalSubtitle = visualizationId === 'gantt-detail'
    ? 'Bars Counted From Interval Segments Only'
    : visualizationId === 'donut-detail'
    ? 'User Activity Timeline'
    : visualizationId === 'contribution-detail'
      ? 'Review And Edit Summary'
      : visualizationId === 'process-breakdown-detail'
        ? 'Grouped By Y-Axis Labels'
        : visualizationId === 'matrix-detail'
          ? 'Average Transition Source Rows'
      : 'Advanced Visualization';

  const {
    ganttVisibleSegments,
    processBreakdownSegments,
    selectedSegmentTypes,
    showProcessBreakdownIdle,
    showProcessBreakdownLabels,
    workloadVisibleRows,
    contributionRows,
    mergeReviewAndEdit,
    timelineSettings,
  } = data;

  const processBreakdownData = React.useMemo(() => {
    const totals = { Uploading: 0, Processing: 0, Reprocess: 0, Review: 0, Edit: 0, Idle: 0 };
    const sourceSegments = processBreakdownSegments || ganttVisibleSegments;
    sourceSegments.forEach(s => {
      const segmentType = String(s.segmentType || '');
      const drillGroup = toDrillGroup(s.segmentType);
      const segmentGroup = drillGroup === 'Reprocessing'
        ? 'Reprocess'
        : (drillGroup === 'ReviewAutoClose' ? 'Review' : (drillGroup === 'EditAndComplete' ? 'Edit' : drillGroup));
      if ((selectedSegmentTypes || []).length > 0 && !selectedSegmentTypes.includes(segmentGroup)) return;
      if (!showProcessBreakdownIdle && drillGroup === 'Idle') return;
      const duration = Number(s.durationSeconds) || 0;
      if (drillGroup === 'Uploading') totals.Uploading += duration;
      else if (drillGroup === 'Processing') totals.Processing += duration;
      else if (drillGroup === 'Reprocessing') totals.Reprocess += duration;
      else if (drillGroup === 'Review' || drillGroup === 'ReviewAutoClose') totals.Review += duration;
      else if (drillGroup === 'Edit' || drillGroup === 'EditAndComplete') totals.Edit += duration;
      else if (drillGroup === 'Idle') totals.Idle += duration;
      else totals.Idle += duration;
    });

    let items = [];
    if (mergeReviewAndEdit) {
      const mergedReviewEdit = totals.Review + totals.Edit;
      items = [
        { label: 'Uploading', seconds: totals.Uploading, color: GANTT_DRILL_GROUP_COLORS.Uploading },
        { label: 'Processing', seconds: totals.Processing, color: GANTT_DRILL_GROUP_COLORS.Processing },
        { label: 'Reprocess', seconds: totals.Reprocess, color: GANTT_DRILL_GROUP_COLORS.Reprocessing },
        { label: 'Review And Edit', seconds: mergedReviewEdit, color: '#F59E0B' },
      ];
    } else {
      items = Object.entries(totals)
        .filter(([label]) => label !== 'Idle')
        .map(([label, seconds]) => ({
          label,
          seconds,
          color: GANTT_DRILL_GROUP_COLORS[label === 'Reprocess' ? 'Reprocessing' : label] || '#94A3B8'
        }));
    }

    const completeSeconds = totals.Uploading + totals.Processing + totals.Reprocess + totals.Review + totals.Edit;
    if (completeSeconds > 0) {
      items.push({
        label: 'Complete',
        seconds: completeSeconds,
        color: '#16A34A'
      });
    }
    return items;
  }, [ganttVisibleSegments, processBreakdownSegments, selectedSegmentTypes, mergeReviewAndEdit]);

  const transitionTimeData = React.useMemo(() => {
    const sourceSegments = processBreakdownSegments || ganttVisibleSegments;
    return buildAverageTransitionTimeData(sourceSegments, {
      afterProcessing: 'After Processing',
      afterReprocessing: 'After Reprocessing',
      betweenReviewEdit: 'Between Review And Edit',
    });
  }, [ganttVisibleSegments, processBreakdownSegments]);

  const donutAnimationKey = React.useMemo(
    () => buildChartAnimationKey(workloadVisibleRows, ['totalSeconds', 'share']),
    [workloadVisibleRows]
  );

  const contributionAnimationKey = React.useMemo(
    () => buildChartAnimationKey(contributionRows, ['reviewSeconds', 'editSeconds', 'totalSeconds', 'reworkRate']),
    [contributionRows]
  );

  const processBreakdownAnimationKey = React.useMemo(
    () => buildChartAnimationKey(processBreakdownData, ['seconds', 'label', 'color', 'vat', 'wait', 'rework', 'handover', 'other']),
    [processBreakdownData]
  );

  const transitionAnimationKey = React.useMemo(
    () => buildChartAnimationKey(transitionTimeData, ['seconds', 'label', 'color', 'vat', 'wait', 'rework', 'handover', 'other']),
    [transitionTimeData]
  );

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-8 viz-overlay-enter" onClick={onClose}>
      <div 
        className="bg-white w-full max-w-[95vw] h-[92vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden viz-panel-enter"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 md:px-10 border-b flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-extrabold text-[#17335f]">{modalTitle}</h2>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">{modalSubtitle}</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-2xl transition-all hover:rotate-90 duration-300"><X className="w-8 h-8" /></button>
        </div>
        <div className="flex-1 overflow-auto p-6 md:p-10 no-scrollbar">
          <Suspense fallback={<ExpandedChartFallback />}>
            {visualizationId === 'gantt' && (
              <GanttTimelineChart
                segments={ganttVisibleSegments}
                expanded
                singleLane={timelineSettings?.singleLane}
                showSystemLane={timelineSettings?.showSystemLane}
                showIdleLane={timelineSettings?.showIdleLane}
                showStarMarkers={timelineSettings?.showStarMarkers}
                collapseGaps={timelineSettings?.collapseGaps}
                showGanttLegend={timelineSettings?.showGanttLegend}
              />
            )}
            {visualizationId === 'donut' && <DonutWorkloadChart key={donutAnimationKey} rows={workloadVisibleRows} expanded />}
          </Suspense>
          {visualizationId === 'gantt-detail' && <TimelineDetailView segments={ganttVisibleSegments} />}
          {visualizationId === 'donut-detail' && (
            <UserShareDetailView
              segments={ganttVisibleSegments}
              workloadVisibleRows={workloadVisibleRows}
            />
          )}
          {visualizationId === 'contribution-detail' && (
            <UserBreakdownDetailView rows={contributionRows} segments={ganttVisibleSegments} />
          )}
          {visualizationId === 'process-breakdown-detail' && (
            <TimeBreakdownDetailView
              segments={processBreakdownSegments || ganttVisibleSegments}
              selectedSegmentTypes={selectedSegmentTypes}
              showProcessBreakdownIdle={showProcessBreakdownIdle}
              mergeReviewAndEdit={mergeReviewAndEdit}
            />
          )}
          {visualizationId === 'matrix-detail' && (
            <TransitionBreakdownDetailView segments={processBreakdownSegments || ganttVisibleSegments} />
          )}
          <Suspense fallback={<ExpandedChartFallback />}>
            {visualizationId === 'process-breakdown' && <ProcessTimeBreakdownChart key={processBreakdownAnimationKey} data={processBreakdownData} showLabels={showProcessBreakdownLabels} />}
            {visualizationId === 'contribution' && <UserContributionStackChart key={contributionAnimationKey} rows={contributionRows} expanded />}
            {visualizationId === 'matrix' && <ProcessTimeBreakdownChart key={transitionAnimationKey} data={transitionTimeData} showLabels={showProcessBreakdownLabels} />}
          </Suspense>
        </div>
      </div>
    </div>
  );
});
