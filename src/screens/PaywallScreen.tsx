import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  Check,
  Shield,
  Zap,
  Mic,
  Sliders,
  Star,
  Lock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useWeave } from '../context/WeaveContext';

export const PaywallScreen: React.FC = () => {
  const { isPro, setIsPro, showToast, setActiveTab } = useWeave();
  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>('annual');

  const handleSubscribe = () => {
    setIsPro(true);
    showToast('Welcome to Weave Pro! All ADHD Guardrails unlocked. ✨', 'success');
    setActiveTab('home');
  };

  return (
    <div className="pb-36 pt-4 px-4 max-w-md mx-auto min-h-screen flex flex-col justify-between">
      {/* Top Header */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#FF7A59] bg-[#FF7A59]/10 px-3 py-1 rounded-full">
            <Sparkles size={14} />
            <span>WEAVE PRO PASS</span>
          </div>

          {/* Toggle Pro state for testing */}
          <button
            onClick={() => setIsPro(!isPro)}
            className="text-[10px] font-bold text-zinc-400 hover:text-zinc-600 border border-zinc-200 px-2.5 py-1 rounded-full"
          >
            Status: {isPro ? 'Pro Active' : 'Free Mode'} (Toggle)
          </button>
        </div>

        {/* Clean Logo-Free Headline */}
        <div className="text-left mb-6">
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight leading-tight">
            Unclutter your ADHD brain. Flow effortless every day.
          </h1>
          <p className="text-xs font-medium text-zinc-500 mt-2 leading-relaxed">
            Join 20,000+ neurodivergent thinkers using Weave to eliminate overwhelm and complete tasks with confidence.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="space-y-3 mb-8 bg-white/70 backdrop-blur-xl border border-white p-4 rounded-3xl shadow-xs">
          {[
            {
              icon: Mic,
              title: 'Unlimited Voice Brain Dumps',
              desc: 'Convert overwhelmed speech into instant micro-steps',
            },
            {
              icon: ShieldCheck,
              title: 'Smart ADHD Micro-Step Guardrails',
              desc: 'Prevent premature goal checking before steps are complete',
            },
            {
              icon: Zap,
              title: 'Dough-Stretch Fluid Navigation',
              desc: 'Calm, tactile UI animations designed for focus',
            },
            {
              icon: Sliders,
              title: 'Multi-Device Sync',
              desc: 'Your daily flow always synced safely',
            },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-[#FF7A59]/10 text-[#FF7A59] flex items-center justify-center shrink-0 mt-0.5">
                <item.icon size={15} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-800">{item.title}</h4>
                <p className="text-[10px] text-zinc-400 font-medium">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Plan Selection Cards */}
        <div className="space-y-3 mb-6">
          {/* Annual Pass Card */}
          <div
            onClick={() => setSelectedPlan('annual')}
            className={`relative p-4 rounded-3xl border-2 transition-all cursor-pointer ${
              selectedPlan === 'annual'
                ? 'bg-gradient-to-br from-[#FFF9F5] to-amber-50/30 border-[#FF7A59] shadow-md shadow-[#FF7A59]/10'
                : 'bg-white border-zinc-200/80 hover:border-zinc-300'
            }`}
          >
            {/* 7 Days Free Badge */}
            <div className="absolute -top-2.5 right-4 bg-gradient-to-r from-[#FF7A59] to-amber-500 text-white text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-sm">
              7 Days Free Trial
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPlan === 'annual' ? 'border-[#FF7A59] bg-[#FF7A59]' : 'border-zinc-300'
                  }`}
                >
                  {selectedPlan === 'annual' && <Check size={12} className="text-white" strokeWidth={3} />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black text-zinc-900">Annual Pass</span>
                    <span className="text-[9px] font-bold uppercase text-emerald-600 bg-emerald-100 px-1.5 py-0.2 rounded">
                      SAVE 40%
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                    $2.99 / month (Billed $35.88 annually)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Pass Card */}
          <div
            onClick={() => setSelectedPlan('monthly')}
            className={`relative p-4 rounded-3xl border-2 transition-all cursor-pointer ${
              selectedPlan === 'monthly'
                ? 'bg-gradient-to-br from-[#FFF9F5] to-amber-50/30 border-[#FF7A59] shadow-md shadow-[#FF7A59]/10'
                : 'bg-white border-zinc-200/80 hover:border-zinc-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPlan === 'monthly' ? 'border-[#FF7A59] bg-[#FF7A59]' : 'border-zinc-300'
                  }`}
                >
                  {selectedPlan === 'monthly' && <Check size={12} className="text-white" strokeWidth={3} />}
                </div>
                <div>
                  <span className="text-sm font-black text-zinc-900">Monthly Pass</span>
                  <p className="text-[10px] text-zinc-400 font-medium mt-0.5">$4.99 / month • Cancel anytime</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Button and Disclaimer */}
      <div>
        <button
          onClick={handleSubscribe}
          className="w-full py-4 bg-gradient-to-r from-[#FF7A59] via-[#FF8A6B] to-amber-500 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-[#FF7A59]/30 flex items-center justify-center gap-2 hover:scale-[1.01] transition-transform relative overflow-hidden"
        >
          <span>{selectedPlan === 'annual' ? 'Start 7-Day Free Trial' : 'Unlock Weave Pro'}</span>
          <ArrowRight size={16} strokeWidth={2.5} />
        </button>

        {/* Dynamic Disclaimer Text */}
        <p className="text-[10px] text-zinc-400 text-center font-medium mt-3 leading-tight">
          {selectedPlan === 'annual'
            ? 'Try free for 7 days, then $35.88/year. Cancel anytime in App Store settings before trial ends to avoid charges.'
            : 'Renews at $4.99/month. Cancel anytime in App Store settings.'}
        </p>
      </div>
    </div>
  );
};
