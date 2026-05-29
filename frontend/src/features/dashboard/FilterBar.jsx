import React from 'react';
import { 
  Calendar, 
  FileText, 
  Users, 
  LayoutDashboard, 
  RefreshCw,
  Search,
  ChevronRight,
  Database,
  Menu
} from 'lucide-react';
import { FilterPopover } from '../../components/shared/FilterPopover.jsx';
import { DropdownSearch } from '../../components/shared/DropdownSearch.jsx';
import { extractFileNameFromSheetKey, buildSheetKey, toSegmentTypeLabel } from '../../lib/utils.js';

export function FilterBar({
  dashboard,
  openDropdown,
  setOpenDropdown,
  userSearchText,
  setUserSearchText,
  segmentTypeSearchText,
  setSegmentTypeSearchText,
  documentFileSearch,
  setDocumentFileSearch,
  documentSheetSearch,
  setDocumentSheetSearch,
  onMenuClick,
}) {
  const {
    loading, syncing, refreshAll,
    datePreset, setDatePreset, dateStart, setDateStart, dateEnd, setDateEnd,
    selectedFiles, setSelectedFiles, selectedSheets, setSelectedSheets,
    selectedUsers, setSelectedUsers, selectedSegmentTypes, setSelectedSegmentTypes,
    selectedSystemStages, setSelectedSystemStages,
    activeDocumentFile, setActiveDocumentFile,
    documentTree, userOptions, segmentTypeOptions, systemStageOptions
  } = dashboard;

  const toggleSelectedValue = (setter, value) => {
    setter((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const toggleFileSelection = (fileName, currentlyChecked = false) => {
    if (currentlyChecked) {
      setSelectedFiles((prev) => prev.filter((item) => item !== fileName));
      setSelectedSheets((prev) => prev.filter((sheetKey) => extractFileNameFromSheetKey(sheetKey) !== fileName));
      return;
    }
    setSelectedFiles((prev) => (prev.includes(fileName) ? prev : [...prev, fileName]));
  };

  const toggleSheetSelection = (fileName, sheetName) => {
    const sheetKey = buildSheetKey(fileName, sheetName);
    const nextSheets = selectedSheets.includes(sheetKey)
      ? selectedSheets.filter((item) => item !== sheetKey)
      : [...selectedSheets, sheetKey];
    setSelectedSheets(nextSheets);
    if (nextSheets.length === 0) {
      setSelectedFiles(documentTree.map(t => t.fileName));
    }
  };

  const filteredDocumentTree = documentTree.filter((item) => 
    item.fileName.toLowerCase().includes(documentFileSearch.trim().toLowerCase())
  );

  const activeDocumentEntry = documentTree.find((item) => item.fileName === activeDocumentFile) || null;
  const filteredSheetsForActiveFile = activeDocumentEntry 
    ? activeDocumentEntry.sheets.filter((sheet) => sheet.toLowerCase().includes(documentSheetSearch.trim().toLowerCase()))
    : [];

  const filteredUserOptions = userOptions.filter((userName) => 
    userName.toLowerCase().includes(userSearchText.trim().toLowerCase())
  );

  const filteredSegmentTypeOptions = segmentTypeOptions.map((value) => ({
    label: toSegmentTypeLabel(value),
    value,
  })).filter((option) => {
    const searchText = segmentTypeSearchText.trim().toLowerCase();
    return option.label.toLowerCase().includes(searchText) || option.value.toLowerCase().includes(searchText);
  });

  const selectedFileSet = new Set(selectedFiles);
  const selectedSheetSet = new Set(selectedSheets);
  const selectedUserSet = new Set(selectedUsers);
  const selectedSegmentTypeSet = new Set(selectedSegmentTypes);

  return (
    <header className="shrink-0 bg-white/90 backdrop-blur-md border-b border-[#d7e8f6] px-4 md:px-8 py-3 z-[80]">
      <div className="max-w-[1600px] mx-auto flex items-center gap-2 md:gap-3">
        
        <div className="flex-1 flex items-center gap-2 md:gap-3 overflow-x-auto no-scrollbar py-0.5">
          {/* Mobile Menu Trigger */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-[#3860be] transition-colors shrink-0"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Date Filter */}
          <FilterPopover
            id="date-range"
            title="Date Range"
            summary={datePreset === 'all' ? 'All Time' : (datePreset === 'custom' ? `${dateStart} - ${dateEnd}` : datePreset)}
            openDropdown={openDropdown}
            setOpenDropdown={setOpenDropdown}
            icon={Calendar}
            active={datePreset !== 'all'}
          >
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {['all', '7d', '30d', '90d'].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setDatePreset(preset)}
                    className={`h-9 rounded-lg text-sm font-semibold transition-colors ${datePreset === preset ? 'bg-[#00a4e4] text-white shadow-sm' : 'bg-[#f6fbff] text-slate-600 hover:bg-[#e8f7fd]'}`}
                  >
                    {preset === 'all' ? 'All Time' : (preset === '7d' ? 'Last 7 Days' : (preset === '30d' ? 'Last 30 Days' : 'Last 90 Days'))}
                  </button>
                ))}
                <button
                  onClick={() => setDatePreset('custom')}
                  className={`h-9 rounded-lg text-sm font-semibold transition-colors col-span-2 ${datePreset === 'custom' ? 'bg-[#00a4e4] text-white shadow-sm' : 'bg-[#f6fbff] text-slate-600 hover:bg-[#e8f7fd]'}`}
                >
                  Custom Range
                </button>
              </div>

              {datePreset === 'custom' && (
                <div className="space-y-3 pt-3 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
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

          {/* Document Filter */}
          <FilterPopover
            id="document-file"
            title="Documents"
            summary={selectedFiles.length === 0 && selectedSheets.length === 0 ? 'All Documents' : (selectedSheets.length > 0 ? `${selectedSheets.length} Sheets` : `${selectedFiles.length} Files`)}
            openDropdown={openDropdown}
            setOpenDropdown={setOpenDropdown}
            icon={FileText}
            active={selectedFiles.length > 0 || selectedSheets.length > 0}
            minWidthClass="min-w-[240px]"
            panelClassName="w-[640px] max-w-[92vw]"
          >
            <div className="flex h-[420px] divide-x divide-slate-100">
              {/* File List */}
              <div className="w-1/2 flex flex-col">
                <div className="p-3 border-b border-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Source Files</div>
                    <button onClick={() => setSelectedFiles([])} className="text-[11px] font-semibold text-slate-400 hover:text-slate-600">Clear</button>
                  </div>
                  <DropdownSearch value={documentFileSearch} onChange={setDocumentFileSearch} placeholder="Search files..." />
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar">
                  {filteredDocumentTree.map((item) => (
                    <div
                      key={item.fileName}
                      onClick={() => setActiveDocumentFile(item.fileName)}
                      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${activeDocumentFile === item.fileName ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFileSet.has(item.fileName)}
                        onChange={(e) => { e.stopPropagation(); toggleFileSelection(item.fileName, selectedFileSet.has(item.fileName)); }}
                        className="h-4 w-4 accent-blue-600 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate ${activeDocumentFile === item.fileName ? 'text-blue-700' : 'text-slate-700'}`}>{item.fileName}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{item.sheets.length} sheets</div>
                      </div>
                      <ChevronRight className={`w-4 h-4 transition-transform ${activeDocumentFile === item.fileName ? 'text-blue-400 translate-x-0.5' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`} />
                    </div>
                  ))}
                </div>
              </div>
              {/* Sheet List */}
              <div className="w-1/2 flex flex-col bg-slate-50/30">
                <div className="p-3 border-b border-slate-50 space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sheets for selected file</div>
                  <DropdownSearch value={documentSheetSearch} onChange={setDocumentSheetSearch} placeholder="Search sheets..." />
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
                      const sheetKey = buildSheetKey(activeDocumentFile, sheet);
                      const isChecked = selectedSheetSet.has(sheetKey);
                      return (
                        <label key={sheet} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-sm cursor-pointer transition-all">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSheetSelection(activeDocumentFile, sheet)}
                            className="h-4 w-4 accent-blue-600 rounded"
                          />
                          <span className="text-sm font-medium text-slate-700 truncate">{sheet}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </FilterPopover>

          {/* User Filter */}
          <FilterPopover
            id="user-filter"
            title="Users"
            summary={selectedUsers.length === 0 ? 'All Users' : `${selectedUsers.length} Users`}
            openDropdown={openDropdown}
            setOpenDropdown={setOpenDropdown}
            icon={Users}
            active={selectedUsers.length > 0}
          >
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Select Users</div>
                <button onClick={() => setSelectedUsers([])} className="text-[11px] font-semibold text-slate-400">Clear</button>
              </div>
              <DropdownSearch value={userSearchText} onChange={setUserSearchText} placeholder="Search user..." />
              <div className="max-h-64 overflow-y-auto space-y-1 pr-1 no-scrollbar">
                {filteredUserOptions.map((userName) => (
                  <label key={userName} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 px-2.5 py-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedUserSet.has(userName)}
                      onChange={() => toggleSelectedValue(setSelectedUsers, userName)}
                      className="h-4 w-4 accent-blue-600 rounded"
                    />
                    <span className="text-sm text-slate-700 truncate">{userName}</span>
                  </label>
                ))}
              </div>
            </div>
          </FilterPopover>

          {/* Segment Filter */}
          <FilterPopover
            id="segment-type"
            title="Segment"
            summary={selectedSegmentTypes.length === 0 ? 'Segment Type' : (selectedSegmentTypes.length === 1 ? toSegmentTypeLabel(selectedSegmentTypes[0]) : `${selectedSegmentTypes.length} Types`)}
            openDropdown={openDropdown}
            setOpenDropdown={setOpenDropdown}
            icon={LayoutDashboard}
            active={selectedSegmentTypes.length > 0}
            minWidthClass="min-w-[210px]"
            panelClassName="w-[380px] max-w-[92vw]"
          >
            <div className="p-3 space-y-3">
               <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Segment Type</div>
                <button onClick={() => setSelectedSegmentTypes([])} className="text-[11px] font-semibold text-slate-400">Clear</button>
              </div>
              <DropdownSearch value={segmentTypeSearchText} onChange={setSegmentTypeSearchText} placeholder="Search segment..." />
              <div className="max-h-64 overflow-y-auto space-y-1 pr-1 no-scrollbar">
                {filteredSegmentTypeOptions.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 px-2.5 py-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSegmentTypeSet.has(option.value)}
                      onChange={() => toggleSelectedValue(setSelectedSegmentTypes, option.value)}
                      className="h-4 w-4 accent-blue-600 rounded"
                    />
                    <div className="min-w-0 text-sm font-medium text-slate-700 truncate">{option.label}</div>
                  </label>
                ))}
              </div>
            </div>
          </FilterPopover>

        </div>

        {/* Refresh Button */}
        <div className="shrink-0 flex items-center gap-4 pl-4 border-l border-[#d7e8f6]">
          <button
            onClick={() => refreshAll()}
            disabled={loading || syncing}
            className="h-10 px-4 rounded-xl border border-[#bfe8f8] bg-white text-sm font-semibold text-[#3860be] hover:bg-[#e8f7fd] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2 shadow-ktb"
          >
            <RefreshCw className={`w-4 h-4 ${(loading || syncing) ? 'animate-spin' : ''}`} />
            {loading || syncing ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>
    </header>
  );
}
