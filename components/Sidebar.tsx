import React, { useContext, useState } from 'react';
import { View } from '../types';
import { Icons } from '../constants';
import { ThemeContext } from '../App';

interface SidebarProps {
  currentView: View;
  onChangeView: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const NavItem = ({ view, label, Icon }: { view: View; label: string; Icon: React.FC }) => {
    const isActive = currentView === view;
    return (
      <button
        onClick={() => onChangeView(view)}
        className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
          isActive
            ? 'bg-gray-100 dark:bg-white/10 text-blue-600 dark:text-white shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200'
        } ${isCollapsed ? 'justify-center' : ''}`}
        title={isCollapsed ? label : undefined}
      >
        <div className={`${isActive ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} transition-colors`}>
          <Icon />
        </div>
        {!isCollapsed && label}
      </button>
    );
  };

  const MobileNavItem = ({ view, label, Icon }: { view: View; label: string; Icon: React.FC }) => {
    const isActive = currentView === view;
    return (
      <button
        onClick={() => onChangeView(view)}
        className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 ${
          isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
        }`}
      >
        <div className="mb-1">
          <Icon />
        </div>
        <span className="text-[10px] font-medium">{label}</span>
      </button>
    );
  };

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile) */}
      <div 
        className={`hidden md:flex ${isCollapsed ? 'w-20' : 'w-64'} flex-shrink-0 bg-white dark:bg-[#121212] border-r border-gray-200 dark:border-white/5 flex-col h-full pt-6 pb-4 px-4 transition-all duration-300 ease-in-out`}
      >
        <div className={`mb-8 ${isCollapsed ? 'flex justify-center' : 'px-2'}`}>
          <div className={`flex items-center gap-2 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
               <svg className="text-white w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden whitespace-nowrap">
                <h1 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                  Prompt Studio
                </h1>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Pro Engineering</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem view="debug" label="Create" Icon={Icons.PenTool} />
          <NavItem view="manage" label="Library" Icon={Icons.Library} />
          <NavItem view="providers" label="Providers" Icon={Icons.Server} />
          <NavItem view="settings" label="Settings" Icon={Icons.Settings} />
        </nav>

        <div className="mt-auto flex flex-col gap-4">
          <button
             onClick={() => setIsCollapsed(!isCollapsed)}
             className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-start px-3'} py-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors`}
             title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
             {isCollapsed ? <Icons.PanelLeftOpen /> : <Icons.PanelLeftClose />}
             {!isCollapsed && <span className="ml-3 text-xs font-medium">Collapse</span>}
          </button>

          <div className={`${!isCollapsed ? 'px-2 pb-4' : 'pb-4 flex justify-center'}`}>
            <button 
              onClick={toggleTheme}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-3'} py-2 text-sm font-medium rounded-lg bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors`}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isCollapsed ? (
                 <div className="flex flex-col items-center gap-2">
                   {theme === 'dark' ? <Icons.Moon /> : <Icons.Sun />}
                 </div>
              ) : (
                <>
                  <span className="flex items-center gap-2">
                    {theme === 'dark' ? <Icons.Moon /> : <Icons.Sun />}
                    {theme === 'dark' ? 'Dark' : 'Light'}
                  </span>
                  <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </>
              )}
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <div className="px-2 pt-4 border-t border-gray-100 dark:border-white/5">
            <div className="text-[10px] text-gray-400 dark:text-gray-600 font-medium text-center flex flex-col gap-0.5">
              <span>Zeknes</span>
              <span className="opacity-70">zeknes@163.com</span>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation (visible on mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-[#121212] border-t border-gray-200 dark:border-white/5 flex items-center justify-around z-40 px-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <MobileNavItem view="debug" label="Create" Icon={Icons.PenTool} />
        <MobileNavItem view="manage" label="Library" Icon={Icons.Library} />
        <MobileNavItem view="providers" label="Providers" Icon={Icons.Server} />
        <MobileNavItem view="settings" label="Settings" Icon={Icons.Settings} />
      </div>
    </>
  );
};

export default Sidebar;