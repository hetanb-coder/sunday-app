import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { TabType, Task, ToastMessage } from '../types';

interface WeaveContextType {
  tasks: Task[];

  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;

  toast: ToastMessage | null;
  showToast: (
    text: string,
    type?: 'error' | 'success' | 'info'
  ) => void;

  shakingTaskId: string | null;

  toggleTaskComplete: (taskId: string) => boolean;
  toggleMicroStep: (
    taskId: string,
    stepId: string
  ) => void;

  addMicroStep: (
    taskId: string,
    title: string
  ) => void;

  addTask: (
    task: Omit<
      Task,
      'id' | 'createdAt' | 'completed'
    >
  ) => void;

  addTasksFromVoice: (
    newTasks: Omit<
      Task,
      'id' | 'createdAt' | 'completed'
    >[]
  ) => void;

  setFocusHero: (taskId: string) => void;
  deleteTask: (taskId: string) => void;

  isPro: boolean;
  setIsPro: (pro: boolean) => void;

  activeMicroStepModalTask: Task | null;
  setActiveMicroStepModalTask: (
    task: Task | null
  ) => void;

  isNewTaskModalOpen: boolean;
  setIsNewTaskModalOpen: (
    open: boolean
  ) => void;
}

const STORAGE_KEY = 'weave_tasks_v2';

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
      {
        id: 'm-101',
        title:
          'Open slide application & pick minimal template',
        completed: true,
      },
      {
        id: 'm-102',
        title:
          'Write 1-sentence core problem statement',
        completed: true,
      },
      {
        id: 'm-103',
        title:
          'List 3 key feature highlights',
        completed: false,
      },
      {
        id: 'm-104',
        title: 'Add call to action slide',
        completed: false,
      },
    ],
  },
  {
    id: 'task-2',
    title: 'Reset Workspace & Desk',
    category: 'life',
    timeEstimateMinutes: 10,
    completed: false,
    createdAt: new Date().toISOString(),
    microSteps: [
      {
        id: 'm-201',
        title: 'Clear empty cups & mugs',
        completed: true,
      },
      {
        id: 'm-202',
        title:
          'File loose paper notes into drawer',
        completed: false,
      },
      {
        id: 'm-203',
        title:
          'Wipe down keyboard & desk mat',
        completed: false,
      },
    ],
  },
  {
    id: 'task-3',
    title: 'Mindful Morning Stretch',
    category: 'health',
    timeEstimateMinutes: 8,
    completed: false,
    createdAt: new Date().toISOString(),
    microSteps: [
      {
        id: 'm-301',
        title:
          '2 minutes neck & shoulder rolls',
        completed: true,
      },
      {
        id: 'm-302',
        title:
          'Hamstring stretch left & right side',
        completed: true,
      },
    ],
  },
  {
    id: 'task-4',
    title:
      'Quarterly Budget & Savings Goal',
    category: 'money',
    timeEstimateMinutes: 15,
    completed: false,
    createdAt: new Date().toISOString(),
    microSteps: [
      {
        id: 'm-401',
        title: 'Review last month cash flow',
        completed: true,
      },
      {
        id: 'm-402',
        title:
          'Set aside 20% into High Yield account',
        completed: false,
      },
    ],
  },
  {
    id: 'task-5',
    title: 'Read Chapter 4 of Deep Work',
    category: 'growth',
    timeEstimateMinutes: 15,
    completed: false,
    createdAt: new Date().toISOString(),
    microSteps: [
      {
        id: 'm-501',
        title: 'Set 15 minute timer',
        completed: true,
      },
      {
        id: 'm-502',
        title:
          'Highlight 3 actionable key takeaways',
        completed: false,
      },
    ],
  },
];

const WeaveContext =
  createContext<WeaveContextType | undefined>(
    undefined
  );

