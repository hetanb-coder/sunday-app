export type OnboardingEvent =
  | 'welcome_viewed'
  | 'signup_started'
  | 'signup_completed'
  | 'profile_completed'
  | 'intent_selected'
  | 'invite_created'
  | 'onboarding_completed';

export const recordOnboardingEvent = (
  event: OnboardingEvent,
  properties?: Record<string, string | boolean | null>
) => {
  if (__DEV__) console.info('[Sunday onboarding]', event, properties ?? {});
};
