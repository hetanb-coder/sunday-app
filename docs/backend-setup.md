# Weave Supabase foundation

The app currently has two deliberate data modes:

- **Local mode** is the default when Supabase environment variables are absent. The existing polished in-memory UI remains authoritative.
- **Supabase mode** starts when both public environment variables are present. Authentication, UUID identity, Home goals, lifecycle mutations, real connections, and Together goal data are backed by Supabase.

No local or demo goal is uploaded automatically.

## 1. Create and configure Supabase

1. Create a Supabase project.
2. In Project Settings → API, copy the project URL and publishable client key.
3. Copy `.env.example` to `.env.local` and provide:

   ```bash
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
   ```

4. Never put a service-role key in Expo environment variables or client code.
5. Restart Metro after changing environment values:

   ```bash
   npx expo start --clear
   ```

## 2. Apply the database migration

The schema is versioned by the SQL files in `supabase/migrations/`. Apply all
pending migrations in timestamp order. Voice persistence specifically requires
`202608200001_voice_goal_batch_commit.sql`; it creates the atomic, idempotent
`create_voice_goals` RPC and its per-user commit ledger.

With the Supabase CLI:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Alternatively, run the migration once in the Supabase SQL editor for a new development project.

If Voice review shows “Couldn’t add those just yet,” confirm that Expo was
restarted after setting `.env.local` and that `npx supabase db push` applied the
Voice batch migration. In development, the console entry beginning with
`[Voice persistence] commit failed` includes the safe Supabase error code,
message, details, and hint. A missing RPC commonly appears as `PGRST202`.

The migration creates:

- `profiles`
- `connection_invites`
- `connections`
- `goals`
- `goal_members`
- `goal_supporters`
- `microtasks`
- updated-at and profile-creation triggers
- atomic `accept_connection_invite` RPC
- RLS policies and scoped Realtime publication entries

## 3. Authentication settings

The temporary development auth screen uses email and password.

- For the simplest two-device development test, either disable email confirmation in the development project or confirm each address normally.
- Production authentication policy should be decided before launch.
- Session persistence uses React Native AsyncStorage. Token refresh is active only while the native app is active.

## 4. Create development accounts

1. Start Expo with Supabase configured.
2. Create user A through the development auth screen.
3. Confirm the email if confirmation is enabled.
4. Sign in. The signup trigger should create `profiles` automatically.
5. Repeat on a second device/session for user B.

The repository supports sign-out through `authRepository.signOut()`. A production account/settings surface has intentionally not been designed yet.

## 5. Basic backend verification

Use the development-only `BACKEND` harness available to signed-in Supabase users:

1. User A calls `connectionRepository.createInvite({ inviteeEmail: userBEmail, relationshipType: 'friend' })`.
2. User B calls `connectionRepository.acceptInvite(inviteCode)`.
3. Both call `connectionRepository.listMine()` and should see one connection.
4. User A creates private, shared, and supported goals through `goalRepository.create()`.
5. Verify:
   - B cannot select A's private goal.
   - B can select a shared goal only after membership is inserted.
   - B can read a supported goal only as its explicit supporter.
   - B is not an owner or shared member of that supported goal.
   - An unrelated user C cannot select or mutate any of those rows.
6. Update a shared microtask as A and B. User C must receive an authorization error.

## 6. Type generation

`src/backend/database.types.ts` defines the checked-in schema type used before a project is linked. After applying migrations, regenerate it from the real project and review the diff:

```bash
npx supabase gen types typescript --linked > src/backend/database.types.ts
```

Do not generate types with a service-role key in the app.

## 7. Architecture boundary

```text
UI
  → workspace domain actions/mappers
    → repository boundary
      → Supabase repositories

Local mode
  → existing in-memory AppContent store
```

Visual components must not call `supabase.from(...)` directly. Remote writes are wrapped in optimistic domain actions so goal and microtask interactions remain immediate. Failed writes show safe feedback and revalidate the authoritative remote state.

Current remote repositories provide:

- authentication and session lifecycle
- profile reads/updates
- connection and invitation actions
- accessible goal loading and creation
- goal lifecycle updates
- microtask updates
- a scoped per-goal Realtime subscription primitive

The signed-in app subscribes only to accessible Shared goals already present in the hydrated workspace. Entering Together also revalidates goals, connections, and pending invites.

## 8. Deliberately deferred

- intentional local/demo-data import
- invite deep links and email delivery
- account settings and production auth design
- global Realtime subscriptions
- offline queue/conflict resolution
- parent/child authorization semantics

These are migration/integration tasks, not schema prerequisites.

## 9. Production onboarding migration

Production onboarding state is added by
`supabase/migrations/202608170001_production_onboarding.sql`. Apply it with
`npx supabase db push`, then regenerate `src/backend/database.types.ts` from the
linked project. Existing profiles intentionally receive
`onboarding_completed = false`, so development users A and B will walk through
the production onboarding once; completion is then durable on the profile.

## 10. Social auth status

Email/password is the production-ready provider in the current repository.
Apple and Google buttons are hidden in production and shown as disabled setup
slots only in development until their external provider configuration is ready.

For native Sign in with Apple:

1. Install the SDK-compatible package with
   `npx expo install expo-apple-authentication`.
2. Set `expo.ios.usesAppleSignIn` to `true` and add
   `expo-apple-authentication` to the config plugins.
3. Enable Sign in with Apple for `com.hetanb.weave` in Apple Developer and
   configure the Apple provider credentials in Supabase Auth.
4. Establish the Supabase session from the native Apple identity token with a
   securely generated nonce. Rebuild the native app after the capability change.

For Google:

1. Create the required OAuth client IDs in Google Cloud for the platforms being
   shipped and enable the Google provider in Supabase Auth.
2. Add the Supabase callback URL shown in the provider settings to Google's
   authorized redirect URIs, and add the app's `weave` callback to the Supabase
   redirect allow list.
3. Implement the Expo AuthSession/WebBrowser authorization-code flow (or the
   chosen supported native provider) without placing a client secret in Expo
   code. Rebuild if the selected provider adds native configuration.

The durable `incomingInviteContext` module is the handoff boundary for the next
invite-link pass: the future link listener should save an invite code before
auth and clear it only after the invite has been accepted or explicitly
dismissed.
