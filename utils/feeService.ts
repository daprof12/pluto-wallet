import dataService from './dataService';
import { loadAssetConfig, AssetConfig } from './assetConfig';

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
  saveGlobalFees(fees: FeeConfigMap): void {
    dataService.setItem(GLOBAL_FEES_STORAGE_KEY, JSON.stringify(fees));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pluto_fees_updated', { detail: { fees } }));
    }
  },

  /**
   * Get custom fee override for a specific user
   */
  getUserFeeOverride(userId: string): UserFeeOverride | null {
    if (!userId) return null;
    try {
      const key = `pluto_user_fees_${userId}`;
      const raw = dataService.getItem(key);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error(`Error reading user fees for ${userId}:`, e);
    }
    return null;
  },

  /**
   * Save custom fee override for a specific user
   */
  saveUserFeeOverride(override: UserFeeOverride): void {
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
  getEffectiveFees(userId?: string): FeeConfigMap {
    const globalFees = this.getGlobalFees();
    if (!userId) return globalFees;

    const userOverride = this.getUserFeeOverride(userId);
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
