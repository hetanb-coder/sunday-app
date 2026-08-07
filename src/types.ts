export interface MicroStep {
  id: string;
  title: string;
  completed: boolean;
}

export type CategoryType = 'work' | 'life' | 'health' | 'money' | 'growth' | 'personal' | 'creative' | 'quick';

export interface Task {
  id: string;
  title: string;
  category: CategoryType;
  timeEstimateMinutes: number;
  isFocusHero?: boolean;
  completed: boolean;
  microSteps: MicroStep[];
  createdAt: string;
}

export type TabType = 'home' | 'voice' | 'settings' | 'paywall' | 'dashboard' | 'onboarding';

export interface ToastMessage {
  id: string;
  text: string;
  type?: 'error' | 'success' | 'info';
}
