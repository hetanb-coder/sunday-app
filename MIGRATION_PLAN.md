# Weave Native iOS Migration Plan

## Goal

Migrate Weave from the current mixed React/Vite web + partial Expo implementation into a genuine React Native + Expo iOS application. The existing web implementation is the product reference and source of business/UI behavior; the native `App.tsx` is only a partial prototype and is not the source of truth for product completeness.

The target is **not** a WebView wrapper and does not use Capacitor.

## Current repository assessment

The repository currently contains three overlapping layers:

1. **Feature-rich web implementation** under `src/` using React DOM, Tailwind/CSS, `motion/react`, `lucide-react`, browser storage, and browser-oriented components.
2. **Partial React Native prototype** in root `App.tsx` plus Expo starter files. This proves the native direction has already been started, but it contains simplified placeholder functionality compared with the web implementation.
3. **Express + Gemini backend** in `server.ts`, currently combined with Vite development/static serving.

The migration should preserve the product behavior from the feature-rich web implementation while rebuilding the presentation layer natively.

## Source-of-truth principle

- Product behavior and complete UX: existing `src/screens`, `src/components`, `src/context`, and `src/types`.
- Native implementation reference: root `App.tsx` for existing native styling, colors, basic onboarding/paywall/navigation concepts only.
- Backend/AI behavior: `server.ts`.

## File-by-file disposition

### Keep / adapt

| File | Action | Notes |
|---|---|---|
| `src/types.ts` | KEEP/ADAPT | Preserve `Task`, `MicroStep`, `CategoryType`, `TabType`, `ToastMessage`; move to `src/types/index.ts` later if useful. |
| `README.md` | REWRITE | Document the new Expo/iOS workflow, backend requirements, and local development. |
| `.gitignore` | KEEP/UPDATE | Add Expo/EAS/native build artifacts and local env files as needed. |
| `AGENTS.md` | KEEP/UPDATE | Add architecture and safety rules for future coding agents. |
| `.vscode/*` | KEEP | Developer tooling; review after migration. |
| `.claude/*` | KEEP | Existing agent configuration; review for web-specific assumptions. |

### Rewrite as native

| File | Action | Native replacement |
|---|---|---|
| `App.tsx` | REWRITE | Expo Router root/layout/provider architecture. The current file is a simplified native prototype and should not remain the final monolithic app. |
| `app/index.tsx` | REWRITE | Expo Router entry/redirect into onboarding or main app. |
| `src/context/WeaveContext.tsx` | REWRITE/REUSE LOGIC | Preserve task/business rules; replace `localStorage` with a native storage service and replace browser confetti. |
| `src/navigation/TabNavigator.tsx` | REWRITE | Native tab/navigation component using Expo Router and React Native animation. Preserve the existing animated pill concept. |
| `src/screens/HomeScreen.tsx` | REWRITE UI / REUSE BEHAVIOR | This is the primary product screen. Convert DOM/Tailwind/motion UI to React Native. Split into reusable components. |
| `src/screens/DashboardScreen.tsx` | REWRITE UI | Preserve analytics/flow content and interactions. |
| `src/screens/InteractiveVoiceDemoScreen.tsx` | REWRITE UI + REAL VOICE | Replace demo timer behavior with native microphone/speech flow when ready; keep backend contract. |
| `src/screens/OnboardingFlowScreen.tsx` | REWRITE UI | Preserve onboarding states and content; use native navigation/layout. |
| `src/screens/PaywallScreen.tsx` | REWRITE UI | Preserve product/paywall behavior; real billing integration is a later phase. |
| `src/components/MicroStepsBottomSheet.tsx` | REWRITE | Native bottom sheet/modal. Preserve micro-step editing/completion behavior. |
| `src/components/NewTaskModal.tsx` | REWRITE | Native modal/bottom sheet and text inputs. |
| `src/components/ToastNotification.tsx` | REWRITE | Native toast/overlay. |
| `server.ts` | REFACTOR | Split API from Vite serving. Keep Gemini server-side and expose a stable HTTPS API. |
| `app.json` | REWRITE | Real app name, slug, bundle identifier, permissions, icons, splash, plugins, and iOS configuration. |
| `package.json` | REWRITE | Remove web/Capacitor stack; establish Expo/React Native dependencies and separate backend dependencies if needed. |
| `tsconfig.json` | REWRITE/ADAPT | Use Expo-compatible TypeScript configuration. |

### Delete from the final mobile app

