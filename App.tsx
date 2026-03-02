import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import LandingPage from './components/LandingPage';
import WalletOnboarding from './components/WalletOnboarding';
import WalletDashboard from './components/WalletDashboard';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import UnlockWallet from './components/UnlockWallet';
import TwoFactorAuth from './components/TwoFactorAuth';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { initializeAssetConfig } from './utils/assetConfig';
import { useServiceWorker } from './hooks/useServiceWorker';
import { storage, storageSync } from './utils/platform';
import dataService from './utils/dataService';

type View = 'landing' | 'onboarding' | 'wallet' | 'admin' | 'adminLogin' | 'unlock' | '2fa-setup' | '2fa-auth' | 'import-auth';

export default function App() {
  const [view, setView] = useState<View>(() => {
    try {
      // Initialize view based on session state
      const savedView = sessionStorage.getItem('pluto_current_view') as View | null;
      const existingWallet = storageSync.get('pluto_wallet');
      const activeWalletSession = sessionStorage.getItem('pluto_session_active');
      const activeAdminSession = storageSync.get('pluto_admin_session');

      // Restore landing page if user was there
      if (savedView === 'landing') {
        return 'landing';
      }

      // Restore admin view if admin is logged in
      if (savedView === 'admin' && activeAdminSession) {
        return 'admin';
      }

      // Restore admin login page
      if (savedView === 'adminLogin') {
        return 'adminLogin';
      }

      // Restore wallet view if wallet is unlocked
      if (savedView === 'wallet' && existingWallet && activeWalletSession === 'true') {
        return 'wallet';
      }

      // Restore unlock page if wallet exists
      if (savedView === 'unlock' && existingWallet) {
        return 'unlock';
      }

      // Restore onboarding if user was there
      if (savedView === 'onboarding') {
        return 'onboarding';
      }

      // Restore 2FA pages if wallet exists
      if ((savedView === '2fa-setup' || savedView === '2fa-auth' || savedView === 'import-auth') && existingWallet) {
        return savedView;
      }

      // Default logic when no saved view
      if (existingWallet && activeWalletSession === 'true') {
        return 'wallet';
      } else if (existingWallet) {
        return 'unlock';
      }
      return 'landing';
    } catch (error) {
      console.error('Error initializing view:', error);
      return 'landing';
    }
  });
  const [darkMode, setDarkMode] = useState(() => {
    const saved = storageSync.get('darkMode');
    return saved !== null ? saved : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [walletData, setWalletData] = useState<any>(() => {
    // Initialize wallet data from storage
    return storageSync.get('pluto_wallet') || null;
  });
  const [showingAssetOverview, setShowingAssetOverview] = useState(false);
  const [isWalletUnlocked, setIsWalletUnlocked] = useState(() => {
    // Initialize unlock state from session
    return sessionStorage.getItem('pluto_session_active') === 'true';
  });
  const [importWalletData, setImportWalletData] = useState<any>(null); // Temporary storage for import authentication

  // Persist current view to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('pluto_current_view', view);
  }, [view]);

  // Initialize PWA service worker
  const { isSupported: swSupported, isRegistered: swRegistered } = useServiceWorker();

  // Initialize asset configuration and sync with Supabase on app load
  useEffect(() => {
    initializeAssetConfig();

    // Sync data with Supabase cloud on app start
    dataService.syncAllFromCloud().then(() => {
      console.log('☁️ Supabase cloud sync complete');
      // Re-read wallet data after cloud sync in case it was updated
      const synced = storageSync.get('pluto_wallet');
      if (synced && JSON.stringify(synced) !== JSON.stringify(walletData)) {
        setWalletData(synced);
      }
    }).catch(err => {
      console.warn('☁️ Cloud sync skipped (offline or not configured):', err);
    });

    // Push existing local data to cloud (first-time migration)
    dataService.pushAllToCloud().then(result => {
      if (result.count > 0) {
        console.log(`☁️ Pushed ${result.count} items to Supabase`);
      }
    });
  }, []);

  // Log PWA status
  useEffect(() => {
    if (swSupported && swRegistered) {
      console.log('✅ PWA Service Worker registered successfully');
    }
  }, [swSupported, swRegistered]);

  useEffect(() => {
    storage.set('darkMode', darkMode);
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    // Load wallet from storage
    storage.get('pluto_wallet').then((existingWallet) => {
      if (existingWallet) {
        setWalletData(existingWallet);
      }
    });

    // Listen for storage changes (when admin updates balance from different tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pluto_wallet' && e.newValue) {
        const updatedWallet = JSON.parse(e.newValue);
        setWalletData(updatedWallet);
      }
    };

    // Listen for custom event (when admin updates balance from same tab)
    const handleCustomWalletUpdate = ((e: CustomEvent) => {
      if (e.detail && e.detail.walletData) {
        setWalletData(e.detail.walletData);
      }
    }) as EventListener;

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('walletDataUpdated', handleCustomWalletUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('walletDataUpdated', handleCustomWalletUpdate);
    };
  }, []);

  const handleWalletCreated = (data: any) => {
    setWalletData(data);
    storage.set('pluto_wallet', data);
    // Check if 2FA is set up
    if (!data.twoFactorAuth?.enabled) {
      setView('2fa-setup');
    } else {
      setIsWalletUnlocked(true);
      setView('wallet');
    }
  };

  const handleLockWallet = () => {
    // When locking, mark wallet as locked and show unlock screen if wallet exists
    setIsWalletUnlocked(false);
    sessionStorage.removeItem('pluto_session_active');
    if (walletData) {
      setView('unlock');
    } else {
      setView('landing');
    }
  };

  const handleUnlockWallet = () => {
    // After password unlock, check if 2FA is enabled
    if (walletData?.twoFactorAuth?.enabled) {
      setView('2fa-auth');
    } else {
      setIsWalletUnlocked(true);
      sessionStorage.setItem('pluto_session_active', 'true');
      setView('wallet');
    }
  };

  const handle2FASuccess = () => {
    setIsWalletUnlocked(true);
    sessionStorage.setItem('pluto_session_active', 'true');
    setView('wallet');
  };

  const handle2FABack = () => {
    setView('unlock');
  };

  const handleUpdateWallet = (data: any) => {
    setWalletData(data);
    storage.set('pluto_wallet', data);
  };

  const handleForgotPassword = () => {
    // In production, this would show recovery options
    alert('Recovery options:\\n1. Use your recovery phrase\\n2. Contact support\\n\\nThis is a demo - click OK to return to landing page.');
    setView('landing');
  };

  const handleLogoClick = () => {
    // Navigate to landing page when logo is clicked
    setView('landing');
  };

  const handleImportWalletAuth = (existingWallet: any) => {
    // When importing existing wallet, store it temporarily and redirect to auth
    setImportWalletData(existingWallet);
    setView('import-auth');
  };

  const handleImportAuthSuccess = () => {
    // After successful import authentication, set wallet and unlock
    if (importWalletData) {
      setWalletData(importWalletData);
      setIsWalletUnlocked(true);
      sessionStorage.setItem('pluto_session_active', 'true');
      setView('wallet');
      setImportWalletData(null);
    }
  };

  const handleImportAuthBack = () => {
    // Go back to onboarding and clear temporary import data
    setImportWalletData(null);
    setView('onboarding');
  };

  const handleAdminLogin = () => {
    setView('admin');
  };

  const handleAdminLogout = () => {
    // Clear admin session
    storage.remove('pluto_admin_session');
    setView('adminLogin');
  };

  const handleViewWallet = () => {
    // If wallet is already unlocked, go directly to wallet
    if (isWalletUnlocked) {
      setView('wallet');
    } else {
      // Otherwise, go to unlock screen
      setView('unlock');
    }
  };

  const handleLogout = () => {
    // Lock the wallet and return to landing page
    setIsWalletUnlocked(false);
    sessionStorage.removeItem('pluto_session_active');
    setView('landing');
  };

  const toggleDarkMode = () => setDarkMode(!darkMode);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
      {view === 'landing' && (
        <LandingPage
          onGetStarted={() => setView('onboarding')}
          onAccessWallet={() => walletData ? setView('unlock') : setView('onboarding')}
          onAdminAccess={() => setView('adminLogin')}
          isLoggedIn={isWalletUnlocked}
          userEmail={walletData?.email || ''}
          onViewWallet={handleViewWallet}
          onLogout={handleLogout}
          onLogoClick={handleLogoClick}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
        />
      )}

      {view === 'onboarding' && (
        <WalletOnboarding
          onComplete={handleWalletCreated}
          onBack={() => setView('landing')}
          onImportAuth={handleImportWalletAuth}
        />
      )}

      {view === 'unlock' && walletData && (
        <UnlockWallet
          walletData={walletData}
          onUnlock={handleUnlockWallet}
          onForgot={handleForgotPassword}
          onCreateNew={() => setView('onboarding')}
          onBackToLanding={() => setView('landing')}
        />
      )}

      {view === 'import-auth' && importWalletData && (
        <UnlockWallet
          walletData={importWalletData}
          onUnlock={handleImportAuthSuccess}
          onForgot={handleForgotPassword}
          onCreateNew={() => setView('onboarding')}
          onBackToLanding={handleImportAuthBack}
          isImporting={true}
        />
      )}

      {view === '2fa-setup' && walletData && (
        <TwoFactorAuth
          walletData={walletData}
          onSuccess={handle2FASuccess}
          onBack={() => setView('onboarding')}
          onSkip={handle2FASuccess}
          onUpdateWallet={handleUpdateWallet}
          isSetup={true}
        />
      )}

      {view === '2fa-auth' && walletData && (
        <TwoFactorAuth
          walletData={walletData}
          onSuccess={handle2FASuccess}
          onBack={handle2FABack}
          onUpdateWallet={handleUpdateWallet}
          isSetup={false}
        />
      )}

      {view === 'wallet' && walletData && (
        <WalletDashboard
          walletData={walletData}
          onLock={handleLockWallet}
          onUpdateWallet={handleUpdateWallet}
          onAssetOverviewChange={setShowingAssetOverview}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          onLogoClick={handleLogoClick}
        />
      )}

      {view === 'adminLogin' && (
        <AdminLogin
          onLogin={handleAdminLogin}
          onBack={() => setView('landing')}
          onLogoClick={handleLogoClick}
        />
      )}

      {view === 'admin' && (
        <AdminDashboard
          onBack={handleAdminLogout}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
        />
      )}

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  );
}