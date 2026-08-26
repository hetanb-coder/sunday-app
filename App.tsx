import {
  Ban,
  Briefcase,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronRight,
  Clock3,
  Flame,
  Gem,
  Heart,
  HeartHandshake,
  House,
  Leaf,
  Layers3,
  Plus,
  Sparkles,
  Sprout,
  Trash2,
  User,
  Users,
  WalletCards,
  X,
  Zap
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Alert,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  PanResponder,
  PixelRatio,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import AnimatedReanimated, {
  cancelAnimation,
  FadeInDown,
  FadeOutUp,
  LinearTransition,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import {
  makeImageFromView,
} from '@shopify/react-native-skia';
import type {
  SkImage,
} from '@shopify/react-native-skia';
import {
  GoalHandoffCanvas,
} from './src/components/GoalHandoffCanvas';
import { NewGoalMotionLab } from './src/dev/NewGoalMotionLab';
import { VoiceNavSilhouette, VoicePeekV2 } from './src/voice/VoicePeekV2';
import { VoiceShellV2 } from './src/voice/VoiceShellV2';
import { persistVoiceGoals } from './src/voice/voiceGoalPersistenceService';
import { TogetherScreen } from './src/together/TogetherScreen';
import { SharedGoalDetail } from './src/together/SharedGoalDetail';
import {
  activeTogetherFixture,
  currentMember as demoCurrentMember,
} from './src/together/mockData';
import type {
  Connection,
  ConnectionInvite,
  TogetherInteraction,
  TogetherInteractionType,
} from './src/together/models';
import {
  acceptLocalInvite,
  createLocalInvite,
  findGoalConnection,
} from './src/together/connectionState';
import { deriveGoalViewPermissions } from './src/together/goalPermissions';
import { AuthProvider, useAuth } from './src/backend/AuthProvider';
import { DevelopmentBackendHarness } from './src/backend/DevelopmentBackendHarness';
import {
  ProductionAuthScreen,
  ProductionOnboardingFlow,
} from './src/backend/ProductionOnboarding';
import {
  onboardingRepository,
} from './src/backend/onboardingRepository';
import type {
  OnboardingState,
} from './src/backend/onboardingRepository';
import { sundayDataSource } from './src/backend/dataSource';
import { backendConfig } from './src/backend/config';
import { BackendError, toBackendError } from './src/backend/errors';
import {
  workspaceDomain,
} from './src/backend/workspaceDomain';
import {
  generateGoalSteps,
  GoalStepGenerationError,
} from './src/goals/goalStepGenerationService';
import type {
  RemoteTask,
  RemoteWorkspace,
} from './src/backend/workspaceDomain';
import { categoryColors, categoryNames, colors, motion } from './src/theme';
import type { CategoryColorFamily } from './src/theme';

type Category =
  | 'work'
  | 'life'
  | 'health'
  | 'money'
  | 'growth'
  | 'quick';

type LandingRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  scrollDeltaY?: number;
};

type VoiceOrbRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Step = {
  id: string;
  title: string;
  completed: boolean;
  assignedToUserId?: string | null;
};

type Task = RemoteTask & {
  isFocusHero?: boolean;
};

const canCompleteGoal = (task: Pick<Task, 'microSteps'>) =>
  task.microSteps.length === 0 ||
  task.microSteps.every((step) => step.completed);

type DuePresentation = {
  label: string;
  urgency: 'neutral' | 'soon' | 'today' | 'overdue';
};

type GoalUrgencyTier =
  | 'overdue'
  | 'today'
  | 'tomorrow'
  | 'soon'
  | 'future'
  | 'none';

type SmartGoalEvaluation = {
  task: Task;
  urgencyTier: GoalUrgencyTier;
  urgencyRank: number;
  score: number;
  reason: string | null;
};

type GoalHandoffDestination = {
  taskId: string;
  category: Category;
  kind: 'individual' | 'single-to-stack' | 'collapsed-stack';
  existingCount: number;
};

const sameLocalDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const addLocalDays = (date: Date, days: number) =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
    12
  );

const normalizeDueDate = (
  date: Date,
  hasTime: boolean
) =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hasTime ? date.getHours() : 12,
    hasTime ? date.getMinutes() : 0,
    0,
    0
  ).toISOString();

const formatDue = (
  dueAt?: string,
  hasTime = false,
  includeOverdue = true
): DuePresentation | null => {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return null;

  const now = new Date();
  const today = addLocalDays(now, 0);
  const tomorrow = addLocalDays(now, 1);
  const yesterday = addLocalDays(now, -1);
  const time = hasTime
    ? due.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;
  const overdue = hasTime
    ? due.getTime() < now.getTime()
    : due < today;

  if (includeOverdue && overdue) {
    const dateLabel = sameLocalDay(due, yesterday)
      ? 'Yesterday'
      : due.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        });
    return {
      label: `Overdue · ${dateLabel}${time ? ` · ${time}` : ''}`,
      urgency: 'overdue',
    };
  }
  if (sameLocalDay(due, today)) {
    return {
      label: `Today${time ? ` · ${time}` : ''}`,
      urgency: 'today',
    };
  }
  if (sameLocalDay(due, tomorrow)) {
    return {
      label: `Tomorrow${time ? ` · ${time}` : ''}`,
      urgency: 'soon',
    };
  }
  return {
    label: `${due.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })}${time ? ` · ${time}` : ''}`,
    urgency: 'neutral',
  };
};

const localDayNumber = (date: Date) =>
  Math.floor(
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    ) /
      86_400_000
  );

const getGoalUrgency = (
  task: Task,
  now = new Date()
): GoalUrgencyTier => {
  if (!task.dueAt) return 'none';
  const due = new Date(task.dueAt);
  if (Number.isNaN(due.getTime())) return 'none';

  const dayDelta = localDayNumber(due) - localDayNumber(now);
  const overdue = task.dueHasTime
    ? due.getTime() < now.getTime()
    : dayDelta < 0;
  if (overdue) return 'overdue';
  if (dayDelta === 0) return 'today';
  if (dayDelta === 1) return 'tomorrow';
  if (dayDelta <= 7) return 'soon';
  return 'future';
};

const SMART_URGENCY: Record<
  GoalUrgencyTier,
  { rank: number; weight: number }
> = {
  overdue: { rank: 5, weight: 100 },
  today: { rank: 4, weight: 80 },
  tomorrow: { rank: 3, weight: 50 },
  soon: { rank: 2, weight: 30 },
  future: { rank: 1, weight: 10 },
  none: { rank: 0, weight: 0 },
};

const evaluateSmartGoal = (
  task: Task,
  currentFocusId?: string | null,
  now = new Date()
): SmartGoalEvaluation => {
  const urgencyTier = getGoalUrgency(task, now);
  const completedSteps = task.microSteps.filter(
    (step) => step.completed
  ).length;
  const totalSteps = task.microSteps.length;
  const progress = totalSteps ? completedSteps / totalSteps : 0;
  const almostComplete =
    totalSteps >= 2 &&
    completedSteps === totalSteps - 1;
  const lowProgressSoon =
    progress <= 0.34 &&
    ['overdue', 'today', 'tomorrow'].includes(urgencyTier);
  const urgency = SMART_URGENCY[urgencyTier];
  const score =
    urgency.weight +
    (almostComplete ? 8 : 0) +
    (lowProgressSoon ? 3 : 0) +
    (task.id === currentFocusId ? 12 : 0);
  const reason =
    urgencyTier === 'overdue'
      ? 'Overdue'
      : urgencyTier === 'today'
        ? 'Due today'
        : urgencyTier === 'tomorrow'
          ? 'Due tomorrow'
          : almostComplete
            ? 'Almost there'
            : completedSteps > 0
              ? `${completedSteps} of ${totalSteps} steps done`
              : 'A good next step';

  return {
    task,
    urgencyTier,
    urgencyRank: urgency.rank,
    score,
    reason,
  };
};

const sortGoalsForSmartHome = (
  tasks: Task[],
  currentFocusId?: string | null
) => {
  const originalOrder = new Map(
    tasks.map((task, index) => [task.id, index])
  );
  return [...tasks].sort((a, b) => {
    const aRank = evaluateSmartGoal(a, currentFocusId).urgencyRank;
    const bRank = evaluateSmartGoal(b, currentFocusId).urgencyRank;
    return (
      bRank - aRank ||
      (originalOrder.get(a.id) ?? 0) -
        (originalOrder.get(b.id) ?? 0)
    );
  });
};

const getSmartCurrentFocus = (
  activeTasks: Task[],
  currentFocusId?: string | null
) => {
  if (activeTasks.length === 0) return null;
  const evaluations = activeTasks.map((task) =>
    evaluateSmartGoal(task, currentFocusId)
  );
  const current = evaluations.find(
    (evaluation) => evaluation.task.id === currentFocusId
  );
  const challenger = evaluations.reduce((best, candidate) =>
    candidate.score > best.score ? candidate : best
  );

  if (!current) return challenger.task;
  if (
    challenger.urgencyTier === 'overdue' &&
    current.urgencyTier !== 'overdue'
  ) {
    return challenger.task;
  }
  if (
    challenger.urgencyTier === 'today' &&
    !['overdue', 'today'].includes(current.urgencyTier)
  ) {
    return challenger.task;
  }
  return current.task;
};

type Theme = CategoryColorFamily & {
  name: string;
};

const COLORS: Record<Category, Theme> = {
  work: {
    ...categoryColors.work,
    name: categoryNames.work,
  },
  life: {
    ...categoryColors.life,
    name: categoryNames.life,
  },
  health: {
    ...categoryColors.health,
    name: categoryNames.health,
  },
  money: {
    ...categoryColors.money,
    name: categoryNames.money,
  },
  growth: {
    ...categoryColors.growth,
    name: categoryNames.growth,
  },
  quick: {
    ...categoryColors.quick,
    name: categoryNames.quick,
  },
};

const CATEGORY_ORDER = Object.keys(
  COLORS
) as Category[];

const INITIAL: Task[] = [
  {
    id: 'hero',
    title: 'Draft Product Pitch Deck',
    category: 'work',
    minutes: 20,
    completed: false,
    status: 'active',
    isFocusHero: true,
    microSteps: [
      {
        id: '1',
        title: 'Open slide application & pick minimal template',
        completed: true,
      },
      {
        id: '2',
        title: 'Write 1-sentence core problem statement',
        completed: true,
      },
      {
        id: '3',
        title: 'List 3 key feature highlights',
        completed: false,
      },
      {
        id: '4',
        title: 'Add call to action slide',
        completed: false,
      },
    ],
  },
  {
    id: '2',
    title: 'Reset Workspace & Desk',
    category: 'life',
    minutes: 10,
    completed: false,
    status: 'active',
    microSteps: [
      {
        id: '5',
        title: 'Clear empty cups & mugs',
        completed: true,
      },
      {
        id: '6',
        title: 'File loose paper notes into drawer',
        completed: false,
      },
      {
        id: '7',
        title: 'Wipe down keyboard & desk mat',
        completed: false,
      },
    ],
  },
  {
    id: '3',
    title: 'Mindful Morning Stretch',
    category: 'health',
    minutes: 8,
    completed: false,
    status: 'active',
    microSteps: [
      {
        id: '8',
        title: '2 minutes neck & shoulder rolls',
        completed: true,
      },
      {
        id: '9',
        title: 'Hamstring stretch left & right side',
        completed: true,
      },
    ],
  },
  {
    id: '4',
    title: 'Quarterly Budget & Savings Goal',
    category: 'money',
    minutes: 15,
    completed: false,
    status: 'active',
    microSteps: [
      {
        id: '10',
        title: 'Review last month cash flow',
        completed: true,
      },
      {
        id: '11',
        title: 'Set aside 20% into High Yield account',
        completed: false,
      },
    ],
  },
  {
    id: '5',
    title: 'Read Chapter 4 of Deep Work',
    category: 'growth',
    minutes: 15,
    completed: false,
    status: 'active',
    microSteps: [
      {
        id: '12',
        title: 'Set 15 minute timer',
        completed: true,
      },
      {
        id: '13',
        title: 'Highlight 3 actionable key takeaways',
        completed: false,
      },
    ],
  },
];
const SUNDAY_SPRING = {
  stiffness: 340,
  damping: 31,
  mass: 0.78,
  useNativeDriver: true,
};

const SUNDAY_SPRING_SNAPPY = {
  stiffness: 420,
  damping: 30,
  mass: 0.65,
  useNativeDriver: true,
};

const GOAL_HANDOFF = {
  sourceCollapseDuration: 235,
  previewOwnershipDuration: 88,
  skiaSourceReleaseDuration: 48,
  sourceReleaseDelay: 12,
  sourceReleaseDuration: 76,
  sourceExitDuration: 140,
  travelDuration: 420,
  trajectoryArc: 4,
  deformationPeak: 0.46,
  deformationRelease: 0.82,
  directionalPull: 0.72,
  pullStretch: 0.014,
  pullPinch: 0.01,
  contactCompression: 0.008,
  landingCrossfadeStart: 0.98,
};
const COMPACT_GOAL_CARD_HEIGHT = 101;
const CAMERA_SAFE_TOP_PADDING = 24;
const CAMERA_BOTTOM_OVERLAY_ALLOWANCE = 166;
const CAMERA_PREFERRED_POSITION = 0.58;
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <BackendApp />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function BackendApp() {
  const auth = useAuth();
  if (auth.status === 'loading') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.backendLoading}>
          <Text style={styles.backendLoadingText}>Opening Sunday…</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (auth.status === 'configuration_error') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.backendLoading}>
          <Text style={styles.backendConfigTitle}>Supabase configuration needs attention</Text>
          <Text style={styles.backendConfigText}>{backendConfig.validationError}</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (auth.status === 'signed_out') return <ProductionAuthScreen />;
  const remoteMode = sundayDataSource.mode === 'supabase' && auth.status === 'signed_in';
  const currentUserId = remoteMode ? auth.user.id : demoCurrentMember.id;
  const appContent = remoteMode ? (
    <AuthenticatedSundayApp currentUserId={currentUserId} />
  ) : (
    <AppContent
      currentUserId={currentUserId}
      initialTasks={INITIAL}
      initialConnections={activeTogetherFixture.connections}
      initialInvites={[]}
      initialInteractions={[]}
      remoteMode={false}
    />
  );
  if (!__DEV__ || sundayDataSource.mode !== 'supabase' || auth.status !== 'signed_in') {
    return appContent;
  }
  return (
    <View style={styles.backendHarnessRoot}>
      {appContent}
      <DevelopmentBackendHarness />
    </View>
  );
}

function AuthenticatedSundayApp({ currentUserId }: { currentUserId: string }) {
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setOnboarding(null);
    setLoadError(false);
    void onboardingRepository.getCurrent().then((state) => {
      if (active) setOnboarding(state);
    }).catch((error) => {
      if (!active) return;
      setLoadError(true);
      if (__DEV__) console.error('[Sunday onboarding bootstrap]', toBackendError(error));
    });
    return () => { active = false; };
  }, [attempt, currentUserId]);

  if (!onboarding) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.remoteHydration}>
          <View style={styles.remoteHydrationMark}>
            <Sparkles size={20} color="#9E8BE8" />
          </View>
          <Text style={styles.remoteHydrationTitle}>
            {loadError ? 'We need another moment' : 'Opening your space…'}
          </Text>
          <Text style={styles.remoteHydrationText}>
            {loadError
              ? 'We could not check your account setup. Your account data is still safe.'
              : 'Picking up right where you left off.'}
          </Text>
          {loadError && (
            <Pressable onPress={() => setAttempt((value) => value + 1)} style={styles.remoteHydrationRetry}>
              <Text style={styles.remoteHydrationRetryText}>Try again</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.authenticatedAppRoot}>
      <RemoteWorkspaceApp currentUserId={currentUserId} />
      {!onboarding.completed && (
        <View style={styles.onboardingOverlay}>
          <ProductionOnboardingFlow
            initialState={onboarding}
            onComplete={() => setOnboarding((state) => state ? { ...state, completed: true, step: 'complete' } : state)}
          />
        </View>
      )}
    </View>
  );
}

function RemoteWorkspaceApp({ currentUserId }: { currentUserId: string }) {
  const [workspace, setWorkspace] = useState<RemoteWorkspace | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setWorkspace(null);
    setLoadError(false);
    void workspaceDomain.hydrate().then((loaded) => {
      if (active) setWorkspace(loaded);
    }).catch((error) => {
      if (!active) return;
      setLoadError(true);
      if (__DEV__) console.error('[Sunday workspace hydration]', toBackendError(error));
    });
    return () => { active = false; };
  }, [attempt, currentUserId]);

  if (!workspace) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.remoteHydration}>
          <View style={styles.remoteHydrationMark}>
            <Sparkles size={20} color="#9E8BE8" />
          </View>
          <Text style={styles.remoteHydrationTitle}>
            {loadError ? 'Your flow needs another moment' : 'Gathering your flow…'}
          </Text>
          <Text style={styles.remoteHydrationText}>
            {loadError
              ? 'We could not refresh your goals. Your account data is still safe.'
              : 'Bringing your goals and shared spaces together.'}
          </Text>
          {loadError && (
            <Pressable onPress={() => setAttempt((value) => value + 1)} style={styles.remoteHydrationRetry}>
              <Text style={styles.remoteHydrationRetryText}>Try again</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <AppContent
      key={currentUserId}
      currentUserId={currentUserId}
      currentProfileName={workspace.profileName}
      initialTasks={workspace.tasks}
      initialConnections={workspace.connections}
      initialInvites={workspace.invites}
      initialInteractions={workspace.interactions}
      remoteMode
    />
  );
}

const STACK_HEADER_MOTION_MS = 190;
const STACK_CARD_MOTION_MS = 250;
const STACK_CARD_STAGGER_MS = 48;
const STACK_COLLAPSE_STAGGER_MS = 34;

function CategoryStackHeader({
  category,
  count,
  expanded,
  interactive,
  urgencyCue,
  animateCount,
  onPress,
}: {
  category: Category;
  count: number;
  expanded: boolean;
  interactive: boolean;
  urgencyCue?: string | null;
  animateCount?: boolean;
  onPress?: () => void;
}) {
  const theme = COLORS[category];
  const chevronProgress = useSharedValue(expanded ? 1 : 0);

  useEffect(() => {
    chevronProgress.value = withTiming(expanded ? 1 : 0, {
      duration: STACK_HEADER_MOTION_MS,
    });
  }, [chevronProgress, expanded]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotateZ: `${90 - chevronProgress.value * 180}deg`,
      },
    ],
  }));

  const content = (
    <>
      <View style={styles.categoryStackLabel}>
        <View
          style={[
            styles.categoryStackDot,
            { backgroundColor: theme.accent },
          ]}
        />
        <Text
          style={[
            styles.categoryStackName,
            { color: theme.accent },
          ]}
        >
          {theme.name.toUpperCase()}
        </Text>
        {interactive && (
          <AnimatedReanimated.Text
            key={count}
            entering={
              animateCount
                ? FadeInDown.duration(150)
                : undefined
            }
            style={styles.categoryStackCount}
          >
            {count} goals
          </AnimatedReanimated.Text>
        )}
        {urgencyCue && (
          <Text style={styles.categoryStackUrgency}>
            · {urgencyCue}
          </Text>
        )}
        {interactive && (
          <AnimatedReanimated.View style={chevronStyle}>
            <ChevronRight size={15} color="#71717A" />
          </AnimatedReanimated.View>
        )}
      </View>
    </>
  );

  if (!interactive) {
    return (
      <View style={styles.categorySingleHeader}>{content}</View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.categoryStackHeader,
        pressed && styles.pressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

function CategoryGroupShell({
  count,
  handoffActive,
  stackReceiveActive,
  handoffProgress,
  children,
}: {
  count: number;
  handoffActive: boolean;
  stackReceiveActive: boolean;
  handoffProgress: Animated.Value;
  children: React.ReactNode;
}) {
  const previousCount = useRef(count);
  const receivePending = useRef(false);
  const receiveProgress = useSharedValue(0);

  useEffect(() => {
    if (count > previousCount.current) {
      if (handoffActive) {
        receivePending.current = true;
      } else {
        receiveProgress.value = withSequence(
          withTiming(1, { duration: 85 }),
          withSpring(0, {
            damping: 18,
            stiffness: 260,
            mass: 0.55,
          })
        );
      }
    }
    previousCount.current = count;
  }, [count, handoffActive, receiveProgress]);

  useEffect(() => {
    if (!handoffActive && receivePending.current) {
      receivePending.current = false;
      receiveProgress.value = withSpring(0, {
        damping: 18,
        stiffness: 260,
        mass: 0.55,
      });
    }
  }, [handoffActive, receiveProgress]);

  useEffect(() => {
    if (!stackReceiveActive) {
      if (!handoffActive) {
        receiveProgress.value = 0;
      }
      return;
    }

    const listenerId = handoffProgress.addListener(
      ({ value }) => {
        const approach = Math.max(
          0,
          Math.min(1, (value - 0.72) / 0.2)
        );
        const settle = Math.max(
          0,
          Math.min(1, (value - 0.92) / 0.08)
        );
        const smoothApproach =
          approach * approach * (3 - 2 * approach);
        const smoothSettle =
          settle * settle * (3 - 2 * settle);

        receiveProgress.value =
          smoothApproach * (1 - smoothSettle);
      }
    );

    return () => {
      handoffProgress.removeListener(listenerId);
    };
  }, [
    handoffActive,
    handoffProgress,
    receiveProgress,
    stackReceiveActive,
  ]);

  const receiveStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -receiveProgress.value * 1.5 },
      { scale: 1 - receiveProgress.value * 0.012 },
    ],
  }));

  return (
    <AnimatedReanimated.View
      layout={LinearTransition.duration(260)}
      style={[styles.categoryGroup, receiveStyle]}
    >
      {children}
    </AnimatedReanimated.View>
  );
}

function LegacyDueQuickChoice({
  label,
  selected,
}: {
  label: string;
  selected: boolean;
}) {
  const selection = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    selection.value = withTiming(selected ? 1 : 0, { duration: 170 });
  }, [selected, selection]);

  const selectionStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(selection.value, [0, 1], ['#F4F4F5', '#FFF1ED']),
    borderColor: interpolateColor(selection.value, [0, 1], ['rgba(255,182,165,0)', '#FFB6A5']),
    transform: [{ scale: 1 - selection.value * 0.012 }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(selection.value, [0, 1], ['#71717A', '#C65D47']),
  }));

  return (
    <AnimatedReanimated.View style={[styles.legacyDueQuickChip, selectionStyle]}>
      <AnimatedReanimated.Text style={[styles.legacyDueQuickChipText, textStyle]}>
        {label}
      </AnimatedReanimated.Text>
    </AnimatedReanimated.View>
  );
}

function DueQuickChoice({
  label,
  selected,
  icon,
}: {
  label: string;
  selected: boolean;
  icon?: React.ReactNode;
}) {
  const selection = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    selection.value = withTiming(selected ? 1 : 0, {
      duration: 170,
    });
  }, [selected, selection]);

  const selectionStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      selection.value,
      [0, 1],
      ['#FFFCFA', '#FFF1ED']
    ),
    borderColor: interpolateColor(
      selection.value,
      [0, 1],
      ['#E5C9C1', '#FF7D6C']
    ),
    transform: [{ scale: 1 - selection.value * 0.012 }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      selection.value,
      [0, 1],
      ['#71717A', '#C65D47']
    ),
  }));

  return (
    <AnimatedReanimated.View
      style={[styles.dueQuickChip, selectionStyle]}
    >
      {icon}
      <AnimatedReanimated.Text
        style={[styles.dueQuickChipText, textStyle]}
      >
        {label}
      </AnimatedReanimated.Text>
    </AnimatedReanimated.View>
  );
}

function DueDatePickerSheet({
  visible,
  dueAt,
  dueHasTime,
  onChange,
  onClose,
}: {
  visible: boolean;
  dueAt?: string;
  dueHasTime: boolean;
  onChange: (dueAt?: string, dueHasTime?: boolean) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const initialDate = dueAt ? new Date(dueAt) : addLocalDays(new Date(), 1);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [hasTime, setHasTime] = useState(dueHasTime);
  const [hasDueDate, setHasDueDate] = useState(Boolean(dueAt));
  const [pickerMode, setPickerMode] = useState<'quick' | 'calendar' | 'time'>('quick');
  const sheetY = useRef(new Animated.Value(28)).current;
  const closingRef = useRef(false);

  useEffect(() => {
    if (!visible) return;
    const nextDate = dueAt
      ? new Date(dueAt)
      : addLocalDays(new Date(), 1);
    setSelectedDate(nextDate);
    setHasTime(dueHasTime);
    setHasDueDate(Boolean(dueAt));
    setPickerMode('quick');
    closingRef.current = false;
    sheetY.setValue(28);
    Animated.timing(sheetY, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible) return null;

  const closeSurface = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    Animated.timing(sheetY, {
      toValue: 28,
      duration: 170,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onClose();
      closingRef.current = false;
    });
  };

  const updateDraft = (date: Date, nextHasTime: boolean) => {
    setSelectedDate(date);
    setHasTime(nextHasTime);
    setHasDueDate(true);
  };
  const selectQuickDate = (date: Date) => {
    updateDraft(date, false);
    onChange(normalizeDueDate(date, false), false);
    setTimeout(closeSurface, 110);
  };
  const quickChoices = [
    { label: 'Today', date: addLocalDays(new Date(), 0) },
    { label: 'Tomorrow', date: addLocalDays(new Date(), 1) },
    {
      label: 'This Weekend',
      date: addLocalDays(
        new Date(),
        (6 - new Date().getDay() + 7) % 7
      ),
    },
  ];
  const selectedSummary = formatDue(
    hasDueDate
      ? normalizeDueDate(selectedDate, hasTime)
      : undefined,
    hasTime,
    false
  );
  const handleDone = () => {
    onChange(
      hasDueDate
        ? normalizeDueDate(selectedDate, hasTime)
        : undefined,
      hasDueDate ? hasTime : false
    );
    closeSurface();
  };

  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      onRequestClose={closeSurface}
    >
      <View style={styles.duePickerRoot}>
        <Pressable
          accessibilityLabel="Close due date picker"
          style={styles.duePickerBackdrop}
          onPress={closeSurface}
        />
        <Animated.View
          style={[
            styles.duePickerMotionShell,
            { transform: [{ translateY: sheetY }] },
          ]}
        >
        <AnimatedReanimated.View
          layout={LinearTransition.duration(260)}
          style={[
            styles.legacyDuePickerSheet,
            { paddingBottom: Math.max(22, insets.bottom + 14) },
          ]}
        >
          <View style={styles.dragHandleArea}>
            <View style={styles.grabber} />
          </View>
          <View style={styles.legacyDuePickerHeader}>
            <View>
              <Text style={styles.duePickerKicker}>SCHEDULE</Text>
              <Text style={styles.legacyDuePickerTitle}>
                {pickerMode === 'calendar'
                  ? 'Pick a date'
                  : pickerMode === 'time'
                    ? 'Add a time'
                    : 'When is it due?'}
              </Text>
            </View>
            {pickerMode !== 'quick' && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Done choosing due date"
                onPress={handleDone}
                style={({ pressed }) => [
                  styles.duePickerDone,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.duePickerDoneText}>Done</Text>
              </Pressable>
            )}
          </View>

          {pickerMode === 'quick' && (
          <AnimatedReanimated.View
            entering={FadeInDown.duration(190)}
            style={styles.legacyDueQuickChoices}
          >
            {quickChoices.map((choice) => {
              const selected = sameLocalDay(selectedDate, choice.date);
              return (
                <Pressable
                  key={choice.label}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: selected && hasDueDate,
                  }}
                  onPress={() => {
                    selectQuickDate(choice.date);
                  }}
                  style={({ pressed }) => [
                    styles.legacyDueQuickChipPressable,
                    pressed && styles.dueQuickChipPressed,
                  ]}
                >
                  <LegacyDueQuickChoice
                    label={choice.label}
                    selected={selected && hasDueDate}
                  />
                </Pressable>
              );
            })}
            <Pressable
              accessibilityRole="button"
              onPress={() => setPickerMode('calendar')}
              style={({ pressed }) => [
                styles.legacyDueQuickChip,
                styles.dueQuickChipCustom,
                pressed && styles.dueQuickChipPressed,
              ]}
            >
              <CalendarDays size={14} color="#52525B" />
              <Text style={styles.legacyDueQuickChipText}>Pick a date</Text>
            </Pressable>
          </AnimatedReanimated.View>
          )}

          {pickerMode === 'calendar' && (
          <AnimatedReanimated.View
            entering={FadeInDown.duration(220)}
            exiting={FadeOutUp.duration(160)}
            style={styles.dueNativePicker}
          >
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              minimumDate={addLocalDays(new Date(), 0)}
              onChange={(_event, date) => {
                if (date) updateDraft(date, hasTime);
              }}
            />
            <Pressable
              onPress={() => setPickerMode('quick')}
              style={styles.dueCalendarBack}
            >
              <Text style={styles.dueRemoveTime}>Back to quick choices</Text>
            </Pressable>
          </AnimatedReanimated.View>
          )}

          {pickerMode === 'time' && (
            <AnimatedReanimated.View
              entering={FadeInDown.duration(210)}
              style={styles.dueTimePicker}
            >
              <DateTimePicker
                value={selectedDate}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_event, date) => {
                  if (date) {
                    updateDraft(date, true);
                    if (Platform.OS !== 'ios') {
                      setPickerMode('quick');
                    }
                  }
                }}
              />
              <Pressable
                onPress={() => {
                  updateDraft(selectedDate, false);
                  setPickerMode('quick');
                }}
              >
                <Text style={styles.dueRemoveTime}>Remove time</Text>
              </Pressable>
            </AnimatedReanimated.View>
          )}

          {hasDueDate && pickerMode !== 'time' && (
            <AnimatedReanimated.View
              entering={FadeInDown.duration(180)}
              style={styles.dueSelectionSummary}
            >
              <View style={styles.dueSelectionCopy}>
                <Text style={styles.dueTimeLabel}>Selected</Text>
                <Text style={styles.dueTimeValue}>
                  {selectedSummary?.label}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={hasTime ? 'Change due time' : 'Add due time'}
                onPress={() => setPickerMode('time')}
                style={styles.dueAddTime}
              >
                <Clock3 size={13} color="#52525B" />
                <Text style={styles.dueAddTimeText}>
                  {hasTime ? 'Change time' : 'Add time'}
                </Text>
              </Pressable>
            </AnimatedReanimated.View>
          )}

          {hasDueDate && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove due date"
              onPress={() => {
                setHasDueDate(false);
                setHasTime(false);
                onChange(undefined, false);
                setTimeout(closeSurface, 110);
              }}
              style={styles.dueRemoveDate}
            >
              <Text style={styles.dueRemoveDateText}>Remove due date</Text>
            </Pressable>
          )}
        </AnimatedReanimated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}


function NewGoalDueDatePickerSheet({
  visible,
  dismissRequest,
  dueAt,
  onChange,
  onClose,
}: {
  visible: boolean;
  dismissRequest: number;
  dueAt?: string;
  dueHasTime: boolean;
  onChange: (dueAt?: string, dueHasTime?: boolean) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const initialDate = dueAt ? new Date(dueAt) : addLocalDays(new Date(), 1);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [hasDueDate, setHasDueDate] = useState(Boolean(dueAt));
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
  );
  const [outgoingMonth, setOutgoingMonth] = useState<Date | null>(null);
  const [monthDirection, setMonthDirection] = useState<1 | -1>(1);
  const sheetY = useRef(new Animated.Value(viewportHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const monthProgress = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);
  const monthAnimatingRef = useRef(false);
  const queuedMonthDeltaRef = useRef(0);
  const visibleMonthRef = useRef(visibleMonth);

  useEffect(() => {
    if (!visible) return;
    const nextDate = dueAt
      ? new Date(dueAt)
      : addLocalDays(new Date(), 1);
    const nextMonth = new Date(nextDate.getFullYear(), nextDate.getMonth(), 1);
    setSelectedDate(nextDate);
    setHasDueDate(Boolean(dueAt));
    setVisibleMonth(nextMonth);
    setOutgoingMonth(null);
    visibleMonthRef.current = nextMonth;
    monthAnimatingRef.current = false;
    queuedMonthDeltaRef.current = 0;
    monthProgress.stopAnimation();
    monthProgress.setValue(0);
    closingRef.current = false;
    sheetY.setValue(viewportHeight);
    backdropOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(sheetY, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, monthProgress, sheetY, viewportHeight, visible]);

  const closeSurface = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    Animated.parallel([
      Animated.timing(sheetY, {
        toValue: viewportHeight,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onClose();
      closingRef.current = false;
    });
  };

  useEffect(() => {
    if (visible && dismissRequest > 0) closeSurface();
  }, [dismissRequest]);

  if (!visible) return null;

  const updateDraft = (date: Date) => {
    setSelectedDate(date);
    setHasDueDate(true);
  };
  const selectQuickDate = (date: Date) => {
    updateDraft(date);
    monthProgress.stopAnimation();
    monthAnimatingRef.current = false;
    queuedMonthDeltaRef.current = 0;
    setOutgoingMonth(null);
    const nextMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    visibleMonthRef.current = nextMonth;
    setVisibleMonth(nextMonth);
  };
  const quickChoices = [
    { label: 'Today', date: addLocalDays(new Date(), 0) },
    { label: 'Tomorrow', date: addLocalDays(new Date(), 1) },
    {
      label: 'This Weekend',
      date: addLocalDays(
        new Date(),
        (6 - new Date().getDay() + 7) % 7
      ),
    },
  ];
  const today = new Date();
  const calendarDatesForMonth = (month: Date) => {
    const mondayOffset = (month.getDay() + 6) % 7;
    const firstCalendarDate = addLocalDays(month, -mondayOffset);
    return Array.from({ length: 42 }, (_, index) =>
      addLocalDays(firstCalendarDate, index)
    );
  };
  const canGoToPreviousMonth =
    visibleMonth.getFullYear() > today.getFullYear() ||
    visibleMonth.getMonth() > today.getMonth();
  const monthLabel = visibleMonth.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  const startMonthTransition = (direction: 1 | -1) => {
    if (monthAnimatingRef.current) {
      queuedMonthDeltaRef.current += direction;
      return;
    }
    const currentMonth = visibleMonthRef.current;
    const nextMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + direction,
      1
    );
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    if (nextMonth < currentMonthStart) return;

    monthAnimatingRef.current = true;
    setMonthDirection(direction);
    setOutgoingMonth(currentMonth);
    visibleMonthRef.current = nextMonth;
    setVisibleMonth(nextMonth);
    monthProgress.setValue(0);
    Animated.timing(monthProgress, {
      toValue: 1,
      duration: 260,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start(({ finished }) => {
      monthAnimatingRef.current = false;
      setOutgoingMonth(null);
      monthProgress.setValue(0);
      if (!finished) return;
      const queuedDelta = queuedMonthDeltaRef.current;
      if (queuedDelta === 0) return;
      const queuedDirection: 1 | -1 = queuedDelta > 0 ? 1 : -1;
      queuedMonthDeltaRef.current -= queuedDirection;
      startMonthTransition(queuedDirection);
    });
  };
  const renderCalendarGrid = (month: Date) => (
    <View style={styles.dueCalendarGrid}>
      {calendarDatesForMonth(month).map((date) => {
        const selected = hasDueDate && sameLocalDay(date, selectedDate);
        const inMonth =
          date.getMonth() === month.getMonth() &&
          date.getFullYear() === month.getFullYear();
        const disabled = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
        return (
          <Pressable
            key={date.toISOString()}
            accessibilityRole="button"
            accessibilityLabel={date.toLocaleDateString()}
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            hitSlop={{ top: 2, bottom: 2 }}
            onPress={() => updateDraft(date)}
            style={styles.dueCalendarDay}
          >
            <View style={[styles.dueCalendarDayCircle, selected && styles.dueCalendarDaySelected]}>
              <Text style={[
                styles.dueCalendarDayText,
                !inMonth && styles.dueCalendarDayOutside,
                disabled && styles.dueCalendarDayDisabled,
                selected && styles.dueCalendarDayTextSelected,
              ]}>
                {date.getDate()}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
  const handleDone = () => {
    onChange(
      hasDueDate
        ? normalizeDueDate(selectedDate, false)
        : undefined,
      false
    );
    closeSurface();
  };

  return (
      <View style={styles.newGoalChildSheetRoot}>
        <Animated.View style={[styles.duePickerBackdrop, { opacity: backdropOpacity }]}>
          <Pressable
            accessibilityLabel="Close due date picker"
            style={StyleSheet.absoluteFill}
            onPress={closeSurface}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.duePickerMotionShell,
            { transform: [{ translateY: sheetY }] },
          ]}
        >
        <View
          style={[
            styles.duePickerSheet,
            { paddingBottom: Math.max(16, insets.bottom + 8) },
          ]}
        >
          <View style={styles.dragHandleArea}>
            <View style={[styles.grabber, styles.secondarySheetGrabber]} />
          </View>
          <View style={styles.duePickerHeader}>
            <Text style={styles.duePickerTitle}>Due Date</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close due date picker"
              onPress={closeSurface}
              hitSlop={6}
              style={({ pressed }) => [
                styles.secondarySheetClose,
                pressed && styles.pressed,
              ]}
            >
              <X size={22} color="#5F4D47" />
            </Pressable>
          </View>
          <ScrollView
            style={styles.duePickerScroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
            scrollEnabled={viewportHeight < 700}
            contentContainerStyle={styles.duePickerContent}
          >
          <View style={styles.dueQuickChoices}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: !hasDueDate }}
              onPress={() => {
                setHasDueDate(false);
              }}
              style={({ pressed }) => [
                styles.dueQuickChipPressable,
                pressed && styles.dueQuickChipPressed,
              ]}
            >
              <DueQuickChoice
                label="No due date"
                selected={!hasDueDate}
                icon={<Ban size={20} color={!hasDueDate ? '#FF7D6C' : '#927D76'} />}
              />
            </Pressable>
            {quickChoices.map((choice) => {
              const selected = hasDueDate && sameLocalDay(selectedDate, choice.date);
              const ChoiceIcon = choice.label === 'Today'
                ? CalendarCheck2
                : choice.label === 'Tomorrow'
                  ? CalendarClock
                  : CalendarRange;
              return (
                <Pressable
                  key={choice.label}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: selected && hasDueDate,
                  }}
                  onPress={() => {
                    selectQuickDate(choice.date);
                  }}
                  style={({ pressed }) => [
                    styles.dueQuickChipPressable,
                    pressed && styles.dueQuickChipPressed,
                  ]}
                >
                  <DueQuickChoice
                    label={choice.label}
                    selected={selected}
                    icon={
                      <ChoiceIcon
                        size={20}
                        color={selected ? '#FF7D6C' : '#927D76'}
                      />
                    }
                  />
                </Pressable>
              );
            })}
          </View>

          <View style={styles.dueCalendarSurface}>
            <View style={styles.dueCalendarHeader}>
              <Text style={styles.dueCalendarMonth} numberOfLines={1}>
                {monthLabel}
              </Text>
              <View style={styles.dueCalendarNavigation}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Previous month"
                  disabled={!canGoToPreviousMonth}
                  hitSlop={3}
                  onPress={() => startMonthTransition(-1)}
                  style={styles.dueCalendarArrow}
                >
                  <ChevronRight
                    size={19}
                    color={canGoToPreviousMonth ? '#6C5750' : '#D8CCC7'}
                    style={{ transform: [{ rotate: '180deg' }] }}
                  />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Next month"
                  hitSlop={3}
                  onPress={() => startMonthTransition(1)}
                  style={styles.dueCalendarArrow}
                >
                  <ChevronRight size={19} color="#6C5750" />
                </Pressable>
              </View>
            </View>
            <View style={styles.dueCalendarWeekdays}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((weekday, index) => (
                <Text key={`${weekday}-${index}`} style={styles.dueCalendarWeekday}>
                  {weekday}
                </Text>
              ))}
            </View>
            <View style={styles.dueCalendarGridViewport}>
              {outgoingMonth && (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.dueCalendarGridLayer,
                    {
                      transform: [{
                        translateX: monthProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -monthDirection * viewportWidth],
                        }),
                      }],
                    },
                  ]}
                >
                  {renderCalendarGrid(outgoingMonth)}
                </Animated.View>
              )}
              <Animated.View
                style={[
                  styles.dueCalendarGridLayer,
                  {
                    transform: [{
                      translateX: outgoingMonth
                        ? monthProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [monthDirection * viewportWidth, 0],
                          })
                        : 0,
                    }],
                  },
                ]}
              >
                {renderCalendarGrid(visibleMonth)}
              </Animated.View>
            </View>
          </View>

          </ScrollView>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Done choosing due date"
            onPress={handleDone}
            style={({ pressed }) => [
              styles.secondarySheetCta,
              styles.dueSetCta,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.secondarySheetCtaText}>DONE</Text>
          </Pressable>
        </View>
        </Animated.View>
      </View>
  );
}

