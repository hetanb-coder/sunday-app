import type { CreateBackendGoal } from '../backend/repositories/goalRepository';
import type { VoiceProposal } from './voiceDumpFixture';

const categories = new Set(['work', 'life', 'health', 'money', 'growth', 'quick']);
const localNoonIso = (date: Date) => { const result = new Date(date); result.setHours(12, 0, 0, 0); return result.toISOString(); };
const addDays = (date: Date, days: number) => { const result = new Date(date); result.setDate(result.getDate() + days); return result; };
const nextWeekday = (date: Date, weekday: number) => addDays(date, (weekday - date.getDay() + 7) % 7 || 7);

export const resolveVoiceDueAt = (label: string, now = new Date()): string | undefined => {
  const normalized = label.trim().toLowerCase().replace(/^by\s+/, '');
  if (!normalized || ['no date', 'ongoing', 'not sure yet'].includes(normalized)) return undefined;
  if (normalized === 'today') return localNoonIso(now);
  if (normalized === 'tomorrow') return localNoonIso(addDays(now, 1));
  if (normalized === 'this weekend') return localNoonIso(nextWeekday(addDays(now, -1), 6));
  if (normalized === 'next week') return localNoonIso(nextWeekday(now, 1));
  if (normalized === 'this week') return localNoonIso(nextWeekday(addDays(now, -1), 0));
  if (normalized === 'end of month') return localNoonIso(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const weekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(normalized);
  if (weekday >= 0) return localNoonIso(nextWeekday(now, weekday));
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (isoDate) {
    const parsed = new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]));
    if (parsed.getFullYear() === Number(isoDate[1]) && parsed.getMonth() === Number(isoDate[2]) - 1 && parsed.getDate() === Number(isoDate[3])) return localNoonIso(parsed);
  }
  return undefined;
};

export const mapVoiceProposalsToCanonical = (proposals: VoiceProposal[], now = new Date()): CreateBackendGoal[] => {
  if (proposals.length < 1 || proposals.length > 12) throw new Error('Invalid voice proposal count');
  return proposals.map((proposal) => {
    const title = proposal.title.trim();
    const category = proposal.category.toLowerCase();
    const microtasks = proposal.steps.map((step) => step.trim());
    if (proposal.unresolved || title.length < 1 || title.length > 240 || !categories.has(category)) throw new Error('Invalid voice proposal');
    if (microtasks.length > 24 || microtasks.some((step) => step.length < 1 || step.length > 300)) throw new Error('Invalid voice proposal steps');
    return { title, category, collaborationMode: 'private', dueAt: resolveVoiceDueAt(proposal.when, now), dueHasTime: false, microtasks: microtasks.map((step) => ({ title: step })) };
  });
};

export const createVoiceCommitKey = () => {
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  if (!bytes.some(Boolean)) for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
