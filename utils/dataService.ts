/**
 * ============================================================================
 * PLUTO WALLET - UNIFIED CLOUD-FIRST DATA SERVICE
 * ============================================================================
 * 
 * Primary storage: Supabase Database (cloud, cross-device sync)
 * Cache & Offline storage: In-memory cache + localStorage (fast reads, offline support)
 * 
 * Strategy:
 * - WRITE: Write to Supabase cloud, and instantly update in-memory cache & localStorage
 * - READ: Ultra-fast read from in-memory cache / localStorage, synced from cloud on init
 * - REALTIME: Supabase Realtime subscription listens for changes across sessions/devices
 * - OFFLINE: Automatically queues writes if offline and syncs them once reconnected
 * - INIT: On app start, initCloudSync() synchronizes all database data
 * 
 * ============================================================================
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

// Supported table names with priority
const CANDIDATE_TABLES = ['pluto_kv_store', 'kv_store', 'kv_store_905856fc'];
let activeTable = 'pluto_kv_store';
let isRealtimeSubscribed = false;

// In-memory cache for instant synchronous access
const memoryCache = new Map<string, string>();

// Track online status
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => { 
        isOnline = true; 
        console.log('[DataService] Back online - syncing pending writes...');
        syncPendingWrites(); 
    });
    window.addEventListener('offline', () => { 
        isOnline = false; 
        console.log('[DataService] Device is offline - writes will be queued locally');
    });
}

// Queue for writes that failed due to being offline or table issues
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
                let parsed: any;
                try {
                    parsed = JSON.parse(item.value);
                } catch {
                    parsed = item.value;
                }
                const { error } = await supabase
                    .from(activeTable)
                    .upsert({ key: item.key, value: parsed });
                if (!error) {
                    clearPendingWrite(item.key);
                }
            } else if (item.action === 'remove') {
                const { error } = await supabase
                    .from(activeTable)
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
        let parsed: any;
        try {
            parsed = JSON.parse(value);
        } catch {
            parsed = value;
        }

        const { error } = await supabase
            .from(activeTable)
            .upsert({ key, value: parsed });

        if (error) {
            // Check if table missing
            if (error.code === 'PGRST205') {
                console.warn(`[DataService] Table '${activeTable}' not found. Please run supabase/setup_database.sql in Supabase SQL editor.`);
            } else {
                console.warn(`[DataService] Supabase write error for "${key}":`, error.message);
            }
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
            .from(activeTable)
            .select('value')
            .eq('key', key)
            .maybeSingle();

        if (error) {
            console.warn(`[DataService] Supabase read error for "${key}":`, error.message);
            return null;
        }

        if (!data || data.value === undefined) return null;
        return typeof data.value === 'string' ? data.value : JSON.stringify(data.value);
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
            .from(activeTable)
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

/**
 * Set up Supabase Realtime channel subscription
 */
function setupRealtimeSubscription() {
    if (isRealtimeSubscribed || !isSupabaseConfigured() || typeof window === 'undefined') return;

    try {
        const channel = supabase
            .channel('pluto_db_sync')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: activeTable },
                (payload: any) => {
                    console.log(`[DataService] Realtime DB event [${payload.eventType}] on ${payload.table}:`, payload);
                    
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        const newKey = payload.new?.key;
                        const newValue = payload.new?.value;
                        if (newKey && newValue !== undefined) {
                            const stringVal = typeof newValue === 'string' ? newValue : JSON.stringify(newValue);
                            memoryCache.set(newKey, stringVal);
                            localStorage.setItem(newKey, stringVal);

                            // Dispatch generic event
                            window.dispatchEvent(new CustomEvent('pluto_data_updated', {
                                detail: { key: newKey, value: newValue }
                            }));

                            // Specific event for wallet
                            if (newKey === 'pluto_wallet') {
                                window.dispatchEvent(new CustomEvent('walletDataUpdated', {
                                    detail: { walletData: newValue }
                                }));
                            }
                        }
                    } else if (payload.eventType === 'DELETE') {
                        const oldKey = payload.old?.key;
                        if (oldKey) {
                            memoryCache.delete(oldKey);
                            localStorage.removeItem(oldKey);
                            window.dispatchEvent(new CustomEvent('pluto_data_removed', {
                                detail: { key: oldKey }
                            }));
                        }
                    }
                }
            )
            .subscribe((status: string) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`[DataService] Supabase Realtime active on '${activeTable}'`);
                    isRealtimeSubscribed = true;
                }
            });
    } catch (err) {
        console.warn('[DataService] Failed to set up Realtime subscription:', err);
    }
}

// ============================================================================
// PUBLIC API - Drop-in replacement for localStorage with cloud sync
// ============================================================================

