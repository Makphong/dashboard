import React, { useMemo } from 'react';
import { FileText } from 'lucide-react';
import { FilterPopover } from '../../../../components/shared/FilterPopover.jsx';
import { buildSheetKey } from '../../../../lib/utils.js';
import {
  getDocumentSummary,
  getFilteredDocumentTree,
  getFilteredSheetsForActiveFile,
} from './utils.js';
import { DocumentFileListColumn } from './DocumentFileListColumn.jsx';
import { DocumentSheetListColumn } from './DocumentSheetListColumn.jsx';

export function DocumentFilterPopover({
  openDropdown,
  setOpenDropdown,
  documentTree,
  selectedFiles,
  selectedSheets,
  pinnedFiles,
  pinnedSheets,
  activeDocumentFile,
  setActiveDocumentFile,
  documentFileSearch,
  setDocumentFileSearch,
  documentSheetSearch,
  setDocumentSheetSearch,
  invalidSheetCounts,
  onToggleFileSelection,
  onToggleSheetSelection,
  onTogglePinnedFile,
  onTogglePinnedSheet,
  onClearSelection,
}) {
  const filteredDocumentTree = useMemo(
    () => getFilteredDocumentTree({ documentTree, documentFileSearch, pinnedFiles }),
    [documentTree, documentFileSearch, pinnedFiles],
  );

  const { activeDocumentEntry, filteredSheetsForActiveFile } = useMemo(
    () => getFilteredSheetsForActiveFile({
      documentTree,
      activeDocumentFile,
      documentSheetSearch,
      pinnedSheets,
    }),
    [documentTree, activeDocumentFile, documentSheetSearch, pinnedSheets],
  );

  const selectedFileSet = useMemo(() => new Set(selectedFiles), [selectedFiles]);
  const selectedSheetSet = useMemo(() => new Set(selectedSheets), [selectedSheets]);
  const pinnedFileSet = useMemo(() => new Set(pinnedFiles), [pinnedFiles]);
  const pinnedSheetSet = useMemo(() => new Set(pinnedSheets), [pinnedSheets]);

  const sheetItems = useMemo(
    () => filteredSheetsForActiveFile.map((sheetName) => ({
      name: sheetName,
      key: buildSheetKey(activeDocumentFile, sheetName),
    })),
    [activeDocumentFile, filteredSheetsForActiveFile],
  );

  return (
    <FilterPopover
      id="document-file"
      title="Documents"
      summary={getDocumentSummary(selectedFiles, selectedSheets)}
      openDropdown={openDropdown}
      setOpenDropdown={setOpenDropdown}
      icon={FileText}
      active={selectedFiles.length > 0 || selectedSheets.length > 0}
      minWidthClass="min-w-[240px] max-sm:min-w-0"
      panelClassName="w-[640px] max-w-[92vw]"
    >
      <div className="flex h-[420px] divide-x divide-slate-100">
        <DocumentFileListColumn
          filteredDocumentTree={filteredDocumentTree}
          documentFileSearch={documentFileSearch}
          setDocumentFileSearch={setDocumentFileSearch}
          selectedFileSet={selectedFileSet}
          activeDocumentFile={activeDocumentFile}
          setActiveDocumentFile={setActiveDocumentFile}
          pinnedFileSet={pinnedFileSet}
          onToggleFileSelection={onToggleFileSelection}
          onTogglePin={onTogglePinnedFile}
          onClearSelection={onClearSelection}
        />

        <DocumentSheetListColumn
          activeDocumentEntry={activeDocumentEntry}
          filteredSheetsForActiveFile={sheetItems}
          documentSheetSearch={documentSheetSearch}
          setDocumentSheetSearch={setDocumentSheetSearch}
          selectedSheetSet={selectedSheetSet}
          pinnedSheetSet={pinnedSheetSet}
          invalidSheetCounts={invalidSheetCounts}
          onToggleSheetSelection={onToggleSheetSelection}
          onTogglePin={onTogglePinnedSheet}
        />
      </div>
    </FilterPopover>
  );
}
