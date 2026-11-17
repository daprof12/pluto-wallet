/**
 * Multi-Provider Real-Time Crypto Price Service
 * Primary Provider: iTick API (https://api0.itick.org - docs: https://docs.itick.io/)
 * Fetches real-time cryptocurrency prices, 24h changes, and historical klines with multi-tier failover:
 * 1. iTick Institutional API (Primary: region=BA, sub-100ms, batch quotes & klines)
 * 2. Binance Public API (sub-100ms, 1200 req/min, ultra-lightweight)
 * 3. CryptoCompare Public API (fast failover, generous rate limits)
 * 4. CoinCap Public API (fast, reliable)
 * 5. CoinGecko & CoinPaprika fallback
 * Features:
 * - High-speed real-time quotes via iTick with batch chunking (max 8 symbols/request)
 * - Granular per-symbol caching to prevent cache poisoning
 * - Persistent localStorage caching so prices are available on boot
 * - Stablecoin peg protection ($1.00 guarantee for USDT/USDC across all networks)
 * - Automatic custom symbol matching with `${symbol.toUpperCase()}USDT`
 * - Multi-provider historical chart support (iTick Klines + Binance Klines + CryptoCompare + CoinGecko)
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

// iTick API Configuration (docs: https://docs.itick.io/)
export const ITICK_HOST = 'https://api0.itick.org';
export const ITICK_TOKEN = '2ed11023fd304771997432228060b1fd5afacfcf69a14ee5bb0037df88d794e8';
export const ITICK_REGION = 'BA'; // Binance exchange region

// iTick trading pair mapping (Binance ecosystem)
export const ITICK_PAIR_MAPPING: Record<string, string> = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  SOL: 'SOLUSDT',
  BNB: 'BNBUSDT',
  XRP: 'XRPUSDT',
  ADA: 'ADAUSDT',
  DOGE: 'DOGEUSDT',
  TRX: 'TRXUSDT',
  AVAX: 'AVAXUSDT',
  MATIC: 'POLUSDT',
  POL: 'POLUSDT',
  LINK: 'LINKUSDT',
  TON: 'TONUSDT',
  SHIB: 'SHIBUSDT'
};

/**
 * Resolve iTick trading pair code for any cryptocurrency symbol
 */
export function getITickPair(symbol: string): string {
  const upper = symbol.toUpperCase();
  if (ITICK_PAIR_MAPPING[upper]) {
    return ITICK_PAIR_MAPPING[upper];
  }
  return `${upper}USDT`;
}

// Binance trading pair mapping (backup)
const BINANCE_PAIR_MAPPING: Record<string, string> = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  SOL: 'SOLUSDT',
  BNB: 'BNBUSDT',
  XRP: 'XRPUSDT',
  ADA: 'ADAUSDT',
  DOGE: 'DOGEUSDT',
  TRX: 'TRXUSDT',
  AVAX: 'AVAXUSDT',
  MATIC: 'POLUSDT',
  POL: 'POLUSDT',
  LINK: 'LINKUSDT',
  TON: 'TONUSDT',
  SHIB: 'SHIBUSDT'
};

// CoinCap ID mapping
const COINCAP_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binance-coin',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  TRX: 'tron',
  AVAX: 'avalanche',
  MATIC: 'polygon',
  POL: 'polygon',
  LINK: 'chainlink',
  TON: 'the-open-network',
  SHIB: 'shiba-inu'
};

// Default CoinGecko ID mapping
const DEFAULT_COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  USDT: 'tether',
  USDT_ERC20: 'tether',
  USDT_BEP20: 'tether',
  USDT_TRC20: 'tether',
  USDC: 'usd-coin',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  TRX: 'tron',
  AVAX: 'avalanche-2',
  MATIC: 'matic-network',
  POL: 'matic-network',
  LINK: 'chainlink',
  TON: 'the-open-network',
  SHIB: 'shiba-inu'
};

