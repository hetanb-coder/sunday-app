import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'App.tsx'), 'utf8');
const modalStart = source.indexOf('function TaskModal({');
const modalEnd = source.indexOf('\nfunction NewGoalModal(', modalStart);
const modal = source.slice(modalStart, modalEnd);

const requireCondition = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

requireCondition(modalStart >= 0 && modalEnd > modalStart, 'Could not isolate TaskModal.');
requireCondition(modal.includes('translateY.setValue(500)'), 'Goal Detail no longer begins below the viewport.');
requireCondition(modal.includes('Animated.spring(translateY'), 'Goal Detail no longer settles with bottom-sheet motion.');
requireCondition(modal.includes('panResponder.panHandlers'), 'Goal Detail lost its swipe-down dismissal surface.');
requireCondition(modal.includes('onPress={dismiss}'), 'Goal Detail lost outside-tap dismissal.');
requireCondition(!modal.includes('Break the goal down.'), 'Goal Detail still renders explanatory microtask copy.');
requireCondition(modal.includes('<Heart') && modal.includes('<Users'), 'Goal Detail is missing relationship-specific icons.');
requireCondition(source.includes("borderBottomLeftRadius: 0") && source.includes("marginBottom: 0"), 'Goal Detail is not visually bottom-anchored.');
requireCondition(source.includes("maxHeight: '88%'"), 'Goal Detail lost its viewport height cap.');

console.log('Goal Detail bottom-sheet validation passed.');
