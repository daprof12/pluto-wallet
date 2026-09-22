import { useState, useEffect, useCallback, useRef } from 'react';
import dataService from '../utils/dataService';
import { fetchCryptoPrices, getCachedPrice, PriceData } from '../utils/priceService';

export interface CryptoPriceData {
  prices: { [symbol: string]: number };
  priceChanges: { [symbol: string]: number };
  loading: boolean;
  lastUpdate: Date | null;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching and managing real-time cryptocurrency prices
 * @param symbols - Array of cryptocurrency symbols to track
 * @param updateInterval - Update interval in milliseconds (default: 30000 = 30 seconds)
 * @returns Object with prices, priceChanges, loading state, last update time, and refetch handler
 */
export function useCryptoPrices(
  symbols: string[],
  updateInterval: number = 30000
): CryptoPriceData {
  // Initialize with cached/baseline prices immediately to prevent flashing $0.00
  const getInitialState = () => {
    const p: { [symbol: string]: number } = {};
    const c: { [symbol: string]: number } = {};
    symbols.forEach(symbol => {
      const cached = getCachedPrice(symbol);
      p[symbol] = cached ? cached.usd : 0;
      c[symbol] = cached ? cached.usd_24h_change : 0;
    });
    return { p, c };
  };

  const initial = getInitialState();
  const [prices, setPrices] = useState<{ [symbol: string]: number }>(initial.p);
  const [priceChanges, setPriceChanges] = useState<{ [symbol: string]: number }>(initial.c);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(() => new Date());
  const [error, setError] = useState<string | null>(null);

  const symbolsKey = symbols.slice().sort().join(',');
  const isMountedRef = useRef(true);

  const updatePrices = useCallback(async (forceRefresh: boolean = false) => {
    if (symbols.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const priceData: PriceData = await fetchCryptoPrices(symbols, forceRefresh);
      if (!isMountedRef.current) return;

      const newPrices: { [symbol: string]: number } = {};
      const newPriceChanges: { [symbol: string]: number } = {};

      symbols.forEach(symbol => {
        if (priceData[symbol] && priceData[symbol].usd > 0) {
          newPrices[symbol] = priceData[symbol].usd;
          newPriceChanges[symbol] = priceData[symbol].usd_24h_change;
        } else {
          // Keep existing or cached price
          const cached = getCachedPrice(symbol);
          newPrices[symbol] = (prices[symbol] && prices[symbol] > 0) 
            ? prices[symbol] 
            : (cached ? cached.usd : 0);
          newPriceChanges[symbol] = (priceChanges[symbol] !== undefined)
            ? priceChanges[symbol]
            : (cached ? cached.usd_24h_change : 0);
        }
      });

      setPrices(newPrices);
      setPriceChanges(newPriceChanges);
      setLastUpdate(new Date());

      // Store prices in localStorage for fee & transfer calculations
      Object.entries(newPrices).forEach(([symbol, price]) => {
        dataService.setItem(`price_${symbol}`, price.toString());
      });
    } catch (err) {
      if (!isMountedRef.current) return;
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch prices';
      setError(errorMessage);
      console.warn('Error in useCryptoPrices:', err);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [symbolsKey]);

  useEffect(() => {
    isMountedRef.current = true;

    // Fetch prices immediately
    updatePrices(false);

    // Set up interval for periodic updates
    const interval = setInterval(() => {
      updatePrices(false);
    }, updateInterval);

    // Refresh prices when user tabs back into the app
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePrices(false);
      }
    };

    // Listen to external price update events from other components
    const handleExternalPriceUpdate = (e: CustomEvent<{ prices: PriceData }>) => {
      if (e.detail?.prices) {
        setPrices(prev => {
          const next = { ...prev };
          Object.entries(e.detail.prices).forEach(([sym, val]) => {
            if (symbols.includes(sym) && val.usd > 0) {
              next[sym] = val.usd;
            }
          });
          return next;
        });
        setPriceChanges(prev => {
          const next = { ...prev };
          Object.entries(e.detail.prices).forEach(([sym, val]) => {
            if (symbols.includes(sym)) {
              next[sym] = val.usd_24h_change;
            }
          });
          return next;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('cryptoPricesUpdated', handleExternalPriceUpdate as EventListener);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('cryptoPricesUpdated', handleExternalPriceUpdate as EventListener);
    };
  }, [symbolsKey, updateInterval, updatePrices]);

  const refetch = useCallback(async () => {
    await updatePrices(true);
  }, [updatePrices]);

  return {
    prices,
    priceChanges,
    loading,
    lastUpdate,
    error,
    refetch
  };
}