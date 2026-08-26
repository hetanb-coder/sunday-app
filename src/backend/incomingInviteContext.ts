import AsyncStorage from '@react-native-async-storage/async-storage';

const INCOMING_INVITE_KEY = 'weave:incoming-invite-code';

const normalizeCode = (value: string) => value.trim().toUpperCase();

/**
 * Durable handoff point for the upcoming invite deep-link flow. A link handler
 * can save the code before auth starts, and onboarding/auth can complete without
 * losing the recipient's original intent.
 */
export const incomingInviteContext = {
  async save(code: string) {
    const normalized = normalizeCode(code);
    if (!normalized) return;
    await AsyncStorage.setItem(INCOMING_INVITE_KEY, normalized);
  },

  load() {
    return AsyncStorage.getItem(INCOMING_INVITE_KEY);
  },

  clear() {
    return AsyncStorage.removeItem(INCOMING_INVITE_KEY);
  },
};
