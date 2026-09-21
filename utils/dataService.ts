/**
 * ============================================================================
 * PLUTO WALLET - UNIFIED CLOUD-FIRST DATA SERVICE
 * ============================================================================
 * 
 * Primary storage: Supabase Database (cloud, cross-device sync)
 * Tables supported:
 * - `users`: Direct relational user profiles, balances, KYC, addresses
 * - `wallets`: Direct user wallet records
 * - `transactions`: Direct transaction records
 * - `pluto_kv_store` & `kv_store`: Complete synchronized application state
 * Cache & Offline storage: In-memory cache + localStorage (fast reads, offline support)
 * 
 * Strategy:
 * - WRITE: Write directly to Supabase tables and KV store, instantly update cache & localStorage
 * - READ: Ultra-fast read from in-memory cache / localStorage, synced from cloud on init
 * - REALTIME: Supabase Realtime subscription listens for changes across sessions/devices
 * - OFFLINE: Automatically queues writes if offline and syncs them once reconnected
 * - INIT: On app start, initCloudSync() synchronizes all database data
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

    // Filter out huge keys like pluto_admin_users or pluto_wallet that are handled by direct tables
    const safePending = pending.filter(p => p.key !== 'pluto_admin_users' && p.key !== 'pluto_wallet').slice(-10);
    // Clear the pending queue to prevent repeated retry storms
    localStorage.removeItem(PENDING_WRITES_KEY);

    if (safePending.length === 0) return;
    console.log(`[DataService] Syncing ${safePending.length} pending writes to Supabase...`);

    for (const item of safePending) {
        try {
            if (item.action === 'set' && item.value !== null) {
                let parsed: any;
                try {
                    parsed = JSON.parse(item.value);
                } catch {
                    parsed = item.value;
                }
                await supabase
                    .from(activeTable)
                    .upsert({ key: item.key, value: parsed });
            } else if (item.action === 'remove') {
                await supabase
                    .from(activeTable)
                    .delete()
                    .eq('key', item.key);
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
        // 1. Channel for KV store state
        supabase
            .channel('pluto_db_sync')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: activeTable },
                (payload: any) => {
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        const newKey = payload.new?.key;
                        const newValue = payload.new?.value;
                        if (newKey && newValue !== undefined) {
                            const stringVal = typeof newValue === 'string' ? newValue : JSON.stringify(newValue);
                            memoryCache.set(newKey, stringVal);
                            localStorage.setItem(newKey, stringVal);

                            window.dispatchEvent(new CustomEvent('pluto_data_updated', {
                                detail: { key: newKey, value: newValue }
                            }));

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
            .subscribe();

        // 2. Channel for direct 'users' table updates
        supabase
            .channel('pluto_users_sync')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'users' },
                (payload: any) => {
                    console.log(`[DataService] Realtime users table event [${payload.eventType}]:`, payload);
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        const updatedUser = payload.new;
                        if (updatedUser?.id) {
                            const rawUsers = dataService.getItem('pluto_admin_users');
                            let currentUsers: any[] = rawUsers ? JSON.parse(rawUsers) : [];
                            const idx = currentUsers.findIndex(u => u.id === updatedUser.id || u.email === updatedUser.email);
                            const mapped = {
                                id: updatedUser.id,
                                email: updatedUser.email,
                                phone: updatedUser.phone || '',
                                fullName: updatedUser.full_name || '',
                                password: updatedUser.password || '',
                                kyc_status: updatedUser.kyc_status || 'pending',
                                kyc_data: updatedUser.kyc_data || null,
                                balances: updatedUser.balances || {},
                                addresses: updatedUser.addresses || {},
                                blocked: !!updatedUser.blocked,
                                is_admin: !!updatedUser.is_admin,
                                twoFactorAuth: updatedUser.two_factor_auth || {},
                                user_restriction: updatedUser.user_restriction || {},
                                last_login: updatedUser.last_login || updatedUser.created_at,
                                created_at: updatedUser.created_at
                            };
                            if (idx >= 0) {
                                currentUsers[idx] = { ...currentUsers[idx], ...mapped };
                            } else {
                                currentUsers.push(mapped);
                            }
                            const usersStr = JSON.stringify(currentUsers);
                            memoryCache.set('pluto_admin_users', usersStr);
                            if (typeof localStorage !== 'undefined') {
                                localStorage.setItem('pluto_admin_users', usersStr);
                            }
                            window.dispatchEvent(new CustomEvent('pluto_users_updated', {
                                detail: { users: currentUsers }
                            }));

                            // If updated user is the active logged-in wallet, sync balances immediately
                            const localWalletStr = dataService.getItem('pluto_wallet');
                            if (localWalletStr) {
                                try {
                                    const localW = JSON.parse(localWalletStr);
                                    const isMatch = (localW.id && localW.id === updatedUser.id) ||
                                        (localW.email && updatedUser.email && localW.email.toLowerCase() === updatedUser.email.toLowerCase());
                                    if (isMatch) {
                                        const updatedWallet = {
                                            ...localW,
                                            balances: updatedUser.balances || localW.balances,
                                            addresses: updatedUser.addresses || localW.addresses,
                                            blocked: !!updatedUser.blocked,
                                            kyc_status: updatedUser.kyc_status || localW.kyc_status
                                        };
                                        const updatedStr = JSON.stringify(updatedWallet);
                                        memoryCache.set('pluto_wallet', updatedStr);
                                        if (typeof localStorage !== 'undefined') {
                                            localStorage.setItem('pluto_wallet', updatedStr);
                                        }
                                        window.dispatchEvent(new CustomEvent('walletDataUpdated', {
                                            detail: { walletData: updatedWallet, wallet: updatedWallet }
                                        }));
                                        window.dispatchEvent(new CustomEvent('walletUpdated', {
                                            detail: { wallet: updatedWallet, walletData: updatedWallet }
                                        }));
                                    }
                                } catch {}
                            }
                        }
                    } else if (payload.eventType === 'DELETE') {
                        const deletedId = payload.old?.id;
                        if (deletedId) {
                            const rawUsers = dataService.getItem('pluto_admin_users');
                            let currentUsers: any[] = rawUsers ? JSON.parse(rawUsers) : [];
                            currentUsers = currentUsers.filter(u => u.id !== deletedId);
                            const usersStr = JSON.stringify(currentUsers);
                            memoryCache.set('pluto_admin_users', usersStr);
                            if (typeof localStorage !== 'undefined') {
                                localStorage.setItem('pluto_admin_users', usersStr);
                            }
                            window.dispatchEvent(new CustomEvent('pluto_users_updated', {
                                detail: { users: currentUsers }
                            }));
                        }
                    }
                }
            )
            .subscribe((status: string) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`[DataService] Supabase Realtime active on 'users' table`);
                    isRealtimeSubscribed = true;
                }
            });

        // 3. Channel for direct 'wallets' table updates
        supabase
            .channel('pluto_wallets_sync')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'wallets' },
                (payload: any) => {
                    console.log(`[DataService] Realtime wallets table event [${payload.eventType}]:`, payload);
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        const updatedWallet = payload.new;
                        if (updatedWallet) {
                            const localWalletStr = dataService.getItem('pluto_wallet');
                            if (localWalletStr) {
                                try {
                                    const localW = JSON.parse(localWalletStr);
                                    const isMatch = (localW.id && (localW.id === updatedWallet.id || localW.id === updatedWallet.user_id)) ||
                                        (localW.email && updatedWallet.email && localW.email.toLowerCase() === updatedWallet.email.toLowerCase()) ||
                                        (localW.userId && (localW.userId === updatedWallet.id || localW.userId === updatedWallet.user_id));
                                    if (isMatch) {
                                        const mergedWallet = {
                                            ...localW,
                                            balances: updatedWallet.balances || localW.balances,
                                            addresses: updatedWallet.addresses || localW.addresses,
                                            transactions: updatedWallet.transactions && updatedWallet.transactions.length > 0 ? updatedWallet.transactions : localW.transactions
                                        };
                                        const mergedStr = JSON.stringify(mergedWallet);
                                        memoryCache.set('pluto_wallet', mergedStr);
                                        if (typeof localStorage !== 'undefined') {
                                            localStorage.setItem('pluto_wallet', mergedStr);
                                        }
                                        window.dispatchEvent(new CustomEvent('walletDataUpdated', {
                                            detail: { walletData: mergedWallet, wallet: mergedWallet }
                                        }));
                                        window.dispatchEvent(new CustomEvent('walletUpdated', {
                                            detail: { wallet: mergedWallet, walletData: mergedWallet }
                                        }));
                                    }
                                } catch {}
                            }
                        }
                    }
                }
            )
            .subscribe((status: string) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`[DataService] Supabase Realtime active on 'wallets' table`);
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
            // If updating active wallet, automatically sync to 'wallets' table
            if (key === 'pluto_wallet') {
                try {
                    const parsed = JSON.parse(value);
                    if (parsed && (parsed.id || parsed.email)) {
                        this.syncWalletToSupabase(parsed);
                        if (parsed.id) {
                            writeToSupabase(`pluto_wallet_${parsed.id}`, value);
                        }
                    }
                } catch {}
                return; // Do NOT write to shared global 'pluto_wallet' KV key
            }

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
            // If updating active wallet, automatically sync to 'wallets' table
            if (key === 'pluto_wallet') {
                try {
                    const parsed = JSON.parse(value);
                    if (parsed && (parsed.id || parsed.email)) {
                        await this.syncWalletToSupabase(parsed);
                        if (parsed.id) {
                            await writeToSupabase(`pluto_wallet_${parsed.id}`, value);
                        }
                    }
                } catch {}
                return; // Do NOT write to shared global 'pluto_wallet' KV key
            }

            const success = await writeToSupabase(key, value);
            if (!success) {
                addPendingWrite(key, value, 'set');
            }
        } else {
            addPendingWrite(key, value, 'set');
        }
    },

    /**
     * Synchronize a specific user directly to the Supabase 'users' table
     */
    async syncUserToSupabase(user: any): Promise<boolean> {
        if (!isSupabaseConfigured() || !user?.email) return false;

        try {
            let targetId = user.id || `usr_${Date.now()}`;
            
            if (user.id && !user.id.startsWith('usr_temp_')) {
                // If user with this email has an old/different ID in the database, remove the old row first
                try {
                    const { data: existingUser } = await supabase
                        .from('users')
                        .select('id')
                        .ilike('email', user.email.trim())
                        .limit(1);
                    if (existingUser && existingUser.length > 0 && existingUser[0].id !== user.id) {
                        await supabase.from('users').delete().eq('id', existingUser[0].id);
                    }
                } catch {}
            } else {
                // Only lookup if user doesn't already have a persistent ID
                const { data: existingUser } = await supabase
                    .from('users')
                    .select('id')
                    .ilike('email', user.email.trim())
                    .limit(1);
                if (existingUser && existingUser.length > 0 && existingUser[0].id) {
                    targetId = existingUser[0].id;
                }
            }

            const userRow = {
                id: targetId,
                email: user.email.trim(),
                phone: user.phone || null,
                full_name: user.fullName || user.full_name || user.email.trim().split('@')[0] || 'User',
                password: user.password || '',
                kyc_status: user.kyc_status || 'pending',
                kyc_data: user.kyc_data || {},
                balances: user.balances || { BTC: '0', ETH: '0', SOL: '0', BNB: '0', USDT: '0' },
                addresses: user.addresses || {},
                blocked: !!user.blocked,
                is_admin: !!user.is_admin,
                two_factor_auth: user.twoFactorAuth || user.two_factor_auth || {},
                user_restriction: user.user_restriction || {},
                last_login: user.last_login || new Date().toISOString(),
                created_at: user.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase.from('users').upsert(userRow, { onConflict: 'email' });
            if (error) {
                if (error.code === 'PGRST205') {
                    console.warn(`[DataService] Supabase table 'users' does not exist yet. Please run 'supabase/setup_database.sql'.`);
                } else {
                    console.warn('[DataService] Failed to upsert to users table:', error.message);
                }
                return false;
            }
            console.log(`✅ [DataService] Synced user ${user.email} directly to Supabase 'users' table`);
            return true;
        } catch (err) {
            console.warn('[DataService] Error syncing user to Supabase:', err);
            return false;
        }
    },

    /**
     * Delete user directly from Supabase 'users' table and all related data
     */
    async deleteUserFromSupabase(userId: string): Promise<boolean> {
        if (!isSupabaseConfigured() || !userId) return false;
        try {
            // 1. Clean up pluto_admin_users in local cache
            const rawUsers = dataService.getItem('pluto_admin_users');
            if (rawUsers) {
                try {
                    const parsed = JSON.parse(rawUsers);
                    const filtered = parsed.filter((u: any) => u.id !== userId);
                    const filteredStr = JSON.stringify(filtered);
                    memoryCache.set('pluto_admin_users', filteredStr);
                    if (typeof localStorage !== 'undefined') {
                        localStorage.setItem('pluto_admin_users', filteredStr);
                    }
                } catch {}
            }

            // 2. Delete user-specific keys from pluto_kv_store
            await supabase.from(activeTable).delete().eq('key', `pluto_wallet_${userId}`);
            await supabase.from(activeTable).delete().eq('key', `pluto_user_fees_${userId}`);
            await supabase.from(activeTable).delete().eq('key', `pluto_notifications_${userId}`);

            // 3. Update pluto_admin_users in pluto_kv_store
            try {
                const { data: kvUsers } = await supabase.from(activeTable).select('value').eq('key', 'pluto_admin_users').maybeSingle();
                if (kvUsers && kvUsers.value) {
                    const current = typeof kvUsers.value === 'string' ? JSON.parse(kvUsers.value) : kvUsers.value;
                    if (Array.isArray(current)) {
                        const updated = current.filter((u: any) => u.id !== userId);
                        await supabase.from(activeTable).upsert({ key: 'pluto_admin_users', value: updated });
                    }
                }
            } catch {}

            // 4. Delete from wallets table
            await supabase.from('wallets').delete().eq('id', userId);

            // 5. Delete from users table
            const { error } = await supabase.from('users').delete().eq('id', userId);
            if (error) {
                console.warn('[DataService] Error deleting user from Supabase:', error.message);
                return false;
            }
            console.log(`✅ [DataService] Deleted user ${userId} and all related records from Supabase`);
            return true;
        } catch (err) {
            console.warn('[DataService] deleteUserFromSupabase error:', err);
            return false;
        }
    },

    /**
     * Synchronize a wallet directly to the Supabase 'wallets' table
     */
    async syncWalletToSupabase(wallet: any): Promise<boolean> {
        if (!isSupabaseConfigured()) return false;

        try {
            const walletId = wallet.id || wallet.userId || `wallet_${Date.now()}`;
            const walletRow = {
                id: walletId,
                user_id: wallet.userId || wallet.id || walletId,
                email: wallet.email,
                name: wallet.name || 'Main Wallet',
                mnemonic_encrypted: wallet.mnemonic_encrypted || '',
                balances: wallet.balances || { BTC: '0', ETH: '0', SOL: '0', BNB: '0', USDT: '0' },
                addresses: wallet.addresses || {},
                transactions: wallet.transactions || [],
                two_factor_auth: wallet.twoFactorAuth || {},
                created_at: wallet.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase.from('wallets').upsert(walletRow);
            if (error && error.code !== 'PGRST205') {
                console.warn('[DataService] Failed to upsert to wallets table:', error.message);
            }

            console.log(`✅ [DataService] Synced wallet ${walletRow.id} (${wallet.email}) directly to Supabase 'wallets' table`);
            return true;
        } catch (err) {
            console.warn('[DataService] syncWalletToSupabase error:', err);
            return false;
        }
    },

    /**
     * Synchronize a transaction directly to the Supabase 'transactions' table
     */
    async syncTransactionToSupabase(txn: any): Promise<boolean> {
        if (!isSupabaseConfigured()) return false;

        try {
            const txnRow = {
                id: txn.id || `txn_${Date.now()}`,
                user_id: txn.userId || txn.user_id || 'system',
                type: txn.type,
                asset: txn.asset,
                amount: txn.amount?.toString() || '0',
                status: txn.status || 'completed',
                hash: txn.hash || '',
                from_address: txn.from || txn.from_address || '',
                to_address: txn.to || txn.to_address || '',
                network: txn.network || '',
                fee: txn.fee?.toString() || '0',
                gas_fee: txn.gasFee?.toString() || '0',
                total_deducted: txn.totalDeducted?.toString() || null,
                notes: txn.notes || '',
                timestamp: txn.timestamp || new Date().toISOString(),
                created_at: new Date().toISOString()
            };

            const { error } = await supabase.from('transactions').upsert(txnRow);
            if (error && error.code !== 'PGRST205') {
                console.warn('[DataService] Error syncing transaction to Supabase:', error.message);
                return false;
            }
            return true;
        } catch (err) {
            console.warn('[DataService] syncTransactionToSupabase error:', err);
            return false;
        }
    },

    /**
     * Primary Cloud Initialization:
     * 1. Detects active table in Supabase
     * 2. Synchronizes 'users' table directly with Supabase
     * 3. Synchronizes 'wallets' table directly with Supabase
     * 4. Synchronizes 'pluto_kv_store' with all app state
     * 5. Subscribes to Supabase Realtime updates
     */
    async initCloudSync(): Promise<{ success: boolean; cloudItems: number; pushedItems: number }> {
        if (!isSupabaseConfigured()) {
            console.log('[DataService] Supabase not configured. Using local cache.');
            return { success: false, cloudItems: 0, pushedItems: 0 };
        }

        console.log('🔄 [DataService] Initializing cloud sync with Supabase...');

        // 1. Detect active KV table
        let targetTable = activeTable;
        for (const candidate of CANDIDATE_TABLES) {
            try {
                const { error } = await supabase.from(candidate).select('key').limit(1);
                if (!error) {
                    targetTable = candidate;
                    activeTable = candidate;
                    break;
                } else if (error.code !== 'PGRST205') {
                    targetTable = candidate;
                    activeTable = candidate;
                    break;
                }
            } catch {
                // Continue
            }
        }

        // 2. Fetch all keys from KV store
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
                    // Skip legacy global pluto_wallet key so it does not overwrite active user session
                    if (row.key === 'pluto_wallet') {
                        continue;
                    }
                    const valStr = typeof row.value === 'string' ? row.value : JSON.stringify(row.value);
                    memoryCache.set(row.key, valStr);
                    if (typeof localStorage !== 'undefined') {
                        localStorage.setItem(row.key, valStr);
                    }
                }
            }
        } catch (err) {
            console.warn('[DataService] Failed to load data from Supabase KV store:', err);
        }

        // 3. Direct 'users' table sync
        try {
            const { data: remoteUsers, error: userError } = await supabase.from('users').select('*');
            if (!userError && remoteUsers && remoteUsers.length > 0) {
                // Filter out any deleted/stale legacy IDs
                const validRemoteUsers = remoteUsers.filter(u => u.id !== 'usr_008' && u.id !== 'user_008');

                console.log(`👥 [DataService] Loaded ${validRemoteUsers.length} users directly from Supabase 'users' table`);
                const mappedUsers = validRemoteUsers.map(u => {
                    let createdAt = u.created_at;
                    if ((!createdAt || createdAt.startsWith('2017')) && u.id?.startsWith('usr_')) {
                        const ts = parseInt(u.id.replace('usr_', ''));
                        if (!isNaN(ts) && ts > 1700000000000) createdAt = new Date(ts).toISOString();
                    }
                    const walletId = u.wallet_id || u.walletId || `wallet_${u.id?.replace(/^usr_/, '')}`;
                    return {
                        id: u.id,
                        walletId,
                        wallet_id: walletId,
                        email: u.email,
                        phone: u.phone || '',
                        fullName: u.full_name || u.fullName || u.email.split('@')[0],
                        password: u.password || '',
                        kyc_status: u.kyc_status || 'pending',
                        kyc_data: u.kyc_data || null,
                        balances: u.balances || {},
                        addresses: u.addresses || {},
                        blocked: !!u.blocked,
                        is_admin: !!u.is_admin,
                        twoFactorAuth: u.two_factor_auth || u.twoFactorAuth || {},
                        user_restriction: u.user_restriction || {},
                        last_login: u.last_login || createdAt,
                        created_at: createdAt
                    };
                });
                const usersJson = JSON.stringify(mappedUsers);
                memoryCache.set('pluto_admin_users', usersJson);
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('pluto_admin_users', usersJson);
                }
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('pluto_users_updated', {
                        detail: { users: mappedUsers }
                    }));
                }

                // Also sync active local wallet balances if the active session user is found in remoteUsers
                const localWalletStr = localStorage.getItem('pluto_wallet') || memoryCache.get('pluto_wallet');
                if (localWalletStr) {
                    try {
                        const localW = JSON.parse(localWalletStr);
                        const match = mappedUsers.find(u => 
                            (u.email && localW.email && u.email.toLowerCase() === localW.email.toLowerCase()) ||
                            u.id === localW.id
                        );
                        if (match) {
                            localW.walletId = match.walletId;
                            localW.wallet_id = match.wallet_id;
                            localW.created_at = match.created_at;
                            localW.balances = { ...(localW.balances || {}), ...(match.balances || {}) };
                            localW.addresses = { ...(localW.addresses || {}), ...(match.addresses || {}) };
                            localW.blocked = match.blocked;
                            localW.kyc_status = match.kyc_status;
                            const updatedStr = JSON.stringify(localW);
                            memoryCache.set('pluto_wallet', updatedStr);
                            if (typeof localStorage !== 'undefined') {
                                localStorage.setItem('pluto_wallet', updatedStr);
                            }
                        }
                    } catch (e) {
                        console.warn('[DataService] Error merging user balances into local wallet:', e);
                    }
                }
            } else if (!userError && remoteUsers && remoteUsers.length === 0) {
                // Table exists but empty -> push existing local users
                const localUsersStr = localStorage.getItem('pluto_admin_users');
                if (localUsersStr) {
                    const localUsers = JSON.parse(localUsersStr);
                    for (const u of localUsers) {
                        await this.syncUserToSupabase(u);
                    }
                }
            }
        } catch (e) {
            // users table may not exist yet
        }

        // 4. Direct 'wallets' table sync
        try {
            const { data: remoteWallets, error: walletError } = await supabase.from('wallets').select('*');
            if (!walletError && remoteWallets && remoteWallets.length > 0) {
                const localWalletStr = localStorage.getItem('pluto_wallet') || memoryCache.get('pluto_wallet');
                if (localWalletStr) {
                    try {
                        const localW = JSON.parse(localWalletStr);
                        const match = remoteWallets.find(w => 
                            (w.email && localW.email && w.email.toLowerCase() === localW.email.toLowerCase()) ||
                            w.id === localW.id ||
                            w.user_id === localW.id ||
                            (localW.userId && (w.id === localW.userId || w.user_id === localW.userId))
                        );
                        if (match) {
                            console.log(`💼 [DataService] Syncing active wallet for ${match.email || match.id} from Supabase 'wallets' table`);
                            const updated = {
                                ...localW,
                                balances: { ...(localW.balances || {}), ...(match.balances || {}) },
                                addresses: { ...(localW.addresses || {}), ...(match.addresses || {}) },
                                transactions: match.transactions && match.transactions.length > 0 ? match.transactions : localW.transactions,
                                twoFactorAuth: match.two_factor_auth || localW.twoFactorAuth
                            };
                            const updatedStr = JSON.stringify(updated);
                            memoryCache.set('pluto_wallet', updatedStr);
                            if (typeof localStorage !== 'undefined') {
                                localStorage.setItem('pluto_wallet', updatedStr);
                            }
                        }
                    } catch (e) {
                        console.warn('[DataService] Error matching local wallet to remote wallets:', e);
                    }
                }
            } else if (!walletError && remoteWallets && remoteWallets.length === 0) {
                const localWalletStr = localStorage.getItem('pluto_wallet');
                if (localWalletStr) {
                    await this.syncWalletToSupabase(JSON.parse(localWalletStr));
                }
            }
        } catch (e) {
            // wallets table may not exist yet
        }

        // 5. Push any local-only KV data to cloud
        let pushedCount = 0;
        if (typeof localStorage !== 'undefined') {
            const localKeysToSync = Object.keys(localStorage).filter(k => 
                (k.startsWith('pluto_') || k === 'darkMode') && !k.startsWith('__pluto_pending_writes') && k !== 'pluto_wallet'
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

        // 6. Sync pending writes & subscribe Realtime
        await syncPendingWrites();
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
            // 1. Push all users to 'users' table
            const localUsersStr = localStorage.getItem('pluto_admin_users');
            if (localUsersStr) {
                try {
                    const localUsers = JSON.parse(localUsersStr);
                    for (const u of localUsers) {
                        await this.syncUserToSupabase(u);
                    }
                } catch {}
            }

            // 2. Push active wallet to 'wallets' table
            const localWalletStr = localStorage.getItem('pluto_wallet');
            if (localWalletStr) {
                try {
                    await this.syncWalletToSupabase(JSON.parse(localWalletStr));
                } catch {}
            }

            // 3. Push to KV store
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
