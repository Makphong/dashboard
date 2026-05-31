import React from 'react';
import { Sidebar } from '../../components/shared/Sidebar.jsx';
import { FilterBar } from './components/FilterBar.jsx';

export function DashboardLayout({
  dashboard,
  controller,
  children
}) {
  const {
    activeView,
    setActiveView,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
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
  } = controller;

  return (
    <div className="flex h-screen bg-[#fbfdff] font-sans text-slate-900 overflow-hidden">
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        isCollapsed={isSidebarCollapsed}
        toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        setMobileOpen={setIsMobileSidebarOpen}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <FilterBar
          dashboard={dashboard}
          openDropdown={openDropdown}
          setOpenDropdown={setOpenDropdown}
          userSearchText={userSearchText}
          setUserSearchText={setUserSearchText}
          segmentTypeSearchText={segmentTypeSearchText}
          setSegmentTypeSearchText={setSegmentTypeSearchText}
          documentFileSearch={documentFileSearch}
          setDocumentFileSearch={setDocumentFileSearch}
          documentSheetSearch={documentSheetSearch}
          setDocumentSheetSearch={setDocumentSheetSearch}
          onMenuClick={() => setIsMobileSidebarOpen(true)}
        />

        {isMobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-[#17335f]/40 backdrop-blur-sm z-[140] lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          {dashboard.errorMessage && <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">{dashboard.errorMessage}</div>}
          {children}
        </main>
      </div>
    </div>
  );
}
