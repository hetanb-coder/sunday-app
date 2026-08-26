import type { CollaborationMode } from '../backend/domainTypes';

export type GoalStepGenerationContext = {
  title: string;
  category: string;
  dueAt?: string;
  relationshipMode: CollaborationMode;
};

const normalizeTitle = (value: string) => value.replace(/\s+/g, ' ').trim();
const hasEmbeddedNumbering = (value: string) => /^(?:\d+[.)]|[-*•])\s+/.test(value);

export const parseGeneratedGoalSteps = (value: unknown): string[] | null => {
  if (!value || typeof value !== 'object') return null;
  const steps = (value as { steps?: unknown }).steps;
  if (!Array.isArray(steps) || steps.length !== 3) return null;
  const titles = steps.map((step) => {
    if (!step || typeof step !== 'object') return null;
    const title = (step as { title?: unknown }).title;
    return typeof title === 'string' ? normalizeTitle(title) : null;
  });
  if (titles.some((title) => !title || title.length > 140 || hasEmbeddedNumbering(title))) return null;
  const normalized = titles as string[];
  if (new Set(normalized.map((title) => title.toLocaleLowerCase())).size !== 3) return null;
  return normalized;
};
