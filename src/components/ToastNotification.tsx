import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, Info, Sparkles } from 'lucide-react';
import { useWeave } from '../context/WeaveContext';

export const ToastNotification: React.FC = () => {
  const { toast } = useWeave();

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: 15, scale: 0.92, filter: 'blur(2px)' }}
          transition={{ type: 'spring', stiffness: 450, damping: 28 }}
          style={{ bottom: '96px' }}
          className="fixed left-4 right-4 z-50 flex justify-center pointer-events-none"
        >
          <div
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-full shadow-xl backdrop-blur-xl border text-xs font-semibold tracking-tight max-w-[360px] text-center ${
              toast.type === 'error'
                ? 'bg-gradient-to-r from-rose-500/95 to-amber-500/95 text-white border-rose-300/40 shadow-rose-500/20'
                : toast.type === 'success'
                ? 'bg-zinc-900/95 text-white border-zinc-700/60 shadow-black/20'
                : 'bg-white/95 text-zinc-800 border-zinc-200/80 shadow-zinc-400/20'
            }`}
          >
            {toast.type === 'error' && <AlertCircle size={16} className="text-amber-200 shrink-0" />}
            {toast.type === 'success' && <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />}
            {toast.type === 'info' && <Sparkles size={16} className="text-[#FF7A59] shrink-0" />}
            <span>{toast.text}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
