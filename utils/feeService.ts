import dataService from './dataService';
import { loadAssetConfig, AssetConfig } from './assetConfig';
import { formatDecimal } from './formatNumber';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface AssetFeeConfig {
  withdraw_fee: string;
  percent: string;
  deposit_address: string;
  deposit_enabled: boolean;
  gas_fee_enabled: boolean;
  gas_fee_type: 'fixed' | 'percent';
  gas_fee_fixed: string;
  gas_fee_percent: string;
}

export type FeeConfigMap = Record<string, AssetFeeConfig>;

export interface UserFeeOverride {
  userId: string;
  userEmail?: string;
  userName?: string;
  enabled: boolean; // whether custom fees override global defaults
  fees: FeeConfigMap;
  updatedAt: string;
}

export interface ChainGasInfo {
  blockchain: string;
  gasAsset: string;
  isToken: boolean;
}

/**
 * Returns native blockchain and gas coin for any given cryptocurrency asset
 */
export function getChainGasInfo(assetSymbol: string): ChainGasInfo {
  const symbol = (assetSymbol || '').toUpperCase();

  // Ethereum ecosystem (ERC-20 tokens)
  if (symbol === 'USDT_ERC20' || symbol === 'USDC' || symbol === 'LINK' || symbol === 'SHIB') {
    return { blockchain: 'Ethereum (ERC-20)', gasAsset: 'ETH', isToken: true };
  }
  // BNB Smart Chain (BEP-20 tokens)
  if (symbol === 'USDT_BEP20') {
    return { blockchain: 'BNB Smart Chain (BEP-20)', gasAsset: 'BNB', isToken: true };
  }
  // TRON ecosystem (TRC-20 tokens)
  if (symbol === 'USDT' || symbol === 'USDT_TRC20') {
    return { blockchain: 'TRON (TRC-20)', gasAsset: 'TRX', isToken: true };
  }
  // Native layer-1 coins
  if (symbol === 'ETH') {
    return { blockchain: 'Ethereum', gasAsset: 'ETH', isToken: false };
  }
  if (symbol === 'BNB') {
    return { blockchain: 'BNB Smart Chain', gasAsset: 'BNB', isToken: false };
  }
  if (symbol === 'SOL') {
    return { blockchain: 'Solana', gasAsset: 'SOL', isToken: false };
  }
  if (symbol === 'BTC') {
    return { blockchain: 'Bitcoin', gasAsset: 'BTC', isToken: false };
  }
  if (symbol === 'TRX') {
    return { blockchain: 'TRON', gasAsset: 'TRX', isToken: false };
  }
  if (symbol === 'AVAX') {
    return { blockchain: 'Avalanche C-Chain', gasAsset: 'AVAX', isToken: false };
  }
  if (symbol === 'MATIC') {
    return { blockchain: 'Polygon', gasAsset: 'MATIC', isToken: false };
  }
  if (symbol === 'TON') {
    return { blockchain: 'The Open Network', gasAsset: 'TON', isToken: false };
  }
  if (symbol === 'DOGE') {
    return { blockchain: 'Dogecoin', gasAsset: 'DOGE', isToken: false };
  }
  if (symbol === 'ADA') {
    return { blockchain: 'Cardano', gasAsset: 'ADA', isToken: false };
  }
  if (symbol === 'XRP') {
    return { blockchain: 'XRP Ledger', gasAsset: 'XRP', isToken: false };
  }

  return { blockchain: 'Network', gasAsset: assetSymbol, isToken: false };
}

/**
 * Calculates accurate gas fee amount, gas asset, and blockchain for any transaction
 */
