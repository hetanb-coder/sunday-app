# Weave — Gemini Handoff / Continuation Brief

## Purpose

This file is the handoff from the previous development session. The goal is for Gemini (or another coding agent) to open the repository and continue the Weave mobile migration and polish work **without restarting or undoing the migration**.

## Project

- GitHub repo: `hetanb-coder/weave-app`
- Current working branch: `mobile-migration`
- App: **Weave**
- Original source/design: Google AI Studio app
- Mobile target: Expo / React Native
- Expo SDK: **54.0.36**
- React: **19.1.0**
- React Native: **0.81.5**
- Expo Router: **~6.0.24**
- Entry point: native Expo `App.tsx`

## Important context

The original AI Studio version is substantially more polished visually than the current native mobile implementation. That is expected at this stage.

The migration was deliberately done in phases:

1. Establish the Expo/native foundation.
2. Bring the core app functionality into the native Expo app.
3. Polish the native implementation so it progressively matches the original AI Studio design/UX.

We are now in the **polish phase (Phase 3B)**.

Do NOT interpret the fact that the app loads in Expo as meaning the migration is visually finished. The next work is specifically about visual fidelity, interaction polish, animations, spacing, typography, states, and mobile UX.

## Current state

The app currently loads successfully in Expo and the user has confirmed it works.

The repository has already gone through dependency cleanup and Expo compatibility work. Earlier Expo Doctor issues included missing icon assets, mismatched Expo packages, duplicate dependencies, and web-only dependencies. Those migration issues were resolved enough for the native app to run.

The user also ran TypeScript checks during the migration. There were initially many errors caused by web-only dependencies/files and mismatched types. The obsolete web-only `components/ExternalLink.tsx` and `components/EditScreenInfo.tsx` were removed, and the TypeScript errors were subsequently resolved. The user confirmed the app works and can load in Expo.

### Git history / migration milestones

Relevant commits seen during migration:

- `265d220` — Initial commit of exact AI Studio code
- `5928db8` — Update app.json
- `3832dc6` — chore: establish Expo native package foundation
- `a6afdc8` — fix: pin Expo web peers and SDK-compatible svg
- `9538db7` — fix: remove missing placeholder app icon
- `cd7a70c` — feat: use native App.tsx as Expo entry point

The exact current HEAD may have advanced after this handoff is created; always inspect Git before editing.

## Current package direction

The native branch is intentionally using React Native packages such as:

- `lucide-react-native`
- Expo SDK packages
- React Native / Expo Router

Do not casually reintroduce web-only packages such as `lucide-react`, `motion/react`, Vite, or browser-specific implementations into the native app.

The repository may still contain historical AI Studio/web files because the original project was a web app. Treat those as legacy unless they are explicitly required by the current native implementation.

## Important architecture

The repo currently contains both original/web-era code and native/mobile code. The native implementation is centered around:

- `App.tsx` — native Expo app entry / primary native UI shell
- `app.json` — Expo configuration
- `app/index.tsx` — Expo Router route entry where applicable
- `src/types.ts` — core app types
- `src/context/WeaveContext.tsx` — app/task state
- `src/components/MicroStepsBottomSheet.tsx`
- `src/components/NewTaskModal.tsx`
- `src/components/ToastNotification.tsx`
- `src/navigation/TabNavigator.tsx`
- `src/screens/DashboardScreen.tsx`
- `src/screens/HomeScreen.tsx`
- `src/screens/InteractiveVoiceDemoScreen.tsx`
- `src/screens/OnboardingFlowScreen.tsx`
- `src/screens/PaywallScreen.tsx`

Before making architectural changes, inspect the current files because the codebase has been actively migrated and cleaned up.

## What Phase 3B means

The goal is to make the native Expo app feel like the **finished Weave product**, not merely a functional port.

Priority areas discussed:

### 1. Visual fidelity

Bring the native UI closer to the original AI Studio version:

