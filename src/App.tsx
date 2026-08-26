import {
  Monitor,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import React, { useState } from 'react';
import { MicroStepsBottomSheet } from './components/MicroStepsBottomSheet';
import { NewTaskModal } from './components/NewTaskModal';
import { ToastNotification } from './components/ToastNotification';
import { WeaveProvider, useWeave } from './context/WeaveContext';
import { TabNavigator } from './navigation/TabNavigator';
import { DashboardScreen } from './screens/DashboardScreen';
import { HomeScreen } from './screens/HomeScreen';
import { InteractiveVoiceDemoScreen } from './screens/InteractiveVoiceDemoScreen';
import { OnboardingFlowScreen } from './screens/OnboardingFlowScreen';
import { PaywallScreen } from './screens/PaywallScreen';

const MainAppContent: React.FC = () => {
  const { activeTab, setActiveTab } = useWeave();
  const [isMobileFrame, setIsMobileFrame] = useState(true);

  return (
    <div className="w-full h-screen flex flex-col bg-zinc-100 overflow-hidden">

      {/* =====================================================
          DESKTOP PREVIEW CONTROL BAR
      ===================================================== */}
      <div className="w-full bg-zinc-900 text-white text-[11px] font-semibold py-2 px-4 flex items-center justify-between z-[100] shrink-0 shadow-sm">

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#FF7A59]" />

          <span className="tracking-tight">
            Weave V2 • ADHD Productivity System
          </span>
        </div>

        <div className="flex items-center gap-2">

          {/* Onboarding */}
          <button
            onClick={() => setActiveTab('onboarding')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all duration-200 ${
              activeTab === 'onboarding'
                ? 'bg-[#FF7A59] text-white font-bold'
                : 'bg-zinc-800 text-zinc-300 hover:text-white'
            }`}
          >
            <Sparkles size={12} />
            <span>Onboarding Flow</span>
          </button>

          {/* Mobile Frame */}
          <button
            onClick={() => setIsMobileFrame(true)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all duration-200 ${
              isMobileFrame
                ? 'bg-[#FF7A59] text-white font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Smartphone size={12} />
            <span>Mobile Frame</span>
          </button>

          {/* Expanded */}
          <button
            onClick={() => setIsMobileFrame(false)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all duration-200 ${
              !isMobileFrame
                ? 'bg-[#FF7A59] text-white font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Monitor size={12} />
            <span>Expanded</span>
          </button>

        </div>
      </div>

      {/* =====================================================
          APP FRAME
      ===================================================== */}
      <div
        className={`
          w-full
          flex-1
          flex
          justify-center
          min-h-0
          ${isMobileFrame ? 'px-2 py-4' : ''}
        `}
      >

        <div
          className={`
            relative
            w-full
            overflow-hidden
            transition-all
            duration-300
            ${
              isMobileFrame
                ? `
                  max-w-[400px]
                  h-full
                  max-h-[812px]
                  bg-gradient-to-b
                  from-[#FFF9F5]
                  via-[#F5EEF8]
                  to-[#FFF3F0]
                  rounded-[48px]
                  border-[8px]
                  border-zinc-900
                  shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)]
                `
                : `
                  max-w-2xl
                  h-full
                  bg-gradient-to-b
                  from-[#FFF9F5]
                  via-[#F5EEF8]
                  to-[#FFF3F0]
                  rounded-3xl
                  border
                  border-zinc-200/80
                  shadow-xl
                `
            }
          `}
        >

          {/* =================================================
              SCREEN CONTENT
          ================================================= */}
          <main className="relative w-full h-full min-h-0 overflow-hidden">

            {activeTab === 'onboarding' && (
              <OnboardingFlowScreen />
            )}

            {activeTab === 'home' && (
              <HomeScreen />
            )}

            {activeTab === 'voice' && (
              <InteractiveVoiceDemoScreen />
            )}

            {activeTab === 'dashboard' && (
              <DashboardScreen />
            )}

            {(activeTab === 'settings' ||
              activeTab === 'paywall') && (
              <PaywallScreen />
            )}

          </main>

          {/* =================================================
              FLOATING NAVIGATION
          ================================================= */}
          {activeTab !== 'onboarding' && (
            <TabNavigator />
          )}

          {/* =================================================
              GLOBAL OVERLAYS
          ================================================= */}

          <MicroStepsBottomSheet />

          <NewTaskModal />

          <ToastNotification />

        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <WeaveProvider>
      <MainAppContent />
    </WeaveProvider>
  );
}