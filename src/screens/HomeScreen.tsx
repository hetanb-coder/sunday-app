import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check,
  Plus,
  Flame,
  Zap,
  Sparkles,
  ChevronRight,
  Clock,
  Layers,
  X,
  Trash2,
  ShieldCheck,
  PlusCircle,
  Award,
} from 'lucide-react';
import { useWeave } from '../context/WeaveContext';
import { Task, CategoryType } from '../types';

// Category color harmony definitions
export interface CategoryTheme {
  name: string;
  hex: string;
  bgLight: string;
  border: string;
  badgeBg: string;
  badgeText: string;
  accentBg: string;
  glowShadow: string;
}

export const CATEGORY_THEMES: Record<string, CategoryTheme> = {
  work: {
    name: 'Work',
    hex: '#FF7A59',
    bgLight: 'bg-[#FFF9F5]',
    border: 'border-[#FF7A59]/30',
    badgeBg: 'bg-[#FF7A59]/15',
    badgeText: 'text-[#FF7A59]',
    accentBg: 'bg-[#FF7A59]',
    glowShadow: 'shadow-[#FF7A59]/25',
  },
  life: {
    name: 'Life',
    hex: '#F43F5E',
    bgLight: 'bg-[#FFF1F2]',
    border: 'border-[#F43F5E]/30',
    badgeBg: 'bg-[#F43F5E]/15',
    badgeText: 'text-[#F43F5E]',
    accentBg: 'bg-[#F43F5E]',
    glowShadow: 'shadow-[#F43F5E]/25',
  },
  health: {
    name: 'Health',
    hex: '#F59E0B',
    bgLight: 'bg-[#FEF3C7]',
    border: 'border-[#F59E0B]/30',
    badgeBg: 'bg-[#F59E0B]/15',
    badgeText: 'text-[#F59E0B]',
    accentBg: 'bg-[#F59E0B]',
    glowShadow: 'shadow-[#F59E0B]/25',
  },
  money: {
    name: 'Money',
    hex: '#10B981',
    bgLight: 'bg-[#ECFDF5]',
    border: 'border-[#10B981]/30',
    badgeBg: 'bg-[#10B981]/15',
    badgeText: 'text-[#10B981]',
    accentBg: 'bg-[#10B981]',
    glowShadow: 'shadow-[#10B981]/25',
  },
  growth: {
    name: 'Growth',
    hex: '#8B5CF6',
    bgLight: 'bg-[#F5F3FF]',
    border: 'border-[#8B5CF6]/30',
    badgeBg: 'bg-[#8B5CF6]/15',
    badgeText: 'text-[#8B5CF6]',
    accentBg: 'bg-[#8B5CF6]',
    glowShadow: 'shadow-[#8B5CF6]/25',
  },
  personal: {
    name: 'Life',
    hex: '#F43F5E',
    bgLight: 'bg-[#FFF1F2]',
    border: 'border-[#F43F5E]/30',
    badgeBg: 'bg-[#F43F5E]/15',
    badgeText: 'text-[#F43F5E]',
    accentBg: 'bg-[#F43F5E]',
    glowShadow: 'shadow-[#F43F5E]/25',
  },
  creative: {
    name: 'Growth',
    hex: '#8B5CF6',
    bgLight: 'bg-[#F5F3FF]',
    border: 'border-[#8B5CF6]/30',
    badgeBg: 'bg-[#8B5CF6]/15',
    badgeText: 'text-[#8B5CF6]',
    accentBg: 'bg-[#8B5CF6]',
    glowShadow: 'shadow-[#8B5CF6]/25',
  },
  quick: {
    name: 'Quick',
    hex: '#0EA5E9',
    bgLight: 'bg-[#F0F9FF]',
    border: 'border-[#0EA5E9]/30',
    badgeBg: 'bg-[#0EA5E9]/15',
    badgeText: 'text-[#0EA5E9]',
    accentBg: 'bg-[#0EA5E9]',
    glowShadow: 'shadow-[#0EA5E9]/25',
  },
};