// CoinPaprika ID mapping
const COINPAPRIKA_IDS: Record<string, string> = {
  BTC: 'btc-bitcoin',
  ETH: 'eth-ethereum',
  SOL: 'sol-solana',
  BNB: 'bnb-binance-coin',
  USDT: 'usdt-tether',
  USDT_ERC20: 'usdt-tether',
  USDT_BEP20: 'usdt-tether',
  USDT_TRC20: 'usdt-tether',
  USDC: 'usdc-usd-coin',
  XRP: 'xrp-xrp',
  ADA: 'ada-cardano',
  DOGE: 'doge-dogecoin',
  TRX: 'trx-tron',
  AVAX: 'avax-avalanche',
  MATIC: 'pol-polygon-ecosystem-token',
  POL: 'pol-polygon-ecosystem-token',
  LINK: 'link-chainlink',
  TON: 'ton-tontoken',
  SHIB: 'shib-shiba-inu'
};

// Realistic baseline fallbacks
const MARKET_BASELINE_FALLBACK: PriceData = {
  BTC: { usd: 64800.00, usd_24h_change: 0.5 },
  ETH: { usd: 1835.00, usd_24h_change: 1.2 },
  SOL: { usd: 72.80, usd_24h_change: 2.1 },
  BNB: { usd: 593.50, usd_24h_change: 0.8 },
  USDT: { usd: 1.00, usd_24h_change: 0.0 },
  USDT_ERC20: { usd: 1.00, usd_24h_change: 0.0 },
  USDT_BEP20: { usd: 1.00, usd_24h_change: 0.0 },
  USDT_TRC20: { usd: 1.00, usd_24h_change: 0.0 },
  USDC: { usd: 1.00, usd_24h_change: 0.0 },
  XRP: { usd: 0.96, usd_24h_change: 1.2 },
  ADA: { usd: 0.154, usd_24h_change: 0.9 },
  DOGE: { usd: 0.059, usd_24h_change: 0.8 },
  TRX: { usd: 0.306, usd_24h_change: 1.0 },
  AVAX: { usd: 7.18, usd_24h_change: 0.6 },
  MATIC: { usd: 0.081, usd_24h_change: 2.5 },
  POL: { usd: 0.081, usd_24h_change: 2.5 },
  LINK: { usd: 9.20, usd_24h_change: 0.8 },
  TON: { usd: 1.60, usd_24h_change: 1.0 },
  SHIB: { usd: 0.00000387, usd_24h_change: 0.2 }
};

interface CachedPriceItem {
  usd: number;
  usd_24h_change: number;
  timestamp: number;
}

// Granular per-symbol cache
const symbolPriceCache: Record<string, CachedPriceItem> = {};

// Cache duration: 15 seconds (allows fast refreshes while preventing unnecessary burst calls)
const CACHE_DURATION = 15000;

const STORAGE_KEY = 'pluto_live_prices';

/**
 * Initialize cache from localStorage
 */
function initCacheFromStorage(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: Record<string, { usd: number; usd_24h_change: number; timestamp?: number }> = JSON.parse(stored);
        Object.entries(parsed).forEach(([sym, val]) => {
          if (val && typeof val.usd === 'number' && !isNaN(val.usd) && val.usd > 0) {
            symbolPriceCache[sym] = {
              usd: val.usd,
              usd_24h_change: typeof val.usd_24h_change === 'number' ? val.usd_24h_change : 0,
              timestamp: val.timestamp || 0
            };
          }
        });
      }
    }
  } catch (e) {
    console.warn('Could not read cached prices from storage:', e);
  }
}

// Initialize immediately
initCacheFromStorage();

/**
 * Persist cache to localStorage
 */
function persistCache(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const exportable: Record<string, { usd: number; usd_24h_change: number; timestamp: number }> = {};
      Object.entries(symbolPriceCache).forEach(([sym, item]) => {
        if (item && item.usd > 0) {
          exportable[sym] = item;
        }
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(exportable));
    }
  } catch (e) {
    console.warn('Could not persist prices to storage:', e);
  }
}

