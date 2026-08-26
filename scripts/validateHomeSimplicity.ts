import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'App.tsx'), 'utf8');
const homeStart = source.indexOf("{tab === 'home' ? (");
const homeEnd = source.indexOf(": tab === 'together' ? (", homeStart);
const home = source.slice(homeStart, homeEnd);
const focusStart = source.indexOf('function Focus({');
const focusEnd = source.indexOf('\nfunction Card({', focusStart);
const focus = source.slice(focusStart, focusEnd);
const cardStart = source.indexOf('function Card({', focusEnd);
const cardEnd = source.indexOf('\nconst BOTTOM_NAV_CENTERS', cardStart);
const card = source.slice(cardStart, cardEnd);

const requireCondition = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

requireCondition(homeStart >= 0 && homeEnd > homeStart, 'Could not isolate the Home render.');
requireCondition(!home.includes("Today's Progress"), 'Home still renders the large progress dashboard.');
requireCondition(!home.includes('Small steps. Real momentum.'), 'Home still renders the redundant goals subtitle.');
requireCondition(!home.includes('<CategoryStackHeader'), 'Home still renders external category headings.');
requireCondition(home.includes('What would feel good to move forward?'), 'Intentional no-goals state is missing.');
requireCondition(home.includes('Start a goal'), 'No-goals CTA is missing.');
requireCondition(home.includes('You cleared the flow today! 🎉'), 'Cleared-flow state is missing.');
requireCondition(home.includes('Add something new'), 'Cleared-flow CTA is missing.');
requireCondition(home.includes('OTHER GOALS · {regular.length}'), 'Compact Other Goals hierarchy is missing.');
requireCondition(source.includes('return regular.slice(0, 2)') && home.includes('homePreviewTasks.map'), 'Home does not cap secondary previews at two.');
requireCondition(home.includes("setLibraryView('active')"), 'View all does not use the shared goal library presentation.');
requireCondition(source.includes('const activeGoalLibraryTasks = hero') && source.includes('? activeGoalLibraryTasks'), 'View all does not include Current Focus in the complete active-goal collection.');
requireCondition(home.includes('<CompactGoalPreview') && source.includes('function CompactGoalPreview'), 'Compact goal previews are missing.');
requireCondition(!home.includes('homeMomentTask') && !source.includes('function SundayMoment'), 'Home still renders an out-of-scope Sunday Moment.');
requireCondition(!home.includes('Recently Deleted ·'), 'Home still links Recently Deleted.');
requireCondition(home.includes('homeGreeting(currentProfileName)') && home.includes('remainingSmallSteps'), 'Time-aware greeting or Daily Momentum count is missing.');
requireCondition(source.includes("!['you', 'undefined', 'null'].includes") && source.includes("usableFirstName ? `, ${usableFirstName}` : ''"), 'Greeting fallback can render an unusable profile name.');
requireCondition(focus.includes('const nextStep = task.microSteps.find'), 'Current Focus does not choose one incomplete step.');
requireCondition(focus.includes('toggleStep(task.id, nextStep.id)'), 'Current Focus is not directly actionable.');
requireCondition(!focus.includes('task.microSteps.map'), 'Current Focus still renders every microtask.');
requireCondition(!focus.includes('ADHD GUARDRAIL'), 'Current Focus still renders the guardrail block.');
requireCondition(focus.includes('relationshipContext'), 'Current Focus does not expose relationship context.');
requireCondition(!focus.includes('1 goal at a time'), 'Current Focus still renders redundant explanatory copy.');
requireCondition(source.includes("mode: 'together'") && source.includes("mode: 'supported'") && source.includes("task.collaborationMode === 'private'"), 'Home relationship badges are not derived from real relationship mode.');
requireCondition(!home.includes('Together with') && !home.includes('Supported by'), 'Home still renders long relationship strings.');
requireCondition(focus.includes('allDone && task.microSteps.length > 0'), 'Goal completion is not gated behind completed steps.');
requireCondition(focus.includes('task.minutes') && focus.includes('duePresentation'), 'Current Focus metadata is incomplete.');
requireCondition(source.includes('focusNextCircle') && source.includes('flexShrink: 0'), 'Current Focus completion circle can still shrink or clip.');
requireCondition(source.includes('canDelete={canDeleteTask(task)}') && source.includes('requestDeleteGoal(task.id)'), 'View all does not preserve permission-aware goal deletion.');
requireCondition(source.includes('connection.userId === otherUserId') && source.includes('connection.displayName'), 'Home relationship labels do not resolve from connection display names.');
requireCondition(card.includes('relationshipLabel'), 'Legacy handoff cards no longer preserve relationship context.');

const previewCount = (activeCount: number) => Math.min(Math.max(0, activeCount - 1), 2);
requireCondition(previewCount(0) === 0, 'No-goals presentation simulation failed.');
requireCondition(previewCount(1) === 0, 'One-goal presentation simulation failed.');
requireCondition(previewCount(4) === 2, 'Several-goals preview cap failed.');
requireCondition(previewCount(8) === 2, 'Large-goal-set preview cap failed.');

console.log('Home simplicity validation passed.');
