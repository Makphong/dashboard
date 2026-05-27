import React from 'react';
import {
  Users, Server, Database, User, X, ChevronLeft, ChevronRight, LayoutDashboard
} from 'lucide-react';

export const Sidebar = ({ isMobileOpen, setMobileOpen, isCollapsed, toggleCollapse, activeView, setActiveView }) => (
  <aside className={`fixed inset-y-0 left-0 z-[150] bg-white border-r border-slate-200 transform transition-all duration-300 ease-in-out flex flex-col
    ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
    lg:translate-x-0 ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} lg:static`}>

    <button
      onClick={toggleCollapse}
      className="hidden lg:flex absolute -right-3 top-8 w-6 h-6 bg-white border border-slate-200 rounded-full items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-300 shadow-sm z-50 transition-colors"
    >
      {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
    </button>

    <div className={`h-20 flex items-center border-b border-slate-100 ${isCollapsed ? 'justify-center px-0' : 'px-6'}`}>
      {!isCollapsed ? (
        <div className="text-2xl font-extrabold tracking-tighter text-slate-900 flex items-center gap-2">
          <div className="w-8 h-8 flex-shrink-0 bg-blue-600 rounded flex items-center justify-center text-white text-sm">KTB</div>
          Analytics
        </div>
      ) : (
        <div className="w-8 h-8 flex-shrink-0 bg-blue-600 rounded flex items-center justify-center text-white text-sm font-extrabold">KTB</div>
      )}
      <button className="ml-auto lg:hidden" onClick={() => setMobileOpen(false)}>
        <X className="w-5 h-5 text-slate-500" />
      </button>
    </div>

    <div className="p-4 flex-1 overflow-y-auto no-scrollbar">
      {!isCollapsed && <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-3">Dashboards</div>}
      <nav className="space-y-2">
        <a href="#" onClick={() => setActiveView('dashboard')} className={`flex items-center gap-3 py-2.5 rounded-xl font-semibold transition-colors
          ${isCollapsed ? 'justify-center px-0' : 'px-3'}
          ${activeView === 'dashboard' ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-100/50 shadow-sm' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`} title="Dashboard">
          <LayoutDashboard className={`w-5 h-5 flex-shrink-0 ${activeView === 'dashboard' ? 'text-blue-600' : ''}`} />
          {!isCollapsed && <span>Dashboard Overview</span>}
        </a>
        <a
          href="#"
          onClick={() => setActiveView('system-performance')}
          className={`flex items-center gap-3 py-2.5 rounded-xl font-semibold transition-colors
          ${isCollapsed ? 'justify-center px-0' : 'px-3'}
          ${activeView === 'system-performance' ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-100/50 shadow-sm' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}
          title="System Performance"
        >
          <Server className={`w-5 h-5 flex-shrink-0 ${activeView === 'system-performance' ? 'text-blue-600' : ''}`} />
          {!isCollapsed && <span>System Performance</span>}
        </a>
      </nav>

      {!isCollapsed && <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-8 mb-4 px-3">Data Management</div>}
      <nav className="space-y-2">
        <a href="#" onClick={() => setActiveView('data-management')} className={`flex items-center gap-3 py-2.5 rounded-xl font-semibold transition-colors
          ${isCollapsed ? 'justify-center px-0' : 'px-3'}
          ${activeView === 'data-management' ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-100/50 shadow-sm' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`} title="Data Management">
          <Database className={`w-5 h-5 flex-shrink-0 ${activeView === 'data-management' ? 'text-blue-600' : ''}`} />
          {!isCollapsed && <span>Data Management</span>}
        </a>
      </nav>
    </div>

    <div className={`p-4 border-t border-slate-100 ${isCollapsed ? 'flex justify-center' : ''}`}>
      <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : 'px-3'} py-2`}>
        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
          <User className="w-5 h-5 text-slate-500" />
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