export function getCategoryTheme(cat: string): CategoryTheme {
  return CATEGORY_THEMES[cat.toLowerCase()] || CATEGORY_THEMES.work;
}

export const HomeScreen: React.FC = () => {
  const {
    tasks,
    shakingTaskId,
    toggleTaskComplete,
    toggleMicroStep,
    addMicroStep,
    addTask,
    deleteTask,
    setFocusHero,
    setActiveTab,
    activeMicroStepModalTask,
    setActiveMicroStepModalTask,
  } = useWeave();

  // Local state for modals & FAB
  const [isFabModalOpen, setIsFabModalOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState<CategoryType>('work');
  const [newGoalTimeMinutes, setNewGoalTimeMinutes] = useState(15);

  // Local state inside Microsteps Pop-up Modal for adding inline microsteps
  const [isAddingInlineMicrostep, setIsAddingInlineMicrostep] = useState(false);
  const [inlineMicrostepText, setInlineMicrostepText] = useState('');

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const momentumPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Identify Active Focus Hero Card
  const focusHeroTask =
    tasks.find((t) => t.isFocusHero && !t.completed) ||
    tasks.find((t) => !t.completed) ||
    tasks[0];
  const regularTasks = tasks.filter((t) => t.id !== focusHeroTask?.id);

  // Handle adding new goal from FAB Modal
  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    addTask({
      title: newGoalTitle.trim(),
      category: newGoalCategory,
      timeEstimateMinutes: Number(newGoalTimeMinutes),
      isFocusHero: false,
      microSteps: [
        { id: 'm-1', title: 'Open workspace & prep materials', completed: false },
        { id: 'm-2', title: 'Execute first 5 minutes of focused effort', completed: false },
        { id: 'm-3', title: 'Review output and check complete', completed: false },
      ],
    });

    setNewGoalTitle('');
    setIsFabModalOpen(false);
  };

  // Handle inline microstep add inside centered Pop-Up modal
  const handleAddInlineMicrostepSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inlineMicrostepText.trim() || !activeMicroStepModalTask) return;

    addMicroStep(activeMicroStepModalTask.id, inlineMicrostepText.trim());
    setInlineMicrostepText('');
  };

  const activeTheme = activeMicroStepModalTask
    ? getCategoryTheme(activeMicroStepModalTask.category)
    : CATEGORY_THEMES.work;

  return (
    <div className="relative min-h-screen pb-36 pt-4 px-4 max-w-md mx-auto select-none bg-gradient-to-b from-[#FFF9F5] via-[#F5EEF8] to-[#FFF3F0]">
      {/* 1. HEADER */}
      <header className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF7A59] to-[#FFB399] flex items-center justify-center text-white shadow-md shadow-[#FF7A59]/20 font-extrabold text-lg">
            W
          </div>
          <div>
            <h1 className="text-lg font-black text-zinc-900 tracking-tight leading-none">Weave</h1>
            <p className="text-[11px] font-medium text-zinc-400 mt-0.5">Minimalist Daily Flow</p>
          </div>
        </div>

        {/* Flow State Active Indicator Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 text-emerald-700 px-3 py-1 rounded-full text-[11px] font-bold shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Flow State Active</span>
          </div>
        </div>
      </header>

      {/* 2. TRANSLUCENT MOMENTUM FLOW BAR */}
      <div className="mb-6 bg-white/75 backdrop-blur-xl border border-white/80 p-4 rounded-3xl shadow-[0_8px_24px_rgba(0,0,0,0.03)]">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#FF7A59]/10 text-[#FF7A59] flex items-center justify-center">
              <Zap size={14} fill="#FF7A59" />
            </div>
            <span className="text-xs font-bold text-zinc-800">Daily Momentum</span>
          </div>
          <span className="text-xs font-black text-[#FF7A59] tracking-tight">
            {completedTasks}/{totalTasks} Goals ({momentumPercent}%)
          </span>
        </div>

        <div className="w-full bg-zinc-100/90 h-3 rounded-full overflow-hidden p-0.5">
          <motion.div
            className="h-full bg-gradient-to-r from-[#FF7A59] via-amber-500 to-[#FF9E85] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${momentumPercent}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* 3. CURRENT FOCUS HERO CARD */}
      {focusHeroTask && (
        <section className="mb-7">
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-amber-600">
              <Flame size={15} fill="#D97706" />
              <span>Current Focus Hero</span>
            </div>
            <span className="text-[10px] font-semibold text-zinc-400">1 Goal at a time</span>
          </div>

          <motion.div
            animate={
              shakingTaskId === focusHeroTask.id
                ? { x: [-12, 12, -8, 8, -4, 4, 0], rotate: [-1, 1, -0.5, 0.5, 0] }
                : {}
            }
            transition={{ duration: 0.5 }}
            onClick={() => {
              setActiveMicroStepModalTask(focusHeroTask);
              setIsAddingInlineMicrostep(false);
            }}
            className={`relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 text-white rounded-[32px] p-6 shadow-2xl shadow-zinc-900/30 border border-zinc-800 cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99] ${
              focusHeroTask.completed ? 'opacity-70' : ''
            }`}
          >
            {/* Background ambient glow */}
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#FF7A59]/20 rounded-full blur-3xl pointer-events-none" />

            {/* Top row badges */}
            <div className="flex items-center justify-between mb-3 relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#FF7A59] bg-[#FF7A59]/15 border border-[#FF7A59]/30 px-3 py-1 rounded-full">
                {focusHeroTask.category} • {focusHeroTask.timeEstimateMinutes} MINS
              </span>

              <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-300 bg-white/10 px-3 py-1 rounded-full backdrop-blur-md">
                <Layers size={13} />
                <span>
                  Micro-steps (
                  {focusHeroTask.microSteps.filter((s) => s.completed).length}/
                  {focusHeroTask.microSteps.length})
                </span>
                <ChevronRight size={13} />
              </div>
            </div>

            {/* Hero Title */}
            <h2
              className={`text-xl font-bold tracking-tight mb-4 leading-snug ${
                focusHeroTask.completed ? 'line-through text-zinc-500' : 'text-white'
              }`}
            >
              {focusHeroTask.title}
            </h2>

            {/* Micro Steps Preview Checklist */}
            <div className="space-y-2 mb-5 relative z-10">
              {focusHeroTask.microSteps.map((step) => (
                <div
                  key={step.id}
                  className="flex items-center gap-2.5 text-xs font-medium text-zinc-300"
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center border transition-colors ${
                      step.completed
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-zinc-600'
                    }`}
                  >
                    {step.completed && <Check size={10} strokeWidth={3} />}
                  </div>
                  <span className={step.completed ? 'line-through text-zinc-500' : ''}>
                    {step.title}
                  </span>
                </div>
              ))}
            </div>

            {/* Guardrail Checkmark Action Button */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80 relative z-10">
              <span className="text-[11px] text-zinc-400 font-medium">ADHD Guardrail Protection</span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTaskComplete(focusHeroTask.id);
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs transition-all shadow-lg ${
                  focusHeroTask.completed
                    ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                    : focusHeroTask.microSteps.every((s) => s.completed)
                    ? 'bg-gradient-to-r from-[#FF7A59] to-amber-500 text-white shadow-[#FF7A59]/30 hover:scale-105'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'
                }`}
              >
                <Check size={15} strokeWidth={3} />
                <span>{focusHeroTask.completed ? 'Done' : 'Mark Complete'}</span>
              </button>
            </div>
          </motion.div>
        </section>
      )}

      {/* 4. WOVEN FLOW GOALS LIST */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1 mb-1">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">
            Woven Flow Goals
          </h3>
          <button
            onClick={() => setActiveTab('voice')}
            className="text-[11px] font-bold text-[#FF7A59] hover:underline flex items-center gap-1"
          >
            <Sparkles size={12} /> Voice Brain Dump
          </button>
        </div>

        {regularTasks.length === 0 ? (
          <div className="text-center py-10 bg-white/60 backdrop-blur-md rounded-3xl border border-white/80 p-6">
            <p className="text-xs text-zinc-500 font-medium mb-3">
              All remaining goals completed or in Focus!
            </p>
            <button
              onClick={() => setIsFabModalOpen(true)}
              className="px-4 py-2 bg-zinc-900 text-white text-xs font-bold rounded-full hover:bg-zinc-800 shadow-md"
            >
              + Weave New Goal
            </button>
          </div>
        ) : (
          regularTasks.map((task) => {
            const isShaking = shakingTaskId === task.id;
            const completedCount = task.microSteps.filter((s) => s.completed).length;
            const totalSteps = task.microSteps.length;
            const isAllStepsDone = totalSteps > 0 && completedCount === totalSteps;
            const catTheme = getCategoryTheme(task.category);

            return (
              <motion.div
                key={task.id}
                animate={
                  isShaking
                    ? { x: [-10, 10, -8, 8, -4, 4, 0], rotate: [-1, 1, -0.5, 0.5, 0] }
                    : {}
                }
                transition={{ duration: 0.5 }}
                onClick={() => {
                  setActiveMicroStepModalTask(task);
                  setIsAddingInlineMicrostep(false);
                }}
                className={`bg-white/80 backdrop-blur-xl border border-white/90 p-4 rounded-3xl shadow-sm hover:shadow-md transition-all flex items-start gap-3 cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
                  task.completed ? 'opacity-60 bg-zinc-50/60' : ''
                }`}
              >
                {/* Complete Checkbox */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTaskComplete(task.id);
                  }}
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                    task.completed
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : isAllStepsDone
                      ? `${catTheme.accentBg} text-white shadow-xs`
                      : 'border-2 border-zinc-300 hover:border-[#FF7A59]'
                  }`}
                >
                  {task.completed && <Check size={14} strokeWidth={3} />}
                </button>

                {/* Main Card Information */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${catTheme.badgeBg} ${catTheme.badgeText}`}
                    >
                      {catTheme.name}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-medium flex items-center gap-1">
                      <Clock size={11} /> {task.timeEstimateMinutes}m
                    </span>
                  </div>

                  <h4
                    className={`text-sm font-bold text-zinc-800 leading-snug ${
                      task.completed ? 'line-through text-zinc-400' : ''
                    }`}
                  >
                    {task.title}
                  </h4>

                  {/* Micro Steps progress count */}
                  <div className="flex items-center gap-1 mt-2 text-[10px] font-semibold text-zinc-500">
                    <Layers size={11} style={{ color: catTheme.hex }} />
                    <span>
                      {completedCount} of {totalSteps} micro-steps
                    </span>
                    {!isAllStepsDone && !task.completed && (
                      <span className="text-amber-600 font-bold ml-1 bg-amber-50 px-1.5 py-0.5 rounded">
                        Guardrail Active
                      </span>
                    )}
                  </div>
                </div>

                {/* Flame Hero Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFocusHero(task.id);
                  }}
                  className="p-1.5 text-zinc-300 hover:text-amber-500 transition-colors"
                  title="Set as Focus Hero"
                >
                  <Flame size={16} />
                </button>
              </motion.div>
            );
          })
        )}
      </section>

      {/* 5. SLEEK FLOATING ACTION BUTTON (FAB) Positioned above bottom nav bar */}
      <div className="fixed bottom-[96px] right-6 z-30 pointer-events-auto">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.88 }}
          onClick={() => setIsFabModalOpen(true)}
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#FF7A59] via-[#FF8A6B] to-amber-500 text-white flex items-center justify-center shadow-[0_12px_28px_rgba(255,122,89,0.45)] hover:shadow-[0_16px_36px_rgba(255,122,89,0.6)] transition-all cursor-pointer border-2 border-white/60"
        >
          <Plus size={28} strokeWidth={2.8} />
        </motion.button>
      </div>

      {/* 6. CENTERED POP-UP MODAL FOR TASK MICRO-STEPS & COLOR HARMONY */}
      <AnimatePresence>
        {activeMicroStepModalTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveMicroStepModalTask(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />

            {/* Centered Pop-Up Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={`relative w-full max-w-md bg-white rounded-[32px] p-6 shadow-2xl z-10 border-2 ${activeTheme.border} overflow-hidden max-h-[85vh] flex flex-col justify-between`}
            >
              {/* Header */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${activeTheme.badgeBg} ${activeTheme.badgeText}`}
                    >
                      {activeTheme.name} • {activeMicroStepModalTask.timeEstimateMinutes} MINS
                    </span>
                  </div>

                  <button
                    onClick={() => setActiveMicroStepModalTask(null)}
                    className="p-1 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <h2 className="text-xl font-extrabold text-zinc-900 leading-snug mb-3">
                  {activeMicroStepModalTask.title}
                </h2>

                {/* Guardrail Progress Bar */}
                <div className={`p-3.5 rounded-2xl ${activeTheme.bgLight} border ${activeTheme.border} mb-4`}>
                  <div className="flex justify-between items-center text-xs font-bold text-zinc-700 mb-1.5">
                    <span className="flex items-center gap-1">
                      <ShieldCheck size={14} style={{ color: activeTheme.hex }} />
                      Micro-step Guardrail
                    </span>
                    <span style={{ color: activeTheme.hex }}>
                      {
                        activeMicroStepModalTask.microSteps.filter((s) => s.completed)
                          .length
                      }{' '}
                      / {activeMicroStepModalTask.microSteps.length} Steps
                    </span>
                  </div>
                  <div className="w-full bg-zinc-200/80 h-2 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: activeTheme.hex }}
                      animate={{
                        width: `${
                          activeMicroStepModalTask.microSteps.length > 0
                            ? Math.round(
                                (activeMicroStepModalTask.microSteps.filter((s) => s.completed)
                                  .length /
                                  activeMicroStepModalTask.microSteps.length) *
                                  100
                              )
                            : 0
                        }%`,
                      }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                {/* Attached Micro-tasks list */}
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 mb-3">
                  {activeMicroStepModalTask.microSteps.map((step) => (
                    <motion.div
                      key={step.id}
                      onClick={() =>
                        toggleMicroStep(activeMicroStepModalTask.id, step.id)
                      }
                      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                        step.completed
                          ? 'bg-emerald-50/60 border-emerald-200/80 text-zinc-400'
                          : 'bg-zinc-50 border-zinc-200/80 hover:border-zinc-300 text-zinc-800'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                          step.completed
                            ? 'bg-emerald-500 text-white'
                            : `border-2 border-zinc-300`
                        }`}
                      >
                        {step.completed && <Check size={12} strokeWidth={3} />}
                      </div>
                      <span
                        className={`text-xs font-semibold flex-1 ${
                          step.completed ? 'line-through text-zinc-400' : ''
                        }`}
                      >
                        {step.title}
                      </span>
                    </motion.div>
                  ))}
                </div>

                {/* Dynamic Inline Microstep Input */}
                {!isAddingInlineMicrostep ? (
                  <button
                    onClick={() => setIsAddingInlineMicrostep(true)}
                    className={`w-full py-2.5 px-3 rounded-2xl border border-dashed flex items-center justify-center gap-1.5 text-xs font-bold transition-all ${activeTheme.border} ${activeTheme.badgeText} bg-white hover:${activeTheme.bgLight}`}
                  >
                    <Plus size={15} />
                    <span>+ Add Microstep</span>
                  </button>
                ) : (
                  <form
                    onSubmit={handleAddInlineMicrostepSubmit}
                    className="flex items-center gap-2 pt-1"
                  >
                    <input
                      type="text"
                      autoFocus
                      placeholder="Type micro-step title..."
                      value={inlineMicrostepText}
                      onChange={(e) => setInlineMicrostepText(e.target.value)}
                      className="flex-1 bg-zinc-50 border border-zinc-200 rounded-2xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-[#FF7A59]"
                    />
                    <button
                      type="submit"
                      style={{ backgroundColor: activeTheme.hex }}
                      className="p-2.5 rounded-2xl text-white font-bold flex items-center justify-center shadow-md hover:opacity-90 shrink-0"
                      title="Add microstep"
                    >
                      <Check size={16} strokeWidth={3} />
                    </button>
                  </form>
                )}
              </div>

              {/* Bottom Actions: Delete & Clean Done Button */}
              <div className="pt-4 mt-3 border-t border-zinc-100 flex items-center justify-between gap-3 shrink-0">
                <button
                  onClick={() => deleteTask(activeMicroStepModalTask.id)}
                  className="p-2.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-colors"
                  title="Delete goal"
                >
                  <Trash2 size={18} />
                </button>

                <button
                  onClick={() => setActiveMicroStepModalTask(null)}
                  style={{ backgroundColor: activeTheme.hex }}
                  className="flex-1 py-3 px-6 rounded-2xl font-bold text-xs text-white shadow-lg flex items-center justify-center gap-2 hover:opacity-95 transition-all"
                >
                  <Check size={16} strokeWidth={2.5} />
                  <span>Done</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. WEAVE NEW GOAL MODAL (Triggered by FAB) */}
      <AnimatePresence>
        {isFabModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFabModalOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 20 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              className="relative w-full max-w-md bg-white rounded-[32px] p-6 shadow-2xl z-10 overflow-hidden"
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#FF7A59]/10 text-[#FF7A59] flex items-center justify-center">
                    <Sparkles size={16} />
                  </div>
                  <h2 className="text-lg font-black text-zinc-900">Weave New Goal</h2>
                </div>
                <button
                  onClick={() => setIsFabModalOpen(false)}
                  className="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-full hover:bg-zinc-100"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateGoal} className="space-y-4">
                {/* Goal Title */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Goal Title</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g., Draft launch press release"
                    value={newGoalTitle}
                    onChange={(e) => setNewGoalTitle(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-xs font-medium focus:outline-none focus:border-[#FF7A59]"
                  />
                </div>

                {/* Category Color Picks */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-2">
                    Pick Category Theme
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {(['work', 'life', 'health', 'money', 'growth'] as const).map((catKey) => {
                      const catInfo = getCategoryTheme(catKey);
                      const isSelected = newGoalCategory === catKey;

                      return (
                        <button
                          key={catKey}
                          type="button"
                          onClick={() => setNewGoalCategory(catKey)}
                          className={`py-2 px-1 rounded-2xl flex flex-col items-center justify-center gap-1 border transition-all ${
                            isSelected
                              ? `border-2 ${catInfo.border} ${catInfo.bgLight} scale-105 shadow-sm`
                              : 'border-zinc-200/80 bg-zinc-50 hover:bg-zinc-100'
                          }`}
                        >
                          <div
                            className="w-4 h-4 rounded-full shadow-xs"
                            style={{ backgroundColor: catInfo.hex }}
                          />
                          <span
                            className="text-[9px] font-black uppercase tracking-tight"
                            style={{ color: isSelected ? catInfo.hex : '#71717A' }}
                          >
                            {catInfo.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Estimate */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Time Estimate (Minutes)
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={120}
                    value={newGoalTimeMinutes}
                    onChange={(e) => setNewGoalTimeMinutes(Number(e.target.value))}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-[#FF7A59]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 bg-gradient-to-r from-[#FF7A59] via-[#FF8A6B] to-amber-500 text-white font-extrabold text-xs py-3.5 rounded-2xl shadow-xl shadow-[#FF7A59]/30 hover:opacity-95 transition-all"
                >
                  Weave Goal Into Daily Flow
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
