export type LogStatus = 'logged' | 'skipped';

export interface HourLog {
  id: string;
  date: string; // YYYY-MM-DD (local)
  hour: number; // 0-23, the hour this row describes (hour:00 → hour+1:00)
  did: string;
  next: string; // plan for hour+1
  goal: string; // what was planned for this hour
  tags: string; // comma-separated, parsed from #tags in `did`
  status: LogStatus;
  backfilled: number; // 1 if logged after the hour had already passed
  logged_at: string; // ISO
  updated_at: string; // ISO
  synced_at: string | null;
}

export interface Settings {
  startHour: number; // first active hour, inclusive (e.g. 8 → first ping window 8:00-9:00)
  endHour: number; // last active hour, exclusive (e.g. 23 → last tracked hour 22:00-23:00)
  activeDays: number[]; // JS getDay() values, 0=Sunday
}

export const DEFAULT_SETTINGS: Settings = {
  startHour: 8,
  endHour: 23,
  activeDays: [0, 1, 2, 3, 4, 5, 6],
};

export interface DayStatus {
  date: string;
  missing: number[]; // active hours with no row
  logged: number;
  skipped: number;
  active: number;
}
