import React, { Suspense, lazy } from 'react';
import { ChevronDown, Clock, User, X } from 'lucide-react';
import { GANTT_DRILL_GROUP_COLORS } from '../../../lib/constants.js';
import { mergeContinuousReprocessingSegments, toDrillGroup } from '../../../lib/segmentUtils.js';
import { buildAverageTransitionTimeData, buildTransitionBreakdownGroups } from '../utils/transitionMetrics.js';
import { formatDuration, toDisplayDate, toGanttSegmentTypeLabel, toTimelineLane } from '../../../lib/utils.js';
import { mapSegmentsToRows } from '../../timeline/timelineUtils.js';
import { toSegmentGroup } from '../utils/segmentData.js';

const ganttTimelineChartPromise = import('../../timeline/GanttTimelineChart.jsx').then((module) => ({ default: module.GanttTimelineChart }));
const donutWorkloadChartPromise = import('../../charts/DonutWorkloadChart.jsx').then((module) => ({ default: module.DonutWorkloadChart }));
const userContributionStackChartPromise = import('../../charts/UserContributionStackChart.jsx').then((module) => ({ default: module.UserContributionStackChart }));
const processTimeBreakdownChartPromise = import('../../charts/ProcessTimeBreakdownChart.jsx').then((module) => ({ default: module.ProcessTimeBreakdownChart }));

const GanttTimelineChart = lazy(() => ganttTimelineChartPromise);
const DonutWorkloadChart = lazy(() => donutWorkloadChartPromise);
const UserContributionStackChart = lazy(() => userContributionStackChartPromise);
const ProcessTimeBreakdownChart = lazy(() => processTimeBreakdownChartPromise);

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
  if (drillGroup === 'EditData') return 'EditData';
  if (drillGroup === 'EditMeta') return 'EditMeta';
  if (drillGroup === 'Idle') return 'Idle';
  return '';
}

function toTimelineBarLabel(segmentType) {
  const drillGroup = toDrillGroup(segmentType);
  if (drillGroup === 'Processing') return 'First Spread';
  if (drillGroup === 'Reprocessing') return 'Second Spread';
  return toGanttSegmentTypeLabel(segmentType);
}

function shouldExcludeDetailActivity(activityLabel, documentLabel) {
  const haystack = `${String(activityLabel || '')} ${String(documentLabel || '')}`.toLowerCase();
  return haystack.includes('markup')
    || haystack.includes('timestamp')
    || haystack.includes('time stamp')
    || haystack.includes('time stam');
}

