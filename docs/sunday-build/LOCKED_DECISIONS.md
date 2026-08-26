# Locked Decisions

“Locked” means:

- Preserve the decision unless the user explicitly requests reconsideration.
- Bug fixes must not redesign it.
- Implement using the smallest safe change.
- Report conflicts rather than silently altering locked behavior.

## Product

- Brand name: Sunday.
- Core tagline: “Progress feels better together.”
- The core progress and support loop is locked.
- Just Me, Together, and Support Me are distinct relationship modes.

## Home

- Home answers “What matters right now?”
- Current Focus is the dominant element.
- Current Focus surfaces one useful Next Step.
- Home shows a maximum of two Other Goal previews.
- Other Goals remain quiet and non-overwhelming.
- View All is the management surface for the broader active-goal collection.
- Completed Goals is tertiary.
- Intentional whitespace is allowed.
- Home must not become a productivity dashboard.

Canonical active Home visual reference:

`design-references/locked/SUNDAY_HOME_ACTIVE_LOCKED.png`

## New Goal interaction

- Focus Rise direction.
- B Original opening.
- B Original closing.
- Straight vertical rise.
- 1:1 interactive drag-to-dismiss; the sheet follows the finger directly.
- X dismissal remains available.
- The keyboard must not reposition the sheet.
- Drag and background behavior remain synchronized and visually stable.

Do not retune these decisions during unrelated work.

## New Goal visual design

Canonical references:

- `design-references/locked/SUNDAY_NEW_GOAL_FLOW_LOCKED.png`
- `design-references/locked/SUNDAY_DUE_DATE_PICKER_LOCKED.png`

The standalone Due Date reference supersedes any earlier Due Date design visible inside the broader New Goal flow board.

## Intelligent steps

Locked V1 behavior:

- Standard goal creation does not use the old hard-coded generic steps.
- Sunday generates exactly three goal-specific useful steps.
- Step 1 is generally the smallest meaningful action the user can take now or soon.
- Goal creation closes immediately and does not wait for AI.
- Generated steps arrive asynchronously.
- The first incomplete microtask becomes Next Step.
- The goal remains saved if AI step generation fails.

## Reactions

- Reaction language uses actual animated reactions.
- Reaction interactions feel emotionally warm and lightweight.

## Regression rule

When fixing a bug, fix the specific issue only. Do not alter unrelated layout, navigation, gestures, animations, keyboard handling, relationships, or backend behavior.

If shared infrastructure may affect another locked surface, report the risk before changing it.