function DueRow({
  dueAt,
  dueHasTime,
  onPress,
  compact = false,
  grouped = false,
}: {
  dueAt?: string;
  dueHasTime: boolean;
  onPress: () => void;
  compact?: boolean;
  grouped?: boolean;
}) {
  const presentation = formatDue(dueAt, dueHasTime, false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        presentation
          ? `Due ${presentation.label}. Change due date`
          : 'No due date. Choose due date'
      }
      onPress={onPress}
      style={({ pressed }) => [
        styles.dueRow,
        compact && styles.dueRowCompact,
        grouped && styles.newGoalSettingRow,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.dueRowIcon, grouped && styles.newGoalSettingIcon]}>
        <CalendarDays size={16} color={grouped ? '#92736A' : '#71717A'} />
      </View>
      <View style={[styles.dueRowCopy, grouped && styles.newGoalSettingCopy]}>
        <Text style={[styles.dueRowLabel, grouped && styles.newGoalSettingLabel]}>Due</Text>
        <Text style={[styles.dueRowValue, grouped && styles.newGoalSettingValue]} numberOfLines={1}>
          {presentation?.label ?? 'No due date'}
        </Text>
      </View>
      <ChevronRight size={16} color={grouped ? '#987A71' : '#A1A1AA'} />
    </Pressable>
  );
}

type GoalCollaborationMode = 'private' | 'supported' | 'shared';

const collaborationLabel = (
  mode: GoalCollaborationMode,
  connection?: Connection
) =>
  mode === 'shared' && connection
    ? `Together with ${connection.displayName}`
    : mode === 'supported' && connection
      ? `Supported by ${connection.displayName}`
      : 'Just me';

function TogetherRow({
  mode,
  connection,
  onPress,
  grouped = false,
}: {
  mode: GoalCollaborationMode;
  connection?: Connection;
  onPress: () => void;
  grouped?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.dueRow,
        styles.dueRowCompact,
        styles.togetherRowCompact,
        grouped && styles.newGoalSettingRow,
        grouped && styles.newGoalSettingRowLast,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.dueRowIcon, grouped && styles.newGoalSettingIcon]}>
        <Users size={16} color={grouped ? '#92736A' : '#71717A'} />
      </View>
      <View style={[styles.dueRowCopy, grouped && styles.newGoalSettingCopy]}>
        <Text style={[styles.dueRowLabel, grouped && styles.newGoalSettingLabel]}>Doing This</Text>
        <Text style={[styles.dueRowValue, grouped && styles.newGoalSettingValue]} numberOfLines={1}>
          {collaborationLabel(mode, connection)}
        </Text>
      </View>
      <ChevronRight size={16} color={grouped ? '#987A71' : '#A1A1AA'} />
    </Pressable>
  );
}

function TogetherChooserSheet({
  visible,
  dismissRequest,
  value,
  personId,
  connections,
  onChange,
  onInvite,
  onClose,
}: {
  visible: boolean;
  dismissRequest: number;
  value: GoalCollaborationMode;
  personId: string | null;
  connections: Connection[];
  onChange: (mode: GoalCollaborationMode, userId: string | null) => void;
  onInvite: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { height: viewportHeight } = useWindowDimensions();
  const sheetY = useRef(new Animated.Value(viewportHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);
  const [personMode, setPersonMode] = useState<
    Exclude<GoalCollaborationMode, 'private'> | null
  >(null);
  const [draftMode, setDraftMode] = useState<GoalCollaborationMode>(value);

  useEffect(() => {
    if (!visible) return;
    closingRef.current = false;
    setPersonMode(null);
    setDraftMode(value);
    sheetY.setValue(viewportHeight);
    backdropOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(sheetY, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, sheetY, viewportHeight, visible]);

  const dismiss = (
    selection?: { mode: GoalCollaborationMode; userId: string | null }
  ) => {
    if (closingRef.current) return;
    closingRef.current = true;
    Animated.parallel([
      Animated.timing(sheetY, {
        toValue: viewportHeight,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;
      if (selection) onChange(selection.mode, selection.userId);
      closingRef.current = false;
      onClose();
    });
  };

  useEffect(() => {
    if (visible && dismissRequest > 0) dismiss();
  }, [dismissRequest]);

  if (!visible) return null;

  const choices: Array<{
    mode: GoalCollaborationMode;
    eyebrow: string;
    copy: string;
  }> = [
    {
      mode: 'private',
      eyebrow: 'JUST ME',
      copy: "I’m doing this for myself.",
    },
    {
      mode: 'shared',
      eyebrow: 'TOGETHER',
      copy: "We're working toward this together.",
    },
    {
      mode: 'supported',
      eyebrow: 'SUPPORT ME',
      copy: "I’m doing this, with someone in my corner.",
    },
  ];

  return (
      <View style={styles.newGoalChildSheetRoot}>
        <Animated.View
          style={[
            styles.togetherChooserBackdrop,
            { opacity: backdropOpacity },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => dismiss()}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.togetherChooserSheet,
            {
              paddingBottom: Math.max(20, insets.bottom + 12),
              transform: [{ translateY: sheetY }],
            },
          ]}
        >
          <View style={styles.dragHandleArea}>
            <View style={[styles.grabber, styles.secondarySheetGrabber]} />
          </View>
          <View style={styles.togetherChooserHeader}>
            <Text style={styles.togetherChooserTitle}>
              {personMode ? 'Who’s in this with you?' : 'Doing this'}
            </Text>
            <Pressable
              onPress={() => dismiss()}
              hitSlop={6}
              style={({ pressed }) => [
                styles.secondarySheetClose,
                pressed && styles.pressed,
              ]}
            >
              <X size={22} color="#5F4D47" />
            </Pressable>
          </View>
          <View style={styles.togetherChoices}>
            {personMode ? connections.map((connection) => {
              const selected =
                value === personMode && personId === connection.userId;
              return (
                <Pressable
                  key={connection.id}
                  onPress={() =>
                    dismiss({ mode: personMode, userId: connection.userId })
                  }
                  style={({ pressed }) => [
                    styles.togetherChoice,
                    selected && styles.togetherChoiceSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.togetherChoiceCopy}>
                    <Text style={styles.togetherChoiceEyebrow}>
                      {connection.relationshipType.toUpperCase()}
                    </Text>
                    <Text style={styles.togetherChoiceTitle}>
                      {connection.displayName}
                    </Text>
                    <Text style={styles.togetherChoiceDescription}>
                      {personMode === 'shared'
                        ? 'Move this goal forward together'
                        : 'Invite their support for this goal'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.togetherChoiceCheck,
                      selected && styles.togetherChoiceCheckSelected,
                    ]}
                  >
                    {selected && (
                      <Check size={13} color="#FFFFFF" strokeWidth={3} />
                    )}
                  </View>
                </Pressable>
              );
            }) : choices.map((choice) => {
              const selected = choice.mode === draftMode;
              const identityStyle = choice.mode === 'private'
                ? styles.togetherChoicePrivate
                : choice.mode === 'shared'
                  ? styles.togetherChoiceShared
                  : styles.togetherChoiceSupported;
              return (
                <Pressable
                  key={choice.mode}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setDraftMode(choice.mode)}
                  style={({ pressed }) => [
                    styles.togetherChoice,
                    styles.togetherModeChoice,
                    selected && identityStyle,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[
                    styles.togetherChoiceModeIcon,
                    choice.mode === 'private'
                      ? styles.togetherIconPrivate
                      : choice.mode === 'shared'
                        ? styles.togetherIconShared
                        : styles.togetherIconSupported,
                  ]}>
                    {choice.mode === 'private' ? (
                      <User size={20} color="#B84A36" strokeWidth={2.4} />
                    ) : choice.mode === 'shared' ? (
                      <Users size={20} color="#8B7100" strokeWidth={2.4} />
                    ) : (
                      <HeartHandshake size={20} color="#147F78" strokeWidth={2.4} />
                    )}
                  </View>
                  <View style={styles.togetherChoiceCopy}>
                    <Text style={styles.togetherModeTitle}>{choice.eyebrow}</Text>
                    <Text style={styles.togetherModeDescription}>{choice.copy}</Text>
                  </View>
                  <View style={[
                    styles.togetherModeRadio,
                    selected && (
                      choice.mode === 'supported'
                        ? styles.togetherModeRadioSupported
                        : choice.mode === 'shared'
                          ? styles.togetherModeRadioShared
                          : styles.togetherModeRadioSelected
                    ),
                  ]}>
                    {selected && <View style={styles.togetherChoiceRadioDot} />}
                  </View>
                </Pressable>
              );
            })}
            {personMode && (
              <Pressable onPress={() => setPersonMode(null)} style={styles.togetherChooserBack}>
                <Text style={styles.togetherChooserBackText}>Back</Text>
              </Pressable>
            )}
            {personMode && connections.length === 0 && (
              <View style={styles.togetherNoConnections}>
                <Text style={styles.togetherNoConnectionsText}>
                  Invite someone before sharing or asking for support. Existing goals stay private.
                </Text>
                <Pressable
                  onPress={() => {
                    dismiss();
                    onInvite();
                  }}
                  style={({ pressed }) => [styles.togetherInviteLink, pressed && styles.pressed]}
                >
                  <Text style={styles.togetherInviteLinkText}>Invite someone</Text>
                </Pressable>
              </View>
            )}
          </View>
          {!personMode && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (draftMode === 'private') {
                  dismiss({ mode: 'private', userId: null });
                  return;
                }
                setPersonMode(draftMode);
              }}
              style={({ pressed }) => [
                styles.secondarySheetCta,
                styles.togetherContinue,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.secondarySheetCtaText}>CONTINUE</Text>
            </Pressable>
          )}
        </Animated.View>
      </View>
  );
}

function AppContent({
  currentUserId,
  currentProfileName = 'You',
  initialTasks,
  initialConnections,
  initialInvites,
  initialInteractions,
  remoteMode,
}: {
  currentUserId: string;
  currentProfileName?: string;
  initialTasks: Task[];
  initialConnections: Connection[];
  initialInvites: ConnectionInvite[];
  initialInteractions: TogetherInteraction[];
  remoteMode: boolean;
}) {
  const currentMember = useMemo(
    () => ({
      ...demoCurrentMember,
      id: currentUserId,
      name: currentProfileName,
      initials: currentProfileName
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('') || 'Y',
    }),
    [currentProfileName, currentUserId]
  );
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [generatingStepGoalIds, setGeneratingStepGoalIds] = useState<Set<string>>(
    () => new Set()
  );
  const generatedStepGoalIdsRef = useRef(new Set<string>());
  const [tab, setTab] = useState('home');
  const [voiceDumpOpen, setVoiceDumpOpen] = useState(false);
  const [voiceOrbRect, setVoiceOrbRect] = useState<VoiceOrbRect | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [voiceArrivalIds, setVoiceArrivalIds] = useState<string[]>([]);
  const pendingVoiceGoalsRef = useRef<Task[]>([]);
  const voiceArrivalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceTransition = useRef(new Animated.Value(0)).current;
  const [connections, setConnections] = useState<Connection[]>(
    initialConnections
  );
  const [connectionInvites, setConnectionInvites] = useState<ConnectionInvite[]>(initialInvites);
  const [togetherInteractions, setTogetherInteractions] = useState<TogetherInteraction[]>(initialInteractions);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => {
      subscription.remove();
      if (voiceArrivalTimerRef.current) clearTimeout(voiceArrivalTimerRef.current);
    };
  }, []);
  const togetherFixture = useMemo(
    () => ({
      ...activeTogetherFixture,
      currentMember,
      connections,
      supportedGoals: remoteMode ? [] : activeTogetherFixture.supportedGoals,
      sharedGoals: remoteMode ? [] : activeTogetherFixture.sharedGoals,
      recentWin: remoteMode ? '' : activeTogetherFixture.recentWin,
    }),
    [connections, currentMember, remoteMode]
  );
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(
    () => activeTogetherFixture.connections[0]?.id ?? null
  );

  // IMPORTANT:
  // Store ONLY the selected task ID.
  const [selectedId, setSelectedId] = useState<string | null>(
    null
  );
  const [sharedDetailId, setSharedDetailId] =
    useState<string | null>(null);

  // The sheet always receives the latest task object.
  const selected =
    tasks.find((task) => task.id === selectedId) ?? null;
  const sharedDetailRecord =
    tasks.find(
      (task) =>
        task.id === sharedDetailId &&
        (
          task.ownerId === currentUserId ||
          task.memberIds?.includes(currentUserId) ||
          task.supporterIds?.includes(currentUserId) ||
          task.sharedWithUserIds?.includes(currentUserId)
        ) &&
        (
          task.collaborationMode === 'shared' ||
          task.collaborationMode === 'supported' ||
          (task.sharedWithUserIds?.length ?? 0) > 0
        )
    ) ?? null;
  const sharedDetailTask =
    sharedDetailRecord?.status !== 'deleted' ? sharedDetailRecord : null;
  const sharedDetailPermissions = deriveGoalViewPermissions(
    sharedDetailTask?.ownerId,
    currentUserId,
    sharedDetailTask ?? undefined
  );
  const sharedDetailConnection = sharedDetailRecord
    ? findGoalConnection(
        sharedDetailRecord.ownerId === currentMember.id
          ? sharedDetailRecord.collaborationMode === 'shared'
            ? sharedDetailRecord.memberIds?.filter((id) => id !== currentMember.id)
            : sharedDetailRecord.collaborationMode === 'supported'
              ? sharedDetailRecord.supporterIds
              : sharedDetailRecord.sharedWithUserIds
          : [sharedDetailRecord.ownerId ?? ''],
        connections,
        currentMember.id
      )
    : null;

  useEffect(() => {
    if (sharedDetailId && !sharedDetailRecord) {
      setSharedDetailId(null);
    }
  }, [sharedDetailId, sharedDetailRecord]);

  const openCanonicalOwnerGoal = (goalId: string) => {
    const goal = tasks.find((task) => task.id === goalId);
    if (!goal) return;
    const permissions = deriveGoalViewPermissions(goal.ownerId, currentUserId, goal);
    if (!permissions.canEditGoal) {
      setSelectedId(null);
      setSharedDetailId(goal.id);
      return;
    }
    setSharedDetailId(null);
    setSelectedId(goalId);
  };

  const openTogetherGoal = (goalId: string) => {
    const goal = tasks.find((task) => task.id === goalId);
    if (!goal) return;
    setSelectedId(null);
    setSharedDetailId(goal.id);
  };

  const [newGoalTransitionState, setNewGoalTransitionStateState] =
    useState<NewGoalTransitionState>('closed');
  const newGoalTransitionStateRef = useRef<NewGoalTransitionState>('closed');
  const newGoalCycleIdRef = useRef(0);
  const newGoalNativeModalDismissedRef = useRef(true);
  const newGoalOpenQueuedRef = useRef(false);
  const logNewGoalLifecycle = useCallback((event: string, detail?: unknown) => {
    if (!__DEV__) return;
    console.debug(`[NEWGOAL cycle ${newGoalCycleIdRef.current}] ${event}`, detail ?? '');
  }, []);
  const setNewGoalTransitionState = useCallback((next: NewGoalTransitionState) => {
    newGoalTransitionStateRef.current = next;
    setNewGoalTransitionStateState(next);
  }, []);
  const [newGoalOrigin, setNewGoalOrigin] = useState<LandingRect | null>(null);
  const newGoalFocusRiseProgress = useRef(new Animated.Value(0)).current;
  const newGoalSwipeDismissDragY = useSharedValue(0);
  const newGoalSwipeDismissTravel = useSharedValue(1);
  const newGoalSwipeDismissProgress = useDerivedValue(() => Math.max(
    0,
    Math.min(1, newGoalSwipeDismissDragY.value / Math.max(1, newGoalSwipeDismissTravel.value))
  ));
  const newGoalInteractiveDepthStyle = useAnimatedStyle(() => {
    const progress = newGoalSwipeDismissProgress.value;
    const inverseScale = 1 / (1 - 0.015 * progress);
    return {
      transform: [
        { translateY: (3 * progress) / (1 - 0.015 * progress) },
        { scale: inverseScale },
      ],
    };
  });
  const [newGoalMorphOwnsFab, setNewGoalMorphOwnsFab] = useState(false);
  const [newGoalFabHandoffNeutral, setNewGoalFabHandoffNeutral] = useState(false);
  const handleNewGoalFabOwnershipChange = useCallback(
    (owned: boolean, decorationVisible = true) => {
      setNewGoalMorphOwnsFab(owned);
      setNewGoalFabHandoffNeutral(!decorationVisible);
    },
    []
  );
  const newGoalFabRef = useRef<View | null>(null);
  const newGoalLaunchPendingRef = useRef(false);
  const newGoalSessionRef = useRef(0);
  const [newGoalSession, setNewGoalSession] = useState(0);
  const [title, setTitle] = useState('');
  const [category, setCategory] =
    useState<Category>('work');
  const [dueAt, setDueAt] = useState<string | undefined>();
  const [dueHasTime, setDueHasTime] = useState(false);
  const [collaborationMode, setCollaborationMode] =
    useState<'private' | 'supported' | 'shared'>('private');
  const [collaborationPersonId, setCollaborationPersonId] =
    useState<string | null>(null);

  const [toast, setToast] = useState('');
  const [libraryView, setLibraryView] =
    useState<'active' | 'completed' | 'deleted' | null>(null);
  const [openSwipeTaskId, setOpenSwipeTaskId] =
    useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] =
    useState<Set<Category>>(() => new Set());
  const [handoffDestination, setHandoffDestination] =
    useState<GoalHandoffDestination | null>(null);
  const [focusTaskId, setFocusTaskId] = useState<string | null>(
    () => initialTasks.find((task) => task.isFocusHero)?.id ?? null
  );
  const [shakeTaskId, setShakeTaskId] =
    useState<string | null>(null);
    
  const [shakeNonce, setShakeNonce] = useState(0);
  const [completionPhases, setCompletionPhases] = useState<
    Record<string, 'acknowledging' | 'departing'>
  >({});
  const completionLocksRef = useRef(new Set<string>());
  const [completionCelebration, setCompletionCelebration] = useState<{
    id: number;
    accent: string;
    origin: 'card' | 'hero';
  } | null>(null);
  const celebrationNonceRef = useRef(0);
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
  }, []);
  const [
    enteringTaskId,
    setEnteringTaskId,
  ] = useState<string | null>(
    null
  );
  const [
    hiddenHandoffTaskId,
    setHiddenHandoffTaskId,
  ] = useState<string | null>(
    null
  );
  const [
    goalHandoffNonce,
    setGoalHandoffNonce,
  ] = useState(0);
  const homeScrollRef =
  useRef<ScrollView | null>(
    null
  );
  const homeScrollYRef =
  useRef(0);
  const guidedScrollY = useRef(
    new Animated.Value(0)
  ).current;
  const handoffProgress = useRef(
    new Animated.Value(0)
  ).current;
  const [
    destinationOwnershipTaskId,
    setDestinationOwnershipTaskId,
  ] = useState<string | null>(null);
  const stackOwnershipNonceTaskRef = useRef<string | null>(null);
  useEffect(() => {
    if (hiddenHandoffTaskId === null) {
      setDestinationOwnershipTaskId(null);
      return;
    }

    const activeTaskId = hiddenHandoffTaskId;
    setDestinationOwnershipTaskId(null);

    const listenerId =
      handoffProgress.addListener(
        ({ value }) => {
          if (
            value >=
            GOAL_HANDOFF.landingCrossfadeStart
          ) {
            setDestinationOwnershipTaskId(
              activeTaskId
            );
            handoffProgress.removeListener(
              listenerId
            );
          }
        }
      );

    return () => {
      handoffProgress.removeListener(listenerId);
    };
  }, [hiddenHandoffTaskId, handoffProgress]);
const homeViewportHeightRef =
  useRef(0);
const homeViewportScreenYRef =
  useRef(0);
const homeContentHeightRef =
  useRef(0);
  const goalPositionsRef = useRef<
  Record<string, number>
>({});
const goalViewRefs = useRef<
  Record<string, View | null>
>({});
const goalCardRefs = useRef<
  Record<string, View | null>
>({});
const stackMeasurementTaskRef = useRef<string | null>(null);
const stackScrollListenerRef = useRef<string | null>(null);

useEffect(() => {
  return () => {
    if (stackScrollListenerRef.current !== null) {
      handoffProgress.removeListener(stackScrollListenerRef.current);
      stackScrollListenerRef.current = null;
    }
  };
}, [handoffProgress]);

type LandingRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  scrollDeltaY?: number;
};