export function calculateGasFee(
  assetSymbol: string,
  amount: number | string,
  effectiveFees: FeeConfigMap
): {
  enabled: boolean;
  fee: number;
  gasAsset: string;
  blockchain: string;
  type: 'fixed' | 'percent';
  feeString: string;
} {
  const symbol = (assetSymbol || '').toUpperCase();
  const chainInfo = getChainGasInfo(symbol);
  const settings = effectiveFees[symbol] || getDefaultFeeForAsset(symbol);

  if (!settings || !settings.gas_fee_enabled) {
    return {
      enabled: false,
      fee: 0,
      gasAsset: chainInfo.gasAsset,
      blockchain: chainInfo.blockchain,
      type: settings?.gas_fee_type || 'fixed',
      feeString: `0 ${chainInfo.gasAsset}`
    };
  }

  const numAmount = parseFloat(String(amount || '0'));
  let fee = 0;

  if (settings.gas_fee_type === 'percent') {
    const percent = parseFloat(settings.gas_fee_percent || '0');
    fee = (numAmount * percent) / 100;
  } else {
    fee = parseFloat(settings.gas_fee_fixed || '0');
  }

  return {
    enabled: true,
    fee,
    gasAsset: chainInfo.gasAsset,
    blockchain: chainInfo.blockchain,
    type: settings.gas_fee_type || 'fixed',
    feeString: `${fee > 0 ? formatDecimal(fee) : '0'} ${chainInfo.gasAsset}`
  };
}

/**
 * Calculates processing / withdrawal fee (fixed + percentage) in the sent asset
 */
export function calculateProcessingFee(
  assetSymbol: string,
  amount: number | string,
  effectiveFees: FeeConfigMap
): {
  fee: number;
  totalFee: number;
  fixedFee: number;
  percentFee: number;
  feeInAsset: string;
  hasPercentage: boolean;
  hasFixed: boolean;
} {
  const symbol = (assetSymbol || '').toUpperCase();
  const settings = effectiveFees[symbol] || getDefaultFeeForAsset(symbol);

  const fixedFee = parseFloat(settings?.withdraw_fee || '0');
  const percentFee = parseFloat(settings?.percent || '0');
  const numAmount = parseFloat(String(amount || '0'));

  let totalFee = fixedFee;
  if (percentFee > 0 && numAmount > 0) {
    totalFee += (numAmount * percentFee) / 100;
  }

  return {
    fee: totalFee,
    totalFee,
    fixedFee,
    percentFee,
    feeInAsset: `${formatDecimal(totalFee)} ${symbol}`,
    hasPercentage: percentFee > 0,
    hasFixed: fixedFee > 0
  };
}

const GLOBAL_FEES_STORAGE_KEY = 'pluto_admin_fees';
const ALL_USER_OVERRIDES_STORAGE_KEY = 'pluto_all_user_fee_overrides';

