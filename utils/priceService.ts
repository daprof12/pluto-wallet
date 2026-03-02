/**
 * CoinGecko Price Service
 * Fetches real-time cryptocurrency prices and 24h changes
 * Free tier: 10-50 calls/minute (no API key required)
 */

import { loadAssetConfig } from './assetConfig';

export interface PriceData {
  [symbol: string]: {
    usd: number;
    usd_24h_change: number;
  };
}

export interface CoinGeckoResponse {
  [coinId: string]: {
    usd: number;
    usd_24h_change: number;
  };
}

// Default map for backward compatibility
const DEFAULT_COINGECKO_IDS: { [symbol: string]: string } = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  USDT: 'tether',
};

/**
 * Build CoinGecko ID mapping dynamically from asset configurations
 */
function getCoinGeckoIdMapping(): { [symbol: string]: string } {
  try {
    const assetConfig = loadAssetConfig();
    const mapping: { [symbol: string]: string } = {};
    
    assetConfig.forEach(asset => {
      if (asset.coinGeckoId) {
        mapping[asset.symbol] = asset.coinGeckoId;
      } else if (DEFAULT_COINGECKO_IDS[asset.symbol]) {
        // Fallback to default mapping
        mapping[asset.symbol] = DEFAULT_COINGECKO_IDS[asset.symbol];
      }
    });
    
    return mapping;
  } catch (e) {
    console.error('Error building CoinGecko ID mapping:', e);
    return DEFAULT_COINGECKO_IDS;
  }
}

// Cache to prevent excessive API calls
let priceCache: {
  data: PriceData | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0
};

// Cache duration: 30 seconds (to stay within rate limits)
const CACHE_DURATION = 30000;

/**
 * Fetch real-time cryptocurrency prices from CoinGecko
 * @param symbols - Array of cryptocurrency symbols (e.g., ['BTC', 'ETH'])
 * @returns Promise with price data
 */
export async function fetchCryptoPrices(symbols: string[]): Promise<PriceData> {
  // Check cache first
  const now = Date.now();
  if (priceCache.data && (now - priceCache.timestamp) < CACHE_DURATION) {
    console.log('📊 Using cached price data');
    return priceCache.data;
  }

  try {
    // Convert symbols to CoinGecko IDs
    const coinIds = symbols
      .map(symbol => getCoinGeckoIdMapping()[symbol])
      .filter(Boolean)
      .join(',');

    if (!coinIds) {
      throw new Error('No valid coin IDs found');
    }

    console.log('🌐 Fetching prices from CoinGecko API...');
    
    // CoinGecko API endpoint (no API key required for basic usage)
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
    }

    const data: CoinGeckoResponse = await response.json();
    
    // Transform data to our format
    const priceData: PriceData = {};
    
    symbols.forEach(symbol => {
      const coinId = getCoinGeckoIdMapping()[symbol];
      if (coinId && data[coinId]) {
        priceData[symbol] = {
          usd: data[coinId].usd,
          usd_24h_change: data[coinId].usd_24h_change
        };
      }
    });

    // Update cache
    priceCache = {
      data: priceData,
      timestamp: now
    };

    console.log('✅ Price data fetched successfully:', priceData);
    return priceData;

  } catch (error) {
    console.error('❌ Error fetching prices from CoinGecko:', error);
    
    // Return fallback data if API fails
    return getFallbackPrices(symbols);
  }
}

/**
 * Fallback prices in case API is unavailable
 */
function getFallbackPrices(symbols: string[]): PriceData {
  const fallbackData: PriceData = {
    BTC: { usd: 45230.50, usd_24h_change: 2.4 },
    ETH: { usd: 3420.75, usd_24h_change: -1.2 },
    SOL: { usd: 98.32, usd_24h_change: 5.8 },
    BNB: { usd: 315.60, usd_24h_change: 3.1 },
    USDT: { usd: 1.00, usd_24h_change: 0.0 }
  };

  const result: PriceData = {};
  symbols.forEach(symbol => {
    if (fallbackData[symbol]) {
      result[symbol] = fallbackData[symbol];
    }
  });

  console.log('⚠️ Using fallback price data');
  return result;
}

/**
 * Add a new coin to the CoinGecko ID mapping
 * @param symbol - Cryptocurrency symbol (e.g., 'DOGE')
 * @param coinGeckoId - CoinGecko coin ID (e.g., 'dogecoin')
 */
export function addCoinMapping(symbol: string, coinGeckoId: string): void {
  const mapping = getCoinGeckoIdMapping();
  mapping[symbol] = coinGeckoId;
}

/**
 * Get all supported coin symbols
 */
export function getSupportedCoins(): string[] {
  return Object.keys(getCoinGeckoIdMapping());
}

/**
 * Clear the price cache (force refresh on next fetch)
 */
export function clearPriceCache(): void {
  priceCache = {
    data: null,
    timestamp: 0
  };
}

/**
 * Fetch historical price data for charts (7 days)
 * @param symbol - Cryptocurrency symbol
 * @returns Promise with array of [timestamp, price]
 */
export async function fetchHistoricalPrices(symbol: string, days: number = 7): Promise<[number, number][]> {
  const coinId = getCoinGeckoIdMapping()[symbol];
  
  if (!coinId) {
    console.warn(`⚠️ No CoinGecko ID found for ${symbol}`);
    return [];
  }

  try {
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Return price data as [timestamp, price] tuples
    return data.prices || [];

  } catch (error) {
    console.error(`❌ Error fetching historical prices for ${symbol}:`, error);
    return [];
  }
}