const [
  goalLandingRect,
  setGoalLandingRect,
] = useState<LandingRect | null>(
  null
);
  const screenOpacity = useRef(
    new Animated.Value(1)
  ).current;
  
  const screenTranslateY = useRef(
    new Animated.Value(0)
  ).current;
  useEffect(() => {
    const listenerId =
      guidedScrollY.addListener(
        ({ value }) => {
          homeScrollRef.current?.scrollTo({
            y: value,
            animated: false,
          });
        }
      );
  
    return () => {
      guidedScrollY.removeListener(
        listenerId
      );
    };
  }, [guidedScrollY]);
  const homeTasks = tasks.filter(
    (task) =>
      !remoteMode ||
      task.ownerId === currentUserId ||
      (task.collaborationMode === 'shared' && task.memberIds?.includes(currentUserId))
  );
  const activeTasks = homeTasks.filter(
    (task) => task.status === 'active'
  );
  const completedTasks = homeTasks.filter(
    (task) => task.status === 'completed'
  );
  const deletedTasks = homeTasks.filter(
    (task) => task.status === 'deleted'
  );
  const remainingSmallSteps = activeTasks.reduce(
    (count, task) =>
      count + task.microSteps.filter((step) => !step.completed).length,
    0
  );
  const hasSmallSteps = activeTasks.some((task) => task.microSteps.length > 0);

  const smartFocus = useMemo(
    () => getSmartCurrentFocus(activeTasks, focusTaskId),
    [activeTasks, focusTaskId]
  );
  const hero =
    activeTasks.find((task) => task.id === focusTaskId) ??
    smartFocus ??
    activeTasks[0];

  useEffect(() => {
    if (enteringTaskId !== null) return;
    const nextFocus = getSmartCurrentFocus(
      activeTasks,
      focusTaskId
    );
    const nextFocusId = nextFocus?.id ?? null;
    if (nextFocusId !== focusTaskId) {
      setFocusTaskId(nextFocusId);
    }
  }, [activeTasks, enteringTaskId, focusTaskId]);

  const regular = useMemo(
    () =>
      sortGoalsForSmartHome(
        homeTasks.filter(
          (task) =>
            task.status === 'active' &&
            task.id !== hero?.id
        ),
        focusTaskId
      ).sort(
          (a, b) =>
            CATEGORY_ORDER.indexOf(a.category) -
            CATEGORY_ORDER.indexOf(b.category)
        ),
    [homeTasks, hero?.id, focusTaskId]
  );

  const categoryGroups = useMemo(
    () =>
      CATEGORY_ORDER
        .map((categoryId) => ({
          category: categoryId,
          tasks: regular.filter(
            (task) => task.category === categoryId
          ),
        }))
        .filter((group) => group.tasks.length > 0),
    [regular]
  );

  const toggleCategory = (categoryId: Category) => {
    setOpenSwipeTaskId(null);
    setExpandedCategories((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const remaining = activeTasks.length;
  const homeMomentTask = regular.find((task) => {
    const urgency = getGoalUrgency(task);
    return urgency === 'overdue' || urgency === 'today' || urgency === 'tomorrow';
  }) ?? null;
  const homePreviewTasks = useMemo(() => {
    const entering = enteringTaskId
      ? regular.find((task) => task.id === enteringTaskId)
      : null;
    if (!entering) return regular.slice(0, 2);
    const sameCategoryExisting = regular.find(
      (task) => task.category === entering.category && task.id !== entering.id
    );
    if (handoffDestination?.kind !== 'individual' && sameCategoryExisting) {
      return [sameCategoryExisting, entering];
    }
    return [entering, ...regular.filter((task) => task.id !== entering.id)].slice(0, 2);
  }, [enteringTaskId, handoffDestination?.kind, regular]);

  const relationshipLabelForTask = (task: Task): string | null => {
    if (task.collaborationMode === 'private') return null;
    const participantIds = task.collaborationMode === 'shared'
      ? task.memberIds ?? []
      : task.supporterIds ?? [];
    const otherUserId = task.ownerId === currentUserId
      ? participantIds.find((id) => id !== currentUserId && id !== task.ownerId)
      : task.ownerId;
    const personName = connections.find(
      (connection) => connection.userId === otherUserId
    )?.displayName ?? (task.ownerId !== currentUserId ? task.ownerName : undefined);
    if (!personName) return null;
    return task.collaborationMode === 'shared'
      ? `Together with ${personName}`
      : `Supported by ${personName}`;
  };

  const focusRelationshipLabel = hero ? relationshipLabelForTask(hero) : null;

  const notify = (message: string) => {
    setToast(message);
  };

  const remoteRefreshInFlightRef = useRef<Promise<void> | null>(null);
  const refreshRemoteTasks = useCallback(() => {
    if (!remoteMode) return Promise.resolve();
    if (remoteRefreshInFlightRef.current) return remoteRefreshInFlightRef.current;
    const refresh = workspaceDomain.loadTasks()
      .then((nextTasks) => setTasks(nextTasks))
      .catch((error) => {
        if (__DEV__) console.error('[Sunday goal refresh]', toBackendError(error));
        setToast('We could not refresh your goals just yet');
      })
      .finally(() => {
        remoteRefreshInFlightRef.current = null;
      });
    remoteRefreshInFlightRef.current = refresh;
    return refresh;
  }, [remoteMode]);

  const persistReviewedVoiceGoals = useCallback(async (
    proposals: Parameters<typeof persistVoiceGoals>[0],
    commitKey: string
  ) => {
    if (!remoteMode) throw new Error('Voice persistence requires the authenticated backend');
    const created = await persistVoiceGoals(proposals, commitKey);
    pendingVoiceGoalsRef.current = created;
  }, [remoteMode]);

  const refreshRemoteTogether = useCallback(async () => {
    if (!remoteMode) return;
    try {
      const [nextConnections, nextInvites, nextInteractions] = await Promise.all([
        workspaceDomain.loadConnections(),
        workspaceDomain.loadInvites(),
        workspaceDomain.loadInteractions(),
      ]);
      setConnections(nextConnections);
      setConnectionInvites(nextInvites);
      setTogetherInteractions(nextInteractions);
      setSelectedConnectionId((current) =>
        nextConnections.some((connection) => connection.id === current)
          ? current
          : nextConnections[0]?.id ?? null
      );
    } catch (error) {
      if (__DEV__) console.error('[Sunday Together refresh]', toBackendError(error));
      setToast('We could not refresh Together just yet');
    }
  }, [remoteMode]);

  const recoverRemoteTasks = useCallback((message: string, error: unknown) => {
    if (__DEV__) console.error('[Sunday optimistic goal rollback]', toBackendError(error));
    setToast(message);
    void refreshRemoteTasks();
  }, [refreshRemoteTasks]);

  const remoteGoalId = (task: Task) => task.remoteId ?? task.id;

  const sharedSubscriptionIds = useMemo(
    () => tasks
      .filter(
        (task) =>
          task.status === 'active' &&
          (task.collaborationMode === 'shared' ||
            task.collaborationMode === 'supported' ||
            Boolean(task.sharedWithUserIds?.length)) &&
          task.remoteId
      )
      .map((task) => task.remoteId as string)
      .sort()
      .join(','),
    [tasks]
  );

  useEffect(() => {
    if (!remoteMode || !sharedSubscriptionIds) return;
    const unsubscribe = sharedSubscriptionIds
      .split(',')
      .map((goalId) => workspaceDomain.subscribeToGoal(goalId, () => {
        void refreshRemoteTasks();
      }));
    return () => unsubscribe.forEach((remove) => remove());
  }, [refreshRemoteTasks, remoteMode, sharedSubscriptionIds]);

  useEffect(() => {
    if (!remoteMode || tab !== 'together') return;
    void refreshRemoteTogether();
    void refreshRemoteTasks();
  }, [refreshRemoteTasks, refreshRemoteTogether, remoteMode, tab]);

  useEffect(() => {
    if (!remoteMode) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void refreshRemoteTogether();
      void refreshRemoteTasks();
    });
    return () => subscription.remove();
  }, [refreshRemoteTasks, refreshRemoteTogether, remoteMode]);

  useEffect(() => {
    if (!remoteMode) return;
    return workspaceDomain.subscribeToTogether(() => {
      void refreshRemoteTogether();
      void refreshRemoteTasks();
    });
  }, [refreshRemoteTasks, refreshRemoteTogether, remoteMode]);

  useEffect(() => {
    if (!remoteMode) return;
    return workspaceDomain.subscribeToTogetherInteractions(() => {
      void refreshRemoteTogether();
    });
  }, [refreshRemoteTogether, remoteMode]);

  const triggerShake = (taskId: string) => {
    setShakeTaskId(taskId);
    setShakeNonce((value) => value + 1);
  
    setTimeout(() => {
      setShakeTaskId((current) =>
        current === taskId
          ? null
          : current
      );
    }, 700);
  };

  const toggleStep = (
    taskId: string,
    stepId: string
  ) => {
    const previousTask = tasks.find((task) => task.id === taskId);
    const permissions = deriveGoalViewPermissions(previousTask?.ownerId, currentUserId, previousTask);
    if (!previousTask || !permissions.canEditMicrotasks) return;
    const previousStep = previousTask?.microSteps.find((step) => step.id === stepId);
    const nextCompleted = !previousStep?.completed;
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        const updatedSteps =
          task.microSteps.map((step) =>
            step.id === stepId
              ? {
                  ...step,
                  completed: !step.completed,
                }
              : step
          );

        const allStepsComplete =
          updatedSteps.length > 0 &&
          updatedSteps.every(
            (step) => step.completed
          );

        const remainsCompleted =
          task.status === 'completed' &&
          allStepsComplete;

        return {
          ...task,
          microSteps: updatedSteps,

          // If a completed goal has a step unticked,
          // it automatically becomes incomplete.
          completed: remainsCompleted,
          status:
            task.status === 'completed' &&
            !remainsCompleted
              ? 'active'
              : task.status,
          completedAt: remainsCompleted
            ? task.completedAt
            : undefined,
        };
      })
    );
    if (remoteMode && previousTask && previousStep) {
      void (async () => {
        try {
          await workspaceDomain.updateMicrotask(stepId, { completed: nextCompleted });
          if (previousTask.status === 'completed' && !nextCompleted) {
            await workspaceDomain.reopenGoal(remoteGoalId(previousTask));
          }
        } catch (error) {
          recoverRemoteTasks('That step could not be updated', error);
        }
      })();
    }
  };

  const addMicroStep = async (taskId: string, title: string) => {
    const task = tasks.find((candidate) => candidate.id === taskId);
    const trimmedTitle = title.trim();
    const permissions = deriveGoalViewPermissions(task?.ownerId, currentUserId, task);
    if (!task || !permissions.canEditMicrotasks || !trimmedTitle) return false;
    try {
      const step = remoteMode
        ? await workspaceDomain.createMicrotask(remoteGoalId(task), trimmedTitle)
        : {
            id: `step-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            title: trimmedTitle,
            completed: false,
          };
      setTasks((current) => current.map((candidate) =>
        candidate.id === taskId
          ? { ...candidate, microSteps: [...candidate.microSteps, step] }
          : candidate
      ));
      return true;
    } catch (error) {
      if (__DEV__) console.error('[Sunday create microtask]', toBackendError(error));
      notify('That step could not be added');
      return false;
    }
  };

  const attemptComplete = (task: Task) => {
    if (!deriveGoalViewPermissions(task.ownerId, currentUserId, task).canComplete) return;
    const canComplete = canCompleteGoal(task);

    if (!task.completed && !canComplete) {
      triggerShake(task.id);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      notify('Complete the small steps first');

      return;
    }

    complete(task);
  };

  const complete = async (task: Task) => {
    if (!deriveGoalViewPermissions(task.ownerId, currentUserId, task).canComplete) return;
    const canComplete = canCompleteGoal(task);

    if (!task.completed && !canComplete) {
      triggerShake(task.id);

      notify('Complete the small steps first');

      return;
    }

    const wasCompleted = task.status === 'completed';
    if (wasCompleted) {
      setTasks((current) => current.map((item) => item.id === task.id
        ? { ...item, completed: false, status: 'active', completedAt: undefined }
        : item));
      if (remoteMode) {
        void workspaceDomain.reopenGoal(remoteGoalId(task)).catch((error) =>
          recoverRemoteTasks('That goal could not be updated', error)
        );
      }
      notify('Goal reopened');
      return;
    }

    if (completionLocksRef.current.has(task.id)) return;
    completionLocksRef.current.add(task.id);
    setCompletionPhases((current) => ({ ...current, [task.id]: 'acknowledging' }));
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      if (remoteMode) await workspaceDomain.completeGoal(remoteGoalId(task));
      const celebrationId = ++celebrationNonceRef.current;
      setCompletionCelebration({
        id: celebrationId,
        accent: COLORS[task.category].accent,
        origin: task.id === hero?.id ? 'hero' : 'card',
      });
      if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
      celebrationTimerRef.current = setTimeout(() => {
        setCompletionCelebration((current) =>
          current?.id === celebrationId ? null : current
        );
        celebrationTimerRef.current = null;
      }, reducedMotion ? 420 : 2500);
      setCompletionPhases((current) => ({ ...current, [task.id]: 'departing' }));
      await new Promise<void>((resolve) => setTimeout(
        resolve,
        reducedMotion ? motion.duration.reduced : 460
      ));
      setTasks((current) => current.map((item) => item.id === task.id
        ? {
            ...item,
            completed: true,
            status: 'completed',
            completedAt: new Date().toISOString(),
          }
        : item));
      notify('Goal completed — keep the momentum');
    } catch (error) {
      if (__DEV__) console.error('[Sunday complete goal]', toBackendError(error));
      notify('That goal could not be updated');
      void refreshRemoteTasks();
    } finally {
      completionLocksRef.current.delete(task.id);
      setCompletionPhases((current) => {
        const next = { ...current };
        delete next[task.id];
        return next;
      });
    }
  };

  const moveGoalToDeleted = (taskId: string) => {
    const taskToDelete = tasks.find((task) => task.id === taskId);
    if (!deriveGoalViewPermissions(taskToDelete?.ownerId, currentUserId, taskToDelete).canDelete) return;
    LayoutAnimation.configureNext({
      duration: 190,
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });

    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: 'deleted',
              deletedAt: new Date().toISOString(),
            }
          : task
      )
    );
    setSelectedId(null);
    notify('Moved to Recently Deleted');
    if (remoteMode && taskToDelete) {
      void workspaceDomain.moveToDeleted(remoteGoalId(taskToDelete)).catch((error) => {
        recoverRemoteTasks('That goal could not be deleted', error);
      });
    }
  };

  const moveCategoryToDeleted = (categoryId: Category) => {
    const tasksToDelete = homeTasks.filter(
      (task) =>
        task.status === 'active' &&
        task.category === categoryId &&
        deriveGoalViewPermissions(task.ownerId, currentUserId, task).canDelete
    );
    const taskIdsToDelete = new Set(tasksToDelete.map((task) => task.id));
    LayoutAnimation.configureNext({
      duration: 190,
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });

    const deletedAt = new Date().toISOString();
    setTasks((current) =>
      current.map((task) =>
        taskIdsToDelete.has(task.id)
          ? {
              ...task,
              status: 'deleted',
              deletedAt,
            }
          : task
      )
    );
    setExpandedCategories((current) => {
      const next = new Set(current);
      next.delete(categoryId);
      return next;
    });
    setSelectedId(null);
    notify('Goals moved to Recently Deleted');
    if (remoteMode) {
      void Promise.all(
        tasksToDelete.map((task) => workspaceDomain.moveToDeleted(remoteGoalId(task)))
      ).catch((error) => {
        recoverRemoteTasks('Those goals could not all be deleted', error);
      });
    }
  };

  const requestDeleteGoal = (
    taskId: string,
    onCancel?: () => void,
    onConfirm?: (commit: () => void) => void
  ) => {
    Alert.alert(
      'Delete goal?',
      'This will move the goal to Recently Deleted.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: onCancel,
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const commit = () =>
              moveGoalToDeleted(taskId);
            if (onConfirm) {
              onConfirm(commit);
            } else {
              commit();
            }
          },
        },
      ]
    );
  };

  const requestDeleteCategory = (
    categoryId: Category,
    onCancel?: () => void,
    onConfirm?: (commit: () => void) => void
  ) => {
    const affectedCount = homeTasks.filter(
      (task) =>
        task.status === 'active' &&
        task.category === categoryId
    ).length;

    if (affectedCount <= 1) {
      const onlyGoal = homeTasks.find(
        (task) =>
          task.status === 'active' &&
          task.category === categoryId
      );
      if (onlyGoal) {
        requestDeleteGoal(
          onlyGoal.id,
          onCancel,
          onConfirm
        );
      } else {
        onCancel?.();
      }
      return;
    }

    Alert.alert(
      'Delete all goals?',
      `This will move all ${affectedCount} ${COLORS[categoryId].name} goals to Recently Deleted.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: onCancel,
        },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: () => {
            const commit = () =>
              moveCategoryToDeleted(categoryId);
            if (onConfirm) {
              onConfirm(commit);
            } else {
              commit();
            }
          },
        },
      ]
    );
  };

  const prepareLibraryRestore = async (taskId: string) => {
    const taskToRestore = tasks.find((task) => task.id === taskId);
    if (!taskToRestore) return false;
    if (!remoteMode) return true;
    try {
      await workspaceDomain.restoreGoal(remoteGoalId(taskToRestore));
      return true;
    } catch (error) {
      if (__DEV__) console.error('[Sunday restore goal]', toBackendError(error));
      notify('That goal could not be restored');
      return false;
    }
  };

  const commitLibraryRestore = (taskId: string) => {
    const restoredTask = tasks.find((task) => task.id === taskId);
    const wasCompleted = restoredTask?.status === 'completed';
    if (restoredTask) {
      setVoiceArrivalIds([restoredTask.remoteId ?? restoredTask.id]);
      if (voiceArrivalTimerRef.current) clearTimeout(voiceArrivalTimerRef.current);
      voiceArrivalTimerRef.current = setTimeout(
        () => setVoiceArrivalIds([]),
        reducedMotion ? 240 : 1300
      );
    }
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: 'active',
              completed: false,
              deletedAt: undefined,
              completedAt: undefined,
            }
          : task
      )
    );
    notify(wasCompleted ? 'Goal returned to Daily Flow' : 'Goal restored');
  };

  const preparePermanentDelete = (taskId: string) => new Promise<boolean>((resolve) => {
    const taskToDelete = tasks.find((task) => task.id === taskId);
    if (!taskToDelete) return resolve(false);
    Alert.alert('Delete permanently?', 'This goal cannot be recovered.', [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      {
        text: 'Delete Permanently',
        style: 'destructive',
        onPress: () => {
          if (!remoteMode) return resolve(true);
          void workspaceDomain.deletePermanently(remoteGoalId(taskToDelete))
            .then(() => resolve(true))
            .catch((error) => {
              if (__DEV__) console.error('[Sunday permanent delete]', toBackendError(error));
              notify('That goal could not be permanently deleted');
              resolve(false);
            });
        },
      },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });

  const commitPermanentDelete = (taskId: string) => {
    setTasks((current) => current.filter((task) => task.id !== taskId));
    notify('Goal permanently deleted');
  };

  const create = () => {
    if (!title.trim()) {
      return;
    }

    const relationshipConnection = connections.find(
      (connection) => connection.userId === collaborationPersonId
    );
    const resolvedCollaborationMode =
      collaborationMode !== 'private' && !relationshipConnection
        ? 'private'
        : collaborationMode;

    const now = Date.now();

    const task: Task = {
      id: String(now),
      title: title.trim(),
      category,
      minutes: 15,
      completed: false,
      status: 'active',
      dueAt,
      dueHasTime: dueAt ? dueHasTime : undefined,
      collaborationMode: resolvedCollaborationMode,
      ownerId: currentMember.id,
      memberIds:
        resolvedCollaborationMode === 'shared' && relationshipConnection
          ? [currentMember.id, relationshipConnection.userId]
          : [currentMember.id],
      supporterIds:
        resolvedCollaborationMode === 'supported' && relationshipConnection
          ? [relationshipConnection.userId]
          : [],
      microSteps: [],
    };
    const existingCategoryGoals = regular.filter(
      (candidate) => candidate.category === category
    );
    const destinationKind: GoalHandoffDestination['kind'] =
      expandedCategories.has(category) ||
      existingCategoryGoals.length === 0
        ? 'individual'
        : existingCategoryGoals.length === 1
          ? 'single-to-stack'
          : 'collapsed-stack';

    stackOwnershipNonceTaskRef.current = null;
    stackMeasurementTaskRef.current = null;
    setHandoffDestination({
      taskId: task.id,
      category,
      kind: destinationKind,
      existingCount: existingCategoryGoals.length,
    });
    setGoalLandingRect(null);
    setEnteringTaskId(task.id);
    setHiddenHandoffTaskId(task.id);
    
    setTasks((current) => [
      task,
      ...current,
    ]);
    if (remoteMode) {
      setGeneratingStepGoalIds((current) => new Set(current).add(task.id));
    }
    
    setTitle('');
    setDueAt(undefined);
    setDueHasTime(false);
    setCollaborationMode('private');
    setCollaborationPersonId(null);
    
    
    notify(
      'Goal created'
    );

    if (remoteMode) {
      const creationSession = newGoalSessionRef.current;
      void (async () => {
        let created: Task;
        try {
          created = await workspaceDomain.createGoal({
            title: task.title,
            category: task.category,
            collaborationMode: resolvedCollaborationMode,
            dueAt: task.dueAt,
            dueHasTime: task.dueHasTime,
            memberIds: task.memberIds,
            supporterIds: task.supporterIds,
            microtasks: [],
          });
          setTasks((current) => current.map((candidate) =>
            candidate.id === task.id
              ? { ...created, id: candidate.id, remoteId: created.id }
              : candidate
          ));
          setGeneratingStepGoalIds((current) => {
            const next = new Set(current);
            next.add(created.id);
            return next;
          });
        } catch (error) {
          if (__DEV__) console.error('[Sunday create goal]', toBackendError(error));
          setTasks((current) => current.filter((candidate) => candidate.id !== task.id));
          setGeneratingStepGoalIds((current) => {
            const next = new Set(current);
            next.delete(task.id);
            return next;
          });
          setToast('We could not save that goal');
          if (creationSession === newGoalSessionRef.current) {
            finishGoalHandoff(creationSession);
          }
          return;
        }

        if (generatedStepGoalIdsRef.current.has(created.id)) {
          setGeneratingStepGoalIds((current) => {
            const next = new Set(current);
            next.delete(task.id);
            next.delete(created.id);
            return next;
          });
          return;
        }
        generatedStepGoalIdsRef.current.add(created.id);
        try {
          const titles = await generateGoalSteps({
            title: created.title,
            category: created.category,
            dueAt: created.dueAt,
            relationshipMode: resolvedCollaborationMode,
          });
          const generatedSteps = await workspaceDomain.attachGeneratedMicrotasks(created.id, titles);
          setTasks((current) => current.map((candidate) =>
            candidate.id === task.id || candidate.id === created.id || candidate.remoteId === created.id
              ? { ...candidate, microSteps: generatedSteps }
              : candidate
          ));
        } catch (error) {
          if (__DEV__) {
            const generationError = error instanceof GoalStepGenerationError ? error : null;
            console.info('[Sunday goal step generation]', {
              stage: generationError?.stage ?? 'microtask-persistence',
              status: generationError?.status,
              code: generationError?.safeCode,
              message: error instanceof Error ? error.message : 'Goal steps could not be generated.',
            });
          }
        } finally {
          setGeneratingStepGoalIds((current) => {
            const next = new Set(current);
            next.delete(task.id);
            next.delete(created.id);
            return next;
          });
        }
      })();
    }
  };
  const finishGoalHandoff = (session: number) => {
    if (session !== newGoalSessionRef.current) {
      return;
    }

    guidedScrollY.stopAnimation();
  
    setEnteringTaskId(null);
    setHiddenHandoffTaskId(null);
    setGoalLandingRect(null);
    setHandoffDestination(null);
    stackOwnershipNonceTaskRef.current = null;
    stackMeasurementTaskRef.current = null;
    if (stackScrollListenerRef.current !== null) {
      handoffProgress.removeListener(stackScrollListenerRef.current);
      stackScrollListenerRef.current = null;
    }
  
    setNewGoalTransitionState('closed');
    newGoalFocusRiseProgress.stopAnimation();
    newGoalFocusRiseProgress.setValue(0);
    newGoalSwipeDismissDragY.value = 0;
    setNewGoalMorphOwnsFab(false);
    setNewGoalFabHandoffNeutral(false);
    newGoalLaunchPendingRef.current = false;
  };
  const openNewGoal = () => {
    const session = newGoalSessionRef.current + 1;
    newGoalSessionRef.current = session;
    setNewGoalSession(session);

    guidedScrollY.stopAnimation();
  
    setEnteringTaskId(null);
    setHiddenHandoffTaskId(null);
    setGoalLandingRect(null)
    setHandoffDestination(null);
    stackOwnershipNonceTaskRef.current = null;
    stackMeasurementTaskRef.current = null;
    if (stackScrollListenerRef.current !== null) {
      handoffProgress.removeListener(stackScrollListenerRef.current);
      stackScrollListenerRef.current = null;
    }
  
    setTitle('');
    setCategory('work');
    setDueAt(undefined);
    setDueHasTime(false);
    setCollaborationMode('private');
    setCollaborationPersonId(null);

    setNewGoalTransitionState('preparingOpen');
  };
  const openNewGoalFromFab = () => {
    logNewGoalLifecycle('FAB_PRESS_RECEIVED');
    if (newGoalTransitionStateRef.current !== 'closed' || newGoalLaunchPendingRef.current) {
      logNewGoalLifecycle(`OPEN_REJECTED:${newGoalTransitionStateRef.current}`, {
        launchPending: newGoalLaunchPendingRef.current,
      });
      return;
    }
    if (!newGoalNativeModalDismissedRef.current) {
      logNewGoalLifecycle(`OPEN_REJECTED:${newGoalTransitionStateRef.current}`, 'native-modal-dismiss-pending');
      newGoalOpenQueuedRef.current = true;
      return;
    }
    newGoalCycleIdRef.current += 1;
    logNewGoalLifecycle('OPEN_ACCEPTED');
    newGoalLaunchPendingRef.current = true;
    setNewGoalFabHandoffNeutral(false);
    setNewGoalOrigin(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const fab = newGoalFabRef.current;
    logNewGoalLifecycle('FAB_MEASURE_START', { refReady: Boolean(fab) });
    if (!fab) {
      newGoalLaunchPendingRef.current = false;
      openNewGoal();
      return;
    }
    fab.measureInWindow((x, y, width, height) => {
      const validFrame = [x, y, width, height].every(Number.isFinite) && width > 0 && height > 0;
      logNewGoalLifecycle('FAB_MEASURE_RESULT', { x, y, width, height, valid: validFrame });
      setNewGoalOrigin(validFrame ? { x, y, width, height } : null);
      requestAnimationFrame(() => {
        newGoalLaunchPendingRef.current = false;
        openNewGoal();
      });
    });
  };

  const updateTaskDue = (
    taskId: string,
    nextDueAt?: string,
    nextDueHasTime?: boolean
  ) => {
    const taskToUpdate = tasks.find((task) => task.id === taskId);
    if (!deriveGoalViewPermissions(taskToUpdate?.ownerId, currentUserId, taskToUpdate).canEditGoal) return;
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              dueAt: nextDueAt,
              dueHasTime: nextDueAt ? nextDueHasTime : undefined,
            }
          : task
      )
    );
    if (remoteMode && taskToUpdate) {
      void workspaceDomain.updateDue(
        remoteGoalId(taskToUpdate),
        nextDueAt,
        nextDueHasTime
      ).catch((error) => {
        recoverRemoteTasks('That due date could not be saved', error);
      });
    }
  };

  useEffect(() => {
    if (
      !handoffDestination ||
      handoffDestination.kind === 'individual' ||
      enteringTaskId !== handoffDestination.taskId ||
      stackMeasurementTaskRef.current === handoffDestination.taskId
    ) {
      return;
    }

    const destination = handoffDestination;
    const measurementSession = newGoalSessionRef.current;
    const destinationGroup = categoryGroups.find(
      (group) => group.category === destination.category
    );
    const preexistingTopTask = destinationGroup?.tasks.find(
      (task) => task.id !== destination.taskId
    );

    if (!preexistingTopTask) {
      finishGoalHandoff(measurementSession);
      return;
    }

    stackMeasurementTaskRef.current = destination.taskId;
    let cancelled = false;
    let measureFrame: number | null = null;
    let attempts = 0;

    const failClosed = () => {
      if (
        cancelled ||
        measurementSession !== newGoalSessionRef.current
      ) {
        return;
      }
      finishGoalHandoff(measurementSession);
    };

    const measureStack = () => {
      if (
        cancelled ||
        measurementSession !== newGoalSessionRef.current
      ) {
        return;
      }

      attempts += 1;
      const targetNode =
        goalCardRefs.current[preexistingTopTask.id] ??
        goalViewRefs.current[preexistingTopTask.id];

      if (!targetNode) {
        if (attempts < 3) {
          measureFrame = requestAnimationFrame(measureStack);
        } else {
          failClosed();
        }
        return;
      }

      const attemptNumber = attempts;
      let measurementResolved = false;
      targetNode.measureInWindow(
        (screenX, screenY, measuredWidth, measuredHeight) => {
          measurementResolved = true;
          if (
            cancelled ||
            attemptNumber !== attempts ||
            measurementSession !== newGoalSessionRef.current
          ) {
            return;
          }

          if (measuredWidth <= 0 || measuredHeight <= 0) {
            if (attempts < 3) {
              measureFrame = requestAnimationFrame(measureStack);
            } else {
              failClosed();
            }
            return;
          }

          const enteringGoalBecomesTop =
            destinationGroup?.tasks[0]?.id === destination.taskId;
          const stackDepthInset = enteringGoalBecomesTop
            ? 0
            : destination.existingCount >= 2
              ? 15
              : 8;
          const destinationX = screenX + stackDepthInset;
          const destinationY = screenY + stackDepthInset;
          const destinationWidth = Math.max(
            1,
            measuredWidth - stackDepthInset * 2
          );
          const destinationHeight = measuredHeight;
          const currentScrollY = homeScrollYRef.current;
          const viewportHeight = homeViewportHeightRef.current;
          const viewportScreenY = homeViewportScreenYRef.current;
          const safeTop =
            viewportScreenY + CAMERA_SAFE_TOP_PADDING;
          const safeBottom = Math.max(
            safeTop + destinationHeight,
            viewportScreenY +
              viewportHeight -
              CAMERA_BOTTOM_OVERLAY_ALLOWANCE
          );
          const destinationBottom =
            destinationY + destinationHeight;
          const comfortablyVisible =
            destinationY >= safeTop &&
            destinationBottom <= safeBottom;
          const safeTravelHeight = Math.max(
            0,
            safeBottom - safeTop - destinationHeight
          );
          const preferredScreenY =
            safeTop +
            safeTravelHeight * CAMERA_PREFERRED_POSITION;
          const fullyOutsideSafeRegion =
            destinationBottom <= safeTop ||
            destinationY >= safeBottom;
          let desiredScreenY = destinationY;

          if (!comfortablyVisible) {
            if (fullyOutsideSafeRegion) {
              desiredScreenY = preferredScreenY;
            } else if (destinationY < safeTop) {
              desiredScreenY = safeTop;
            } else {
              desiredScreenY = safeBottom - destinationHeight;
            }
          }

          const handoffMaxScrollY = Math.max(
            0,
            homeContentHeightRef.current - viewportHeight
          );
          const unclampedTargetScrollY =
            currentScrollY + (destinationY - desiredScreenY);
          const handoffTargetY = Math.min(
            handoffMaxScrollY,
            Math.max(
              0,
              PixelRatio.roundToNearestPixel(
                unclampedTargetScrollY
              )
            )
          );
          const scrollDelta = handoffTargetY - currentScrollY;

          setGoalLandingRect({
            x: destinationX,
            y: destinationY - scrollDelta,
            width: destinationWidth,
            height: destinationHeight,
            scrollDeltaY: scrollDelta,
          });
          if (
            stackOwnershipNonceTaskRef.current !== destination.taskId
          ) {
            stackOwnershipNonceTaskRef.current = destination.taskId;
            setGoalHandoffNonce((value) => value + 1);
          }

          guidedScrollY.stopAnimation();
          guidedScrollY.setValue(currentScrollY);

          if (stackScrollListenerRef.current !== null) {
            handoffProgress.removeListener(
              stackScrollListenerRef.current
            );
          }

          const scrollListenerId = handoffProgress.addListener(
            ({ value }) => {
              const nextScrollY =
                currentScrollY +
                (handoffTargetY - currentScrollY) * value;

              homeScrollYRef.current = nextScrollY;
              guidedScrollY.setValue(nextScrollY);

              if (value >= 1) {
                homeScrollYRef.current = handoffTargetY;
                guidedScrollY.setValue(handoffTargetY);
                handoffProgress.removeListener(scrollListenerId);
                if (
                  stackScrollListenerRef.current === scrollListenerId
                ) {
                  stackScrollListenerRef.current = null;
                }
              }
            }
          );
          stackScrollListenerRef.current = scrollListenerId;
        }
      );

      measureFrame = requestAnimationFrame(() => {
        if (cancelled || measurementResolved) {
          return;
        }
        if (attempts < 3) {
          measureStack();
        } else {
          failClosed();
        }
      });
    };

    measureFrame = requestAnimationFrame(measureStack);

    return () => {
      cancelled = true;
      if (measureFrame !== null) {
        cancelAnimationFrame(measureFrame);
      }
    };
  }, [categoryGroups, enteringTaskId, handoffDestination]);
  useLayoutEffect(() => {
    screenOpacity.stopAnimation();
    screenTranslateY.stopAnimation();
  
    screenOpacity.setValue(reducedMotion ? 0.98 : 0.94);
    screenTranslateY.setValue(reducedMotion ? 0 : 7);
  
    Animated.parallel([
      Animated.timing(
        screenOpacity,
        {
          toValue: 1,
          duration: reducedMotion ? motion.duration.reduced : motion.duration.reveal,
          easing: Easing.out(
            Easing.cubic
          ),
          useNativeDriver: true,
        }
      ),
  
      Animated.timing(
        screenTranslateY,
        {
          toValue: 0,
          duration: reducedMotion ? motion.duration.reduced : motion.duration.move,
          easing: Easing.out(
            Easing.cubic
          ),
          useNativeDriver: true,
        }
      ),
    ]).start();
  }, [tab, reducedMotion, screenOpacity, screenTranslateY]);
  return (
    <View style={styles.safe}>
    <SafeAreaView
      style={styles.safe}
      edges={['top', 'left', 'right']}
    >
      <AnimatedReanimated.View style={[{ flex: 1 }, newGoalInteractiveDepthStyle]}>
      <Animated.View
  style={{
    flex: 1,
    opacity: Animated.multiply(
      screenOpacity,
      voiceTransition.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.18],
      })
    ),
    transform: [
      {
        translateY:
          screenTranslateY,
      },
      {
        translateY: voiceTransition.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -8],
        }),
      },
      {
        scale: voiceTransition.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.985],
        }),
      },
      {
        translateY: newGoalFocusRiseProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -3],
        }),
      },
      {
        scale: newGoalFocusRiseProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.985],
        }),
      },
    ],
  }}
>
  {tab === 'home' ? (
       <ScrollView
       ref={homeScrollRef}
     
       showsVerticalScrollIndicator={
         false
       }
     
       contentContainerStyle={
         styles.scroll
       }
     
       scrollEventThrottle={16}
     
       onScroll={(event) => {
         homeScrollYRef.current =
           event.nativeEvent.contentOffset.y;
       }}
     
       onLayout={(event) => {
         homeViewportHeightRef.current =
           event.nativeEvent.layout.height;

         requestAnimationFrame(() => {
           homeScrollRef.current
             ?.getNativeScrollRef()
             ?.measureInWindow(
               (_x, y) => {
                 homeViewportScreenYRef.current = y;
               }
             );
         });
       }}

       onContentSizeChange={(
         _width,
         height
       ) => {
         homeContentHeightRef.current =
           height;
       }}
     >
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.dailyHeader}>
                Daily Momentum
              </Text>

              <Text style={styles.dailySub}>
                {remaining === 0
                  ? 'You cleared the flow'
                  : hasSmallSteps
                    ? `${remainingSmallSteps} small ${remainingSmallSteps === 1 ? 'step' : 'steps'} left today`
                    : `${remaining} ${remaining === 1 ? 'goal' : 'goals'} in your flow`}
              </Text>
            </View>

            {hero && (
              <Focus
                task={hero}
                findingSteps={
                  generatingStepGoalIds.has(hero.id) ||
                  Boolean(hero.remoteId && generatingStepGoalIds.has(hero.remoteId))
                }
                reducedMotion={reducedMotion}
                completionPhase={completionPhases[hero.id]}
                relationshipLabel={focusRelationshipLabel}
                toggleStep={toggleStep}
                open={() =>
                  openCanonicalOwnerGoal(hero.id)
                }
                complete={() =>
                  attemptComplete(hero)
                }
                shake={
                  shakeTaskId === hero.id
                }
                shakeNonce={shakeNonce}
              />
            )}

            {activeTasks.length === 0 && completedTasks.length === 0 ? (
              <AnimatedReanimated.View
                entering={FadeInDown.duration(
                  reducedMotion ? motion.duration.reduced : motion.duration.reveal
                )}
                style={styles.firstGoalEmpty}
              >
                <View style={styles.sundayIllustration}>
                  <View style={styles.sundayIllustrationSun} />
                  <View style={styles.sundayIllustrationHill} />
                  <Sparkles size={15} color="#8F7BC4" style={styles.sundayIllustrationSparkle} />
                </View>
                <Text style={styles.firstGoalEmptyTitle}>
                  What would feel good to move forward?
                </Text>
                <Text style={styles.firstGoalEmptyText}>
                  Start with something small.{`\n`}We'll help with the next step.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Create your first goal"
                  onPress={openNewGoal}
                  style={({ pressed }) => [
                    styles.firstGoalEmptyButton,
                    pressed && styles.firstGoalEmptyButtonPressed,
                  ]}
                >
                  <Plus size={15} color="#FFFFFF" strokeWidth={2.6} />
                  <Text style={styles.firstGoalEmptyButtonText}>Start a goal</Text>
                </Pressable>
              </AnimatedReanimated.View>
            ) : activeTasks.length === 0 ? (
              <AnimatedReanimated.View
                entering={FadeInDown.duration(reducedMotion ? motion.duration.reduced : motion.duration.reveal)}
                style={styles.clearedFlow}
              >
                <View style={styles.clearedIllustration}>
                  <View style={styles.clearedIllustrationRing} />
                  <Check size={24} color="#FFFFFF" strokeWidth={3} />
                  <Sparkles size={14} color="#8F7BC4" style={styles.clearedIllustrationSparkle} />
                </View>
                <Text style={styles.clearedFlowTitle}>You cleared the flow today! 🎉</Text>
                <Text style={styles.clearedFlowText}>
                  Everything in your flow is complete.{`\n`}Enjoy the win.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add something new"
                  onPress={openNewGoal}
                  style={({ pressed }) => [
                    styles.firstGoalEmptyButton,
                    pressed && styles.firstGoalEmptyButtonPressed,
                  ]}
                >
                  <Plus size={15} color="#FFFFFF" strokeWidth={2.6} />
                  <Text style={styles.firstGoalEmptyButtonText}>Add something new</Text>
                </Pressable>
              </AnimatedReanimated.View>
            ) : regular.length > 0 ? (
              <View style={styles.otherGoalsSection}>
                <View style={styles.otherGoalsHeader}>
                  <Text style={styles.otherGoalsTitle}>OTHER GOALS · {regular.length}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="View all active goals"
                    onPress={() => setLibraryView('active')}
                    style={({ pressed }) => [styles.otherGoalsViewAll, pressed && styles.pressed]}
                  >
                    <Text style={styles.otherGoalsViewAllText}>View all</Text>
                    <ChevronRight size={14} color="#81758D" />
                  </Pressable>
                </View>
                <View style={styles.otherGoalPreviews}>
                  {homePreviewTasks.map((task) => (
                    <View
                      key={task.id}
                      ref={(node) => {
                        goalCardRefs.current[task.id] = node;
                        goalViewRefs.current[task.id] = node;
                      }}
                      style={hiddenHandoffTaskId === task.id ? styles.compactGoalHandoffHidden : null}
                      onLayout={() => {
                        if (
                          task.id !== enteringTaskId ||
                          handoffDestination?.kind !== 'individual' ||
                          goalLandingRect !== null
                        ) return;
                        requestAnimationFrame(() => {
                          goalCardRefs.current[task.id]?.measureInWindow((x, y, width, height) => {
                            if (width <= 0 || height <= 0) return;
                            setGoalLandingRect({ x, y, width, height, scrollDeltaY: 0 });
                            setGoalHandoffNonce((value) => value + 1);
                          });
                        });
                      }}
                    >
                      <CompactGoalPreview
                        task={task}
                        relationshipLabel={relationshipLabelForTask(task)}
                        open={() => openCanonicalOwnerGoal(task.id)}
                      />
                    </View>
                  ))}
                </View>
                {regular.length > 2 && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setLibraryView('active')}
                    style={({ pressed }) => [styles.moreGoalsLink, pressed && styles.pressed]}
                  >
                    <Text style={styles.moreGoalsLinkText}>+{regular.length - 2} more {regular.length - 2 === 1 ? 'goal' : 'goals'}</Text>
                  </Pressable>
                )}
                {homeMomentTask && (
                  <SundayMoment task={homeMomentTask} />
                )}
              </View>
            ) : null}

            {false && categoryGroups.map((group) => {
              const groupHandoffDestination =
                handoffDestination?.category === group.category &&
                handoffDestination.taskId === enteringTaskId
                  ? handoffDestination
                  : null;
              const stackReceiveActive =
                groupHandoffDestination !== null &&
                groupHandoffDestination.kind !== 'individual';
              const stackOwnershipTransferred =
                stackReceiveActive &&
                destinationOwnershipTaskId ===
                  groupHandoffDestination.taskId;
              const displayedCount =
                stackReceiveActive && !stackOwnershipTransferred
                  ? groupHandoffDestination.existingCount
                  : group.tasks.length;
              const isStack = displayedCount >= 2;
              const isExpanded =
                expandedCategories.has(group.category);
              const enteringTask = group.tasks.find(
                (task) => task.id === enteringTaskId
              );
              const preexistingTopTask = group.tasks.find(
                (task) => task.id !== enteringTaskId
              );
              const topTask =
                stackReceiveActive && !stackOwnershipTransferred
                  ? preexistingTopTask ?? group.tasks[0]
                  : stackReceiveActive
                    ? group.tasks[0]
                    : enteringTask ?? group.tasks[0];
              const visibleTasks =
                stackReceiveActive && !stackOwnershipTransferred
                  ? [topTask]
                  : isStack && !isExpanded
                  ? [topTask]
                  : group.tasks;
              const categoryTheme =
                COLORS[group.category];
              const visuallyOwnedTasks =
                stackReceiveActive && !stackOwnershipTransferred
                  ? group.tasks.filter(
                      (task) => task.id !== enteringTaskId
                    )
                  : group.tasks;
              const topUrgencyRank = evaluateSmartGoal(
                topTask,
                focusTaskId
              ).urgencyRank;
              const hiddenUrgent = visuallyOwnedTasks.find((task) => {
                if (task.id === topTask.id) return false;
                const evaluation = evaluateSmartGoal(
                  task,
                  focusTaskId
                );
                return (
                  evaluation.urgencyRank > topUrgencyRank &&
                  ['overdue', 'today'].includes(
                    evaluation.urgencyTier
                  )
                );
              });
              const urgencyCue = hiddenUrgent
                ? getGoalUrgency(hiddenUrgent) === 'overdue'
                  ? 'Overdue'
                  : 'Due today'
                : null;

              return (
                <CategoryGroupShell
                  key={group.category}
                  count={displayedCount}
                  handoffActive={
                    enteringTaskId !== null &&
                    group.tasks.some(
                      (task) => task.id === enteringTaskId
                    )
                  }
                  stackReceiveActive={stackReceiveActive}
                  handoffProgress={handoffProgress}
                >
                  <AnimatedReanimated.View
                    layout={LinearTransition.duration(260)}
                    style={styles.categoryStackBody}
                  >
                    {group.tasks.map((task, visibleIndex) => {
                      const stackIndex = group.tasks.findIndex(
                        (candidate) => candidate.id === task.id
                      );
                      const fanIndex = Math.max(
                        visibleIndex,
                        stackIndex
                      );
                      const isHandoffTask =
                        task.id === enteringTaskId;
                      const voiceArrivalIndex = voiceArrivalIds.indexOf(
                        task.remoteId ?? task.id
                      );
                      const isVoiceArrival = voiceArrivalIndex >= 0;
                      const isStackLandingTarget =
                        stackReceiveActive &&
                        !stackOwnershipTransferred &&
                        task.id === preexistingTopTask?.id;
                      const isIndividualLandingTarget =
                        !stackReceiveActive && isHandoffTask;
                      const enteringGoalBecomesTop =
                        group.tasks[0]?.id === enteringTaskId;
                      const enterDelay = Math.min(
                        Math.max(0, fanIndex - 1) *
                          STACK_CARD_STAGGER_MS,
                        144
                      );
                      const exitDelay = Math.min(
                        Math.max(
                          0,
                          group.tasks.length - fanIndex - 1
                        ) * STACK_COLLAPSE_STAGGER_MS,
                        102
                      );

                      return (
              <AnimatedReanimated.View
  key={task.id}
  entering={
    isVoiceArrival
      ? reducedMotion
        ? FadeInDown.duration(motion.duration.reduced)
        : FadeInDown.springify()
            .damping(motion.spring.settle.damping)
            .stiffness(motion.spring.settle.stiffness)
            .mass(motion.spring.settle.mass)
            .delay(Math.min(voiceArrivalIndex * motion.stagger.arrival, 208))
      : stackReceiveActive || fanIndex === 0 || isHandoffTask
      ? undefined
      : FadeInDown.duration(
          STACK_CARD_MOTION_MS
        ).delay(enterDelay)
  }
  exiting={
    stackReceiveActive || fanIndex === 0 || isHandoffTask
      ? undefined
      : FadeOutUp.duration(205).delay(exitDelay)
  }
  layout={LinearTransition.duration(260)}
  style={styles.goalCardSlot}
  ref={(node) => {
    goalViewRefs.current[
      task.id
    ] = node as unknown as View | null;
  }}
  onLayout={(event) => {
    const {
      y,
      width,
      height,
    } = event.nativeEvent.layout;
    
      goalPositionsRef.current[
        task.id
      ] = y;
    
      if (
        isIndividualLandingTarget &&
        goalLandingRect === null
      ) {
        const currentScrollY =
          homeScrollYRef.current;
    
        const viewportHeight =
          homeViewportHeightRef.current;
    
        requestAnimationFrame(() => {
          goalCardRefs.current[
            task.id
          ]?.measureInWindow(
            (
              screenX,
              screenY,
              measuredWidth,
              measuredHeight
            ) => {
              const stackDepthInset =
                isStackLandingTarget && !enteringGoalBecomesTop
                  ? groupHandoffDestination!.existingCount >= 2
                    ? 15
                    : 8
                  : 0;
              const destinationX =
                screenX + stackDepthInset;
              const destinationY =
                screenY + stackDepthInset;
              const destinationWidth = Math.max(
                1,
                measuredWidth - stackDepthInset * 2
              );
              const destinationHeight = measuredHeight;
              const viewportScreenY =
                homeViewportScreenYRef.current;
              const safeTop =
                viewportScreenY +
                CAMERA_SAFE_TOP_PADDING;
              const safeBottom = Math.max(
                safeTop + measuredHeight,
                viewportScreenY +
                  viewportHeight -
                  CAMERA_BOTTOM_OVERLAY_ALLOWANCE
              );
              const destinationBottom =
                destinationY + destinationHeight;
              const comfortablyVisible =
                destinationY >= safeTop &&
                destinationBottom <= safeBottom;
              const safeTravelHeight = Math.max(
                0,
                safeBottom - safeTop - measuredHeight
              );
              const preferredScreenY =
                safeTop +
                safeTravelHeight *
                  CAMERA_PREFERRED_POSITION;
              const fullyOutsideSafeRegion =
                destinationBottom <= safeTop ||
                destinationY >= safeBottom;

              let desiredScreenY = destinationY;

              if (!comfortablyVisible) {
                if (fullyOutsideSafeRegion) {
                  desiredScreenY = preferredScreenY;
                } else if (destinationY < safeTop) {
                  desiredScreenY = safeTop;
                } else {
                  desiredScreenY =
                    safeBottom - measuredHeight;
                }
              }

              const handoffMaxScrollY = Math.max(
                0,
                homeContentHeightRef.current -
                  viewportHeight
              );
              const unclampedTargetScrollY =
                currentScrollY +
                (destinationY - desiredScreenY);
              const handoffTargetY = Math.min(
                handoffMaxScrollY,
                Math.max(
                  0,
                  PixelRatio.roundToNearestPixel(
                    unclampedTargetScrollY
                  )
                )
              );
              const scrollDelta =
                handoffTargetY - currentScrollY;

              setGoalLandingRect({
                x: destinationX,
                y: destinationY - scrollDelta,
                width: destinationWidth,
                height: destinationHeight,
                scrollDeltaY: scrollDelta,
              });

              guidedScrollY.stopAnimation();
              guidedScrollY.setValue(currentScrollY);

              let scrollHandoffListenerId = '';

              scrollHandoffListenerId =
                handoffProgress.addListener(
                  ({ value }) => {
                    const nextScrollY =
                      currentScrollY +
                      (handoffTargetY -
                        currentScrollY) *
                        value;

                    homeScrollYRef.current =
                      nextScrollY;
                    guidedScrollY.setValue(
                      nextScrollY
                    );

                    if (value >= 1) {
                      homeScrollYRef.current =
                        handoffTargetY;
                      guidedScrollY.setValue(
                        handoffTargetY
                      );
                      handoffProgress.removeListener(
                        scrollHandoffListenerId
                      );
                    }
                  }
                );
            }
          );
        });
            }}}
  >
    {!stackReceiveActive &&
    hiddenHandoffTaskId === task.id &&
    goalLandingRect !== null &&
    destinationOwnershipTaskId !== task.id ? (
      <View
        ref={(node) => {
          goalCardRefs.current[
            task.id
          ] = node;
        }}
        style={[
          styles.goalCardSpacer,
          {
            height: goalLandingRect.height,
          },
        ]}
      />
    ) : (
      <Card
      task={task}
      relationshipLabel={relationshipLabelForTask(task)}
      canDelete={deriveGoalViewPermissions(task.ownerId, currentUserId, task).canDelete}
      reducedMotion={reducedMotion}
      completionPhase={completionPhases[task.id]}
      cardRef={(node) => {
        goalCardRefs.current[
          task.id
        ] = node;
      }}
      open={() => openCanonicalOwnerGoal(task.id)}
      complete={() =>
        attemptComplete(task)
      }
      swipeOpen={openSwipeTaskId === task.id}
      onSwipeOpen={() =>
        setOpenSwipeTaskId(task.id)
      }
      onSwipeClose={() =>
        setOpenSwipeTaskId((current) =>
          current === task.id ? null : current
        )
      }
      confirmSwipeDelete={(onCancel, onConfirm) =>
        requestDeleteGoal(task.id, onCancel, onConfirm)
      }
      collapsedStack={undefined}
      shake={
        shakeTaskId === task.id
      }
      shakeNonce={shakeNonce}
      entering={
        !stackReceiveActive && enteringTaskId === task.id
      }
      hiddenWhileEntering={
        !stackReceiveActive && hiddenHandoffTaskId === task.id
      }
      handoffProgress={handoffProgress}
      onEntered={() => {
        setGoalHandoffNonce(
          (value) => value + 1
        );
      }}
    />
    )}
  </AnimatedReanimated.View>
                      );
                    })}
                  </AnimatedReanimated.View>
                </CategoryGroupShell>
              );
            })}

            {completedTasks.length > 0 && (
              <View style={styles.lifecycleLinks}>
                {completedTasks.length > 0 && (
                  <Pressable
                    onPress={() =>
                      setLibraryView('completed')
                    }
                    style={({ pressed }) => [
                      styles.lifecycleLink,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.lifecycleLinkText}>
                      Completed Goals ·{' '}
                      {completedTasks.length}
                    </Text>
                    <ChevronRight
                      size={15}
                      color="#A1A1AA"
                    />
                  </Pressable>
                )}

              </View>
            )}

            <View style={{ height: 145 }} />
          </View>
        </ScrollView>
      ) : tab === 'together' ? (
        <TogetherScreen
          fixture={togetherFixture}
          connections={connections}
          pendingInvites={connectionInvites.filter(
            (invite) => invite.status === 'pending'
          )}
          selectedConnectionId={selectedConnectionId}
          canonicalGoals={tasks}
          interactions={togetherInteractions}
          remoteData={remoteMode}
          onSelectConnection={setSelectedConnectionId}
          onCreateInvite={async (name, email, relationshipType) => {
            if (remoteMode) {
              try {
                const created = await workspaceDomain.createInvite({
                  inviteeEmail: email,
                  relationshipType,
                });
                setConnectionInvites((current) => [...current, created]);
                setToast('Invite sent');
                return created;
              } catch (error) {
                if (__DEV__ && !(
                  error instanceof BackendError &&
                  (error.code === 'conflict' || error.code === 'invite_invalid')
                )) {
                  console.error('[Sunday create invite]', toBackendError(error));
                }
                throw error;
              }
            }
            const invite = createLocalInvite({
              inviterUserId: currentMember.id,
              inviteeDisplayName: name,
              inviteeEmail: email,
              relationshipType,
            });
            setConnectionInvites((current) => [...current, invite]);
            return invite;
          }}
          onCancelInvite={(inviteId) => {
            LayoutAnimation.configureNext({
              duration: 180,
              update: { type: LayoutAnimation.Types.easeInEaseOut },
              delete: {
                type: LayoutAnimation.Types.easeInEaseOut,
                property: LayoutAnimation.Properties.opacity,
              },
            });
            setConnectionInvites((current) =>
              current.map((invite) =>
                invite.id === inviteId
                  ? { ...invite, status: 'cancelled' }
                  : invite
              )
            );
            if (remoteMode) {
              void workspaceDomain.cancelInvite(inviteId).catch((error) => {
                if (__DEV__) console.error('[Sunday cancel invite]', toBackendError(error));
                setToast('That invite could not be cancelled');
                void refreshRemoteTogether();
              });
            }
          }}
          onAcceptInvite={(inviteId) => {
            const invite = connectionInvites.find(
              (item) => item.id === inviteId && item.status === 'pending'
            );
            if (!invite) return;
            if (remoteMode) {
              setConnectionInvites((current) => current.filter((item) => item.id !== inviteId));
              void workspaceDomain.acceptInvite(invite.inviteCode).then(async () => {
                await refreshRemoteTogether();
                setToast('Connection added');
              }).catch((error) => {
                if (__DEV__) console.error('[Sunday accept invite]', toBackendError(error));
                setToast('That invite could not be accepted');
                void refreshRemoteTogether();
              });
              return;
            }
            const connection = acceptLocalInvite(invite, connections.length);
            LayoutAnimation.configureNext({
              duration: 220,
              create: {
                type: LayoutAnimation.Types.easeInEaseOut,
                property: LayoutAnimation.Properties.opacity,
              },
              update: { type: LayoutAnimation.Types.easeInEaseOut },
              delete: {
                type: LayoutAnimation.Types.easeInEaseOut,
                property: LayoutAnimation.Properties.opacity,
              },
            });
            setConnectionInvites((current) =>
              current.map((item) =>
                item.id === inviteId
                  ? { ...item, status: 'accepted' }
                  : item
              )
            );
            setConnections((current) => [...current, connection]);
            setSelectedConnectionId(connection.id);
          }}
          onDeclineInvite={(inviteId) => {
            if (!remoteMode) {
              setConnectionInvites((current) => current.filter((invite) => invite.id !== inviteId));
              return;
            }
            void workspaceDomain.declineInvite(inviteId).then(() => {
              setConnectionInvites((current) => current.filter((invite) => invite.id !== inviteId));
            }).catch((error) => {
              if (__DEV__) console.error('[Sunday decline invite]', toBackendError(error));
              setToast("Couldn't update that invite just yet");
            });
          }}
          onOpenSharedGoal={openTogetherGoal}
          onRemoveConnection={(connection) => {
            Alert.alert(
              `Remove ${connection.displayName} from Together?`,
              "Goals you've shared with each other will no longer appear in Together.",
              [
                { text: 'Keep connection', style: 'cancel' },
                {
                  text: 'Remove',
                  style: 'destructive',
                  onPress: () => {
                    if (!remoteMode) {
                      setConnections((current) => current.filter((item) => item.id !== connection.id));
                      return;
                    }
                    void workspaceDomain.removeConnection(connection.id).then(async () => {
                      await Promise.all([refreshRemoteTogether(), refreshRemoteTasks()]);
                      setToast('Connection removed');
                    }).catch((error) => {
                      if (__DEV__) console.error('[Sunday remove connection]', toBackendError(error));
                      setToast("Couldn't remove that connection just yet");
                    });
                  },
                },
              ]
            );
          }}
        />
      ) : (
        <Placeholder tab={tab} />
      )}
      </Animated.View>
      </AnimatedReanimated.View>

      {tab === 'home' && (
        <Animated.View
          pointerEvents={voiceDumpOpen ? 'none' : 'box-none'}
          style={[
            StyleSheet.absoluteFill,
            {
              transform: [{
                translateY: voiceTransition.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 18],
                }),
              }, {
                scale: newGoalFocusRiseProgress.interpolate({
                  inputRange: [0, 0.0425, 0.085, 0.1275, 0.17, 1],
                  outputRange: [1, 0.96464, 0.95, 0.96464, 1, 1],
                }),
              }],
              opacity: Animated.multiply(
                voiceTransition.interpolate({
                  inputRange: [0, 0.7, 1],
                  outputRange: [1, 0.36, 0],
                }),
                newGoalFocusRiseProgress.interpolate({
                  inputRange: [0, 0.12, 0.165, 0.21, 0.255, 0.3, 1],
                  outputRange: [1, 1, 0.84375, 0.5, 0.15625, 0, 0],
                  extrapolate: 'clamp',
                })
              ),
            },
          ]}
        >
          <Pressable
            ref={(node) => {
              newGoalFabRef.current = node as unknown as View | null;
            }}
            style={({ pressed }) => [
              styles.fab,
              newGoalFabHandoffNeutral && styles.newGoalFabHandoffNeutral,
              pressed && styles.newGoalFabPressed,
              newGoalMorphOwnsFab && styles.newGoalFabMorphHidden,
            ]}
            onPress={openNewGoalFromFab}
          >
            <Plus
              size={28}
              color="#fff"
              strokeWidth={2.7}
            />
          </Pressable>
        </Animated.View>
      )}

      <BottomNav
        tab={tab}
        setTab={setTab}
        reducedMotion={reducedMotion}
        voiceOpen={voiceDumpOpen}
        transitionProgress={voiceTransition}
        focusRiseProgress={newGoalFocusRiseProgress}
        interactiveDismissProgress={newGoalSwipeDismissProgress}
        onVoiceGeometry={setVoiceOrbRect}
        onVoicePress={() => {
          voiceTransition.stopAnimation();
          voiceTransition.setValue(0);
          setVoiceDumpOpen(true);
        }}
      />

      {voiceDumpOpen && (
        <VoiceShellV2
          originRect={voiceOrbRect}
          transitionProgress={voiceTransition}
          onPersistGoals={persistReviewedVoiceGoals}
          onClosed={() => {
            const arrivals = pendingVoiceGoalsRef.current;
            pendingVoiceGoalsRef.current = [];
            if (arrivals.length > 0) {
              const arrivalIds = arrivals.map((goal) => goal.remoteId ?? goal.id);
              setVoiceArrivalIds(arrivalIds);
              setTasks((current) => [
                ...arrivals,
                ...current.filter((task) => !arrivalIds.includes(task.remoteId ?? task.id)),
              ]);
              if (voiceArrivalTimerRef.current) clearTimeout(voiceArrivalTimerRef.current);
              voiceArrivalTimerRef.current = setTimeout(
                () => setVoiceArrivalIds([]),
                reducedMotion ? 240 : 1300
              );
              void refreshRemoteTasks();
            }
            setVoiceDumpOpen(false);
            voiceTransition.setValue(0);
          }}
        />
      )}

      <TaskModal
        task={selected}
        reducedMotion={reducedMotion}
        findingSteps={Boolean(
          selected &&
          selected.microSteps.length === 0 &&
          (
            generatingStepGoalIds.has(selected.id) ||
            Boolean(selected.remoteId && generatingStepGoalIds.has(selected.remoteId))
          )
        )}
        close={() => setSelectedId(null)}
        toggle={toggleStep}
        addStep={addMicroStep}
        complete={complete}
        attemptComplete={attemptComplete}
        remove={(id) => {
          requestDeleteGoal(id);
        }}
        updateDue={(taskId, nextDueAt, nextDueHasTime) => {
          updateTaskDue(taskId, nextDueAt, nextDueHasTime);
        }}
        connections={connections}
        shareGoal={async (taskId, userId) => {
          try {
            if (remoteMode) {
              const canonicalTask = tasks.find((task) => task.id === taskId);
              await workspaceDomain.shareGoal(
                canonicalTask ? remoteGoalId(canonicalTask) : taskId,
                userId
              );
              setTasks((current) => current.map((task) => task.id === taskId
                ? {
                    ...task,
                    collaborationMode: 'shared',
                    memberIds: Array.from(new Set([task.ownerId ?? currentUserId, ...(task.memberIds ?? []), userId])),
                    supporterIds: [],
                    sharedWithUserIds: Array.from(new Set([...(task.sharedWithUserIds ?? []), userId])),
                  }
                : task));
              void refreshRemoteTasks();
            } else {
              setTasks((current) => current.map((task) => task.id === taskId
                ? {
                    ...task,
                    collaborationMode: 'shared',
                    memberIds: Array.from(new Set([task.ownerId ?? currentUserId, ...(task.memberIds ?? []), userId])),
                    supporterIds: [],
                    sharedWithUserIds: Array.from(new Set([...(task.sharedWithUserIds ?? []), userId])),
                  }
                : task));
            }
            setToast('Shared to Together');
          } catch (error) {
            setToast("Couldn't share this goal just yet");
            throw error;
          }
        }}
        unshareGoal={async (taskId, userId) => {
          try {
            if (remoteMode) {
              const canonicalTask = tasks.find((task) => task.id === taskId);
              await workspaceDomain.unshareGoal(
                canonicalTask ? remoteGoalId(canonicalTask) : taskId,
                userId
              );
              setTasks((current) => current.map((task) => task.id === taskId
                ? {
                    ...task,
                    collaborationMode: (task.memberIds ?? []).filter((id) => id !== userId && id !== task.ownerId).length > 0
                      ? 'shared'
                      : 'private',
                    memberIds: (task.memberIds ?? []).filter((id) => id !== userId),
                    sharedWithUserIds: (task.sharedWithUserIds ?? []).filter((id) => id !== userId),
                  }
                : task));
              void refreshRemoteTasks();
            } else {
              setTasks((current) => current.map((task) => task.id === taskId
                ? {
                    ...task,
                    collaborationMode: (task.memberIds ?? []).filter((id) => id !== userId && id !== task.ownerId).length > 0
                      ? 'shared'
                      : 'private',
                    memberIds: (task.memberIds ?? []).filter((id) => id !== userId),
                    sharedWithUserIds: (task.sharedWithUserIds ?? []).filter((id) => id !== userId),
                  }
                : task));
            }
            setToast('Sharing stopped');
          } catch (error) {
            setToast("Couldn't stop sharing just yet");
            throw error;
          }
        }}
      />

      {sharedDetailConnection && (
        <SharedGoalDetail
          goal={sharedDetailTask}
          current={currentMember}
          connection={sharedDetailConnection}
          interactions={togetherInteractions.filter((interaction) => interaction.goalId === sharedDetailTask?.id)}
          onClose={() => setSharedDetailId(null)}
          onToggleStep={toggleStep}
          onComplete={(goalId) => {
            const goal = tasks.find((task) => task.id === goalId);
            if (goal) complete(goal);
          }}
          onEditGoal={(goalId) => {
            setSharedDetailId(null);
            setSelectedId(goalId);
          }}
          permissions={sharedDetailPermissions}
          onSendSupport={async (type: TogetherInteractionType, key: string) => {
            if (!sharedDetailTask || !remoteMode) {
              return { status: 'sent' as const };
            }
            const result = await workspaceDomain.sendTogetherInteraction(sharedDetailTask.id, type, key);
            if (result.status === 'sent') {
              setTogetherInteractions((current) => [
                result.interaction,
                ...current.filter((item) => item.id !== result.interaction.id),
              ]);
            }
            return { status: result.status };
          }}
          onMarkSupportSeen={(goalId) => {
            if (!remoteMode) return;
            setTogetherInteractions((current) => current.map((interaction) =>
              interaction.goalId === goalId && interaction.recipientUserId === currentUserId
                ? { ...interaction, seenAt: interaction.seenAt ?? new Date().toISOString() }
                : interaction));
            void workspaceDomain.markTogetherInteractionsSeen(goalId).catch((error) => {
              if (__DEV__) console.error('[Sunday mark support seen]', toBackendError(error));
              void refreshRemoteTogether();
            });
          }}
        />
      )}

      <GoalLibraryModal
        mode={libraryView}
        tasks={
          libraryView === 'active'
            ? regular
            : libraryView === 'completed'
            ? completedTasks
            : deletedTasks
        }
        close={() => setLibraryView(null)}
        openActiveGoal={(taskId) => {
          setLibraryView(null);
          openCanonicalOwnerGoal(taskId);
        }}
        prepareRestore={prepareLibraryRestore}
        commitRestore={commitLibraryRestore}
        preparePermanentDelete={preparePermanentDelete}
        commitPermanentDelete={commitPermanentDelete}
        reducedMotion={reducedMotion}
      />

