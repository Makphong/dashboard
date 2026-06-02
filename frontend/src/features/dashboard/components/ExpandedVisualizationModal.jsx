import React from 'react';
import { ChevronDown, Clock, User, X } from 'lucide-react';
import { GanttTimelineChart } from '../../timeline/GanttTimelineChart.jsx';
import { DonutWorkloadChart } from '../../charts/DonutWorkloadChart.jsx';
import { UserContributionStackChart } from '../../charts/UserContributionStackChart.jsx';
import { ProcessTimeBreakdownChart } from '../../charts/ProcessTimeBreakdownChart.jsx';
import { GANTT_DRILL_GROUP_COLORS } from '../../../lib/constants.js';
import { toDrillGroup } from '../../../lib/segmentUtils.js';
import { formatDuration, toDisplayDate, toGanttSegmentTypeLabel, toTimelineLane } from '../../../lib/utils.js';

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

const UserShareDetailView = React.memo(({ segments, workloadVisibleRows }) => {
  const [openUser, setOpenUser] = React.useState('');
  let userGroups = [];
  let renderError = '';

  try {
    userGroups = buildUserGroups(segments, workloadVisibleRows);
  } catch (error) {
    renderError = error instanceof Error ? error.message : String(error);
  }

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
                ? 'max-h-[1200px] translate-y-0 duration-[2000ms]'
                : 'max-h-0 -translate-y-1 duration-500'
            }`}
          >
            <div className="overflow-x-auto border-t border-slate-200">
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

export const ExpandedVisualizationModal = React.memo(({ visualizationId, onClose, data }) => {
  if (!visualizationId) return null;

  const modalTitle = visualizationId === 'donut-detail' ? 'Visualization Source Details' : 'Full View Analysis';
  const modalSubtitle = visualizationId === 'donut-detail' ? 'User Activity Timeline' : 'Advanced Visualization';

  const {
    ganttVisibleSegments,
    processBreakdownSegments,
    selectedSegmentTypes,
    showProcessBreakdownIdle,
    showProcessBreakdownLabels,
    workloadVisibleRows,
    contributionRows,
    mergeReviewAndEdit,
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
    const groups = new Map();
    sourceSegments.forEach(s => {
      if (!groups.has(s.sheetKey)) groups.set(s.sheetKey, []);
      groups.get(s.sheetKey).push(s);
    });

    let idleAfterProcess = 0, countAfterProcess = 0;
    let idleAfterReprocess = 0, countAfterReprocess = 0;
    let idleBetweenActions = 0, countBetweenActions = 0;

    groups.forEach(segments => {
      const sorted = [...segments].sort((a, b) => a.startTs - b.startTs);
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        const prevDrill = toDrillGroup(prev.segmentType);
        const currDrill = toDrillGroup(curr.segmentType);
        if (currDrill === 'Idle') {
          const duration = Number(curr.durationSeconds) || 0;
          if (prevDrill === 'Processing') {
            idleAfterProcess += duration;
            countAfterProcess++;
          } else if (prevDrill === 'Reprocessing') {
            idleAfterReprocess += duration;
            countAfterReprocess++;
          } else if (prevDrill === 'Review' || prevDrill === 'Edit' || prevDrill === 'Uploading') {
            const hasFutureAction = sorted.slice(i + 1).some(s => {
              const dg = toDrillGroup(s.segmentType);
              return dg === 'Review' || dg === 'Edit';
            });
            if (hasFutureAction) {
              idleBetweenActions += duration;
              countBetweenActions++;
            }
          }
        }
      }
    });

    return [
      { label: 'After Processing', seconds: countAfterProcess > 0 ? idleAfterProcess / countAfterProcess : 0, totalSeconds: idleAfterProcess, color: '#3b82f6' },
      { label: 'After Reprocessing', seconds: countAfterReprocess > 0 ? idleAfterReprocess / countAfterReprocess : 0, totalSeconds: idleAfterReprocess, color: '#6366f1' },
      { label: 'Between Review And Edit', seconds: countBetweenActions > 0 ? idleBetweenActions / countBetweenActions : 0, totalSeconds: idleBetweenActions, color: '#f59e0b' }
    ];
  }, [ganttVisibleSegments, processBreakdownSegments]);

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
          {visualizationId === 'gantt' && <GanttTimelineChart segments={ganttVisibleSegments} expanded />}
          {visualizationId === 'donut' && <DonutWorkloadChart rows={workloadVisibleRows} expanded />}
          {visualizationId === 'donut-detail' && (
            <UserShareDetailView
              segments={ganttVisibleSegments}
              workloadVisibleRows={workloadVisibleRows}
            />
          )}
          {visualizationId === 'process-breakdown' && <ProcessTimeBreakdownChart data={processBreakdownData} showLabels={showProcessBreakdownLabels} />}
          {visualizationId === 'contribution' && <UserContributionStackChart rows={contributionRows} expanded />}
          {visualizationId === 'matrix' && <ProcessTimeBreakdownChart data={transitionTimeData} showLabels={showProcessBreakdownLabels} />}
        </div>
      </div>
    </div>
  );
});
