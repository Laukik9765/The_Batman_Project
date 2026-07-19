// Login Screen with Forgot Password flow
// Path: src/pages/Login.tsx

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../modules/auth/AuthContext';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import { BatSignalBg } from '../components/animations/BatSignalBg';
import { BatIcon } from '../components/ui/Icons';
import { motion } from 'framer-motion';

// Form validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const { login } = useAuth();
  const addToast = useAppStore((s) => s.addToast);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

  // Password Recovery state
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginFormValues) => {
    setSubmitting(true);
    setAuthError(null);
    
    const { error } = await login(data.email, data.password);
    
    setSubmitting(false);
    
    if (error) {
      setAuthError(error.message || 'Access Denied. Check your signals.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes('@')) {
      addToast('Please enter a valid email to transmit recovery signals.', 'danger');
      return;
    }

    setForgotSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/login`
      });

      if (error) throw error;

      setRecoverySent(true);
      addToast('Recovery transmission sent.', 'success');
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Failed to dispatch recovery signal.', 'danger');
    } finally {
      setForgotSubmitting(false);
    }
  };

  return (
    <div className="min-height-100vh flex flex-col justify-center items-center py-12 px-4 relative bg-bat-black overflow-y-auto">
      <BatSignalBg />

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10 bat-glass p-8 rounded shadow-[0_10px_35px_rgba(0,0,0,0.8)] bat-glow-gold"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="text-bat-gold mb-2">
            <BatIcon size={44} />
          </div>
          <h1 className="font-bebas text-4xl text-bat-gold tracking-widest text-center">
            {forgotMode ? 'RECOVER SYSTEM ACCESS' : 'BATMAN PROJECT SECURE LOGIN'}
          </h1>
          <p className="text-sm text-bat-gray font-medium uppercase tracking-wider text-center mt-1">
            {forgotMode ? 'Transmit recovery coordinates' : 'Enter your coordinates to begin sync'}
          </p>
        </div>

        {authError && !forgotMode && (
          <div className="p-3 bg-bat-danger bg-opacity-10 border border-bat-danger text-bat-danger text-sm rounded mb-6 text-center font-mono">
            {authError}
          </div>
        )}

        {forgotMode ? (
          <div>
            {recoverySent ? (
              <div className="text-center space-y-4 py-4">
                <p className="text-sm text-bat-white leading-relaxed">
                  A system recovery key has been transmitted to <span className="text-bat-gold font-mono">{forgotEmail}</span>.
                </p>
                <p className="text-xs text-bat-gray">
                  Check your mail terminal for verification coordinates to reset access.
                </p>
                <button
                  onClick={() => {
                    setForgotMode(false);
                    setRecoverySent(false);
                    setForgotEmail('');
                  }}
                  className="w-full py-3 bg-bat-gold hover:bg-bat-gold-dim text-bat-black font-bebas text-lg tracking-widest transition-colors rounded mt-4"
                >
                  RETURN TO LOGIN
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-1">
                    Your Secured Email
                  </label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-sm transition-colors"
                    placeholder="bruce@waynecorp.com"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={forgotSubmitting}
                  className="w-full py-3 mt-4 bg-bat-gold hover:bg-bat-gold-dim text-bat-black font-bebas text-lg tracking-widest transition-colors rounded flex items-center justify-center"
                >
                  {forgotSubmitting ? 'TRANSMITTING BEACON...' : 'DISPATCH RECOVERY LINK'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotMode(false)}
                    className="text-xs text-bat-gold hover:underline font-semibold"
                  >
                    BACK TO SECURE LOGIN
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-1">
                Secured Email Address
              </label>
              <input
                type="email"
                {...register('email')}
                className="w-full px-4 py-3 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-sm transition-colors"
                placeholder="bruce@waynecorp.com"
              />
              {errors.email && (
                <p className="text-xs text-bat-danger mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest">
                  Terminal Password
                </label>
                <button
                  type="button"
                  onClick={() => setForgotMode(true)}
                  className="text-[10px] font-bold text-bat-gold uppercase tracking-widest hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <input
                type="password"
                {...register('password')}
                className="w-full px-4 py-3 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-sm transition-colors"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="text-xs text-bat-danger mt-1">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="accent-bat-gold rounded"
              />
              <label htmlFor="remember" className="text-xs text-bat-gray">
                Remember me
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 mt-4 bg-bat-gold hover:bg-bat-gold-dim text-bat-black font-bebas text-lg tracking-widest transition-colors rounded shadow-[0_0_10px_rgba(245,197,24,0.1)] flex items-center justify-center"
            >
              {submitting ? 'LOGGING IN...' : 'LOG IN'}
            </button>
          </form>
        )}

        <div className="mt-8 text-center text-xs">
          <span className="text-bat-gray">Don't have an account? </span>
          <a href="/signup" className="text-bat-gold hover:underline font-semibold">
            CREATE ACCOUNT
          </a>
        </div>
      </motion.div>
    </div>
  );
};
