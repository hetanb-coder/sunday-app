import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  Square,
  Sparkles,
  ArrowRight,
  Layers,
  CheckCircle2,
  Volume2,
  RefreshCw,
  Plus,
  Flame,
  Wand2,
} from 'lucide-react';
import { useWeave } from '../context/WeaveContext';
import { Task } from '../types';

export const InteractiveVoiceDemoScreen: React.FC = () => {
  const { addTasksFromVoice, setActiveTab } = useWeave();

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [deconstructedTasks, setDeconstructedTasks] = useState<
    Omit<Task, 'id' | 'createdAt' | 'completed'>[]
  >([]);

  // Speech recognition setup if supported by browser
  useEffect(() => {
    let recognition: any = null;
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let currentText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript;
        }
        setTranscript(currentText);
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition error', e);
      };
    }

    return () => {
      if (recognition && isRecording) recognition.stop();
    };
  }, []);

  const handleToggleRecord = () => {
    if (!isRecording) {
      setIsRecording(true);
      setTranscript('');
      setDeconstructedTasks([]);

      // Start simulated speech transcript if browser audio isn't dictated immediately
      const defaultPhrases = [
        "I need to prep for the pitch deck presentation, reply to Sarah's email about design feedback, and organize my study desk for tomorrow morning.",
        "Buy groceries for dinner including spinach and salmon, schedule dentist appointment, and finish the 3 slides for the sprint review.",
        "Take a 10 minute walk outside, water the desk succulent, and review the project budget spreadsheet.",
      ];
      const selectedPhrase = defaultPhrases[Math.floor(Math.random() * defaultPhrases.length)];

      let charIdx = 0;
      const interval = setInterval(() => {
        charIdx += 4;
        setTranscript(selectedPhrase.slice(0, charIdx));
        if (charIdx >= selectedPhrase.length) {
          clearInterval(interval);
        }
      }, 100);
    } else {
      setIsRecording(false);
      processTranscript(transcript || "Clean up my workspace, organize my email inbox, and draft the weekly progress update.");
    }
  };

  const processTranscript = async (rawText: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/deconstruct-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: rawText }),
      });

      const data = await res.json();
      if (data.tasks && Array.isArray(data.tasks)) {
        setDeconstructedTasks(data.tasks);
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (err) {
      console.error('Error processing transcript:', err);
      // Local fallback task breakdown
      setDeconstructedTasks([
        {
          title: 'Organize study desk & papers',
          category: 'personal',
          timeEstimateMinutes: 10,
          microSteps: [
            { id: 'v-1', title: 'Trash loose paper scraps', completed: false },
            { id: 'v-2', title: 'Put pens & pencils in mug', completed: false },
            { id: 'v-3', title: 'Wipe desktop surface', completed: false },
          ],
        },
        {
          title: 'Reply to Sarah design review email',
          category: 'work',
          timeEstimateMinutes: 8,
          microSteps: [
            { id: 'v-4', title: 'Open email client inbox', completed: false },
            { id: 'v-5', title: 'Type 3 bullet points feedback', completed: false },
            { id: 'v-6', title: 'Hit send & archive thread', completed: false },
          ],
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWeaveIntoFlow = () => {
    if (deconstructedTasks.length === 0) return;
    addTasksFromVoice(deconstructedTasks);
    setActiveTab('home');
  };

  return (
    <div className="pb-44 pt-4 px-4 max-w-md mx-auto min-h-screen flex flex-col justify-between">
      {/* Header */}
      <header className="flex items-center justify-between mb-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF7A59] bg-[#FF7A59]/10 px-2.5 py-0.5 rounded-full">
            ADHD Brain Dump
          </span>
          <h1 className="text-xl font-black text-zinc-900 mt-1">Voice Deconstruction</h1>
        </div>
        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#FF7A59] to-[#FF9E85] text-white flex items-center justify-center shadow-md shadow-[#FF7A59]/20">
          <Wand2 size={18} />
        </div>
      </header>

      {/* Spoken Transcript display box */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/90 rounded-3xl p-5 shadow-sm min-h-[120px] flex flex-col justify-between mb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
            Spoken Raw Thoughts
          </span>
          <p className="text-sm font-medium text-zinc-800 leading-relaxed italic">
            {transcript ? `"${transcript}"` : 'Tap the microphone below and speak freely. Weave will parse your overwhelm into bite-sized micro-steps...'}
          </p>
        </div>

        {transcript && (
          <div className="flex justify-end pt-2">
            <button
              onClick={() => setTranscript('')}
              className="text-[10px] font-bold text-zinc-400 hover:text-zinc-600"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Processing State indicator */}
      {isProcessing && (
        <div className="my-6 text-center py-8 bg-white/70 backdrop-blur-md rounded-3xl border border-white/80 p-6 shadow-sm">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
            className="w-10 h-10 border-3 border-[#FF7A59] border-t-transparent rounded-full mx-auto mb-3"
          />
          <p className="text-xs font-bold text-zinc-800">Gemini AI Deconstructing Voice Thoughts...</p>
          <p className="text-[11px] text-zinc-400 mt-1">Creating ultra-low-friction micro-steps for flow state.</p>
        </div>
      )}

      {/* Deconstructed Tasks Preview */}
      {deconstructedTasks.length > 0 && !isProcessing && (
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 flex items-center gap-1">
              <Sparkles size={14} /> Weaved Flow Tasks ({deconstructedTasks.length})
            </span>
          </div>

          {deconstructedTasks.map((task, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-3xl p-4 shadow-sm border border-zinc-100"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#FF7A59] bg-[#FF7A59]/10 px-2 py-0.5 rounded-full">
                  {task.category} • {task.timeEstimateMinutes} min
                </span>
              </div>
              <h3 className="text-sm font-bold text-zinc-900 mb-2">{task.title}</h3>

              <div className="space-y-1.5 bg-zinc-50 p-2.5 rounded-2xl border border-zinc-100">
                {task.microSteps.map((step, sIdx) => (
                  <div key={sIdx} className="flex items-center gap-2 text-[11px] font-medium text-zinc-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FF7A59]" />
                    <span>{step.title}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}

          <button
            onClick={handleWeaveIntoFlow}
            className="w-full py-3.5 bg-gradient-to-r from-[#FF7A59] to-amber-500 text-white font-bold text-xs rounded-2xl shadow-xl shadow-[#FF7A59]/25 flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
          >
            <CheckCircle2 size={16} />
            Weave All Into Daily Flow Dashboard
          </button>
        </div>
      )}

      {/* IMMERSIVE VOICE DOCK EXPANDING ORANGE GRADIENT ARCH */}
      <div className="relative mt-4">
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 160, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="w-full bg-gradient-to-t from-[#FF7A59] via-[#FF8A6B] to-[#FF9E85] rounded-t-[48px] p-6 shadow-2xl flex flex-col items-center justify-center text-white overflow-hidden relative"
            >
              {/* Sound Wave Animation Visualizer */}
              <div className="flex items-center justify-center gap-1.5 mb-3 h-10">
                {[...Array(9)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      scaleY: [0.3, 1.8, 0.4, 2.2, 0.5],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.8,
                      delay: i * 0.08,
                    }}
                    className="w-1.5 bg-white rounded-full h-8 origin-center"
                  />
                ))}
              </div>
              <p className="text-xs font-bold uppercase tracking-widest animate-pulse">
                Listening & Parsing Thoughts...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Microphone Button Container */}
        <div className="bg-white/90 backdrop-blur-2xl border border-white p-4 rounded-3xl shadow-xl flex items-center justify-between">
          <div className="text-left">
            <span className="text-xs font-bold text-zinc-800 block">
              {isRecording ? 'Recording active...' : 'Speak your brain dump'}
            </span>
            <span className="text-[10px] text-zinc-400 font-medium">
              Tap mic button to start/stop
            </span>
          </div>

          <button
            onClick={handleToggleRecord}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl transition-all duration-300 ${
              isRecording
                ? 'bg-zinc-900 scale-110 shadow-black/30'
                : 'bg-gradient-to-tr from-[#FF7A59] to-[#FF9E85] shadow-[#FF7A59]/40 hover:scale-105'
            }`}
          >
            {isRecording ? <Square size={20} fill="white" /> : <Mic size={24} />}
          </button>
        </div>
      </div>
    </div>
  );
};