/**
 * Build CoinGecko ID mapping dynamically from asset configurations
 */
function getCoinGeckoIdMapping(): Record<string, string> {
  try {
    const assetConfig = loadAssetConfig();
    const mapping: Record<string, string> = {};
    
    assetConfig.forEach(asset => {
      if (asset.coinGeckoId) {
        mapping[asset.symbol] = asset.coinGeckoId;
      } else if (DEFAULT_COINGECKO_IDS[asset.symbol]) {
        mapping[asset.symbol] = DEFAULT_COINGECKO_IDS[asset.symbol];
      }
    });
    
    return mapping;
  } catch (e) {
    console.error('Error building CoinGecko ID mapping:', e);
    return DEFAULT_COINGECKO_IDS;
  }
}

/**
 * Helper: Check if a symbol represents a stablecoin pegged to 1.00 USD
 */
export function isStablecoin(symbol: string): boolean {
  const upper = symbol.toUpperCase();
  return upper.startsWith('USDT') || upper.startsWith('USDC') || upper === 'DAI' || upper === 'BUSD';
}

/**
 * Provider 1 (PRIMARY): iTick Public API (https://api0.itick.org)
 * Ultra-fast institutional market data for Binance crypto ecosystem (region=BA)
 * Handles quotes with batch chunking (max 8 codes/call to respect tier limit)
 */
export async function fetchPricesFromITick(symbols: string[]): Promise<PriceData> {
  const result: PriceData = {};
  const nonStable = symbols.filter(s => !isStablecoin(s));
  if (nonStable.length === 0) return result;

  const codeToSymbols: Record<string, string[]> = {};
  nonStable.forEach(sym => {
    const code = getITickPair(sym);
    if (!codeToSymbols[code]) {
      codeToSymbols[code] = [];
    }
    codeToSymbols[code].push(sym);
  });

  const uniqueCodes = Object.keys(codeToSymbols);
  const CHUNK_SIZE = 8;
  const chunks: string[][] = [];
  for (let i = 0; i < uniqueCodes.length; i += CHUNK_SIZE) {
    chunks.push(uniqueCodes.slice(i, i + CHUNK_SIZE));
  }

  const chunkPromises = chunks.map(async chunk => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);

      const url = `${ITICK_HOST}/crypto/quotes?region=${ITICK_REGION}&codes=${encodeURIComponent(chunk.join(','))}`;
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'token': ITICK_TOKEN,
          'Accept': 'application/json'
        }
      });
      clearTimeout(timeout);

      if (response.ok) {
        const json = await response.json();
        if (json && json.code === 0 && json.data) {
          Object.entries(json.data).forEach(([code, item]: [string, any]) => {
            if (item && item.ld !== undefined && item.ld !== null) {
              const usd = typeof item.ld === 'number' ? item.ld : parseFloat(item.ld);
              const change = typeof item.chp === 'number' ? item.chp : parseFloat(item.chp || '0');
              if (!isNaN(usd) && usd > 0) {
                const mappedSymbols = codeToSymbols[code] || [];
                mappedSymbols.forEach(s => {
                  result[s] = {
                    usd,
                    usd_24h_change: isNaN(change) ? 0 : change
                  };
                });
              }
            }
          });
        }
      }
    } catch (e) {
      console.warn('iTick chunk quote fetch failed for:', chunk, e);
    }
  });

  await Promise.allSettled(chunkPromises);
  return result;
}

/**
 * Provider 2: Binance Public API (sub-100ms, ultra-lightweight, 1200 req/min)
 */
