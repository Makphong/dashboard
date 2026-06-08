import { toDrillGroup } from '../../../lib/segmentUtils.js';

export function buildAverageTransitionTimeData(segments, labels = {}) {
  const sourceSegments = Array.isArray(segments) ? segments : [];
  const groups = new Map();

  sourceSegments.forEach((segment) => {
    if (!groups.has(segment.sheetKey)) groups.set(segment.sheetKey, []);
    groups.get(segment.sheetKey).push(segment);
  });

  let idleAfterProcess = 0;
  let countAfterProcess = 0;
  let idleAfterReprocess = 0;
  let countAfterReprocess = 0;
  let idleBetweenActions = 0;
  let countBetweenActions = 0;

  groups.forEach((groupSegments) => {
    const sorted = [...groupSegments].sort((a, b) => a.startTs - b.startTs);
    let hasFutureReviewOrEdit = false;

    for (let i = sorted.length - 1; i >= 1; i -= 1) {
      const curr = sorted[i];
      const currDrill = toDrillGroup(curr.segmentType);

      if (currDrill === 'Review' || currDrill === 'EditData' || currDrill === 'EditMeta') {
        hasFutureReviewOrEdit = true;
      }

      if (currDrill !== 'Idle') continue;

      const prev = sorted[i - 1];
      const prevDrill = toDrillGroup(prev.segmentType);
      const duration = Number(curr.durationSeconds) || 0;

      if (prevDrill === 'Processing') {
        idleAfterProcess += duration;
        countAfterProcess += 1;
      } else if (prevDrill === 'Reprocessing') {
        idleAfterReprocess += duration;
        countAfterReprocess += 1;
      } else if (
        hasFutureReviewOrEdit &&
        (
          prevDrill === 'Review'
          || prevDrill === 'EditData'
          || prevDrill === 'EditMeta'
          || prevDrill === 'Uploading'
        )
      ) {
        idleBetweenActions += duration;
        countBetweenActions += 1;
      }
    }
  });

  return [
    {
      label: labels.afterProcessing || 'First Spread',
      seconds: countAfterProcess > 0 ? idleAfterProcess / countAfterProcess : 0,
      totalSeconds: idleAfterProcess,
      color: '#3b82f6',
    },
    {
      label: labels.afterReprocessing || 'Second Spread',
      seconds: countAfterReprocess > 0 ? idleAfterReprocess / countAfterReprocess : 0,
      totalSeconds: idleAfterReprocess,
      color: '#6366f1',
    },
    {
      label: labels.betweenReviewEdit || 'Review & Edit',
      seconds: countBetweenActions > 0 ? idleBetweenActions / countBetweenActions : 0,
      totalSeconds: idleBetweenActions,
      color: '#f59e0b',
    },
  ];
}
