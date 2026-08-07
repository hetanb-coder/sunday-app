import React, { useState } from 'react';
import { WeaveProvider, useWeave } from './context/WeaveContext';
import { TabNavigator } from './navigation/TabNavigator';
import { HomeScreen } from './screens/HomeScreen';
import { InteractiveVoiceDemoScreen } from './screens/InteractiveVoiceDemoScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { PaywallScreen } from './screens/PaywallScreen';
import { OnboardingFlowScreen } from './screens/OnboardingFlowScreen';
import { MicroStepsBottomSheet } from './components/MicroStepsBottomSheet';
import { NewTaskModal } from './components/NewTaskModal';
import { ToastNotification } from './components/ToastNotification';
import { Smartphone, Monitor, Sparkles } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { activeTab, setActiveTab } = useWeave();
  const [isMobileFrame, setIsMobileFrame] = useState(true);

  return (
    <div className="min-h-screen bg-[#F8F5F1] text-zinc-900 font-sans flex flex-col items-center justify-start relative overflow-x-hidden selection:bg-[#FF7A59]/20 selection:text-[#FF7A59]">
      
      {/* Top Bar for Desktop Preview Frame Toggle & Onboarding Trigger */}
      <div className="w-full bg-zinc-900 text-white text-[11px] font-semibold py-2 px-4 flex items-center justify-between z-50 shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#FF7A59]" />
          <span className="tracking-tight">Weave V2 • ADHD Productivity System</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('onboarding')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
              activeTab === 'onboarding'
                ? 'bg-[#FF7A59] text-white font-bold'
                : 'bg-zinc-800 text-zinc-300 hover:text-white'
            }`}
          >
            <Sparkles size={12} />
            <span>Onboarding Flow</span>
          </button>

          <button
            onClick={() => setIsMobileFrame(true)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
              isMobileFrame ? 'bg-[#FF7A59] text-white font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Smartphone size={12} />
            <span>Mobile Frame</span>
          </button>

          <button
            onClick={() => setIsMobileFrame(false)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
              !isMobileFrame ? 'bg-[#FF7A59] text-white font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Monitor size={12} />
            <span>Expanded</span>
          </button>
        </div>
      </div>

      {/* Main Container Frame */}
      <div className={`w-full flex-1 flex justify-center py-4 ${isMobileFrame ? 'px-2' : ''}`}>
        <div
          className={`relative w-full transition-all duration-300 ${
            isMobileFrame
              ? 'max-w-[400px] min-h-[812px] bg-gradient-to-b from-[#FFF9F5] via-[#F5EEF8] to-[#FFF3F0] rounded-[48px] border-[8px] border-zinc-900 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden my-auto'
              : 'max-w-2xl bg-gradient-to-b from-[#FFF9F5] via-[#F5EEF8] to-[#FFF3F0] rounded-3xl border border-zinc-200/80 shadow-xl overflow-hidden'
          }`}
        >
          {/* Dynamic Screen Content */}
          <main className="w-full h-full">
            {activeTab === 'onboarding' && <OnboardingFlowScreen />}
            {activeTab === 'home' && <HomeScreen />}
            {activeTab === 'voice' && <InteractiveVoiceDemoScreen />}
            {activeTab === 'dashboard' && <DashboardScreen />}
            {(activeTab === 'settings' || activeTab === 'paywall') && <PaywallScreen />}
          </main>

          {/* Floating Dough-Stretch Tab Bar (hidden during onboarding flow) */}
          {activeTab !== 'onboarding' && <TabNavigator />}

          {/* Modals & Toasts */}
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
