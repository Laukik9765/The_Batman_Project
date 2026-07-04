// Authentication Context provider for Supabase and Admin roles
// Path: src/modules/auth/AuthContext.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store/appStore';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  adminToken: string | null;
  adminUsername: string | null;
  loading: boolean;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<{ error: any }>;
  signup: (email: string, password: string, username: string, fullName: string) => Promise<{ error: any; needsVerification: boolean }>;
  logout: () => Promise<void>;
  adminLogin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  adminLogout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminUsername, setAdminUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const isInitializedRef = React.useRef(isInitialized);

  useEffect(() => {
    isInitializedRef.current = isInitialized;
  }, [isInitialized]);

  const fetchUserData = useAppStore((s) => s.fetchUserData);
  const clearStore = useAppStore((s) => s.clearStore);
  const addToast = useAppStore((s) => s.addToast);

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id).then(() => {
          setIsInitialized(true);
          setLoading(false);
        });
      } else {
        setIsInitialized(true);
        setLoading(false);
      }
    });

    // 2. Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (event === 'SIGNED_IN' && currentSession?.user) {
        const alreadyInitialized = isInitializedRef.current;
        if (!alreadyInitialized) {
          setLoading(true);
        }
        await fetchUserData(currentSession.user.id);
        if (!alreadyInitialized) {
          setIsInitialized(true);
          setLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        clearStore();
        setAdminToken(null);
        setAdminUsername(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserData, clearStore]);

  // Regular login
  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error };
      addToast('Welcome back, sir. Initiating systems.', 'success');
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  };

  // Regular signup
  const signup = async (email: string, password: string, username: string, fullName: string) => {
    try {
      // Pass metadata including terms_accepted = true since checking was mandatory
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: fullName,
            role: 'user',
            terms_accepted: true,
          },
        },
      });

      if (error) return { error, needsVerification: false };

      // In Supabase, if email confirmation is enabled, session will be null
      const needsVerification = data.session === null;
      if (needsVerification) {
        addToast('Verification signal transmitted. Check your inbox.', 'info');
      } else {
        addToast('Welcome to the Batcave, sir.', 'success');
      }
      return { error: null, needsVerification };
    } catch (err) {
      return { error: err, needsVerification: false };
    }
  };

  // Sign out
  const logout = async () => {
    await supabase.auth.signOut();
    addToast('Securing terminal. Logged out.', 'info');
  };

  // Admin Login via Supabase Edge Function
  const adminLogin = async (username: string, password: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Access Denied.' };
      }

      // Store in-memory
      setAdminToken(result.token);
      setAdminUsername(username);
      addToast('Mainframe decrypted. Admin session active.', 'success');
      return { success: true };
    } catch (err: any) {
      console.error('Admin Auth Error:', err);
      return { success: false, error: 'Connection failure. Signal lost.' };
    }
  };

  const adminLogout = () => {
    setAdminToken(null);
    setAdminUsername(null);
    addToast('Admin session cleared from memory.', 'info');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        adminToken,
        adminUsername,
        loading,
        isInitialized,
        login,
        signup,
        logout,
        adminLogin,
        adminLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
