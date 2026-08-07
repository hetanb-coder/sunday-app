import React, { createContext, useContext, useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Task, TabType, ToastMessage } from '../types';

interface WeaveContextType {
  tasks: Task[];
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  toast: ToastMessage | null;
  showToast: (text: string, type?: 'error' | 'success' | 'info') => void;
  shakingTaskId: string | null;
  toggleTaskComplete: (taskId: string) => boolean;
  toggleMicroStep: (taskId: string, stepId: string) => void;
  addMicroStep: (taskId: string, title: string) => void;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'completed'>) => void;
  addTasksFromVoice: (newTasks: Omit<Task, 'id' | 'createdAt' | 'completed'>[]) => void;
  setFocusHero: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  isPro: boolean;
  setIsPro: (pro: boolean) => void;
  activeMicroStepModalTask: Task | null;
  setActiveMicroStepModalTask: (task: Task | null) => void;
  isNewTaskModalOpen: boolean;
  setIsNewTaskModalOpen: (open: boolean) => void;
}

const INITIAL_TASKS: Task[] = [
  {
    id: 'hero-1',
    title: 'Draft Product Pitch Deck',
    category: 'work',
    timeEstimateMinutes: 20,
    isFocusHero: true,
    completed: false,
    createdAt: new Date().toISOString(),
    microSteps: [
      { id: 'm-101', title: 'Open slide application & pick minimal template', completed: true },
      { id: 'm-102', title: 'Write 1-sentence core problem statement', completed: true },
      { id: 'm-103', title: 'List 3 key feature highlights', completed: false },
      { id: 'm-104', title: 'Add call to action slide', completed: false },
    ],
  },
  {
    id: 'task-2',
    title: 'Reset Workspace & Desk',
    category: 'life',
    timeEstimateMinutes: 10,
    isFocusHero: false,
    completed: false,
    createdAt: new Date().toISOString(),
    microSteps: [
      { id: 'm-201', title: 'Clear empty cups & mugs', completed: true },
      { id: 'm-202', title: 'File loose paper notes into drawer', completed: false },
      { id: 'm-203', title: 'Wipe down keyboard & desk mat', completed: false },
    ],
  },
  {
    id: 'task-3',
    title: 'Mindful Morning Stretch',
    category: 'health',
    timeEstimateMinutes: 8,
    isFocusHero: false,
    completed: false,
    createdAt: new Date().toISOString(),
    microSteps: [
      { id: 'm-301', title: '2 minutes neck & shoulder rolls', completed: true },
      { id: 'm-302', title: 'Hamstring stretch left & right side', completed: true },
    ],
  },
  {
    id: 'task-[#4]',
    title: 'Quarterly Budget & Savings Goal',
    category: 'money',
    timeEstimateMinutes: 15,
    isFocusHero: false,
    completed: false,
    createdAt: new Date().toISOString(),
    microSteps: [
      { id: 'm-401', title: 'Review last month cash flow', completed: true },
      { id: 'm-402', title: 'Set aside 20% into High Yield account', completed: false },
    ],
  },
  {
    id: 'task-5',
    title: 'Read Chapter 4 of Deep Work',
    category: 'growth',
    timeEstimateMinutes: 15,
    isFocusHero: false,
    completed: false,
    createdAt: new Date().toISOString(),
    microSteps: [
      { id: 'm-501', title: 'Set 15 minute timer', completed: true },
      { id: 'm-502', title: 'Highlight 3 actionable key takeaways', completed: false },
    ],
  },
];

const WeaveContext = createContext<WeaveContextType | undefined>(undefined);

