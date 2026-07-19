// Main Application Root
// Path: src/App.tsx

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './modules/auth/AuthContext';
import { useAppStore } from './store/appStore';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { PageWrapper } from './components/layout/PageWrapper';
import { ToastContainer } from './components/ui/ToastContainer';
import { QuickAddModals } from './components/layout/QuickAddModals';
import { LoadingBat } from './components/animations/LoadingBat';
import { startReminderEngine, stopReminderEngine } from './lib/reminderEngine';

// Pages
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Onboarding } from './pages/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { DailyTasks } from './pages/DailyTasks';
import { Goals } from './pages/Goals';
import { SideQuests } from './pages/SideQuests';
import { SleepTracker } from './pages/SleepTracker';
import { FinanceTracker } from './pages/FinanceTracker';
import { AIMentor } from './pages/AIMentor';
import { Profile } from './pages/Profile';
import { AdminPanel } from './pages/AdminPanel';
import { NotFound } from './pages/NotFound';

const AppContent: React.FC = () => {
  const { user, loading: authLoading, isInitialized } = useAuth();
  const { profile } = useAppStore();

  // Page Load SVG animation blocker (minimum 1.2s to show Bat drawing)
  const [pageLoading, setPageLoading] = useState(true);

  // Clean URL State Router
  const [currentRoute, setCurrentRoute] = useState(() => window.location.pathname);

  // Floating Quick Add Modals states
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [showFinanceModal, setShowFinanceModal] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Daily Tasks Reminder Background Engine Trigger
  useEffect(() => {
    if (user && profile?.reminder_enabled) {
      startReminderEngine();
    } else {
      stopReminderEngine();
    }
    return () => {
      stopReminderEngine();
    };
  }, [user, profile]);

  // Synchronize history popping (back/forward browser buttons)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Navigate routing helper
  const navigateTo = (path: string) => {
    window.history.pushState(null, '', path);
    setCurrentRoute(path);
  };

  // Keyboard shortcut listeners (T, S, F)
  useEffect(() => {
    // Only bind shortcuts if user is logged in and onboarding is done
    if (!user || (profile && !profile.onboarding_done)) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keypresses inside fields
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.getAttribute('contenteditable') === 'true') {
        return;
      }

      const key = e.key.toUpperCase();
      if (key === 'T') {
        e.preventDefault();
        setShowTaskModal(prev => !prev);
      } else if (key === 'S') {
        e.preventDefault();
        setShowSleepModal(prev => !prev);
      } else if (key === 'F') {
        e.preventDefault();
        setShowFinanceModal(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user, profile]);

  if (pageLoading || authLoading || !isInitialized) {
    return (
      <div className="min-h-screen bg-bat-black flex items-center justify-center">
        <LoadingBat size={160} />
      </div>
    );
  }

  // --- UNAUTHENTICATED ROUTING GATES ---
  if (!user) {
    if (currentRoute === '/signup') {
      return <Signup />;
    }
    // Gated admin routing allows checking credentials even if not signed up to Supabase Client
    if (currentRoute === '/admin') {
      return <AdminPanel />;
    }
    return <Login />;
  }

  // --- FORCE ONBOARDING GATING ---
  if (profile && !profile.onboarding_done) {
    return <Onboarding />;
  }

  // --- AUTHENTICATED ROUTING MAP ---
  let pageContent = <NotFound onNavigate={navigateTo} />;
  let pageTitle = 'Dashboard';

  switch (currentRoute) {
    case '/':
    case '/dashboard':
      pageContent = <Dashboard />;
      pageTitle = 'Dashboard';
      break;
    case '/daily-tasks':
      pageContent = <DailyTasks />;
      pageTitle = 'Daily Habits';
      break;
    case '/goals':
      pageContent = <Goals />;
      pageTitle = 'Goals & Objectives';
      break;
    case '/side-quests':
      pageContent = <SideQuests />;
      pageTitle = 'Daily Journal';
      break;
    case '/sleep':
      pageContent = <SleepTracker />;
      pageTitle = 'Sleep Tracker';
      break;
    case '/finance':
      pageContent = <FinanceTracker onNavigate={navigateTo} />;
      pageTitle = 'Finance Tracker';
      break;
    case '/ai-mentor':
      pageContent = <AIMentor />;
      pageTitle = 'AI Mentor (Alfred)';
      break;
    case '/profile':
      pageContent = <Profile />;
      pageTitle = 'Profile & Settings';
      break;
    case '/admin':
      pageContent = <AdminPanel />;
      pageTitle = 'Admin Panel';
      break;
  }

  return (
    <div className="min-h-screen bg-bat-black text-bat-white">
      {/* Dynamic Shell Wrapper */}
      {currentRoute === '/admin' ? (
        // Render Admin panel as standalone full screen (lost in regular wrapper layout)
        <AdminPanel />
      ) : (
        <PageWrapper 
          currentPath={currentRoute} 
          onNavigate={navigateTo} 
          pageTitle={pageTitle}
        >
          {pageContent}
        </PageWrapper>
      )}

      {/* Floating global elements */}
      <ToastContainer />
      
      <QuickAddModals
        showTask={showTaskModal}
        setShowTask={setShowTaskModal}
        showSleep={showSleepModal}
        setShowSleep={setShowSleepModal}
        showFinance={showFinanceModal}
        setShowFinance={setShowFinanceModal}
      />
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
