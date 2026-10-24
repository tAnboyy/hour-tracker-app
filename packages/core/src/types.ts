export type LogStatus = 'logged' | 'skipped';

export interface HourLog {
  id: string;
  date: string;
  hour: number;
  did: string;
  next: string;
  goal: string;
  tags: string[];
  status: LogStatus;
  backfilled: boolean;
  loggedAt: string;
  updatedAt: string;
  version: number;
}

export interface HourPlan {
  id: string;
  date: string;
  hour: number;
  goal: string;
  updatedAt: string;
  version: number;
}

export interface UserSettings {
  startHour: number;
  endHour: number;
  activeDays: number[];
  timezone: string;
  updatedAt: string | null;
  version: number;
}

export interface Profile {
  userId: string;
  timezone: string;
  trackingStartDate: string;
  onboardingVersion: number;
  createdAt: string;
  updatedAt: string;
}

export type ConflictEntity = 'hour_log' | 'hour_plan' | 'user_settings';

export interface SyncConflict<T = unknown> {
  id: string;
  entity: ConflictEntity;
  entityKey: string;
  localValue: T;
  cloudValue: T;
  createdAt: string;
  resolvedAt: string | null;
}

export const DEFAULT_SETTINGS: Omit<UserSettings, 'timezone'> = {
  startHour: 8,
  endHour: 23,
  activeDays: [0, 1, 2, 3, 4, 5, 6],
  updatedAt: null,
  version: 0,
};
