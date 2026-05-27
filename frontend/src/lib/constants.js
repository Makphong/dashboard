import {
  Clock, Users, Timer, RefreshCw, AlertTriangle
} from 'lucide-react';

export const API_BASE = '';
export const FRONTEND_BUILD_VERSION = '2026-05-25-system-professional-18';
// ... rest of exports ...
export const initialKpiData = [
  { id: 1, label: 'Active User Time', value: '-', subtext: 'Avg per user: -', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 2, label: 'Contributing Users', value: '0', subtext: 'No user data', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { id: 3, label: 'Avg User Action', value: '-', subtext: 'Med - · - - -', icon: Timer, color: 'text-sky-600', bg: 'bg-sky-50' },
  { id: 5, label: 'Edit Rate', value: '0.0%', subtext: '0 edit / 0 actions', icon: RefreshCw, color: 'text-violet-600', bg: 'bg-violet-50' },
  { id: 6, label: 'Auto Closed Actions', value: '0', subtext: '0.0% of all actions', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
];
export const REOPEN_MARKER_TYPES = new Set(['REOPEN_MARKER', 'REOPEN_TO_REVIEW_HANDOFF_MARKER']);
export const PROCESSING_EQUIVALENT_IDLE_SEGMENT_TYPES = new Set(['IDLE_WAITING_FOR_SCHEDULED_REPROCESS']);
export const COMPLETE_MARKER_COLOR = '#16A34A';
export const REPROCESSING_SEGMENT_MERGE_GAP_MS = 1000;
export const MARKER_STAR_OUTER_RADIUS = 7.4;
export const MARKER_STAR_INNER_RADIUS = 3.3;
export const MARKER_STAR_MIN_GAP_PX = 12;
export const CHART_PALETTE = ['#2563EB', '#0EA5E9', '#14B8A6', '#22C55E', '#EAB308', '#F97316', '#EF4444', '#8B5CF6', '#EC4899', '#64748B'];
export const SEGMENT_COLORS = {
  USER_REVIEW_COMMENT_CHECK: '#06B6D4',
  USER_EDITING_CORRECTION: '#F59E0B',
  USER_COMPLETION_APPROVAL: '#10B981',
  USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL: '#059669',
  USER_UPLOADING: '#8B5CF6',
  USER_REVIEW_AUTO_TIMEOUT: '#EF4444',
  SYSTEM_INITIAL_PROCESSING: '#334155',
  SYSTEM_SCHEDULED_REPROCESSING: '#334155',
  SYSTEM_INTERNAL_TRANSITION: '#334155',
  IDLE_WAITING_FOR_REVIEW: '#94A3B8',
  IDLE_WAITING_FOR_REREVIEW: '#94A3B8',
  IDLE_WAITING_FOR_SCHEDULED_REPROCESS: '#334155',
  IDLE_AFTER_SYSTEM_REPROCESS: '#94A3B8',
  AUTO_TIMEOUT_MARKER: '#DC2626',
  SYSTEM_SCHEDULED_REPROCESSING_ROUND_2: '#475569',
  REOPEN_MARKER: '#A855F7',
};
export const SEGMENT_TYPE_SHORT_LABELS = {
  USER_REVIEW_COMMENT_CHECK: 'Review',
  USER_REVIEW_AUTO_TIMEOUT: 'Auto Closed',
  USER_EDITING_CORRECTION: 'Edit',
  USER_COMPLETION_APPROVAL: 'Review & Complete',
  USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL: 'Edit & Complete',
  USER_UPLOADING: 'Upload',
  SYSTEM_INITIAL_PROCESSING: 'Processing',
  SYSTEM_SCHEDULED_REPROCESSING: 'Reprocessing',
  SYSTEM_INTERNAL_TRANSITION: 'System Transition',
  IDLE_WAITING_FOR_REVIEW: 'Waiting Review',
  IDLE_WAITING_FOR_REREVIEW: 'Waiting Re-Review',
  IDLE_WAITING_FOR_SCHEDULED_REPROCESS: 'Reprocessing',
  IDLE_AFTER_SYSTEM_REPROCESS: 'Waiting Reprocess',
  AUTO_TIMEOUT_MARKER: 'Auto Timeout Marker',
  COMPLETE_BY_REVIEW_MARKER: 'Review Complete Marker',
  COMPLETE_BY_EDIT_MARKER: 'Edit Complete Marker',
  COMPLETE_AFTER_REPROCESS_ROUND_2_MARKER: 'System Complete Marker',
  REOPEN_TO_REVIEW_HANDOFF_MARKER: 'Reopen Handoff Marker',
  SYSTEM_SCHEDULED_REPROCESSING_ROUND_2: 'System Reprocess',
  REOPEN_MARKER: 'Reopen',
};
export const GANTT_SEGMENT_DISPLAY_LABELS = {
  USER_REVIEW_COMMENT_CHECK: 'Review',
  USER_EDITING_CORRECTION: 'Edit',
  USER_COMPLETION_APPROVAL: 'Review & Complete',
  USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL: 'Edit & Complete',
  USER_UPLOADING: 'Upload',
  USER_REVIEW_AUTO_TIMEOUT: 'Auto Closed (Timeout)',
  SYSTEM_INITIAL_PROCESSING: 'Processing',
  SYSTEM_SCHEDULED_REPROCESSING: 'Reprocessing',
  SYSTEM_INTERNAL_TRANSITION: 'System Transition',
  AUTO_TIMEOUT_MARKER: 'Auto Timeout Marker',
  COMPLETE_BY_REVIEW_MARKER: 'Review Complete Marker',
  COMPLETE_BY_EDIT_MARKER: 'Edit Complete Marker',
  COMPLETE_AFTER_REPROCESS_ROUND_2_MARKER: 'System Complete Marker',
  REOPEN_TO_REVIEW_HANDOFF_MARKER: 'Reopen Handoff Marker',
  IDLE_WAITING_FOR_REVIEW: 'Waiting Review',
  IDLE_WAITING_FOR_REREVIEW: 'Waiting Re-Review',
  IDLE_WAITING_FOR_SCHEDULED_REPROCESS: 'Reprocessing',
  IDLE_AFTER_SYSTEM_REPROCESS: 'Waiting Reprocess',
  SYSTEM_SCHEDULED_REPROCESSING_ROUND_2: 'System Reprocess Round 2',
  REOPEN_MARKER: 'Reopen Marker',
};

export const GANTT_DRILL_GROUPS = [
  { key: 'Uploading', label: 'Uploading', color: '#8B5CF6' },
  { key: 'Processing', label: 'Processing', color: '#334155' },
  { key: 'Idle', label: 'Idle', color: '#94A3B8' },
  { key: 'Review', label: 'Review', color: '#06B6D4' },
  { key: 'ReviewAutoClose', label: 'Review Auto Close', color: '#06B6D4' },
  { key: 'Edit', label: 'Edit', color: '#F59E0B' },
  { key: 'EditAndComplete', label: 'Complete', color: '#10B981' },
];

export const GANTT_MIN_ZOOM_SCALE = 0.35;
export const GANTT_MAX_ZOOM_SCALE = 8000;
export const GANTT_MAX_TIMELINE_WIDTH_PX = 120000000;

export const GANTT_DRILL_GROUP_COLORS = {
  Uploading: '#8B5CF6',
  Processing: '#334155',
  Review: '#06B6D4',
  ReviewAutoClose: '#06B6D4',
  Reprocessing: '#334155',
  Edit: '#F59E0B',
  EditAndComplete: '#10B981',
  Idle: '#94A3B8',
};

export const GANTT_DRILL_GROUP_LABELS = {
  Uploading: 'Uploading',
  Processing: 'Processing',
  Review: 'Review',
  ReviewAutoClose: 'Review Auto Close',
  Reprocessing: 'Reprocessing',
  Edit: 'Edit',
  EditAndComplete: 'Complete',
  Idle: 'Idle',
};

export const CORE_WORK_SESSION_TYPES = new Set([
  'USER_REVIEW_COMMENT_CHECK',
  'USER_REVIEW_AUTO_TIMEOUT',
  'USER_EDITING_CORRECTION',
  'USER_COMPLETION_APPROVAL',
  'USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL',
]);
export const WORKFLOW_FLOW_SEGMENT_TYPES = new Set([
  'USER_REVIEW_COMMENT_CHECK',
  'USER_REVIEW_AUTO_TIMEOUT',
  'USER_EDITING_CORRECTION',
  'USER_COMPLETION_APPROVAL',
  'USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL',
  'USER_UPLOADING',
  'SYSTEM_INITIAL_PROCESSING',
  'SYSTEM_SCHEDULED_REPROCESSING',
  'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2',
  'SYSTEM_INTERNAL_TRANSITION',
  'IDLE_WAITING_FOR_REVIEW',
  'IDLE_WAITING_FOR_REREVIEW',
  'IDLE_WAITING_FOR_SCHEDULED_REPROCESS',
  'IDLE_AFTER_SYSTEM_REPROCESS',
  'POST_COMPLETED_ELAPSED',
]);

export const FLOW_INSIGHT_GROUPS = [
  {
    id: 'processing-round-1-to-user',
    label: 'Round 1 Processing -> User Action',
    description: '',
  },
  {
    id: 'user-review-edit-to-next-user-step',
    label: 'User Action -> Next User Step',
    description: '',
  },
  {
    id: 'upload-to-latest-complete',
    label: 'Upload -> Final Complete',
    description: '',
  },
  {
    id: 'processing-round-2-to-user',
    label: 'Round 2 Processing -> User Action',
    description: '',
  },
];

export const TRANSITION_FRIENDLY_LABELS = {
  'USER_UPLOADING=>SYSTEM_INITIAL_PROCESSING': 'Upload complete -> System starts processing',
  'USER_UPLOADING=>IDLE_WAITING_FOR_REVIEW': 'Upload complete -> Waiting for review',
  'USER_UPLOADING=>USER_REVIEW_COMMENT_CHECK': 'Upload complete -> Review starts immediately',
  'USER_UPLOADING=>USER_REVIEW_AUTO_TIMEOUT': 'Upload complete -> No reviewer (timeout)',
  'SYSTEM_INITIAL_PROCESSING=>IDLE_WAITING_FOR_REVIEW': 'Processing complete -> Waiting for review',
  'SYSTEM_INITIAL_PROCESSING=>USER_REVIEW_COMMENT_CHECK': 'Processing complete -> Review starts immediately',
  'SYSTEM_INITIAL_PROCESSING=>USER_EDITING_CORRECTION': 'Processing complete -> Edit starts immediately',
  'IDLE_WAITING_FOR_REVIEW=>USER_REVIEW_COMMENT_CHECK': 'Waiting for review -> Review starts',
  'IDLE_WAITING_FOR_REVIEW=>USER_REVIEW_AUTO_TIMEOUT': 'Waiting too long for review -> Timeout',
  'IDLE_WAITING_FOR_REREVIEW=>USER_REVIEW_COMMENT_CHECK': 'Waiting for re-review -> Review starts',
  'IDLE_WAITING_FOR_REREVIEW=>USER_EDITING_CORRECTION': 'Waiting for re-review -> Edit starts',
  'IDLE_AFTER_SYSTEM_REPROCESS=>USER_REVIEW_COMMENT_CHECK': 'Reprocess complete -> Review starts',
  'IDLE_AFTER_SYSTEM_REPROCESS=>USER_EDITING_CORRECTION': 'Reprocess complete -> Edit starts',
  'IDLE_WAITING_FOR_SCHEDULED_REPROCESS=>SYSTEM_SCHEDULED_REPROCESSING': 'Queued -> System reprocessing',
  'USER_REVIEW_COMMENT_CHECK=>USER_COMPLETION_APPROVAL': 'Review passed -> Complete approval',
  'USER_REVIEW_COMMENT_CHECK=>USER_EDITING_CORRECTION': 'Review failed -> Send to edit',
  'USER_REVIEW_COMMENT_CHECK=>IDLE_WAITING_FOR_REREVIEW': 'Review done -> Waiting re-review',
  'USER_REVIEW_COMMENT_CHECK=>SYSTEM_SCHEDULED_REPROCESSING': 'Review done -> Send to system reprocess',
  'USER_EDITING_CORRECTION=>USER_COMPLETION_APPROVAL': 'Edit done -> Complete approval',
  'USER_EDITING_CORRECTION=>IDLE_WAITING_FOR_REREVIEW': 'Edit done -> Waiting re-review',
  'USER_EDITING_CORRECTION=>SYSTEM_SCHEDULED_REPROCESSING': 'Edit done -> Send to system reprocess',
  'USER_EDITING_CORRECTION=>USER_REVIEW_COMMENT_CHECK': 'Edit done -> Back to review',
  'USER_REVIEW_AUTO_TIMEOUT=>USER_EDITING_CORRECTION': 'Review timeout -> Back to edit',
  'USER_REVIEW_AUTO_TIMEOUT=>USER_REVIEW_COMMENT_CHECK': 'Review timeout -> Back to review',
  'USER_REVIEW_AUTO_TIMEOUT=>IDLE_WAITING_FOR_REREVIEW': 'Review timeout -> Waiting re-review',
  'USER_COMPLETION_APPROVAL=>IDLE_WAITING_FOR_REREVIEW': 'Approval complete -> Waiting re-review',
  'USER_COMPLETION_APPROVAL=>SYSTEM_SCHEDULED_REPROCESSING': 'Approval complete -> Send to system reprocess',
  'USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL=>IDLE_WAITING_FOR_REREVIEW': 'Edit + approval -> Waiting re-review',
  'SYSTEM_SCHEDULED_REPROCESSING=>IDLE_AFTER_SYSTEM_REPROCESS': 'System reprocess complete -> Waiting reviewer',
  'SYSTEM_SCHEDULED_REPROCESSING=>USER_REVIEW_COMMENT_CHECK': 'System reprocess complete -> Review starts',
  'SYSTEM_SCHEDULED_REPROCESSING=>USER_EDITING_CORRECTION': 'System reprocess complete -> Edit starts',
  'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2=>IDLE_AFTER_SYSTEM_REPROCESS': 'Round 2 reprocess complete -> Waiting reviewer',
  'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2=>USER_REVIEW_COMMENT_CHECK': 'Round 2 reprocess complete -> Review starts',
};
