// Sign Up Screen with Terms of Service Gating
// Path: src/pages/Signup.tsx

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../modules/auth/AuthContext';
import { BatSignalBg } from '../components/animations/BatSignalBg';
import { BatIcon, XIcon } from '../components/ui/Icons';
import { motion, AnimatePresence } from 'framer-motion';

// Form validation schema
const signupSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Alphanumeric characters and underscores only'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine((data: any) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

type SignupFormValues = z.infer<typeof signupSchema>;

export const Signup: React.FC = () => {
  const { signup } = useAuth();
  const [showTos, setShowTos] = useState(false);
  const [tosChecked, setTosChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema)
  });

  const onSubmit = async (data: SignupFormValues) => {
    if (!tosChecked) {
      setAuthError('You must review and accept the Terms of Service to proceed.');
      return;
    }
    
    setSubmitting(true);
    setAuthError(null);
    
    const { error, needsVerification } = await signup(
      data.email, 
      data.password, 
      data.username.toLowerCase(), 
      data.fullName
    );
    
    setSubmitting(false);
    
    if (error) {
      setAuthError(error.message || 'An error occurred during signup.');
    } else {
      if (needsVerification) {
        setSuccessMsg('Account pending. A verification transmission has been sent to your email. Please verify before logging in.');
      } else {
        setSuccessMsg('Account created successfully. You are ready to enter the Batcave.');
      }
    }
  };

  const todayStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

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
            RECRUITING FOR GOTHAM
          </h1>
          <p className="text-sm text-bat-gray font-medium uppercase tracking-wider text-center mt-1">
            Establish your identity in the database
          </p>
        </div>

        {authError && (
          <div className="p-3 bg-bat-danger bg-opacity-10 border border-bat-danger text-bat-danger text-sm rounded mb-6 text-center">
            {authError}
          </div>
        )}

        {successMsg ? (
          <div className="text-center py-6">
            <div className="text-bat-gold mb-4 inline-block">
              <BatIcon size={64} className="animate-pulse" />
            </div>
            <h2 className="font-bebas text-2xl text-bat-gold mb-2">TRANSMISSION ENCRYPTED</h2>
            <p className="text-sm text-bat-white leading-relaxed mb-6">
              {successMsg}
            </p>
            <a
              href="/login"
              className="inline-block w-full py-3 bg-bat-gold hover:bg-bat-gold-dim text-bat-black font-bebas text-lg tracking-widest text-center transition-colors rounded"
            >
              RETURN TO LOGIN
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-1">
                Full Name
              </label>
              <input
                type="text"
                {...register('fullName')}
                className="w-full px-4 py-3 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-sm transition-colors"
                placeholder="Bruce Wayne"
              />
              {errors.fullName && (
                <p className="text-xs text-bat-danger mt-1">{errors.fullName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-1">
                Codename / Username
              </label>
              <input
                type="text"
                {...register('username')}
                className="w-full px-4 py-3 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-sm transition-colors"
                placeholder="dark_knight"
              />
              {errors.username && (
                <p className="text-xs text-bat-danger mt-1">{errors.username.message}</p>
              )}
            </div>

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
              <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-1">
                Database Password
              </label>
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

            <div>
              <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                {...register('confirmPassword')}
                className="w-full px-4 py-3 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-sm transition-colors"
                placeholder="••••••••"
              />
              {errors.confirmPassword && (
                <p className="text-xs text-bat-danger mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Terms and Conditions Checkbox Gating */}
            <div className="flex items-start gap-2 pt-2">
              <input
                type="checkbox"
                id="tos"
                checked={tosChecked}
                onChange={(e) => setTosChecked(e.target.checked)}
                className="mt-1 accent-bat-gold rounded"
              />
              <label htmlFor="tos" className="text-xs text-bat-gray leading-normal">
                I declare that I am at least 13 years of age and agree to the{' '}
                <button
                  type="button"
                  onClick={() => setShowTos(true)}
                  className="text-bat-gold hover:underline font-semibold focus:outline-none"
                >
                  Terms of Service
                </button>
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3 mt-4 bg-bat-gold hover:bg-bat-gold-dim text-bat-black font-bebas text-lg tracking-widest transition-colors rounded shadow-[0_0_10px_rgba(245,197,24,0.1)] flex items-center justify-center`}
            >
              {submitting ? 'PROCESSING PROTOCOL...' : 'ENCRYPT AND REGISTER'}
            </button>
          </form>
        )}

        <div className="mt-8 text-center text-xs">
          <span className="text-bat-gray">Already in the database? </span>
          <a href="/login" className="text-bat-gold hover:underline font-semibold">
            SECURE LOGIN
          </a>
        </div>
      </motion.div>

      {/* Verbatim Terms of Service Modal */}
      <AnimatePresence>
        {showTos && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="bg-bat-dark border border-bat-border rounded shadow-[0_0_50px_rgba(0,0,0,0.9)] w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] bat-glow-gold"
            >
              {/* Header */}
              <div className="flex justify-between items-center px-6 py-4 bg-bat-black border-b border-bat-border text-bat-gold">
                <span className="font-bebas text-2xl tracking-wider">SECURE TERMINAL — TERMS OF SERVICE</span>
                <button
                  onClick={() => setShowTos(false)}
                  className="text-bat-gray hover:text-bat-white transition-colors"
                >
                  <XIcon size={20} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 overflow-y-auto text-sm text-bat-white leading-relaxed space-y-4 no-scrollbar font-mono bg-opacity-50">
                <div className="text-center font-bold text-bat-gold border-b border-bat-border pb-4 mb-4">
                  TERMS OF SERVICE — THE BATMAN PROJECT<br />
                  Effective Date: {todayStr}
                </div>

                <p>
                  Welcome to The Batman Project. Please read these Terms of Service ("Terms") carefully before
                  using our platform. By creating an account or using any part of our service, you confirm that
                  you are at least 13 years of age and agree to be legally bound by these Terms.
                </p>

                <div className="font-bold text-bat-gold border-t border-bat-border pt-4">1. ABOUT THE SERVICE</div>
                <p>
                  The Batman Project is a personal productivity platform designed to help individuals build
                  habits, track progress toward goals, manage their time, monitor wellness, and gain insight
                  into their daily routines. We are committed to providing a focused, motivating environment
                  for your growth journey.
                </p>

                <div className="font-bold text-bat-gold border-t border-bat-border pt-4">2. YOUR ACCOUNT</div>
                <p>
                  You are responsible for maintaining the security of your login credentials. You agree not to
                  share your password or allow unauthorized access to your account. We reserve the right to
                  suspend or terminate accounts that engage in abuse, fraudulent activity, or behavior that
                  violates these Terms.
                </p>

                <div className="font-bold text-bat-gold border-t border-bat-border pt-4">3. INFORMATION WE COLLECT AND HOW WE USE IT</div>
                <p>
                  To deliver the features of this platform — including habit tracking, goal monitoring,
                  personalized AI insights, and usage history — we store the information you voluntarily
                  enter, such as task data, sleep logs, financial entries, and personal notes.
                </p>
                <p>
                  In addition to the content you create, we collect standard technical and usage information.
                  This includes how features are accessed, interaction patterns across the platform, and
                  general performance data. This information helps us understand how our service is being
                  used, identify areas for improvement, and ensure the platform operates effectively.
                </p>
                <p>
                  Usage data and patterns derived from your activity on the platform may be reviewed
                  internally as part of our ongoing efforts to develop, improve, and evaluate the service.
                  This review occurs at an aggregated or anonymized level wherever possible and is never used
                  to identify you personally or sold to third parties.
                </p>

                <div className="font-bold text-bat-gold border-t border-bat-border pt-4">4. DATA SECURITY</div>
                <p>
                  We implement industry-standard security measures to protect your data, including encrypted
                  connections, secure credential storage, and access controls. While no system can guarantee
                  absolute security, we take every reasonable precaution to safeguard the information
                  entrusted to us.
                </p>

                <div className="font-bold text-bat-gold border-t border-bat-border pt-4">5. ARTIFICIAL INTELLIGENCE FEATURES</div>
                <p>
                  This platform incorporates AI-powered tools to generate personalized suggestions,
                  motivation, and analysis based on your activity. These outputs are intended solely for
                  informational and motivational purposes. They do not constitute medical, financial,
                  psychological, or professional advice of any kind. You should consult qualified
                  profession professionals before making decisions based on AI-generated content.
                </p>

                <div className="font-bold text-bat-gold border-t border-bat-border pt-4">6. THIRD-PARTY SERVICES</div>
                <p>
                  Our platform relies on trusted third-party infrastructure providers to deliver core
                  functionality. By using this service, you acknowledge that your data may be processed by
                  these providers in accordance with their own privacy and security policies.
                </p>

                <div className="font-bold text-bat-gold border-t border-bat-border pt-4">7. YOUR RIGHTS</div>
                <p>
                  You may export your data or permanently delete your account at any time from your account
                  settings. Account deletion results in the complete and irreversible removal of all
                  associated data from our systems.
                </p>

                <div className="font-bold text-bat-gold border-t border-bat-border pt-4">8. CHANGES TO THESE TERMS</div>
                <p>
                  We may update these Terms from time to time. When we do, we will revise the effective date
                  at the top of this document. Continued use of the platform following any update constitutes
                  your acceptance of the revised Terms.
                </p>

                <div className="font-bold text-bat-gold border-t border-bat-border pt-4">9. CONTACT</div>
                <p>
                  If you have any questions about these Terms, please reach out through the contact information
                  provided on our GitHub repository.
                </p>

                <div className="text-center font-bold text-bat-gold border-t border-bat-border pt-4 mt-6">
                  By checking the box on the registration form, you confirm that you have read and understood these Terms of
                  Service and agree to be bound by them.
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex gap-4 px-6 py-4 bg-bat-black border-t border-bat-border justify-end">
                <button
                  onClick={() => {
                    setTosChecked(false);
                    setShowTos(false);
                  }}
                  className="px-5 py-2 border border-bat-border text-bat-gray hover:text-bat-white hover:border-bat-gray rounded transition-colors text-sm font-medium font-mono"
                >
                  REFUSE
                </button>
                <button
                  onClick={() => {
                    setTosChecked(true);
                    setShowTos(false);
                  }}
                  className="px-6 py-2 bg-bat-gold hover:bg-bat-gold-dim text-bat-black rounded font-bold transition-colors text-sm font-mono"
                >
                  ACCEPT TERMS
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
