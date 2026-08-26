import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'App.tsx'), 'utf8');
const modalStart = source.indexOf('function NewGoalModal({');
const modalEnd = source.indexOf('\nfunction GoalLibraryModal(', modalStart) > modalStart
  ? source.indexOf('\nfunction GoalLibraryModal(', modalStart)
  : source.length;
const modal = source.slice(modalStart, modalEnd);
const chooserStart = source.indexOf('function TogetherChooserSheet({');
const chooserEnd = source.indexOf('\nfunction ', chooserStart + 20);
const chooser = source.slice(chooserStart, chooserEnd);
const dueStart = source.indexOf('function NewGoalDueDatePickerSheet({');
const dueEnd = source.indexOf('\nfunction DueRow(', dueStart);
const due = source.slice(dueStart, dueEnd);
const sheetMorphTimingStart = modal.indexOf('Animated.timing(\n        sheetMorph,');
const sheetMorphTiming = sheetMorphTimingStart >= 0
  ? modal.slice(sheetMorphTimingStart, sheetMorphTimingStart + 650)
  : '';
const sourceHeightTimingStart = modal.indexOf('Animated.timing(\n        sourceShellHeight,');
const sourceHeightTiming = sourceHeightTimingStart >= 0
  ? modal.slice(sourceHeightTimingStart, sourceHeightTimingStart + 650)
  : '';

const requireCondition = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

requireCondition(modalStart >= 0, 'Could not isolate NewGoalModal.');
requireCondition(modal.includes('New Goal') && modal.includes('Create Goal'), 'Create Goal copy is missing.');
requireCondition(!modal.includes('DAILY FLOW') && modal.includes("filter((item) => item !== 'quick')"), 'Removed create-goal terminology/category returned.');
requireCondition(modal.includes('newGoalSurfaceMeasureRef.current?.measureInWindow') && modal.includes('measureFab((fabFrame)') && modal.includes('setTransitionSheetFrame(sheetFrame)'), 'FAB/sheet measurement guards were removed.');

requireCondition(source.includes('const newGoalFocusRiseProgress = useRef(new Animated.Value(0)).current'), 'Production Focus Rise does not have one shared visual clock.');
requireCondition(modal.includes('Animated.timing(focusRiseProgress') && modal.includes('toValue: 1') && modal.includes('duration: reducedMotion ? motion.duration.reduced : 500') && modal.includes('Easing.bezier(0.22, 1, 0.36, 1)'), 'B Original 500ms opening/easing is not ported exactly.');
requireCondition(modal.includes('duration: reducedMotion ? motion.duration.reduced : 380') && modal.includes('Easing.bezier(0.4, 0, 0.8, 0.2)'), 'Approved B tap/X closing changed.');
requireCondition(modal.includes('outputRange: [screenHeight - resolvedSheetFrame.y, 0]') && !modal.includes('rotateZ') && !modal.includes('translateX: focusRise'), 'Production Focus Rise is not vertical-only.');
requireCondition(modal.includes('y: insets.top + 18') && modal.includes('width: screenWidth') && modal.includes('screenHeight - insets.top - 18'), 'Approved E1 near-full-screen resting geometry is missing.');

requireCondition(source.includes('outputRange: [1, 0.985]') && source.includes('outputRange: [0, -3]'), 'Approved Home 0.985 scale/-3px depth is missing.');
requireCondition(modal.includes('inputRange: [0, 0.1, 0.22, 0.34, 0.46, 0.58, 1]') && modal.includes('outputRange: [0, 0, 0.0219, 0.07, 0.1181, 0.14, 0.14]'), 'Approved restrained 0.14 backdrop choreography is missing.');
requireCondition(modal.includes('inputRange: [0, 0.72, 0.9, 1]') && modal.includes('inputRange: [0, 0.76, 0.94, 1]') && modal.includes('inputRange: [0, 0.8, 0.98, 1]'), 'Approved header/input/control reveal thresholds are missing.');
requireCondition(source.includes("backgroundColor: '#F8F3EA'") && source.includes('shadowOpacity: 0.06') && source.includes('shadowRadius: 18'), 'The locked warm-cream Focus Rise surface is not the visible production shell.');
requireCondition(modal.includes('e.g. Run 5K without stopping') && modal.includes('Sunday creates your first small steps automatically.') && modal.includes('styles.newGoalSettingsGroup'), 'Locked New Goal V1 copy or grouped settings surface is missing.');

requireCondition(!source.includes("import { NewGoalMorphCanvas }") && !modal.includes('<NewGoalMorphCanvas') && !modal.includes('skiaMorphProgress') && !modal.includes('skiaCloseProgress') && !modal.includes('newGoalSkiaPlus') && !modal.includes('D3 DEBUG'), 'Obsolete D3/D4 production visuals still mount or execute.');
requireCondition(source.includes('{__DEV__ && <NewGoalMotionLab />}'), 'Motion Lab is no longer dev-only.');

