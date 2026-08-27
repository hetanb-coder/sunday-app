# Sunday Antigravity Workspace Rules

Before making any changes, use the repository's existing Sunday documentation as the source of truth, particularly:
* `docs/sunday-build/LOCKED_DECISIONS.md`
* `docs/sunday-build/PRODUCT_PRINCIPLES.md`
* `docs/sunday-build/AGENT_WORKFLOW.md`
* `docs/sunday-build/CURRENT_SPRINT.md`
* `AGENTS.md` (root directory)

## Product Protection
Sunday's core emotional loop is: **Progress → noticed → supported → motivation → more progress**

Relationship modes are distinct and must NEVER be flattened into generic shared goals:
* **Just Me**: My progress, for me.
* **Together**: Our progress. Both people participate and own the goal.
* **Supported**: My goal, with you in my corner. One person owns the goal while the other notices and supports without becoming an owner.

Do not redefine Sunday product behavior unless the task explicitly contains an approved product decision.
When a requested engineering change appears to require a product decision, stop and surface the decision instead of inventing behavior.

## Scope Discipline
* Make the smallest robust change that solves the requested problem.
* Do not make unrelated improvements.
* Do not refactor surrounding architecture merely because it could be cleaner.
* The existing large `App.tsx` is known technical debt. Do NOT proactively split or rewrite it.
* Existing web-era artifacts are known technical debt. Do NOT remove them unless explicitly tasked.
* Preserve working interactions, layouts, gestures and animations outside the requested scope.
* Never remove working functionality simply to simplify implementation.

## Git Safety
* Never force push.
* Never perform destructive resets.
* Never delete branches or tags without explicit approval.
* Never overwrite the `pre-antigravity` safety tag.
* Do not automatically merge to another branch.
* Inspect the Git diff before declaring a task complete.
* Report every changed file.
* Prefer isolated worktrees/branches for substantial engineering tasks.

## Supabase Safety
* Never expose secret/environment values.
* Never reset the Supabase database.
* Never automatically apply production migrations.
* Database changes must follow Sunday's existing migration workflow.
* Treat authentication, RLS, relationship permissions and goal ownership as sensitive behavior.
* Changes affecting Just Me / Together / Supported permissions require explicit validation.

## Dependency Safety
* Do not upgrade Expo, React Native or dependencies unless explicitly requested.
* Do not switch package managers automatically.
* Do not regenerate lockfiles unnecessarily.
* The current dual `package-lock.json` / `bun.lock` situation is known technical debt and must not be "fixed" opportunistically during unrelated tasks.

## UI and Motion
Sunday should feel simple, warm, human, calm, hopeful and tactile.
* Preserve existing Sunday design language.
* Do not redesign unrelated surfaces.
* Implementation is not accepted merely because it compiles.
* Physical iPhone testing is part of acceptance for meaningful UI/motion changes.
* Prefer smooth, intentional motion over decorative complexity.

## Validation
After engineering changes:
1. Run the relevant existing static checks.
2. Run TypeScript validation where applicable (Be aware that the current standard TypeScript configuration `npm run typecheck` excludes `src/**`. Do not falsely claim `src/` code has been typechecked by the normal project command).
3. Inspect the final Git diff.
4. Report validation results honestly.
5. Never hide or bypass failures to declare success.
6. Provide a concise physical-device test procedure when the change affects user-facing behavior.

## Completion Format
After each implementation task, report using this format:

**CHANGED**
What changed.

**FILES**
Files modified.

**VALIDATION**
Checks performed and results.

**TEST ON IPHONE**
Exact behavior I should verify, when applicable.

**CONCERNS**
Anything unresolved or potentially risky.

Keep reports concise.
