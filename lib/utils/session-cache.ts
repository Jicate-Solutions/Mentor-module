'use client';

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Read a value from sessionStorage cache.
 * Returns null if missing, expired, or unparseable.
 */
export function readCache<T>(key: string, ttl: number = DEFAULT_TTL): T | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > ttl) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

/**
 * Write a value to sessionStorage cache with a timestamp.
 * Silently ignores QuotaExceededError.
 */
export function writeCache<T>(key: string, data: T): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // sessionStorage full — silently degrade
  }
}

/**
 * Remove a specific cache entry.
 */
export function clearCache(key: string): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * Remove all cache entries whose key starts with the given prefix.
 */
export function clearCacheByPrefix(prefix: string): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
    keys.forEach(k => sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
}