function buildTimelineDetailData(segments, timelineSettings) {
  const singleLane = Boolean(timelineSettings?.singleLane);
  const showSystemLane = timelineSettings?.showSystemLane !== false;
  const showIdleLane = timelineSettings?.showIdleLane !== false;

  const mappedRows = mapSegmentsToRows(
    Array.isArray(segments) ? segments : [],
    singleLane
  ).filter((segment) => {
    if (!showSystemLane && segment.origLane === 'System') return false;
    if (!showIdleLane && segment.origLane === 'Idle') return false;
    return isTimelineDurationSegment(segment);
  });

  const rawBars = mappedRows
    .map((segment, index) => {
      const countKey = toTimelineDetailCountKey(segment.segmentType);
      return {
        id: segment.id || `timeline-bar-${index}`,
        countKey,
        lane: segment.lane || toTimelineLane(segment.segmentType, segment.userName),
        userName: segment.userName || 'System',
        activity: toTimelineBarLabel(segment.segmentType),
        segmentType: String(segment.segmentType || 'UNKNOWN'),
        start: segment.start,
        end: segment.end,
        startTs: Number(segment.startTs) || Date.parse(String(segment.start || '')) || 0,
        endTs: Number(segment.endTs) || Date.parse(String(segment.end || '')) || 0,
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

  const summaryCounts = {
    Uploading: 0,
    Processing: 0,
    Reprocessing: 0,
    Review: 0,
    EditData: 0,
    EditMeta: 0,
    Idle: 0,
  };
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
      { key: 'EditData', label: 'Edit Data', count: summaryCounts.EditData, accentClass: 'text-[#9a3412]' },
      { key: 'EditMeta', label: 'Edit Meta', count: summaryCounts.EditMeta, accentClass: 'text-[#7c2d12]' },
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
      : (drillGroup === 'EditData' || drillGroup === 'EditMeta' ? 'Edit' : '');
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
    const segmentGroup = toSegmentGroup(segment.segmentType);

    if (safeSelected.length > 0 && !safeSelected.includes(segmentGroup)) return null;
    if (!showProcessBreakdownIdle && drillGroup === 'Idle') return null;

    if (
      mergeReviewAndEdit
      && (
        drillGroup === 'Review'
        || drillGroup === 'ReviewAutoClose'
        || drillGroup === 'EditData'
        || drillGroup === 'EditMeta'
      )
    ) {
      return { key: 'review-edit', label: 'Review & Edit', colorClass: 'bg-[#fff7ed] text-[#c2410c]', dotClass: 'bg-[#F59E0B]' };
    }
    if (drillGroup === 'Uploading') return { key: 'uploading', label: 'Uploading', colorClass: 'bg-slate-100 text-slate-700', dotClass: 'bg-slate-500' };
    if (drillGroup === 'Processing') return { key: 'processing', label: 'First Spread', colorClass: 'bg-[#dbeafe] text-[#1d4ed8]', dotClass: 'bg-[#3b82f6]' };
    if (drillGroup === 'Reprocessing') return { key: 'reprocess', label: 'Second Spread', colorClass: 'bg-[#e0e7ff] text-[#4338ca]', dotClass: 'bg-[#6366f1]' };
    if (drillGroup === 'Review' || drillGroup === 'ReviewAutoClose') return { key: 'review', label: 'Review', colorClass: 'bg-[#ecfeff] text-[#0f766e]', dotClass: 'bg-[#06B6D4]' };
    if (drillGroup === 'EditData') return { key: 'edit-data', label: 'Edit Data', colorClass: 'bg-[#fff7ed] text-[#c2410c]', dotClass: 'bg-[#F59E0B]' };
    if (drillGroup === 'EditMeta') return { key: 'edit-meta', label: 'Edit Meta', colorClass: 'bg-[#fef2f2] text-[#9a3412]', dotClass: 'bg-[#C2410C]' };
    if (drillGroup === 'Idle') return { key: 'idle', label: 'Idle', colorClass: 'bg-slate-100 text-slate-600', dotClass: 'bg-slate-400' };
    return null;
  };

  const grouped = new Map();
  safeSegments.forEach((segment) => {
    const groupMeta = resolveGroupKey(segment);
    if (!groupMeta) return;
    const activityLabel = toGanttSegmentTypeLabel(segment.segmentType);
    if (shouldExcludeDetailActivity(activityLabel, segment.documentLabel)) return;
    if (!grouped.has(groupMeta.key)) grouped.set(groupMeta.key, { ...groupMeta, activities: [], totalSeconds: 0 });
    const entry = grouped.get(groupMeta.key);
    const durationSeconds = Number(segment.durationSeconds) || 0;
    entry.activities.push({
      id: segment.id || `${groupMeta.key}-${segment.startTs}-${segment.segmentType}`,
      activity: activityLabel,
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
    : ['uploading', 'processing', 'reprocess', 'review', 'edit-data', 'edit-meta', 'idle'];

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

const TimelineDetailView = React.memo(({ segments, timelineSettings }) => {
  const { bars, summaryCards, sourceRows } = React.useMemo(
    () => buildTimelineDetailData(segments, timelineSettings),
    [segments, timelineSettings]
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
        <div className="grid gap-3 grid-cols-2 max-sm:gap-2 sm:grid-cols-3 md:grid-cols-5">
          {summaryCards.map((card, idx) => (
            <div 
              key={card.key} 
              className={`rounded-2xl border border-slate-200 bg-white p-4 max-sm:p-3 shadow-sm animate-stagger-${Math.min(8, idx + 1)}`}
            >
              <div className="text-[11px] max-sm:text-[9px] max-sm:tracking-wider font-bold uppercase tracking-[0.18em] text-slate-500 truncate">{card.label}</div>
              <div className={`mt-2 max-sm:mt-1.5 text-3xl max-sm:text-2xl font-extrabold leading-none ${card.accentClass}`}>{card.count}</div>
              <div className="mt-2 max-sm:mt-1 text-xs max-sm:text-[10px] font-medium text-slate-500">bars</div>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.5rem] bg-white fade-slide-down" style={{ animationDelay: '300ms' }}>
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
        <section 
          key={group.user} 
          className={`overflow-hidden rounded-[1.5rem] bg-white animate-stagger-${Math.min(8, userIndex + 1)}`}
        >
          <button
            type="button"
            onClick={() => toggleUser(group.user)}
            className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left sm:gap-3 sm:px-5 sm:py-4"
          >
            <div className="flex items-center gap-2 min-w-0 sm:gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f4f9fd] text-[#3860be] sm:h-11 sm:w-11">
                <User className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 sm:text-xs">User {userIndex + 1}</div>
                <div className="truncate text-lg font-bold text-[#17335f] sm:text-xl">{group.user}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 sm:gap-3">
              <div className="flex items-center gap-1.5 rounded-2xl bg-[#f8fbfe] px-2.5 py-1.5 sm:gap-2 sm:px-4 sm:py-2">
                <Clock className="h-3.5 w-3.5 text-[#00a4e4] sm:h-4 sm:w-4" />
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 sm:text-[11px]">Total Time</div>
                  <div className="text-sm font-bold text-[#17335f] sm:text-base">{formatDuration(group.totalSeconds)}</div>
                </div>
              </div>
              <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform sm:h-5 sm:w-5 ${openUser === group.user ? 'rotate-180' : ''}`} />
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
                    <th className="px-5 py-3">No.</th>
                    <th className="px-5 py-3">Activity</th>
                    <th className="px-5 py-3">Start</th>
                    <th className="px-5 py-3">End</th>
                    <th className="px-5 py-3">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {group.activities.map((activity, index) => (
                    <tr key={activity.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-5 py-4 font-medium text-slate-500">{index + 1}</td>
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
          <section 
            key={row.user} 
            className={`overflow-hidden rounded-[1.5rem] bg-white animate-stagger-${Math.min(8, index + 1)}`}
          >
            <button
              type="button"
              onClick={() => setOpenUser((current) => (current === row.user ? '' : row.user))}
              className="flex w-full items-center justify-between gap-2 border-b border-slate-200 px-3 py-3 text-left sm:gap-3 sm:px-5 sm:py-4"
            >
              <div className="flex items-center gap-2 min-w-0 sm:gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f4f9fd] text-[#3860be] sm:h-11 sm:w-11">
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 sm:text-xs">User {index + 1}</div>
                  <div className="truncate text-lg font-bold text-[#17335f] sm:text-xl">{row.user}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 sm:gap-3">
                <div className="flex items-center gap-1.5 rounded-2xl bg-[#f8fbfe] px-2.5 py-1.5 sm:gap-2 sm:px-4 sm:py-2">
                  <Clock className="h-3.5 w-3.5 text-[#00a4e4] sm:h-4 sm:w-4" />
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 sm:text-[11px]">Total Time</div>
                    <div className="text-sm font-bold text-[#17335f]">{formatDuration(row.totalSeconds)}</div>
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform sm:h-5 sm:w-5 ${isOpen ? 'rotate-180' : ''}`} />
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
                              <th className="px-5 py-3">No.</th>
                              <th className="px-5 py-3">Activity</th>
                              <th className="px-5 py-3">Start</th>
                              <th className="px-5 py-3">End</th>
                              <th className="px-5 py-3">Duration</th>
                            </tr>
                          </thead>
                          <tbody>
                            {editActivities.map((activity, index) => (
                              <tr key={activity.id} className="border-b border-slate-100 last:border-b-0">
                                <td className="px-5 py-4 font-medium text-slate-500">{index + 1}</td>
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
                              <th className="px-5 py-3">No.</th>
                              <th className="px-5 py-3">Activity</th>
                              <th className="px-5 py-3">Start</th>
                              <th className="px-5 py-3">End</th>
                              <th className="px-5 py-3">Duration</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reviewActivities.map((activity, index) => (
                              <tr key={activity.id} className="border-b border-slate-100 last:border-b-0">
                                <td className="px-5 py-4 font-medium text-slate-500">{index + 1}</td>
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
          <section 
            key={group.key} 
            className={`overflow-hidden rounded-[1.5rem] bg-white animate-stagger-${Math.min(8, index + 1)}`}
          >
            <button
              type="button"
              onClick={() => setOpenGroup((current) => (current === group.key ? '' : group.key))}
              className="flex w-full items-center justify-between gap-2 border-b border-slate-200 px-3 py-3 text-left sm:gap-3 sm:px-5 sm:py-4"
            >
              <div className="flex items-center gap-2 min-w-0 sm:gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl sm:h-11 sm:w-11 ${group.colorClass}`}>
                  <span className={`h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5 ${group.dotClass}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 sm:text-xs">Group {index + 1}</div>
                  <div className="truncate text-lg font-bold text-[#17335f] sm:text-xl">{group.label}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 sm:gap-3">
                <div className="flex items-center gap-1.5 rounded-2xl bg-[#f8fbfe] px-2.5 py-1.5 sm:gap-2 sm:px-4 sm:py-2">
                  <Clock className="h-3.5 w-3.5 text-[#00a4e4] sm:h-4 sm:w-4" />
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 sm:text-[11px]">Total Time</div>
                    <div className="text-sm font-bold text-[#17335f]">{formatDuration(group.totalSeconds)}</div>
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform sm:h-5 sm:w-5 ${isOpen ? 'rotate-180' : ''}`} />
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
                      <th className="px-5 py-3">No.</th>
                      <th className="px-5 py-3">Activity</th>
                      <th className="px-5 py-3">Start</th>
                      <th className="px-5 py-3">End</th>
                      <th className="px-5 py-3">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.activities.map((activity, activityIndex) => (
                      <tr key={activity.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-5 py-4 font-medium text-slate-500">{activityIndex + 1}</td>
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

  const groups = React.useMemo(() => {
    const colorMap = {
      'after-processing': { colorClass: 'bg-[#dbeafe] text-[#1d4ed8]', dotClass: 'bg-[#3b82f6]' },
      'after-reprocessing': { colorClass: 'bg-[#e0e7ff] text-[#4338ca]', dotClass: 'bg-[#6366f1]' },
      'between-review-edit': { colorClass: 'bg-[#fff7ed] text-[#c2410c]', dotClass: 'bg-[#F59E0B]' },
    };

    return buildTransitionBreakdownGroups(segments, {
      afterProcessing: 'After Processing',
      afterReprocessing: 'After Reprocessing',
      betweenReviewEdit: 'Between Review & Edit',
    })
      .map((group) => {
        const activities = group.activities
          .slice()
          .sort((a, b) => a.startTs - b.startTs)
          .map((activity) => ({
            ...activity,
            activity: toGanttSegmentTypeLabel(activity.activity),
          }))
          .filter((activity) => !shouldExcludeDetailActivity(activity.activity, activity.documentLabel));
        const totalSeconds = activities.reduce((sum, activity) => sum + (Number(activity.durationSeconds) || 0), 0);

        return {
          ...group,
          ...colorMap[group.key],
          activities,
          totalSeconds,
          averageSeconds: activities.length > 0 ? totalSeconds / activities.length : 0,
        };
      })
      .filter((group) => group.activities.length > 0);
  }, [segments]);

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
          <section 
            key={group.key} 
            className={`overflow-hidden rounded-[1.5rem] bg-white animate-stagger-${Math.min(8, index + 1)}`}
          >
            <button
              type="button"
              onClick={() => setOpenGroup((current) => (current === group.key ? '' : group.key))}
              className="flex w-full items-center justify-between gap-2 border-b border-slate-200 px-3 py-3 text-left sm:gap-3 sm:px-5 sm:py-4"
            >
              <div className="flex items-center gap-2 min-w-0 sm:gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl sm:h-11 sm:w-11 ${group.colorClass}`}>
                  <span className={`h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5 ${group.dotClass}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 sm:text-xs">Group {index + 1}</div>
                  <div className="truncate text-lg font-bold text-[#17335f] sm:text-xl">{group.label}</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 sm:gap-3">
                <div className="hidden min-[440px]:flex items-center gap-1.5 rounded-2xl bg-[#f8fbfe] px-2.5 py-1.5 sm:gap-2 sm:px-4 sm:py-2">
                  <Clock className="h-3.5 w-3.5 text-[#00a4e4] sm:h-4 sm:w-4" />
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 sm:text-[11px]">Average</div>
                    <div className="text-sm font-bold text-[#17335f] sm:text-base">{formatDuration(group.averageSeconds)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl bg-[#f8fbfe] px-2.5 py-1.5 sm:gap-2 sm:px-4 sm:py-2">
                  <Clock className="h-3.5 w-3.5 text-[#00a4e4] sm:h-4 sm:w-4" />
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 sm:text-[11px]">Total Time</div>
                    <div className="text-sm font-bold text-[#17335f]">{formatDuration(group.totalSeconds)}</div>
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform sm:h-5 sm:w-5 ${isOpen ? 'rotate-180' : ''}`} />
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
                      <th className="px-5 py-3">No.</th>
                      <th className="px-5 py-3">Activity</th>
                      <th className="px-5 py-3">Start</th>
                      <th className="px-5 py-3">End</th>
                      <th className="px-5 py-3">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.activities.map((activity, activityIndex) => (
                      <tr key={activity.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-5 py-4 font-medium text-slate-500">{activityIndex + 1}</td>
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
    chartBaseSegments,
    selectedSegmentTypes,
    showProcessBreakdownIdle,
    showProcessBreakdownLabels,
    workloadVisibleRows,
    contributionRows,
    mergeReviewAndEdit,
    setSelectedGanttSegment,
    timelineSettings,
  } = data;

  const processBreakdownData = React.useMemo(() => {
    const totals = {
      Uploading: 0,
      Processing: 0,
      Reprocess: 0,
      Review: 0,
      EditData: 0,
      EditMeta: 0,
      Idle: 0,
    };
    const sourceSegments = chartBaseSegments || ganttVisibleSegments;
    sourceSegments.forEach(s => {
      const drillGroup = toDrillGroup(s.segmentType);
      if (!showProcessBreakdownIdle && drillGroup === 'Idle') return;
      const duration = Number(s.durationSeconds) || 0;
      if (drillGroup === 'Uploading') totals.Uploading += duration;
      else if (drillGroup === 'Processing') totals.Processing += duration;
      else if (drillGroup === 'Reprocessing') totals.Reprocess += duration;
      else if (drillGroup === 'Review' || drillGroup === 'ReviewAutoClose') totals.Review += duration;
      else if (drillGroup === 'EditData') totals.EditData += duration;
      else if (drillGroup === 'EditMeta') totals.EditMeta += duration;
      else if (drillGroup === 'Idle') totals.Idle += duration;
      else totals.Idle += duration;
    });

    let items = [];
    if (mergeReviewAndEdit) {
      const mergedReviewEdit = totals.Review + totals.EditData + totals.EditMeta;
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

    const completeSeconds = (
      totals.Uploading
      + totals.Processing
      + totals.Reprocess
      + totals.Review
      + totals.EditData
      + totals.EditMeta
    );
    if (completeSeconds > 0) {
      items.push({
        label: 'Complete',
        seconds: completeSeconds,
        color: '#16A34A'
      });
    }
    return items;
  }, [ganttVisibleSegments, chartBaseSegments, mergeReviewAndEdit, showProcessBreakdownIdle]);

  const transitionTimeData = React.useMemo(() => {
    return buildAverageTransitionTimeData(chartBaseSegments || ganttVisibleSegments, {
      afterProcessing: 'After Processing',
      afterReprocessing: 'After Reprocessing',
      betweenReviewEdit: 'Between Review And Edit',
    });
  }, [ganttVisibleSegments, chartBaseSegments]);

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
        <div className="p-6 md:px-10 border-b flex justify-between items-center max-sm:items-start bg-slate-50/50">
          <div className="max-sm:pr-2">
            <h2 className="text-2xl max-sm:text-lg max-sm:leading-tight font-extrabold text-[#17335f]">{modalTitle}</h2>
            <p className="text-sm max-sm:text-[9px] max-sm:tracking-normal max-sm:leading-tight max-sm:mt-0.5 text-slate-500 font-bold uppercase tracking-wider">{modalSubtitle}</p>
          </div>
          <button onClick={onClose} className="p-3 max-sm:p-2 max-sm:-mr-2 max-sm:-mt-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-2xl transition-all hover:rotate-90 duration-300 shrink-0"><X className="w-8 h-8 max-sm:w-6 max-sm:h-6" /></button>
        </div>
        <div className="flex-1 overflow-auto p-6 md:p-10 no-scrollbar">
          <Suspense fallback={<ExpandedChartFallback />}>
            {visualizationId === 'gantt' && (
              <GanttTimelineChart
                segments={ganttVisibleSegments}
                onSelectSegment={setSelectedGanttSegment}
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
          {visualizationId === 'gantt-detail' && <TimelineDetailView segments={ganttVisibleSegments} timelineSettings={timelineSettings} />}
          {visualizationId === 'donut-detail' && (
            <UserShareDetailView
              segments={chartBaseSegments || ganttVisibleSegments}
              workloadVisibleRows={workloadVisibleRows}
            />
          )}
          {visualizationId === 'contribution-detail' && (
            <UserBreakdownDetailView rows={contributionRows} segments={chartBaseSegments || ganttVisibleSegments} />
          )}
          {visualizationId === 'process-breakdown-detail' && (
            <TimeBreakdownDetailView
              segments={chartBaseSegments || ganttVisibleSegments}
              selectedSegmentTypes={selectedSegmentTypes}
              showProcessBreakdownIdle={showProcessBreakdownIdle}
              mergeReviewAndEdit={mergeReviewAndEdit}
            />
          )}
          {visualizationId === 'matrix-detail' && (
            <TransitionBreakdownDetailView segments={ganttVisibleSegments} />
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
