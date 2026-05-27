import { useMemo } from 'react';
import { isUserContextSegment, isIdleContextSegment } from '../../../lib/utils.js';

export function useDashboardFilters(parsedSegments, filters) {
  const {
    selectedFiles,
    selectedSheets,
    selectedUsers,
    selectedSegmentTypes,
    showIdle,
    dateRangeBounds
  } = filters;

  const filteredBaseSegments = useMemo(() => {
    if (parsedSegments.length === 0) return [];
    const fileSet = new Set(selectedFiles);
    const sheetSet = new Set(selectedSheets);
    const userSet = new Set(selectedUsers);
    
    return parsedSegments.filter((segment) => {
      if (segment.endTs < dateRangeBounds.minTs || segment.startTs > dateRangeBounds.maxTs) return false;
      if (sheetSet.size > 0) {
        if (!sheetSet.has(segment.sheetKey)) return false;
      } else if (fileSet.size > 0 && !fileSet.has(segment.fileName)) {
        return false;
      }
      if (userSet.size > 0) {
        const isUserSegment = isUserContextSegment(String(segment.segmentType || ''), segment.userName);
        if (isUserSegment) {
          if (!userSet.has(segment.userName)) return false;
        } else {
          if (!userSet.has('System')) return false;
        }
      }
      return true;
    });
  }, [parsedSegments, dateRangeBounds, selectedFiles, selectedSheets, selectedUsers]);

  const ganttVisibleSegments = useMemo(() => {
    return filteredBaseSegments.filter((segment) => {
      const segmentType = String(segment.segmentType || '');
      if (!showIdle && isIdleContextSegment(segmentType)) return false;
      if (selectedSegmentTypes.length > 0 && !selectedSegmentTypes.includes(segmentType)) {
        return segmentType.startsWith('SYSTEM_');
      }
      return true;
    });
  }, [filteredBaseSegments, showIdle, selectedSegmentTypes]);

  return {
    filteredBaseSegments,
    ganttVisibleSegments
  };
}
