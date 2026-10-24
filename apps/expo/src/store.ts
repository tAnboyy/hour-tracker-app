import { create } from 'zustand';
import { getSettings, saveSettings } from './repo';
import type { Settings } from './types';

interface AppState {
  settings: Settings;
  /** Bumped whenever logs change so screens can re-query. */
  version: number;
  bump: () => void;
  setSettings: (s: Settings) => void;
}

export const useApp = create<AppState>((set) => ({
  settings: getSettings(),
  version: 0,
  bump: () => set((st) => ({ version: st.version + 1 })),
  setSettings: (s) => {
    saveSettings(s);
    set({ settings: s });
  },
}));
