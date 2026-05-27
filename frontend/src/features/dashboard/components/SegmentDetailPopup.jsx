import React from 'react';
import { Clock, User, Server, X } from 'lucide-react';
import { formatDuration, toDisplayDate, toGanttSegmentTypeLabel } from '../../../lib/utils.js';

export function SegmentDetailPopup({ segment, onClose }) {
  if (!segment) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 confirm-overlay-enter" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden confirm-panel-enter" onClick={e => e.stopPropagation()}>
        <div className={`h-2 ${segment.actorType === 'System' ? 'bg-slate-400' : 'bg-blue-500'}`} />
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900">{toGanttSegmentTypeLabel(segment.segmentType)}</h3>
              <div className="text-sm text-slate-500 font-medium">Segment Details</div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X className="w-5 h-5" /></button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Actor</div>
              <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
                {segment.actorType === 'System' ? <Server className="w-3.5 h-3.5 text-slate-400" /> : <User className="w-3.5 h-3.5 text-blue-500" />}
                {segment.userName}
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Duration</div>
              <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {formatDuration(segment.durationSeconds)}
              </div>
            </div>
            <div className="col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Time Window</div>
              <div className="text-sm font-bold text-slate-700">
                {toDisplayDate(segment.start)} — {toDisplayDate(segment.end)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
