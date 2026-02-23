import { get, set, del } from 'idb-keyval';

/**
 * IndexedDB-backed storage with automatic migration from localStorage.
 * 
 * On first read for a key, if IndexedDB is empty but localStorage has data,
 * the data is migrated automatically and the localStorage entry is removed.
 * 
 * IndexedDB has virtually unlimited storage (50%+ of disk), compared to
 * localStorage's ~5-10MB limit. This solves QuotaExceededError for projects
 * that contain large base64 images.
 */

const migrated = new Set<string>();

/**
 * Get a value from IndexedDB, with automatic migration from localStorage.
 */
export async function storageGet<T = any>(key: string): Promise<T | undefined> {
    try {
        const value = await get<T>(key);
        if (value !== undefined) {
            return value;
        }

        // IndexedDB is empty for this key — check localStorage for migration
        if (!migrated.has(key)) {
            migrated.add(key);
            const lsValue = localStorage.getItem(key);
            if (lsValue) {
                try {
                    const parsed = JSON.parse(lsValue) as T;
                    // Migrate to IndexedDB
                    await set(key, parsed);
                    // Remove from localStorage to free space
                    localStorage.removeItem(key);
                    console.info(`[storage] Migrated "${key}" from localStorage to IndexedDB`);
                    return parsed;
                } catch (parseErr) {
                    console.warn(`[storage] Failed to parse localStorage "${key}":`, parseErr);
                }
            }
        }

        return undefined;
    } catch (err) {
        console.error(`[storage] IndexedDB get failed for "${key}", falling back to localStorage:`, err);
        // Fallback: try localStorage directly
        const lsValue = localStorage.getItem(key);
        if (lsValue) {
            try { return JSON.parse(lsValue) as T; } catch { /* ignore */ }
        }
        return undefined;
    }
}

/**
 * Set a value in IndexedDB.
 */
export async function storageSet<T = any>(key: string, value: T): Promise<void> {
    try {
        await set(key, value);
        // If localStorage still has this key, remove it to free space
        if (localStorage.getItem(key) !== null) {
            localStorage.removeItem(key);
        }
    } catch (err) {
        console.error(`[storage] IndexedDB set failed for "${key}":`, err);
        // Last-resort fallback: try localStorage (will likely fail for large data too)
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (lsErr) {
            console.error(`[storage] localStorage fallback also failed:`, lsErr);
            throw lsErr;
        }
    }
}

/**
 * Remove a value from IndexedDB (and localStorage if present).
 */
export async function storageRemove(key: string): Promise<void> {
    try {
        await del(key);
    } catch (err) {
        console.error(`[storage] IndexedDB delete failed for "${key}":`, err);
    }
    try {
        localStorage.removeItem(key);
    } catch { /* ignore */ }
}
