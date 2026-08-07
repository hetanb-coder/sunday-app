import React from 'react';
import { motion } from 'motion/react';
import {
  Zap,
  Flame,
  ShieldCheck,
  Mic,
  Clock,
  TrendingUp,
  Award,
  Sparkles,
  ArrowRight,
  Layers,
  ChevronRight,
  CheckCircle2,
  Crown,
  BarChart3,
  Calendar,
  Activity,
} from 'lucide-react';
import { useWeave } from '../context/WeaveContext';

export const DashboardScreen: React.FC = () => {
  const { tasks, isPro, setActiveTab, setIsNewTaskModalOpen } = useWeave();

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const totalMicroSteps = tasks.reduce((acc, t) => acc + t.microSteps.length, 0);
  const completedMicroSteps = tasks.reduce(
    (acc, t) => acc + t.microSteps.filter((s) => s.completed).length,
    0
  );

  const guardrailSuccessPercent =
    totalMicroSteps > 0 ? Math.round((completedMicroSteps / totalMicroSteps) * 100) : 100;

  // Category counts
  const categoryCounts = tasks.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Mock weekly activity bars for ADHD Flow momentum
  const weeklyData = [
    { day: 'Mon', completed: 4, goal: 5 },
    { day: 'Tue', completed: 6, goal: 5 },
    { day: 'Wed', completed: 5, goal: 5 },
    { day: 'Thu', completed: 7, goal: 5 },
    { day: 'Fri', completed: 3, goal: 5 },
    { day: 'Sat', completed: 4, goal: 4 },
    { day: 'Sun', completed: completedTasks, goal: Math.max(4, totalTasks) },
  ];

  return (
    <div className="pb-36 pt-4 px-4 max-w-md mx-auto min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#FF7A59] bg-[#FF7A59]/10 px-2.5 py-0.5 rounded-full w-fit">
            <Activity size={12} />
            <span>ADHD Flow Analytics</span>
          </div>
          <h1 className="text-xl font-black text-zinc-900 mt-1">Companion Dashboard</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Flow Streak Badge */}
          <div className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-black shadow-sm">
            <Flame size={14} fill="white" />
            <span>5d Streak</span>
          </div>
        </div>
      </header>

      {/* Hero Stats Overview Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {/* Card 1: Flow Completion Rate */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-xl border border-white/90 p-4 rounded-3xl shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Flow Goals</span>
            <div className="w-6 h-6 rounded-lg bg-[#FF7A59]/10 text-[#FF7A59] flex items-center justify-center">
              <Zap size={14} fill="#FF7A59" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-zinc-900">
              {completedTasks}/{totalTasks}
            </div>
            <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
              {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}% Daily goals complete
            </p>
          </div>
        </motion.div>

        {/* Card 2: Micro-Step Guardrails */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white/80 backdrop-blur-xl border border-white/90 p-4 rounded-3xl shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Guardrails</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <ShieldCheck size={14} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-zinc-900">{guardrailSuccessPercent}%</div>
            <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
              {completedMicroSteps}/{totalMicroSteps} steps completed
            </p>
          </div>
        </motion.div>
      </div>

      {/* Voice Deconstruction Time Saved Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 text-white p-5 rounded-3xl shadow-xl border border-zinc-800 mb-6 relative overflow-hidden"
      >
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#FF7A59]/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#FF7A59] bg-[#FF7A59]/15 border border-[#FF7A59]/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <Mic size={10} /> Voice AI Impact
          </span>
        </div>

        <h3 className="text-base font-bold text-white mb-1">~48 Mins Friction Saved</h3>
        <p className="text-xs text-zinc-400 leading-relaxed mb-4">
          Deconstructing raw brain dumps into micro-steps reduced task initiation friction by 68% this week.
        </p>

        <button
          onClick={() => setActiveTab('voice')}
          className="w-full py-2.5 bg-gradient-to-r from-[#FF7A59] to-amber-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md hover:opacity-95 transition-all"
        >
          <Sparkles size={14} />
          <span>Launch Voice Brain Dump</span>
          <ArrowRight size={14} />
        </button>
      </motion.div>

      {/* Weekly Momentum Visual Chart */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/90 p-5 rounded-3xl shadow-xs mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-800 flex items-center gap-1.5">
              <BarChart3 size={15} className="text-[#FF7A59]" />
              <span>Weekly Flow Momentum</span>
            </h3>
            <p className="text-[10px] text-zinc-400 font-medium">Bite-sized productivity consistency</p>
          </div>
          <span className="text-xs font-extrabold text-[#FF7A59] bg-[#FF7A59]/10 px-2.5 py-1 rounded-full">
            34 Goals Total
          </span>
        </div>

        {/* Bar Chart Representation */}
        <div className="flex items-end justify-between gap-2 h-28 pt-4">
          {weeklyData.map((item, idx) => {
            const heightPercent = Math.min(100, Math.round((item.completed / item.goal) * 100));
            const isToday = idx === 6;

            return (
              <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                <div className="text-[9px] font-bold text-zinc-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.completed}
                </div>
                <div className="w-full bg-zinc-100 h-full max-h-[80px] rounded-xl overflow-hidden flex items-end p-0.5">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPercent}%` }}
                    transition={{ duration: 0.5, delay: idx * 0.05 }}
                    className={`w-full rounded-lg ${
                      isToday
                        ? 'bg-gradient-to-t from-[#FF7A59] to-amber-400 shadow-sm'
                        : 'bg-zinc-300 group-hover:bg-[#FF7A59]/60'
                    }`}
                  />
                </div>
                <span
                  className={`text-[10px] font-extrabold mt-2 ${
                    isToday ? 'text-[#FF7A59]' : 'text-zinc-400'
                  }`}
                >
                  {item.day}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Distribution Breakdown */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/90 p-5 rounded-3xl shadow-xs mb-6">
        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-800 mb-3 flex items-center gap-1.5">
          <Layers size={15} className="text-[#FF7A59]" />
          <span>Category Focus Balance</span>
        </h3>

        <div className="space-y-2.5">
          {[
            { label: 'Work & Projects', cat: 'work', color: 'bg-blue-500' },
            { label: 'Personal & Desk', cat: 'personal', color: 'bg-[#FF7A59]' },
            { label: 'Health & Mind', cat: 'health', color: 'bg-emerald-500' },
            { label: 'Creative & Design', cat: 'creative', color: 'bg-purple-500' },
          ].map((item, idx) => {
            const count = categoryCounts[item.cat] || 0;
            const pct = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;

            return (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between items-center text-[11px] font-bold text-zinc-700">
                  <span>{item.label}</span>
                  <span className="text-zinc-400">{count} goals ({pct}%)</span>
                </div>
                <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, delay: idx * 0.08 }}
                    className={`h-full ${item.color} rounded-full`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pro Plan Status Banner */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-3xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-sm font-bold">
            <Crown size={20} />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-zinc-900">
              {isPro ? 'Weave Pro Plan Active' : 'Upgrade to Weave Pro'}
            </h4>
            <p className="text-[10px] text-zinc-500 font-medium">
              {isPro ? 'All ADHD Guardrails & Voice AI Unlocked' : '7 Days Free Trial Available'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('paywall')}
          className="text-xs font-extrabold text-[#FF7A59] hover:underline"
        >
          {isPro ? 'Manage' : 'Upgrade'}
        </button>
      </div>
    </div>
  );
};
