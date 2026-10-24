const memory = new Map<string, string>();

function browserStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function kvGet(key: string): string | null {
  return browserStorage()?.getItem(`hour-tracker:${key}`) ?? memory.get(key) ?? null;
}

export function kvSet(key: string, value: string): void {
  const storage = browserStorage();
  if (storage) storage.setItem(`hour-tracker:${key}`, value);
  else memory.set(key, value);
}

export function kvDelete(key: string): void {
  browserStorage()?.removeItem(`hour-tracker:${key}`);
  memory.delete(key);
}
