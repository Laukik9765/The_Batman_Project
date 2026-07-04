// Main Layout wrapper containing Sidebar and Topbar
// Path: src/components/layout/PageWrapper.tsx

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { PageTransition } from '../animations/PageTransition';

interface PageWrapperProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
  pageTitle: string;
}

export const PageWrapper: React.FC<PageWrapperProps> = ({ 
  children, 
  currentPath, 
  onNavigate, 
  pageTitle 
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-height-100vh flex bg-bat-black text-bat-white">
      {/* Sidebar - Desktop fixed, Mobile drawer */}
      <Sidebar 
        currentPath={currentPath} 
        onNavigate={onNavigate} 
        mobileOpen={mobileOpen} 
        setMobileOpen={setMobileOpen} 
      />

      {/* Main content grid */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0">
        <Topbar 
          pageTitle={pageTitle} 
          onMenuToggle={() => setMobileOpen(!mobileOpen)} 
          onNavigate={onNavigate}
        />
        
        <main className="flex-1 flex flex-col p-6 relative">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  );
};
