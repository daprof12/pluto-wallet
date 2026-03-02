/**
 * ============================================================================
 * PLUTO WALLET - UNIFIED DATA SERVICE
 * ============================================================================
 * 
 * Primary storage: Supabase KV store (cloud, cross-device sync)
 * Fallback storage: localStorage (offline cache, fast reads)
 * 
 * Strategy:
 * - WRITE: Write to Supabase first, then update localStorage cache
 * - READ: Read from localStorage cache first (fast), sync from Supabase in background
 * - OFFLINE: Falls back to localStorage if Supabase is unreachable
 * - INIT: On app start, sync Supabase -> localStorage to get latest data
 * 
 * This service provides a localStorage-compatible API so migration is minimal.
 * ============================================================================
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

const TABLE = 'kv_store_905856fc';

// Track online status
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => { isOnline = true; syncPendingWrites(); });
    window.addEventListener('offline', () => { isOnline = false; });
}

// Queue for writes that failed due to being offline
const PENDING_WRITES_KEY = '__pluto_pending_writes';

function getPendingWrites(): Array<{ key: string; value: string | null; action: 'set' | 'remove' }> {
    try {
        const data = localStorage.getItem(PENDING_WRITES_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

function addPendingWrite(key: string, value: string | null, action: 'set' | 'remove') {
    const pending = getPendingWrites();
    // Remove any existing pending write for this key (latest wins)
    const filtered = pending.filter(p => p.key !== key);
    filtered.push({ key, value, action });
    localStorage.setItem(PENDING_WRITES_KEY, JSON.stringify(filtered));
}

function clearPendingWrite(key: string) {
    const pending = getPendingWrites();
    const filtered = pending.filter(p => p.key !== key);
    if (filtered.length === 0) {
        localStorage.removeItem(PENDING_WRITES_KEY);
    } else {
        localStorage.setItem(PENDING_WRITES_KEY, JSON.stringify(filtered));
    }
}

/**
 * Sync any pending offline writes to Supabase
 */
async function syncPendingWrites(): Promise<void> {
    if (!isSupabaseConfigured() || !isOnline) return;

    const pending = getPendingWrites();
    if (pending.length === 0) return;

    console.log(`[DataService] Syncing ${pending.length} pending writes to Supabase...`);

    for (const item of pending) {
        try {
            if (item.action === 'set' && item.value !== null) {
                const { error } = await supabase
                    .from(TABLE)
                    .upsert({ key: item.key, value: JSON.parse(item.value) });
                if (!error) {
                    clearPendingWrite(item.key);
                }
            } else if (item.action === 'remove') {
                const { error } = await supabase
                    .from(TABLE)
                    .delete()
                    .eq('key', item.key);
                if (!error) {
                    clearPendingWrite(item.key);
                }
            }
        } catch (err) {
            console.warn(`[DataService] Failed to sync pending write for key "${item.key}":`, err);
        }
    }
}

/**
 * Write to Supabase (async, non-blocking for the caller)
 */
async function writeToSupabase(key: string, value: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    try {
        const parsed = JSON.parse(value);
        const { error } = await supabase
            .from(TABLE)
            .upsert({ key, value: parsed });

        if (error) {
            console.warn(`[DataService] Supabase write error for "${key}":`, error.message);
            return false;
        }
        return true;
    } catch (err) {
        console.warn(`[DataService] Supabase write failed for "${key}":`, err);
        return false;
    }
}

/**
 * Read from Supabase
 */
async function readFromSupabase(key: string): Promise<string | null> {
    if (!isSupabaseConfigured()) return null;

    try {
        const { data, error } = await supabase
            .from(TABLE)
            .select('value')
            .eq('key', key)
            .maybeSingle();

        if (error) {
            console.warn(`[DataService] Supabase read error for "${key}":`, error.message);
            return null;
        }

        return data ? JSON.stringify(data.value) : null;
    } catch (err) {
        console.warn(`[DataService] Supabase read failed for "${key}":`, err);
        return null;
    }
}

/**
 * Delete from Supabase
 */
async function deleteFromSupabase(key: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    try {
        const { error } = await supabase
            .from(TABLE)
            .delete()
            .eq('key', key);

        if (error) {
            console.warn(`[DataService] Supabase delete error for "${key}":`, error.message);
            return false;
        }
        return true;
    } catch (err) {
        console.warn(`[DataService] Supabase delete failed for "${key}":`, err);
        return false;
    }
}

// ============================================================================
// PUBLIC API - Drop-in replacement for localStorage
// ============================================================================

