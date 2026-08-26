import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseGeneratedGoalSteps } from '../src/goals/goalStepGenerationTypes';

const valid = parseGeneratedGoalSteps({
  steps: [
    { title: '  Choose   three portfolio projects  ' },
    { title: 'Write a one-sentence summary for each project' },
    { title: 'Put the projects into your first portfolio layout' },
  ],
});
assert.deepEqual(valid, [
  'Choose three portfolio projects',
  'Write a one-sentence summary for each project',
  'Put the projects into your first portfolio layout',
]);
assert.equal(parseGeneratedGoalSteps({ steps: [{ title: 'One' }] }), null, 'Accepted fewer than three steps.');
assert.equal(parseGeneratedGoalSteps({ steps: [
  { title: 'Choose a route' }, { title: 'Choose a route' }, { title: 'Run it' },
] }), null, 'Accepted duplicate steps.');
assert.equal(parseGeneratedGoalSteps({ steps: [
  { title: '1. Choose a route' }, { title: 'Run for 15 minutes' }, { title: 'Schedule the next run' },
] }), null, 'Accepted embedded numbering.');
assert.equal(parseGeneratedGoalSteps({ steps: [
  { title: '' }, { title: 'Run for 15 minutes' }, { title: 'Schedule the next run' },
] }), null, 'Accepted an empty step.');

const representativeOutputs = [
  {
    goal: 'Run my first 5K',
    steps: [
      'Choose a comfortable 15-minute route and put your running shoes out',
      'Complete an easy 15-minute run',
      'Choose the next day you will run and add it to your week',
    ],
  },
  {
    goal: 'Save $3,000 by December',
    steps: [
      'Check how much you already have saved',
      'Calculate how much you need to save each month until December',
      'Set up the first transfer into your savings account',
    ],
  },
  {
    goal: 'Finish my portfolio website',
    steps: [
      'Choose the three projects you want to feature',
      'Write a one-sentence summary for each project',
      'Add the projects to your portfolio layout and check each page',
    ],
  },
];
for (const sample of representativeOutputs) {
  assert.deepEqual(
    parseGeneratedGoalSteps({ steps: sample.steps.map((title) => ({ title })) }),
    sample.steps,
    `${sample.goal}: representative structured output failed validation.`
  );
}

const app = readFileSync(resolve(process.cwd(), 'App.tsx'), 'utf8');
const repository = readFileSync(resolve(process.cwd(), 'src/backend/repositories/goalRepository.ts'), 'utf8');
const edgeFunction = readFileSync(resolve(process.cwd(), 'supabase/functions/generate-goal-steps/index.ts'), 'utf8');
for (const oldStep of [
  'Open workspace & prep materials',
  'Execute the first 5 minutes',
  'Review output and check complete',
]) {
  assert.equal(app.includes(oldStep), false, `Old generic step remains: ${oldStep}`);
}
assert.ok(app.includes('microSteps: []'), 'Goal is not created with an empty microstep list.');
assert.ok(app.includes('Finding a good first step…'), 'Current Focus temporary generation state is missing.');
assert.ok(app.includes('Finding your first steps…'), 'Goal-detail generation state is missing.');
assert.ok(app.includes('GeneratedStepsPlaceholder'), 'Goal-detail placeholder rows are missing.');
assert.ok(app.includes('duration(reducedMotion ? motion.duration.reduced : 160)'), 'Placeholder crossfade timing is missing.');
assert.ok(app.includes('generateGoalSteps({') && app.includes('attachGeneratedMicrotasks'), 'Async generation/persistence boundary is missing.');
assert.ok(repository.includes(".eq('goal_id', goalId)") && repository.includes(".order('position')"), 'Existing-step duplicate check or ordering is missing.');
assert.ok(edgeFunction.includes("const MODEL = 'gpt-4o-mini'") && edgeFunction.includes("strict: true"), 'Established strict server-side model pattern is missing.');
assert.ok(edgeFunction.includes('title,') && edgeFunction.includes('category,') && edgeFunction.includes('dueAt:') && edgeFunction.includes('relationshipMode,'), 'Required goal context is not sent to the model.');
assert.ok(edgeFunction.includes('smallest meaningful action') && edgeFunction.includes('now or today'), 'Step-one immediate-action guidance is missing.');
assert.ok(edgeFunction.includes('joining groups') && edgeFunction.includes('unless directly necessary'), 'Generic accountability avoidance is missing.');
assert.ok(app.includes("console.info('[Sunday goal step generation]'") && !app.includes("console.error('[Sunday goal step generation]'"), 'Handled generation failure still triggers an intrusive development error overlay.');

console.info('Validated intelligent goal-step parsing, async creation boundary, duplicate protection, and server-side structured generation.');