<NewGoalModal
  transitionState={newGoalTransitionState}
  setTransitionState={setNewGoalTransitionState}
  focusRiseProgress={newGoalFocusRiseProgress}
  swipeDismissProgress={newGoalSwipeDismissProgress}
  swipeDismissDragY={newGoalSwipeDismissDragY}
  swipeDismissTravel={newGoalSwipeDismissTravel}
  reducedMotion={reducedMotion}
  launchOrigin={newGoalOrigin}
  title={title}
  setTitle={setTitle}
  category={category}
  setCategory={setCategory}
  dueAt={dueAt}
  dueHasTime={dueHasTime}
  collaborationMode={collaborationMode}
  setCollaborationMode={setCollaborationMode}
  collaborationPersonId={collaborationPersonId}
  setCollaborationPersonId={setCollaborationPersonId}
  connections={connections}
  inviteConnection={() => {
    setNewGoalTransitionState('closed');
    newGoalFocusRiseProgress.stopAnimation();
    newGoalFocusRiseProgress.setValue(0);
    newGoalSwipeDismissDragY.value = 0;
    setNewGoalMorphOwnsFab(false);
    setNewGoalFabHandoffNeutral(false);
    setTab('together');
  }}
  setDue={(nextDueAt, nextDueHasTime) => {
    setDueAt(nextDueAt);
    setDueHasTime(Boolean(nextDueAt && nextDueHasTime));
  }}
  create={create}
  finishHandoff={finishGoalHandoff}
  session={newGoalSession}
  handoffNonce={goalHandoffNonce}
  landingRect={goalLandingRect}
  handoffProgress={handoffProgress}
  onFabOwnershipChange={handleNewGoalFabOwnershipChange}
  logLifecycle={logNewGoalLifecycle}
  onNativeModalWillDismiss={() => {
    logNewGoalLifecycle('NATIVE_MODAL_DISMISS_STARTED');
    newGoalNativeModalDismissedRef.current = Platform.OS !== 'ios';
  }}
  onNativeModalDismissed={() => {
    logNewGoalLifecycle('NATIVE_MODAL_ON_DISMISS');
    newGoalNativeModalDismissedRef.current = true;
    logNewGoalLifecycle('NATIVE_MODAL_DISMISS_PENDING_CLEARED');
    logNewGoalLifecycle('MODAL_UNMOUNTED');
    if (newGoalOpenQueuedRef.current) {
      newGoalOpenQueuedRef.current = false;
      requestAnimationFrame(openNewGoalFromFab);
    }
  }}
  measureFab={(complete) => {
    const fab = newGoalFabRef.current;
    if (!fab) {
      complete(null);
      return;
    }
    fab.measureInWindow((x, y, width, height) => {
      const valid = [x, y, width, height].every(Number.isFinite) && width > 0 && height > 0;
      complete(valid ? { x, y, width, height } : null);
    });
  }}
/>

      {toast ? (
        <AnimatedReminder
          message={toast}
          onDone={() => setToast('')}
        />
      ) : null}

    </SafeAreaView>

      {completionCelebration && (
        <CompletionCelebration
          key={completionCelebration.id}
          reducedMotion={reducedMotion}
          accent={completionCelebration.accent}
          origin={completionCelebration.origin}
          seed={completionCelebration.id}
        />
      )}
      {__DEV__ && <NewGoalMotionLab />}
    </View>
  );
}