export const WeaveProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [tasks, setTasks] =
    useState<Task[]>(INITIAL_TASKS);

  const [activeTab, setActiveTab] =
    useState<TabType>('onboarding');

  const [toast, setToast] =
    useState<ToastMessage | null>(null);

  const [shakingTaskId, setShakingTaskId] =
    useState<string | null>(null);

  const [isPro, setIsPro] = useState(true);

  /*
   * IMPORTANT:
   * We now store ONLY the active task ID.
   *
   * The actual task object is always derived
   * directly from `tasks`, so the modal and
   * home screen can never get out of sync.
   */
  const [
    activeMicroStepModalTaskId,
    setActiveMicroStepModalTaskId,
  ] = useState<string | null>(null);

  const [
    isNewTaskModalOpen,
    setIsNewTaskModalOpen,
  ] = useState(false);

  /*
   * Always derive the modal task from
   * the latest tasks state.
   */
  const activeMicroStepModalTask =
    useMemo(() => {
      if (!activeMicroStepModalTaskId) {
        return null;
      }

      return (
        tasks.find(
          (task) =>
            task.id ===
            activeMicroStepModalTaskId
        ) ?? null
      );
    }, [
      tasks,
      activeMicroStepModalTaskId,
    ]);

  /*
   * Keep the existing public API so the
   * rest of your app doesn't need changing.
   *
   * Components can still call:
   *
   * setActiveMicroStepModalTask(task)
   *
   * but internally we only store its ID.
   */
  const setActiveMicroStepModalTask = (
    task: Task | null
  ) => {
    setActiveMicroStepModalTaskId(
      task?.id ?? null
    );
  };

  /* =====================================================
     STORAGE
  ===================================================== */

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(
      (saved) => {
        if (!saved) {
          return;
        }

        try {
          const parsed = JSON.parse(saved);
          setTasks(parsed);
        } catch {
          // Keep defaults if stored data is invalid.
        }
      }
    );
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(tasks)
    ).catch(() => undefined);
  }, [tasks]);

  /* =====================================================
     TOAST
  ===================================================== */

  const showToast = (
    text: string,
    type:
      | 'error'
      | 'success'
      | 'info' = 'info'
  ) => {
    const id = Date.now().toString();

    setToast({
      id,
      text,
      type,
    });

    setTimeout(() => {
      setToast((previous) =>
        previous?.id === id
          ? null
          : previous
      );
    }, 2600);
  };

  /* =====================================================
     TASK COMPLETION
  ===================================================== */

  const toggleTaskComplete = (
    taskId: string
  ) => {
    const task = tasks.find(
      (item) => item.id === taskId
    );

    if (!task) {
      return false;
    }

    const hasUncompletedSteps =
      task.microSteps.length > 0 &&
      task.microSteps.some(
        (step) => !step.completed
      );

    /*
     * Guardrail:
     * incomplete task cannot be marked complete
     * until all microsteps are done.
     */
    if (
      hasUncompletedSteps &&
      !task.completed
    ) {
      setShakingTaskId(taskId);

      setTimeout(() => {
        setShakingTaskId(null);
      }, 650);

      showToast(
        'Complete the small steps first',
        'error'
      );

      return false;
    }

    const nextCompletedState =
      !task.completed;

    setTasks((previous) =>
      previous.map((item) =>
        item.id === taskId
          ? {
              ...item,
              completed:
                nextCompletedState,
            }
          : item
      )
    );

    if (nextCompletedState) {
      showToast(
        'Goal completed — keep the momentum',
        'success'
      );
    } else {
      showToast(
        'Goal reopened',
        'info'
      );
    }

    return true;
  };

  /* =====================================================
     MICROSTEPS
  ===================================================== */

  const toggleMicroStep = (
    taskId: string,
    stepId: string
  ) => {
    setTasks((previous) =>
      previous.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        const updatedSteps =
          task.microSteps.map((step) =>
            step.id === stepId
              ? {
                  ...step,
                  completed:
                    !step.completed,
                }
              : step
          );

        const allStepsComplete =
          updatedSteps.length > 0 &&
          updatedSteps.every(
            (step) => step.completed
          );

        /*
         * Important:
         *
         * If a completed goal has one of its
         * microsteps unticked, the overall goal
         * automatically becomes incomplete.
         *
         * This ensures "Reopen Goal" cannot remain
         * visible when the underlying task is no
         * longer fully complete.
         */
        const nextCompleted =
          task.completed &&
          allStepsComplete;

        return {
          ...task,
          microSteps: updatedSteps,
          completed: nextCompleted,
        };
      })
    );
  };

  const addMicroStep = (
    taskId: string,
    title: string
  ) => {
    if (!title.trim()) {
      return;
    }

    const newStep = {
      id: `m-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 6)}`,
      title: title.trim(),
      completed: false,
    };

    setTasks((previous) =>
      previous.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        return {
          ...task,
          microSteps: [
            ...task.microSteps,
            newStep,
          ],

          /*
           * Adding an unfinished microstep means
           * the task can't remain completed.
           */
          completed: false,
        };
      })
    );
  };

  /* =====================================================
     ADD TASK
  ===================================================== */

  const addTask = (
    taskData: Omit<
      Task,
      'id' | 'createdAt' | 'completed'
    >
  ) => {
    const newTask: Task = {
      ...taskData,
      id: `task-${Date.now()}`,
      createdAt:
        new Date().toISOString(),
      completed: false,
    };

    setTasks((previous) => {
      if (newTask.isFocusHero) {
        const clearedTasks: Task[] = previous.map((task) => ({
          ...task,
          isFocusHero: false,
        }));
    
        return [
          ...clearedTasks,
          newTask,
        ];
      }
    
      return [
        newTask,
        ...previous,
      ];
    });

    showToast(
      'Task added to your Daily Flow',
      'success'
    );
  };

  /* =====================================================
     VOICE TASKS
  ===================================================== */

  const addTasksFromVoice = (
    newTasksData: Omit<
      Task,
      'id' | 'createdAt' | 'completed'
    >[]
  ) => {
    const timestamp = Date.now();

    const created =
      newTasksData.map(
        (task, index) => ({
          ...task,
          id: `voice-${timestamp}-${index}`,
          createdAt:
            new Date().toISOString(),
          completed: false,
        })
      );

    setTasks((previous) => [
      ...created,
      ...previous,
    ]);

    showToast(
      `Added ${created.length} voice ${
        created.length === 1
          ? 'goal'
          : 'goals'
      } to your Flow`,
      'success'
    );
  };

  /* =====================================================
     FOCUS HERO
  ===================================================== */

  const setFocusHero = (
    taskId: string
  ) => {
    setTasks((previous) =>
      previous.map((task) => ({
        ...task,
        isFocusHero:
          task.id === taskId,
      }))
    );

    showToast(
      'Updated active focus task',
      'info'
    );
  };

  /* =====================================================
     DELETE
  ===================================================== */

  const deleteTask = (
    taskId: string
  ) => {
    setTasks((previous) =>
      previous.filter(
        (task) =>
          task.id !== taskId
      )
    );

    if (
      activeMicroStepModalTaskId ===
      taskId
    ) {
      setActiveMicroStepModalTaskId(
        null
      );
    }

    showToast(
      'Task removed',
      'info'
    );
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
  const context =
    useContext(WeaveContext);

  if (!context) {
    throw new Error(
      'useWeave must be used within WeaveProvider'
    );
  }

  return context;
};