// Chain default addresses and fee templates
const defaultAssetFeeTemplates: Record<string, Partial<AssetFeeConfig>> = {
  BTC: {
    withdraw_fee: '0.0005',
    percent: '0.5',
    deposit_address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    deposit_enabled: true,
    gas_fee_enabled: true,
    gas_fee_type: 'fixed',
    gas_fee_fixed: '0.00001',
    gas_fee_percent: '0.1'
  },
  ETH: {
    withdraw_fee: '0.003',
    percent: '0.3',
    deposit_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    deposit_enabled: true,
    gas_fee_enabled: true,
    gas_fee_type: 'fixed',
    gas_fee_fixed: '0.0015',
    gas_fee_percent: '0.2'
  },
  SOL: {
    withdraw_fee: '0.001',
    percent: '0.2',
    deposit_address: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
    deposit_enabled: true,
    gas_fee_enabled: true,
    gas_fee_type: 'fixed',
    gas_fee_fixed: '0.000005',
    gas_fee_percent: '0.15'
  },
  BNB: {
    withdraw_fee: '0.002',
    percent: '0.25',
    deposit_address: 'bnb1grpf0955h0ykzq3ar5nmum7y6gdfl6lxfn46h2',
    deposit_enabled: true,
    gas_fee_enabled: true,
    gas_fee_type: 'fixed',
    gas_fee_fixed: '0.0008',
    gas_fee_percent: '0.18'
  },
  USDT: {
    withdraw_fee: '1.0',
    percent: '0.1',
    deposit_address: 'TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9',
    deposit_enabled: true,
    gas_fee_enabled: true,
    gas_fee_type: 'fixed',
    gas_fee_fixed: '1.5',
    gas_fee_percent: '0.25'
  },
  USDT_ERC20: {
    withdraw_fee: '5.0',
    percent: '0.15',
    deposit_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    deposit_enabled: true,
    gas_fee_enabled: true,
    gas_fee_type: 'fixed',
    gas_fee_fixed: '3.0',
    gas_fee_percent: '0.2'
  },
  USDT_BEP20: {
    withdraw_fee: '0.8',
    percent: '0.1',
    deposit_address: 'bnb1grpf0955h0ykzq3ar5nmum7y6gdfl6lxfn46h2',
    deposit_enabled: true,
    gas_fee_enabled: true,
    gas_fee_type: 'fixed',
    gas_fee_fixed: '0.5',
    gas_fee_percent: '0.15'
  },
  USDC: {
    withdraw_fee: '3.0',
    percent: '0.1',
    deposit_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    deposit_enabled: true,
    gas_fee_enabled: true,
    gas_fee_type: 'fixed',
    gas_fee_fixed: '2.0',
    gas_fee_percent: '0.2'
  },
  XRP: {
    withdraw_fee: '0.25',
    percent: '0.1',
    deposit_address: 'rEb8TK3gBgk5auZyyb6aGAnq4293fW6M4c',
    deposit_enabled: true,
    gas_fee_enabled: true,
    gas_fee_type: 'fixed',
    gas_fee_fixed: '0.02',
    gas_fee_percent: '0.1'
  },
  ADA: {
    withdraw_fee: '0.5',
    percent: '0.2',
    deposit_address: 'addr1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh9823k4',
    deposit_enabled: true,
    gas_fee_enabled: true,
    gas_fee_type: 'fixed',
    gas_fee_fixed: '0.15',
    gas_fee_percent: '0.15'
  },
  DOGE: {
    withdraw_fee: '2.0',
    percent: '0.2',
    deposit_address: 'DJr3kxy2kgdygjrsqtzq2n0yrf2493p83k',
    deposit_enabled: true,
    gas_fee_enabled: true,
    gas_fee_type: 'fixed',
    gas_fee_fixed: '1.0',
    gas_fee_percent: '0.2'
  },
  TRX: {
    withdraw_fee: '1.0',
    percent: '0.1',
    deposit_address: 'TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9',
    deposit_enabled: true,
    gas_fee_enabled: true,
    gas_fee_type: 'fixed',
    gas_fee_fixed: '0.5',
    gas_fee_percent: '0.15'
  },
  AVAX: {
    withdraw_fee: '0.01',
    percent: '0.2',
    deposit_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    deposit_enabled: true,
    gas_fee_enabled: true,
    gas_fee_type: 'fixed',
    gas_fee_fixed: '0.005',
    gas_fee_percent: '0.15'
  },
  MATIC: {
    withdraw_fee: '0.5',
    percent: '0.15',
    deposit_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    deposit_enabled: true,
    gas_fee_enabled: true,
    gas_fee_type: 'fixed',
    gas_fee_fixed: '0.02',
    gas_fee_percent: '0.1'
  },
  LINK: {
    withdraw_fee: '0.1',
    percent: '0.2',
    deposit_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    deposit_enabled: true,
    gas_fee_enabled: true,
    gas_fee_type: 'fixed',
    gas_fee_fixed: '0.05',
    gas_fee_percent: '0.2'
  },
  TON: {
    withdraw_fee: '0.05',
    percent: '0.1',
    deposit_address: 'EQBvW8m53UEHGnOAu-3t_pYvC_tq2_mK2_4Kx4',
    deposit_enabled: true,
    gas_fee_enabled: true,
    gas_fee_type: 'fixed',
    gas_fee_fixed: '0.01',
    gas_fee_percent: '0.15'
  },
  SHIB: {
    withdraw_fee: '100000',
    percent: '0.2',
    deposit_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    deposit_enabled: true,
    gas_fee_enabled: true,
    gas_fee_type: 'fixed',
    gas_fee_fixed: '50000',
    gas_fee_percent: '0.2'
  }
};

/**
 * Generate default fee config for any given asset
 */
export function getDefaultFeeForAsset(symbol: string, assetName?: string): AssetFeeConfig {
  if (defaultAssetFeeTemplates[symbol]) {
    return {
      withdraw_fee: defaultAssetFeeTemplates[symbol].withdraw_fee || '0.01',
      percent: defaultAssetFeeTemplates[symbol].percent || '0.2',
      deposit_address: defaultAssetFeeTemplates[symbol].deposit_address || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      deposit_enabled: defaultAssetFeeTemplates[symbol].deposit_enabled ?? true,
      gas_fee_enabled: defaultAssetFeeTemplates[symbol].gas_fee_enabled ?? true,
      gas_fee_type: defaultAssetFeeTemplates[symbol].gas_fee_type || 'fixed',
      gas_fee_fixed: defaultAssetFeeTemplates[symbol].gas_fee_fixed || '0.001',
      gas_fee_percent: defaultAssetFeeTemplates[symbol].gas_fee_percent || '0.1'
    };
  }

  // Fallback for custom added coins
  return {
    withdraw_fee: '0.01',
    percent: '0.2',
    deposit_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    deposit_enabled: true,
    gas_fee_enabled: true,
    gas_fee_type: 'fixed',
    gas_fee_fixed: '0.001',
    gas_fee_percent: '0.2'
  };
}

