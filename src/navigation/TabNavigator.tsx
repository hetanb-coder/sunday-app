import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Mic, BarChart3, Sparkles, Settings } from 'lucide-react';
import { useWeave } from '../context/WeaveContext';
import { TabType } from '../types';

interface TabItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}

const TABS: TabItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'voice', label: 'Voice', icon: Mic },
  { id: 'dashboard', label: 'Flow', icon: BarChart3 },
  { id: 'settings', label: 'Pro', icon: Sparkles },
];

export const TabNavigator: React.FC = () => {
  const { activeTab, setActiveTab, isPro } = useWeave();
  const [prevTab, setPrevTab] = useState<TabType>(activeTab);
  
  // Find active index fallback to 0 if paywall or custom
  const currentTabKey = activeTab === 'paywall' ? 'settings' : activeTab;
  const activeIndex = Math.max(0, TABS.findIndex((t) => t.id === currentTabKey));
  const prevIndex = Math.max(0, TABS.findIndex((t) => t.id === prevTab));

  const isMovingRight = activeIndex > prevIndex;

  useEffect(() => {
    if (currentTabKey !== prevTab) {
      setPrevTab(currentTabKey as TabType);
    }
  }, [currentTabKey]);

  return (
    <div className="fixed bottom-[28px] left-0 right-0 z-40 flex justify-center items-center pointer-events-none px-4">
      <div className="relative pointer-events-auto flex items-center bg-white/80 backdrop-blur-2xl border border-white/90 shadow-[0_12px_32px_rgba(255,122,89,0.18)] rounded-full px-2 py-2 w-full max-w-[360px] justify-between transition-all duration-300">
        
        {/* THE UNIFIED ANIMATED PORTAL: Carries Coral Circle + White Active Icon together */}
        <motion.div
          className="absolute top-2 bottom-2 rounded-full bg-gradient-to-tr from-[#FF7A59] to-[#FF9E85] shadow-lg shadow-[#FF7A59]/40 flex items-center justify-center z-10"
          style={{
            width: `calc((100% - 16px) / ${TABS.length})`,
            left: 8,
          }}
          animate={{
            x: `${activeIndex * 100}%`,
            scaleX: [1, isMovingRight ? 1.25 : 1.25, 0.94, 1],
            scaleY: [1, 0.84, 1.06, 1],
          }}
          transition={{
            type: 'spring',
            stiffness: 420,
            damping: 28,
            mass: 0.7,
            scaleX: { duration: 0.35 },
            scaleY: { duration: 0.35 },
          }}
        >
          {/* Active Icon Portal Rendering inside Coral Pill */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTabKey}
              initial={{ opacity: 0, scale: 0.5, rotate: isMovingRight ? -15 : 15 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.5, rotate: isMovingRight ? 15 : -15 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-1 text-white font-medium text-xs tracking-tight"
            >
              {currentTabKey === 'home' && <Home size={18} strokeWidth={2.5} />}
              {currentTabKey === 'voice' && <Mic size={18} strokeWidth={2.5} />}
              {currentTabKey === 'dashboard' && <BarChart3 size={18} strokeWidth={2.5} />}
              {(currentTabKey === 'settings' || currentTabKey === 'paywall') && <Sparkles size={18} strokeWidth={2.5} />}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Tab Buttons Container */}
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTabKey === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex-1 py-1.5 flex flex-col items-center justify-center z-20 cursor-pointer select-none transition-colors duration-200"
            >
              <div
                className={`flex items-center gap-1 transition-all duration-200 ${
                  isActive ? 'opacity-0 scale-90' : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                <Icon size={18} strokeWidth={2} />
                <span className="text-[10px] font-bold tracking-tight">{tab.label}</span>
              </div>
            </button>
          );
        })}

        {/* Pro Pill Badge indicator on tab if applicable */}
        {!isPro && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1.5 right-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm flex items-center gap-0.5"
          >
            <Sparkles size={9} />
            PRO
          </motion.div>
        )}
      </div>
    </div>
  );
};
