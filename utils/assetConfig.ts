import btcLogo from '../assets/btc.png';
import bnbLogo from '../assets/bnb.png';
import usdtLogo from '../assets/usdt.png';
import ethLogo from '../assets/eth.png';
import solLogo from '../assets/sol.png';
import xrpLogo from '../assets/XRP.png';
import dataService from './dataService';

export interface AssetConfig {
  symbol: string;
  name: string;
  network?: string;
  color: string;
  icon: string;
  logoUrl: string;
  coinGeckoId?: string; // CoinGecko ID for price fetching (e.g., 'bitcoin', 'ethereum')
  enabled?: boolean; // Admin toggle for Shown on Home
}

// Built-in bundled logos map guaranteed to resolve in dev, build, and production
export const defaultLogos: Record<string, string> = {
  BTC: btcLogo,
  ETH: ethLogo,
  SOL: solLogo,
  BNB: bnbLogo,
  USDT: usdtLogo,
  USDT_ERC20: usdtLogo,
  USDT_BEP20: usdtLogo,
  USDT_TRC20: usdtLogo,
  XRP: xrpLogo
};

// Default asset configurations including popular USDT networks and major cryptocurrencies
export const defaultAssetConfig: AssetConfig[] = [
  { symbol: 'BTC', name: 'Bitcoin', network: 'Bitcoin', color: 'bg-orange-500', icon: '₿', logoUrl: btcLogo, coinGeckoId: 'bitcoin', enabled: true },
  { symbol: 'ETH', name: 'Ethereum', network: 'Ethereum', color: 'bg-blue-600', icon: 'Ξ', logoUrl: ethLogo, coinGeckoId: 'ethereum', enabled: true },
  { symbol: 'SOL', name: 'Solana', network: 'Solana', color: 'bg-purple-600', icon: '◎', logoUrl: solLogo, coinGeckoId: 'solana', enabled: true },
  { symbol: 'BNB', name: 'BNB Chain', network: 'BNB Smart Chain', color: 'bg-yellow-500', icon: 'B', logoUrl: bnbLogo, coinGeckoId: 'binancecoin', enabled: true },
  { symbol: 'USDT', name: 'Tether USD (TRC-20)', network: 'TRON', color: 'bg-green-600', icon: '₮', logoUrl: usdtLogo, coinGeckoId: 'tether', enabled: true },
  { symbol: 'USDT_ERC20', name: 'Tether USD (ERC-20)', network: 'Ethereum', color: 'bg-emerald-600', icon: '₮', logoUrl: usdtLogo, coinGeckoId: 'tether', enabled: true },
  { symbol: 'USDT_BEP20', name: 'Tether USD (BEP-20)', network: 'BNB Smart Chain', color: 'bg-teal-600', icon: '₮', logoUrl: usdtLogo, coinGeckoId: 'tether', enabled: true },
  { symbol: 'USDC', name: 'USD Coin', network: 'Ethereum', color: 'bg-blue-500', icon: '$', logoUrl: '', coinGeckoId: 'usd-coin', enabled: true },
  { symbol: 'XRP', name: 'Ripple', network: 'XRP Ledger', color: 'bg-zinc-800', icon: '✕', logoUrl: xrpLogo, coinGeckoId: 'ripple', enabled: true },
  { symbol: 'ADA', name: 'Cardano', network: 'Cardano', color: 'bg-indigo-600', icon: '₳', logoUrl: '', coinGeckoId: 'cardano', enabled: true },
  { symbol: 'DOGE', name: 'Dogecoin', network: 'Dogecoin', color: 'bg-amber-500', icon: 'Ð', logoUrl: '', coinGeckoId: 'dogecoin', enabled: true },
  { symbol: 'TRX', name: 'TRON', network: 'TRON', color: 'bg-red-600', icon: 'T', logoUrl: '', coinGeckoId: 'tron', enabled: true },
  { symbol: 'AVAX', name: 'Avalanche', network: 'Avalanche C-Chain', color: 'bg-rose-600', icon: '▲', logoUrl: '', coinGeckoId: 'avalanche-2', enabled: true },
  { symbol: 'MATIC', name: 'Polygon', network: 'Polygon', color: 'bg-purple-700', icon: '⬡', logoUrl: '', coinGeckoId: 'matic-network', enabled: true },
  { symbol: 'LINK', name: 'Chainlink', network: 'Ethereum', color: 'bg-sky-600', icon: '⬡', logoUrl: '', coinGeckoId: 'chainlink', enabled: true },
  { symbol: 'TON', name: 'Toncoin', network: 'The Open Network', color: 'bg-cyan-600', icon: '💎', logoUrl: '', coinGeckoId: 'the-open-network', enabled: true },
  { symbol: 'SHIB', name: 'Shiba Inu', network: 'Ethereum', color: 'bg-orange-600', icon: '🐕', logoUrl: '', coinGeckoId: 'shiba-inu', enabled: true }
];

const STORAGE_KEY = 'pluto_asset_config';

/**
 * Load asset configurations from localStorage or return defaults
 */
export function loadAssetConfig(): AssetConfig[] {
  try {
    const stored = dataService.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: AssetConfig[] = JSON.parse(stored);
      // Merge with defaults to ensure all tokens (including new USDT variants) and properties exist
      const merged: AssetConfig[] = [...parsed];
      defaultAssetConfig.forEach(defaultAsset => {
        const existingIdx = merged.findIndex(a => a.symbol === defaultAsset.symbol);
        if (existingIdx === -1) {
          merged.push(defaultAsset);
        } else {
          let logo = merged[existingIdx].logoUrl;
          // If stored logo is missing, an obsolete localhost path, or a relative /assets path for a default coin,
          // prefer the bundled Vite asset URL for 100% production reliability
          if (!logo || logo.startsWith('/@fs') || logo.includes('localhost:5173') || (defaultLogos[defaultAsset.symbol] && !logo.startsWith('data:'))) {
            logo = defaultLogos[defaultAsset.symbol] || defaultAsset.logoUrl;
          }
          merged[existingIdx] = {
            ...defaultAsset,
            ...merged[existingIdx],
            logoUrl: logo,
            network: merged[existingIdx].network || defaultAsset.network,
            enabled: merged[existingIdx].enabled !== undefined ? merged[existingIdx].enabled : true
          };
        }
      });
      return merged;
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