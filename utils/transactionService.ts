import { supabase, isSupabaseConfigured } from './supabaseClient';
import dataService from './dataService';

export interface Transaction {
  id: string;
  userId?: string;
  user_id?: string;
  type: string; // 'send' | 'receive' | 'swap' | 'buy' | 'deposit' | 'admin_credit' | 'admin_debit' | 'gas_fee'
  asset: string;
  amount: string;
  status: string; // 'completed' | 'pending' | 'processing' | 'failed'
  hash: string;
  to?: string;
  from?: string;
  to_address?: string;
  from_address?: string;
  network?: string;
  fee?: string;
  gasFee?: string;
  gas_fee?: string;
  totalDeducted?: string;
  total_deducted?: string;
  notes?: string;
  timestamp: string;
  created_at?: string;
  confirmations?: number;
  requiredConfirmations?: number;
  toAsset?: string;
  toAmount?: string;
  fromAsset?: string;
  relatedTransaction?: string;
  relatedAsset?: string;
  provider?: string;
  providerUrl?: string;
  usdAmount?: string;
  depositAddress?: string;
  ethGasFee?: string;
  [key: string]: any;
}

export function isAssetTransaction(tx: any): boolean {
  if (!tx || typeof tx !== 'object') return false;
  const type = (tx.type || '').toLowerCase();
  if (type === 'kyc_review' || type === 'kyc' || type === 'login' || type === 'security') {
    return false;
  }
  return true;
}

/**
 * Format a raw database row or frontend object into a normalized Transaction object
 */
function normalizeTransaction(row: any): Transaction {
  const to = row.to || row.to_address || '';
  const from = row.from || row.from_address || '';
  const gasFee = (row.gasFee || row.gas_fee || '0').toString();
  const fee = (row.fee || '0').toString();
  const totalDeducted = (row.totalDeducted || row.total_deducted || null)?.toString() || null;
  const timestamp = row.timestamp || row.created_at || new Date().toISOString();

  // Try extracting any JSON metadata encoded inside notes
  let extraMeta: any = {};
  if (typeof row.notes === 'string' && row.notes.startsWith('{') && row.notes.endsWith('}')) {
    try {
      extraMeta = JSON.parse(row.notes);
    } catch {}
  }

  return {
    ...row,
    ...extraMeta,
    id: row.id,
    userId: row.user_id || row.userId || 'system',
    user_id: row.user_id || row.userId || 'system',
    type: row.type || 'send',
    asset: row.asset || 'USDT',
    amount: (row.amount || '0').toString(),
    status: row.status || 'completed',
    hash: row.hash || `0x${Math.random().toString(16).substring(2, 66)}`,
    to,
    from,
    to_address: to,
    from_address: from,
    network: row.network || '',
    fee,
    gasFee,
    gas_fee: gasFee,
    totalDeducted,
    total_deducted: totalDeducted,
    notes: extraMeta.notes !== undefined ? extraMeta.notes : (row.notes || ''),
    timestamp,
    created_at: row.created_at || timestamp,
    confirmations: row.confirmations !== undefined ? row.confirmations : 15,
    requiredConfirmations: row.requiredConfirmations !== undefined ? row.requiredConfirmations : 15
  };
}

/**
 * Format a Transaction object for insertion/upsert into Supabase 'transactions' table
 */
function toSupabaseRow(txn: any, userId: string) {
  const norm = normalizeTransaction(txn);
  const targetUserId = userId || norm.user_id || norm.userId || 'system';

  // If there are rich fields (like toAsset, toAmount, provider, usdAmount), preserve them cleanly
  let notesStr = norm.notes || '';
  if (norm.toAsset || norm.toAmount || norm.fromAsset || norm.provider || norm.usdAmount || norm.relatedTransaction) {
    const metaToPack = {
      notes: norm.notes || '',
      toAsset: norm.toAsset,
      toAmount: norm.toAmount,
      fromAsset: norm.fromAsset,
      relatedTransaction: norm.relatedTransaction,
      relatedAsset: norm.relatedAsset,
      provider: norm.provider,
      providerUrl: norm.providerUrl,
      usdAmount: norm.usdAmount,
      depositAddress: norm.depositAddress,
      ethGasFee: norm.ethGasFee
    };
    notesStr = JSON.stringify(metaToPack);
  }

  return {
    id: norm.id,
    user_id: targetUserId,
    type: norm.type,
    asset: norm.asset,
    amount: norm.amount,
    status: norm.status,
    hash: norm.hash,
    from_address: norm.from || norm.from_address || '',
    to_address: norm.to || norm.to_address || '',
    network: norm.network || '',
    fee: norm.fee || '0',
    gas_fee: norm.gasFee || '0',
    total_deducted: norm.totalDeducted || null,
    notes: notesStr,
    timestamp: norm.timestamp,
    created_at: norm.created_at || norm.timestamp
  };
}