function CompactGoalPreview({
  task,
  relationshipLabel,
  open,
}: {
  task: Task;
  relationshipLabel: string | null;
  open: () => void;
}) {
  const theme = COLORS[task.category];
  const done = task.microSteps.filter((step) => step.completed).length;
  const total = task.microSteps.length;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${task.title}`}
      onPress={open}
      style={({ pressed }) => [
        styles.compactGoalPreview,
        pressed && styles.compactGoalPreviewPressed,
      ]}
    >
      <View style={[styles.compactGoalIndicator, { backgroundColor: theme.accent }]} />
      <View style={styles.compactGoalCopy}>
        <Text numberOfLines={2} style={styles.compactGoalTitle}>{task.title}</Text>
        <Text numberOfLines={1} style={styles.compactGoalProgress}>
          {total > 0 ? `${done} of ${total} steps` : 'First steps are on the way'}
          {relationshipLabel ? ` · ${relationshipLabel}` : ''}
        </Text>
      </View>
      <ChevronRight size={15} color="#B0A9B7" />
    </Pressable>
  );
}

function SundayMoment({ task }: { task: Task }) {
  const due = formatDue(task.dueAt, Boolean(task.dueHasTime));
  if (!due) return null;
  return (
    <View style={styles.sundayMoment}>
      <View style={styles.sundayMomentIcon}>
        <CalendarDays size={15} color="#8F7BC4" />
      </View>
      <View style={styles.sundayMomentCopy}>
        <Text style={styles.sundayMomentKicker}>A gentle heads-up</Text>
        <Text numberOfLines={2} style={styles.sundayMomentText}>
          {task.title} · {due.label}
        </Text>
      </View>
    </View>
  );
}

function Focus({
  task,
  findingSteps,
  reducedMotion,
  completionPhase,
  relationshipLabel,
  toggleStep,
  open,
  complete,
  shake,
  shakeNonce,
}: {
  task: Task;
  findingSteps: boolean;
  reducedMotion: boolean;
  completionPhase?: 'acknowledging' | 'departing';
  relationshipLabel: string | null;
  toggleStep: (taskId: string, stepId: string) => void;
  open: () => void;
  complete: () => void;
  shake: boolean;
  shakeNonce: number;
}) {
  const c = COLORS[task.category];
  const duePresentation = formatDue(
    task.dueAt,
    Boolean(task.dueHasTime)
  );
  const done = task.microSteps.filter(
    (step) => step.completed
  ).length;

  const allDone = canCompleteGoal(task);
  const nextStep = task.microSteps.find((step) => !step.completed);
  const [acknowledgingStepId, setAcknowledgingStepId] = useState<string | null>(null);
  const focusStepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (focusStepTimerRef.current) clearTimeout(focusStepTimerRef.current);
  }, []);

  useEffect(() => {
    if (focusStepTimerRef.current) {
      clearTimeout(focusStepTimerRef.current);
      focusStepTimerRef.current = null;
    }
    setAcknowledgingStepId(null);
  }, [task.id]);

  const shakeX = useRef(
    new Animated.Value(0)
  ).current;
  const focusContentOpacity = useRef(
    new Animated.Value(1)
  ).current;
  const focusContentY = useRef(
    new Animated.Value(0)
  ).current;
  const focusColorProgress = useRef(new Animated.Value(1)).current;
  const previousFocusSurface = useRef(c.surface);
  const previousFocusTaskId = useRef(task.id);
  const lastShakeNonce = useRef(shakeNonce);
  const pressProgress = useSharedValue(0);
  const completionProgress = useSharedValue(0);
  const pressStyle = useAnimatedStyle(() => ({
    opacity: 1 - completionProgress.value * 0.18,
    transform: [{
      scale:
        (1 - pressProgress.value * 0.008) *
        (1 - completionProgress.value * 0.012),
    }],
  }));
  useEffect(() => {
    const target = completionPhase === 'departing'
      ? 1
      : completionPhase === 'acknowledging'
        ? 0.28
        : 0;
    completionProgress.value = withTiming(target, {
      duration: reducedMotion
        ? motion.duration.reduced
        : completionPhase === 'departing'
          ? motion.duration.move
          : motion.duration.response,
    });
  }, [completionPhase, completionProgress, reducedMotion]);
  const pressIn = () => {
    pressProgress.value = withTiming(1, {
      duration: reducedMotion ? 0 : motion.duration.response,
    });
  };
  const pressOut = () => {
    pressProgress.value = reducedMotion
      ? withTiming(0, { duration: 0 })
      : withSpring(0, motion.spring.standard);
  };

  useEffect(() => {
    if (
      !shake ||
      shakeNonce === lastShakeNonce.current
    ) {
      return;
    }
  
    lastShakeNonce.current = shakeNonce;
  
    shakeX.stopAnimation();
    shakeX.setValue(0);
  
    Animated.sequence([
      Animated.timing(shakeX, {
        toValue: -7,
        duration: 45,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: 7,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: -5,
        duration: 45,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: 5,
        duration: 45,
        useNativeDriver: true,
      }),
      Animated.spring(shakeX, {
        toValue: 0,
        friction: 6,
        tension: 170,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shake, shakeNonce]);

  useLayoutEffect(() => {
    if (previousFocusTaskId.current === task.id) return;
    previousFocusTaskId.current = task.id;
    focusContentOpacity.stopAnimation();
    focusContentY.stopAnimation();
    focusColorProgress.stopAnimation();
    focusContentOpacity.setValue(reducedMotion ? 0.96 : 0.72);
    focusContentY.setValue(reducedMotion ? 0 : 7);
    focusColorProgress.setValue(reducedMotion ? 1 : 0);
    const nativeContentTransition = Animated.parallel([
      Animated.timing(focusContentOpacity, {
        toValue: 1,
        duration: reducedMotion ? motion.duration.reduced : motion.duration.reveal,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(focusContentY, {
        toValue: 0,
        duration: reducedMotion ? motion.duration.reduced : motion.duration.move,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    const surfaceTransition = Animated.timing(focusColorProgress, {
      toValue: 1,
      duration: reducedMotion ? motion.duration.reduced : motion.duration.move,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

    nativeContentTransition.start();
    surfaceTransition.start(({ finished }) => {
      if (finished && previousFocusTaskId.current === task.id) {
        previousFocusSurface.current = c.surface;
      }
    });

    return () => {
      nativeContentTransition.stop();
      surfaceTransition.stop();
    };
  }, [task.id, c.surface, reducedMotion, focusColorProgress, focusContentOpacity, focusContentY]);

  const focusSurface = focusColorProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [previousFocusSurface.current, c.surface],
  });

  return (
    <View style={styles.focus}>
      <View style={styles.focusHead}>
        <View style={styles.focusHeadLeft}>
          <View
            style={[
              styles.flame,
              {
                backgroundColor: c.surfaceSoft,
              },
            ]}
          >
            <Flame
              size={13}
              color={c.strong}
              fill={c.strong}
            />
          </View>

          <Text
            style={[
              styles.focusLabel,
              {
                color: c.strong,
              },
            ]}
          >
            CURRENT FOCUS
          </Text>
        </View>

      </View>

      <Animated.View
        style={{
          transform: [
            {
              translateX: shakeX,
            },
          ],
        }}
      >
        <Animated.View
          style={[
            styles.heroElevation,
            {
              backgroundColor: focusSurface,
            },
          ]}
        >
        <Animated.View
          style={[
            styles.heroMotionSurface,
            {
              opacity: focusContentOpacity,
              transform: [{ translateY: focusContentY }],
            },
          ]}
        >
        <View
          pointerEvents="none"
          style={[
            styles.heroDepth,
            { backgroundColor: c.accent },
          ]}
        />
        <AnimatedReanimated.View style={pressStyle}>
        <Pressable
          onPress={open}
          onPressIn={pressIn}
          onPressOut={pressOut}
          style={({ pressed }) => [
            styles.hero,
          ]}
        >
          <View
            style={[
              styles.heroGlow,
              { backgroundColor: c.surfaceSoft },
            ]}
          />

          <View style={styles.heroTop}>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: c.surfaceSoft,
                  borderColor: `${c.accent}38`,
                },
              ]}
            >
              <View
                style={[
                  styles.badgeDot,
                  { backgroundColor: c.accent },
                ]}
              />

              <Text
                numberOfLines={1}
                style={[styles.badgeText, { color: c.strong }]}
              >
                {c.name.toUpperCase()} ·{' '}
                {task.minutes} MIN
              </Text>
            </View>

            {duePresentation ? (
              <View style={styles.heroDueMetadata}>
                <CalendarDays
                  size={11}
                  color={c.strong}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.heroDueMetadataText,
                    { color: c.strong },
                  ]}
                >
                  {duePresentation.label.toUpperCase()}
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.micro,
                  { backgroundColor: c.surfaceSoft },
                ]}
              >
                <Clock3
                  size={11}
                  color={c.strong}
                />

                <Text style={[styles.microText, { color: c.strong }]}> 
                  {done} of {task.microSteps.length} steps
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.heroTitle, { color: c.onSurface }]}> 
            {task.title}
          </Text>
          {relationshipLabel && (
            <View style={styles.focusRelationshipRow}>
              {task.collaborationMode === 'supported' ? (
                <Heart size={12} color="#A56D55" strokeWidth={2.4} />
              ) : (
                <Users size={12} color="#8170B1" strokeWidth={2.4} />
              )}
              <Text style={[styles.focusRelationship, { color: c.strong }]}> 
                {relationshipLabel}
              </Text>
            </View>
          )}

          {nextStep ? (
            <AnimatedReanimated.View
              key={nextStep.id}
              entering={FadeInDown.duration(reducedMotion ? motion.duration.reduced : motion.duration.reveal)}
              layout={LinearTransition.duration(reducedMotion ? motion.duration.reduced : motion.duration.move)}
              style={[styles.focusNextStep, { borderColor: `${c.accent}38`, backgroundColor: c.surfaceSoft }]}
            >
              <Text style={[styles.focusNextLabel, { color: c.strong }]}>NEXT STEP</Text>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: acknowledgingStepId === nextStep.id }}
                accessibilityLabel={`Complete ${nextStep.title}`}
                disabled={acknowledgingStepId !== null}
                onPress={(event) => {
                  event.stopPropagation();
                  setAcknowledgingStepId(nextStep.id);
                  focusStepTimerRef.current = setTimeout(() => {
                    toggleStep(task.id, nextStep.id);
                    setAcknowledgingStepId(null);
                    focusStepTimerRef.current = null;
                  }, reducedMotion ? 80 : 260);
                }}
                style={({ pressed }) => [styles.focusNextAction, pressed && styles.pressed]}
              >
                <View
                  style={[
                    styles.focusNextCircle,
                    { borderColor: c.accent },
                    acknowledgingStepId === nextStep.id && { backgroundColor: c.accent },
                  ]}
                >
                  {acknowledgingStepId === nextStep.id && (
                    <Check size={12} color={colors.surface} strokeWidth={3} />
                  )}
                </View>
                <Text
                  numberOfLines={3}
                  style={[
                    styles.focusNextText,
                    { color: c.onSurface },
                    acknowledgingStepId === nextStep.id && styles.heroStrike,
                  ]}
                >
                  {nextStep.title}
                </Text>
              </Pressable>
            </AnimatedReanimated.View>
          ) : task.microSteps.length === 0 ? (
            <Text style={[styles.focusOpenHint, { color: c.strong }]}>
              {findingSteps ? 'Finding a good first step…' : 'Open goal'}
            </Text>
          ) : null}

          {allDone && task.microSteps.length > 0 && (
            <View style={[styles.heroFoot, { borderTopColor: `${c.accent}42` }]}> 
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                complete();
              }}
              style={({ pressed }) => [
                styles.complete,
                {
                  backgroundColor: c.surfaceSoft,
                  borderColor: `${c.accent}52`,
                },
                allDone && {
                  backgroundColor: c.accent,
                  borderColor: c.accent,
                },
                pressed && styles.pressed,
              ]}
            >
              <Check
                size={13}
                color={c.onSurface}
                strokeWidth={2.8}
              />

              <Text
                style={[styles.completeText, { color: c.onSurface }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {task.completed
                  ? 'Done'
                  : 'Mark Complete'}
              </Text>
            </Pressable>
            </View>
          )}
        </Pressable>
        </AnimatedReanimated.View>
        </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function Card({
  task,
  relationshipLabel,
  canDelete,
  reducedMotion,
  completionPhase,
  cardRef,
  open,
  complete,
  swipeOpen,
  onSwipeOpen,
  onSwipeClose,
  confirmSwipeDelete,
  collapsedStack,
  shake,
  shakeNonce,
  entering,
  hiddenWhileEntering,
  handoffProgress,
  onEntered,
}: {
  task: Task;
  relationshipLabel: string | null;
  canDelete: boolean;
  reducedMotion: boolean;
  completionPhase?: 'acknowledging' | 'departing';
  cardRef: (node: View | null) => void;
  open: () => void;
  complete: () => void;
  swipeOpen: boolean;
  onSwipeOpen: () => void;
  onSwipeClose: () => void;
  confirmSwipeDelete: (
    onCancel: () => void,
    onConfirm: (commit: () => void) => void
  ) => void;
  collapsedStack?: {
    count: number;
    theme: Theme;
  };
  shake: boolean;
  shakeNonce: number;
  entering: boolean;
  hiddenWhileEntering: boolean;
  handoffProgress: Animated.Value;
  onEntered: () => void;
}) {
  const c = COLORS[task.category];
  const duePresentation = formatDue(
    task.dueAt,
    Boolean(task.dueHasTime)
  );

  const done = task.microSteps.filter(
    (step) => step.completed
  ).length;

  const stepProgress =
    task.microSteps.length
      ? done / task.microSteps.length
      : 0;

  const shakeX = useRef(
    new Animated.Value(0)
  ).current;
  const swipeX = useSharedValue(0);
  const gestureStartX = useSharedValue(0);
  const rowWidth = useSharedValue(320);
  const removing = useSharedValue(0);
  const pressProgress = useSharedValue(0);
  const completionProgress = useSharedValue(0);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressProgress.value * 0.008 }],
  }));
  const completionStyle = useAnimatedStyle(() => {
    const collapse = Math.max(
      0,
      Math.min(1, (completionProgress.value - 0.3) / 0.7)
    );
    return {
      height: 101 * (1 - collapse),
      opacity: 1 - collapse * 0.82,
      transform: [{ scale: 1 - completionProgress.value * 0.012 }],
    };
  });
  useEffect(() => {
    const target = completionPhase === 'departing'
      ? 1
      : completionPhase === 'acknowledging'
        ? 0.28
        : 0;
    completionProgress.value = withTiming(target, {
      duration: reducedMotion
        ? motion.duration.reduced
        : completionPhase === 'departing'
          ? 420
          : motion.duration.response,
    });
  }, [completionPhase, completionProgress, reducedMotion]);
  const pressIn = () => {
    pressProgress.value = withTiming(1, {
      duration: reducedMotion ? 0 : motion.duration.response,
    });
  };
  const pressOut = () => {
    pressProgress.value = reducedMotion
      ? withTiming(0, { duration: 0 })
      : withSpring(0, motion.spring.standard);
  };
  const settleSwipe = (toValue: number) => {
    swipeX.value = withSpring(toValue, {
      stiffness: 390,
      damping: 36,
      mass: 0.72,
      overshootClamping: true,
    });
  };
  const triggerDelete = () => {
    confirmCommittedSwipe();
  };
  useEffect(() => {
    if (!swipeOpen) {
      settleSwipe(0);
    }
  }, [swipeOpen]);
  const confirmCommittedSwipe = () => {
    confirmSwipeDelete(
      () => {
        settleSwipe(0);
        onSwipeClose();
      },
      (commit) => {
        removing.value = withTiming(
          1,
          { duration: 230 },
          (finished) => {
            if (finished) {
              runOnJS(onSwipeClose)();
              runOnJS(commit)();
            }
          }
        );
      }
    );
  };
  const swipeGesture = Gesture.Pan()
    .enabled(canDelete)
    .activeOffsetX([-6, 6])
    .failOffsetY([-11, 11])
    .onStart(() => {
      gestureStartX.value = swipeX.value;
      runOnJS(onSwipeOpen)();
    })
    .onUpdate((event) => {
      const raw =
        gestureStartX.value + event.translationX;
      swipeX.value =
        raw > 0
          ? Math.min(9, raw * 0.09)
          : Math.max(-rowWidth.value * 1.04, raw);
    })
    .onEnd((event) => {
      const width = rowWidth.value;
      const reveal = Math.min(104, width * 0.27);
      const projected =
        swipeX.value + event.velocityX * 0.075;
      const commitsByDistance =
        swipeX.value <= -width * 0.72;
      const commitsByVelocity =
        event.velocityX < -1150 &&
        swipeX.value < -reveal;

      if (commitsByDistance || commitsByVelocity) {
        swipeX.value = withTiming(
          -width * 1.04,
          {
            duration: 190,
          },
          (finished) => {
            if (finished) {
              runOnJS(confirmCommittedSwipe)();
            }
          }
        );
      } else if (projected < -reveal * 0.5) {
        swipeX.value = withSpring(-reveal, {
          stiffness: 390,
          damping: 36,
          mass: 0.72,
          overshootClamping: true,
        });
      } else {
        swipeX.value = withSpring(0, {
          stiffness: 390,
          damping: 36,
          mass: 0.72,
          overshootClamping: true,
        });
        runOnJS(onSwipeClose)();
      }
    });
  const swipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeX.value }],
  }));
  const deleteActionStyle = useAnimatedStyle(() => {
    const reveal = Math.min(104, rowWidth.value * 0.27);
    const progress = Math.min(
      1,
      Math.max(0, -swipeX.value / reveal)
    );
    return {
      opacity: 0.3 + progress * 0.7,
      transform: [
        { translateX: (1 - progress) * 18 },
        { scale: 0.92 + progress * 0.08 },
      ],
    };
  });
  const removalStyle = useAnimatedStyle(() => {
    const p = removing.value;
    const collapse = Math.max(0, (p - 0.34) / 0.66);
    return {
      height: 101 * (1 - collapse),
      opacity: p < 0.78 ? 1 : 1 - (p - 0.78) / 0.22,
      transform: [
        { scaleX: 1 - 0.82 * p },
        { scaleY: 1 - 0.9 * collapse },
      ],
    };
  });
  useEffect(() => {
    if (!shake) return;

    Animated.sequence([
      Animated.timing(shakeX, {
        toValue: -6,
        duration: 45,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: 6,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: -4,
        duration: 45,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: 4,
        duration: 45,
        useNativeDriver: true,
      }),
      Animated.spring(shakeX, {
        toValue: 0,
        friction: 5,
        tension: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shakeNonce]);
  useEffect(() => {
    if (entering) {
      onEntered();
    }
  }, [entering]);

  const destinationOpacity =
    hiddenWhileEntering && entering
      ? handoffProgress.interpolate({
          inputRange: [
            0,
            GOAL_HANDOFF.landingCrossfadeStart,
            GOAL_HANDOFF.landingCrossfadeStart +
              (1 -
                GOAL_HANDOFF.landingCrossfadeStart) *
                0.25,
            GOAL_HANDOFF.landingCrossfadeStart +
              (1 -
                GOAL_HANDOFF.landingCrossfadeStart) *
                0.5,
            GOAL_HANDOFF.landingCrossfadeStart +
              (1 -
                GOAL_HANDOFF.landingCrossfadeStart) *
                0.75,
            1,
          ],
          outputRange: [
            0,
            0,
            0.103515625,
            0.5,
            0.896484375,
            1,
          ],
          extrapolate: 'clamp',
        })
      : 1;

  return (
    <AnimatedReanimated.View
      ref={cardRef}
      style={[
        styles.cardSwipeContainer,
        collapsedStack &&
          styles.cardSwipeContainerStack,
        removalStyle,
        completionStyle,
      ]}
      onLayout={(event) => {
        rowWidth.value =
          event.nativeEvent.layout.width;
      }}
    >
      {collapsedStack && (
        <AnimatedReanimated.View
          pointerEvents="none"
          style={[
            styles.categoryStackLayersMovingSurface,
            swipeStyle,
          ]}
        >
          <>
            {collapsedStack.count >= 3 && (
              <AnimatedReanimated.View
                pointerEvents="none"
                entering={FadeInDown.duration(220)}
                exiting={FadeOutUp.duration(170)}
                style={[
                  styles.categoryStackLayer,
                  styles.categoryStackLayerBack,
                  {
                    backgroundColor:
                      collapsedStack.theme.surfaceSoft,
                    borderColor:
                      `${collapsedStack.theme.accent}22`,
                  },
                ]}
              />
            )}
            <AnimatedReanimated.View
              pointerEvents="none"
              entering={FadeInDown.duration(205)}
              exiting={FadeOutUp.duration(160)}
              style={[
                styles.categoryStackLayer,
                styles.categoryStackLayerMiddle,
                {
                  backgroundColor: '#FFFEFD',
                  borderColor:
                    `${collapsedStack.theme.accent}2B`,
                },
              ]}
            />
          </>
        </AnimatedReanimated.View>
      )}

      <Animated.View
        style={[
          styles.cardSwipeShakeSurface,
          {
            transform: [{ translateX: shakeX }],
          },
        ]}
      >
        {canDelete && (
          <Pressable
            onPress={triggerDelete}
            style={({ pressed }) => [
              styles.swipeDeleteAction,
              pressed && styles.swipeDeletePressed,
            ]}
          >
            <AnimatedReanimated.View
              style={[
                styles.swipeDeleteContent,
                deleteActionStyle,
              ]}
            >
              <Trash2
                size={17}
                color="#9F2430"
                strokeWidth={2.5}
              />
              <Text style={styles.swipeDeleteText}>
                Delete
              </Text>
            </AnimatedReanimated.View>
          </Pressable>
        )}

        <GestureDetector gesture={swipeGesture}>
          <AnimatedReanimated.View
            style={[
              styles.cardSwipeMovingSurface,
              swipeStyle,
            ]}
          >
        <AnimatedReanimated.View style={pressStyle}>
        <Animated.View
          collapsable={false}
          style={[
            styles.card,
            collapsedStack && styles.categoryStackTopCard,
            {
              opacity: destinationOpacity,
            },
          ]}
        >
        <Pressable
          onPressIn={pressIn}
          onPressOut={pressOut}
          onPress={() => {
            if (swipeOpen) {
              settleSwipe(0);
              onSwipeClose();
            } else {
              open();
            }
          }}
          style={({ pressed }) => [
            styles.cardPressTarget,
          ]}
        >
        <View
          style={[
            styles.accent,
            {
              backgroundColor: c.accent,
            },
          ]}
        />

        <View style={styles.cardBody}>
          <View style={styles.rowBetween}>
            <View
              style={[
                styles.category,
                {
                  backgroundColor: c.surface,
                },
              ]}
            >
              <View
                style={[
                  styles.categoryDot,
                  {
                    backgroundColor: c.accent,
                  },
                ]}
              />

              <Text
                style={[
                  styles.categoryText,
                  {
                    color: c.strong,
                  },
                ]}
              >
                {c.name}
              </Text>
            </View>

            <View style={styles.cardMetaRight}>
            <View style={styles.time}>
              <Clock3
                size={11}
                color="#71717A"
              />

              <Text style={styles.timeText}>
                {task.minutes}m
              </Text>
            </View>
              {duePresentation && (
                <>
                  <Text style={styles.cardMetaSeparator}>·</Text>
                  <View style={styles.cardDueMetadata}>
                    <CalendarDays
                      size={10}
                      color={
                        duePresentation.urgency === 'overdue'
                          ? '#B42335'
                          : '#71717A'
                      }
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.cardDueMetadataText,
                        duePresentation.urgency === 'today' &&
                          styles.cardDueInlineToday,
                        duePresentation.urgency === 'overdue' &&
                          styles.cardDueTextOverdue,
                      ]}
                    >
                      {duePresentation.label}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>

          <Text
            style={[
              styles.cardTitle,
              relationshipLabel && styles.cardTitleSocial,
              task.completed &&
                styles.strike,
            ]}
            numberOfLines={2}
          >
            {task.title}
          </Text>

          {relationshipLabel && (
            <View style={styles.cardRelationshipRow}>
              {task.collaborationMode === 'supported' ? (
                <Heart size={11} color="#A56D55" strokeWidth={2.4} />
              ) : (
                <Users size={11} color="#8170B1" strokeWidth={2.4} />
              )}
              <Text
                numberOfLines={1}
                style={[
                  styles.cardRelationshipText,
                  task.collaborationMode === 'supported' &&
                    styles.cardRelationshipTextSupported,
                ]}
              >
                {relationshipLabel}
              </Text>
            </View>
          )}

          <View style={styles.cardBottom}>
            <View style={styles.cardProgressContext}>
              <View style={styles.cardProgressRow}>
                <Text style={styles.stepSummary}>
                  {done}/{task.microSteps.length}
                </Text>

                <View style={styles.miniProgress}>
                  <View
                    style={[
                      styles.miniFill,
                      {
                        width: `${stepProgress * 100}%`,
                        backgroundColor: c.accent,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>

            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                complete();
              }}
              style={({ pressed }) => [
                styles.smallCheck,
                (task.completed || done === task.microSteps.length) &&
                  styles.smallCheckReady,
                task.completed &&
                  styles.smallDone,
                pressed && styles.pressed,
              ]}
            >
              <Check
                size={14}
                color={
                  task.completed
                    ? '#fff'
                    : done === task.microSteps.length
                      ? c.accent
                      : '#71717A'
                }
                strokeWidth={3}
              />
            </Pressable>
          </View>
        </View>

        <ChevronRight
          size={16}
          color="#A1A1AA"
          style={styles.cardChevron}
        />
        </Pressable>
        </Animated.View>
        </AnimatedReanimated.View>
          </AnimatedReanimated.View>
        </GestureDetector>
      </Animated.View>
    </AnimatedReanimated.View>
  );
}

const BOTTOM_NAV_CENTERS = [0.13, 0.34, 0.84] as const;

function BottomNav({
  tab,
  setTab,
  reducedMotion,
  voiceOpen,
  transitionProgress,
  focusRiseProgress,
  interactiveDismissProgress,
  onVoicePress,
  onVoiceGeometry,
}: {
  tab: string;
  setTab: (value: string) => void;
  reducedMotion: boolean;
  voiceOpen: boolean;
  transitionProgress: Animated.Value;
  focusRiseProgress: Animated.Value;
  interactiveDismissProgress: SharedValue<number>;
  onVoicePress: () => void;
  onVoiceGeometry: (rect: VoiceOrbRect) => void;
}) {
  const items = [
    ['home', 'Home', House],
    ['together', 'Together', Users],
    ['pro', 'Pro', Gem],
  ] as const;

  const [navWidth, setNavWidth] =
    useState(0);
  const interactiveDepthStyle = useAnimatedStyle(() => {
    const progress = interactiveDismissProgress.value;
    const inverseScale = 1 / (1 - 0.015 * progress);
    return {
      transform: [
        { translateY: (3 * progress) / (1 - 0.015 * progress) },
        { scale: inverseScale },
      ],
    };
  });

  const activeIndex = Math.max(
    0,
    items.findIndex(
      ([id]) => id === tab
    )
  );

  const pillWidth = 88;
  const pillHeight = 38;

  const indicatorX = useRef(
    new Animated.Value(0)
  ).current;
  const indicatorScaleX = useRef(
    new Animated.Value(1)
  ).current;
  
  const indicatorScaleY = useRef(
    new Animated.Value(1)
  ).current;

  
  const activeGroupProgress = useRef(
    items.map(
      () => new Animated.Value(0)
    )
  ).current;
  const activeGroupScale = useRef(
    items.map(
      () => new Animated.Value(1)
    )
  ).current;
  const labelProgress = useRef(
    items.map(
      () => new Animated.Value(0)
    )
  ).current;
  const previousIndexRef = useRef(
    activeIndex
  );
  const voiceMeasureRef = useRef<View | null>(null);







  useEffect(() => {
    if (!navWidth) {
      return;
    }

      const destination = Math.min(
        navWidth - pillWidth,
        Math.max(
          0,
          BOTTOM_NAV_CENTERS[activeIndex] * navWidth -
            pillWidth / 2
        )
      );

    if (reducedMotion) {
      indicatorX.setValue(destination);
      indicatorScaleX.setValue(1);
      indicatorScaleY.setValue(1);
      previousIndexRef.current = activeIndex;
      items.forEach((_, index) => {
        labelProgress[index].setValue(index === activeIndex ? 1 : 0);
        activeGroupProgress[index].setValue(index === activeIndex ? 1 : 0);
        activeGroupScale[index].setValue(1);
      });
      return;
    }
    
    const previousIndex =
      previousIndexRef.current;
    
    const source = Math.min(
      navWidth - pillWidth,
      Math.max(
        0,
          BOTTOM_NAV_CENTERS[previousIndex] * navWidth -
          pillWidth / 2
      )
    );
    
    const direction =
      activeIndex > previousIndex
        ? 1
        : -1;
    
    previousIndexRef.current =
      activeIndex;
      indicatorX.stopAnimation();
indicatorScaleX.stopAnimation();
indicatorScaleY.stopAnimation();



if (activeIndex !== previousIndex) {

  Animated.parallel([
    // move immediately
    Animated.spring(
      indicatorX,
      {
        toValue: destination,
        stiffness: 360,
        damping: 34,
        mass: 0.62,
        useNativeDriver: true,
      }
    ),
  
    // soft material response while moving
    Animated.sequence([
      Animated.parallel([
        Animated.spring(
          indicatorScaleX,
          {
            toValue: 1.06,
            stiffness: 500,
            damping: 34,
            mass: 0.45,
            useNativeDriver: true,
          }
        ),
  
        Animated.spring(
          indicatorScaleY,
          {
            toValue: 0.96,
            stiffness: 500,
            damping: 34,
            mass: 0.45,
            useNativeDriver: true,
          }
        ),
      ]),
  
      Animated.parallel([
        Animated.spring(
          indicatorScaleX,
          {
            toValue: 1,
            stiffness: 520,
            damping: 36,
            mass: 0.42,
            useNativeDriver: true,
          }
        ),
  
        Animated.spring(
          indicatorScaleY,
          {
            toValue: 1,
            stiffness: 520,
            damping: 36,
            mass: 0.42,
            useNativeDriver: true,
          }
        ),
      ]),
    ]),
  ]).start();

} else {

  indicatorX.setValue(destination);

}
items.forEach((_, index) => {
  labelProgress[index].stopAnimation();

  if (index === activeIndex) {
    labelProgress[index].setValue(0);

    Animated.timing(
      labelProgress[index],
      {
        toValue: 1,
        duration: 135,
        easing: Easing.out(
          Easing.cubic
        ),
        useNativeDriver: true,
      }
    ).start();
  } else {
    labelProgress[index].setValue(0);
  }
});
items.forEach((_, index) => {
  activeGroupProgress[index].stopAnimation();
  activeGroupScale[index].stopAnimation();

  if (index === activeIndex) {
    activeGroupProgress[index].setValue(0);
    activeGroupScale[index].setValue(0.94);

    Animated.parallel([
      // Quick fade / rise into position
      Animated.timing(
        activeGroupProgress[index],
        {
          toValue: 1,
          duration: 100,
          easing: Easing.out(
            Easing.cubic
          ),
          useNativeDriver: true,
        }
      ),

      // Actual snap-back effect
      Animated.sequence([
        Animated.spring(
          activeGroupScale[index],
          {
            toValue: 1.045,
            stiffness: 620,
            damping: 28,
            mass: 0.38,
            useNativeDriver: true,
          }
        ),

        Animated.spring(
          activeGroupScale[index],
          {
            toValue: 1,
            stiffness: 650,
            damping: 38,
            mass: 0.34,
            useNativeDriver: true,
          }
        ),
      ]),
    ]).start();
  } else {
    activeGroupProgress[index].setValue(0);
    activeGroupScale[index].setValue(1);
  }
});
  }, [tab, navWidth, reducedMotion]);

  return (
    <Animated.View
      pointerEvents="auto"
      style={[
        styles.navWrap,
        {
          opacity: transitionProgress.interpolate({
            inputRange: [0, 0.72, 1],
            outputRange: [1, 0.48, 0],
          }),
          transform: [
            {
              translateY: transitionProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 42],
              }),
            },
            {
              translateY: focusRiseProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -3],
              }),
            },
            {
              scale: focusRiseProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.985],
              }),
            },
          ],
        },
      ]}
    >
      <AnimatedReanimated.View style={[{ flex: 1 }, interactiveDepthStyle]}>
      <View
        style={styles.nav}
        onLayout={(event) => {
          setNavWidth(
            event.nativeEvent.layout.width
          );
        }}
      >
        {navWidth > 0 && (
          <View pointerEvents="none" style={styles.voiceNavSilhouette}>
            <VoiceNavSilhouette width={navWidth + 16} />
          </View>
        )}
  {navWidth > 0 && (
  <Animated.View
    pointerEvents="none"
    style={[
      styles.navIndicator,
      {
        width: pillWidth,
        height: pillHeight,

        transform: [
          {
            translateX: indicatorX,
          },
          {
            scaleX: indicatorScaleX,
          },
          {
            scaleY: indicatorScaleY,
          },
        ],
      },
    ]}
  />
)}
      {items.map(
        (
          [id, label, Icon],
          index
        ) => {
          const active =
            tab === id;

          return (
            <Pressable
              key={id}
              onPress={() => {
                if (id === tab) return;
                void Haptics.selectionAsync();
                setTab(id);
              }}
              style={({
                pressed,
              }) => [
                styles.navItem,
                {
                  position: 'absolute',
                  width: 88,
                  left: `${BOTTOM_NAV_CENTERS[index] * 100}%`,
                  marginLeft: -44,
                },

                pressed &&
                  styles.navPressed,
              ]}
            >
              <View
                style={
                  styles.navAnimatedContent
                }
              >
  <Animated.View
    style={[
      styles.navPersistentContent,
      {
        width: active ? pillWidth : 38,
        height: pillHeight,
        transform: [
          {
              translateY:
                active
                  ? activeGroupProgress[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [3, 0],
                    })
                  : 0,
            },
            {
              scale:
                active ? activeGroupScale[index] : 1,
            },
          ],
      },
    ]}
  >  
    <Icon
      size={19}
      color={active ? colors.coralStrong : colors.textSecondary}
      strokeWidth={active ? 2.5 : 2.1}
    />

{active && (
  <Animated.Text
    numberOfLines={1}
    style={[
      styles.navActiveLabel,
      { opacity: labelProgress[index] },
    ]}
  >
    {label}
  </Animated.Text>
)}
  </Animated.View>
</View>
            </Pressable>
          );
        }
      )}
      <View style={styles.voiceOrbSlot}>
        <View
          ref={(node) => { voiceMeasureRef.current = node; }}
          collapsable={false}
          onLayout={() => {
            requestAnimationFrame(() => {
              voiceMeasureRef.current?.measureInWindow((x, y, width, height) => {
                onVoiceGeometry({ x, y, width, height });
              });
            });
          }}
          style={styles.voiceOrbMeasure}
        >
          <VoicePeekV2 onPress={onVoicePress} hidden={voiceOpen} />
        </View>
      </View>
      </View>
      </AnimatedReanimated.View>
    </Animated.View>
  );
}
function AnimatedReminder({
  message,
  onDone,
}: {
  message: string;
  onDone: () => void;
}) {
  const opacity = useRef(
    new Animated.Value(0)
  ).current;

  const translateY = useRef(
    new Animated.Value(12)
  ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 7,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 8,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          onDone();
        }
      });
    }, 2100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[
        styles.reminder,
        {
          opacity,
          transform: [
            {
              translateY,
            },
          ],
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.reminderIcon}>
        <Zap
          size={15}
          color={colors.coralStrong}
          strokeWidth={2.7}
        />
      </View>

      <Text style={styles.reminderText}>
        {message}
      </Text>
    </Animated.View>
  );
}

function Placeholder({
  tab,
}: {
  tab: string;
}) {
  const data: Record<
    string,
    [string, string, typeof Sparkles]
  > = {
    voice: [
      'Voice',
      'Turn a brain dump into your next small step.',
      Layers3,
    ],
    pro: [
      'Sunday Pro',
      'A calmer, smarter way to go deeper.',
      Flame,
    ],
  };

  const [title, sub, Icon] =
    data[tab] || data.voice;

  return (
    <View style={styles.placeholder}>
      <View style={styles.placeholderIcon}>
        <Icon
          size={27}
          color={colors.coralStrong}
          strokeWidth={2.2}
        />
      </View>

      <Text style={styles.placeholderTitle}>
        {title}
      </Text>

      <Text style={styles.placeholderText}>
        {sub}
      </Text>

      <View style={styles.coming}>
        <Text style={styles.comingText}>
          COMING NEXT
        </Text>
      </View>
    </View>
  );
}

function DetailStepRow({
  step,
  index,
  theme,
  reducedMotion,
  onToggle,
}: {
  step: Step;
  index: number;
  theme: Theme;
  reducedMotion: boolean;
  onToggle: () => void;
}) {
  const completion = useSharedValue(step.completed ? 1 : 0);
  const pressed = useSharedValue(0);

  useEffect(() => {
    completion.value = withTiming(step.completed ? 1 : 0, {
      duration: reducedMotion ? motion.duration.reduced : motion.duration.reveal,
    });
  }, [completion, reducedMotion, step.completed]);

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.006 }],
  }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: completion.value,
    transform: [{ scale: 0.72 + completion.value * 0.28 }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      completion.value,
      [0, 1],
      ['#3F3F46', '#8A8A91']
    ),
    opacity: 1 - completion.value * 0.28,
  }));

  const layout = reducedMotion
    ? LinearTransition.duration(motion.duration.reduced)
    : LinearTransition.springify()
        .damping(motion.spring.settle.damping)
        .stiffness(motion.spring.settle.stiffness)
        .mass(motion.spring.settle.mass);
  const entrance = reducedMotion
    ? FadeInDown.duration(motion.duration.reduced)
    : FadeInDown.duration(motion.duration.reveal)
        .delay(Math.min(index * 28, 84));

  return (
    <AnimatedReanimated.View
      entering={entrance}
      exiting={FadeOutUp.duration(reducedMotion ? motion.duration.reduced : 140)}
      layout={layout}
      style={rowStyle}
    >
      <Pressable
        onPressIn={() => {
          pressed.value = withTiming(1, {
            duration: reducedMotion ? 0 : motion.duration.response,
          });
        }}
        onPressOut={() => {
          pressed.value = reducedMotion
            ? withTiming(0, { duration: 0 })
            : withSpring(0, motion.spring.standard);
        }}
        onPress={() => {
          void Haptics.selectionAsync();
          onToggle();
        }}
        style={styles.detailStep}
      >
        <View
          style={[
            styles.detailCheck,
            step.completed && {
              backgroundColor: theme.accent,
              borderColor: theme.accent,
            },
          ]}
        >
          <AnimatedReanimated.View style={checkStyle}>
            <Check size={13} color="#fff" strokeWidth={3} />
          </AnimatedReanimated.View>
        </View>
        <AnimatedReanimated.Text
          style={[
            styles.detailText,
            textStyle,
            step.completed && styles.strike,
          ]}
        >
          {step.title}
        </AnimatedReanimated.Text>
      </Pressable>
    </AnimatedReanimated.View>
  );
}

function GeneratedStepsPlaceholder({
  reducedMotion,
}: {
  reducedMotion: boolean;
}) {
  const pulseOpacity = useRef(new Animated.Value(reducedMotion ? 0.78 : 0.62)).current;

  useEffect(() => {
    if (reducedMotion) {
      pulseOpacity.setValue(0.78);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, {
          toValue: 0.82,
          duration: 720,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity, {
          toValue: 0.62,
          duration: 720,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseOpacity, reducedMotion]);

  return (
    <AnimatedReanimated.View
      entering={FadeInDown.duration(reducedMotion ? motion.duration.reduced : 180)}
      exiting={FadeOutUp.duration(reducedMotion ? motion.duration.reduced : 160)}
      style={styles.generatedStepsPlaceholder}
    >
      <Text style={styles.generatedStepsPlaceholderTitle}>Finding your first steps…</Text>
      <Animated.View style={{ opacity: pulseOpacity }}>
        {[0.78, 0.9, 0.68].map((width, index) => (
          <View key={index} style={styles.generatedStepPlaceholderRow}>
            <View style={styles.generatedStepPlaceholderCircle} />
            <View style={styles.generatedStepPlaceholderCopy}>
              <View style={[styles.generatedStepPlaceholderLine, { width: `${width * 100}%` }]} />
              <View style={[styles.generatedStepPlaceholderLineShort, { width: `${width * 55}%` }]} />
            </View>
          </View>
        ))}
      </Animated.View>
    </AnimatedReanimated.View>
  );
}

function TaskModal({
  task,
  reducedMotion,
  findingSteps,
  close,
  toggle,
  addStep,
  complete,
  attemptComplete,
  remove,
  updateDue,
  connections,
  shareGoal,
  unshareGoal,
}: {
  task: Task | null;
  reducedMotion: boolean;
  findingSteps: boolean;
  close: () => void;
  toggle: (
    taskId: string,
    stepId: string
  ) => void;
  addStep: (taskId: string, title: string) => Promise<boolean>;
  complete: (task: Task) => void;
  attemptComplete: (
    task: Task
  ) => void;
  remove: (id: string) => void;
  updateDue: (
    taskId: string,
    dueAt?: string,
    dueHasTime?: boolean
  ) => void;
  connections: Connection[];
  shareGoal: (taskId: string, userId: string) => Promise<void>;
  unshareGoal: (taskId: string, userId: string) => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] =
    useState(false);

  const backdropOpacity = useRef(
    new Animated.Value(0)
  ).current;

  const translateY = useRef(
    new Animated.Value(500)
  ).current;
  const detailProgress = useRef(
    new Animated.Value(0)
  ).current;
  const detailShakeX = useRef(
    new Animated.Value(0)
  ).current;
  const closing = useRef(false);
  const [duePickerOpen, setDuePickerOpen] = useState(false);
  const [stepInputOpen, setStepInputOpen] = useState(false);
  const [stepDraft, setStepDraft] = useState('');
  const [stepSaving, setStepSaving] = useState(false);
  const [shareBusyUserId, setShareBusyUserId] = useState<string | null>(null);
  const stepInputRef = useRef<TextInput | null>(null);
  const stepScrollRef = useRef<ScrollView | null>(null);
  const stepSaveRequest = useRef(0);

  const previousTaskId =
    useRef<string | null>(null);

  useEffect(() => {
    const nextTaskId =
      task?.id ?? null;

    const isOpening =
      nextTaskId !== null &&
      previousTaskId.current !==
        nextTaskId;

    previousTaskId.current =
      nextTaskId;

    if (!isOpening) {
      return;
    }

    closing.current = false;
    setVisible(true);
    setStepInputOpen(false);
    setStepDraft('');
    setStepSaving(false);
    stepSaveRequest.current += 1;

    translateY.setValue(500);
    backdropOpacity.setValue(0);

    requestAnimationFrame(() => {
      translateY.stopAnimation();
      backdropOpacity.stopAnimation();
    
      Animated.parallel([
        Animated.timing(
          backdropOpacity,
          {
            toValue: 1,
            duration: 150,
            easing: Easing.out(
              Easing.quad
            ),
            useNativeDriver: true,
          }
        ),
    
        reducedMotion
          ? Animated.timing(translateY, {
              toValue: 0,
              duration: motion.duration.reduced,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            })
          : Animated.spring(translateY, {
              toValue: 0,
              ...motion.spring.settle,
              useNativeDriver: true,
            }),
      ]).start();
    });
  }, [reducedMotion, task?.id]);

  const dismiss = () => {
    if (closing.current) {
      return;
    }

    closing.current = true;
    Keyboard.dismiss();
    setStepInputOpen(false);
    setStepDraft('');
    stepSaveRequest.current += 1;

    translateY.stopAnimation();
    backdropOpacity.stopAnimation();

    Animated.parallel([
      Animated.timing(
        backdropOpacity,
        {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }
      ),
      Animated.timing(translateY, {
        toValue: 550,
        duration: reducedMotion ? motion.duration.reduced : 210,
        easing: Easing.in(
          Easing.cubic
        ),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      previousTaskId.current = null;
      close();
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder:
          () => true,
  
        onMoveShouldSetPanResponder: (
          _event,
          gesture
        ) =>
          gesture.dy > 2 &&
          Math.abs(gesture.dy) >
            Math.abs(gesture.dx),
  
        onPanResponderMove: (
          _event,
          gesture
        ) => {
          if (
            gesture.dy > 0 &&
            !closing.current
          ) {
            translateY.setValue(
              gesture.dy
            );
  
            const fade =
              Math.max(
                0,
                1 -
                  gesture.dy / 420
              );
  
            backdropOpacity.setValue(
              fade
            );
          }
        },
  
        onPanResponderRelease: (
          _event,
          gesture
        ) => {
          if (
            gesture.dy > 90 ||
            gesture.vy > 0.95
          ) {
            dismiss();
            return;
          }
  
          Animated.parallel([
            Animated.spring(
              translateY,
              {
                toValue: 0,
                stiffness: 330,
                damping: 28,
                mass: 0.8,
                useNativeDriver: true,
              }
            ),
  
            Animated.spring(
              backdropOpacity,
              {
                toValue: 1,
                stiffness: 320,
                damping: 28,
                mass: 0.8,
                useNativeDriver: true,
              }
            ),
          ]).start();
        },
      }),
    []
  );

  useEffect(() => {
    if (!task) {
      return;
    }
  
    const doneCount =
      task.microSteps.filter(
        (step) => step.completed
      ).length;
  
    const total =
      task.microSteps.length;
  
    const nextProgress =
      total > 0
        ? doneCount / total
        : 0;
  
    detailProgress.stopAnimation();
  
    Animated.timing(
      detailProgress,
      {
        toValue: nextProgress,
        duration: 240,
        easing: Easing.out(
          Easing.cubic
        ),
        useNativeDriver: false,
      }
    ).start();
  }, [task?.microSteps]);
  
  if (!task || !visible) {
    return null;
  }
  
  const c = COLORS[task.category];
  
  const done =
    task.microSteps.filter(
      (step) => step.completed
    ).length;
  
  const allDone = canCompleteGoal(task);

  const canReopen =
    task.status === 'completed';
  const relationshipPerson = connections.find((connection) =>
    task.collaborationMode === 'shared'
      ? task.memberIds?.includes(connection.userId)
      : task.collaborationMode === 'supported'
        ? task.supporterIds?.includes(connection.userId)
        : false
  );

  const openStepInput = () => {
    if (stepInputOpen || stepSaving) return;
    setStepInputOpen(true);
    requestAnimationFrame(() => {
      stepScrollRef.current?.scrollToEnd({ animated: !reducedMotion });
      requestAnimationFrame(() => stepInputRef.current?.focus());
    });
  };

  const cancelStep = () => {
    if (stepSaving) return;
    Keyboard.dismiss();
    setStepDraft('');
    setStepInputOpen(false);
  };

  const saveStep = async () => {
    const title = stepDraft.trim();
    if (!title || stepSaving) return;
    setStepSaving(true);
    const requestId = ++stepSaveRequest.current;
    const saved = await addStep(task.id, title);
    if (requestId !== stepSaveRequest.current) return;
    setStepSaving(false);
    if (!saved) return;
    setStepDraft('');
    setStepInputOpen(false);
    Keyboard.dismiss();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const shakeDetail = () => {
    detailShakeX.stopAnimation();
    detailShakeX.setValue(0);
    Animated.sequence([
      Animated.timing(detailShakeX, {
        toValue: -7,
        duration: 45,
        useNativeDriver: true,
      }),
      Animated.timing(detailShakeX, {
        toValue: 7,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(detailShakeX, {
        toValue: -5,
        duration: 45,
        useNativeDriver: true,
      }),
      Animated.timing(detailShakeX, {
        toValue: 5,
        duration: 45,
        useNativeDriver: true,
      }),
      Animated.spring(detailShakeX, {
        toValue: 0,
        friction: 6,
        tension: 170,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={dismiss}
      statusBarTranslucent
    >
      <View style={styles.modalRoot}>
        <Animated.View
          style={[
            styles.modalDim,
            {
              opacity:
                backdropOpacity,
            },
          ]}
        >
          <Pressable
            style={
              StyleSheet.absoluteFill
            }
            onPress={dismiss}
          />
        </Animated.View>

        <KeyboardAvoidingView
          pointerEvents="box-none"
          style={styles.detailKeyboardAvoider}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <Animated.View
  style={[
    styles.detail,
    { paddingBottom: Math.max(20, insets.bottom + 12) },
            {
              transform: [
                {
                  translateY,
                },
                {
                  translateX: detailShakeX,
                },
              ],
            },
          ]}
        >
          <View
  {...panResponder.panHandlers}
  style={styles.dragHandleArea}
>
  <View style={[styles.grabber, styles.detailGrabber]} />
</View>


          <View style={styles.sheetHead}>
            <View
              style={{
                flex: 1,
                paddingRight: 14,
              }}
            >
              <Text
                style={[
                  styles.eyebrow,
                  {
                    color: c.accent,
                  },
                ]}
              >
                {c.name.toUpperCase()} ·{' '}
                {task.minutes} MINUTES
              </Text>

              <Text style={styles.detailTitle}>
                {task.title}
              </Text>
            </View>

            <Pressable
              onPress={dismiss}
              style={({ pressed }) => [
                styles.close,
                pressed &&
                  styles.pressed,
              ]}
            >
              <X
                size={18}
                color="#52525B"
              />
            </Pressable>
          </View>

          <View style={styles.detailProgress}>
            <View
              style={
                styles.detailProgressTrack
              }
            >
              <Animated.View
  style={[
    styles.detailProgressFill,
    {
      width:
        detailProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [
            '0%',
            '100%',
          ],
        }),

      backgroundColor:
        c.accent,
    },
  ]}
/>
            </View>

            <Text
              style={
                styles.detailProgressText
              }
            >
              {done} of{' '}
              {task.microSteps.length}{' '}
              complete
            </Text>
          </View>

          <DueRow
            dueAt={task.dueAt}
            dueHasTime={Boolean(task.dueHasTime)}
            onPress={() => setDuePickerOpen(true)}
            compact
          />

          {relationshipPerson && task.collaborationMode !== 'private' && (
            <View style={styles.detailRelationshipContext}>
              {task.collaborationMode === 'supported' ? (
                <Heart size={14} color="#A56D55" strokeWidth={2.4} />
              ) : (
                <Users size={14} color="#8170B1" strokeWidth={2.4} />
              )}
              <View style={styles.detailRelationshipCopy}>
                <Text style={styles.detailRelationshipTitle}>
                  {task.collaborationMode === 'shared'
                    ? `Together with ${relationshipPerson.displayName}`
                    : `Supported by ${relationshipPerson.displayName}`}
                </Text>
                <Text style={styles.detailRelationshipDescription}>
                  {task.collaborationMode === 'shared'
                    ? "You're working toward this together."
                    : `${relationshipPerson.displayName} is in your corner.`}
                </Text>
              </View>
            </View>
          )}

          {connections.length > 0 && task.collaborationMode !== 'shared' && task.collaborationMode !== 'supported' && (
            <View style={styles.detailShareSection}>
              <Text style={styles.detailShareLabel}>SHARE WITH</Text>
              {connections.map((connection) => {
                const shared = task.sharedWithUserIds?.includes(connection.userId) ?? false;
                const busy = shareBusyUserId === connection.userId;
                return (
                  <Pressable
                    key={connection.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${shared ? 'Stop sharing with' : 'Share with'} ${connection.displayName}`}
                    accessibilityState={{ busy }}
                    disabled={shareBusyUserId !== null}
                    onPress={() => {
                      setShareBusyUserId(connection.userId);
                      void (shared
                        ? unshareGoal(task.id, connection.userId)
                        : shareGoal(task.id, connection.userId)
                      ).then(() => {
                        void Haptics.selectionAsync();
                      }).catch((error) => {
                        if (__DEV__) console.error('[Sunday goal share]', toBackendError(error));
                      }).finally(() => setShareBusyUserId(null));
                    }}
                    style={({ pressed }) => [
                      styles.detailSharePerson,
                      shared && styles.detailSharePersonActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={[styles.detailShareAvatar, { backgroundColor: connection.avatar.color }]}>
                      <Text style={styles.detailShareAvatarText}>{connection.avatar.initials}</Text>
                    </View>
                    <Text style={styles.detailShareName}>{connection.displayName}</Text>
                    <Text style={[styles.detailShareAction, shared && styles.detailShareActionActive]}>
                      {busy ? 'Saving…' : shared ? 'In your corner · Stop' : 'Share'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <ScrollView
            ref={stepScrollRef}
            style={styles.detailStepScroll}
            contentContainerStyle={styles.detailStepScrollContent}
            showsVerticalScrollIndicator={
              false
            }
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            onContentSizeChange={() => {
              if (stepInputOpen) {
                stepScrollRef.current?.scrollToEnd({ animated: !reducedMotion });
              }
            }}
          >
            {findingSteps && task.microSteps.length === 0 && (
              <GeneratedStepsPlaceholder reducedMotion={reducedMotion} />
            )}
            {task.microSteps.map((step, index) => (
              <DetailStepRow
                key={step.id}
                step={step}
                index={index}
                theme={c}
                reducedMotion={reducedMotion}
                onToggle={() => toggle(task.id, step.id)}
              />
            ))}
            {stepInputOpen ? (
              <AnimatedReanimated.View
                entering={FadeInDown.duration(reducedMotion ? motion.duration.reduced : motion.duration.reveal)}
                exiting={FadeOutUp.duration(reducedMotion ? motion.duration.reduced : 140)}
                layout={LinearTransition.duration(reducedMotion ? motion.duration.reduced : motion.duration.move)}
                style={styles.addStepInputRow}
              >
                <TextInput
                  ref={stepInputRef}
                  value={stepDraft}
                  onChangeText={setStepDraft}
                  onSubmitEditing={() => void saveStep()}
                  onFocus={() => {
                    requestAnimationFrame(() =>
                      stepScrollRef.current?.scrollToEnd({ animated: !reducedMotion })
                    );
                  }}
                  editable={!stepSaving}
                  returnKeyType="done"
                  placeholder="What’s the next small step?"
                  placeholderTextColor="#A1A1AA"
                  style={styles.addStepInput}
                />
                <Pressable
                  accessibilityLabel="Cancel adding step"
                  accessibilityRole="button"
                  disabled={stepSaving}
                  onPress={cancelStep}
                  style={({ pressed }) => [
                    styles.addStepCancel,
                    pressed && styles.pressed,
                  ]}
                >
                  <X size={14} color="#71717A" strokeWidth={2.7} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={!stepDraft.trim() || stepSaving}
                  onPress={() => void saveStep()}
                  style={({ pressed }) => [
                    styles.addStepSave,
                    (!stepDraft.trim() || stepSaving) && styles.disabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <Check size={15} color="#fff" strokeWidth={3} />
                </Pressable>
              </AnimatedReanimated.View>
            ) : (
              <AnimatedReanimated.View layout={LinearTransition.duration(motion.duration.move)}>
                <Pressable
                  accessibilityRole="button"
                  onPress={openStepInput}
                  style={({ pressed }) => [
                    styles.addStepControl,
                    pressed && styles.pressed,
                  ]}
                >
                  <Plus size={15} color={c.accent} strokeWidth={2.7} />
                  <Text style={[styles.addStepControlText, { color: c.strong }]}>Add step</Text>
                </Pressable>
              </AnimatedReanimated.View>
            )}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              onPress={() => {
                if (canReopen) {
                  complete(task);
                } else {
                  if (!allDone) {
                    shakeDetail();
                  } else {
                    dismiss();
                  }
                  attemptComplete(
                    task
                  );
                }
              }}
              style={({ pressed }) => [
                styles.detailComplete,
                {
                  backgroundColor:
                    c.accent,
                },
                pressed &&
                  styles.pressed,
              ]}
            >
              <Check
                size={15}
                color="#fff"
                strokeWidth={2.8}
              />

              <Text
                style={
                  styles.detailCompleteText
                }
              >
                {canReopen
                  ? 'Reopen Goal'
                  : 'Mark Complete'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                remove(task.id)
              }
              style={({ pressed }) => [
                styles.delete,
                pressed &&
                  styles.pressed,
              ]}
            >
              <Trash2
                size={17}
                color="#DC2626"
              />
            </Pressable>
          </View>
        </Animated.View>
        </KeyboardAvoidingView>
        <DueDatePickerSheet
          visible={duePickerOpen}
          dueAt={task.dueAt}
          dueHasTime={Boolean(task.dueHasTime)}
          onChange={(nextDueAt, nextDueHasTime) =>
            updateDue(task.id, nextDueAt, nextDueHasTime)
          }
          onClose={() => setDuePickerOpen(false)}
        />
      </View>
    </Modal>
  );
}

function LibraryGoalRow({
  task,
  completedMode,
  reducedMotion,
  prepareRestore,
  commitRestore,
  preparePermanentDelete,
  commitPermanentDelete,
}: {
  task: Task;
  completedMode: boolean;
  reducedMotion: boolean;
  prepareRestore: (taskId: string) => Promise<boolean>;
  commitRestore: (taskId: string) => void;
  preparePermanentDelete: (taskId: string) => Promise<boolean>;
  commitPermanentDelete: (taskId: string) => void;
}) {
  const c = COLORS[task.category];
  const departure = useSharedValue(0);
  const departureKind = useSharedValue(0);
  const measuredHeight = useSharedValue(0);
  const [busy, setBusy] = useState(false);
  const actionLocked = useRef(false);

  const rowStyle = useAnimatedStyle(() => {
    const p = departure.value;
    const restoring = departureKind.value === 1;
    const revive = Math.min(1, p / 0.22);
    const exit = Math.max(0, Math.min(1, (p - 0.28) / 0.72));
    return {
      opacity: 1 - exit * (restoring ? 0.58 : 0.9),
      transform: [
        { translateY: restoring ? -5 * exit : 2 * exit },
        {
          scale: restoring
            ? 1 + revive * 0.006 - exit * 0.012
            : 1 - exit * 0.08,
        },
      ],
    };
  });
  const collapseStyle = useAnimatedStyle(() => {
    if (measuredHeight.value <= 0) return {};
    const exit = Math.max(0, Math.min(1, (departure.value - 0.28) / 0.72));
    return {
      height: measuredHeight.value * (1 - exit),
      marginBottom: 9 * (1 - exit),
      overflow: 'hidden',
    };
  });

  const finishDeparture = (kind: 'restore' | 'delete') => {
    const duration = reducedMotion ? motion.duration.reduced : kind === 'restore' ? 300 : 210;
    departureKind.value = kind === 'restore' ? 1 : 2;
    departure.value = withTiming(1, { duration });
    // Persistence has already succeeded. Keep the canonical local mutation
    // independent of the visual node's lifetime so dismissing the modal during
    // this short departure cannot leave stale archive state behind.
    setTimeout(() => {
      if (kind === 'restore') commitRestore(task.id);
      else commitPermanentDelete(task.id);
    }, duration);
  };

  const restore = async () => {
    if (actionLocked.current) return;
    actionLocked.current = true;
    setBusy(true);
    void Haptics.selectionAsync();
    const succeeded = await prepareRestore(task.id);
    if (!succeeded) {
      actionLocked.current = false;
      setBusy(false);
      return;
    }
    finishDeparture('restore');
  };

  const deleteForever = async () => {
    if (actionLocked.current) return;
    actionLocked.current = true;
    setBusy(true);
    const succeeded = await preparePermanentDelete(task.id);
    if (!succeeded) {
      actionLocked.current = false;
      setBusy(false);
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    finishDeparture('delete');
  };

  const layout = reducedMotion
    ? LinearTransition.duration(motion.duration.reduced)
    : LinearTransition.springify()
        .damping(motion.spring.settle.damping)
        .stiffness(motion.spring.settle.stiffness)
        .mass(motion.spring.settle.mass);

  return (
    <AnimatedReanimated.View layout={layout} style={[styles.libraryRowShell, collapseStyle]}>
      <AnimatedReanimated.View
        style={[styles.libraryItem, rowStyle]}
        onLayout={(event) => {
          if (departure.value === 0) measuredHeight.value = event.nativeEvent.layout.height;
        }}
      >
        <View style={[styles.libraryAccent, { backgroundColor: c.accent }]} />
        <View style={styles.libraryItemBody}>
          <Text style={styles.libraryCategory}>{c.name.toUpperCase()}</Text>
          <Text style={styles.libraryItemTitle} numberOfLines={2}>{task.title}</Text>
          {task.dueAt && (
            <Text style={styles.libraryDueText}>
              {formatDue(task.dueAt, Boolean(task.dueHasTime))?.label}
            </Text>
          )}
          <View style={styles.libraryActions}>
            <Pressable
              disabled={busy}
              onPress={() => void restore()}
              style={({ pressed }) => [
                styles.libraryRestore,
                busy && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.libraryRestoreText}>
                {completedMode ? 'Return to Flow' : 'Restore'}
              </Text>
            </Pressable>
            {!completedMode && (
              <Pressable
                disabled={busy}
                onPress={() => void deleteForever()}
                style={({ pressed }) => [
                  styles.libraryPermanent,
                  busy && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <Trash2 size={15} color="#DC2626" />
              </Pressable>
            )}
          </View>
        </View>
      </AnimatedReanimated.View>
    </AnimatedReanimated.View>
  );
}

function GoalLibraryModal({
  mode,
  tasks,
  close,
  openActiveGoal,
  prepareRestore,
  commitRestore,
  preparePermanentDelete,
  commitPermanentDelete,
  reducedMotion,
}: {
  mode: 'active' | 'completed' | 'deleted' | null;
  tasks: Task[];
  close: () => void;
  openActiveGoal: (taskId: string) => void;
  prepareRestore: (taskId: string) => Promise<boolean>;
  commitRestore: (taskId: string) => void;
  preparePermanentDelete: (taskId: string) => Promise<boolean>;
  commitPermanentDelete: (taskId: string) => void;
  reducedMotion: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(
    mode !== null
  );
  const [renderedMode, setRenderedMode] =
    useState<'active' | 'completed' | 'deleted'>(
      mode ?? 'completed'
    );
  const backdropOpacity = useRef(
    new Animated.Value(0)
  ).current;
  const sheetTranslateY = useRef(
    new Animated.Value(520)
  ).current;
  const closingRef = useRef(false);
  const activeGoalAfterDismissRef = useRef<string | null>(null);

  useEffect(() => {
    if (mode === null) return;

    closingRef.current = false;
    setRenderedMode(mode);
    setMounted(true);
    backdropOpacity.stopAnimation();
    sheetTranslateY.stopAnimation();
    backdropOpacity.setValue(0);
    sheetTranslateY.setValue(520);

    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 170,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [mode]);

  const dismiss = () => {
    if (closingRef.current) return;
    closingRef.current = true;

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 150,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 520,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;
      setMounted(false);
      closingRef.current = false;
      close();
      const activeGoalId = activeGoalAfterDismissRef.current;
      activeGoalAfterDismissRef.current = null;
      if (activeGoalId) openActiveGoal(activeGoalId);
    });
  };

  if (!mounted) {
    return null;
  }

  const activeMode = renderedMode === 'active';
  const completedMode =
    renderedMode === 'completed';

  return (
    <Modal
      transparent
      visible
      animationType="none"
      onRequestClose={dismiss}
      statusBarTranslucent
    >
      <View style={styles.modalRoot}>
        <Animated.View
          style={[
            styles.libraryBackdrop,
            { opacity: backdropOpacity },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={dismiss}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.librarySheet,
            {
              paddingBottom: Math.max(20, insets.bottom + 12),
            },
            {
              transform: [
                { translateY: sheetTranslateY },
              ],
            },
          ]}
        >
          <View style={styles.dragHandleArea}>
            <View style={styles.grabber} />
          </View>
          <View style={styles.libraryHeader}>
            <View>
              <Text style={styles.libraryKicker}>
                {activeMode
                  ? 'YOUR FLOW'
                  : completedMode
                  ? 'YOUR PROGRESS'
                  : 'RECOVERY'}
              </Text>
              <Text style={styles.libraryTitle}>
                {activeMode
                  ? 'Active Goals'
                  : completedMode
                  ? 'Completed Goals'
                  : 'Recently Deleted'}
              </Text>
            </View>

            <Pressable
              onPress={dismiss}
              style={({ pressed }) => [
                styles.close,
                pressed && styles.pressed,
              ]}
            >
              <X size={18} color="#52525B" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={
              styles.libraryList
            }
          >
            {tasks.map((task) => activeMode ? (
              <CompactGoalPreview
                key={task.id}
                task={task}
                relationshipLabel={null}
                open={() => {
                  activeGoalAfterDismissRef.current = task.id;
                  dismiss();
                }}
              />
            ) : (
              <LibraryGoalRow
                key={task.id}
                task={task}
                completedMode={completedMode}
                reducedMotion={reducedMotion}
                prepareRestore={prepareRestore}
                commitRestore={commitRestore}
                preparePermanentDelete={preparePermanentDelete}
                commitPermanentDelete={commitPermanentDelete}
              />
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

type NewGoalTransitionState =
  | 'closed'
  | 'preparingOpen'
  | 'opening'
  | 'open'
  | 'closing'
  | 'handoffToFab';

function NewGoalModal({
  transitionState,
  setTransitionState,
  focusRiseProgress,
  swipeDismissProgress,
  swipeDismissDragY,
  swipeDismissTravel,
  reducedMotion,
  launchOrigin,
  title,
  setTitle,
  category,
  setCategory,
  dueAt,
  dueHasTime,
  collaborationMode,
  setCollaborationMode,
  collaborationPersonId,
  setCollaborationPersonId,
  connections,
  inviteConnection,
  setDue,
  create,
  finishHandoff,
  session,
  handoffNonce,
  landingRect,
  handoffProgress,
  onFabOwnershipChange,
  measureFab,
  logLifecycle,
  onNativeModalWillDismiss,
  onNativeModalDismissed,
}: {
  transitionState: NewGoalTransitionState;
  setTransitionState: (next: NewGoalTransitionState) => void;
  focusRiseProgress: Animated.Value;
  swipeDismissProgress: SharedValue<number>;
  swipeDismissDragY: SharedValue<number>;
  swipeDismissTravel: SharedValue<number>;
  reducedMotion: boolean;
  launchOrigin: LandingRect | null;
  title: string;
  setTitle: (value: string) => void;
  category: Category;
  setCategory: (
    value: Category
  ) => void;
  dueAt?: string;
  dueHasTime: boolean;
  collaborationMode: GoalCollaborationMode;
  setCollaborationMode: (mode: GoalCollaborationMode) => void;
  collaborationPersonId: string | null;
  setCollaborationPersonId: (userId: string | null) => void;
  connections: Connection[];
  inviteConnection: () => void;
  setDue: (dueAt?: string, dueHasTime?: boolean) => void;
  create: () => void;
  finishHandoff: (session: number) => void;
  session: number;
  handoffNonce: number;
  landingRect: LandingRect | null;
  handoffProgress: Animated.Value;
  onFabOwnershipChange: (owned: boolean, decorationVisible?: boolean) => void;
  measureFab: (complete: (frame: LandingRect | null) => void) => void;
  logLifecycle: (event: string, detail?: unknown) => void;
  onNativeModalWillDismiss: () => void;
  onNativeModalDismissed: () => void;

}) {
  const { height: screenHeight, width: screenWidth } =
    useWindowDimensions();
  const screenSizeRef = useRef({ width: screenWidth, height: screenHeight });
  screenSizeRef.current = { width: screenWidth, height: screenHeight };
  const insets = useSafeAreaInsets();

  const transitionStateRef = useRef<NewGoalTransitionState>(transitionState);
  transitionStateRef.current = transitionState;
  const setTransitionPhase = useCallback((next: NewGoalTransitionState) => {
    transitionStateRef.current = next;
    setTransitionState(next);
  }, [setTransitionState]);
  const [duePickerOpen, setDuePickerOpen] = useState(false);
  const [togetherPickerOpen, setTogetherPickerOpen] = useState(false);
  const [dueDismissRequest, setDueDismissRequest] = useState(0);
  const [togetherDismissRequest, setTogetherDismissRequest] = useState(0);
  const lifecycleRef = useRef(0);
  const submittingSessionRef = useRef(session);
  const openFrameRef = useRef<number | null>(null);
  const ownershipFrameRef = useRef<number | null>(null);
  const modalShowActionRef = useRef<(() => void) | null>(null);
  const modalShownSessionRef = useRef<number | null>(null);
  const closeCompletionLifecycleRef = useRef<number | null>(null);
  const activeTransitionRafsRef = useRef(new Set<number>());
  const morphFrameRef = useRef<number | null>(null);
  const snapshotFrameRef = useRef<number | null>(null);
  const keyboardDismissPendingRef = useRef(false);
  const swipeDismissScrollOffset = useSharedValue(0);
  const swipeDismissKeyboardHeight = useSharedValue(0);
  const swipeDismissEnabled = useSharedValue(false);
  const swipeDismissTouchStartX = useSharedValue(0);
  const swipeDismissTouchStartY = useSharedValue(0);
  const swipeDismissReleaseHandled = useSharedValue(false);

  const [keyboardHeight, setKeyboardHeight] =
    useState(0);
    const [submitting, setSubmitting] =
    useState(false);
    const [
      submittedGoal,
      setSubmittedGoal,
    ] = useState<{
      title: string;
      category: Category;
      dueAt?: string;
      dueHasTime: boolean;
    } | null>(null);
  const submitProgress = useRef(
    new Animated.Value(0)
  ).current;
  const sheetMorph = useRef(
    new Animated.Value(0)
  ).current;
  const sourceShellHeight = useRef(
    new Animated.Value(COMPACT_GOAL_CARD_HEIGHT)
  ).current;
  const sourceShellExpandedHeightRef =
    useRef(0);
  const submitDockY = useRef(
    new Animated.Value(0)
  ).current;
  const submitDockX = useRef(
    new Animated.Value(0)
  ).current;
  
  const submitDockScaleX = useRef(
    new Animated.Value(1)
  ).current;
  
  const submitDockScaleY = useRef(
    new Animated.Value(1)
  ).current;
  const submitPreviewOpacity = useRef(
    new Animated.Value(1)
  ).current;
  const morphCardOpacity = useRef(
    new Animated.Value(1)
  ).current;
  const morphCardRef =
  useRef<View | null>(null);
  const [handoffImage, setHandoffImage] =
    useState<SkImage | null>(null);
  const handoffImageRef =
    useRef<SkImage | null>(null);
  
  const [dockFinished, setDockFinished] =
    useState(false);
    const [morphRect, setMorphRect] =
    useState<{
      x: number;
      y: number;
      width: number;
      height: number;
    } | null>(null);
  const completePreviewHandoff = () => {
    setSubmitting(false);
    submitProgress.setValue(0);

submitDockY.setValue(0);
submitDockX.setValue(0);
submitDockScaleX.setValue(1);
submitDockScaleY.setValue(1);

setDockFinished(false);
  
    finishHandoff(submittingSessionRef.current);
  };
  useEffect(() => {
    if (
      !submitting ||
      !dockFinished ||
      handoffNonce === 0
    ) {
      return;
    }
  
    /* Both cards have completed their shared-progress crossfade. */
    finishHandoff(submittingSessionRef.current);

    setSubmitting(false);
    submitProgress.setValue(0);

    submitDockY.setValue(0);
    submitDockX.setValue(0);
    submitDockScaleX.setValue(1);
    submitDockScaleY.setValue(1);
    submitPreviewOpacity.setValue(1);

    setDockFinished(false);
  }, [
    handoffNonce,
    dockFinished,
    submitting,
  ]);
  useEffect(() => {
    if (submitting) {
      return;
    }

    setSubmittedGoal(null);
    setMorphRect(null);

    const completedImage = handoffImageRef.current;
    handoffImageRef.current = null;
    setHandoffImage(null);
    completedImage?.dispose();
  }, [submitting]);
  const sheetY = useRef(
    new Animated.Value(650)
  ).current;
  const contentReveal = useRef(new Animated.Value(0)).current;
  const openingSurfaceStartedRef = useRef(false);
  const transitionFramesCommittedRef = useRef(false);
  const newGoalSurfaceMeasureRef = useRef<View | null>(null);
  const [transitionSheetFrame, setTransitionSheetFrame] = useState<LandingRect | null>(null);
  const [, setTransitionFabFrame] = useState<LandingRect | null>(launchOrigin);
  const successfulExitRef = useRef(false);

  const backdropOpacity = useRef(
    new Animated.Value(0)
  ).current;

  

  const keyboardHeightRef =
    useRef(0);

  const requestTransitionFrame = useCallback((callback: () => void) => {
    let frame = 0;
    frame = requestAnimationFrame(() => {
      activeTransitionRafsRef.current.delete(frame);
      callback();
    });
    activeTransitionRafsRef.current.add(frame);
    return frame;
  }, []);

  const cancelAllTransitionFrames = useCallback(() => {
    activeTransitionRafsRef.current.forEach((frame) => cancelAnimationFrame(frame));
    activeTransitionRafsRef.current.clear();
    openFrameRef.current = null;
    ownershipFrameRef.current = null;
  }, []);

  /*
   * OPEN / CLOSE
   */

  const handleNativeModalShow = useCallback(() => {
    modalShownSessionRef.current = session;
    logLifecycle('MODAL_ON_SHOW');
    const showAction = modalShowActionRef.current;
    modalShowActionRef.current = null;
    showAction?.();
  }, [logLifecycle, session]);

  const resetToDeterministicClosedState = (lifecycle: number) => {
    if (lifecycle !== lifecycleRef.current) return;
    logLifecycle('FINAL_CLEANUP_START');

    focusRiseProgress.stopAnimation();
    focusRiseProgress.setValue(0);
    contentReveal.stopAnimation();
    backdropOpacity.stopAnimation();
    sheetY.stopAnimation();
    contentReveal.setValue(0);
    backdropOpacity.setValue(0);
    sheetY.setValue(0);
    keyboardHeightRef.current = 0;
    setKeyboardHeight(0);
    keyboardDismissPendingRef.current = false;
    cancelAnimation(swipeDismissDragY);
    swipeDismissDragY.value = 0;
    swipeDismissScrollOffset.value = 0;
    swipeDismissEnabled.value = false;
    openingSurfaceStartedRef.current = false;
    transitionFramesCommittedRef.current = false;
    modalShowActionRef.current = null;
    modalShownSessionRef.current = null;
    closeCompletionLifecycleRef.current = null;
    setTransitionFabFrame(null);
    setTransitionSheetFrame(null);
    onFabOwnershipChange(false, true);
    cancelAllTransitionFrames();
    onNativeModalWillDismiss();
    setTransitionPhase('closed');
    logLifecycle('FOCUS_RISE_REMOVED');
    logLifecycle('STATE_CLOSED');
    logLifecycle('FINAL_CLEANUP_COMPLETE', {
      state: 'closed',
      modalVisible: false,
      focusRiseVisible: false,
      fabHidden: false,
      backdropActive: false,
      contentInteractive: false,
      pointerEvents: 'none/unmounted',
      focusRiseProgress: 0,
      plusOpacity: 1,
      plusScale: 1,
      sheetOffset: 0,
      completionGuard: null,
      renderReadyFlag: false,
    });
  };

  const completeOpeningFromFocusRise = (lifecycle: number) => {
    if (
      lifecycle !== lifecycleRef.current ||
      transitionStateRef.current !== 'opening'
    ) return;
    logLifecycle('OPEN_ANIMATION_COMPLETE');
    setTransitionPhase('open');
    logLifecycle('STATE_OPEN');
  };

  const completeClosingFromFocusRise = (
    lifecycle: number
  ) => {
    if (
      lifecycle !== lifecycleRef.current ||
      transitionStateRef.current !== 'closing' ||
      closeCompletionLifecycleRef.current === lifecycle
    ) {
      return;
    }
    closeCompletionLifecycleRef.current = lifecycle;
    logLifecycle('CLOSE_ANIMATION_COMPLETE');
    setTransitionPhase('handoffToFab');
    /* The approved rise has returned fully below the viewport. */
    ownershipFrameRef.current = requestTransitionFrame(() => {
      if (
        lifecycle !== lifecycleRef.current ||
        transitionStateRef.current !== 'handoffToFab'
      ) {
        return;
      }

      /* Commit the real FAB before dismissing the native Modal host. */
      onFabOwnershipChange(false, true);
      logLifecycle('FAB_RESTORED');
      ownershipFrameRef.current = requestTransitionFrame(() => {
        ownershipFrameRef.current = requestTransitionFrame(() => {
          ownershipFrameRef.current = null;
          if (
            lifecycle !== lifecycleRef.current ||
            transitionStateRef.current !== 'handoffToFab'
          ) {
            return;
          }

          resetToDeterministicClosedState(lifecycle);
        });
      });
    });
  };

  const startClosing = (
    lifecycle: number
  ) => {
    if (transitionStateRef.current !== 'open') {
      logLifecycle(`CLOSE_REJECTED:${transitionStateRef.current}`);
      return;
    }
    logLifecycle('CLOSE_ACCEPTED');
    closeCompletionLifecycleRef.current = null;
    setTransitionPhase('closing');
    logLifecycle('CLOSE_ANIMATION_START');
    focusRiseProgress.stopAnimation();
    cancelAnimation(swipeDismissDragY);
    swipeDismissDragY.value = 0;
    Animated.timing(focusRiseProgress, {
      toValue: 0,
      duration: reducedMotion ? motion.duration.reduced : 380,
      easing: Easing.bezier(0.4, 0, 0.8, 0.2),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) completeClosingFromFocusRise(lifecycle);
    });
  };

  useEffect(() => {
    if (transitionState !== 'preparingOpen') return;
    cancelAllTransitionFrames();
    const lifecycle = lifecycleRef.current + 1;
    lifecycleRef.current = lifecycle;

    if (openFrameRef.current !== null) {
      cancelAnimationFrame(openFrameRef.current);
      openFrameRef.current = null;
    }

    if (ownershipFrameRef.current !== null) {
      cancelAnimationFrame(ownershipFrameRef.current);
      ownershipFrameRef.current = null;
    }

    if (morphFrameRef.current !== null) {
      cancelAnimationFrame(morphFrameRef.current);
      morphFrameRef.current = null;
    }

    if (snapshotFrameRef.current !== null) {
      cancelAnimationFrame(snapshotFrameRef.current);
      snapshotFrameRef.current = null;
    }

    modalShowActionRef.current = null;
      keyboardDismissPendingRef.current = false;
      cancelAnimation(swipeDismissDragY);
      swipeDismissDragY.value = 0;
      swipeDismissScrollOffset.value = 0;
      swipeDismissEnabled.value = false;
    closeCompletionLifecycleRef.current = null;
    onFabOwnershipChange(false, true);
    setDuePickerOpen(false);
    setTogetherPickerOpen(false);

      sheetY.stopAnimation();
      contentReveal.stopAnimation();
      backdropOpacity.stopAnimation();
      sheetY.setValue(0);
      openingSurfaceStartedRef.current = false;
      transitionFramesCommittedRef.current = false;
      setTransitionSheetFrame(null);
      setTransitionFabFrame(launchOrigin);
      successfulExitRef.current = false;
      contentReveal.setValue(0);
      focusRiseProgress.stopAnimation();
      focusRiseProgress.setValue(0);
      backdropOpacity.setValue(1);
    
      setSubmitting(false);
setDockFinished(false);
setSubmittedGoal(null);


submitProgress.stopAnimation();
sheetMorph.stopAnimation();
sourceShellHeight.stopAnimation();

submitDockY.stopAnimation();
submitDockX.stopAnimation();
submitDockScaleX.stopAnimation();
submitDockScaleY.stopAnimation();
sheetMorph.stopAnimation();

submitPreviewOpacity.stopAnimation();
morphCardOpacity.stopAnimation();

submitProgress.setValue(0);
sheetMorph.setValue(0);
sheetMorph.setValue(0);
if (sourceShellExpandedHeightRef.current > 0) {
  sourceShellHeight.setValue(
    sourceShellExpandedHeightRef.current
  );
}

setMorphRect(null);

handoffImageRef.current?.dispose();
handoffImageRef.current = null;
setHandoffImage(null);

submitDockY.setValue(0);
submitDockX.setValue(0);
submitDockScaleX.setValue(1);
submitDockScaleY.setValue(1);
sheetMorph.setValue(0);

submitPreviewOpacity.setValue(1);
morphCardOpacity.setValue(1);
  }, [transitionState]);

  useEffect(() => {
    return () => {
      focusRiseProgress.stopAnimation();
      if (openFrameRef.current !== null) cancelAnimationFrame(openFrameRef.current);
      if (ownershipFrameRef.current !== null) cancelAnimationFrame(ownershipFrameRef.current);
      cancelAllTransitionFrames();
      modalShowActionRef.current = null;
      modalShownSessionRef.current = null;
      closeCompletionLifecycleRef.current = null;
      contentReveal.stopAnimation();
      backdropOpacity.stopAnimation();
      onFabOwnershipChange(false);
      handoffImageRef.current?.dispose();
      handoffImageRef.current = null;
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') return;
      const phase = transitionStateRef.current;
      if (phase === 'preparingOpen' || phase === 'opening') {
        if (!transitionFramesCommittedRef.current) {
          resetToDeterministicClosedState(lifecycleRef.current);
          return;
        }
        focusRiseProgress.stopAnimation();
        focusRiseProgress.setValue(1);
        contentReveal.stopAnimation();
        backdropOpacity.stopAnimation();
        contentReveal.setValue(1);
        backdropOpacity.setValue(1);
        setTransitionPhase('open');
        return;
      }
      if (phase === 'closing' || phase === 'handoffToFab') {
        focusRiseProgress.stopAnimation();
        focusRiseProgress.setValue(0);
        contentReveal.stopAnimation();
        backdropOpacity.stopAnimation();
        contentReveal.setValue(0);
        backdropOpacity.setValue(0);
        setTransitionPhase('closed');
        onFabOwnershipChange(false);
      }
    });
    return () => subscription.remove();
  }, [onFabOwnershipChange, setTransitionPhase]);

  const dismiss = (source: 'x' | 'backdrop' | 'system' = 'system') => {
    if (transitionStateRef.current !== 'open') {
      logLifecycle(`CLOSE_REJECTED:${transitionStateRef.current}`);
      return;
    }
    logLifecycle(source === 'x' ? 'CLOSE_REQUEST_X' : source === 'backdrop' ? 'CLOSE_REQUEST_BACKDROP' : 'CLOSE_REQUEST_SYSTEM');
    if (keyboardHeightRef.current > 0) {
      if (keyboardDismissPendingRef.current) return;
      keyboardDismissPendingRef.current = true;
      Keyboard.dismiss();
      keyboardHeightRef.current = 0;
      setKeyboardHeight(0);
      requestTransitionFrame(() => {
        keyboardDismissPendingRef.current = false;
        dismiss(source);
      });
      return;
    }
    const lifecycle = lifecycleRef.current;
    Keyboard.dismiss();
    startClosing(lifecycle);
  };
/*
 * KEYBOARD
 *
 * Keyboard state is tracked for gesture arbitration only.
 * The production Focus Rise shell remains locked to its measured frame.
 */

useEffect(() => {
  const showEvent =
    Platform.OS === 'ios'
      ? 'keyboardWillShow'
      : 'keyboardDidShow';

  const hideEvent =
    Platform.OS === 'ios'
      ? 'keyboardWillHide'
      : 'keyboardDidHide';

  const showSubscription =
    Keyboard.addListener(
      showEvent,
      (event) => {
        const height =
          event.endCoordinates.height;

        keyboardHeightRef.current =
          height;

        setKeyboardHeight(height);

      }
    );

  const hideSubscription =
    Keyboard.addListener(
      hideEvent,
      () => {
        keyboardHeightRef.current = 0;

        setKeyboardHeight(0);

      }
    );

  return () => {
    showSubscription.remove();
    hideSubscription.remove();
  };
}, []);

  const submitGoal = () => {
    if (
      !title.trim() ||
      submitting
    ) {
      return;
    }
  
    Keyboard.dismiss();
    successfulExitRef.current = true;
    submittingSessionRef.current = session;
    const lifecycle = lifecycleRef.current;

    setSubmittedGoal({
      title: title.trim(),
      category,
      dueAt,
      dueHasTime,
    });
  
    setSubmitting(true);
  
    submitProgress.stopAnimation();
    sourceShellHeight.stopAnimation();
    backdropOpacity.stopAnimation();
    sheetY.stopAnimation();
    handoffProgress.stopAnimation();
  
    submitProgress.setValue(0);
    handoffProgress.setValue(0);
    sourceShellHeight.setValue(
      Math.max(
        COMPACT_GOAL_CARD_HEIGHT,
        sourceShellExpandedHeightRef.current
      )
    );
  
    submitDockY.stopAnimation();
submitDockX.stopAnimation();
submitDockScaleX.stopAnimation();
submitDockScaleY.stopAnimation();
submitPreviewOpacity.stopAnimation();
morphCardOpacity.stopAnimation();

submitDockY.setValue(0);
submitDockX.setValue(0);
submitDockScaleX.setValue(1);
submitDockScaleY.setValue(1);

submitPreviewOpacity.setValue(0);
morphCardOpacity.setValue(1);
    setDockFinished(false);

    const captureSession =
      submittingSessionRef.current;
    snapshotFrameRef.current = requestAnimationFrame(
      () => {
        snapshotFrameRef.current = null;

        if (lifecycle !== lifecycleRef.current) {
          return;
        }

        void (async () => {
          let image: SkImage | null = null;

          try {
            image =
              (await makeImageFromView(
                morphCardRef
              )) ?? null;
          } catch {
            image = null;
          }

          if (
            lifecycle !== lifecycleRef.current ||
            captureSession !==
              submittingSessionRef.current
          ) {
            image?.dispose();
            return;
          }

          if (image) {
            handoffImageRef.current?.dispose();
            handoffImageRef.current = image;
            setHandoffImage(image);
          }
        })();
      }
    );

    Animated.parallel([
      Animated.timing(
        submitProgress,
        {
          toValue: 1,
          duration:
            GOAL_HANDOFF.sourceCollapseDuration,
          easing: Easing.out(
            Easing.cubic
          ),
          useNativeDriver: true,
        }
      ),
    
      Animated.timing(
        sheetMorph,
        {
          toValue: 1,
          duration:
            GOAL_HANDOFF.sourceCollapseDuration,
          easing: Easing.bezier(
            0.2,
            0.8,
            0.2,
            1
          ),
          useNativeDriver: true,
        }
      ),

      Animated.timing(
        sourceShellHeight,
        {
          toValue: COMPACT_GOAL_CARD_HEIGHT,
          duration:
            GOAL_HANDOFF.sourceCollapseDuration,
          easing: Easing.bezier(
            0.2,
            0.8,
            0.2,
            1
          ),
          useNativeDriver: false,
        }
      ),
    ]).start(({ finished }) => {
      if (
        !finished ||
        lifecycle !== lifecycleRef.current
      ) {
        return;
      }
      morphCardRef.current?.measureInWindow(
        (
          x,
          y,
          width,
          height
        ) => {
          if (lifecycle !== lifecycleRef.current) {
            return;
          }

          setMorphRect({
            x,
            y,
            width,
            height,
          });

          const captureSession =
            submittingSessionRef.current;

          const preparedImage =
            handoffImageRef.current;

          if (preparedImage) {
            const preparedScaleX =
              preparedImage.width() / width;
            const preparedScaleY =
              preparedImage.height() / height;
            const expectedPixelScale =
              PixelRatio.get();
            const preparedScaleMismatch =
              Math.abs(
                preparedScaleX - preparedScaleY
              ) /
              Math.max(
                1,
                preparedScaleX,
                preparedScaleY
              );
            const preparedDensityIsPlausible =
              Math.abs(
                preparedScaleX - expectedPixelScale
              ) <= 0.5 &&
              Math.abs(
                preparedScaleY - expectedPixelScale
              ) <= 0.5;

            if (
              preparedScaleMismatch <= 0.02 &&
              preparedDensityIsPlausible
            ) {
              create();
              return;
            }

            preparedImage.dispose();
            handoffImageRef.current = null;
            setHandoffImage(null);
          }
      
          morphFrameRef.current = requestAnimationFrame(() => {
            morphFrameRef.current = null;

            if (lifecycle !== lifecycleRef.current) {
              return;
            }

            morphCardOpacity.stopAnimation();
            submitPreviewOpacity.stopAnimation();

            void (async () => {
              let image: SkImage | null = null;

              try {
                image =
                  (await makeImageFromView(
                    morphCardRef
                  )) ?? null;
              } catch {
                image = null;
              }

              if (
                lifecycle !== lifecycleRef.current ||
                captureSession !==
                  submittingSessionRef.current
              ) {
                image?.dispose();
                return;
              }

              if (image) {
                const pixelScaleX =
                  image.width() / width;
                const pixelScaleY =
                  image.height() / height;
                const expectedPixelScale =
                  PixelRatio.get();
                const scaleMismatch =
                  Math.abs(
                    pixelScaleX - pixelScaleY
                  ) /
                  Math.max(
                    1,
                    pixelScaleX,
                    pixelScaleY
                  );
                const densityIsPlausible =
                  Math.abs(
                    pixelScaleX -
                      expectedPixelScale
                  ) <= 0.5 &&
                  Math.abs(
                    pixelScaleY -
                      expectedPixelScale
                  ) <= 0.5;

                if (
                  scaleMismatch <= 0.02 &&
                  densityIsPlausible
                ) {
                  handoffImageRef.current?.dispose();
                  handoffImageRef.current = image;
                  setHandoffImage(image);
                } else {
                  image.dispose();
                }
              }

              create();
            })();
          });
        }
      );
      Animated.parallel([
        Animated.timing(
          backdropOpacity,
          {
            toValue: 0,
            duration: 190,
            easing: Easing.out(
              Easing.quad
            ),
            useNativeDriver: true,
          }
        ),
  
      ]).start(({ finished }) => {
        if (
          !finished ||
          lifecycle !== lifecycleRef.current
        ) {
          return;
        }
  
        });
        });
        };
        useEffect(() => {
          if (
            !submitting ||
            landingRect === null ||
            morphRect === null
          ) {
            return;
          }

          const previewX = morphRect.x;
          const previewY = morphRect.y;
          const previewWidth = morphRect.width;
          const previewHeight = morphRect.height;
          const handoffLifecycle = lifecycleRef.current;
          const handoffSession =
            submittingSessionRef.current;

                /*
                 * Work center-to-center because
                 * transform scaling happens from
                 * the card's center.
                 */
        
                const previewCenterX =
                  previewX +
                  previewWidth / 2;
        
                const previewCenterY =
                  previewY +
                  previewHeight / 2;
        
                const landingCenterX =
                  landingRect.x +
                  landingRect.width / 2;
        
                const landingCenterY =
                  landingRect.y +
                  landingRect.height / 2;
        
                const moveX =
                  landingCenterX -
                  previewCenterX;
        
                const moveY =
                  landingCenterY -
                  previewCenterY;

                const landingScrollDeltaY =
                  landingRect.scrollDeltaY ??
                  0;
        
                const scaleX =
                  landingRect.width > 0 &&
                  previewWidth > 0
                    ? landingRect.width /
                      previewWidth
                    : 1;
        
                const scaleY =
                  landingRect.height > 0 &&
                  previewHeight > 0
                    ? landingRect.height /
                      previewHeight
                    : 1;

                morphCardOpacity.stopAnimation();
                submitPreviewOpacity.stopAnimation();

                Animated.parallel([
                  handoffImageRef.current
                    ? Animated.timing(
                        morphCardOpacity,
                        {
                          toValue: 0,
                          duration:
                            GOAL_HANDOFF.skiaSourceReleaseDuration,
                          easing: Easing.out(
                            Easing.cubic
                          ),
                          useNativeDriver: true,
                        }
                      )
                    : Animated.sequence([
                        Animated.delay(
                          GOAL_HANDOFF.sourceReleaseDelay
                        ),
                        Animated.timing(
                          morphCardOpacity,
                          {
                            toValue: 0,
                            duration:
                              GOAL_HANDOFF.sourceReleaseDuration,
                            easing: Easing.inOut(
                              Easing.quad
                            ),
                            useNativeDriver: true,
                          }
                        ),
                      ]),

                  Animated.timing(
                    submitPreviewOpacity,
                    {
                      toValue: 1,
                      duration:
                        GOAL_HANDOFF.previewOwnershipDuration,
                      easing: Easing.out(
                        Easing.cubic
                      ),
                      useNativeDriver: true,
                    }
                  ),
                ]).start();

                Animated.sequence([
                  Animated.delay(
                    GOAL_HANDOFF.sourceReleaseDelay +
                      GOAL_HANDOFF.sourceReleaseDuration
                  ),
                  Animated.timing(
                    sheetY,
                    {
                      toValue: 650,
                      duration:
                        GOAL_HANDOFF.sourceExitDuration,
                      easing: Easing.in(
                        Easing.cubic
                      ),
                      useNativeDriver: true,
                    }
                  ),
                ]).start();
        
                submitDockX.stopAnimation();
                submitDockY.stopAnimation();
        
                submitDockScaleX.stopAnimation();
                submitDockScaleY.stopAnimation();
        
                submitDockX.setValue(0);
submitDockY.setValue(0);
submitDockScaleX.setValue(1);
submitDockScaleY.setValue(1);

const dockXListener =
  handoffProgress.addListener(
    ({ value }) => {
      const distance = Math.max(
        1,
        Math.hypot(moveX, moveY)
      );
      const pathEnvelope = Math.pow(
        Math.sin(Math.PI * value),
        2
      );
      const arcOffset =
        GOAL_HANDOFF.trajectoryArc *
        pathEnvelope;

      const horizontalPull =
        Math.abs(moveX) / distance;
      const verticalPull =
        Math.abs(moveY) / distance;
      const smoothstep = (amount: number) => {
        const clamped = Math.max(
          0,
          Math.min(1, amount)
        );

        return (
          clamped *
          clamped *
          (3 - 2 * clamped)
        );
      };
      const pull =
        value <= GOAL_HANDOFF.deformationPeak
          ? smoothstep(
              value /
                GOAL_HANDOFF.deformationPeak
            )
          : 1 -
            smoothstep(
              (value -
                GOAL_HANDOFF.deformationPeak) /
                (GOAL_HANDOFF.deformationRelease -
                  GOAL_HANDOFF.deformationPeak)
            );
      const distanceStrength =
        0.75 +
        0.25 *
          Math.min(1, distance / 420);
      const shapedPull =
        pull * distanceStrength;
      const contact =
        value < 0.82
          ? 0
          : Math.sin(
              ((value - 0.82) / 0.18) *
                Math.PI
            );

const genieScaleX =
  1 +
  GOAL_HANDOFF.pullStretch *
    horizontalPull *
    shapedPull -
  GOAL_HANDOFF.pullPinch *
    verticalPull *
    shapedPull +
  GOAL_HANDOFF.contactCompression *
    verticalPull *
    contact;

const genieScaleY =
  1 +
  GOAL_HANDOFF.pullStretch *
    verticalPull *
    shapedPull -
  GOAL_HANDOFF.pullPinch *
    horizontalPull *
    shapedPull -
  GOAL_HANDOFF.contactCompression *
    verticalPull *
    contact;

const directionalOffsetX =
  Math.sign(moveX) *
  previewWidth *
  GOAL_HANDOFF.pullStretch *
  horizontalPull *
  shapedPull *
  0.5 *
  GOAL_HANDOFF.directionalPull;

const directionalOffsetY =
  Math.sign(moveY) *
  previewHeight *
  GOAL_HANDOFF.pullStretch *
  verticalPull *
  shapedPull *
  0.5 *
  GOAL_HANDOFF.directionalPull;

submitDockX.setValue(
  moveX * value -
    (moveY / distance) *
      arcOffset +
    directionalOffsetX
);

submitDockY.setValue(
  moveY * value +
    landingScrollDeltaY *
      value *
      (1 - value) +
    (moveX / distance) *
      arcOffset +
    directionalOffsetY
);

submitDockScaleX.setValue(
  (
    1 +
    (scaleX - 1) * value
  ) * genieScaleX
);

submitDockScaleY.setValue(
  (
    1 +
    (scaleY - 1) * value
  ) * genieScaleY
);
    }
  );

handoffProgress.stopAnimation();
handoffProgress.setValue(0);

Animated.timing(
  handoffProgress,
  {
    toValue: 1,
    duration: GOAL_HANDOFF.travelDuration,
    easing: Easing.bezier(
      0.3,
      0.3,
      0.3,
      1
    ),
    useNativeDriver: false,
  }
).start(({ finished }) => {
  handoffProgress.removeListener(
    dockXListener
  );

  if (
    !finished ||
    handoffLifecycle !== lifecycleRef.current ||
    handoffSession !==
      submittingSessionRef.current
  ) {
    return;
  }

  setDockFinished(true);
});
        }, [landingRect, morphRect, submitting]);
  const modalMounted = transitionState !== 'closed';

  /*
   * Sheet has more available space
   * while keyboard is open.
   */

  const availableHeight = screenHeight - insets.top - 18;

  const skiaHandoffActive = Boolean(
    submitting &&
      morphRect &&
      landingRect &&
      handoffImage
  );
  const previewDue = formatDue(
    submittedGoal?.dueAt ?? dueAt,
    submittedGoal?.dueHasTime ?? dueHasTime
  );
  const resolvedSheetFrame = transitionSheetFrame ?? {
    x: 0,
    y: insets.top + 18,
    width: screenWidth,
    height: availableHeight,
  };
  const focusRiseTranslateY = focusRiseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [screenHeight - resolvedSheetFrame.y, 0],
    extrapolate: 'clamp',
  });
  const focusRiseBackdropOpacity = focusRiseProgress.interpolate({
    inputRange: [0, 0.1, 0.22, 0.34, 0.46, 0.58, 1],
    outputRange: [0, 0, 0.0219, 0.07, 0.1181, 0.14, 0.14],
    extrapolate: 'clamp',
  });
  const focusRiseHeaderOpacity = focusRiseProgress.interpolate({
    inputRange: [0, 0.72, 0.9, 1],
    outputRange: [0, 0, 1, 1],
    extrapolate: 'clamp',
  });
  const focusRiseHeaderY = focusRiseProgress.interpolate({
    inputRange: [0, 0.72, 0.9, 1],
    outputRange: [6, 6, 0, 0],
    extrapolate: 'clamp',
  });
  const focusRiseInputOpacity = focusRiseProgress.interpolate({
    inputRange: [0, 0.76, 0.94, 1],
    outputRange: [0, 0, 1, 1],
    extrapolate: 'clamp',
  });
  const focusRiseInputY = focusRiseProgress.interpolate({
    inputRange: [0, 0.76, 0.94, 1],
    outputRange: [6, 6, 0, 0],
    extrapolate: 'clamp',
  });
  const focusRiseControlsOpacity = focusRiseProgress.interpolate({
    inputRange: [0, 0.8, 0.98, 1],
    outputRange: [0, 0, 1, 1],
    extrapolate: 'clamp',
  });
  const focusRiseControlsY = focusRiseProgress.interpolate({
    inputRange: [0, 0.8, 0.98, 1],
    outputRange: [6, 6, 0, 0],
    extrapolate: 'clamp',
  });
  useEffect(() => {
    swipeDismissTravel.value = Math.max(1, screenHeight - resolvedSheetFrame.y);
  }, [resolvedSheetFrame.y, screenHeight, swipeDismissTravel]);

  useEffect(() => {
    swipeDismissKeyboardHeight.value = keyboardHeight;
    swipeDismissEnabled.value = transitionState === 'open' && keyboardHeight === 0;
  }, [keyboardHeight, swipeDismissEnabled, swipeDismissKeyboardHeight, transitionState]);

  const startSwipeClosing = useCallback((downwardVelocity: number) => {
    if (transitionStateRef.current !== 'open') {
      logLifecycle(`CLOSE_REJECTED:${transitionStateRef.current}`);
      return;
    }
    const lifecycle = lifecycleRef.current;
    const downwardDistance = swipeDismissDragY.value;
    logLifecycle('CLOSE_REQUEST_SWIPE', { downwardDistance, downwardVelocity });
    logLifecycle('CLOSE_ACCEPTED');
    closeCompletionLifecycleRef.current = null;
    setTransitionPhase('closing');
    logLifecycle('CLOSE_ANIMATION_START');
    swipeDismissDragY.value = withSpring(swipeDismissTravel.value, {
      velocity: Math.max(0, downwardVelocity),
      stiffness: 180,
      damping: 28,
      mass: 0.8,
      overshootClamping: true,
      energyThreshold: 0.001,
    }, (finished) => {
      if (finished) runOnJS(completeClosingFromFocusRise)(lifecycle);
    });
  }, [logLifecycle, setTransitionPhase, swipeDismissDragY, swipeDismissTravel]);

  const swipeDismissGesture = useMemo(() => Gesture.Pan()
    .manualActivation(true)
    .onTouchesDown((event) => {
      const touch = event.allTouches[0];
      if (!touch) return;
      swipeDismissReleaseHandled.value = false;
      swipeDismissTouchStartX.value = touch.absoluteX;
      swipeDismissTouchStartY.value = touch.absoluteY;
    })
    .onTouchesMove((event, stateManager) => {
      const touch = event.allTouches[0];
      if (!touch) return;
      if (
        !swipeDismissEnabled.value ||
        swipeDismissKeyboardHeight.value > 0 ||
        swipeDismissScrollOffset.value > 0.5
      ) {
        stateManager.fail();
        return;
      }
      const dx = touch.absoluteX - swipeDismissTouchStartX.value;
      const dy = touch.absoluteY - swipeDismissTouchStartY.value;
      if (dy > 4 && Math.abs(dy) > Math.abs(dx) * 1.15) {
        stateManager.activate();
      } else if (dy < -4 || Math.abs(dx) > Math.abs(dy) * 1.15) {
        stateManager.fail();
      }
    })
    .onStart(() => {
      cancelAnimation(swipeDismissDragY);
    })
    .onUpdate((event) => {
      swipeDismissDragY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      swipeDismissReleaseHandled.value = true;
      const downwardDistance = swipeDismissDragY.value;
      const downwardVelocity = Math.max(0, event.velocityY);
      const shouldDismiss =
        downwardDistance >= swipeDismissTravel.value * 0.28 ||
        downwardVelocity >= 1000;
      if (shouldDismiss) {
        runOnJS(startSwipeClosing)(downwardVelocity);
        return;
      }
      swipeDismissDragY.value = withSpring(0, {
        stiffness: 420,
        damping: 38,
        mass: 0.65,
        overshootClamping: true,
        energyThreshold: 0.001,
      });
    })
    .onFinalize(() => {
      if (!swipeDismissReleaseHandled.value && swipeDismissDragY.value > 0) {
        swipeDismissDragY.value = withSpring(0, {
          stiffness: 420,
          damping: 38,
          mass: 0.65,
          overshootClamping: true,
          energyThreshold: 0.001,
        });
      }
    }), [
      startSwipeClosing,
      swipeDismissDragY,
      swipeDismissEnabled,
      swipeDismissKeyboardHeight,
      swipeDismissReleaseHandled,
      swipeDismissScrollOffset,
      swipeDismissTouchStartX,
      swipeDismissTouchStartY,
      swipeDismissTravel,
    ]);

  const swipeDismissSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: swipeDismissDragY.value }],
  }));
  const swipeDismissBackdropStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.max(0, Math.min(1, swipeDismissProgress.value)),
  }));
  return (
    <Modal
      transparent
      visible={modalMounted}
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {
        if (duePickerOpen) {
          setDueDismissRequest((request) => request + 1);
          return;
        }
        if (togetherPickerOpen) {
          setTogetherDismissRequest((request) => request + 1);
          return;
        }
        dismiss('system');
      }}
      onShow={handleNativeModalShow}
      onDismiss={onNativeModalDismissed}
    >
      <View
        style={styles.newGoalModalRoot}
      >
        {/* BACKDROP */}

        <AnimatedReanimated.View
          style={[StyleSheet.absoluteFill, swipeDismissBackdropStyle]}
          pointerEvents={transitionState === 'open' ? 'auto' : 'none'}
        >
        <Animated.View
          pointerEvents={transitionState === 'open' ? 'auto' : 'none'}
          style={[
            styles.newGoalDim,
            {
              opacity: Animated.multiply(
                focusRiseBackdropOpacity,
                backdropOpacity
              ),
            },
          ]}
        >
          <Pressable
            disabled={transitionState !== 'open'}
            style={
              StyleSheet.absoluteFill
            }
            onPress={() => dismiss('backdrop')}
          />
        </Animated.View>
        </AnimatedReanimated.View>

        {/* SHEET */}

        {!skiaHandoffActive && (
        <GestureDetector gesture={swipeDismissGesture}>
        <AnimatedReanimated.View
          pointerEvents="box-none"
          style={[
            styles.newGoalAdaptiveWrap,
            transitionSheetFrame ? {
              position: 'absolute',
              left: resolvedSheetFrame.x,
              top: resolvedSheetFrame.y,
              width: resolvedSheetFrame.width,
              height: resolvedSheetFrame.height,
              paddingHorizontal: 0,
              zIndex: 4,
            } : undefined,
            swipeDismissSheetStyle,
          ]}
        >
        <Animated.View
  style={[
    transitionSheetFrame ? {
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      transform: [
        {
          translateY: Animated.add(
            focusRiseTranslateY,
            sheetY
          ),
        },
      ],
    } : styles.newGoalSurfaceMeasurement,
  ]}
>
<Animated.View
  style={{
    width: '100%',
    ...(transitionSheetFrame ? { height: '100%' as const } : null),
    opacity: morphCardOpacity,
    transform: [
      {
        scaleX: sheetMorph.interpolate({
          inputRange: [0, 0.45, 0.78, 1],
          outputRange: [1, 0.992, 0.965, 0.94],
        }),
      },
      {
        translateY: sheetMorph.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -18],
        }),
      },
    ],
  }}