async function fetchPricesFromBinance(symbols: string[]): Promise<PriceData> {
  const result: PriceData = {};
  const pairsToFetch: { symbol: string; pair: string }[] = [];

  symbols.forEach(sym => {
    const pair = BINANCE_PAIR_MAPPING[sym] || getITickPair(sym);
    if (pair) {
      pairsToFetch.push({ symbol: sym, pair });
    }
  });

  if (pairsToFetch.length === 0) return result;

  const pairListStr = JSON.stringify(pairsToFetch.map(p => p.pair));
  
  // Binance official endpoints (primary and high-reliability data mirror)
  const endpoints = [
    `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(pairListStr)}`,
    `https://data-api.binance.vision/api/v3/ticker/24hr?symbols=${encodeURIComponent(pairListStr)}`
  ];

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          data.forEach(item => {
            const matched = pairsToFetch.find(p => p.pair === item.symbol);
            if (matched && item.lastPrice) {
              const usd = parseFloat(item.lastPrice);
              const change = parseFloat(item.priceChangePercent || '0');
              if (!isNaN(usd) && usd > 0) {
                result[matched.symbol] = {
                  usd,
                  usd_24h_change: isNaN(change) ? 0 : change
                };
              }
            }
          });
          if (Object.keys(result).length > 0) {
            return result;
          }
        }
      }
    } catch {
      // Continue to next mirror
    }
  }

  return result;
}

/**
 * Provider 3: CryptoCompare Public API (generous rate limits, fast response)
 */
async function fetchPricesFromCryptoCompare(symbols: string[]): Promise<PriceData> {
  const result: PriceData = {};
  try {
    const cleanSymbols = symbols.filter(s => !isStablecoin(s));
    if (cleanSymbols.length === 0) return result;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const url = `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${cleanSymbols.join(',')}&tsyms=USD`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      if (data?.RAW) {
        cleanSymbols.forEach(sym => {
          const coinData = data.RAW[sym]?.USD;
          if (coinData && typeof coinData.PRICE === 'number' && coinData.PRICE > 0) {
            result[sym] = {
              usd: coinData.PRICE,
              usd_24h_change: typeof coinData.CHANGEPCT24HOUR === 'number' ? coinData.CHANGEPCT24HOUR : 0
            };
          }
        });
      }
    }
  } catch (e) {
    console.warn('CryptoCompare price fetch warning:', e);
  }
  return result;
}

/**
 * Provider 4: CoinCap Public API
 */
async function fetchPricesFromCoinCap(symbols: string[]): Promise<PriceData> {
  const result: PriceData = {};
  try {
    const ids = symbols.map(s => COINCAP_IDS[s]).filter(Boolean);
    if (ids.length === 0) return result;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const url = `https://api.coincap.io/v2/assets?ids=${ids.join(',')}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data?.data)) {
        symbols.forEach(sym => {
          const targetId = COINCAP_IDS[sym];
          const match = data.data.find((c: any) => c.id === targetId || c.symbol?.toUpperCase() === sym.toUpperCase());
          if (match && match.priceUsd) {
            const usd = parseFloat(match.priceUsd);
            const change = parseFloat(match.changePercent24Hr || '0');
            if (!isNaN(usd) && usd > 0) {
              result[sym] = {
                usd,
                usd_24h_change: isNaN(change) ? 0 : change
              };
            }
          }
        });
      }
    }
  } catch (e) {
    console.warn('CoinCap price fetch warning:', e);
  }
  return result;
}

/**
 * Provider 5: CoinGecko API
 */
async function fetchPricesFromCoinGecko(symbols: string[]): Promise<PriceData> {
  const result: PriceData = {};
  try {
    const mapping = getCoinGeckoIdMapping();
    const uniqueCoinIds = Array.from(new Set(
      symbols.map(s => mapping[s]).filter(Boolean)
    ));

    if (uniqueCoinIds.length === 0) return result;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${uniqueCoinIds.join(',')}&vs_currencies=usd&include_24hr_change=true`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data: CoinGeckoResponse = await response.json();
      symbols.forEach(sym => {
        const coinId = mapping[sym];
        if (coinId && data[coinId] && typeof data[coinId].usd === 'number' && data[coinId].usd > 0) {
          result[sym] = {
            usd: data[coinId].usd,
            usd_24h_change: data[coinId].usd_24h_change || 0
          };
        }
      });
    }
  } catch (e) {
    console.warn('CoinGecko price fetch warning:', e);
  }
  return result;
}

