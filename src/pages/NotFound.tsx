// 404 Page: Signal went dark
// Path: src/pages/NotFound.tsx

import React from 'react';
import { BatIcon } from '../components/ui/Icons';
import { motion } from 'framer-motion';

interface NotFoundProps {
  onNavigate: (path: string) => void;
}

export const NotFound: React.FC<NotFoundProps> = ({ onNavigate }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-bat-black text-bat-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md space-y-6"
      >
        <div className="text-bat-gold flex justify-center animate-pulse">
          <svg viewBox="0 0 512 512" className="w-48 h-48 drop-shadow-[0_0_15px_rgba(245,197,24,0.3)]">
            {/* Bat Signal stroke pattern */}
            <circle cx="256" cy="256" r="230" fill="none" stroke="currentColor" strokeWidth="6" strokeDasharray="12 12" />
            <path d="M256 160c10-25 30-40 40-48 10 24 10 40 20 56 50-10 90-34 110-44-10 34-20 74-60 108 45-10 83-25 102-34-10 58-60 116-140 140-10 16-30 24-50 24s-40-8-50-24c-80-24-130-82-140-140 19 9 57 24 102 34-40-34-50-74-60-108 20 10 60 34 110 44 10-16 10-32 20-56 10 8 30 23 40 48z" fill="currentColor" />
          </svg>
        </div>

        <h1 className="font-bebas text-5xl text-bat-gold tracking-widest">THE SIGNAL WENT DARK</h1>
        
        <p className="font-mono text-sm text-bat-gray leading-relaxed max-w-sm mx-auto">
          The requested coordinate matrix does not exist in Gotham's database. Security systems have blocked access.
        </p>

        <button
          onClick={() => onNavigate('/dashboard')}
          className="inline-block px-8 py-3 bg-bat-gold hover:bg-bat-gold-dim text-bat-black font-bebas text-lg tracking-widest transition-colors rounded shadow-[0_0_15px_rgba(245,197,24,0.2)]"
        >
          RETURN TO SAFE HOUSE
        </button>
      </motion.div>
    </div>
  );
};
