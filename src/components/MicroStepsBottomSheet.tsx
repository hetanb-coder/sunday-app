import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Plus, X, Sparkles, Clock, Trash2, ShieldCheck, Flame } from 'lucide-react';
import { useWeave } from '../context/WeaveContext';

export const MicroStepsBottomSheet: React.FC = () => {
  const {
    activeMicroStepModalTask,
    setActiveMicroStepModalTask,
    toggleMicroStep,
    toggleTaskComplete,
    deleteTask,
  } = useWeave();

  const [newStepText, setNewStepText] = useState('');

  if (!activeMicroStepModalTask) return null;

  const task = activeMicroStepModalTask;
  const completedStepsCount = task.microSteps.filter((s) => s.completed).length;
  const totalStepsCount = task.microSteps.length;
  const progressPercent = totalStepsCount > 0 ? Math.round((completedStepsCount / totalStepsCount) * 100) : 0;
  const isAllStepsDone = totalStepsCount > 0 && completedStepsCount === totalStepsCount;

  const handleAddStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStepText.trim()) return;

    const newStep = {
      id: 'm-' + Date.now(),
      title: newStepText.trim(),
      completed: false,
    };

    task.microSteps.push(newStep);
    setNewStepText('');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setActiveMicroStepModalTask(null)}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />

        {/* Bottom Sheet Drawer */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="relative w-full max-w-lg bg-white rounded-t-[32px] p-6 shadow-2xl z-10 max-h-[85vh] flex flex-col overflow-hidden"
        >
          {/* Pull Indicator Pill */}
          <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto mb-4 shrink-0" />

          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3 shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-[#FF7A59] bg-[#FF7A59]/10 px-2 py-0.5 rounded-full">
                  {task.category} • {task.timeEstimateMinutes} min
                </span>
                {task.isFocusHero && (
                  <span className="text-[10px] uppercase tracking-wider font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Flame size={10} /> Focus Hero
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-zinc-900 leading-snug">{task.title}</h2>
            </div>
            <button
              onClick={() => setActiveMicroStepModalTask(null)}
              className="p-2 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Micro-step Progress Header */}
          <div className="bg-[#FFF9F5] border border-[#FF7A59]/20 rounded-2xl p-3.5 mb-4 shrink-0">
            <div className="flex justify-between items-center text-xs font-semibold text-zinc-700 mb-1.5">
              <span className="flex items-center gap-1">
                <ShieldCheck size={14} className="text-[#FF7A59]" />
                Micro-step Guardrail
              </span>
              <span className="text-[#FF7A59]">
                {completedStepsCount} of {totalStepsCount} completed ({progressPercent}%)
              </span>
            </div>
            <div className="w-full bg-zinc-200/80 h-2 rounded-full overflow-hidden">
              <motion.div
                className="bg-gradient-to-r from-[#FF7A59] to-amber-500 h-full rounded-full"
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Micro Steps List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 my-2">
            {task.microSteps.map((step, idx) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => toggleMicroStep(task.id, step.id)}
                className={`group flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  step.completed
                    ? 'bg-emerald-50/50 border-emerald-200/60 text-zinc-500'
                    : 'bg-zinc-50/80 border-zinc-200/80 hover:border-[#FF7A59]/40 text-zinc-800'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    step.completed
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'border-2 border-zinc-300 group-hover:border-[#FF7A59]'
                  }`}
                >
                  {step.completed && <Check size={14} strokeWidth={3} />}
                </div>
                <span className={`text-xs font-medium flex-1 ${step.completed ? 'line-through text-zinc-400' : ''}`}>
                  {step.title}
                </span>
              </motion.div>
            ))}

            {/* Quick Add Step Input */}
            <form onSubmit={handleAddStep} className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="Add a tiny micro-step..."
                value={newStepText}
                onChange={(e) => setNewStepText(e.target.value)}
                className="flex-1 bg-zinc-100 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#FF7A59]"
              />
              <button
                type="submit"
                className="bg-zinc-900 text-white rounded-xl px-3 py-2 text-xs font-medium flex items-center gap-1 hover:bg-zinc-800 transition-colors"
              >
                <Plus size={14} /> Add
              </button>
            </form>
          </div>

          {/* Bottom Actions */}
          <div className="pt-4 mt-2 border-t border-zinc-100 flex items-center justify-between gap-3 shrink-0">
            <button
              onClick={() => deleteTask(task.id)}
              className="p-2.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
              title="Delete goal"
            >
              <Trash2 size={18} />
            </button>

            <button
              onClick={() => {
                const success = toggleTaskComplete(task.id);
                if (success) {
                  setActiveMicroStepModalTask(null);
                }
              }}
              className={`flex-1 py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${
                isAllStepsDone
                  ? 'bg-gradient-to-r from-[#FF7A59] to-amber-500 text-white shadow-[#FF7A59]/30 hover:opacity-95'
                  : 'bg-zinc-100 text-zinc-500 border border-zinc-200 hover:bg-zinc-200'
              }`}
            >
              <Check size={16} strokeWidth={2.5} />
              {isAllStepsDone ? 'Complete Flow Goal 🎉' : 'Attempt Flow Completion'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