>
<Animated.View
  ref={newGoalSurfaceMeasureRef}
  collapsable={false}
  onLayout={(event) => {
    if (submitting) {
      return;
    }

    const measuredHeight =
      event.nativeEvent.layout.height;

    if (transitionState === 'preparingOpen' && !openingSurfaceStartedRef.current) {
      openingSurfaceStartedRef.current = true;
      logLifecycle('SHEET_MEASURE_START');
      const measureCommittedFrames = (attempt: number) => {
        if (transitionStateRef.current !== 'preparingOpen') return;
        const viewport = screenSizeRef.current;
        measureFab((fabFrame) => {
          if (transitionStateRef.current !== 'preparingOpen') return;
          newGoalSurfaceMeasureRef.current?.measureInWindow((x, y, width, height) => {
            if (transitionStateRef.current !== 'preparingOpen') return;
            const viewportChanged = viewport.width !== screenSizeRef.current.width || viewport.height !== screenSizeRef.current.height;
            if (viewportChanged && attempt < 2) {
              requestTransitionFrame(() => measureCommittedFrames(attempt + 1));
              return;
            }
            const sheetValid = [x, y, width, height].every(Number.isFinite) && width > 0 && height > 0;
            const sheetFrame = sheetValid
              ? { x, y, width, height }
              : { x: 0, y: insets.top + 18, width: screenSizeRef.current.width, height: availableHeight };
            logLifecycle('SHEET_MEASURE_RESULT', { ...sheetFrame, valid: sheetValid && !viewportChanged });
            setTransitionFabFrame(fabFrame);
            setTransitionSheetFrame(sheetFrame);
            transitionFramesCommittedRef.current = true;
            if (!fabFrame || !sheetValid || viewportChanged) {
              resetToDeterministicClosedState(lifecycleRef.current);
              return;
            }
            setTransitionPhase('opening');
            const startOpeningAfterPresentation = () => {
              /* Begin the approved vertical Focus Rise after native presentation. */
              openFrameRef.current = requestTransitionFrame(() => {
                openFrameRef.current = null;
                if (transitionStateRef.current !== 'opening') return;
                const lifecycle = lifecycleRef.current;
                logLifecycle('OPEN_ANIMATION_START');
                contentReveal.setValue(1);
                focusRiseProgress.stopAnimation();
                Animated.timing(focusRiseProgress, {
                  toValue: 1,
                  duration: reducedMotion ? motion.duration.reduced : 500,
                  easing: Easing.bezier(0.22, 1, 0.36, 1),
                  useNativeDriver: true,
                }).start(({ finished }) => {
                  if (finished) completeOpeningFromFocusRise(lifecycle);
                });
              });
            };
            if (modalShownSessionRef.current === session) {
              startOpeningAfterPresentation();
            } else {
              modalShowActionRef.current = startOpeningAfterPresentation;
            }
          });
        });
      };
      measureCommittedFrames(0);
    }

    if (
      measuredHeight >
      COMPACT_GOAL_CARD_HEIGHT
    ) {
      sourceShellExpandedHeightRef.current =
        measuredHeight;
      sourceShellHeight.setValue(
        measuredHeight
      );
    }
  }}
  style={[
    styles.newGoalAdaptiveCard,
    {
      paddingBottom: Math.max(22, insets.bottom + 12),
    },
    {
      maxHeight: resolvedSheetFrame.height,
      height:
        submitting &&
        sourceShellExpandedHeightRef.current > 0
          ? sourceShellHeight
          : resolvedSheetFrame.height,
    },
  ]}