| File/path | Reason |
|---|---|
| `src/App.tsx` | Web shell / fake mobile-frame preview. |
| `src/index.css` | Tailwind/web CSS entry. |
| `src/main.tsx` | Vite/React DOM entry. |
| `index.html` | Browser entry. |
| `vite.config.ts` | Vite-only configuration. |
| `metadata.json` | AI Studio/web metadata; not required by native app. |
| `components/EditScreenInfo.tsx` | Expo starter artifact. |
| `components/ExternalLink.tsx` | Expo starter artifact unless later proven useful. |
| `components/StyledText.tsx` | Expo starter artifact; replace with Weave typography. |
| `components/Themed.tsx` | Expo starter artifact; replace with Weave theme primitives. |
| `components/useClientOnlyValue*.ts` | Expo starter/browser-specific helpers no longer needed. |
| `components/useColorScheme*.ts` | Replace with deliberate Weave theme handling. |
| `components/__tests__/StyledText-test.js` | Starter test for deleted component. |
| `constants/Colors.ts` | Starter theme; replace with Weave design system. |

Do **not** delete the web implementation from `main`. The migration branch may remove it only after its behavior has been captured and the native implementation reaches parity. The preferred long-term cleanup is to keep the migration branch focused on the native app and preserve history in `main`/Git history.

## Current web-only dependencies to remove from the mobile package

- `@capacitor/cli`
- `@capacitor/core`
- `@capacitor/ios`
- `@tailwindcss/vite`
- `@types/canvas-confetti`
- `@vitejs/plugin-react`
- `canvas-confetti`
- `lucide-react`
- `motion`
- `react-dom`
- `vite`
- `tailwindcss`
- `autoprefixer`

These should only remain if a deliberately separated web package/backend still requires them.

## Native dependencies to evaluate/add

Use Expo-compatible packages rather than manually forcing versions. Likely requirements include:

- `expo-router`
- `react-native-safe-area-context`
- `react-native-screens`
- `@react-native-async-storage/async-storage` for non-sensitive local persistence, or a more appropriate Expo storage solution if chosen during implementation
- `expo-haptics` for feedback
- a native animation solution compatible with the chosen Expo SDK
- a native icon solution, preferably Expo-compatible
- microphone/audio/speech packages appropriate to the final voice UX
- RevenueCat or StoreKit integration only when real Pro billing is implemented

Dependencies must be installed at versions compatible with the repository's Expo SDK rather than guessed manually.

## Target architecture

```text
weave-app/
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── onboarding.tsx
│   ├── paywall.tsx
│   └── (tabs)/
│       ├── _layout.tsx
│       ├── index.tsx
│       ├── voice.tsx
│       └── flow.tsx
│
├── src/
│   ├── components/
│   │   ├── TaskCard.tsx
│   │   ├── TaskList.tsx
│   │   ├── MicroStepRow.tsx
│   │   ├── MicroStepsSheet.tsx
│   │   ├── NewTaskSheet.tsx
│   │   ├── FloatingActionButton.tsx
│   │   ├── WeaveTabBar.tsx
│   │   ├── FlowStateBadge.tsx
│   │   ├── MomentumCard.tsx
│   │   ├── FocusHeroCard.tsx
│   │   └── Toast.tsx
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── VoiceScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── OnboardingScreen.tsx
│   │   └── PaywallScreen.tsx
│   ├── context/
│   │   └── WeaveContext.tsx
│   ├── services/
│   │   ├── api.ts
│   │   ├── voice.ts
│   │   └── storage.ts
│   ├── theme/
│   │   ├── colors.ts
│   │   ├── spacing.ts
│   │   ├── typography.ts
│   │   └── index.ts
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       ├── taskUtils.ts
│       └── validation.ts
│
├── server/
│   ├── index.ts
│   └── services/
│       └── gemini.ts
│
├── assets/
├── app.json
├── eas.json
├── package.json
└── tsconfig.json
```

The exact route tree may be adjusted during implementation to match the desired onboarding/paywall flow. Do not create redundant routes merely to mirror old web tabs.

## State and persistence

Current `WeaveContext` contains valuable business logic:

- task creation/deletion
- task completion guardrail
- micro-step completion/addition
- focus hero selection
- voice task insertion
- toast lifecycle
- Pro state
- modal state

Preserve these rules. Replace `localStorage` with a service abstraction so the context does not directly depend on a storage implementation.

Target:

```text
WeaveContext
    ↓
src/services/storage.ts
    ↓
Native local persistence
```

Do not persist secrets in this layer.

## Backend / Gemini