export const WeaveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem('weave_tasks_v2');
      return saved ? JSON.parse(saved) : INITIAL_TASKS;
    } catch {
      return INITIAL_TASKS;
    }
  });

  const [activeTab, setActiveTab] = useState<TabType>('onboarding');
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [shakingTaskId, setShakingTaskId] = useState<string | null>(null);
  const [isPro, setIsPro] = useState<boolean>(true);
  const [activeMicroStepModalTask, setActiveMicroStepModalTask] = useState<Task | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem('weave_tasks_v2', JSON.stringify(tasks));
    } catch (e) {
      console.error(e);
    }
  }, [tasks]);

  const showToast = (text: string, type: 'error' | 'success' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToast({ id, text, type });
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 3200);
  };

  const toggleTaskComplete = (taskId: string): boolean => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return false;

    // Guardrail Check: Are all micro-steps checked?
    const hasUncompletedSteps = task.microSteps.length > 0 && task.microSteps.some((s) => !s.completed);

    if (hasUncompletedSteps && !task.completed) {
      // Trigger ADHD shake animation & toast error!
      setShakingTaskId(taskId);
      setTimeout(() => setShakingTaskId(null), 650);

      showToast('Complete all micro-steps first to unlock flow completion! ✨', 'error');
      return false;
    }

    const nextCompletedState = !task.completed;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return { ...t, completed: nextCompletedState };
        }
        return t;
      })
    );

    if (nextCompletedState) {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#FF7A59', '#FFB399', '#9C88FF', '#FFD166'],
      });
      showToast('Goal completed! Keep momentum going 🔥', 'success');
    }

    return true;
  };

  const toggleMicroStep = (taskId: string, stepId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const updatedSteps = t.microSteps.map((s) =>
            s.id === stepId ? { ...s, completed: !s.completed } : s
          );
          if (activeMicroStepModalTask?.id === taskId) {
            setActiveMicroStepModalTask({ ...t, microSteps: updatedSteps });
          }
          return { ...t, microSteps: updatedSteps };
        }
        return t;
      })
    );
  };

  const addMicroStep = (taskId: string, title: string) => {
    if (!title.trim()) return;
    const newStep = {
      id: 'm-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      title: title.trim(),
      completed: false,
    };

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const updatedSteps = [...t.microSteps, newStep];
          if (activeMicroStepModalTask?.id === taskId) {
            setActiveMicroStepModalTask({ ...t, microSteps: updatedSteps });
          }
          return { ...t, microSteps: updatedSteps };
        }
        return t;
      })
    );
  };

  const addTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'completed'>) => {
    const newTask: Task = {
      ...taskData,
      id: 'task-' + Date.now(),
      createdAt: new Date().toISOString(),
      completed: false,
    };
    if (newTask.isFocusHero) {
      setTasks((prev) => prev.map((t) => ({ ...t, isFocusHero: false })).concat(newTask));
    } else {
      setTasks((prev) => [newTask, ...prev]);
    }
    showToast('Task added to your Daily Flow', 'success');
  };

  const addTasksFromVoice = (newTasksData: Omit<Task, 'id' | 'createdAt' | 'completed'>[]) => {
    const created: Task[] = newTasksData.map((t, idx) => ({
      ...t,
      id: 'voice-' + Date.now() + '-' + idx,
      createdAt: new Date().toISOString(),
      completed: false,
    }));

    setTasks((prev) => [...created, ...prev]);
    showToast(`Weaved ${created.length} voice thoughts into your Flow! 🌊`, 'success');
  };

  const setFocusHero = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => ({
        ...t,
        isFocusHero: t.id === taskId,
      }))
    );
    showToast('Updated active focus task', 'info');
  };

  const deleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (activeMicroStepModalTask?.id === taskId) {
      setActiveMicroStepModalTask(null);
    }
    showToast('Task removed', 'info');
  };

  return (
    <WeaveContext.Provider
      value={{
        tasks,
        activeTab,
        setActiveTab,
        toast,
        showToast,
        shakingTaskId,
        toggleTaskComplete,
        toggleMicroStep,
        addMicroStep,
        addTask,
        addTasksFromVoice,
        setFocusHero,
        deleteTask,
        isPro,
        setIsPro,
        activeMicroStepModalTask,
        setActiveMicroStepModalTask,
        isNewTaskModalOpen,
        setIsNewTaskModalOpen,
      }}
    >
      {children}
    </WeaveContext.Provider>
  );
};

export const useWeave = () => {
  const context = useContext(WeaveContext);
  if (!context) throw new Error('useWeave must be used within WeaveProvider');
  return context;
};