/**
 * Provider 6: CoinPaprika API (targeted single-ticker queries for remaining missing coins)
 */
async function fetchPricesFromCoinPaprika(symbols: string[]): Promise<PriceData> {
  const result: PriceData = {};
  const promises = symbols.map(async (sym) => {
    const targetId = COINPAPRIKA_IDS[sym];
    if (!targetId) return;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`https://api.coinpaprika.com/v1/tickers/${targetId}?quotes=USD`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeout);
      if (res.ok) {
        const item = await res.json();
        const price = item.quotes?.USD?.price;
        if (typeof price === 'number' && price > 0) {
          result[sym] = {
            usd: price,
            usd_24h_change: item.quotes?.USD?.percent_change_24h || 0
          };
        }
      }
    } catch {}
  });

  await Promise.allSettled(promises);
  return result;
}

/**
 * Fetch real-time cryptocurrency prices with multi-source fallback and granular caching
 * @param symbols - Array of cryptocurrency symbols (e.g. ['BTC', 'ETH', 'SOL'])
 * @param forceRefresh - If true, bypasses the in-memory cache
 */
export async function fetchCryptoPrices(symbols: string[], forceRefresh: boolean = false): Promise<PriceData> {
  const now = Date.now();
  const result: PriceData = {};
  const symbolsToFetch: string[] = [];

  // Check granular cache for each requested symbol
  symbols.forEach(sym => {
    // Guaranteed stablecoin peg: USDT / USDC are always 1.00 USD
    if (isStablecoin(sym)) {
      result[sym] = { usd: 1.00, usd_24h_change: 0.0 };
      symbolPriceCache[sym] = { usd: 1.00, usd_24h_change: 0.0, timestamp: now };
      return;
    }

    const cached = symbolPriceCache[sym];
    if (!forceRefresh && cached && (now - cached.timestamp) < CACHE_DURATION && cached.usd > 0) {
      result[sym] = {
        usd: cached.usd,
        usd_24h_change: cached.usd_24h_change
      };
    } else {
      symbolsToFetch.push(sym);
    }
  });

  // If all requested symbols were freshly cached or stablecoins, return immediately
  if (symbolsToFetch.length === 0) {
    return result;
  }

  // Multi-tier price fetch strategy
  let fetchedData: PriceData = {};

  // Tier 1 (PRIMARY): iTick API (institutional real-time market data)
  try {
    const itickPrices = await fetchPricesFromITick(symbolsToFetch);
    fetchedData = { ...itickPrices };
  } catch (e) {
    console.warn('iTick primary provider failed, using fallback:', e);
  }

  // Tier 2: Binance API (backup, sub-100ms, lightweight, 1200 req/min)
  let missing = symbolsToFetch.filter(s => !fetchedData[s] || fetchedData[s].usd <= 0);
  if (missing.length > 0) {
    try {
      const binancePrices = await fetchPricesFromBinance(missing);
      Object.assign(fetchedData, binancePrices);
    } catch (e) {
      console.warn('Binance provider failed, using fallback:', e);
    }
  }

  // Tier 3: CryptoCompare for any missing symbols
  missing = symbolsToFetch.filter(s => !fetchedData[s] || fetchedData[s].usd <= 0);
  if (missing.length > 0) {
    try {
      const ccPrices = await fetchPricesFromCryptoCompare(missing);
      Object.assign(fetchedData, ccPrices);
    } catch {}
  }

  // Tier 4: CoinCap for any still-missing symbols
  missing = symbolsToFetch.filter(s => !fetchedData[s] || fetchedData[s].usd <= 0);
  if (missing.length > 0) {
    try {
      const coincapPrices = await fetchPricesFromCoinCap(missing);
      Object.assign(fetchedData, coincapPrices);
    } catch {}
  }

  // Tier 5: CoinGecko for any still-missing symbols
  missing = symbolsToFetch.filter(s => !fetchedData[s] || fetchedData[s].usd <= 0);
  if (missing.length > 0) {
    try {
      const geckoPrices = await fetchPricesFromCoinGecko(missing);
      Object.assign(fetchedData, geckoPrices);
    } catch {}
  }

  // Tier 6: CoinPaprika targeted lookup for any still-missing symbols
  missing = symbolsToFetch.filter(s => !fetchedData[s] || fetchedData[s].usd <= 0);
  if (missing.length > 0) {
    try {
      const paprikaPrices = await fetchPricesFromCoinPaprika(missing);
      Object.assign(fetchedData, paprikaPrices);
    } catch {}
  }

  // Fill in results, updating cache and applying safety nets
  symbolsToFetch.forEach(sym => {
    let finalItem = fetchedData[sym];

    // Stablecoin guarantee
    if ((!finalItem || finalItem.usd <= 0) && isStablecoin(sym)) {
      finalItem = { usd: 1.00, usd_24h_change: 0.0 };
    }

    // If still missing, check persistent localStorage cache
    if ((!finalItem || finalItem.usd <= 0) && symbolPriceCache[sym] && symbolPriceCache[sym].usd > 0) {
      finalItem = {
        usd: symbolPriceCache[sym].usd,
        usd_24h_change: symbolPriceCache[sym].usd_24h_change
      };
    }

    // Safety net: market baseline fallback
    if (!finalItem || finalItem.usd <= 0) {
      finalItem = MARKET_BASELINE_FALLBACK[sym] || { usd: 0, usd_24h_change: 0 };
    }

    // Store verified positive prices in cache
    if (finalItem.usd > 0) {
      symbolPriceCache[sym] = {
        usd: finalItem.usd,
        usd_24h_change: finalItem.usd_24h_change,
        timestamp: now
      };
    }

    result[sym] = finalItem;
  });

  // Persist verified prices to localStorage
  persistCache();

  // Notify any active components that live prices have been updated
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cryptoPricesUpdated', {
      detail: { prices: result }
    }));
  }

  return result;
}

