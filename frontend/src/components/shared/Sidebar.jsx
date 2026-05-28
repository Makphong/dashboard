import React, { memo } from 'react';
import {
  Users, Server, Database, User, X, ChevronLeft, ChevronRight, LayoutDashboard
} from 'lucide-react';

const navItemClass = (isActive, isCollapsed) => `flex items-center gap-3 py-2.5 rounded-xl font-semibold transition-all duration-300 group
  ${isCollapsed ? 'px-3.5' : 'px-3'}
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

    {/* Old Text Logo - Saved for future use: 
      <div className="w-9 h-9 flex-shrink-0 bg-[#00a4e4] rounded-lg flex items-center justify-center text-white text-sm font-extrabold shadow-ktb">KTB</div> 
    */}
    <div className={`h-20 shrink-0 flex items-center border-b border-[#d7e8f6] px-6 transition-all duration-300 overflow-hidden ${isCollapsed ? 'justify-center lg:px-0' : 'justify-start'}`}>
      <div className="flex items-center gap-2 min-w-max">
        <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center">
          <img 
            src="https://upload.wikimedia.org/wikipedia/en/f/f0/Krung_Thai_Bank_logo.svg" 
            alt="KTB Logo" 
            className="w-8 h-8 object-contain block"
          />
        </div>
        <span className={`text-2xl font-extrabold tracking-tight text-[#17335f] transition-all duration-300 origin-left ${isCollapsed ? 'opacity-0 w-0 scale-95 translate-x-[-10px] pointer-events-none' : 'opacity-100 w-auto scale-100 translate-x-0'}`}>
          Analytics
        </span>
      </div>
      <button className="ml-auto lg:hidden" onClick={() => setMobileOpen(false)}>
        <X className="w-5 h-5 text-slate-500" />
      </button>
    </div>

    <div className="p-4 flex-1 overflow-y-auto no-scrollbar overflow-x-hidden">
      <div className={`text-xs font-semibold text-[#3860be]/70 uppercase tracking-wider mb-4 px-3 transition-all duration-300 whitespace-nowrap overflow-hidden ${isCollapsed ? 'opacity-0 h-0 mb-0' : 'opacity-100 h-auto'}`}>
        Dashboards
      </div>
      <nav className="space-y-2">
        <a href="#" onClick={() => setActiveView('dashboard')} className={navItemClass(activeView === 'dashboard', isCollapsed)} title="Dashboard">
          <LayoutDashboard className={`w-5 h-5 flex-shrink-0 transition-colors ${activeView === 'dashboard' ? 'text-[#00a4e4]' : ''}`} />
          <span className={`transition-all duration-300 whitespace-nowrap overflow-hidden origin-left ${isCollapsed ? 'opacity-0 w-0 translate-x-[-10px] pointer-events-none' : 'opacity-100 w-auto translate-x-0'}`}>
            Dashboard Overview
          </span>
        </a>
      </nav>

      <div className={`text-xs font-semibold text-[#3860be]/70 uppercase tracking-wider mt-8 mb-4 px-3 transition-all duration-300 whitespace-nowrap overflow-hidden ${isCollapsed ? 'opacity-0 h-0 mt-0 mb-0' : 'opacity-100 h-auto'}`}>
        Data Management
      </div>
      <nav className="space-y-2">
        <a href="#" onClick={() => setActiveView('data-management')} className={navItemClass(activeView === 'data-management', isCollapsed)} title="Data Management">
          <Database className={`w-5 h-5 flex-shrink-0 transition-colors ${activeView === 'data-management' ? 'text-[#00a4e4]' : ''}`} />
          <span className={`transition-all duration-300 whitespace-nowrap overflow-hidden origin-left ${isCollapsed ? 'opacity-0 w-0 translate-x-[-10px] pointer-events-none' : 'opacity-100 w-auto translate-x-0'}`}>
            Data Management
          </span>
        </a>
      </nav>
    </div>

    <div className="p-4 border-t border-[#d7e8f6]">
      <div className={`flex items-center gap-3 px-3 py-2 transition-all duration-300 ${isCollapsed ? 'justify-center lg:px-0' : 'justify-start'}`}>
        <div className="w-8 h-8 rounded-full bg-[#e8f7fd] flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm border border-[#bfe8f8]">
          <User className="w-5 h-5 text-[#3860be]" />
        </div>
        <div className={`transition-all duration-300 whitespace-nowrap overflow-hidden origin-left ${isCollapsed ? 'opacity-0 w-0 translate-x-[-10px] pointer-events-none' : 'opacity-100 w-auto translate-x-0'}`}>
          <div className="text-sm font-semibold text-slate-900 truncate">Executive User</div>
          <div className="text-xs text-slate-500 truncate">Operation Lead</div>
        </div>
      </div>
    </div>
  </aside>
));
