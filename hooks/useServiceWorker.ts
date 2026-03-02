import { useEffect, useState } from 'react';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isUpdating: boolean;
  registration: ServiceWorkerRegistration | null;
  error: Error | null;
}

/**
 * Custom hook for managing service worker registration and updates
 */
export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: 'serviceWorker' in navigator,
    isRegistered: false,
    isUpdating: false,
    registration: null,
    error: null
  });

  useEffect(() => {
    // Only register service worker in production and if supported
    if (!state.isSupported || process.env.NODE_ENV !== 'production') {
      console.log('[PWA] Service Worker not supported or in development mode');
      return;
    }

    const registerServiceWorker = async () => {
      try {
        console.log('[PWA] Registering Service Worker...');
        
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        console.log('[PWA] Service Worker registered successfully:', registration);

        setState(prev => ({
          ...prev,
          isRegistered: true,
          registration
        }));

        // Check for updates every hour
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);

        // Listen for service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          if (!newWorker) return;

          console.log('[PWA] New Service Worker found, updating...');
          
          setState(prev => ({
            ...prev,
            isUpdating: true
          }));

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is installed and ready
              console.log('[PWA] New Service Worker installed, ready to activate');
              
              // Notify user about update
              if (confirm('A new version of Pluto Wallet is available. Update now?')) {
                // Tell the new service worker to skip waiting
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                
                // Reload the page to activate new service worker
                window.location.reload();
              }
              
              setState(prev => ({
                ...prev,
                isUpdating: false
              }));
            }
          });
        });

        // Listen for controller change (new service worker activated)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('[PWA] Service Worker controller changed, reloading...');
          window.location.reload();
        });

      } catch (error) {
        console.error('[PWA] Service Worker registration failed:', error);
        setState(prev => ({
          ...prev,
          error: error as Error
        }));
      }
    };

    registerServiceWorker();
  }, [state.isSupported]);

  // Function to manually update service worker
  const updateServiceWorker = async () => {
    if (state.registration) {
      await state.registration.update();
    }
  };

  // Function to unregister service worker
  const unregisterServiceWorker = async () => {
    if (state.registration) {
      const success = await state.registration.unregister();
      if (success) {
        setState(prev => ({
          ...prev,
          isRegistered: false,
          registration: null
        }));
      }
      return success;
    }
    return false;
  };

  // Function to clear all caches
  const clearCaches = async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('[PWA] All caches cleared');
    }
  };

  return {
    ...state,
    updateServiceWorker,
    unregisterServiceWorker,
    clearCaches
  };
}
