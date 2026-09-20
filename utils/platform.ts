/**
 * Platform Detection and Storage Utilities
 * 
 * This utility provides cross-platform storage that works seamlessly across:
 * - Web browsers (localStorage)
 * - iOS native apps (via Capacitor Preferences)
 * - Android native apps (via Capacitor Preferences)
 * 
 * Usage:
 * import { storage, isNative, isIOS, isAndroid } from './utils/platform';
 * 
 * await storage.set('key', { data: 'value' });
 * const data = await storage.get('key');
 */

// Platform detection helper (works in both web and native)
const getCapacitor = () => {
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    return (window as any).Capacitor;
  }
  return null;
};

const getPreferences = () => {
  if (typeof window !== 'undefined' && (window as any).Capacitor?.Plugins?.Preferences) {
    return (window as any).Capacitor.Plugins.Preferences;
  }
  return null;
};

// Platform detection
export const isNative = (() => {
  const cap = getCapacitor();
  return cap ? cap.isNativePlatform() : false;
})();

export const isIOS = (() => {
  const cap = getCapacitor();
  return cap ? cap.getPlatform() === 'ios' : false;
})();

export const isAndroid = (() => {
  const cap = getCapacitor();
  return cap ? cap.getPlatform() === 'android' : false;
})();

export const isWeb = !isNative;

import dataService from './dataService';

/**
 * Cross-platform storage wrapper
 * Automatically uses localStorage on web and Capacitor Preferences on native,
 * and seamlessly synchronizes all writes to Supabase database via dataService.
 */
export const storage = {
  /**
   * Store a value (automatically handles JSON serialization and cloud sync)
   * @param key Storage key
   * @param value Value to store (will be JSON stringified)
   */
  async set(key: string, value: any): Promise<void> {
    try {
      const stringValue = JSON.stringify(value);
      
      if (isNative) {
        const prefs = getPreferences();
        if (prefs) {
          await prefs.set({ key, value: stringValue });
        }
      }
      
      // Always sync to dataService (updates cache, localStorage, and Supabase)
      dataService.setItem(key, stringValue);
    } catch (error) {
      console.error(`Error storing ${key}:`, error);
      throw error;
    }
  },

  /**
   * Retrieve a value (automatically handles JSON parsing)
   * @param key Storage key
   * @returns Parsed value or null if not found
   */
  async get(key: string): Promise<any> {
    try {
      let stringValue: string | null = null;

      if (isNative) {
        const prefs = getPreferences();
        if (prefs) {
          const result = await prefs.get({ key });
          stringValue = result.value;
        }
      }

      if (!stringValue) {
        stringValue = await dataService.getItemAsync(key);
      }

      return stringValue ? JSON.parse(stringValue) : null;
    } catch (error) {
      console.error(`Error retrieving ${key}:`, error);
      return null;
    }
  },

  /**
   * Remove a value from storage
   * @param key Storage key
   */
  async remove(key: string): Promise<void> {
    try {
      if (isNative) {
        const prefs = getPreferences();
        if (prefs) {
          await prefs.remove({ key });
        }
      }
      dataService.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
      throw error;
    }
  },

  /**
   * Clear all storage
   */
  async clear(): Promise<void> {
    try {
      if (isNative) {
        const prefs = getPreferences();
        if (prefs) {
          await prefs.clear();
        }
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  },

  /**
   * Get all keys in storage
   */
  async keys(): Promise<string[]> {
    try {
      if (isNative) {
        const prefs = getPreferences();
        if (prefs) {
          const result = await prefs.keys();
          return result.keys || [];
        }
      }
      return typeof localStorage !== 'undefined' ? Object.keys(localStorage) : [];
    } catch (error) {
      console.error('Error getting keys:', error);
      return [];
    }
  }
};

/**
 * Synchronous storage helper for initialization
 * Uses dataService in-memory cache and localStorage
 */
export const storageSync = {
  get(key: string): any {
    try {
      const value = dataService.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      return null;
    }
  }
};

/**
 * Migration helper: Migrate existing localStorage to native storage
 * Call this once when app initializes on native platforms
 */
export const migrateLocalStorageToNative = async (): Promise<void> => {
  if (!isNative || typeof localStorage === 'undefined') {
    return;
  }

  try {
    const keys = Object.keys(localStorage);
    console.log(`Migrating ${keys.length} items from localStorage to native storage...`);

    for (const key of keys) {
      const value = localStorage.getItem(key);
      if (value) {
        await storage.set(key, JSON.parse(value));
      }
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error during migration:', error);
  }
};

export default storage;
