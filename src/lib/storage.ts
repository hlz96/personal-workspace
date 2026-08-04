import type { WorkspaceData } from '@/types';

const KEY = 'personal-workspace:v1';

export const storage = {
  load(): WorkspaceData | null {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw) as WorkspaceData;
    } catch {
      return null;
    }
  },
  save(data: WorkspaceData) {
    localStorage.setItem(KEY, JSON.stringify(data));
  },
  clear() {
    localStorage.removeItem(KEY);
  },
  export(): string {
    const raw = localStorage.getItem(KEY) ?? '{}';
    return raw;
  },
  import(json: string): boolean {
    try {
      const parsed = JSON.parse(json);
      if (!parsed || typeof parsed !== 'object') return false;
      localStorage.setItem(KEY, JSON.stringify(parsed));
      return true;
    } catch {
      return false;
    }
  },
};

export const STORAGE_KEY = KEY;
