import { useMemo } from 'react';
import {
  buildDocumentTree,
  buildUserOptions,
  getDateRangeBounds,
  normalizeSelectedSegmentTypes,
  parseSegments,
  SEGMENT_GROUP_OPTIONS,
} from '../utils/segmentData.js';

export function useDashboardDerivedData(params) {
  const {
    sources,
    performance,
    datePreset,
    dateStart,
    dateEnd,
    selectedFiles,
    selectedSheets,
    selectedSegmentTypes,
  } = params;

  const segments = performance?.segments || [];
  const invalidSheetCounts = performance?.invalidSheetCounts || {};

  const normalizedSelectedSegmentTypes = useMemo(
    () => normalizeSelectedSegmentTypes(selectedSegmentTypes),
    [selectedSegmentTypes]
  );

  const parsedSegments = useMemo(() => parseSegments(segments), [segments]);

  const documentTree = useMemo(
    () => buildDocumentTree(sources, parsedSegments),
    [sources, parsedSegments]
  );

  const userOptions = useMemo(
    () => buildUserOptions({
      parsedSegments,
      selectedSheets,
      selectedFiles,
      datePreset,
      dateStart,
      dateEnd,
    }),
    [parsedSegments, selectedSheets, selectedFiles, datePreset, dateStart, dateEnd]
  );

  const dateRangeBounds = useMemo(
    () => getDateRangeBounds(parsedSegments, datePreset, dateStart, dateEnd),
    [parsedSegments, datePreset, dateStart, dateEnd]
  );

  const segmentTypeOptions = useMemo(() => SEGMENT_GROUP_OPTIONS, []);

  return {
    invalidSheetCounts,
    parsedSegments,
    documentTree,
    userOptions,
    dateRangeBounds,
    segmentTypeOptions,
    normalizedSelectedSegmentTypes,
  };
}