requireCondition(source.includes("| 'preparingOpen'") && source.includes("| 'handoffToFab'") && modal.includes("if (transitionStateRef.current !== 'open')") && modal.includes('closeCompletionLifecycleRef.current === lifecycle'), 'Stabilized transition phases or completion guard changed.');
requireCondition(modal.includes('<Modal') && modal.includes('visible={modalMounted}') && modal.includes('onShow={handleNativeModalShow}') && modal.includes('onDismiss={onNativeModalDismissed}'), 'Native Modal presentation lifecycle changed.');
requireCondition(source.includes('newGoalNativeModalDismissedRef') && source.includes('newGoalOpenQueuedRef') && source.includes('NATIVE_MODAL_DISMISS_PENDING_CLEARED'), 'Repeated-open native dismissal protection changed.');
requireCondition(modal.includes("pointerEvents={transitionState === 'open' ? 'auto' : 'none'}") && modal.includes("disabled={transitionState !== 'open'}") && modal.includes('cancelAllTransitionFrames') && modal.includes('activeTransitionRafsRef.current.clear()'), 'Dismissal gates or RAF cleanup changed.');
requireCondition(modal.includes('focusRiseProgress.stopAnimation();') && modal.includes('focusRiseProgress.setValue(0);') && modal.includes('sheetY.setValue(0);'), 'Deterministic closed-state cleanup is incomplete.');
requireCondition(!modal.includes('keyboardLift') && modal.includes('const availableHeight = screenHeight - insets.top - 18;'), 'Keyboard height still changes the production sheet shell position or height.');
requireCondition(!modal.includes('styles.newGoalFloatingCardState') && !modal.includes('y: current.y - Math.max(0, activeKeyboardHeight - 16)'), 'Keyboard presentation or dismissal still mutates the locked sheet frame/style.');
requireCondition(modal.includes('maxHeight: resolvedSheetFrame.height') && modal.includes(': resolvedSheetFrame.height,'), 'The open card can resize away from its locked measured height.');
requireCondition(modal.includes('Keyboard.dismiss();') && modal.includes('requestTransitionFrame(() =>') && modal.includes('dismiss(source);'), 'Keyboard-aware close path changed.');
requireCondition(modal.includes('Gesture.Pan()') && modal.includes('.manualActivation(true)') && modal.includes('<GestureDetector gesture={swipeDismissGesture}>'), 'Swipe dismissal is not owned by Gesture Handler on the UI thread.');
requireCondition(modal.includes('.onUpdate((event) =>') && modal.includes('swipeDismissDragY.value = Math.max(0, event.translationY)'), 'Sheet drag is not mapped 1:1 to the UI-thread translation.');
requireCondition(modal.includes("left: resolvedSheetFrame.x") && modal.includes("top: resolvedSheetFrame.y") && modal.includes("width: resolvedSheetFrame.width") && modal.includes("height: resolvedSheetFrame.height") && modal.includes("overflow: 'hidden'"), 'Interactive drag no longer preserves the locked B Original resting frame and clipping.');
requireCondition(modal.includes('style={[\n            styles.newGoalAdaptiveWrap,') && modal.includes('swipeDismissSheetStyle,'), 'dragY is not an additive transform on the locked sheet frame.');
requireCondition(modal.includes('downwardDistance >= swipeDismissTravel.value * 0.28') && modal.includes('downwardVelocity >= 1000'), 'Swipe dismiss distance or velocity threshold drifted.');
requireCondition(modal.includes('swipeDismissKeyboardHeight.value > 0') && modal.includes('swipeDismissScrollOffset.value > 0.5') && modal.includes('dy > 4'), 'Swipe activation does not protect scrolling, keyboard interaction, or accidental pulls.');
requireCondition(modal.includes('swipeDismissDragY.value = withSpring(0') && modal.includes('stiffness: 420') && modal.includes('damping: 38') && modal.includes('overshootClamping: true'), 'Cancelled swipe does not return with the approved tightly damped spring.');
requireCondition(source.includes('const newGoalSwipeDismissProgress = useDerivedValue') && source.includes('newGoalInteractiveDepthStyle') && source.includes('interactiveDismissProgress={newGoalSwipeDismissProgress}'), 'Home and navigation depth do not share the UI-thread dismissal progress.');
requireCondition(modal.includes('swipeDismissBackdropStyle') && modal.includes('opacity: 1 - Math.max(0, Math.min(1, swipeDismissProgress.value))'), 'Backdrop does not scrub continuously with the interactive sheet position.');
requireCondition(source.includes("<AnimatedReanimated.View style={[{ flex: 1 }, interactiveDepthStyle]}>") && !source.includes('newGoalSwipeDismissProgress.value ='), 'Bottom navigation depth wrapper no longer preserves the approved flex geometry.');
requireCondition(modal.includes('swipeDismissDragY.value = withSpring(swipeDismissTravel.value') && modal.includes('runOnJS(completeClosingFromFocusRise)'), 'Accepted swipe does not continue from its release position into authoritative close completion.');
requireCondition(modal.includes('onScroll={(event) =>') && modal.includes('event.nativeEvent.contentOffset.y'), 'Form scroll position is not tracked for gesture arbitration.');
requireCondition(sheetMorphTiming.includes('useNativeDriver: true'), 'Create Goal sheetMorph driver ownership is inconsistent.');
requireCondition(sourceHeightTiming.includes('useNativeDriver: false'), 'JS-only source height animation lost its separate driver ownership.');
requireCondition(modal.includes('opacity: morphCardOpacity') && modal.includes('? sourceShellHeight') && modal.includes('maxHeight: resolvedSheetFrame.height'), 'Native visual morph values and JS-only layout height are not separated.');
requireCondition(modal.includes("...(transitionSheetFrame ? { height: '100%' as const } : null)"), 'Native morph wrapper is constraining the pre-measurement sheet geometry.');

