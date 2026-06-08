import React from 'react';
import { Menu, RefreshCw } from 'lucide-react';
import { DateRangeFilterPopover } from './filter-bar/DateRangeFilterPopover.jsx';
import { DocumentFilterPopover } from './filter-bar/DocumentFilterPopover.jsx';
import {
  togglePinInList,
  updateSelectionForFile,
  updateSelectionForSheet,
} from './filter-bar/utils.js';

export function FilterBar({
  dashboard,
  openDropdown,
  setOpenDropdown,
  documentFileSearch,
  setDocumentFileSearch,
  documentSheetSearch,
  setDocumentSheetSearch,
  onMenuClick,
}) {
  const {
    loading,
    syncing,
    refreshAll,
    datePreset,
    setDatePreset,
    dateStart,
    setDateStart,
    dateEnd,
    setDateEnd,
    selectedFiles,
    setSelectedFiles,
    selectedSheets,
    setSelectedSheets,
    pinnedFiles,
    setPinnedFiles,
    pinnedSheets,
    setPinnedSheets,
    activeDocumentFile,
    setActiveDocumentFile,
    documentTree,
    invalidSheetCounts,
  } = dashboard;

  const handleToggleFileSelection = (fileName, currentlyChecked = false) => {
    const { nextFiles, nextSheets } = updateSelectionForFile({
      selectedFiles,
      selectedSheets,
      fileName,
      currentlyChecked,
    });
    setSelectedFiles(nextFiles);
    setSelectedSheets(nextSheets);
  };

  const handleToggleSheetSelection = (sheetName) => {
    if (!activeDocumentFile) return;

    const { nextFiles, nextSheets } = updateSelectionForSheet({
      selectedFiles,
      selectedSheets,
      fileName: activeDocumentFile,
      sheetName,
    });
    setSelectedFiles(nextFiles);
    setSelectedSheets(nextSheets);
  };

  const handleTogglePinnedFile = (fileName) => {
    setPinnedFiles((prev) => togglePinInList(prev, fileName));
  };

  const handleTogglePinnedSheet = (sheetKey) => {
    setPinnedSheets((prev) => togglePinInList(prev, sheetKey));
  };

  const handleClearDocumentSelection = () => {
    setSelectedFiles([]);
    setSelectedSheets([]);
  };

  return (
    <header className="scroll-clarity-layer shrink-0 bg-white/95 border-b border-[#d7e8f6] px-4 md:px-8 py-3 z-[80]">
      <div className="max-w-[1600px] mx-auto flex items-center gap-2 md:gap-3">
        <div className="flex-1 flex items-center gap-2 md:gap-3 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-[#3860be] transition-colors shrink-0"
          >
            <Menu className="w-6 h-6" />
          </button>

          <DateRangeFilterPopover
            openDropdown={openDropdown}
            setOpenDropdown={setOpenDropdown}
            datePreset={datePreset}
            setDatePreset={setDatePreset}
            dateStart={dateStart}
            setDateStart={setDateStart}
            dateEnd={dateEnd}
            setDateEnd={setDateEnd}
          />

          <DocumentFilterPopover
            openDropdown={openDropdown}
            setOpenDropdown={setOpenDropdown}
            documentTree={documentTree}
            selectedFiles={selectedFiles}
            selectedSheets={selectedSheets}
            pinnedFiles={pinnedFiles}
            pinnedSheets={pinnedSheets}
            activeDocumentFile={activeDocumentFile}
            setActiveDocumentFile={setActiveDocumentFile}
            documentFileSearch={documentFileSearch}
            setDocumentFileSearch={setDocumentFileSearch}
            documentSheetSearch={documentSheetSearch}
            setDocumentSheetSearch={setDocumentSheetSearch}
            invalidSheetCounts={invalidSheetCounts}
            onToggleFileSelection={handleToggleFileSelection}
            onToggleSheetSelection={handleToggleSheetSelection}
            onTogglePinnedFile={handleTogglePinnedFile}
            onTogglePinnedSheet={handleTogglePinnedSheet}
            onClearSelection={handleClearDocumentSelection}
          />
        </div>

        <div className="shrink-0 flex items-center gap-4 pl-4 border-l border-[#d7e8f6]">
          <button
            onClick={() => refreshAll({ refreshSnapshot: true })}
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
