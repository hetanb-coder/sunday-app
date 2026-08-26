import {
  Check,
  ChevronRight,
  Clock,
  Flame,
  Layers,
  Plus,
  Sparkles,
  Zap,
} from 'lucide-react';
import { motion } from 'motion/react';
import React from 'react';

import { useWeave } from '../context/WeaveContext';
import { getCategoryColors, getCategoryName } from '../theme';

export interface CategoryTheme {
  name: string;
  hex: string;
  soft: string;
  border: string;
}

export function getCategoryTheme(category: string): CategoryTheme {
  const family = getCategoryColors(category);
  return {
    name: getCategoryName(category),
    hex: family.accent,
    soft: family.surfaceSoft,
    border: `${family.accent}3D`,
  };
}

export const HomeScreen: React.FC = () => {
  const {
    tasks,
    shakingTaskId,
    toggleTaskComplete,
    setFocusHero,
    setActiveTab,
    setActiveMicroStepModalTask,
    setIsNewTaskModalOpen,
  } = useWeave();

  const totalTasks = tasks.length;

  const completedTasks = tasks.filter(
    (task) => task.completed
  ).length;

  const remainingTasks = tasks.filter(
    (task) => !task.completed
  ).length;

  const momentumPercent =
    totalTasks > 0
      ? Math.round(
          (completedTasks / totalTasks) * 100
        )
      : 0;

  const focusHeroTask =
    tasks.find(
      (task) =>
        task.isFocusHero &&
        !task.completed
    ) ||
    tasks.find(
      (task) => !task.completed
    ) ||
    tasks[0];

  const regularTasks = tasks.filter(
    (task) =>
      task.id !== focusHeroTask?.id
  );

  return (
    <div
      className="
        relative
        min-h-screen
        pb-36
        pt-5
        px-4
        max-w-md
        mx-auto
        select-none
        bg-gradient-to-b
        from-[#FFF9F5]
        via-[#F7F1FA]
        to-[#FFF4F1]
      "
    >
      {/* =====================================================
          DAILY MOMENTUM HEADER
      ===================================================== */}

      <section className="mb-5">
        <h1 className="text-[27px] leading-none font-black tracking-[-0.8px] text-zinc-900">
          Daily Momentum
        </h1>

        <p className="text-[11px] text-zinc-400 font-semibold mt-2">
          {remainingTasks === 0
            ? 'You cleared the flow'
            : `${remainingTasks} ${
                remainingTasks === 1
                  ? 'goal'
                  : 'goals'
              } left today`}
        </p>
      </section>

      {/* =====================================================
          MOMENTUM CARD
      ===================================================== */}

      <section
        className="
          mb-6
          bg-white/80
          backdrop-blur-xl
          border
          border-white/90
          p-4
          rounded-[26px]
          shadow-[0_10px_30px_rgba(24,24,27,0.045)]
        "
      >
        <div className="flex justify-between items-center mb-3">
          <div>
            <p className="text-xs font-black text-zinc-800">
              Today&apos;s Progress
            </p>

            <p className="text-[10px] font-semibold text-zinc-400 mt-0.5">
              One small win at a time
            </p>
          </div>

          <div
            className="
              w-8
              h-8
              rounded-xl
              bg-[#FFF0EC]
              text-[#FF8F73]
              flex
              items-center
              justify-center
            "
          >
            <Zap
              size={15}
              strokeWidth={2.6}
              fill="currentColor"
            />
          </div>
        </div>

        <div className="flex items-end justify-between mb-2">
          <span className="text-base font-black text-[#FF8F73]">
            {completedTasks}/{totalTasks}
          </span>

          <span className="text-[10px] font-extrabold text-zinc-500">
            {momentumPercent}%
          </span>
        </div>

        <div className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden">
          <motion.div
            className="
              h-full
              rounded-full
              bg-gradient-to-r
              from-[#FF9A82]
              via-[#F6C45E]
              to-[#FFB39F]
            "
            initial={false}
            animate={{
              width: `${momentumPercent}%`,
            }}
            transition={{
              duration: 0.5,
              ease: 'easeOut',
            }}
          />
        </div>

        <div className="flex justify-between mt-2">
          <span className="text-[9px] font-semibold text-zinc-400">
            Momentum
          </span>

          <span className="text-[9px] font-semibold text-zinc-400">
            Keep moving forward
          </span>
        </div>
      </section>

      {/* =====================================================
          CURRENT FOCUS HERO
      ===================================================== */}

      {focusHeroTask && (() => {
        const theme = getCategoryTheme(
          focusHeroTask.category
        );

        const completedCount =
          focusHeroTask.microSteps.filter(
            (step) => step.completed
          ).length;

        const totalSteps =
          focusHeroTask.microSteps.length;

        const allStepsDone =
          totalSteps > 0 &&
          completedCount === totalSteps;

        return (
          <section className="mb-7">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <div
                  className="
                    w-6
                    h-6
                    rounded-lg
                    flex
                    items-center
                    justify-center
                  "
                  style={{
                    backgroundColor:
                      theme.soft,
                  }}
                >
                  <Flame
                    size={13}
                    style={{
                      color:
                        theme.hex,
                    }}
                    fill="currentColor"
                  />
                </div>

                <span
                  className="
                    text-[10px]
                    font-black
                    uppercase
                    tracking-[1px]
                  "
                  style={{
                    color:
                      theme.hex,
                  }}
                >
                  Current Focus
                </span>
              </div>

              <span className="text-[10px] font-semibold text-zinc-400">
                1 goal at a time
              </span>
            </div>

            <motion.div
              animate={
                shakingTaskId ===
                focusHeroTask.id
                  ? {
                      x: [
                        -10,
                        10,
                        -7,
                        7,
                        -4,
                        4,
                        0,
                      ],
                      rotate: [
                        -0.7,
                        0.7,
                        -0.4,
                        0.4,
                        0,
                      ],
                    }
                  : {}
              }
              transition={{
                duration: 0.42,
              }}
              onClick={() =>
                setActiveMicroStepModalTask(
                  focusHeroTask
                )
              }
              className="
                relative
                overflow-hidden
                text-white
                rounded-[30px]
                p-5
                cursor-pointer
                transition-transform
                hover:scale-[1.008]
                active:scale-[0.99]
              "
              style={{
                backgroundColor:
                  theme.hex,
                boxShadow:
                  `0 18px 38px ${theme.hex}35`,
              }}
            >
              {/* Ambient glow */}
              <div
                className="
                  absolute
                  -top-16
                  -right-14
                  w-48
                  h-48
                  rounded-full
                  blur-3xl
                  pointer-events-none
                "
                style={{
                  backgroundColor:
                    'rgba(255,255,255,0.2)',
                }}
              />

              {/* Top badges */}
              <div className="relative z-10 flex items-center justify-between gap-3 mb-4">
                <span
                  className="
                    text-[9px]
                    uppercase
                    tracking-[0.8px]
                    font-black
                    px-3
                    py-1.5
                    rounded-full
                    border
                    border-white/30
                    bg-white/15
                  "
                >
                  {theme.name} •{' '}
                  {focusHeroTask.timeEstimateMinutes}{' '}
                  min
                </span>

                <div
                  className="
                    flex
                    items-center
                    gap-1.5
                    text-[10px]
                    font-bold
                    bg-white/15
                    border
                    border-white/20
                    px-3
                    py-1.5
                    rounded-full
                  "
                >
                  <Layers size={12} />

                  <span>
                    {completedCount}/{totalSteps}
                  </span>

                  <ChevronRight size={12} />
                </div>
              </div>

              {/* Title */}
              <h2
                className={`
                  relative
                  z-10
                  text-[21px]
                  leading-[26px]
                  font-extrabold
                  tracking-[-0.4px]
                  mb-4
                  ${
                    focusHeroTask.completed
                      ? 'line-through opacity-60'
                      : ''
                  }
                `}
              >
                {focusHeroTask.title}
              </h2>

              {/* Preview steps */}
              <div className="relative z-10 space-y-2.5 mb-5">
                {focusHeroTask.microSteps.map(
                  (step) => (
                    <div
                      key={step.id}
                      className="
                        flex
                        items-center
                        gap-2.5
                        text-[11px]
                        font-semibold
                      "
                    >
                      <div
                        className={`
                          w-4
                          h-4
                          rounded-full
                          flex
                          items-center
                          justify-center
                          border
                          transition-all
                          ${
                            step.completed
                              ? 'bg-white border-white'
                              : 'border-white/55'
                          }
                        `}
                      >
                        {step.completed && (
                          <Check
                            size={10}
                            strokeWidth={3}
                            style={{
                              color:
                                theme.hex,
                            }}
                          />
                        )}
                      </div>

                      <span
                        className={
                          step.completed
                            ? 'line-through text-white/55'
                            : 'text-white/90'
                        }
                      >
                        {step.title}
                      </span>
                    </div>
                  )
                )}
              </div>

              {/* Footer */}
              <div
                className="
                  relative
                  z-10
                  flex
                  items-center
                  justify-between
                  gap-4
                  pt-4
                  border-t
                  border-white/20
                "
              >
                <div>
                  <p className="text-[8px] font-black tracking-[0.8px] text-white/70">
                    ADHD GUARDRAIL
                  </p>

                  <p className="text-[9px] font-semibold text-white/55 mt-1">
                    Complete every small step
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();

                    toggleTaskComplete(
                      focusHeroTask.id
                    );
                  }}
                  className="
                    min-w-[126px]
                    py-2.5
                    px-4
                    rounded-full
                    border
                    border-white/30
                    bg-white/15
                    text-white
                    text-[10px]
                    font-black
                    flex
                    items-center
                    justify-center
                    gap-2
                    transition-all
                    hover:bg-white/20
                    active:scale-95
                  "
                  style={
                    allStepsDone
                      ? {
                          backgroundColor:
                            'rgba(255,255,255,0.28)',
                          borderColor:
                            'rgba(255,255,255,0.55)',
                        }
                      : undefined
                  }
                >
                  <Check
                    size={14}
                    strokeWidth={3}
                  />

                  <span>
                    {focusHeroTask.completed
                      ? 'Done'
                      : 'Mark Complete'}
                  </span>
                </button>
              </div>
            </motion.div>
          </section>
        );
      })()}

      {/* =====================================================
          GOALS HEADER
      ===================================================== */}

      <section className="mb-3">
        <div className="flex items-end justify-between px-1">
          <div>
            <h3 className="text-[17px] leading-none font-black text-zinc-900 tracking-[-0.3px]">
              Your Goals
            </h3>

            <p className="text-[10px] font-semibold text-zinc-400 mt-1.5">
              Small steps. Real momentum.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setActiveTab('voice')
            }
            className="
              flex
              items-center
              gap-1.5
              text-[10px]
              font-extrabold
              text-[#F0785F]
              hover:opacity-75
              transition-opacity
            "
          >
            <Sparkles size={12} />
            Voice
          </button>
        </div>
      </section>

      {/* =====================================================
          REGULAR GOAL CARDS
      ===================================================== */}

      <section className="space-y-3">
        {regularTasks.length === 0 ? (
          <div
            className="
              text-center
              py-10
              bg-white/70
              backdrop-blur-xl
              rounded-[26px]
              border
              border-white/90
              shadow-sm
            "
          >
            <p className="text-xs text-zinc-500 font-semibold mb-4">
              All remaining goals are complete or in focus.
            </p>

            <button
              type="button"
              onClick={() =>
                setIsNewTaskModalOpen(true)
              }
              className="
                px-4
                py-2.5
                bg-zinc-900
                text-white
                text-xs
                font-bold
                rounded-full
                hover:bg-zinc-800
                transition-colors
              "
            >
              + New Goal
            </button>
          </div>
        ) : (
          regularTasks.map((task) => {
            const theme =
              getCategoryTheme(
                task.category
              );

            const completedCount =
              task.microSteps.filter(
                (step) =>
                  step.completed
              ).length;

            const totalSteps =
              task.microSteps.length;

            const progress =
              totalSteps > 0
                ? Math.round(
                    (completedCount /
                      totalSteps) *
                      100
                  )
                : 0;

            const allStepsDone =
              totalSteps > 0 &&
              completedCount ===
                totalSteps;

            const isShaking =
              shakingTaskId ===
              task.id;

            return (
              <motion.div
                key={task.id}
                animate={
                  isShaking
                    ? {
                        x: [
                          -9,
                          9,
                          -6,
                          6,
                          -3,
                          3,
                          0,
                        ],
                        rotate: [
                          -0.6,
                          0.6,
                          -0.3,
                          0.3,
                          0,
                        ],
                      }
                    : {}
                }
                transition={{
                  duration: 0.42,
                }}
                onClick={() =>
                  setActiveMicroStepModalTask(
                    task
                  )
                }
                className={`
                  relative
                  overflow-hidden
                  bg-white
                  border
                  border-zinc-100
                  rounded-[23px]
                  shadow-[0_8px_22px_rgba(24,24,27,0.035)]
                  cursor-pointer
                  transition-all
                  hover:shadow-[0_10px_26px_rgba(24,24,27,0.055)]
                  hover:scale-[1.006]
                  active:scale-[0.99]
                  ${
                    task.completed
                      ? 'opacity-60'
                      : ''
                  }
                `}
              >
                {/* Category notch */}
                <div
                  className="
                    absolute
                    left-0
                    top-0
                    bottom-0
                    w-[5px]
                  "
                  style={{
                    backgroundColor:
                      theme.hex,
                  }}
                />

                <div className="p-4 pl-5">
                  <div className="flex items-start gap-3">
                    {/* Completion */}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();

                        toggleTaskComplete(
                          task.id
                        );
                      }}
                      className="
                        mt-0.5
                        w-6
                        h-6
                        rounded-full
                        shrink-0
                        flex
                        items-center
                        justify-center
                        transition-all
                        active:scale-90
                      "
                      style={
                        task.completed ||
                        allStepsDone
                          ? {
                              backgroundColor:
                                theme.hex,
                              border:
                                `2px solid ${theme.hex}`,
                              color:
                                '#FFFFFF',
                            }
                          : {
                              backgroundColor:
                                '#FFFFFF',
                              border:
                                '2px solid #D4D4D8',
                              color:
                                '#A1A1AA',
                            }
                      }
                    >
                      {(task.completed ||
                        allStepsDone) && (
                        <Check
                          size={13}
                          strokeWidth={3}
                        />
                      )}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <span
                          className="
                            text-[9px]
                            uppercase
                            font-black
                            tracking-[0.7px]
                            px-2.5
                            py-1
                            rounded-full
                          "
                          style={{
                            color:
                              theme.hex,
                            backgroundColor:
                              theme.soft,
                          }}
                        >
                          {theme.name}
                        </span>

                        <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-semibold">
                          <Clock size={11} />

                          {task.timeEstimateMinutes}m
                        </div>
                      </div>

                      <h4
                        className={`
                          text-[14px]
                          font-extrabold
                          text-zinc-800
                          leading-snug
                          ${
                            task.completed
                              ? 'line-through text-zinc-400'
                              : ''
                          }
                        `}
                      >
                        {task.title}
                      </h4>

                      <div className="mt-3">
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-400">
                            <Layers
                              size={11}
                              style={{
                                color:
                                  theme.hex,
                              }}
                            />

                            <span>
                              {completedCount} of{' '}
                              {totalSteps}{' '}
                              micro-steps
                            </span>
                          </div>

                          <span className="text-[9px] font-bold text-zinc-400">
                            {progress}%
                          </span>
                        </div>

                        <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{
                              backgroundColor:
                                theme.hex,
                            }}
                            initial={false}
                            animate={{
                              width:
                                `${progress}%`,
                            }}
                            transition={{
                              duration: 0.25,
                              ease: 'easeOut',
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Focus button */}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();

                        setFocusHero(
                          task.id
                        );
                      }}
                      className="
                        shrink-0
                        p-1.5
                        text-zinc-300
                        hover:text-amber-500
                        transition-colors
                        active:scale-90
                      "
                      title="Set as Focus"
                    >
                      <Flame size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </section>

      {/* =====================================================
          FLOATING ACTION BUTTON
      ===================================================== */}

      <div
        className="
          absolute
          bottom-[92px]
          right-5
          z-30
          pointer-events-auto
        "
      >
        <motion.button
          whileHover={{
            scale: 1.06,
          }}
          whileTap={{
            scale: 0.9,
          }}
          onClick={() =>
            setIsNewTaskModalOpen(true)
          }
          className="
            w-14
            h-14
            rounded-full
            bg-[#FF8F73]
            text-white
            flex
            items-center
            justify-center
            border-2
            border-white/75
            shadow-[0_12px_28px_rgba(255,143,115,0.38)]
          "
        >
          <Plus
            size={28}
            strokeWidth={2.8}
          />
        </motion.button>
      </div>
    </div>
  );
};