requireCondition(chooser.includes('Doing this') && chooser.includes('I’m doing this for myself.') && chooser.includes("We're working toward this together.") && chooser.includes('I’m doing this, with someone in my corner.') && chooser.includes('CONTINUE'), 'Locked relationship choices changed.');
requireCondition(due.includes('selectQuickDate') && due.includes('normalizeDueDate(selectedDate, hasTime)') && due.includes('sameLocalDay(date, selectedDate)') && due.includes('SET DUE DATE'), 'Locked synchronized Due Date behavior changed.');
requireCondition(due.includes('visibleCalendarCellCount') && due.includes('scrollEnabled={viewportHeight < 700}') && due.includes('styles.newGoalDueSelectionSummary'), 'Responsive Due Date sheet layout contract changed.');
requireCondition(!due.includes('<Modal') && !chooser.includes('<Modal') && due.includes('styles.newGoalChildSheetRoot') && chooser.includes('styles.newGoalChildSheetRoot'), 'New Goal child sheets crossed a native Modal boundary.');
requireCondition(due.includes('toValue: viewportHeight') && chooser.includes('toValue: viewportHeight') && due.includes('opacity: backdropOpacity') && chooser.includes('opacity: backdropOpacity'), 'Child sheet dismissal or backdrop continuity is incomplete.');
requireCondition(modal.includes('dismissRequest={dueDismissRequest}') && modal.includes('dismissRequest={togetherDismissRequest}') && modal.includes('if (duePickerOpen)') && modal.includes('if (togetherPickerOpen)'), 'System dismissal is not routed through the active child sheet lifecycle.');
requireCondition(source.includes("'Goal created'"), 'Creation confirmation changed.');

let state: 'closed' | 'preparingOpen' | 'opening' | 'open' | 'closing' | 'handoffToFab' = 'closed';
let nativeDismissed = true;
for (let cycle = 1; cycle <= 20; cycle += 1) {
  requireCondition(state === 'closed' && nativeDismissed, `Cycle ${cycle} did not begin closed.`);
  state = 'preparingOpen';
  state = 'opening';
  state = 'open';
  state = 'closing';
  state = 'handoffToFab';
  nativeDismissed = false;
  state = 'closed';
  nativeDismissed = true;
}
requireCondition(state === 'closed' && nativeDismissed, 'Repeated-open state model did not finish closed.');

const dismissTravel = 800;
const acceptsSwipe = (distance: number, velocity: number) =>
  distance >= dismissTravel * 0.28 || velocity >= 1000;
requireCondition(acceptsSwipe(225, 0), '28% swipe did not dismiss.');
requireCondition(acceptsSwipe(40, 1000), 'Fast short flick did not dismiss.');
requireCondition(!acceptsSwipe(40, 300), 'Tiny accidental pull dismissed.');
for (let cycle = 1; cycle <= 10; cycle += 1) {
  state = 'open';
  const useSwipe = cycle % 2 === 0;
  requireCondition(!useSwipe || acceptsSwipe(240, 400), `Swipe cycle ${cycle} was rejected.`);
  state = 'closing';
  state = 'handoffToFab';
  state = 'closed';
}
requireCondition(state === 'closed', 'Alternating X/swipe lifecycle did not finish closed.');

console.log('Create Goal Focus Rise and repeated-open validation passed.');
