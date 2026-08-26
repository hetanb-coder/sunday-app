alter table public.profiles
  add column onboarding_completed boolean not null default false,
  add column onboarding_intent text,
  add column onboarding_step text not null default 'profile';

alter table public.profiles
  add constraint profiles_onboarding_intent_check
  check (
    onboarding_intent is null
    or onboarding_intent in ('self', 'partner', 'friends', 'family')
  ),
  add constraint profiles_onboarding_step_check
  check (onboarding_step in ('profile', 'intent', 'invite', 'complete'));

comment on column public.profiles.onboarding_completed is
  'True after the member finishes the production onboarding flow.';
comment on column public.profiles.onboarding_intent is
  'Non-binding first-run context used for future personalization.';
comment on column public.profiles.onboarding_step is
  'Last durable onboarding checkpoint for session restoration.';