>
<Animated.View
  style={{
    opacity: Animated.multiply(
      Animated.multiply(contentReveal, focusRiseHeaderOpacity),
      sheetMorph.interpolate({
        inputRange: [0, 0.4, 0.72],
        outputRange: [1, 0.38, 0],
      })
    ),

    transform: [
      {
        translateY: Animated.add(
          sheetMorph.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }),
          focusRiseHeaderY,
        ),
      },
    ],
  }}
  pointerEvents={
    transitionState === 'open' && !submitting ? 'auto' : 'none'
  }
>
            {/* DRAG HANDLE */}

            <View
              style={
                styles.dragHandleArea
              }
              hitSlop={{
                top: 12,
                bottom: 12,
                left: 40,
                right: 40,
              }}
            >
              <View
                style={[styles.grabber, styles.newGoalGrabber]}
              />
            </View>

            {/* HEADER */}

            <View
              style={styles.newGoalSheetHead}
            >
              <Text style={styles.newGoalSheetTitle}>New Goal</Text>

              <Pressable
                disabled={transitionState !== 'open'}
                onPress={() => dismiss('x')}
                hitSlop={6}
                style={({
                  pressed,
                }) => [
                  styles.newGoalClose,
                  pressed &&
                    styles.pressed,
                ]}
              >
                <X
                  size={19}
                  color="#675751"
                />
              </Pressable>
            </View>
            </Animated.View>
            {/* FORM */}
            <Animated.View
  style={{
    opacity: Animated.multiply(contentReveal, sheetMorph.interpolate({
    inputRange: [0, 0.35, 0.68, 1],
    outputRange: [1, 0.88, 0, 0],
  })),

    transform: [
      {
        scale:
        sheetMorph.interpolate({
          inputRange: [0, 0.52, 1],
          outputRange: [1, 0.985, 0.97],
        }),
      },
      { translateY: sheetMorph.interpolate({ inputRange: [0, 0.52, 1], outputRange: [0, -5, -9] }) },
    ],
  }}
  pointerEvents={
    transitionState !== 'open' || submitting
      ? 'none'
      : 'auto'
  }
>
            <ScrollView
              style={
                styles.newGoalScroll
              }
              contentContainerStyle={
                styles.newGoalScrollContent
              }
              showsVerticalScrollIndicator={
                false
              }
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              nestedScrollEnabled
              bounces
              scrollEventThrottle={16}
              onScroll={(event) => {
                swipeDismissScrollOffset.value = Math.max(
                  0,
                  event.nativeEvent.contentOffset.y
                );
              }}
            >
              <Animated.View
                style={{
                  opacity: focusRiseInputOpacity,
                  transform: [{ translateY: focusRiseInputY }],
                }}
              >
              <Text
                style={styles.label}
              >
                WHAT DO YOU WANT TO MOVE FORWARD?
              </Text>

              <TextInput
                value={title}
                onChangeText={setTitle}

                placeholder="e.g. Run 5K without stopping"
                placeholderTextColor="#9A918C"

                style={styles.input}

                multiline
                blurOnSubmit
                textAlignVertical="top"

                returnKeyType="done"

                onSubmitEditing={() =>
                  Keyboard.dismiss()
                }
              />
              </Animated.View>

              <Animated.View
                style={{
                  opacity: focusRiseControlsOpacity,
                  transform: [{ translateY: focusRiseControlsY }],
                }}
              >
              <Text
                style={styles.label}
              >
                CATEGORY
              </Text>

              <View
                style={styles.chips}
              >
                {(
                  Object.keys(
                    COLORS
                  ) as Category[]
                ).filter((item) => item !== 'quick').map((item) => {
                  const active =
                    category === item;
                  const CategoryIcon =
                    item === 'work' ? Briefcase
                      : item === 'life' ? Heart
                        : item === 'health' ? Leaf
                          : item === 'money' ? WalletCards
                            : Sprout;
                  const categoryVisual = categoryColors[item];
                    
                  return (
                    <Pressable
                      key={item}

                      onPress={() => {
                        setCategory(item);
                      }}

                      style={[
                        styles.chip,
                        {
                          backgroundColor:
                            active
                              ? categoryVisual.accent
                              : categoryVisual.surfaceSoft,

                          borderColor:
                            active
                              ? categoryVisual.accent
                              : categoryVisual.surface,
                        },
                      ]}
                    >
                      <CategoryIcon
                        size={15}
                        strokeWidth={2.15}
                        color={active ? '#FFFFFF' : categoryVisual.accent}
                      />

                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight:
                            '800',

                          color:
                            active
                              ? '#FFFFFF'
                              : categoryVisual.onSurface,
                        }}
                      >
                        {
                          COLORS[
                            item
                          ].name
                        }
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.newGoalSettingsGroup}>
                <DueRow
                  dueAt={dueAt}
                  dueHasTime={dueHasTime}
                  compact
                  grouped
                  onPress={() => {
                    Keyboard.dismiss();
                    setDuePickerOpen(true);
                  }}
                />

                <TogetherRow
                  mode={collaborationMode}
                  connection={connections.find(
                    (connection) => connection.userId === collaborationPersonId
                  )}
                  grouped
                  onPress={() => {
                    Keyboard.dismiss();
                    setTogetherPickerOpen(true);
                  }}
                />
              </View>

              <Pressable
                disabled={
                  !title.trim() ||
                  submitting
                }
                onPress={submitGoal}
                style={({
                  pressed,
                }) => [
                  styles.create,

                  (!title.trim() || submitting) &&
  styles.newGoalDisabled,

                  pressed &&
                    styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.createText,
                    (!title.trim() || submitting) && styles.createTextDisabled,
                  ]}
                >
                  Create Goal
                </Text>
              </Pressable>
              <View style={styles.newGoalHelper}>
                <Sparkles size={13} color={colors.coralStrong} strokeWidth={2.4} />
                <Text style={styles.newGoalHelperText}>
                  Sunday creates your first small steps automatically.
                </Text>
              </View>
              </Animated.View>
              </ScrollView>
              </Animated.View>

<Animated.View
  pointerEvents="none"
  style={{
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,

    flexDirection: 'row',

    opacity:
  sheetMorph.interpolate({
    inputRange: [0, 0.28, 0.48, 0.72, 1],
    outputRange: [0, 0, 0.32, 0.94, 1],
  }),

    transform: [
      {
        translateY:
        sheetMorph.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [10, 4, 0],
        }),
      },
      {
        scale:
  sheetMorph.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.965, 0.985, 1],
  }),
      },
    ],

    paddingTop: 14,
  }}
>
<Animated.View
  ref={morphCardRef}
  collapsable={false}
  style={{
    position: 'absolute',

    left: 16,
    right: 16,

    top: '50%',

    minHeight: 101,

    flexDirection: 'row',

    borderRadius: 22,
    backgroundColor: colors.surface,

    overflow: 'hidden',

    transform: [
      {
        translateY: -50.5,
      },
    ],
  }}
>
  <View
    style={[
      styles.accent,
      {
        backgroundColor:
          COLORS[
            submittedGoal?.category ??
              category
          ].accent,
      },
    ]}
  />

  <View style={styles.cardBody}>
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent:
          'space-between',
      }}
    >
      <View
        style={[
          styles.category,
          {
            backgroundColor:
              COLORS[
                submittedGoal
                  ?.category ??
                  category
              ].surface,
          },
        ]}
      >
        <View
          style={[
            styles.categoryDot,
            {
              backgroundColor:
                COLORS[
                  submittedGoal
                    ?.category ??
                    category
                ].strong,
            },
          ]}
        />

        <Text
          style={[
            styles.categoryText,
            {
              color:
                COLORS[
                  submittedGoal
                    ?.category ??
                    category
                ].accent,
            },
          ]}
        >
          {
            COLORS[
              submittedGoal
                ?.category ??
                category
            ].name
          }
        </Text>
      </View>

      <View style={styles.cardMetaRight}>
      <View style={styles.time}>
        <Clock3
          size={11}
          color="#71717A"
        />

        <Text style={styles.timeText}>
          15m
        </Text>
      </View>
      {previewDue && (
        <>
          <Text style={styles.cardMetaSeparator}>·</Text>
          <View style={styles.cardDueMetadata}>
            <CalendarDays size={10} color="#71717A" />
            <Text style={styles.cardDueMetadataText} numberOfLines={1}>
              {previewDue.label}
            </Text>
          </View>
        </>
      )}
      </View>
    </View>

    <Text
      style={styles.cardTitle}
      numberOfLines={2}
    >
      {submittedGoal?.title ??
        title.trim()}
    </Text>

    <View style={styles.cardBottom}>
      <Text style={styles.stepSummary}>0/3</Text>
      <View style={styles.miniProgress}>
        <View
          style={[
            styles.miniFill,
            {
              width: '0%',
              backgroundColor:
                COLORS[
                  submittedGoal
                    ?.category ??
                    category
                ].accent,
            },
          ]}
        />
      </View>

      <View style={styles.smallCheck}>
        <Check
          size={14}
          color="#71717A"
          strokeWidth={3}
        />
      </View>
    </View>
  </View>

  <ChevronRight
    size={16}
    color="#A1A1AA"
    style={styles.cardChevron}
  />
  </Animated.View>
</Animated.View>

</Animated.View>
</Animated.View>
</Animated.View>
        </AnimatedReanimated.View>
        </GestureDetector>
        )}
              
{submitting &&
  morphRect &&
  landingRect &&
  handoffImage && (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          opacity: 1,
          zIndex: 21,
          backgroundColor: 'transparent',
        },
      ]}
    >
      <GoalHandoffCanvas
        image={handoffImage}
        sourceRect={morphRect}
        landingRect={landingRect}
        handoffProgress={handoffProgress}
        crossfadeStart={
          GOAL_HANDOFF.landingCrossfadeStart
        }
      />
    </Animated.View>
  )}

{submitting &&
  morphRect &&
  handoffImage === null && (
    <Animated.View
  pointerEvents="none"
  style={[
      styles.submitGoalPreview,
      {
        left: morphRect.x,
right: undefined,
top: morphRect.y,
bottom: undefined,

width: morphRect.width,
height: morphRect.height,
opacity: submitPreviewOpacity,

          transform: [
            {
              translateX: submitDockX,
            },
          
            {
              translateY: submitDockY,
            },
          
            
          
            {
              scaleX: submitDockScaleX,
            },
          
            {
              scaleY: submitDockScaleY,
            },
          ],
      },
    ]}
  >
  <Animated.View
    style={{
      flex: 1,
      flexDirection: 'row',
      opacity: handoffProgress.interpolate({
        inputRange: [
          0,
          GOAL_HANDOFF.landingCrossfadeStart,
          1,
        ],
        outputRange: [1, 1, 0],
        extrapolate: 'clamp',
      }),
    }}
  >
    <View
  style={[
    styles.accent,
    {
      backgroundColor:
        COLORS[category].accent,
    },
  ]}
/>

<View style={styles.cardBody}>
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}
  >
    <View
      style={[
        styles.category,
        {
          backgroundColor:
            COLORS[category].surface,
        },
      ]}
    >
      <View
        style={[
          styles.categoryDot,
          {
            backgroundColor:
              COLORS[category].accent,
          },
        ]}
      />

      <Text
        style={[
          styles.categoryText,
          {
            color:
              COLORS[category].strong,
          },
        ]}
      >
        {COLORS[category].name}
      </Text>
    </View>

    <View style={styles.cardMetaRight}>
    <View style={styles.time}>
      <Clock3
        size={11}
        color="#71717A"
      />

      <Text style={styles.timeText}>
        15m
      </Text>
    </View>
    {previewDue && (
      <>
        <Text style={styles.cardMetaSeparator}>·</Text>
        <View style={styles.cardDueMetadata}>
          <CalendarDays size={10} color="#71717A" />
          <Text style={styles.cardDueMetadataText} numberOfLines={1}>
            {previewDue.label}
          </Text>
        </View>
      </>
    )}
    </View>
  </View>

  <Text
    style={styles.cardTitle}
    numberOfLines={2}
  >
    {title.trim()}
  </Text>

  <View style={styles.cardBottom}>
    <Text style={styles.stepSummary}>0/3</Text>
    <View style={styles.miniProgress}>
      <View
        style={[
          styles.miniFill,
          {
            width: '0%',
            backgroundColor:
              COLORS[category].accent,
          },
        ]}
      />
    </View>

    <View style={styles.smallCheck}>
      <Check
        size={14}
        color="#71717A"
        strokeWidth={3}
      />
    </View>
  </View>
</View>

<ChevronRight
  size={16}
  color="#A1A1AA"
  style={styles.cardChevron}
/>

  </Animated.View>
  </Animated.View>
)}
    <NewGoalDueDatePickerSheet
      visible={duePickerOpen}
      dismissRequest={dueDismissRequest}
      dueAt={dueAt}
      dueHasTime={dueHasTime}
      onChange={setDue}
      onClose={() => setDuePickerOpen(false)}
    />
    <TogetherChooserSheet
      visible={togetherPickerOpen}
      dismissRequest={togetherDismissRequest}
      value={collaborationMode}
      personId={collaborationPersonId}
      connections={connections}
      onChange={(mode, userId) => {
        setCollaborationMode(mode);
        setCollaborationPersonId(userId);
      }}
      onInvite={inviteConnection}
      onClose={() => setTogetherPickerOpen(false)}
    />
    </View>
  </Modal>
);
}

