import React from 'react';
import { Calendar } from 'lucide-react';
import { FilterPopover } from '../../../../components/shared/FilterPopover.jsx';
import { getDateRangeSummary } from './utils.js';

const DATE_PRESETS = ['all', '7d', '30d', '90d'];

const DATE_PRESET_LABELS = {
  all: 'All Time',
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  '90d': 'Last 90 Days',
};

export const DateRangeFilterPopover = React.memo(({
  openDropdown,
  setOpenDropdown,
  datePreset,
  setDatePreset,
  dateStart,
  setDateStart,
  dateEnd,
  setDateEnd,
}) => {
  return (
    <FilterPopover
      id="date-range"
      title="Date Range"
      summary={getDateRangeSummary(datePreset, dateStart, dateEnd)}
      openDropdown={openDropdown}
      setOpenDropdown={setOpenDropdown}
      icon={Calendar}
      active={datePreset !== 'all'}
      minWidthClass="min-w-[190px] max-sm:min-w-0"
    >
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => setDatePreset(preset)}
              className={`h-9 rounded-lg text-sm font-semibold transition-all duration-200 active:scale-95 ${datePreset === preset ? 'bg-[#00a4e4] text-white shadow-sm' : 'bg-[#f6fbff] text-slate-600 hover:bg-[#e8f7fd]'}`}
            >
              {DATE_PRESET_LABELS[preset]}
            </button>
          ))}
          <button
            onClick={() => setDatePreset('custom')}
            className={`h-9 rounded-lg text-sm font-semibold transition-all duration-200 active:scale-95 col-span-2 ${datePreset === 'custom' ? 'bg-[#00a4e4] text-white shadow-sm' : 'bg-[#f6fbff] text-slate-600 hover:bg-[#e8f7fd]'}`}
          >
            Custom Range
          </button>
        </div>

        {datePreset === 'custom' && (
          <div className="space-y-3 pt-3 border-t border-slate-100 fade-slide-down">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Start Date</label>
                <input
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">End Date</label>
                <input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </FilterPopover>
  );
});
