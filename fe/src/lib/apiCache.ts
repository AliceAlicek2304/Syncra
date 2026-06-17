interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const store = new Map<string, CacheEntry>();

export function cached<T>(key: string, fn: () => Promise<T>, ttlMs: number = 30000): Promise<T> {
  const entry = store.get(key);
  if (entry && Date.now() - entry.timestamp < ttlMs) {
    return Promise.resolve(entry.data as T);
  }
  return fn().then(data => {
    store.set(key, { data, timestamp: Date.now() });
    return data;
  });
}

export function invalidateCache(pattern?: string) {
  if (!pattern) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.includes(pattern)) {
      store.delete(key);
    }
  }
}