export const dataService = {
    /**
     * Get item - reads from localStorage cache (fast), 
     * optionally syncs from Supabase in background
     */
    getItem(key: string): string | null {
        return localStorage.getItem(key);
    },

    /**
     * Set item - writes to localStorage immediately, then syncs to Supabase
     */
    setItem(key: string, value: string): void {
        // 1. Write to localStorage immediately (fast, synchronous)
        localStorage.setItem(key, value);

        // 2. Write to Supabase in background (async, non-blocking)
        if (isOnline && isSupabaseConfigured()) {
            writeToSupabase(key, value).then(success => {
                if (!success) {
                    addPendingWrite(key, value, 'set');
                }
            });
        } else {
            // Queue for later sync when we're back online
            addPendingWrite(key, value, 'set');
        }
    },

    /**
     * Remove item - removes from localStorage immediately, then syncs to Supabase
     */
    removeItem(key: string): void {
        localStorage.removeItem(key);

        if (isOnline && isSupabaseConfigured()) {
            deleteFromSupabase(key).then(success => {
                if (!success) {
                    addPendingWrite(key, null, 'remove');
                }
            });
        } else {
            addPendingWrite(key, null, 'remove');
        }
    },

    /**
     * Get item with Supabase-first read (for critical data)
     * Use this when you need the absolute latest data from cloud
     */
    async getItemAsync(key: string): Promise<string | null> {
        if (isOnline && isSupabaseConfigured()) {
            const supabaseValue = await readFromSupabase(key);
            if (supabaseValue !== null) {
                // Update local cache
                localStorage.setItem(key, supabaseValue);
                return supabaseValue;
            }
        }
        // Fallback to localStorage
        return localStorage.getItem(key);
    },

    /**
     * Set item with await (waits for Supabase write to complete)
     * Use this for critical writes where you need confirmation
     */
    async setItemAsync(key: string, value: string): Promise<void> {
        localStorage.setItem(key, value);

        if (isOnline && isSupabaseConfigured()) {
            const success = await writeToSupabase(key, value);
            if (!success) {
                addPendingWrite(key, value, 'set');
            }
        } else {
            addPendingWrite(key, value, 'set');
        }
    },

    /**
     * Sync a specific key from Supabase to localStorage
     */
    async syncFromCloud(key: string): Promise<void> {
        const cloudValue = await readFromSupabase(key);
        if (cloudValue !== null) {
            localStorage.setItem(key, cloudValue);
        }
    },

    /**
     * Sync all app data from Supabase to localStorage (call on app init)
     */
    async syncAllFromCloud(): Promise<void> {
        if (!isSupabaseConfigured() || !isOnline) return;

        try {
            console.log('[DataService] Syncing all data from Supabase...');

            // Fetch all Pluto-related keys from Supabase
            const { data, error } = await supabase
                .from(TABLE)
                .select('key, value')
                .or('key.like.pluto_%,key.like.darkMode');

            if (error) {
                console.warn('[DataService] Cloud sync error:', error.message);
                return;
            }

            if (data && data.length > 0) {
                console.log(`[DataService] Syncing ${data.length} items from Supabase...`);
                for (const row of data) {
                    localStorage.setItem(row.key, JSON.stringify(row.value));
                }
                console.log('[DataService] Cloud sync complete');
            }

            // Also sync any pending offline writes
            await syncPendingWrites();
        } catch (err) {
            console.warn('[DataService] Cloud sync failed:', err);
        }
    },

    /**
     * Push all localStorage data to Supabase (initial migration)
     */
    async pushAllToCloud(): Promise<{ success: boolean; count: number }> {
        if (!isSupabaseConfigured()) {
            return { success: false, count: 0 };
        }

        try {
            const keys = Object.keys(localStorage).filter(k =>
                k.startsWith('pluto_') || k === 'darkMode'
            );

            if (keys.length === 0) {
                return { success: true, count: 0 };
            }

            console.log(`[DataService] Pushing ${keys.length} items to Supabase...`);

            const rows = keys.map(key => {
                const raw = localStorage.getItem(key);
                let value: any;
                try {
                    value = raw ? JSON.parse(raw) : raw;
                } catch {
                    value = raw;
                }
                return { key, value };
            });

            // Upsert in batches of 50
            for (let i = 0; i < rows.length; i += 50) {
                const batch = rows.slice(i, i + 50);
                const { error } = await supabase
                    .from(TABLE)
                    .upsert(batch);

                if (error) {
                    console.error(`[DataService] Push batch error:`, error.message);
                    return { success: false, count: i };
                }
            }

            console.log(`[DataService] Successfully pushed ${keys.length} items to Supabase`);
            return { success: true, count: keys.length };
        } catch (err) {
            console.error('[DataService] Push to cloud failed:', err);
            return { success: false, count: 0 };
        }
    }
};

export default dataService;