/**
 * Get current in-memory cached price synchronously for instantaneous UI rendering
 */
export function getCachedPrice(symbol: string): { usd: number; usd_24h_change: number } | null {
  if (symbolPriceCache[symbol] && symbolPriceCache[symbol].usd > 0) {
    return {
      usd: symbolPriceCache[symbol].usd,
      usd_24h_change: symbolPriceCache[symbol].usd_24h_change
    };
  }
  if (isStablecoin(symbol)) {
    return { usd: 1.00, usd_24h_change: 0.0 };
  }
  if (MARKET_BASELINE_FALLBACK[symbol]) {
    return MARKET_BASELINE_FALLBACK[symbol];
  }
  return null;
}

/**
 * Fallback prices in case external APIs are completely unreachable
 */
export function getFallbackPrices(symbols: string[]): PriceData {
  const result: PriceData = {};
  symbols.forEach(symbol => {
    if (symbolPriceCache[symbol] && symbolPriceCache[symbol].usd > 0) {
      result[symbol] = {
        usd: symbolPriceCache[symbol].usd,
        usd_24h_change: symbolPriceCache[symbol].usd_24h_change
      };
    } else if (isStablecoin(symbol)) {
      result[symbol] = { usd: 1.00, usd_24h_change: 0.0 };
    } else if (MARKET_BASELINE_FALLBACK[symbol]) {
      result[symbol] = MARKET_BASELINE_FALLBACK[symbol];
    }
  });
  return result;
}