export const feeService = {
  /**
   * Get global fees capturing ALL assets currently available in the Assets Overview.
   */
  getGlobalFees(): FeeConfigMap {
    let storedFees: FeeConfigMap = {};
    try {
      const raw = dataService.getItem(GLOBAL_FEES_STORAGE_KEY);
      if (raw) {
        storedFees = JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error reading global fees:', e);
    }

    // Capture all assets currently in Assets Overview
    const assetConfigs: AssetConfig[] = loadAssetConfig();
    const completeFees: FeeConfigMap = {};

    assetConfigs.forEach((asset) => {
      if (storedFees[asset.symbol]) {
        completeFees[asset.symbol] = {
          ...getDefaultFeeForAsset(asset.symbol, asset.name),
          ...storedFees[asset.symbol]
        };
      } else {
        completeFees[asset.symbol] = getDefaultFeeForAsset(asset.symbol, asset.name);
      }
    });

    // Also include any previously configured coins not currently in assetConfigs
    Object.keys(storedFees).forEach((symbol) => {
      if (!completeFees[symbol]) {
        completeFees[symbol] = storedFees[symbol];
      }
    });

    return completeFees;
  },

  /**
   * Save global fees and notify listeners
   */
  async saveGlobalFees(fees: FeeConfigMap): Promise<void> {
    dataService.setItem(GLOBAL_FEES_STORAGE_KEY, JSON.stringify(fees));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pluto_fees_updated', { detail: { fees } }));
    }

    // Sync to Supabase admin_fee_settings table
    try {
      if (isSupabaseConfigured()) {
        const rows = Object.entries(fees).map(([asset, config]) => ({
          asset_symbol: asset,
          withdraw_fee: config.withdraw_fee || '0',
          percent: config.percent || '0',
          deposit_address: config.deposit_address || '',
          deposit_enabled: config.deposit_enabled ?? true,
          gas_fee_enabled: config.gas_fee_enabled ?? false,
          gas_fee_type: config.gas_fee_type || 'fixed',
          gas_fee_fixed: config.gas_fee_fixed || '0',
          gas_fee_percent: config.gas_fee_percent || '0',
          updated_at: new Date().toISOString()
        }));

        if (rows.length > 0) {
          await supabase.from('admin_fee_settings').upsert(rows, { onConflict: 'asset_symbol' });
        }
      }
    } catch (e) {
      console.warn('[FeeService] Error syncing fees to Supabase:', e);
    }
  },

  /**
   * Get custom fee override for a specific user.
   * Resiliently matches by userId, userEmail, or walletId.
   */
  getUserFeeOverride(identifier?: any, fallbackEmail?: string): UserFeeOverride | null {
    if (!identifier) return null;

    let targetId = typeof identifier === 'string' ? identifier : (identifier.userId || identifier.id);
    let targetEmail = typeof identifier === 'object' ? (identifier.email || fallbackEmail) : fallbackEmail;

    // Helper to find override for a single candidate string
    const findForCandidate = (cand?: string): UserFeeOverride | null => {
      if (!cand) return null;
      try {
        // 1. Direct match by key
        const key = `pluto_user_fees_${cand}`;
        const raw = dataService.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.enabled) return parsed;
        }

        // 2. Search registry by userId or userEmail
        const registry = this.getAllUserFeeOverrides();
        for (const [id, entry] of Object.entries(registry)) {
          if (
            (id === cand ||
              entry.userId === cand ||
              (entry.userEmail && entry.userEmail.toLowerCase() === cand.toLowerCase())) &&
            entry.enabled
          ) {
            const entryRaw = dataService.getItem(`pluto_user_fees_${id}`);
            if (entryRaw) {
              const parsed = JSON.parse(entryRaw);
              if (parsed.enabled) return parsed;
            }
          }
        }

        // 3. Fallback: match from pluto_admin_users list
        const rawUsers = dataService.getItem('pluto_admin_users');
        if (rawUsers) {
          const users = JSON.parse(rawUsers);
          const user = users.find(
            (u: any) =>
              u.id === cand ||
              (u.email && u.email.toLowerCase() === cand.toLowerCase())
          );
          if (user && user.id !== cand) {
            const userRaw = dataService.getItem(`pluto_user_fees_${user.id}`);
            if (userRaw) {
              const parsed = JSON.parse(userRaw);
              if (parsed.enabled) return parsed;
            }
          }
        }
      } catch (e) {
        console.error(`Error reading user fees for ${cand}:`, e);
      }
      return null;
    };

    const matchById = findForCandidate(targetId);
    if (matchById) return matchById;

    if (targetEmail && targetEmail !== targetId) {
      const matchByEmail = findForCandidate(targetEmail);
      if (matchByEmail) return matchByEmail;
    }

    return null;
  },

  /**
   * Save custom fee override for a specific user
   */
  async saveUserFeeOverride(override: UserFeeOverride): Promise<void> {
    if (!override.userId) return;
    const key = `pluto_user_fees_${override.userId}`;
    dataService.setItem(key, JSON.stringify(override));

    // Update global registry of all user overrides for fast indexing
    try {
      const raw = dataService.getItem(ALL_USER_OVERRIDES_STORAGE_KEY);
      const registry: Record<string, { userId: string; userEmail?: string; userName?: string; enabled: boolean; updatedAt: string }> = raw ? JSON.parse(raw) : {};
      registry[override.userId] = {
        userId: override.userId,
        userEmail: override.userEmail,
        userName: override.userName,
        enabled: override.enabled,
        updatedAt: override.updatedAt
      };
      dataService.setItem(ALL_USER_OVERRIDES_STORAGE_KEY, JSON.stringify(registry));
    } catch (e) {
      console.error('Error updating overrides registry:', e);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pluto_user_fees_updated', { detail: { override } }));
    }

    // Sync to Supabase users table (user_restriction metadata)
    try {
      if (isSupabaseConfigured()) {
        await supabase
          .from('users')
          .update({
            user_restriction: { fee_override: override },
            updated_at: new Date().toISOString()
          })
          .eq('id', override.userId);
      }
    } catch (e) {
      console.warn('[FeeService] Error syncing user fee override to Supabase:', e);
    }
  },

  /**
   * Delete user fee override and revert user to global defaults
   */
  deleteUserFeeOverride(userId: string): void {
    if (!userId) return;
    const key = `pluto_user_fees_${userId}`;
    dataService.removeItem(key);

    try {
      const raw = dataService.getItem(ALL_USER_OVERRIDES_STORAGE_KEY);
      if (raw) {
        const registry = JSON.parse(raw);
        delete registry[userId];
        dataService.setItem(ALL_USER_OVERRIDES_STORAGE_KEY, JSON.stringify(registry));
      }
    } catch (e) {
      console.error('Error deleting from overrides registry:', e);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pluto_user_fees_updated', { detail: { userId, deleted: true } }));
    }
  },

  /**
   * Get all registered user overrides
   */
  getAllUserFeeOverrides(): Record<string, { userId: string; userEmail?: string; userName?: string; enabled: boolean; updatedAt: string }> {
    try {
      const raw = dataService.getItem(ALL_USER_OVERRIDES_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error reading overrides registry:', e);
    }
    return {};
  },

  /**
   * Get effective fees for an active wallet/user session.
   * If userId has custom fees enabled, user-specific fees override global defaults.
   * Otherwise, returns global fees.
   */
  getEffectiveFees(userOrId?: any, fallbackEmail?: string): FeeConfigMap {
    const globalFees = this.getGlobalFees();
    if (!userOrId) return globalFees;

    const userOverride = this.getUserFeeOverride(userOrId, fallbackEmail);
    if (!userOverride || !userOverride.enabled) {
      return globalFees;
    }

    // Merge: User custom fees override global defaults, but any missing coin falls back to global
    return {
      ...globalFees,
      ...userOverride.fees
    };
  }
};
