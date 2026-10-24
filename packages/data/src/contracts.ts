import type { HourLog, HourPlan, SyncConflict, UserSettings } from '../../core/src/index.ts';

export type MutationState = 'pending' | 'syncing' | 'applied' | 'conflict' | 'failed';
export type MutationEntity = 'hour_log' | 'hour_plan' | 'user_settings';
export type MutationOperation = 'upsert' | 'delete';

export interface OfflineMutation<T = unknown> {
  id: string;
  entity: MutationEntity;
  entityKey: string;
  operation: MutationOperation;
  payload: T;
  expectedVersion: number | null;
  createdAt: string;
  attempts: number;
  state: MutationState;
  lastErrorCode: string | null;
}

export interface HourLogRepository {
  get(date: string, hour: number): Promise<HourLog | null>;
  listDay(date: string): Promise<HourLog[]>;
  listRange(from: string, through: string): Promise<HourLog[]>;
  save(log: HourLog, expectedVersion: number | null): Promise<HourLog>;
}

export interface HourPlanRepository {
  get(date: string, hour: number): Promise<HourPlan | null>;
  save(plan: HourPlan, expectedVersion: number | null): Promise<HourPlan>;
}

export interface SettingsRepository {
  get(): Promise<UserSettings>;
  save(settings: UserSettings, expectedVersion: number | null): Promise<UserSettings>;
}

export interface OfflineMutationQueue {
  enqueue<T>(mutation: OfflineMutation<T>): Promise<void>;
  peek(): Promise<OfflineMutation | null>;
  list(states?: MutationState[]): Promise<OfflineMutation[]>;
  update(id: string, patch: Partial<Pick<OfflineMutation, 'attempts' | 'state' | 'lastErrorCode'>>): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface ConflictRepository {
  listOpen(): Promise<SyncConflict[]>;
  resolve(id: string, choice: 'local' | 'cloud'): Promise<void>;
}

export interface PlatformCapabilities {
  notifications: 'native-reliable' | 'browser-best-effort' | 'extension-while-running' | 'unsupported';
  persistentGoal: boolean;
  offlineWrites: boolean;
  csvExport: boolean;
}