function CompletionCelebration({
  reducedMotion,
  accent,
  origin,
  seed,
}: {
  reducedMotion: boolean;
  accent: string;
  origin: 'card' | 'hero';
  seed: number;
}) {
  const { width, height } = useWindowDimensions();
  const pieces = useMemo(
    () => {
      let state = (seed || 1) >>> 0;
      const random = () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 4294967296;
      };
      const count = reducedMotion ? 9 : 84;
      const launchY = height * (origin === 'hero' ? 0.54 : 0.7);
      const palette = [
        colors.coralPrimary,
        accent,
        colors.blush,
        '#EAA58F',
        colors.lavender,
        colors.cream,
        '#B889A7',
      ];

      return Array.from({ length: count }, (_, index) => {
        const side = index % 2 === 0 ? -1 : 1;
        const kind = reducedMotion
          ? index < 3 ? 'spark' : 'fleck'
          : index < 9 ? 'streamer'
          : index < 21 ? 'ribbon'
          : index < 35 ? 'fleck'
          : index < 41 ? 'spark'
          : 'paper';
        const depth = 0.72 + random() * 0.56;
        const launchX = side < 0
          ? width * (0.13 + random() * 0.09)
          : width * (0.78 + random() * 0.09);
        const inward = side < 0 ? 1 : -1;

        return {
          id: index,
          kind,
          startX: launchX + (random() - 0.5) * 22,
          startY: launchY + (random() - 0.5) * 30,
          velocityX: reducedMotion
            ? inward * (8 + random() * 18)
            : inward * width * (0.28 + random() * 0.92) +
              side * width * (random() - 0.48) * 0.34,
          velocityY: reducedMotion
            ? -(14 + random() * 16)
            : -height * (0.9 + random() * 0.72),
          gravity: reducedMotion
            ? 75
            : height * (1.1 + random() * 0.75),
          drift: reducedMotion ? 2 : (random() - 0.5) * width * 0.22,
          delay: reducedMotion ? random() * 24 : random() * 125,
          duration: reducedMotion
            ? 260 + random() * 90
            : (kind === 'streamer' ? 2050 : 1680) + random() * 390,
          rotation: (random() < 0.5 ? -1 : 1) *
            (reducedMotion ? 45 : 300 + random() * 880),
          size: (kind === 'streamer' ? 5.5 : 3.2 + random() * 5.2) * depth,
          color: palette[Math.floor(random() * palette.length)],
          opacity: 0.7 + Math.min(0.3, depth * 0.2),
        };
      });
    },
    [accent, height, origin, reducedMotion, seed, width]
  );

  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        {
          zIndex: 9999,
          elevation: 9999,
          overflow: 'visible',
        },
      ]}
    >
{pieces.map((piece) => (
  <ConfettiPiece
    key={piece.id}
    piece={piece}
  />
))}
</View>
);
}
function ConfettiPiece({
  piece,
}: {
  piece: {
    id: number;
    kind: string;
    startX: number;
    startY: number;
    velocityX: number;
    velocityY: number;
    gravity: number;
    drift: number;
    delay: number;
    duration: number;
    rotation: number;
    size: number;
    color: string;
    opacity: number;
  };
}) {
  const progress = useRef(
    new Animated.Value(0)
  ).current;
  useEffect(() => {
    progress.setValue(0);

    const animation = Animated.sequence([
      Animated.delay(piece.delay),

      Animated.timing(progress, {
        toValue: 1,
        duration: piece.duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [piece.delay, piece.duration, progress]);

  const timePoints = [
    0,
    0.1,
    0.2,
    0.3,
    0.42,
    0.56,
    0.72,
    0.86,
    1,
  ];

  const xPoints =
    timePoints.map((t) => {
      const base =
        piece.velocityX * t;

      const drift =
        piece.drift *
        t *
        t *
        0.7;

      return base + drift;
    });

  const yPoints =
    timePoints.map((t) => {
      const elapsedSeconds = t * piece.duration / 1000;
      return (
        piece.velocityY * elapsedSeconds +
        0.5 *
          piece.gravity *
          elapsedSeconds *
          elapsedSeconds
      );
    });

  const translateX =
    progress.interpolate({
      inputRange: timePoints,
      outputRange: xPoints,
    });

  const translateY =
    progress.interpolate({
      inputRange: timePoints,
      outputRange: yPoints,
    });

  const opacity =
    progress.interpolate({
      inputRange: [
        0,
        0.025,
        0.72,
        0.91,
        1,
      ],
      outputRange: [
        0,
        1,
        piece.opacity,
        piece.opacity,
        0,
      ],
    });

  const scale =
    progress.interpolate({
      inputRange: [
        0,
        0.025,
        0.07,
        0.35,
        1,
      ],
      outputRange: [
        0.15,
        1.22,
        1,
        0.98,
        0.86,
      ],
    });

  const rotate =
    progress.interpolate({
      inputRange: [0, 1],
      outputRange: [
        '0deg',
        `${piece.rotation}deg`,
      ],
    });

  return (
    <Animated.View
      style={{
        position: 'absolute',

        left: piece.startX,
        top: piece.startY,

        width:
          piece.kind === 'ribbon' || piece.kind === 'streamer'
            ? piece.size * 0.72
            : piece.size,

        height:
          piece.kind === 'streamer'
            ? piece.size * 6.4
            : piece.kind === 'ribbon'
              ? piece.size * 3.1
              : piece.kind === 'paper'
                ? piece.size * 1.65
                : piece.size,

        borderRadius:
          piece.kind === 'spark'
            ? piece.size / 2
            : piece.size * 0.36,

        backgroundColor: piece.kind === 'streamer' ? 'transparent' : piece.color,

        opacity,

        transform: [
          {
            translateX,
          },
          {
            translateY,
          },
          {
            rotate,
          },
          {
            scale,
          },
        ],
      }}
    >
      {piece.kind === 'streamer' && [0, 1, 2, 3].map((segment) => (
        <View
          key={segment}
          style={{
            position: 'absolute',
            top: segment * piece.size * 1.42,
            left: segment % 2 === 0 ? 0 : -piece.size * 0.62,
            width: piece.size * 0.72,
            height: piece.size * 1.75,
            borderRadius: piece.size,
            backgroundColor: piece.color,
            transform: [{ rotate: `${segment % 2 === 0 ? 24 : -24}deg` }],
          }}
        />
      ))}
    </Animated.View>
  );
}


const styles = StyleSheet.create({
  backendHarnessRoot: {
    flex: 1,
  },
  authenticatedAppRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  onboardingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    backgroundColor: 'transparent',
  },
  remoteHydration: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 38,
    backgroundColor: colors.background,
  },
  remoteHydrationMark: {
    width: 54,
    height: 54,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.lavenderSoft,
    marginBottom: 16,
  },
  remoteHydrationTitle: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center',
  },
  remoteHydrationText: {
    maxWidth: 300,
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 7,
  },
  remoteHydrationRetry: {
    minHeight: 42,
    paddingHorizontal: 18,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9E8BE8',
    marginTop: 18,
  },
  remoteHydrationRetryText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '900',
  },
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },

  backendLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },

  backendLoadingText: {
    color: '#7664A5',
    fontSize: 11,
    fontWeight: '800',
  },

  backendConfigTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },

  backendConfigText: {
    maxWidth: 300,
    marginTop: 8,
    color: colors.textSecondary,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
  },

  dragHandleArea: {
    height: 28,
    marginTop: -4,
    marginBottom: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navActiveContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 19,
  },

  navPersistentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 19,
  },

  navInactiveContent: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  navActiveLabel: {
    color: colors.coralStrong,
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: -0.1,
    includeFontPadding: false,
  },
  navItem: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },

  voiceOrbSlot: {
    position: 'absolute',
    left: '50%',
    top: -106,
    width: 110,
    height: 116,
    marginLeft: -55,
    zIndex: 8,
    overflow: 'visible',
  },
  voiceOrbMeasure: {
    width: 110,
    height: 116,
  },
  voiceNavSilhouette: {
    position: 'absolute',
    left: -8,
    top: -39,
    zIndex: 0,
  },
  navAnimatedContent: {
    width: 96,
    height: 38,
  
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  
    gap: 7,
  },
  
  navAnimatedLabel: {
    color: '#FF8F73',
  
    fontSize: 10.5,
    fontWeight: '900',
  
    letterSpacing: -0.1,
  },
  newGoalModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },

  newGoalSurfaceMeasurement: {
    opacity: 0,
  },
  newGoalFloatingCardState: {
    marginBottom: 10,
  
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  
    alignSelf: 'center',
  },
  newGoalDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#18181B',
  },
  
  newGoalAdaptiveWrap: {
    width: '100%',
    paddingHorizontal: 0,
  },
  
  newGoalAdaptiveCard: {
    width: '100%',

    backgroundColor: '#F8F3EA',
  
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
  
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  
    paddingHorizontal: 25,
    paddingTop: 8,
  
    paddingBottom:
      Platform.OS === 'ios'
        ? 28
        : 22,
  
    overflow: 'hidden',
  
    shadowColor: colors.warmShadow,
  
    shadowOffset: {
      width: 0,
      height: -4,
    },
  
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 5,
  },
  submitGoalPreview: {
    position: 'absolute',
  
    left: 16,
    right: 16,
  
    bottom: 110,

    flexDirection: 'row',
    minHeight: 101,
  
    borderRadius: 22,
  
    backgroundColor: 'transparent',
  
    overflow: 'hidden',
  
    shadowColor: '#18181B',
    shadowOpacity: 0.045,
    shadowRadius: 10,
  
    elevation: 1,
  
    zIndex: 20,
  
  },
  
  submitGoalAccent: {
    position: 'absolute',
  
    left: 0,
    top: 0,
    bottom: 0,
  
    width: 4,
  },
  
  submitGoalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  
    marginBottom: 12,
  },
  
  submitGoalTitle: {
    color: colors.textPrimary,
  
    fontSize: 17,
    lineHeight: 22,
  
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  
  submitGoalSuccess: {
    marginTop: 14,
  
    alignSelf: 'flex-start',
  
    height: 27,
    paddingHorizontal: 10,
  
    borderRadius: 14,
  
    flexDirection: 'row',
    alignItems: 'center',
  
    gap: 5,
  
    backgroundColor: colors.coralStrong,
  },
  
  submitGoalSuccessText: {
    color: '#fff',
  
    fontSize: 9,
    fontWeight: '900',
  },
  newGoalScroll: {
    flexShrink: 1,
    minHeight: 0,
  },
  
  newGoalScrollContent: {
    paddingBottom: 18,
  },
  scroll: {
    paddingBottom: 12,
  },
  container: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: 17,
    paddingTop: 13,
  },

  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  header: {
    marginBottom: 17,
  },

  dailyHeader: {
    fontSize: 27,
    lineHeight: 31,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.8,
  },

  dailySub: {
    fontSize: 10.5,
    color: '#A1A1AA',
    marginTop: 3,
    fontWeight: '600',
  },

  momentum: {
    backgroundColor:
      'rgba(255,253,251,0.9)',
    borderRadius: 24,
    padding: 15,
    shadowColor: colors.warmShadow,
    shadowOpacity: 0.025,
    shadowRadius: 18,
    elevation: 0,
    marginBottom: 20,
  },

  momentumTop: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    marginBottom: 11,
  },

  momentumTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.textPrimary,
  },

  momentumSub: {
    fontSize: 9.5,
    color: '#A1A1AA',
    marginTop: 2,
    fontWeight: '600',
  },

  zap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: colors.coralWhisper,
    alignItems: 'center',
    justifyContent: 'center',
  },

  momentumValue: {
    color: colors.coralStrong,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 6,
  },

  track: {
    width: '100%',
    backgroundColor: colors.borderSoft,
    height: 7,
    borderRadius: 99,
    overflow: 'hidden',
  },

  fill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: colors.coralPrimary,
  },

  progressFooter: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    marginTop: 7,
  },

  progressLabel: {
    fontSize: 9,
    color: '#A1A1AA',
    fontWeight: '700',
  },

  progressPercent: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: '800',
    marginBottom: 6,
  },

  focus: {
    marginBottom: 23,
  },

  focusHead: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
    marginBottom: 9,
  },

  focusHeadLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  flame: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },

  focusLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.05,
  },

  focusHint: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#A1A1AA',
  },

  hero: {
    overflow: 'hidden',
    borderRadius: 30,
    padding: 19,
  },

  heroElevation: {
    borderRadius: 30,
    shadowColor: colors.warmShadow,
    shadowOpacity: 0.075,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },

  heroMotionSurface: {
    borderRadius: 30,
  },

  heroDepth: {
    position: 'absolute',
    left: 4,
    right: 4,
    top: 4,
    bottom: -4,
    borderRadius: 30,
    opacity: 0.16,
  },

  heroPressed: {
    transform: [
      {
        scale: 0.995,
      },
      { translateY: 1 },
    ],
  },

  heroGlow: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    opacity: 0.12,
    right: -60,
    top: -75,
    backgroundColor: colors.surfaceWarm,
  },

  heroTop: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceWarm,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
    maxWidth: '52%',
  },

  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.coralPrimary,
  },

  badgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.65,
    color: colors.textPrimary,
    flexShrink: 1,
  },

  micro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceWarm,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
  },

  microText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary,
  },

  heroDueMetadata: {
    maxWidth: '46%',
    minHeight: 26,
    paddingHorizontal: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
  },

  heroDueMetadataText: {
    color: colors.textSecondary,
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.45,
    flexShrink: 1,
  },

  heroTitle: {
    color: colors.textPrimary,
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '800',
    letterSpacing: -0.45,
    marginBottom: 14,
  },

  focusRelationship: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
  },

  focusRelationshipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -6,
    marginBottom: 14,
  },

  focusNextStep: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 8,
    marginBottom: 2,
  },

  focusNextLabel: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 5,
  },

  focusNextAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 34,
  },

  focusNextCircle: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  focusNextText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },

  focusOpenHint: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },

  steps: {
    gap: 9,
    marginBottom: 15,
  },

  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  circle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: colors.coralSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroCircleDone: {
    backgroundColor: colors.coralPrimary,
    borderColor: colors.coralPrimary,
  },

  stepText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 10.5,
    fontWeight: '600',
  },

  heroStrike: {
    textDecorationLine:
      'line-through',
    color: colors.textTertiary,
  },

  heroFoot: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  guardCopy: {
    flexShrink: 1,
    paddingRight: 10,
  },

  guard: {
    color: colors.textPrimary,
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  guardSub: {
    color: colors.textSecondary,
    fontSize: 8.5,
    marginTop: 3,
    fontWeight: '600',
  },

  complete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceWarm,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 122,
    maxWidth: 142,
    flexShrink: 0,
  },

  ready: {
    backgroundColor: colors.coralSoft,
    borderColor: colors.coralSoft,
  },

  completeText: {
    color: colors.textPrimary,
    fontSize: 9.5,
    fontWeight: '900',
    flexShrink: 1,
  },

  section: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
    paddingHorizontal: 2,
  },

  firstGoalEmpty: {
    marginTop: 18,
    marginBottom: 22,
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },

  firstGoalEmptyMark: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    backgroundColor: '#F4F0FC',
  },

  sundayIllustration: {
    width: 78,
    height: 64,
    marginBottom: 18,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },

  sundayIllustrationSun: {
    position: 'absolute',
    top: 4,
    right: 13,
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: '#FFC69B',
  },

  sundayIllustrationHill: {
    width: 76,
    height: 42,
    borderTopLeftRadius: 46,
    borderTopRightRadius: 46,
    backgroundColor: '#F0EAF8',
    transform: [{ translateY: 10 }],
  },

  sundayIllustrationSparkle: {
    position: 'absolute',
    left: 7,
    top: 13,
  },

  firstGoalEmptyTitle: {
    color: '#27272A',
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '900',
    letterSpacing: -0.25,
    textAlign: 'center',
  },

  firstGoalEmptyText: {
    maxWidth: 260,
    marginTop: 7,
    color: '#7A7880',
    fontSize: 11.5,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
  },

  firstGoalEmptyButton: {
    minHeight: 44,
    marginTop: 16,
    paddingHorizontal: 18,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#FF9076',
  },

  firstGoalEmptyButtonPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },

  firstGoalEmptyButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },

  clearedFlow: {
    marginTop: 16,
    marginBottom: 22,
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: 'center',
  },

  clearedIllustration: {
    width: 64,
    height: 64,
    borderRadius: 25,
    marginBottom: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9076',
    overflow: 'visible',
  },

  clearedIllustrationRing: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#F4EAF2',
  },

  clearedIllustrationSparkle: {
    position: 'absolute',
    right: -10,
    top: -7,
  },

  clearedFlowTitle: {
    color: '#27272A',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
    letterSpacing: -0.4,
    textAlign: 'center',
  },

  clearedFlowText: {
    marginTop: 8,
    color: '#7A7880',
    fontSize: 11.5,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
  },

  otherGoalsSection: {
    marginTop: 1,
    marginBottom: 8,
  },

  otherGoalsHeader: {
    minHeight: 36,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  otherGoalsTitle: {
    color: '#5E5964',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.9,
  },

  otherGoalsViewAll: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },

  otherGoalsViewAllText: {
    color: '#81758D',
    fontSize: 10,
    fontWeight: '800',
  },

  otherGoalPreviews: {
    borderTopWidth: 1,
    borderTopColor: '#ECE8EE',
  },

  compactGoalPreview: {
    minHeight: 62,
    paddingVertical: 10,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#ECE8EE',
  },

  compactGoalPreviewPressed: {
    opacity: 0.72,
  },

  compactGoalHandoffHidden: {
    opacity: 0,
  },

  compactGoalIndicator: {
    width: 7,
    height: 31,
    borderRadius: 5,
  },

  compactGoalCopy: {
    flex: 1,
    minWidth: 0,
  },

  compactGoalTitle: {
    color: '#302D33',
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '800',
  },

  compactGoalProgress: {
    marginTop: 3,
    color: '#908A94',
    fontSize: 9.5,
    lineHeight: 13,
    fontWeight: '600',
  },

  moreGoalsLink: {
    alignSelf: 'flex-start',
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },

  moreGoalsLinkText: {
    color: '#81758D',
    fontSize: 10,
    fontWeight: '800',
  },

  sundayMoment: {
    marginTop: 15,
    minHeight: 64,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 19,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F7F2FA',
  },

  sundayMomentIcon: {
    width: 31,
    height: 31,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEE7F6',
  },

  sundayMomentCopy: {
    flex: 1,
    minWidth: 0,
  },

  sundayMomentKicker: {
    color: '#75658D',
    fontSize: 9,
    fontWeight: '900',
  },

  sundayMomentText: {
    marginTop: 3,
    color: '#5D5862',
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: '600',
  },

  sectionTitle: {
    color: '#18181B',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },

  sub: {
    color: '#A1A1AA',
    fontSize: 9.5,
    fontWeight: '600',
    marginTop: 2,
  },

  goalPill: {
    backgroundColor: '#F4F4F5',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },

  goalPillText: {
    color: '#71717A',
    fontSize: 9,
    fontWeight: '800',
  },

  lifecycleLinks: {
    marginTop: 8,
    gap: 2,
  },

  lifecycleLink: {
    minHeight: 42,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  lifecycleLinkText: {
    color: '#71717A',
    fontSize: 10.5,
    fontWeight: '700',
  },

  categoryGroup: {
    width: '100%',
  },

  categoryStackHeader: {
    minHeight: 40,
    paddingHorizontal: 2,
    marginBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },

  categorySingleHeader: {
    minHeight: 32,
    paddingHorizontal: 2,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },

  categoryStackLabel: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  categoryStackDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  categoryStackName: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.9,
    flexShrink: 1,
  },

  categoryStackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  categoryStackCount: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 2,
  },

  categoryStackUrgency: {
    color: '#A45A62',
    fontSize: 9,
    fontWeight: '800',
    flexShrink: 1,
  },

  categoryStackBody: {
    position: 'relative',
  },

  categoryStackBodyCollapsed: {
    paddingBottom: 10,
  },

  categoryStackLayer: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 101,
    borderRadius: 20,
    shadowColor: colors.warmShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.035,
    shadowRadius: 8,
    elevation: 1,
  },

  categoryStackLayerBack: {
    left: 15,
    right: 15,
    top: 15,
    opacity: 0.78,
  },

  categoryStackLayerMiddle: {
    left: 8,
    right: 8,
    top: 8,
    opacity: 0.96,
  },

  goalCardSlot: {
    minHeight: 101,
    marginBottom: 9,
    zIndex: 2,
  },

  goalCardSpacer: {
    width: '100%',
    backgroundColor: 'transparent',
  },

  cardSwipeContainer: {
    minHeight: 101,
    borderRadius: 22,
    overflow: 'visible',
    backgroundColor: 'transparent',
  },

  cardSwipeContainerStack: {
    overflow: 'visible',
  },

  cardSwipeShakeSurface: {
    minHeight: 101,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#F8D7DB',
    zIndex: 2,
  },

  categoryStackLayersMovingSurface: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'visible',
    zIndex: 1,
  },

  cardSwipeMovingSurface: {
    position: 'relative',
  },

  cardMetaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
    flexShrink: 1,
    maxWidth: '64%',
  },

  cardMetaSeparator: {
    color: '#C4C4C8',
    fontSize: 10,
    fontWeight: '800',
  },

  cardRelationshipMark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F0FA',
  },

  cardRelationshipMarkSupported: {
    backgroundColor: '#FFF1EB',
  },

  cardDueMetadata: {
    minWidth: 0,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  cardDueMetadataText: {
    color: '#71717A',
    fontSize: 8.8,
    fontWeight: '700',
    flexShrink: 1,
  },

  cardDue: {
    maxWidth: 138,
    minHeight: 22,
    paddingHorizontal: 7,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F4F4F5',
  },

  cardDueToday: {
    backgroundColor: '#FFF5E6',
  },

  cardDueSoon: {
    backgroundColor: '#F3F1FF',
  },

  cardDueOverdue: {
    backgroundColor: '#FFF0F2',
  },

  cardDueText: {
    color: '#71717A',
    fontSize: 8.5,
    fontWeight: '800',
    flexShrink: 1,
  },

  cardDueTextOverdue: {
    color: '#B42335',
  },

  heroDueRow: {
    marginTop: -4,
    marginBottom: 14,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    minHeight: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceWarm,
  },

  heroDueText: {
    color: colors.textSecondary,
    fontSize: 9.5,
    fontWeight: '800',
  },

  dueRow: {
    minHeight: 58,
    marginTop: 14,
    marginBottom: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceWarm,
    flexDirection: 'row',
    alignItems: 'center',
  },

  dueRowCompact: {
    minHeight: 48,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: '#FCFCFC',
  },

  togetherRowCompact: {
    marginTop: 0,
  },

  newGoalSettingsGroup: {
    marginTop: 18,
    marginBottom: 27,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EAE1D8',
    backgroundColor: '#FFFDFC',
    overflow: 'hidden',
  },

  newGoalSettingRow: {
    minHeight: 56,
    marginTop: 0,
    marginBottom: 0,
    paddingHorizontal: 15,
    borderWidth: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8DED5',
    borderRadius: 0,
    backgroundColor: 'transparent',
  },

  newGoalSettingRowLast: {
    borderBottomWidth: 0,
  },

  newGoalSettingIcon: {
    backgroundColor: '#F6EFEA',
  },

  newGoalSettingCopy: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  newGoalSettingLabel: {
    color: '#3C3532',
    fontSize: 13,
    fontWeight: '700',
  },

  newGoalSettingValue: {
    flexShrink: 1,
    color: '#8B716A',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 0,
    textAlign: 'right',
  },

  dueRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F2',
  },

  dueRowCopy: {
    flex: 1,
    marginLeft: 10,
  },

  dueRowLabel: {
    color: '#3F3F46',
    fontSize: 10,
    fontWeight: '900',
  },

  dueRowValue: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },

  duePickerRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  newGoalChildSheetRoot: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 50,
  },

  duePickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(24,24,27,0.38)',
  },

  duePickerMotionShell: {
    width: '100%',
  },

  legacyDuePickerSheet: {
    paddingHorizontal: 19,
    paddingTop: 9,
    paddingBottom: 22,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: colors.surface,
    shadowColor: colors.warmShadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 12,
  },

  legacyDuePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  legacyDuePickerTitle: {
    color: '#27272A',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 3,
  },

  duePickerSheet: {
    width: '100%',
    maxHeight: '96%',
    paddingHorizontal: 22,
    paddingTop: 6,
    paddingBottom: 22,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    backgroundColor: '#FFFDFB',
    shadowColor: colors.warmShadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 6,
  },

  duePickerContent: {
    paddingBottom: 0,
  },

  duePickerScroll: {
    flexShrink: 1,
  },

  duePickerHeader: {
    minHeight: 43,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  duePickerKicker: {
    color: '#A1A1AA',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },

  duePickerTitle: {
    color: '#292522',
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -0.65,
    textAlign: 'center',
  },

  duePickerDone: {
    minWidth: 58,
    minHeight: 40,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27272A',
  },

  duePickerDoneText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },

  togetherChooserBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(24,24,27,0.38)',
  },

  togetherChooserSheet: {
    paddingHorizontal: 25,
    paddingTop: 8,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    backgroundColor: '#FFFDFB',
    shadowColor: colors.warmShadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 6,
  },

  togetherChooserHeader: {
    minHeight: 47,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  togetherChooserTitle: {
    color: '#292522',
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -0.65,
    textAlign: 'center',
  },

  togetherChoices: {
    gap: 10,
  },

  secondarySheetGrabber: {
    width: 38,
    backgroundColor: '#E4D7D1',
    marginBottom: 8,
  },

  secondarySheetClose: {
    position: 'absolute',
    right: 0,
    top: 4,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondarySheetCta: {
    minHeight: 59,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.coralStrong,
    shadowColor: colors.coralPrimary,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },

  secondarySheetCtaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.15,
  },

  dueSetCta: {
    minHeight: 54,
    marginTop: 14,
  },

  togetherContinue: {
    marginTop: 32,
  },

  togetherChooserBack: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  togetherChooserBackText: {
    color: '#7F719B',
    fontSize: 10,
    fontWeight: '800',
  },

  togetherNoConnections: {
    padding: 14,
    borderRadius: 17,
    backgroundColor: '#F8F6FA',
  },

  togetherNoConnectionsText: {
    color: '#7C7585',
    fontSize: 9.5,
    lineHeight: 14,
    fontWeight: '600',
  },

  togetherInviteLink: {
    alignSelf: 'flex-start',
    minHeight: 34,
    justifyContent: 'center',
    marginTop: 4,
  },

  togetherInviteLinkText: {
    color: '#826EB2',
    fontSize: 10,
    fontWeight: '900',
  },

  togetherChoice: {
    minHeight: 76,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ECEAEC',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
  },

  togetherModeChoice: {
    minHeight: 98,
    paddingHorizontal: 17,
    paddingVertical: 14,
    borderRadius: 22,
    borderColor: '#EFE4DF',
    backgroundColor: '#FFFDFC',
  },

  togetherChoicePrivate: {
    borderColor: '#F1CEC5',
    backgroundColor: '#FFF9F7',
  },

  togetherChoiceShared: {
    borderColor: '#E9DDAF',
    backgroundColor: '#FFFCF1',
  },

  togetherChoiceSupported: {
    borderColor: '#A9DCD7',
    backgroundColor: '#F3FCFA',
  },

  togetherChoiceSelected: {
    borderColor: '#CFC3EC',
    backgroundColor: '#F8F5FF',
  },

  togetherChoiceCopy: {
    flex: 1,
    minWidth: 0,
  },

  togetherChoiceModeIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F5F8',
    marginRight: 10,
  },

  togetherIconPrivate: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 16,
    backgroundColor: '#FFF0EC',
  },

  togetherIconShared: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 16,
    backgroundColor: '#FFF4CB',
  },

  togetherIconSupported: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 16,
    backgroundColor: '#D8F4F0',
  },

  togetherChoiceEyebrow: {
    color: '#9A8ABF',
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  togetherChoiceTitle: {
    color: '#27272A',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 3,
  },

  togetherChoiceDescription: {
    color: '#71717A',
    fontSize: 9.5,
    fontWeight: '600',
    marginTop: 3,
  },

  togetherModeTitle: {
    color: '#272321',
    fontSize: 14,
    fontWeight: '900',
  },

  togetherModeDescription: {
    color: '#5F514C',
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '600',
    marginTop: 5,
  },

  togetherChoiceCheck: {
    width: 23,
    height: 23,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D4D4D8',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  togetherChoiceCheckSelected: {
    borderColor: '#9E8BE8',
    backgroundColor: '#9E8BE8',
  },

  togetherModeRadio: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#DFC9C2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  togetherModeRadioSelected: {
    borderColor: '#E76550',
    backgroundColor: '#FF7D6C',
  },

  togetherModeRadioShared: {
    borderColor: '#B18B00',
    backgroundColor: '#D9AD16',
  },

  togetherModeRadioSupported: {
    borderColor: '#148C83',
    backgroundColor: '#35B7AD',
  },

  togetherChoiceRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },

  dueQuickChoices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
    marginBottom: 14,
  },

  legacyDueQuickChoices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  legacyDueQuickChipPressable: {
    borderRadius: 14,
  },

  dueQuickChipPressable: {
    width: '48.2%',
    borderRadius: 12,
  },

  legacyDueQuickChip: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F4F5',
    borderWidth: 1,
    borderColor: 'transparent',
  },

  legacyDueQuickChipText: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '800',
  },

  dueQuickChip: {
    width: '100%',
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 11,
    backgroundColor: '#FFFCFA',
    borderWidth: 1,
    borderColor: 'transparent',
  },

  dueQuickChipCustom: {
    flexDirection: 'row',
    gap: 6,
  },

  dueQuickChipPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.86,
  },

  dueQuickChipSelected: {
    backgroundColor: '#FFF1ED',
    borderColor: '#FFB6A5',
  },

  dueQuickChipText: {
    flexShrink: 1,
    color: '#5C4943',
    fontSize: 13,
    fontWeight: '800',
  },

  dueCalendarSurface: {
    paddingHorizontal: 2,
    paddingTop: 4,
    paddingBottom: 0,
  },

  dueCalendarHeader: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },

  dueCalendarMonth: {
    flex: 1,
    minWidth: 0,
    color: '#292522',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },

  dueCalendarNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  dueCalendarArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dueCalendarWeekdays: {
    flexDirection: 'row',
  },

  dueCalendarWeekday: {
    width: '14.285714%',
    color: '#8A726A',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 4,
  },

  dueCalendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  dueCalendarGridViewport: {
    position: 'relative',
    height: 240,
    overflow: 'hidden',
  },

  dueCalendarGridLayer: {
    ...StyleSheet.absoluteFillObject,
  },

  dueCalendarDay: {
    width: '14.285714%',
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dueCalendarDayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dueCalendarDaySelected: {
    backgroundColor: colors.coralStrong,
  },

  dueCalendarDayText: {
    color: '#312B28',
    fontSize: 13,
    fontWeight: '600',
  },

  dueCalendarDayOutside: {
    color: '#B9AAA4',
  },

  dueCalendarDayDisabled: {
    color: '#DDD2CD',
  },

  dueCalendarDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  dueQuickChipTextSelected: {
    color: '#C65D47',
  },

  dueNativePicker: {
    marginTop: 10,
    minHeight: Platform.OS === 'ios' ? 310 : 48,
    justifyContent: 'center',
  },

  dueTimeRow: {
    minHeight: 56,
    paddingHorizontal: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7F7F8',
  },

  dueTimeLabel: {
    color: '#3F3F46',
    fontSize: 10,
    fontWeight: '900',
  },

  dueTimeValue: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },

  dueTimePicker: {
    alignItems: 'center',
    paddingTop: 4,
  },

  dueCalendarBack: {
    alignSelf: 'center',
    minHeight: 38,
    justifyContent: 'center',
  },

  dueSelectionSummary: {
    minHeight: 58,
    marginTop: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F7F7F8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  newGoalDueSelectionSummary: {
    minHeight: 50,
    marginTop: 8,
    borderRadius: 14,
  },

  dueSelectionCopy: {
    flex: 1,
    minWidth: 0,
  },

  dueAddTime: {
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
  },

  newGoalDueAddTime: {
    minHeight: 36,
    paddingHorizontal: 9,
  },

  dueAddTimeText: {
    color: '#52525B',
    fontSize: 9.5,
    fontWeight: '800',
  },

  dueRemoveTime: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '800',
    paddingVertical: 10,
  },

  dueRemoveDate: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },

  dueRemoveDateText: {
    color: '#B42335',
    fontSize: 10.5,
    fontWeight: '800',
  },

  libraryDueText: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },

  categoryStackTopCard: {
    zIndex: 2,
  },

  swipeDeleteAction: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'flex-end',
    paddingRight: 21,
    justifyContent: 'center',
    backgroundColor: '#F8D7DB',
  },

  swipeDeleteContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  swipeDeletePressed: {
    backgroundColor: '#F2C5CB',
  },

  swipeDeleteText: {
    color: '#8F1D2C',
    fontSize: 10,
    fontWeight: '900',
  },

  card: {
    minHeight: 101,
    borderRadius: 22,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    shadowColor: colors.warmShadow,
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 0,
  },

  cardPressTarget: {
    flex: 1,
    flexDirection: 'row',
  },

  cardPressed: {
    transform: [
      {
        scale: 0.988,
      },
    ],
    opacity: 0.94,
  },

  accent: {
    width: 4,
  },

  cardBody: {
    flex: 1,
    paddingTop: 13,
    paddingBottom: 16,
    paddingLeft: 14,
    paddingRight: 8,
  },

  cardChevron: {
    alignSelf: 'center',
    marginRight: 7,
  },

  category: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 10,
  },

  categoryDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },

  categoryText: {
    fontSize: 8.5,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  time: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  timeText: {
    color: '#71717A',
    fontSize: 9.5,
    fontWeight: '700',
  },

  cardTitle: {
    color: '#27272A',
    fontSize: 13.5,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 10,
    letterSpacing: -0.15,
  },

  cardTitleSocial: {
    marginBottom: 8,
  },

  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    minHeight: 28,
  },

  cardProgressContext: {
    flex: 1,
    minWidth: 0,
  },

  cardProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  cardRelationshipText: {
    flexShrink: 1,
    color: '#8170B1',
    fontSize: 8.5,
    lineHeight: 11,
    fontWeight: '700',
  },

  cardRelationshipTextSupported: {
    color: '#9A684F',
  },

  cardRelationshipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: -4,
    marginBottom: 7,
  },

  miniProgress: {
    flex: 1,
    height: 4,
    backgroundColor:
      'rgba(0,0,0,0.06)',
    borderRadius: 99,
    overflow: 'hidden',
  },

  miniFill: {
    height: '100%',
    borderRadius: 99,
  },

  stepSummary: {
    color: '#A1A1AA',
    fontSize: 8.5,
    fontWeight: '800',
    minWidth: 24,
  },

  cardDueInline: {
    maxWidth: 116,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  cardDueInlineText: {
    color: '#8A8A93',
    fontSize: 8.5,
    fontWeight: '700',
    flexShrink: 1,
  },

  cardDueInlineToday: {
    color: '#9A6135',
  },

  smallCheck: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    borderWidth: 1.5,
    borderColor: '#D4D4D8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      'rgba(255,255,255,0.7)',
  },

  smallCheckReady: {
    borderColor: '#A8A8B0',
    backgroundColor: '#F4F4F5',
  },

  smallDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },

  fab: {
    position: 'absolute',
    right: 19,
    bottom: 94,
    width: 57,
    height: 57,
    borderRadius: 29,
    backgroundColor: colors.coralStrong,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.coralPrimary,
    shadowOpacity: 0.32,
    shadowRadius: 13,
    elevation: 8,
    borderWidth: 3,
    borderColor: colors.background,
  },

  newGoalFabHandoffNeutral: {
    shadowOpacity: 0,
    elevation: 0,
  },

  newGoalFabPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.96,
  },
  newGoalFabMorphHidden: {
    opacity: 0,
  },

  navWrap: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 20,
  
    height: 70,
  
    backgroundColor: colors.surface,
  
    borderRadius: 29,
  
    shadowColor: colors.warmShadow,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.13,
    shadowRadius: 18,
  
    elevation: 12,
  
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  
  nav: {
    flex: 1,
  
    flexDirection: 'row',
    alignItems: 'center',
  
    position: 'relative',
  },
  
  navIndicator: {
    position: 'absolute',
    left: 0,
    top: 9,
  
    borderRadius: 19,
  
    backgroundColor: colors.coralWhisper,
  
    borderWidth: 1,
    borderColor: 'rgba(255,143,115,0.16)',
  
    shadowColor: colors.coralPrimary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 5,
  
    elevation: 2,
    zIndex: 1,
  },

  navItemContent: {
    height: 38,
  
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  
    gap: 5,
  
    paddingHorizontal: 7,
  
    borderRadius: 19,
  },
  
  navItemContentActive: {
    width: 90,
  },
  

  
  navPressed: {
    opacity: 0.74,
  },

  navIcon: {
    width: 34,
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },

  navText: {
    color: '#8B8B92',
    fontSize: 8.5,
    fontWeight: '700',
    marginTop: 3,
  },

  navActive: {
    color: colors.coralPrimary,
    fontWeight: '900',
  },

  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  modalDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor:
      'rgba(24,24,27,0.38)',
  },

  backdrop: {
    flex: 1,
    backgroundColor:
      'rgba(24,24,27,0.42)',
    justifyContent: 'flex-end',
  },

  sheet: {
    backgroundColor: '#FFFDFC',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 19,
    paddingTop: 9,
    paddingBottom:
      Platform.OS === 'ios'
        ? 32
        : 22,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 25,
    elevation: 15,
  },

  detail: {
    backgroundColor: '#FFFDFC',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginHorizontal: 0,
    marginBottom: 0,
    paddingHorizontal: 19,
    paddingTop: 7,
    paddingBottom:
      Platform.OS === 'ios'
        ? 30
        : 20,
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 10 },
    elevation: 15,
  },

  detailKeyboardAvoider: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  librarySheet: {
    maxHeight: '78%',
    backgroundColor: '#FFFDFC',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 19,
    paddingTop: 9,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    shadowColor: '#18181B',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 15,
  },

  libraryBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(24,24,27,0.38)',
  },

  libraryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  libraryKicker: {
    color: '#A1A1AA',
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 1.1,
    marginBottom: 4,
  },

  libraryTitle: {
    color: colors.textPrimary,
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: -0.5,
  },

  libraryList: {
    paddingBottom: 8,
  },

  libraryItem: {
    minHeight: 104,
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    backgroundColor: '#FFFFFF',
  },

  libraryRowShell: {
    marginBottom: 9,
  },

  libraryAccent: {
    width: 4,
  },

  libraryItemBody: {
    flex: 1,
    padding: 13,
  },

  libraryCategory: {
    color: '#A1A1AA',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  libraryItemTitle: {
    color: '#27272A',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    marginTop: 5,
  },

  libraryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },

  libraryRestore: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 11,
    backgroundColor: '#F4F4F5',
  },

  libraryRestoreText: {
    color: '#52525B',
    fontSize: 9.5,
    fontWeight: '800',
  },

  libraryPermanent: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#FEF2F2',
  },

  grabber: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 3,
    backgroundColor: '#D4D4D8',
    marginBottom: 17,
  },

  newGoalGrabber: {
    backgroundColor: '#E5D7D0',
    marginBottom: 10,
  },

  detailGrabber: {
    marginBottom: 0,
  },

  sheetHead: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  newGoalSheetHead: {
    minHeight: 42,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  newGoalSheetTitle: {
    color: '#2C2826',
    fontSize: 29,
    lineHeight: 36,
    fontWeight: '900',
    letterSpacing: -0.9,
    textAlign: 'center',
  },

  newGoalClose: {
    position: 'absolute',
    right: 0,
    top: 3,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2ECE4',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sheetKicker: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#A1A1AA',
    letterSpacing: 1.2,
    marginBottom: 4,
  },

  sheetTitle: {
    fontSize: 25,
    fontWeight: '900',
    color: '#18181B',
    letterSpacing: -0.7,
  },

  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  detailProgress: {
    marginBottom: 4,
  },

  detailProgressTrack: {
    height: 5,
    borderRadius: 99,
    backgroundColor: '#F0F0F1',
    overflow: 'hidden',
  },

  detailProgressFill: {
    height: '100%',
    borderRadius: 99,
  },

  detailProgressText: {
    fontSize: 8.5,
    color: '#A1A1AA',
    fontWeight: '700',
    marginTop: 5,
  },

  detailHint: {
    color: '#71717A',
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '600',
    marginBottom: 14,
  },

  detailRelationshipContext: {
    minHeight: 52,
    marginTop: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8F5FB',
  },

  detailRelationshipCopy: { flex: 1, minWidth: 0 },
  detailRelationshipTitle: { color: '#5F5188', fontSize: 10.5, fontWeight: '900' },
  detailRelationshipDescription: { color: '#81778E', fontSize: 9, lineHeight: 13, fontWeight: '600', marginTop: 3 },

  detailShareSection: {
    marginBottom: 14,
    gap: 7,
  },
  detailShareLabel: {
    color: '#8A8A93',
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.9,
  },
  detailSharePerson: {
    minHeight: 46,
    paddingHorizontal: 10,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#F7F5FA',
    borderWidth: 1,
    borderColor: '#EEEAF4',
  },
  detailSharePersonActive: {
    backgroundColor: '#F1EDF8',
    borderColor: '#D8CEEA',
  },
  detailShareAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailShareAvatarText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  detailShareName: { flex: 1, color: '#3F3F46', fontSize: 10.5, fontWeight: '800' },
  detailShareAction: { color: '#7866A6', fontSize: 9, fontWeight: '900' },
  detailShareActionActive: { color: '#A14D56' },

  detailStepScroll: {
    flexShrink: 1,
  },

  detailStepScrollContent: {
    paddingBottom: 4,
  },

  generatedStepsPlaceholder: {
    paddingTop: 4,
  },

  generatedStepsPlaceholderTitle: {
    color: '#7866A6',
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '700',
    marginBottom: 3,
  },

  generatedStepPlaceholderRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F5',
  },

  generatedStepPlaceholderCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#E2DEE9',
    backgroundColor: '#F8F6FA',
  },

  generatedStepPlaceholderCopy: {
    flex: 1,
    gap: 6,
  },

  generatedStepPlaceholderLine: {
    height: 7,
    maxWidth: 250,
    borderRadius: 4,
    backgroundColor: '#E9E5ED',
  },

  generatedStepPlaceholderLineShort: {
    height: 6,
    maxWidth: 150,
    borderRadius: 3,
    backgroundColor: '#F0EDF2',
  },

  eyebrow: {
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },

  detailTitle: {
    color: '#18181B',
    fontSize: 21,
    lineHeight: 25,
    fontWeight: '900',
    letterSpacing: -0.5,
  },

  detailStep: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F5',
  },

  detailPressed: {
    opacity: 0.7,
  },

  detailCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#D4D4D8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  detailText: {
    flex: 1,
    color: '#3F3F46',
    fontSize: 11.5,
    lineHeight: 17,
    fontWeight: '600',
  },

  addStepControl: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },

  addStepControlText: {
    fontSize: 11,
    fontWeight: '800',
  },

  addStepInputRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F5',
  },

  addStepInput: {
    flex: 1,
    minHeight: 40,
    color: '#3F3F46',
    fontSize: 11.5,
    fontWeight: '600',
    paddingVertical: 8,
  },

  addStepSave: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.coralStrong,
  },

  addStepCancel: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F4F5',
  },

  actions: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 12,
  },

  detailComplete: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  detailCompleteText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },

  delete: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  reminder: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 91,
    minHeight: 51,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    shadowColor: '#18181B',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#F0F0F1',
  },

  reminderIcon: {
    width: 29,
    height: 29,
    borderRadius: 10,
    backgroundColor: '#FFF0EC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  reminderText: {
    flex: 1,
    color: '#27272A',
    fontSize: 10.5,
    fontWeight: '800',
  },

  label: {
    color: '#6D514A',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
    letterSpacing: 0.25,
    marginBottom: 9,
    marginTop: 2,
  },

  input: {
    minHeight: 126,
    borderWidth: 1,
    borderColor: '#E9E0D7',
    borderRadius: 22,
    backgroundColor: '#FFFDFC',
    paddingHorizontal: 16,
    paddingTop: 17,
    paddingBottom: 17,
    color: '#2E2A28',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 28,
  },

  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 0,
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    gap: 7,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },

  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  create: {
    minHeight: 53,
    borderRadius: 27,
    backgroundColor: colors.coralStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    shadowColor: colors.coralPrimary,
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 3,
  },

  createText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },

  disabled: {
    backgroundColor: '#D4D4D8',
    shadowOpacity: 0,
  },

  newGoalDisabled: {
    backgroundColor: '#E5DDD4',
    shadowOpacity: 0,
  },

  createTextDisabled: {
    color: '#A69B93',
  },

  newGoalHelper: {
    minHeight: 44,
    paddingTop: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 7,
  },

  newGoalHelperText: {
    flexShrink: 1,
    color: '#86766F',
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: '600',
    textAlign: 'center',
  },

  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },

  placeholderIcon: {
    width: 70,
    height: 70,
    borderRadius: 24,
    backgroundColor: '#FFF0EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 17,
  },

  placeholderTitle: {
    color: '#18181B',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.6,
  },

  placeholderText: {
    color: '#71717A',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },

  coming: {
    marginTop: 17,
    backgroundColor: '#F4F4F5',
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },

  comingText: {
    color: '#A1A1AA',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.1,
  },

  strike: {
    textDecorationLine:
      'line-through',
    color: '#A1A1AA',
  },

  pressed: {
    opacity: 0.82,
  },
});