Current `server.ts` exposes `/api/deconstruct-voice` and keeps `GEMINI_API_KEY` server-side. Preserve this security boundary.

Refactor to:

```text
iPhone
  ↓ HTTPS
Weave API
  ↓
Gemini service
  ↓
Google Gemini
```

The mobile app must never contain `GEMINI_API_KEY`.

The current backend also mounts Vite middleware/static hosting. Remove that responsibility from the backend once the native app no longer needs the web server.

The current fallback deconstruction behavior should be preserved or deliberately improved so voice task creation still works when Gemini is unavailable.

## Voice architecture

The current native prototype uses a three-second timer and fake tasks. That is only a placeholder. The real feature should eventually be:

```text
Native microphone / speech capture
        ↓
Transcript
        ↓
POST /api/deconstruct-voice
        ↓
Gemini
        ↓
Validated task payload
        ↓
WeaveContext.addTasksFromVoice()
```

Validate the response before inserting it into application state.

## Design system

The native implementation should preserve the existing Weave visual language, including the coral accent (`#FF7A59`), warm backgrounds, rounded cards, floating pill navigation, focus hero, micro-step interactions, and celebratory completion feedback.

Create a centralized theme instead of scattering hard-coded style values across large screen files.

## Componentization

The existing web Home screen and onboarding screen are large. Do not perform a mechanical HTML-to-View translation that leaves 700–900 line components intact.

Extract reusable native components for:

- task cards
- micro-step rows
- focus hero
- momentum/flow status
- category badges
- FAB
- tab bar
- bottom sheets
- toast
- onboarding option cards

The extracted components should remain presentational where possible, with application behavior exposed through context/hooks.

## Navigation

Use Expo Router as the navigation layer.

The desired product flow is:

```text
Launch
  ↓
Onboarding
  ↓
Paywall / Pro introduction (depending on final product decision)
  ↓
Main app
  ├── Home
  ├── Voice
  ├── Flow
  └── Pro
```

Do not retain the old browser `activeTab` mechanism as the primary navigation system. It can remain in context only if it represents real product state rather than route state.

## Security

- Never put Gemini API keys in Expo source, `app.json`, public environment variables, or bundled assets.
- Treat any existing `.env*` files as local-only and ensure they are ignored.
- Backend should enforce basic input validation and response validation.
- Do not trust AI-generated JSON without schema validation.
- Do not log user voice transcripts unnecessarily in production.

## Testing / acceptance criteria

Each migration phase must leave the branch in a buildable state.

Minimum acceptance criteria before calling the iOS migration complete:

1. Expo project starts successfully.
2. TypeScript passes.
3. App launches on a physical iPhone.
4. Onboarding works.
5. Navigation works.
6. Tasks render from native state.
7. Micro-step completion works.
8. Task completion guardrail works.
9. New task creation works.
10. Task deletion works.
11. Focus hero selection works.
12. Local persistence survives app restart.
13. Voice capture/transcript works when permissions are granted.
14. Voice transcript reaches backend.
15. Gemini response is validated and creates tasks.
16. Gemini key is not bundled in the app.
17. Completion celebration works natively.
18. Bottom sheets/modals work correctly with iOS keyboard/safe areas.
19. No browser-only dependencies remain in the native app package.
20. EAS development/production build succeeds.

## Migration phases

### Phase 1 — Audit

This document. No product code changes yet.

### Phase 2 — Native foundation

- establish Expo Router
- clean dependencies
- create theme/services/types structure
- establish provider/root layout
- ensure a clean iOS build

### Phase 3 — Core product UI

- Home
- task cards
- focus hero
- micro-steps
- new task
- FAB
- toast

### Phase 4 — Onboarding/navigation/paywall

- onboarding
- route guards/initial routing
- native tab bar
- paywall presentation

### Phase 5 — Persistence/business logic

- native storage
- migrate all context behavior
- validate state transitions

### Phase 6 — Voice/Gemini

- microphone permissions
- native capture/transcription
- API service
- Gemini response validation
- real voice-to-task flow

### Phase 7 — Native polish

- animations
- haptics
- safe areas
- keyboard behavior
- loading/error states
- accessibility
- performance

### Phase 8 — Device and distribution

- physical iPhone testing
- EAS development build
- production build
- TestFlight
- App Store preparation

## Immediate next action

Do not begin destructive cleanup until this audit is reviewed. Phase 2 should be implemented on `mobile-migration` and committed in small, reviewable changes. `main` must remain the untouched product reference until native parity is established.
