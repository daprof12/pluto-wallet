import { useState, useEffect } from 'react';
import dataService from '../utils/dataService';
import { fetchCryptoPrices } from '../utils/priceService';

export interface CryptoPriceData {
  prices: { [symbol: string]: number };
  priceChanges: { [symbol: string]: number };
  loading: boolean;
  lastUpdate: Date | null;
  error: string | null;
}

/**
 * Custom hook for fetching and managing real-time cryptocurrency prices
 * @param symbols - Array of cryptocurrency symbols to track
 * @param updateInterval - Update interval in milliseconds (default: 60000 = 1 minute)
 * @returns Object with prices, priceChanges, loading state, and last update time
 */
export function useCryptoPrices(
  symbols: string[],
  updateInterval: number = 60000
): CryptoPriceData {
  // Initialize with fallback prices to prevent undefined errors
  const initialPrices: { [symbol: string]: number } = {};
  const initialChanges: { [symbol: string]: number } = {};
  symbols.forEach(symbol => {
    initialPrices[symbol] = 0;
    initialChanges[symbol] = 0;
  });

  const [prices, setPrices] = useState<{ [symbol: string]: number }>(initialPrices);
  const [priceChanges, setPriceChanges] = useState<{ [symbol: string]: number }>(initialChanges);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (symbols.length === 0) return;

    const updatePrices = async () => {
      setLoading(true);
      setError(null);

      try {
        const priceData = await fetchCryptoPrices(symbols);

        const newPrices: { [symbol: string]: number } = {};
        const newPriceChanges: { [symbol: string]: number } = {};

        symbols.forEach(symbol => {
          if (priceData[symbol]) {
            newPrices[symbol] = priceData[symbol].usd;
            newPriceChanges[symbol] = priceData[symbol].usd_24h_change;
          } else {
            // Keep existing price if update fails for this symbol
            newPrices[symbol] = prices[symbol] || 0;
            newPriceChanges[symbol] = priceChanges[symbol] || 0;
          }
        });

        setPrices(newPrices);
        setPriceChanges(newPriceChanges);
        setLastUpdate(new Date());

        // Store prices in localStorage for gas fee calculations
        Object.entries(newPrices).forEach(([symbol, price]) => {
          dataService.setItem(`price_${symbol}`, price.toString());
        });

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch prices';
        setError(errorMessage);
        console.error('Error in useCryptoPrices:', err);
      } finally {
        setLoading(false);
      }
    };

    // Fetch prices immediately
    updatePrices();

    // Set up interval for periodic updates
    const interval = setInterval(updatePrices, updateInterval);

    // Cleanup
    return () => clearInterval(interval);
  }, [symbols.join(','), updateInterval]);

  return {
    prices,
    priceChanges,
    loading,
    lastUpdate,
    error
  };
}