import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Sparkles, Clock, ListPlus, Flame } from 'lucide-react';
import { useWeave } from '../context/WeaveContext';
import { Task } from '../types';

export const NewTaskModal: React.FC = () => {
  const { isNewTaskModalOpen, setIsNewTaskModalOpen, addTask } = useWeave();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Task['category']>('work');
  const [timeEstimate, setTimeEstimate] = useState(15);
  const [isFocusHero, setIsFocusHero] = useState(false);
  const [microStepsText, setMicroStepsText] = useState('');

  if (!isNewTaskModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const rawSteps = microStepsText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const microSteps =
      rawSteps.length > 0
        ? rawSteps.map((step, i) => ({ id: 'm-new-' + i, title: step, completed: false }))
        : [
            { id: 'm-new-1', title: 'Open workspace & prep notes', completed: false },
            { id: 'm-new-2', title: 'Execute first 5 minutes of effort', completed: false },
            { id: 'm-new-3', title: 'Review and mark complete', completed: false },
          ];

    addTask({
      title: title.trim(),
      category,
      timeEstimateMinutes: Number(timeEstimate),
      isFocusHero,
      microSteps,
    });

    setTitle('');
    setMicroStepsText('');
    setIsNewTaskModalOpen(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsNewTaskModalOpen(false)}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl z-10 overflow-hidden"
        >
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#FF7A59]/10 text-[#FF7A59] flex items-center justify-center">
                <Sparkles size={16} />
              </div>
              <h2 className="text-lg font-bold text-zinc-900">Weave New Goal</h2>
            </div>
            <button
              onClick={() => setIsNewTaskModalOpen(false)}
              className="text-zinc-400 hover:text-zinc-600 p-1 rounded-full hover:bg-zinc-100"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Goal Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Prepare client proposal"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF7A59]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#FF7A59]"
                >
                  <option value="work">Work</option>
                  <option value="personal">Personal</option>
                  <option value="health">Health</option>
                  <option value="creative">Creative</option>
                  <option value="quick">Quick</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Time (mins)</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={timeEstimate}
                  onChange={(e) => setTimeEstimate(Number(e.target.value))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#FF7A59]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Micro-steps (1 per line, optional)
              </label>
              <textarea
                rows={3}
                placeholder="Step 1: Open document&#10;Step 2: Draft outline&#10;Step 3: Review section"
                value={microStepsText}
                onChange={(e) => setMicroStepsText(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-3 text-xs focus:outline-none focus:border-[#FF7A59]"
              />
              <p className="text-[10px] text-zinc-400 mt-1">
                If left blank, Weave will auto-generate 3 low-friction micro-steps.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isFocusHero"
                checked={isFocusHero}
                onChange={(e) => setIsFocusHero(e.target.checked)}
                className="w-4 h-4 rounded text-[#FF7A59] focus:ring-[#FF7A59]"
              />
              <label htmlFor="isFocusHero" className="text-xs font-medium text-zinc-700 flex items-center gap-1 cursor-pointer">
                <Flame size={14} className="text-amber-500" /> Set as Active Focus Hero Card
              </label>
            </div>

            <button
              type="submit"
              className="w-full mt-2 bg-gradient-to-r from-[#FF7A59] to-[#FF9E85] text-white font-bold text-xs py-3.5 rounded-2xl shadow-lg shadow-[#FF7A59]/30 hover:opacity-95 transition-all"
            >
              Add to Daily Flow
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