/**
 * Add a new coin to the CoinGecko ID mapping
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
 * Clear the price cache (forces fresh live query on next fetch)
 */
export function clearPriceCache(): void {
  Object.keys(symbolPriceCache).forEach(k => delete symbolPriceCache[k]);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
}

/**
 * Fetch historical price data for charts with multi-provider failover:
 * 1. iTick Klines (PRIMARY: institutional BA candles, 1h for 24h, 1d for 7d/30d)
 * 2. Binance Klines (fast, reliable backup)
 * 3. CryptoCompare histoday
 * 4. CoinGecko market_chart
 */
export async function fetchHistoricalPrices(symbol: string, days: number = 7): Promise<[number, number][]> {
  // Stablecoin flatline chart
  if (isStablecoin(symbol)) {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const flat: [number, number][] = [];
    for (let i = days; i >= 0; i--) {
      flat.push([now - (i * dayMs), 1.00]);
    }
    return flat;
  }

  // 1. Try iTick Klines first (PRIMARY)
  try {
    const pair = getITickPair(symbol);
    const kType = days <= 1 ? 5 : 8; // 5 = 1 hour, 8 = 1 day
    const limit = days <= 1 ? 24 : days;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const url = `${ITICK_HOST}/crypto/kline?region=${ITICK_REGION}&code=${pair}&kType=${kType}&limit=${limit}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'token': ITICK_TOKEN,
        'Accept': 'application/json'
      }
    });
    clearTimeout(timeout);

    if (response.ok) {
      const json = await response.json();
      if (json && json.code === 0 && Array.isArray(json.data) && json.data.length > 0) {
        const points: [number, number][] = json.data
          .filter((item: any) => item && item.t && (item.c !== undefined && item.c !== null))
          .map((item: any) => [
            typeof item.t === 'number' ? item.t : parseInt(item.t, 10),
            typeof item.c === 'number' ? item.c : parseFloat(item.c)
          ]);
        if (points.length > 0) {
          return points.sort((a, b) => a[0] - b[0]);
        }
      }
    }
  } catch (e) {
    console.warn(`iTick klines for ${symbol} failed, falling back:`, e);
  }

  // 2. Try Binance Klines
  const binancePair = BINANCE_PAIR_MAPPING[symbol] || getITickPair(symbol);
  if (binancePair) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const interval = days <= 1 ? '1h' : '1d';
      const limit = days <= 1 ? 24 : days;
      const url = `https://api.binance.com/api/v3/klines?symbol=${binancePair}&interval=${interval}&limit=${limit}`;
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (response.ok) {
        const klines: any[] = await response.json();
        if (Array.isArray(klines) && klines.length > 0) {
          return klines.map(k => [k[0], parseFloat(k[4])]); // [openTime, closePrice]
        }
      }
    } catch {}
  }

  // 3. Try CryptoCompare histoday / histohour
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const endpoint = days <= 1 ? 'histohour' : 'histoday';
    const limit = days <= 1 ? 24 : days;
    const url = `https://min-api.cryptocompare.com/data/v2/${endpoint}?fsym=${symbol}&tsym=USD&limit=${limit}`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (response.ok) {
      const data = await response.json();
      const list = data?.Data?.Data;
      if (Array.isArray(list) && list.length > 0) {
        return list.map((item: any) => [item.time * 1000, item.close]);
      }
    }
  } catch {}

  // 4. Fallback to CoinGecko
  const mapping = getCoinGeckoIdMapping();
  const coinId = mapping[symbol] || DEFAULT_COINGECKO_IDS[symbol];
  if (coinId) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=${days <= 1 ? 'hourly' : 'daily'}`;
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.prices) && data.prices.length > 0) {
          return data.prices;
        }
      }
    } catch (error) {
      console.warn(`Historical prices for ${symbol} failed:`, error);
    }
  }

  return [];
}
