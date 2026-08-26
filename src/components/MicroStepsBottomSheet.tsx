import {
  Check,
  Flame,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useState } from 'react';
import { useWeave } from '../context/WeaveContext';
import { getCategoryColors, getCategoryName } from '../theme';

type CategoryTheme = {
  accent: string;
  soft: string;
  border: string;
  name: string;
};

function getCategoryTheme(category: string): CategoryTheme {
  const family = getCategoryColors(category);
  return {
    accent: family.accent,
    soft: family.surfaceSoft,
    border: `${family.accent}3D`,
    name: getCategoryName(category),
  };
}

export const MicroStepsBottomSheet: React.FC = () => {
  const {
    activeMicroStepModalTask,
    setActiveMicroStepModalTask,
    toggleMicroStep,
    toggleTaskComplete,
    deleteTask,
    addMicroStep,
  } = useWeave();

  const [newStepText, setNewStepText] = useState('');

  const task = activeMicroStepModalTask;

  const handleAddStep = (event: React.FormEvent) => {
    event.preventDefault();

    if (!task || !newStepText.trim()) {
      return;
    }

    addMicroStep(task.id, newStepText.trim());
    setNewStepText('');
  };

  return (
    <AnimatePresence>
      {task && (
        <motion.div
          key="microsteps-overlay"
          className="absolute inset-0 z-50 flex items-end justify-center"
          initial={false}
        >
          {/* =====================================================
              BACKDROP

              This layer ONLY fades.
              It never moves with the bottom sheet.
          ===================================================== */}
          <motion.div
            key="microsteps-backdrop"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.2,
              ease: 'easeOut',
            }}
            onClick={() => setActiveMicroStepModalTask(null)}
          />

          {/* =====================================================
              BOTTOM SHEET

              The task ID is the key.

              Updating a microstep does NOT change the task ID,
              so this sheet stays mounted instead of replaying
              its entrance animation.
          ===================================================== */}
          <TaskSheet
            key={task.id}
            task={task}
            newStepText={newStepText}
            setNewStepText={setNewStepText}
            handleAddStep={handleAddStep}
            close={() => setActiveMicroStepModalTask(null)}
            toggleMicroStep={toggleMicroStep}
            toggleTaskComplete={toggleTaskComplete}
            deleteTask={deleteTask}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

type TaskSheetProps = {
  task: NonNullable<
    ReturnType<typeof useWeave>['activeMicroStepModalTask']
  >;
  newStepText: string;
  setNewStepText: (value: string) => void;
  handleAddStep: (event: React.FormEvent) => void;
  close: () => void;
  toggleMicroStep: (taskId: string, stepId: string) => void;
  toggleTaskComplete: (taskId: string) => boolean;
  deleteTask: (taskId: string) => void;
};

function TaskSheet({
  task,
  newStepText,
  setNewStepText,
  handleAddStep,
  close,
  toggleMicroStep,
  toggleTaskComplete,
  deleteTask,
}: TaskSheetProps) {
  const completedStepsCount = task.microSteps.filter(
    (step) => step.completed
  ).length;

  const totalStepsCount = task.microSteps.length;

  const progressPercent =
    totalStepsCount > 0
      ? Math.round(
          (completedStepsCount / totalStepsCount) * 100
        )
      : 0;

  const isAllStepsDone =
    totalStepsCount > 0 &&
    completedStepsCount === totalStepsCount;

  const canReopen =
    task.completed && isAllStepsDone;

  const theme = getCategoryTheme(task.category);

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{
        type: 'spring',
        stiffness: 360,
        damping: 34,
        mass: 0.9,
      }}
      drag="y"
      dragDirectionLock
      dragConstraints={{
        top: 0,
        bottom: 280,
      }}
      dragElastic={{
        top: 0,
        bottom: 0.12,
      }}
      onDragEnd={(_, info) => {
        if (
          info.offset.y > 120 ||
          info.velocity.y > 700
        ) {
          close();
        }
      }}
      className="
        relative
        z-10
        w-full
        max-w-lg
        max-h-[85vh]
        bg-white
        rounded-t-[32px]
        px-6
        pt-3
        pb-6
        shadow-2xl
        flex
        flex-col
        overflow-hidden
      "
      style={{
        borderTop: `1px solid ${theme.border}`,
      }}
    >
      {/* Pull indicator */}
      <div
        className="
          w-11
          h-1.5
          bg-zinc-200
          rounded-full
          mx-auto
          mb-4
          shrink-0
          cursor-grab
          active:cursor-grabbing
        "
      />

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex items-start justify-between gap-3 mb-4 shrink-0">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className="
                text-[10px]
                uppercase
                tracking-wider
                font-extrabold
                px-2.5
                py-1
                rounded-full
              "
              style={{
                color: theme.accent,
                backgroundColor: theme.soft,
                border: `1px solid ${theme.border}`,
              }}
            >
              {theme.name} • {task.timeEstimateMinutes} min
            </span>

            {task.isFocusHero && (
              <span
                className="
                  text-[10px]
                  uppercase
                  tracking-wider
                  font-bold
                  text-amber-600
                  bg-amber-50
                  border
                  border-amber-200/70
                  px-2.5
                  py-1
                  rounded-full
                  flex
                  items-center
                  gap-1
                "
              >
                <Flame
                  size={10}
                  fill="currentColor"
                />
                Focus
              </span>
            )}
          </div>

          <h2 className="text-xl font-extrabold text-zinc-900 leading-snug tracking-tight">
            {task.title}
          </h2>
        </div>

        <button
          type="button"
          onClick={close}
          className="
            shrink-0
            w-9
            h-9
            rounded-full
            bg-zinc-100
            text-zinc-400
            flex
            items-center
            justify-center
            hover:bg-zinc-200
            hover:text-zinc-600
            active:scale-95
            transition-all
          "
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* =====================================================
          GUARDRAIL PROGRESS
      ===================================================== */}

      <div
        className="
          rounded-2xl
          p-3.5
          mb-4
          shrink-0
          border
        "
        style={{
          backgroundColor: theme.soft,
          borderColor: theme.border,
        }}
      >
        <div className="flex justify-between items-center gap-3 text-xs font-semibold text-zinc-700 mb-2">
          <span className="flex items-center gap-1.5">
            <ShieldCheck
              size={14}
              style={{
                color: theme.accent,
              }}
            />

            Micro-step Guardrail
          </span>

          <span
            className="font-extrabold whitespace-nowrap"
            style={{
              color: theme.accent,
            }}
          >
            {completedStepsCount}/{totalStepsCount}
          </span>
        </div>

        <div className="w-full bg-white/70 h-2 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              backgroundColor: theme.accent,
            }}
            initial={false}
            animate={{
              width: `${progressPercent}%`,
            }}
            transition={{
              duration: 0.28,
              ease: 'easeOut',
            }}
          />
        </div>

        <div className="flex justify-between items-center mt-1.5">
          <span className="text-[9px] font-medium text-zinc-400">
            Small steps first
          </span>

          <span
            className="text-[9px] font-bold"
            style={{
              color: theme.accent,
            }}
          >
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* =====================================================
          MICROSTEPS

          Notice there are NO entry animations on each row.

          When a step changes, only its visual state changes.
          The row doesn't "re-enter".
      ===================================================== */}

      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 my-1">
        {task.microSteps.map((step) => (
          <button
            type="button"
            key={step.id}
            onClick={() =>
              toggleMicroStep(task.id, step.id)
            }
            className={`
              group
              w-full
              flex
              items-center
              gap-3
              p-3.5
              rounded-2xl
              border
              text-left
              cursor-pointer
              transition-[background-color,border-color,transform]
              duration-150
              active:scale-[0.985]
              ${
                step.completed
                  ? 'bg-zinc-50/70 border-zinc-200/70'
                  : 'bg-white border-zinc-200 hover:border-zinc-300'
              }
            `}
          >
            <span
              className="
                w-6
                h-6
                rounded-full
                flex
                items-center
                justify-center
                shrink-0
                border-2
                transition-all
                duration-150
              "
              style={
                step.completed
                  ? {
                      backgroundColor:
                        theme.accent,
                      borderColor:
                        theme.accent,
                      color: '#FFFFFF',
                    }
                  : {
                      backgroundColor:
                        '#FFFFFF',
                      borderColor:
                        '#D4D4D8',
                    }
              }
            >
              {step.completed && (
                <Check
                  size={13}
                  strokeWidth={3}
                />
              )}
            </span>

            <span
              className={`
                text-xs
                font-semibold
                flex-1
                transition-colors
                ${
                  step.completed
                    ? 'line-through text-zinc-400'
                    : 'text-zinc-700'
                }
              `}
            >
              {step.title}
            </span>
          </button>
        ))}

        {/* ===================================================
            ADD MICROSTEP

            Now uses addMicroStep() from context.
            No direct task mutation.
        =================================================== */}

        <form
          onSubmit={handleAddStep}
          className="flex gap-2 pt-2"
        >
          <input
            type="text"
            placeholder="Add a tiny micro-step..."
            value={newStepText}
            onChange={(event) =>
              setNewStepText(
                event.target.value
              )
            }
            className="
              flex-1
              min-w-0
              bg-zinc-50
              border
              border-zinc-200
              rounded-xl
              px-3.5
              py-2.5
              text-xs
              font-medium
              text-zinc-800
              placeholder:text-zinc-400
              focus:outline-none
              transition-colors
            "
            style={{
              outlineColor:
                theme.accent,
            }}
          />

          <button
            type="submit"
            disabled={!newStepText.trim()}
            className="
              rounded-xl
              px-3.5
              py-2.5
              text-xs
              font-bold
              text-white
              flex
              items-center
              gap-1.5
              disabled:opacity-40
              active:scale-95
              transition-all
            "
            style={{
              backgroundColor:
                theme.accent,
            }}
          >
            <Plus size={14} />
            Add
          </button>
        </form>
      </div>

      {/* =====================================================
          ACTIONS
      ===================================================== */}

      <div className="pt-4 mt-3 border-t border-zinc-100 flex items-center justify-between gap-3 shrink-0">
        <button
          type="button"
          onClick={() =>
            deleteTask(task.id)
          }
          className="
            w-11
            h-11
            text-zinc-400
            hover:text-rose-500
            hover:bg-rose-50
            rounded-xl
            flex
            items-center
            justify-center
            transition-all
            active:scale-95
          "
          title="Delete goal"
        >
          <Trash2 size={18} />
        </button>

        <button
          type="button"
          onClick={() => {
            const success =
              toggleTaskComplete(
                task.id
              );

            if (success) {
              close();
            }
          }}
          className="
            flex-1
            min-h-12
            py-3
            px-4
            rounded-2xl
            font-extrabold
            text-xs
            flex
            items-center
            justify-center
            gap-2
            transition-all
            active:scale-[0.985]
          "
          style={
            isAllStepsDone
              ? {
                  backgroundColor:
                    theme.accent,
                  color: '#FFFFFF',
                  boxShadow: `0 8px 22px ${theme.accent}38`,
                }
              : {
                  backgroundColor:
                    theme.soft,
                  color:
                    theme.accent,
                  border: `1px solid ${theme.border}`,
                }
          }
        >
          <Check
            size={16}
            strokeWidth={2.7}
          />

          {canReopen
            ? 'Reopen Goal'
            : isAllStepsDone
            ? 'Mark Complete'
            : 'Complete Micro-steps First'}
        </button>
      </div>
    </motion.div>
  );
}
