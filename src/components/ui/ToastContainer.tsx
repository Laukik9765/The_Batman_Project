// Animated Toast Notification System
// Path: src/components/ui/ToastContainer.tsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/appStore';
import { CheckIcon, WarningIcon, XIcon } from './Icons';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useAppStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4 md:px-0">
      <AnimatePresence>
        {toasts.map((toast) => {
          let borderClass = 'border-bat-info';
          let Icon = WarningIcon; // default icon

          if (toast.type === 'success') {
            borderClass = 'border-bat-success';
            Icon = CheckIcon;
          } else if (toast.type === 'danger') {
            borderClass = 'border-bat-danger';
            Icon = WarningIcon;
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className={`flex items-center gap-3 p-4 rounded bg-bat-dark border-l-4 ${borderClass} text-bat-white shadow-[0_4px_20px_rgba(0,0,0,0.5)] border border-bat-border bat-glow-gold`}
            >
              <div className={toast.type === 'success' ? 'text-bat-success' : toast.type === 'danger' ? 'text-bat-danger' : 'text-bat-info'}>
                <Icon size={20} />
              </div>
              <div className="flex-grow text-sm font-medium tracking-wide">
                {toast.message}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-bat-gray hover:text-bat-white transition-colors"
                aria-label="Dismiss notification"
              >
                <XIcon size={16} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