export const transactionService = {
  /**
   * Fetch all transactions for a specific user from Supabase 'transactions' table.
   * Merges with any local cache and updates both localStorage and active wallet session.
   */
  async fetchUserTransactions(userId: string): Promise<Transaction[]> {
    if (!userId) return [];

    let transactions: Transaction[] = [];

    // 1. Fetch directly from Supabase 'transactions' table
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('timestamp', { ascending: false });

        if (!error && Array.isArray(data)) {
          transactions = data.map(normalizeTransaction).filter(isAssetTransaction);
        } else if (error) {
          console.warn('[TransactionService] Supabase fetch error for user:', userId, error.message);
        }
      } catch (err) {
        console.warn('[TransactionService] Failed to query Supabase transactions:', err);
      }
    }

    // 2. Fallback / Merge with local 'pluto_user_activities'
    const cachedActivitiesStr = dataService.getItem('pluto_user_activities');
    let localTxns: any[] = [];
    if (cachedActivitiesStr) {
      try {
        const parsed = JSON.parse(cachedActivitiesStr);
        if (parsed[userId] && Array.isArray(parsed[userId])) {
          localTxns = parsed[userId].filter(isAssetTransaction);
        }
      } catch {}
    }

    // Also check active wallet session
    const activeWalletStr = dataService.getItem('pluto_wallet');
    if (activeWalletStr) {
      try {
        const activeWallet = JSON.parse(activeWalletStr);
        if ((activeWallet.id === userId || activeWallet.userId === userId) && Array.isArray(activeWallet.transactions)) {
          localTxns = [...localTxns, ...activeWallet.transactions.filter(isAssetTransaction)];
        }
      } catch {}
    }

    // Merge remote and local (avoiding duplicates by id)
    const txMap = new Map<string, Transaction>();
    // Add remote first
    for (const tx of transactions) {
      txMap.set(tx.id, tx);
    }
    // Add any local that might not be synced yet
    for (const ltx of localTxns) {
      if (ltx && ltx.id && !txMap.has(ltx.id) && isAssetTransaction(ltx)) {
        const norm = normalizeTransaction({ ...ltx, user_id: userId });
        txMap.set(norm.id, norm);
        // Automatically sync missing local transaction to Supabase
        if (isSupabaseConfigured()) {
          this.saveTransaction(norm, userId).catch(() => {});
        }
      }
    }

    const merged = Array.from(txMap.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // 3. Update local caches
    this.updateLocalActivitiesCache(userId, merged);
    this.updateActiveWalletTransactions(userId, merged);

    return merged;
  },

  /**
   * Fetch all transactions across all users (for Admin Dashboard and audits)
   */
  async fetchAllTransactions(): Promise<Transaction[]> {
    let allTxns: Transaction[] = [];

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .order('timestamp', { ascending: false });

        if (!error && Array.isArray(data)) {
          allTxns = data.map(normalizeTransaction).filter(isAssetTransaction);
        } else if (error) {
          console.warn('[TransactionService] Error fetching all transactions:', error.message);
        }
      } catch (err) {
        console.warn('[TransactionService] Failed to query all transactions:', err);
      }
    }

    // Fallback/merge from pluto_user_activities
    const cachedActivitiesStr = dataService.getItem('pluto_user_activities');
    if (cachedActivitiesStr) {
      try {
        const parsed = JSON.parse(cachedActivitiesStr);
        const map = new Map<string, Transaction>();
        allTxns.forEach(t => map.set(t.id, t));

        Object.entries(parsed).forEach(([uId, txns]) => {
          if (Array.isArray(txns)) {
            txns.forEach((tx: any) => {
              if (tx && tx.id && !map.has(tx.id) && isAssetTransaction(tx)) {
                map.set(tx.id, normalizeTransaction({ ...tx, user_id: uId }));
              }
            });
          }
        });
        allTxns = Array.from(map.values()).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      } catch {}
    }

    // Update activities map
    const activitiesMap: Record<string, Transaction[]> = {};
    for (const tx of allTxns) {
      const uId = tx.user_id || tx.userId || 'system';
      if (!activitiesMap[uId]) activitiesMap[uId] = [];
      activitiesMap[uId].push(tx);
    }
    dataService.setItem('pluto_user_activities', JSON.stringify(activitiesMap));

    return allTxns;
  },

  /**
   * Fetch user activities map { [userId]: Transaction[] } for admin dashboard
   */
  async fetchUserActivitiesMap(): Promise<Record<string, Transaction[]>> {
    const all = await this.fetchAllTransactions();
    const map: Record<string, Transaction[]> = {};
    for (const tx of all) {
      const uId = tx.user_id || tx.userId || 'system';
      if (!map[uId]) map[uId] = [];
      map[uId].push(tx);
    }
    return map;
  },

  /**
   * Save / Record a new transaction.
   * 1. Inserts/upserts into Supabase 'transactions' table
   * 2. Appends to 'pluto_user_activities' in local cache & cloud KV
   * 3. Appends to active 'pluto_wallet' transactions and notifies UI
   * 4. Updates Supabase 'wallets.transactions' JSONB column
   * 5. Dispatches 'pluto_transactions_updated' window event
   */
  async saveTransaction(rawTxn: any, userId: string): Promise<boolean> {
    if (!rawTxn) return false;
    const targetUserId = userId || rawTxn.userId || rawTxn.user_id;
    if (!targetUserId) {
      console.warn('[TransactionService] saveTransaction missing userId');
      return false;
    }

    const norm = normalizeTransaction({ ...rawTxn, user_id: targetUserId, userId: targetUserId });
    const row = toSupabaseRow(norm, targetUserId);

    let cloudSuccess = false;

    // 1. Direct upsert to Supabase 'transactions' table
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('transactions').upsert(row);
        if (!error) {
          cloudSuccess = true;
          console.log(`✓ [TransactionService] Saved transaction ${norm.id} (${norm.type} ${norm.asset}) to Supabase`);
        } else {
          console.warn('[TransactionService] Supabase upsert error:', error.message);
        }

        // Also update wallets.transactions column in Supabase if wallet exists
        try {
          const { data: wData } = await supabase.from('wallets').select('transactions').eq('user_id', targetUserId).maybeSingle();
          if (wData) {
            const existing = Array.isArray(wData.transactions) ? wData.transactions : [];
            const filtered = existing.filter((t: any) => t.id !== norm.id);
            filtered.unshift(norm);
            await supabase.from('wallets').update({ transactions: filtered.slice(0, 100) }).eq('user_id', targetUserId);
          }
        } catch {}
      } catch (err) {
        console.warn('[TransactionService] Error saving to Supabase:', err);
      }
    }

    // 2. Update local pluto_user_activities cache
    const cachedActivitiesStr = dataService.getItem('pluto_user_activities');
    let userActivities: Record<string, any[]> = {};
    if (cachedActivitiesStr) {
      try { userActivities = JSON.parse(cachedActivitiesStr); } catch {}
    }
    if (!userActivities[targetUserId]) userActivities[targetUserId] = [];
    userActivities[targetUserId] = [
      norm,
      ...userActivities[targetUserId].filter((t: any) => t.id !== norm.id)
    ];
    dataService.setItem('pluto_user_activities', JSON.stringify(userActivities));
    if (isSupabaseConfigured()) {
      dataService.setItemAsync('pluto_user_activities', JSON.stringify(userActivities)).catch(() => {});
    }

    // 3. Update active user wallet session if matching
    this.updateActiveWalletTransactions(targetUserId, userActivities[targetUserId]);

    // 4. Dispatch transaction updated events
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pluto_transactions_updated', {
        detail: { userId: targetUserId, transaction: norm, transactions: userActivities[targetUserId] }
      }));
    }

    return true;
  },

  /**
   * Update transaction status (e.g. pending -> completed / failed)
   */
  async updateTransactionStatus(txnId: string, status: string, userId?: string): Promise<boolean> {
    if (!txnId) return false;

    // 1. Update in Supabase
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('transactions').update({ status }).eq('id', txnId);
      } catch (err) {
        console.warn('[TransactionService] Failed to update status in Supabase:', err);
      }
    }

    // 2. Update local cache
    const cachedActivitiesStr = dataService.getItem('pluto_user_activities');
    if (cachedActivitiesStr) {
      try {
        const userActivities = JSON.parse(cachedActivitiesStr);
        let updated = false;
        for (const uId of Object.keys(userActivities)) {
          if (!userId || uId === userId) {
            userActivities[uId] = userActivities[uId].map((t: any) => {
              if (t.id === txnId) {
                updated = true;
                return { ...t, status };
              }
              return t;
            });
          }
        }
        if (updated) {
          dataService.setItem('pluto_user_activities', JSON.stringify(userActivities));
        }
      } catch {}
    }

    // 3. Update active wallet session
    const activeWalletStr = dataService.getItem('pluto_wallet');
    if (activeWalletStr) {
      try {
        const activeWallet = JSON.parse(activeWalletStr);
        if (Array.isArray(activeWallet.transactions)) {
          let updated = false;
          activeWallet.transactions = activeWallet.transactions.map((t: any) => {
            if (t.id === txnId) {
              updated = true;
              return { ...t, status };
            }
            return t;
          });
          if (updated) {
            dataService.setItem('pluto_wallet', JSON.stringify(activeWallet));
            window.dispatchEvent(new CustomEvent('walletDataUpdated', {
              detail: { walletData: activeWallet }
            }));
          }
        }
      } catch {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pluto_transactions_updated', {
        detail: { txnId, status }
      }));
    }

    return true;
  },

  /**
   * Delete a transaction record
   */
  async deleteTransaction(txnId: string, userId?: string): Promise<boolean> {
    if (!txnId) return false;

    // 1. Delete from Supabase
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('transactions').delete().eq('id', txnId);
      } catch (err) {
        console.warn('[TransactionService] Error deleting from Supabase:', err);
      }
    }

    // 2. Delete from local cache
    const cachedActivitiesStr = dataService.getItem('pluto_user_activities');
    if (cachedActivitiesStr) {
      try {
        const userActivities = JSON.parse(cachedActivitiesStr);
        for (const uId of Object.keys(userActivities)) {
          if (!userId || uId === userId) {
            userActivities[uId] = userActivities[uId].filter((t: any) => t.id !== txnId);
          }
        }
        dataService.setItem('pluto_user_activities', JSON.stringify(userActivities));
      } catch {}
    }

    // 3. Delete from active wallet
    const activeWalletStr = dataService.getItem('pluto_wallet');
    if (activeWalletStr) {
      try {
        const activeWallet = JSON.parse(activeWalletStr);
        if (Array.isArray(activeWallet.transactions)) {
          activeWallet.transactions = activeWallet.transactions.filter((t: any) => t.id !== txnId);
          dataService.setItem('pluto_wallet', JSON.stringify(activeWallet));
          window.dispatchEvent(new CustomEvent('walletDataUpdated', {
            detail: { walletData: activeWallet }
          }));
        }
      } catch {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pluto_transactions_updated', {
        detail: { txnId, deleted: true }
      }));
    }

    return true;
  },

  /**
   * Update active wallet session in memory and localStorage with new transactions
   */
  updateActiveWalletTransactions(userId: string, txns: Transaction[]) {
    const activeWalletStr = dataService.getItem('pluto_wallet');
    if (!activeWalletStr) return;

    try {
      const activeWallet = JSON.parse(activeWalletStr);
      if (activeWallet.id === userId || activeWallet.userId === userId) {
        activeWallet.transactions = txns;
        const updatedStr = JSON.stringify(activeWallet);
        dataService.setItem('pluto_wallet', updatedStr);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('walletDataUpdated', {
            detail: { walletData: activeWallet, wallet: activeWallet }
          }));
          window.dispatchEvent(new CustomEvent('walletUpdated', {
            detail: { walletData: activeWallet, wallet: activeWallet }
          }));
        }
      }
    } catch {}
  },

  /**
   * Update local user activities cache
   */
  updateLocalActivitiesCache(userId: string, txns: Transaction[]) {
    const cachedActivitiesStr = dataService.getItem('pluto_user_activities');
    let userActivities: Record<string, any[]> = {};
    if (cachedActivitiesStr) {
      try { userActivities = JSON.parse(cachedActivitiesStr); } catch {}
    }
    userActivities[userId] = txns;
    dataService.setItem('pluto_user_activities', JSON.stringify(userActivities));
  },

  /**
   * Background migration: checks local transactions and ensures all are synced to Supabase
   */
  async syncAllLocalTransactionsToCloud(): Promise<number> {
    if (!isSupabaseConfigured()) return 0;

    let synced = 0;
    const cachedActivitiesStr = dataService.getItem('pluto_user_activities');
    if (!cachedActivitiesStr) return 0;

    try {
      const userActivities = JSON.parse(cachedActivitiesStr);
      for (const [userId, txns] of Object.entries(userActivities)) {
        if (!Array.isArray(txns)) continue;
        for (const tx of txns) {
          if (!tx || !tx.id) continue;
          const row = toSupabaseRow(tx, userId);
          const { error } = await supabase.from('transactions').upsert(row);
          if (!error) synced++;
        }
      }
    } catch (e) {
      console.warn('[TransactionService] syncAllLocalTransactionsToCloud error:', e);
    }

    return synced;
  }
};

export default transactionService;
