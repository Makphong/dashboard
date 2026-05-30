import React, { memo } from 'react';
import {
  Users, Server, Database, User, X, ChevronLeft, ChevronRight, LayoutDashboard
} from 'lucide-react';

const navItemClass = (isActive, isCollapsed) => `flex items-center rounded-xl font-semibold transition-all duration-300 group
  ${isCollapsed ? 'justify-center px-2 py-3' : 'justify-start px-3 py-2.5 gap-3'}
  ${isActive ? 'bg-[#e8f7fd] text-[#3860be] border border-[#bfe8f8] shadow-ktb' : 'text-slate-600 hover:bg-[#eef8fd] border border-transparent'}`;

export const Sidebar = React.memo(({ isMobileOpen, setMobileOpen, isCollapsed, toggleCollapse, activeView, setActiveView }) => (
  <aside className={`fixed inset-y-0 left-0 z-[150] bg-white border-r border-[#d7e8f6] transition-all duration-300 ease-in-out flex flex-col
    ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
    lg:translate-x-0 ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} lg:static`}>

    <button
      onClick={toggleCollapse}
      className="hidden lg:flex absolute -right-3 top-8 w-6 h-6 bg-white border border-[#bfe8f8] rounded-full items-center justify-center text-slate-500 hover:text-[#00a4e4] hover:border-[#00a4e4] shadow-sm z-50 transition-colors"
    >
      {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
    </button>

    <div className={`h-20 shrink-0 flex items-center border-b border-[#d7e8f6] px-6 transition-all duration-300 overflow-hidden ${isCollapsed ? 'justify-center lg:px-0' : 'justify-start'}`}>
      <div className="flex items-center gap-2 min-w-max">
        <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center">
          <img 
            src="https://upload.wikimedia.org/wikipedia/en/f/f0/Krung_Thai_Bank_logo.svg" 
            alt="KTB Logo" 
            className="w-8 h-8 object-contain block"
          />
        </div>
        {!isCollapsed && (
          <span className="text-2xl font-extrabold tracking-tight text-[#17335f] transition-opacity duration-300 opacity-100">
            Analytics
          </span>
        )}
      </div>
      <button className="ml-auto lg:hidden" onClick={() => setMobileOpen(false)}>
        <X className="w-5 h-5 text-slate-500" />
      </button>
    </div>

    <div className="p-4 flex-1 overflow-y-auto no-scrollbar overflow-x-hidden">
      <div className={`text-[10px] font-bold text-[#3860be]/70 uppercase tracking-widest transition-all duration-300 overflow-hidden
        ${isCollapsed ? 'max-h-0 opacity-0 mb-0 pointer-events-none' : 'max-h-10 opacity-100 mb-4 px-3'}`}>
        Dashboards
      </div>
      <nav className="space-y-1">
        <a href="#" onClick={(e) => { e.preventDefault(); setActiveView('dashboard'); }} className={navItemClass(activeView === 'dashboard', isCollapsed)} title="Dashboard Overview">
          <LayoutDashboard className={`w-5 h-5 flex-shrink-0 transition-colors ${activeView === 'dashboard' ? 'text-[#00a4e4]' : ''}`} />
          {!isCollapsed && (
            <span className="transition-opacity duration-300 whitespace-nowrap overflow-hidden opacity-100">
              Dashboard Overview
            </span>
          )}
        </a>
      </nav>

      <div className={`text-[10px] font-bold text-[#3860be]/70 uppercase tracking-widest transition-all duration-300 overflow-hidden
        ${isCollapsed ? 'max-h-0 opacity-0 mt-0 mb-0 pointer-events-none' : 'max-h-10 opacity-100 mt-8 mb-4 px-3'}`}>
        Data Management
      </div>
      <nav className="space-y-1">
        <a href="#" onClick={(e) => { e.preventDefault(); setActiveView('data-management'); }} className={navItemClass(activeView === 'data-management', isCollapsed)} title="Data Management">
          <Database className={`w-5 h-5 flex-shrink-0 transition-colors ${activeView === 'data-management' ? 'text-[#00a4e4]' : ''}`} />
          {!isCollapsed && (
            <span className="transition-opacity duration-300 whitespace-nowrap overflow-hidden opacity-100">
              Data Management
            </span>
          )}
        </a>
      </nav>
    </div>

  </aside>
));
