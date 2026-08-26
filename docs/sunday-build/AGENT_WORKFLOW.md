# Sunday Agent Workflow

Agents increase parallel progress without creating uncontrolled overlapping changes.

## Delivery flow

Idea / Audit → Visual Design / Product Spec → Visual Locked → Ready to Build → Implementation → QA / Regression → Physical Device Review → Device Approved → Merge / Done

## Role 1 — Product / Design

Responsibilities:

- Understand the problem.
- Define the desired user experience.
- Reduce complexity.
- Create and refine visual prototypes.
- Establish locked references.

Preferred visual workflow:

Existing Sunday screenshot → product critique → Google AI Studio prototype → visual refinement → approval → canonical reference saved under `design-references/locked/`.

Product and Design do not casually write production code.

## Role 2 — Implementation Agent

Responsibilities:

- Read the project principles, locked decisions, and current sprint.
- Inspect the existing architecture.
- Implement one bounded task.
- Preserve locked systems.
- Run validation.
- Report changed files.

Before changing code, report:

1. Scope
2. Files expected to change
3. Protected systems
4. Likely regression risks

Implementation agents must not redesign locked references, opportunistically refactor unrelated systems, fix unrelated bugs, change shared primitives without necessity, or silently modify locked behavior.

## Role 3 — QA / Regression Agent

QA should ideally be independent from implementation and inspection-first. It must not automatically fix findings unless explicitly instructed.

Responsibilities:

- Compare implementation against locked visual references.
- Inspect changed files and diffs.
- Run TypeScript, tests, and validators.
- Check protected systems.
- Identify regressions.
- Report **PASS**, **PASS WITH NOTES**, or **BLOCK MERGE**.

QA categories:

- **Visual:** hierarchy, spacing, clipping, responsiveness, typography, reference fidelity.
- **Functional:** state, interactions, navigation, persistence.
- **Regression:** New Goal, gestures, keyboard, bottom navigation, FAB, Goal Detail, relationship modes, Together, Supported, reactions.

## Role 4 — Research / Planning Agent

This role may operate in parallel while another agent writes code.

Good parallel tasks include onboarding audits, retention or competitor research, monetization and App Store research, future UI audits, AI Studio briefs, and read-only architecture inspection.

This role should avoid editing production files owned by another implementation agent.

## Parallel-work rule

Parallel work is encouraged; overlapping code ownership is not.

Do not run several agents editing the same central production files simultaneously. Especially protect `App.tsx`, shared layout, navigation, global animation systems, and backend or domain files.

Prefer an Implementation Agent working on the active coding task while a Design or Research Agent prepares the next feature specification. QA then reviews the implementation independently.

## Git isolation

Use isolated branches or worktrees for genuinely parallel implementation work.

Suggested branch names:

- `agent/home`
- `agent/new-goal`
- `agent/onboarding`
- `agent/qa-<feature>`

Do not merge automatically. Human and physical-device approval happen before final integration.

## Canonical context

Before substantial Sunday work, read:

- `docs/sunday-build/PRODUCT_PRINCIPLES.md`
- `docs/sunday-build/LOCKED_DECISIONS.md`
- `docs/sunday-build/AGENT_WORKFLOW.md`
- `docs/sunday-build/CURRENT_SPRINT.md`

Inspect relevant locked design references as well.

## Bug-fix rule

Bug-fix prompts require a strict blast radius: **issue at hand only; preserve everything else.**

Regression testing is mandatory after a bug fix involving shared layout, animations, gestures, safe area, keyboard, navigation, or backend state.
