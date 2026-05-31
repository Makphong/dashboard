import { buildSheetKey, toDrillGroup, toTimelineLane } from '../../../lib/utils.js';

export const SEGMENT_GROUP_OPTIONS = ['Uploading', 'Processing', 'Reprocess', 'Review', 'Edit', 'Idle'];

const DAY_WINDOW_MAP = { '7d': 7, '30d': 30, '90d': 90 };

export function toSegmentGroup(segmentType) {
  const drillGroup = toDrillGroup(segmentType);
  if (drillGroup === 'Reprocessing') return 'Reprocess';
  if (drillGroup === 'ReviewAutoClose') return 'Review';
  if (drillGroup === 'EditAndComplete') return 'Edit';
  return drillGroup;
}

export function normalizeSelectedSegmentTypes(selectedSegmentTypes) {
  const allowedGroups = new Set(SEGMENT_GROUP_OPTIONS);
  return selectedSegmentTypes.filter((value) => allowedGroups.has(value));
}

export function parseSegments(segments) {
  const parsed = [];

  segments.forEach((segment, idx) => {
    const [docFileFromId = '', docPageFromId = ''] = String(segment.documentId || '').split('::');
    const fileName = String(segment.fileName || docFileFromId || 'Unknown File');
    const pageName = String(segment.pageName || docPageFromId || '');
    const sheetKey = buildSheetKey(fileName, pageName);

    const startTs = Date.parse(segment.start || '');
    const endTsRaw = Date.parse(segment.end || '');
    if (!Number.isFinite(startTs) || !Number.isFinite(endTsRaw)) return;

    const documentLabel = pageName ? `${fileName} / ${pageName}` : fileName;
    parsed.push({
      ...segment,
      id: segment.id || `${segment.segmentType || 'UNKNOWN'}-${idx}`,
      segmentType: String(segment.segmentType || 'UNKNOWN'),
      userName: String(segment.userName || 'Unknown User'),
      fileName,
      pageName,
      sheetKey,
      startTs,
      endTs: Math.max(endTsRaw, startTs + 1000),
      documentLabel,
    });
  });

  return parsed;
}

export function buildDocumentTree(sources, parsedSegments) {
  const fileMap = new Map();

  (sources || []).forEach((source) => {
    const fileName = String(source.fileName || source.name || 'Unknown File');
    if (!fileMap.has(fileName)) fileMap.set(fileName, new Set());
    (source.pages || []).forEach((page) => {
      if (page) fileMap.get(fileName).add(String(page));
    });
  });

  parsedSegments.forEach((segment) => {
    if (!fileMap.has(segment.fileName)) fileMap.set(segment.fileName, new Set());
    if (segment.pageName) fileMap.get(segment.fileName).add(segment.pageName);
  });

  return Array.from(fileMap.entries())
    .map(([fileName, sheetSet]) => ({
      fileName,
      sheets: Array.from(sheetSet).sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.fileName.localeCompare(b.fileName));
}

export function getDateRangeBounds(parsedSegments, datePreset, dateStart, dateEnd) {
  if (parsedSegments.length === 0) {
    return { minTs: Number.NEGATIVE_INFINITY, maxTs: Number.POSITIVE_INFINITY };
  }

  if (datePreset === 'custom') {
    const startTs = dateStart ? Date.parse(`${dateStart}T00:00:00`) : Number.NEGATIVE_INFINITY;
    const endTs = dateEnd ? Date.parse(`${dateEnd}T23:59:59.999`) : Number.POSITIVE_INFINITY;
    return { minTs: Math.min(startTs, endTs), maxTs: Math.max(startTs, endTs) };
  }

  if (datePreset === 'all') {
    return { minTs: Number.NEGATIVE_INFINITY, maxTs: Number.POSITIVE_INFINITY };
  }

  const latestEndTs = parsedSegments.reduce(
    (maxTs, segment) => Math.max(maxTs, segment.endTs),
    parsedSegments[0].endTs
  );
  const windowDays = DAY_WINDOW_MAP[datePreset] || 30;

  return {
    minTs: latestEndTs - (windowDays * 24 * 60 * 60 * 1000),
    maxTs: latestEndTs,
  };
}

export function buildUserOptions({
  parsedSegments,
  selectedSheets,
  selectedFiles,
  datePreset,
  dateStart,
  dateEnd,
}) {
  let minTs = Number.NEGATIVE_INFINITY;
  let maxTs = Number.POSITIVE_INFINITY;

  if (parsedSegments.length > 0) {
    if (datePreset === 'custom') {
      const startTs = dateStart ? Date.parse(`${dateStart}T00:00:00`) : Number.NEGATIVE_INFINITY;
      const endTs = dateEnd ? Date.parse(`${dateEnd}T23:59:59.999`) : Number.POSITIVE_INFINITY;
      minTs = Math.min(startTs, endTs);
      maxTs = Math.max(startTs, endTs);
    } else if (datePreset !== 'all') {
      const latestEndTs = parsedSegments.reduce(
        (maxValue, segment) => Math.max(maxValue, segment.endTs),
        parsedSegments[0].endTs
      );
      const windowDays = DAY_WINDOW_MAP[datePreset] || 30;
      minTs = latestEndTs - (windowDays * 24 * 60 * 60 * 1000);
      maxTs = latestEndTs;
    }
  }

  const selectedSheetKeys = new Set(selectedSheets);
  const selectedFileNames = new Set(selectedFiles);
  const useSheetFilter = selectedSheetKeys.size > 0;
  const names = new Set();

  for (const segment of parsedSegments) {
    if (segment.endTs < minTs || segment.startTs > maxTs) continue;

    if (useSheetFilter) {
      if (!selectedSheetKeys.has(segment.sheetKey)) continue;
    } else if (selectedFileNames.size > 0 && !selectedFileNames.has(segment.fileName)) {
      continue;
    }

    const lane = toTimelineLane(segment.segmentType, segment.userName);
    if (lane !== 'Idle' && lane !== 'Unknown User') names.add(lane);
  }

  return Array.from(names).sort((a, b) => a.localeCompare(b));
}