export const dataService = {
    /**
     * Get item - reads from in-memory cache first, then localStorage
     */
    getItem(key: string): string | null {
        if (memoryCache.has(key)) {
            return memoryCache.get(key) || null;
        }
        const localVal = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
        if (localVal !== null) {
            memoryCache.set(key, localVal);
        }
        return localVal;
    },

    /**
     * Set item - writes to memory cache and localStorage immediately, 
     * then syncs to Supabase cloud in the background
     */
    setItem(key: string, value: string): void {
        memoryCache.set(key, value);
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(key, value);
        }

        if (isOnline && isSupabaseConfigured()) {
            writeToSupabase(key, value).then(success => {
                if (!success) {
                    addPendingWrite(key, value, 'set');
                }
            });
        } else {
            addPendingWrite(key, value, 'set');
        }
    },

    /**
     * Remove item - removes from memory cache, localStorage, and Supabase cloud
     */
    removeItem(key: string): void {
        memoryCache.delete(key);
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(key);
        }

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
     * Get item with Supabase-first read (for critical cloud-fresh data)
     */
    async getItemAsync(key: string): Promise<string | null> {
        if (isOnline && isSupabaseConfigured()) {
            const supabaseValue = await readFromSupabase(key);
            if (supabaseValue !== null) {
                memoryCache.set(key, supabaseValue);
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(key, supabaseValue);
                }
                return supabaseValue;
            }
        }
        return this.getItem(key);
    },

    /**
     * Set item with await (waits for Supabase write to complete)
     */
    async setItemAsync(key: string, value: string): Promise<void> {
        memoryCache.set(key, value);
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(key, value);
        }

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
     * Primary Cloud Initialization:
     * 1. Detects active table in Supabase
     * 2. Fetches all keys from Supabase into memory cache and localStorage
     * 3. Migrates any existing local data up to Supabase if missing
     * 4. Subscribes to Supabase Realtime updates
     */
    async initCloudSync(): Promise<{ success: boolean; cloudItems: number; pushedItems: number }> {
        if (!isSupabaseConfigured()) {
            console.log('[DataService] Supabase not configured. Using local cache.');
            return { success: false, cloudItems: 0, pushedItems: 0 };
        }

        console.log('🔄 [DataService] Initializing cloud sync with Supabase...');

        // 1. Detect active table
        let targetTable = activeTable;
        for (const candidate of CANDIDATE_TABLES) {
            try {
                const { error } = await supabase.from(candidate).select('key').limit(1);
                if (!error) {
                    targetTable = candidate;
                    activeTable = candidate;
                    break;
                } else if (error.code !== 'PGRST205') {
                    // Table exists but maybe other error (e.g. empty)
                    targetTable = candidate;
                    activeTable = candidate;
                    break;
                }
            } catch {
                // Continue to next candidate
            }
        }

        // 2. Fetch all cloud keys
        let cloudCount = 0;
        let cloudKeys = new Set<string>();

        try {
            const { data, error } = await supabase
                .from(activeTable)
                .select('key, value');

            if (error) {
                if (error.code === 'PGRST205') {
                    console.warn(`⚠️ [DataService] Supabase table '${activeTable}' does not exist yet. Please run 'supabase/setup_database.sql' in your Supabase SQL Editor.`);
                } else {
                    console.warn('[DataService] Cloud fetch error:', error.message);
                }
            } else if (data && data.length > 0) {
                cloudCount = data.length;
                console.log(`☁️ [DataService] Loaded ${cloudCount} records from Supabase database`);
                
                for (const row of data) {
                    cloudKeys.add(row.key);
                    const valStr = typeof row.value === 'string' ? row.value : JSON.stringify(row.value);
                    memoryCache.set(row.key, valStr);
                    if (typeof localStorage !== 'undefined') {
                        localStorage.setItem(row.key, valStr);
                    }
                }
            }
        } catch (err) {
            console.warn('[DataService] Failed to load data from Supabase:', err);
        }

        // 3. Push any local-only data to cloud (migration / synchronization)
        let pushedCount = 0;
        if (typeof localStorage !== 'undefined') {
            const localKeysToSync = Object.keys(localStorage).filter(k => 
                (k.startsWith('pluto_') || k === 'darkMode') && !k.startsWith('__pluto_pending_writes')
            );

            const missingInCloud = localKeysToSync.filter(k => !cloudKeys.has(k));
            if (missingInCloud.length > 0) {
                console.log(`📤 [DataService] Pushing ${missingInCloud.length} local items to Supabase cloud...`);
                const rows = missingInCloud.map(key => {
                    const raw = localStorage.getItem(key);
                    let val: any;
                    try {
                        val = raw ? JSON.parse(raw) : raw;
                    } catch {
                        val = raw;
                    }
                    return { key, value: val };
                });

                for (let i = 0; i < rows.length; i += 50) {
                    const batch = rows.slice(i, i + 50);
                    const { error } = await supabase.from(activeTable).upsert(batch);
                    if (!error) {
                        pushedCount += batch.length;
                    }
                }
            }
        }

        // 4. Sync any pending offline writes
        await syncPendingWrites();

        // 5. Connect Realtime subscription
        setupRealtimeSubscription();

        return { success: true, cloudItems: cloudCount, pushedItems: pushedCount };
    },

    /**
     * Backward-compatible syncAllFromCloud method
     */
    async syncAllFromCloud(): Promise<void> {
        await this.initCloudSync();
    },

    /**
     * Push all local data to Supabase
     */
    async pushAllToCloud(): Promise<{ success: boolean; count: number }> {
        if (!isSupabaseConfigured() || typeof localStorage === 'undefined') {
            return { success: false, count: 0 };
        }

        try {
            const keys = Object.keys(localStorage).filter(k =>
                (k.startsWith('pluto_') || k === 'darkMode') && !k.startsWith('__pluto_pending_writes')
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

            let count = 0;
            for (let i = 0; i < rows.length; i += 50) {
                const batch = rows.slice(i, i + 50);
                const { error } = await supabase.from(activeTable).upsert(batch);
                if (error) {
                    console.warn('[DataService] Push batch error:', error.message);
                    return { success: false, count };
                }
                count += batch.length;
            }

            return { success: true, count };
        } catch (err) {
            console.error('[DataService] Push to cloud failed:', err);
            return { success: false, count: 0 };
        }
    },

    /**
     * Get active Supabase table name
     */
    getActiveTable(): string {
        return activeTable;
    }
};

export default dataService;