- typography hierarchy
- font weights
- spacing and padding
- card shapes and corner radii
- shadows/elevation
- colors
- icon sizing/stroke weights
- bottom navigation appearance
- task cards
- progress indicators
- onboarding screens
- paywall
- empty states
- modal/bottom-sheet presentation

Do this screen-by-screen rather than trying to redesign everything at once.

### 2. Interactions

Make interactions feel deliberate and premium:

- pressed states
- smooth screen transitions
- bottom sheet transitions
- modal presentation/dismissal
- task completion feedback
- micro-step interactions
- tab transitions
- onboarding progression
- toast behavior
- appropriate haptics where useful

### 3. Animations

Yes — animations are explicitly part of the polish phase.

The original product concept includes celebratory/feedback moments such as **confetti animations**. These should be implemented natively in a way that feels smooth on an actual phone, rather than copying web animation APIs directly.

Other candidates:

- task completion animation
- micro-step completion feedback
- onboarding entrance/exit transitions
- tab transitions
- bottom-sheet spring motion
- paywall reveal/transition
- subtle loading/empty-state motion

Animations should be purposeful and restrained. Avoid adding motion everywhere just because it is possible.

### 4. Mobile UX

Check the actual Expo experience on an iPhone, not just TypeScript/build correctness.

Pay attention to:

- safe areas
- keyboard behavior
- scroll behavior
- touch target sizes
- modal dismissal
- bottom navigation overlap
- text wrapping
- small-screen layouts
- landscape/tablet behavior where relevant
- performance of animations

## Design principle

The objective is **not** to create a generic React Native redesign.

The objective is to preserve the visual identity and UX of the AI Studio Weave app while adapting it correctly to native mobile.

When the web and native implementation differ, prefer the original AI Studio implementation as the design reference, then implement the equivalent behavior using native APIs/components.

## Current known success criteria

At minimum, before considering the migration/polish phase complete:

- `npx expo start` launches successfully.
- The app opens in Expo Go.
- `npx tsc --noEmit` passes with no errors.
- No obvious web-only runtime dependencies are required by the native app.
- Core screens are usable.
- Visual styling is close to the original AI Studio product.
- Animations and feedback interactions feel polished.
- Confetti/completion feedback works reliably on-device.
- No regressions are introduced to task state, onboarding, navigation, or paywall flows.

## Development workflow

Before editing:

```bash
git status
git branch --show-current
git log -3 --oneline
```

After meaningful changes:

```bash
npx tsc --noEmit
npx expo-doctor
```

Then test in Expo Go.

Keep commits small and descriptive. Do not rewrite or reset the migration history.

## Very important Git instruction

The user is working from the `mobile-migration` branch. Do not switch the project back to `main` or reset the branch to the old AI Studio-only implementation.

The original AI Studio implementation is the **design/reference source**, while `mobile-migration` is the active native implementation.

## Suggested Phase 3B execution order

Work in this order to keep the process controlled:

1. Inspect current `App.tsx` and native screen/component files.
2. Compare the native implementation against the original AI Studio source in the repository.
3. Establish a consistent native design system: colors, spacing, radii, typography, shadows, icon sizing.
4. Polish the primary Home screen first.
5. Polish task cards + micro-step interactions.
6. Polish bottom navigation and screen transitions.
7. Add/upgrade task completion feedback and confetti.
8. Polish onboarding.
9. Polish voice demo.
10. Polish dashboard/stats.
11. Polish paywall.
12. Final pass for safe areas, keyboard behavior, touch targets, performance, and visual consistency.
13. Run TypeScript + Expo Doctor and test the full flow in Expo Go.

## How to work with the user

The user prefers a **step-by-step executable process**. Give concrete instructions and make changes in small, verifiable stages rather than dumping a huge migration plan.

When a change is made, explain:

- what changed
- which file(s) changed
- how to test it in Expo
- what should look/behave differently

Then move to the next polish item.

## Do not lose the product goal

The user has repeatedly noted that the current Expo version does **not yet look like the polished AI Studio version**. That is intentional and is the reason Phase 3B exists.

The next agent should treat the current working native app as the foundation and now focus on making it feel like the finished Weave product.
