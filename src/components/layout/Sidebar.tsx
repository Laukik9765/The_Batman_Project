// Responsive Sidebar Navigation component
// Path: src/components/layout/Sidebar.tsx

import React from 'react';
import { useAuth } from '../../modules/auth/AuthContext';
import { useAppStore } from '../../store/appStore';
import { 
  BatIcon, 
  DailyTasksIcon, 
  SideQuestsIcon, 
  GoalsIcon, 
  SleepIcon, 
  FinanceIcon, 
  AIMentorIcon, 
  UserIcon, 
  LogOutIcon 
} from '../ui/Icons';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentPath, 
  onNavigate, 
  mobileOpen, 
  setMobileOpen 
}) => {
  const { logout } = useAuth();
  const { profile } = useAppStore();

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', Icon: BatIcon },
    { name: 'Daily Habits', path: '/daily-tasks', Icon: DailyTasksIcon },
    { name: 'Goals / Tasks', path: '/goals', Icon: GoalsIcon },
    { name: 'Side Quests', path: '/side-quests', Icon: SideQuestsIcon },
    { name: 'Sleep Tracker', path: '/sleep', Icon: SleepIcon },
    { name: 'Finance Ledger', path: '/finance', Icon: FinanceIcon },
    { name: 'AI Mentor Alfred', path: '/ai-mentor', Icon: AIMentorIcon },
    { name: 'Profile & Export', path: '/profile', Icon: UserIcon }
  ];

  const handleItemClick = (path: string) => {
    onNavigate(path);
    setMobileOpen(false);
  };

  const navClass = (path: string) => {
    const isActive = currentPath === path;
    return `w-full flex items-center gap-3 px-4 py-3 text-sm font-medium tracking-wider uppercase transition-all duration-200 border-l-2 ${
      isActive 
        ? 'bg-bat-surface text-bat-gold border-bat-gold font-bold shadow-[inset_4px_0_15px_rgba(245,197,24,0.05)]' 
        : 'text-bat-gray border-transparent hover:text-bat-white hover:bg-bat-black hover:border-bat-gray'
    }`;
  };

  const content = (
    <div className="flex flex-col h-full bg-bat-dark border-r border-bat-border">
      {/* Brand logo */}
      <button
        type="button"
        onClick={() => handleItemClick('/dashboard')}
        className="flex items-center gap-3 px-6 py-6 border-b border-bat-border w-full text-left hover:bg-bat-black hover:bg-opacity-25 transition-all focus:outline-none focus:ring-1 focus:ring-bat-gold focus:ring-inset"
        aria-label="Go to Dashboard Mainframe"
      >
        <span className="text-bat-gold animate-pulse"><BatIcon size={30} /></span>
        <span className="font-bebas text-2xl tracking-widest text-bat-gold">BATMAN PROJECT</span>
      </button>

      {/* User Quick Info */}
      <div className="px-6 py-4 border-b border-bat-border bg-bat-black bg-opacity-30">
        <div className="text-xs text-bat-gray font-mono uppercase">BATCAVE TELEMETRY</div>
        <div className="text-sm font-bold text-bat-white truncate mt-1">{profile?.full_name || 'Gotham Vigilante'}</div>
        <div className="text-[10px] text-bat-gold font-mono truncate">{profile?.username ? `@${profile.username}` : ''}</div>
      </div>

      {/* Nav Menu Items */}
      <nav className="flex-grow py-4 overflow-y-auto no-scrollbar space-y-1">
        {menuItems.map((item) => (
          <button
            type="button"
            key={item.name}
            onClick={() => handleItemClick(item.path)}
            className={navClass(item.path)}
          >
            <item.Icon size={18} />
            <span>{item.name}</span>
          </button>
        ))}
      </nav>

      {/* Footer Log Out button */}
      <div className="p-4 border-t border-bat-border bg-bat-black bg-opacity-40">
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-bat-border text-bat-gray hover:text-bat-danger hover:border-bat-danger transition-colors font-bebas text-md tracking-wider rounded"
        >
          <LogOutIcon size={18} />
          SECURE SHUTDOWN
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar view */}
      <aside className="hidden md:block w-64 h-screen fixed top-0 left-0 z-20">
        {content}
      </aside>

      {/* Mobile Drawer view overlay */}
      {mobileOpen && (
        <div 
          className="md:hidden fixed inset-0 z-30 bg-black bg-opacity-80 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div 
        className={`md:hidden fixed top-0 left-0 w-64 h-full z-40 transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'transform translate-x-0' : 'transform -translate-x-full'
        }`}
      >
        {content}
      </div>
    </>
  );
};
