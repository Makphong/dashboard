import React from 'react';
import { Database, Pin } from 'lucide-react';
import { DropdownSearch } from '../../../../components/shared/DropdownSearch.jsx';

export function DocumentSheetListColumn({
  activeDocumentEntry,
  filteredSheetsForActiveFile,
  documentSheetSearch,
  setDocumentSheetSearch,
  selectedSheetSet,
  pinnedSheetSet,
  invalidSheetCounts,
  onToggleSheetSelection,
  onTogglePin,
}) {
  return (
    <div className="w-1/2 flex flex-col bg-slate-50/30">
      <div className="p-3 border-b border-slate-50 space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sheets for selected file</div>
        <DropdownSearch
          value={documentSheetSearch}
          onChange={setDocumentSheetSearch}
          placeholder="Search sheets..."
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar">
        {!activeDocumentEntry ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center opacity-40">
            <Database className="w-8 h-8 text-slate-300 mb-2" />
            <div className="text-xs font-medium text-slate-400">Select a file to see sheets</div>
          </div>
        ) : filteredSheetsForActiveFile.length === 0 ? (
          <div className="p-4 text-xs text-slate-400 text-center">No sheets found</div>
        ) : (
          filteredSheetsForActiveFile.map((sheet) => {
            const isChecked = selectedSheetSet.has(sheet.key);
            const isPinned = pinnedSheetSet.has(sheet.key);
            const invalidCount = invalidSheetCounts?.[sheet.key] || 0;

            return (
              <div
                key={sheet.name}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-sm cursor-pointer transition-all"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggleSheetSelection(sheet.name)}
                  className="h-4 w-4 accent-blue-600 rounded"
                />
                <span className="flex-1 text-sm font-medium text-slate-700 truncate">
                  {sheet.name}
                  {invalidCount > 0 && (
                    <span className="text-red-500 ml-1.5 font-bold">(ข้อมูลผิดพลาด)</span>
                  )}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin(sheet.key);
                  }}
                  className={`p-1 rounded-md transition-all ${isPinned ? 'text-blue-500 opacity-100 bg-blue-50' : 'text-slate-300 opacity-0 group-hover:opacity-100 hover:text-slate-500 hover:bg-slate-100'}`}
                >
                  <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
