import React from 'react';
import {
  Users, Server, Database, User, X, ChevronLeft, ChevronRight, LayoutDashboard
} from 'lucide-react';

const navItemClass = (isActive, isCollapsed) => `flex items-center gap-3 py-2.5 rounded-xl font-semibold transition-colors
  ${isCollapsed ? 'justify-center px-0' : 'px-3'}
  ${isActive ? 'bg-[#e8f7fd] text-[#3860be] border border-[#bfe8f8] shadow-ktb' : 'text-slate-600 hover:bg-[#eef8fd] border border-transparent'}`;

export const Sidebar = ({ isMobileOpen, setMobileOpen, isCollapsed, toggleCollapse, activeView, setActiveView }) => (
  <aside className={`fixed inset-y-0 left-0 z-[150] bg-white border-r border-[#d7e8f6] transform transition-all duration-300 ease-in-out flex flex-col
    ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
    lg:translate-x-0 ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} lg:static`}>

    <button
      onClick={toggleCollapse}
      className="hidden lg:flex absolute -right-3 top-8 w-6 h-6 bg-white border border-[#bfe8f8] rounded-full items-center justify-center text-slate-500 hover:text-[#00a4e4] hover:border-[#00a4e4] shadow-sm z-50 transition-colors"
    >
      {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
    </button>

    <div className={`h-20 flex items-center border-b border-[#d7e8f6] ${isCollapsed ? 'justify-center px-0' : 'px-6'}`}>
      {!isCollapsed ? (
        <div className="text-2xl font-extrabold tracking-tight text-[#17335f] flex items-center gap-2">
          <div className="w-9 h-9 flex-shrink-0 bg-[#00a4e4] rounded-lg flex items-center justify-center text-white text-sm shadow-ktb">KTB</div>
          <span>Analytics</span>
        </div>
      ) : (
        <div className="w-9 h-9 flex-shrink-0 bg-[#00a4e4] rounded-lg flex items-center justify-center text-white text-sm font-extrabold shadow-ktb">KTB</div>
      )}
      <button className="ml-auto lg:hidden" onClick={() => setMobileOpen(false)}>
        <X className="w-5 h-5 text-slate-500" />
      </button>
    </div>

    <div className="p-4 flex-1 overflow-y-auto no-scrollbar">
      {!isCollapsed && <div className="text-xs font-semibold text-[#3860be]/70 uppercase tracking-wider mb-4 px-3">Dashboards</div>}
      <nav className="space-y-2">
        <a href="#" onClick={() => setActiveView('dashboard')} className={navItemClass(activeView === 'dashboard', isCollapsed)} title="Dashboard">
          <LayoutDashboard className={`w-5 h-5 flex-shrink-0 ${activeView === 'dashboard' ? 'text-[#00a4e4]' : ''}`} />
          {!isCollapsed && <span>Dashboard Overview</span>}
        </a>
        {/* <a
          href="#"
          onClick={() => setActiveView('system-performance')}
          className={`flex items-center gap-3 py-2.5 rounded-xl font-semibold transition-colors
          ${isCollapsed ? 'justify-center px-0' : 'px-3'}
          ${activeView === 'system-performance' ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-100/50 shadow-sm' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}
          title="System Performance"
        >
          <Server className={`w-5 h-5 flex-shrink-0 ${activeView === 'system-performance' ? 'text-blue-600' : ''}`} />
          {!isCollapsed && <span>System Performance</span>}
        </a> */}
      </nav>

      {!isCollapsed && <div className="text-xs font-semibold text-[#3860be]/70 uppercase tracking-wider mt-8 mb-4 px-3">Data Management</div>}
      <nav className="space-y-2">
        <a href="#" onClick={() => setActiveView('data-management')} className={navItemClass(activeView === 'data-management', isCollapsed)} title="Data Management">
          <Database className={`w-5 h-5 flex-shrink-0 ${activeView === 'data-management' ? 'text-[#00a4e4]' : ''}`} />
          {!isCollapsed && <span>Data Management</span>}
        </a>
      </nav>
    </div>

    <div className={`p-4 border-t border-[#d7e8f6] ${isCollapsed ? 'flex justify-center' : ''}`}>
      <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : 'px-3'} py-2`}>
        <div className="w-8 h-8 rounded-full bg-[#e8f7fd] flex items-center justify-center overflow-hidden flex-shrink-0">
          <User className="w-5 h-5 text-[#3860be]" />
        </div>
        {!isCollapsed && (
          <div className="overflow-hidden">
            <div className="text-sm font-semibold text-slate-900 truncate">Executive User</div>
            <div className="text-xs text-slate-500 truncate">Operation Lead</div>
          </div>
        )}
      </div>
    </div>
  </aside>
);
