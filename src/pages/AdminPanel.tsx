// Admin Panel with Credential Gating, Stats, and User controls
// Path: src/pages/AdminPanel.tsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../modules/auth/AuthContext';
import { useAppStore } from '../store/appStore';
import { 
  ShieldIcon, 
  XIcon, 
  TrashIcon,
  WarningIcon,
  CheckIcon,
  UserIcon,
  DailyTasksIcon,
  GoalsIcon,
  SleepIcon,
  FinanceIcon,
  AIMentorIcon
} from '../components/ui/Icons';
import { motion, AnimatePresence } from 'framer-motion';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

const BAT_COLORS = ['#F5C518', '#C49A10', '#E8E8F0', '#8888A0', '#4080E8', '#40C870', '#E84040'];

export const AdminPanel: React.FC = () => {
  const { adminToken, adminUsername, adminLogin, adminLogout } = useAuth();
  const { addToast } = useAppStore();

  // Login form state
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);

  // Admin Panel views
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Platform stats state
  const [platformStats, setPlatformStats] = useState<any | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Drill down state
  const [drillDownUser, setDrillDownUser] = useState<any | null>(null);
  const [drillDownData, setDrillDownData] = useState<any | null>(null);
  const [loadingDrillDown, setLoadingDrillDown] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput || !passwordInput) return;
    
    setAuthenticating(true);
    setLoginError(null);
    
    const { success, error } = await adminLogin(usernameInput, passwordInput);
    
    setAuthenticating(false);
    if (!success) {
      setLoginError(error || 'Invalid credentials');
    }
  };

  // Fetch all users list and platform stats when token is set
  const fetchAdminDashboard = async () => {
    if (!adminToken) return;
    setLoadingUsers(true);
    setLoadingStats(true);

    try {
      // 1. Fetch Users List
      const usersRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ action: 'getUserList' })
      });

      const usersResult = await usersRes.json();
      if (usersRes.ok && usersResult.data) {
        setUsers(usersResult.data);
        setFilteredUsers(usersResult.data);
      } else {
        throw new Error(usersResult.error || 'Failed to retrieve user indexes');
      }

      // 2. Fetch Platform Stats
      const statsRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ action: 'getPlatformStats' })
      });

      const statsResult = await statsRes.json();
      if (statsRes.ok && statsResult.data) {
        setPlatformStats(statsResult.data);
      } else {
        throw new Error(statsResult.error || 'Failed to retrieve stats');
      }

    } catch (e: any) {
      console.error(e);
      addToast(e.message || 'Mainframe data fetch aborted.', 'danger');
    } finally {
      setLoadingUsers(false);
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (adminToken) {
      fetchAdminDashboard();
    }
  }, [adminToken]);

  // Handle Search Filtering
  useEffect(() => {
    const lowerQuery = searchQuery.toLowerCase();
    const filtered = users.filter(u => 
      u.username.toLowerCase().includes(lowerQuery) || 
      u.email.toLowerCase().includes(lowerQuery)
    );
    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [searchQuery, users]);

  // Handle Table Sorting
  const sortData = (field: string) => {
    const isAsc = sortField === field ? !sortAsc : false;
    setSortField(field);
    setSortAsc(isAsc);

    const sorted = [...filteredUsers].sort((a, b) => {
      let valA = a[field];
      let valB = b[field];

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return isAsc ? -1 : 1;
      if (valA > valB) return isAsc ? 1 : -1;
      return 0;
    });

    setFilteredUsers(sorted);
  };

  // Fetch Drill-down detail data for a user
  const handleUserDrillDown = async (user: any) => {
    setDrillDownUser(user);
    setLoadingDrillDown(true);
    setDrillDownData(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ 
          action: 'getUserDrillDown',
          params: { targetUserId: user.id }
        })
      });

      const result = await response.json();
      if (response.ok && result.data) {
        setDrillDownData(result.data);
      } else {
        throw new Error(result.error || 'Failed to retrieve drill-down context');
      }
    } catch (e: any) {
      console.error(e);
      addToast(e.message || 'Drill down query failed.', 'danger');
      setDrillDownUser(null);
    } finally {
      setLoadingDrillDown(false);
    }
  };

  // Admin Account Actions
  const runUserAction = async (action: string, targetUserId: string, confirmMsg?: string) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ 
          action,
          params: { targetUserId }
        })
      });

      const result = await response.json();
      if (response.ok) {
        addToast(`Protocol '${action}' executed successfully.`, 'success');
        // Refresh index
        fetchAdminDashboard();
        // If drilling down, refresh that view too or close
        setDrillDownUser(null);
      } else {
        throw new Error(result.error || 'Action failed');
      }
    } catch (e: any) {
      console.error(e);
      addToast(e.message || 'Failed to run control action.', 'danger');
    }
  };

  // Pagination Math
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  // Return Standalone Login Screen if not authorized
  if (!adminToken) {
    return (
      <div className="min-height-100vh flex flex-col justify-center items-center py-12 px-4 bg-bat-black relative text-bat-white">
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(20,20,30,0.3)_0%,rgba(10,10,15,1)_90%)]" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm relative z-10 bat-glass p-8 rounded shadow-[0_10px_35px_rgba(0,0,0,0.9)] border border-bat-border text-center bat-glow-gold"
        >
          <div className="text-bat-gold mb-3 flex justify-center">
            <ShieldIcon size={48} className="animate-pulse" />
          </div>
          <h1 className="font-bebas text-3xl text-bat-gold tracking-widest uppercase mb-1">
            SECURE ACCESS GATEWAY
          </h1>
          <p className="text-[10px] text-bat-gray font-mono uppercase tracking-wider mb-6">
            ADMINISTRATOR VERIFICATION ONLY
          </p>

          {loginError && (
            <div className="p-3 bg-bat-danger bg-opacity-10 border border-bat-danger text-bat-danger text-xs rounded mb-4 font-mono">
              {loginError.toUpperCase()}
            </div>
          )}

          <form onSubmit={handleAdminSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-[9px] font-bold text-bat-gray uppercase tracking-widest mb-1 font-mono">
                Admin Username
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full px-4 py-2.5 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-xs font-mono"
                placeholder="USERNAME"
                required
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold text-bat-gray uppercase tracking-widest mb-1 font-mono">
                Verification Password
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-4 py-2.5 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-xs font-mono"
                placeholder="PASSWORD"
                required
              />
            </div>

            <button
              type="submit"
              disabled={authenticating}
              className="w-full py-2.5 bg-bat-gold hover:bg-bat-gold-dim text-bat-black font-bebas text-md tracking-widest rounded transition-colors"
            >
              {authenticating ? 'VERIFYING SECURITY BEACON...' : 'AUTHENTICATE MAINBOARD'}
            </button>
          </form>

          <a href="/dashboard" className="text-xs text-bat-gray hover:underline mt-6 inline-block font-mono">
            RETURN TO CITIZEN INTERFACE
          </a>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-height-100vh bg-bat-black text-bat-white font-mono text-xs">
      
      {/* Header bar */}
      <header className="flex flex-col sm:flex-row justify-between items-center px-6 sticky top-0 z-30 bg-bat-dark border-b border-bat-border h-auto py-3 sm:py-0 sm:h-16 gap-3">
        <div className="flex items-center gap-3">
          <span className="text-bat-gold"><ShieldIcon size={24} /></span>
          <span className="font-bebas text-2xl tracking-widest text-bat-gold uppercase">GOTHAM CENTRAL MAINFRAME</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-bat-gray font-bold">OPERATOR: {adminUsername?.toUpperCase()}</span>
          <button 
            onClick={adminLogout} 
            className="border border-bat-border text-bat-gray hover:text-bat-danger hover:border-bat-danger px-3 py-1.5 rounded transition-colors font-bebas tracking-wide"
          >
            DISCONNECT
          </button>
        </div>
      </header>

      {/* Main layout wrapper */}
      <div className="p-6 space-y-6">
        
        {/* Platform stats row */}
        {platformStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bat-glass p-4 rounded">
              <span className="text-bat-gray text-[9px] uppercase">REGISTERED CITIZENS</span>
              <div className="font-bebas text-3xl text-bat-white tracking-wider mt-1">{platformStats.totalUsers}</div>
            </div>
            
            <div className="bat-glass p-4 rounded">
              <span className="text-bat-gray text-[9px] uppercase">ACTIVE CITIZENS (30D)</span>
              <div className="font-bebas text-3xl text-bat-gold tracking-wider mt-1">{platformStats.activeUsers30d}</div>
            </div>

            <div className="bat-glass p-4 rounded">
              <span className="text-bat-gray text-[9px] uppercase">PLATFORM GOAL RETENTION</span>
              <div className="font-bebas text-3xl text-bat-success tracking-wider mt-1">{platformStats.avgCompletionRate}%</div>
            </div>

            <div className="bat-glass p-4 rounded flex items-center justify-between">
              <span className="text-bat-gray text-[9px] uppercase">MAINFRAME STATUS</span>
              <span className="px-2 py-0.5 bg-bat-success text-black rounded font-bold">ONLINE</span>
            </div>
          </div>
        )}

        {/* Dynamic analytics graph panels */}
        {platformStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bat-glass p-5 rounded">
              <h3 className="font-bebas text-lg text-bat-gold tracking-wide mb-4">MODULE UTILIZATION RATINGS</h3>
              <div className="w-full h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={platformStats.featureUsage} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#8888A0" fontSize={8} />
                    <YAxis stroke="#8888A0" fontSize={8} />
                    <Tooltip contentStyle={{ backgroundColor: '#12121A', borderColor: '#2A2A3A' }} />
                    <Bar dataKey="count" fill="#F5C518" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bat-glass p-5 rounded">
              <h3 className="font-bebas text-lg text-bat-gold tracking-wide mb-4">CITIZENS RECRUITMENT LOG (30D)</h3>
              <div className="w-full h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={platformStats.newSignups} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <XAxis dataKey="date" stroke="#8888A0" fontSize={8} />
                    <YAxis stroke="#8888A0" fontSize={8} />
                    <Tooltip contentStyle={{ backgroundColor: '#12121A', borderColor: '#2A2A3A' }} />
                    <Line type="monotone" dataKey="count" stroke="#4080E8" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* User Index list */}
        <div className="bat-glass p-6 rounded">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="font-bebas text-xl text-bat-gold tracking-wider">CITIZEN PROTOCOL DATABASE</h3>
            <input
              type="text"
              placeholder="SEARCH BY CODENAME OR EMAIL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-xs w-full max-w-sm"
            />
          </div>

          {loadingUsers ? (
            <div className="text-center py-12 text-bat-gray font-mono uppercase">SCANNING DATABASE FILES...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-bat-border text-bat-gray text-[10px] font-bold uppercase tracking-widest bg-bat-black">
                    <th className="p-3 cursor-pointer select-none" onClick={() => sortData('username')}>Codename</th>
                    <th className="p-3 cursor-pointer select-none hidden sm:table-cell" onClick={() => sortData('email')}>Email</th>
                    <th className="p-3 cursor-pointer select-none hidden md:table-cell" onClick={() => sortData('created_at')}>Signup Date</th>
                    <th className="p-3 cursor-pointer select-none hidden md:table-cell" onClick={() => sortData('total_tasks')}>Habits</th>
                    <th className="p-3 cursor-pointer select-none" onClick={() => sortData('avg_completion')}>Completion %</th>
                    <th className="p-3 cursor-pointer select-none hidden sm:table-cell" onClick={() => sortData('current_streak')}>Streak</th>
                    <th className="p-3 cursor-pointer select-none hidden md:table-cell" onClick={() => sortData('active_goals')}>Goals</th>
                    <th className="p-3 cursor-pointer select-none hidden md:table-cell" onClick={() => sortData('sleep_avg')}>Sleep Avg (7d)</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bat-border">
                  {currentItems.map((u) => (
                    <tr 
                      key={u.id} 
                      className={`hover:bg-bat-surface transition-colors cursor-pointer ${u.is_suspended ? 'bg-red-950 bg-opacity-10' : ''}`}
                      onClick={() => handleUserDrillDown(u)}
                    >
                      <td className="p-3 font-semibold text-bat-white">
                        {u.username} {u.role === 'admin' && <span className="text-[8px] bg-bat-gold text-black px-1.5 py-0.5 rounded font-bold ml-1.5">ADMIN</span>}
                      </td>
                      <td className="p-3 text-bat-gray hidden sm:table-cell">{u.email}</td>
                      <td className="p-3 text-bat-gray hidden md:table-cell">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="p-3 text-bat-white hidden md:table-cell">{u.total_tasks}</td>
                      <td className="p-3 text-bat-gold font-bold">{u.avg_completion}%</td>
                      <td className="p-3 text-bat-white hidden sm:table-cell">{u.current_streak}</td>
                      <td className="p-3 text-bat-white hidden md:table-cell">{u.active_goals}</td>
                      <td className="p-3 text-bat-white hidden md:table-cell">{u.sleep_avg}h</td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <button
                            onClick={() => runUserAction(u.is_suspended ? 'reactivateUser' : 'suspendUser', u.id)}
                            className={`px-2 py-1 rounded text-[9px] font-bold border ${
                              u.is_suspended 
                                ? 'border-bat-success text-bat-success hover:bg-bat-success hover:text-black' 
                                : 'border-bat-danger text-bat-danger hover:bg-bat-danger hover:text-white'
                            }`}
                          >
                            {u.is_suspended ? 'ACTIVATE' : 'SUSPEND'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-bat-border font-mono text-[10px]">
              <span className="text-bat-gray">SHOWING {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredUsers.length)} OF {filteredUsers.length} CITIZENS</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-bat-dark border border-bat-border hover:border-bat-gold disabled:opacity-30 rounded text-bat-white"
                >
                  PREV
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-bat-dark border border-bat-border hover:border-bat-gold disabled:opacity-30 rounded text-bat-white"
                >
                  NEXT
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Drill Down Detail Modal overlay */}
      <AnimatePresence>
        {drillDownUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black bg-opacity-70 backdrop-blur-sm">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-bat-dark border-l border-bat-border w-full max-w-2xl h-screen overflow-y-auto no-scrollbar shadow-[0_0_50px_rgba(0,0,0,0.9)] p-6 space-y-6 relative"
            >
              {/* Close Button */}
              <button 
                onClick={() => setDrillDownUser(null)} 
                className="absolute right-6 top-6 text-bat-gray hover:text-bat-white"
              >
                <XIcon size={20} />
              </button>

              <div className="pt-6 border-b border-bat-border pb-4">
                <span className="text-[10px] text-bat-gold uppercase tracking-wider block">CITIZEN DOSSIER DETAILED BRIEFING</span>
                <h2 className="font-bebas text-3xl text-bat-white mt-1">@{drillDownUser.username.toUpperCase()}</h2>
                <p className="text-xs text-bat-gray mt-0.5">{drillDownUser.email}</p>
              </div>

              {loadingDrillDown ? (
                <div className="py-24 text-center text-bat-gray uppercase">EXTRACTING PERSONAL ARCHIVES...</div>
              ) : (
                drillDownData && (
                  <div className="space-y-6">
                    {/* User controls row */}
                    <div className="p-4 bg-bat-black border border-bat-border rounded flex flex-wrap gap-2 justify-between items-center">
                      <div className="flex gap-2">
                        <button
                          onClick={() => runUserAction(drillDownData.profile.is_suspended ? 'reactivateUser' : 'suspendUser', drillDownUser.id)}
                          className={`px-3 py-1.5 rounded font-bold border text-[10px] ${
                            drillDownData.profile.is_suspended 
                              ? 'border-bat-success text-bat-success hover:bg-bat-success hover:text-black' 
                              : 'border-bat-danger text-bat-danger hover:bg-bat-danger hover:text-white'
                          }`}
                        >
                          {drillDownData.profile.is_suspended ? 'REACTIVATE ACCOUNT' : 'SUSPEND CITIZEN'}
                        </button>
                        
                        <button
                          onClick={() => runUserAction('resetPassword', drillDownUser.id, 'Send password recovery link to this user?')}
                          className="px-3 py-1.5 border border-bat-border text-bat-gold hover:border-bat-gold rounded text-[10px] font-bold"
                        >
                          RESET PASSWORD
                        </button>

                        {drillDownUser.role !== 'admin' && (
                          <button
                            onClick={() => runUserAction('promoteToAdmin', drillDownUser.id, 'Promote this user to administrator?')}
                            className="px-3 py-1.5 border border-bat-gold text-bat-gold hover:bg-bat-gold hover:text-black rounded text-[10px] font-bold"
                          >
                            PROMOTE TO ADMIN
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => runUserAction('deleteUser', drillDownUser.id, 'CRITICAL: Hard delete account? This will wipe all user files irreversibly.')}
                        className="px-3 py-1.5 bg-bat-danger hover:bg-opacity-95 text-white rounded font-bold text-[10px]"
                      >
                        WIPE & PURGE USER
                      </button>
                    </div>

                    {/* Quick overview metric details */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 bg-bat-black border border-bat-border rounded">
                        <span className="text-bat-gray text-[9px] uppercase">ALFRED TRANSMISSIONS</span>
                        <div className="text-xl font-bold text-bat-white mt-1">{drillDownData.aiChatCount}</div>
                      </div>
                      
                      <div className="p-3 bg-bat-black border border-bat-border rounded">
                        <span className="text-bat-gray text-[9px] uppercase">INCIDENT CATEGORIES</span>
                        <div className="text-xl font-bold text-bat-white mt-1">
                          {(Object.values(drillDownData.failureStats) as number[]).reduce((s: number, c: number) => s + c, 0)}
                        </div>
                      </div>

                      <div className="p-3 bg-bat-black border border-bat-border rounded">
                        <span className="text-bat-gray text-[9px] uppercase">ACCOUNT STATUS</span>
                        <div className={`text-xl font-bold mt-1 ${drillDownData.profile.is_suspended ? 'text-bat-danger' : 'text-bat-success'}`}>
                          {drillDownData.profile.is_suspended ? 'SUSPENDED' : 'OPERATIONAL'}
                        </div>
                      </div>
                    </div>

                    {/* Sleep telemetry graph view */}
                    <div className="bat-glass p-4 rounded">
                      <h3 className="font-bebas text-md text-bat-gold tracking-wider mb-3">RECUPERATION TELEMETRY (30 DAYS)</h3>
                      {drillDownData.sleepLogs.length === 0 ? (
                        <div className="text-center py-6 text-bat-gray uppercase text-[10px]">NO TELEMETRY RECORDED</div>
                      ) : (
                        <div className="w-full h-36">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={drillDownData.sleepLogs.reverse()}>
                              <XAxis dataKey="date" stroke="#8888A0" fontSize={8} />
                              <YAxis stroke="#8888A0" fontSize={8} />
                              <Line type="monotone" dataKey="duration_hours" stroke="#F5C518" dot={false} strokeWidth={2} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    {/* Finance breakdown details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div className="bat-glass p-4 rounded flex flex-col justify-between">
                        <div>
                          <h3 className="font-bebas text-md text-bat-gold tracking-wider mb-2">FINANCIAL FLOW BALANCE</h3>
                          <div className="space-y-1 font-mono text-[10px]">
                            <div className="flex justify-between"><span>TOTAL DEPOSITS:</span><span className="text-bat-success">₹{drillDownData.financeSummary.income.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span>TOTAL DEBITS:</span><span className="text-bat-danger">₹{drillDownData.financeSummary.expense.toFixed(2)}</span></div>
                          </div>
                        </div>
                        <div className="mt-4 border-t border-bat-border pt-2 flex justify-between">
                          <span>NET BALANCE:</span>
                          <span className={drillDownData.financeSummary.income - drillDownData.financeSummary.expense >= 0 ? 'text-bat-success' : 'text-bat-danger'}>
                            ₹{(drillDownData.financeSummary.income - drillDownData.financeSummary.expense).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="bat-glass p-4 rounded flex flex-col items-center justify-center">
                        <h3 className="font-bebas text-md text-bat-gold tracking-wider mb-2 self-start">EXPENSE CATEGORIES</h3>
                        {drillDownData.financeSummary.categoryBreakdown.length === 0 ? (
                          <div className="text-center py-6 text-bat-gray uppercase text-[10px]">NO EXPENSES</div>
                        ) : (
                          <div className="w-full h-28">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={drillDownData.financeSummary.categoryBreakdown} cx="50%" cy="50%" outerRadius={30} dataKey="value">
                                  {drillDownData.financeSummary.categoryBreakdown.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={BAT_COLORS[index % BAT_COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Active Goals list progress details */}
                    <div className="bat-glass p-4 rounded">
                      <h3 className="font-bebas text-md text-bat-gold tracking-wider mb-3">CITIZEN GOAL PARAMETERS</h3>
                      {drillDownData.goals.length === 0 ? (
                        <div className="text-center py-6 text-bat-gray uppercase text-[10px]">NO ACTIVE OBJECTIVES LOGGED</div>
                      ) : (
                        <div className="space-y-3">
                          {drillDownData.goals.map((g: any) => (
                            <div key={g.id} className="p-3 bg-bat-black border border-bat-border rounded">
                              <div className="flex justify-between font-bold text-bat-white">
                                <span>{g.name}</span>
                                <span>{g.progress}%</span>
                              </div>
                              <div className="w-full h-1 bg-bat-dark rounded-full overflow-hidden mt-2">
                                <div className="h-full bg-bat-gold" style={{ width: `${g.progress}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                )
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
