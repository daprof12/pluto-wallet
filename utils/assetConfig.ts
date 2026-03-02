import btcLogo from '../assets/btc.png';
import bnbLogo from '../assets/bnb.png';
import usdtLogo from '../assets/usdt.png';
import ethLogo from '../assets/eth.png';
import solLogo from '../assets/sol.png';
import dataService from './dataService';

export interface AssetConfig {
  symbol: string;
  name: string;
  color: string;
  icon: string;
  logoUrl: string;
  coinGeckoId?: string; // CoinGecko ID for price fetching (e.g., 'bitcoin', 'ethereum')
}

// Default asset configurations
const defaultAssetConfig: AssetConfig[] = [
  { symbol: 'BTC', name: 'Bitcoin', color: 'bg-orange-500', icon: '₿', logoUrl: btcLogo, coinGeckoId: 'bitcoin' },
  { symbol: 'ETH', name: 'Ethereum', color: 'bg-blue-600', icon: 'Ξ', logoUrl: ethLogo, coinGeckoId: 'ethereum' },
  { symbol: 'SOL', name: 'Solana', color: 'bg-purple-600', icon: '◎', logoUrl: solLogo, coinGeckoId: 'solana' },
  { symbol: 'BNB', name: 'BNB Chain', color: 'bg-yellow-500', icon: 'B', logoUrl: bnbLogo, coinGeckoId: 'binancecoin' },
  { symbol: 'USDT', name: 'Tether', color: 'bg-green-600', icon: '₮', logoUrl: usdtLogo, coinGeckoId: 'tether' }
];

const STORAGE_KEY = 'pluto_asset_config';

/**
 * Load asset configurations from localStorage or return defaults
 */
export function loadAssetConfig(): AssetConfig[] {
  try {
    const stored = dataService.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure we have logo URLs even if stored data doesn't
      return parsed.map((asset: AssetConfig) => {
        const defaultAsset = defaultAssetConfig.find(d => d.symbol === asset.symbol);
        return {
          ...asset,
          // Use stored logoUrl if available, otherwise use default
          logoUrl: asset.logoUrl || (defaultAsset?.logoUrl || '')
        };
      });
    }
  } catch (e) {
    console.error('Error loading asset config:', e);
  }
  return defaultAssetConfig;
}

/**
 * Save asset configurations to localStorage
 */
export function saveAssetConfig(config: AssetConfig[]): void {
  try {
    dataService.setItem(STORAGE_KEY, JSON.stringify(config));
    // Dispatch custom event to notify all components of the update
    window.dispatchEvent(new CustomEvent('assetConfigUpdated', {
      detail: { assetConfig: config }
    }));
  } catch (e) {
    console.error('Error saving asset config:', e);
  }
}

/**
 * Get a specific asset configuration by symbol
 */
export function getAssetBySymbol(symbol: string, config?: AssetConfig[]): AssetConfig | undefined {
  const assetConfig = config || loadAssetConfig();
  return assetConfig.find(a => a.symbol === symbol);
}

/**
 * Initialize asset config in localStorage if it doesn't exist
 */
export function initializeAssetConfig(): void {
  const stored = dataService.getItem(STORAGE_KEY);
  if (!stored) {
    saveAssetConfig(defaultAssetConfig);
  }
}