import { useState, useEffect } from 'react';
import { Moon, Sun, LogOut, ShieldCheck, UserCheck, ArrowLeft } from 'lucide-react';
import LandingPage from './components/LandingPage';
import WalletOnboarding from './components/WalletOnboarding';
import WalletDashboard from './components/WalletDashboard';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import UnlockWallet from './components/UnlockWallet';
import TwoFactorAuth from './components/TwoFactorAuth';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import PrivacyPolicy from './components/PrivacyPolicy';
import { initializeAssetConfig } from './utils/assetConfig';
import { useServiceWorker } from './hooks/useServiceWorker';
import { storage, storageSync } from './utils/platform';
import dataService from './utils/dataService';
import { adminUserService, AdminUser } from './utils/adminUserService';

type View = 'landing' | 'onboarding' | 'wallet' | 'admin' | 'adminLogin' | 'unlock' | '2fa-setup' | '2fa-auth' | 'import-auth' | 'privacy';

export default function App() {
  const [view, setView] = useState<View>(() => {
    try {
      // Check for direct URL navigation
      if (typeof window !== 'undefined') {
        if (window.location.pathname === '/privacy') {
          return 'privacy';
        }
        if (window.location.pathname === '/admin' || window.location.pathname === '/admin/login') {
          const activeAdminSession = storageSync.get('pluto_admin_session');
          return activeAdminSession ? 'admin' : 'adminLogin';
        }
      }

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
  const [isImpersonatingUser, setIsImpersonatingUser] = useState<boolean>(() => {
    return sessionStorage.getItem('pluto_impersonating_user') === 'true';
  });
  const [importWalletData, setImportWalletData] = useState<any>(null); // Temporary storage for import authentication
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(() => adminUserService.getCurrentAdminSession());

  // Persist current view to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('pluto_current_view', view);

    // Sync browser URL
    if (typeof window !== 'undefined') {
      if (view === 'privacy') {
        window.history.replaceState({ view: 'privacy' }, '', '/privacy');
      } else {
        window.history.replaceState({ view }, '', '/');
      }
    }
  }, [view]);

  // Initialize PWA service worker
  const { isSupported: swSupported, isRegistered: swRegistered } = useServiceWorker();

  // Cloud-First Initialization: Sync with Supabase on app load
  useEffect(() => {
    let isMounted = true;
    initializeAssetConfig();

    async function initializeCloud() {
      try {
        console.log('☁️ Connecting and syncing with Supabase database...');
        // Max 3.5s timeout so app never blocks indefinitely
        await Promise.race([
          dataService.initCloudSync(),
          new Promise(resolve => setTimeout(resolve, 3500))
        ]);
        console.log('✅ Supabase cloud sync complete');
      } catch (err) {
        console.warn('⚠️ Cloud sync initialization warning:', err);
      }

      if (!isMounted) return;

      // Update wallet data from synced cloud state
      const syncedWallet = storageSync.get('pluto_wallet');
      if (syncedWallet) {
        setWalletData(syncedWallet);
      }

      const activeWalletSession = sessionStorage.getItem('pluto_session_active');
      const activeAdminSession = storageSync.get('pluto_admin_session');
      const savedView = sessionStorage.getItem('pluto_current_view') as View | null;

      // Direct URL navigation check
      if (typeof window !== 'undefined') {
        if (window.location.pathname === '/privacy') {
          setView('privacy');
          setIsInitializing(false);
          return;
        }
        if (window.location.pathname === '/admin' || window.location.pathname === '/admin/login') {
          setView(activeAdminSession ? 'admin' : 'adminLogin');
          setIsInitializing(false);
          return;
        }
      }

      // Restore view according to synced cloud data
      if (savedView === 'admin' && activeAdminSession) {
        setView('admin');
      } else if (savedView === 'adminLogin') {
        setView('adminLogin');
      } else if (savedView === 'wallet' && syncedWallet && activeWalletSession === 'true') {
        setView('wallet');
      } else if (savedView === 'unlock' && syncedWallet) {
        setView('unlock');
      } else if (savedView === 'landing') {
        setView('landing');
      } else if (savedView === 'onboarding') {
        setView('onboarding');
      } else if (syncedWallet && activeWalletSession === 'true') {
        setView('wallet');
      } else if (syncedWallet) {
        setView('unlock');
      } else {
        setView('landing');
      }

      setIsInitializing(false);
    }

    initializeCloud();

    return () => {
      isMounted = false;
    };
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
    // Listen for storage changes (when admin updates balance from different tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pluto_wallet' && e.newValue) {
        try {
          const updatedWallet = JSON.parse(e.newValue);
          setWalletData(updatedWallet);
        } catch {}
      }
    };

    // Listen for custom event (when admin updates balance or realtime triggers update)
    const handleCustomWalletUpdate = ((e: CustomEvent) => {
      const data = e.detail?.walletData || e.detail?.wallet;
      if (data) {
        setWalletData(data);
      }
    }) as EventListener;

    // Listen for generic Supabase Realtime sync updates
    const handlePlutoDataUpdated = ((e: CustomEvent) => {
      if (e.detail && e.detail.key === 'pluto_wallet' && e.detail.value) {
        setWalletData(e.detail.value);
      }
    }) as EventListener;

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('walletDataUpdated', handleCustomWalletUpdate);
    window.addEventListener('walletUpdated', handleCustomWalletUpdate);
    window.addEventListener('pluto_data_updated', handlePlutoDataUpdated);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('walletDataUpdated', handleCustomWalletUpdate);
      window.removeEventListener('walletUpdated', handleCustomWalletUpdate);
      window.removeEventListener('pluto_data_updated', handlePlutoDataUpdated);
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

  const handleUnlockWallet = (unlockedWallet?: any) => {
    const target = unlockedWallet || walletData;
    if (unlockedWallet) {
      setWalletData(unlockedWallet);
    }
    // After password unlock, check if 2FA is enabled
    if (target?.twoFactorAuth?.enabled) {
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
    setCurrentAdmin(adminUserService.getCurrentAdminSession());
    setView('admin');
  };

  const handleAdminLogout = () => {
    // Clear admin session
    adminUserService.clearAdminSession();
    storage.remove('pluto_admin_session');
    setCurrentAdmin(null);
    setIsImpersonatingUser(false);
    sessionStorage.removeItem('pluto_impersonating_user');
    setView('adminLogin');
  };

  const handleAdminLoginAsUser = (user: any) => {
    // Construct valid walletData structure for WalletDashboard
    const userWalletData = {
      id: user.id,
      email: user.email,
      phone: user.phone || '',
      fullName: user.fullName || user.email?.split('@')[0] || 'User',
      mnemonic_encrypted: user.mnemonic_encrypted || btoa('apple banana cherry dog elephant fox grape horse igloo jaguar kangaroo lemon'),
      password: user.password || btoa('User@123'),
      passwordLastChanged: user.passwordLastChanged || user.created_at,
      addresses: user.addresses || {
        BTC: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
        ETH: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
        SOL: '7YpJ5x9nE4kBYmJmGKZhCvXBAPngXzFqPmgvT8KJnKvH',
        BNB: 'bnb136ns6lfw4zs5hg4n85vdthaad7hq5m4gtkgf23',
        USDT: 'TJDENsfBJs4RFETt1X1W8wMDc8M5XnJhCe'
      },
      balances: user.balances || { BTC: '0', ETH: '0', SOL: '0', BNB: '0', USDT: '0.00' },
      transactions: user.transactions || [],
      twoFactorAuth: user.twoFactorAuth || {
        enabled: false,
        preferredMethod: null,
        passcode: null,
        biometricEnabled: false,
        biometricData: null,
        setupDate: null
      },
      failedLoginAttempts: user.failedLoginAttempts || 0,
      accountLocked: user.accountLocked || false,
      kyc_status: user.kyc_status || 'pending',
      kyc_data: user.kyc_data || null,
      blocked: user.blocked || false,
      created_at: user.created_at || new Date().toISOString(),
      last_login: new Date().toISOString()
    };

    setWalletData(userWalletData);
    storage.set('pluto_wallet', userWalletData);
    setIsWalletUnlocked(true);
    sessionStorage.setItem('pluto_session_active', 'true');
    setIsImpersonatingUser(true);
    sessionStorage.setItem('pluto_impersonating_user', 'true');
    setView('wallet');
  };

  const handleExitImpersonation = () => {
    setIsImpersonatingUser(false);
    sessionStorage.removeItem('pluto_impersonating_user');
    setView('admin');
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
      {isInitializing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-950 text-white">
          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-orange-500 flex items-center justify-center shadow-lg shadow-purple-500/30 animate-pulse">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 opacity-40 blur-lg animate-pulse" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping" />
            <h2 className="text-xl font-bold tracking-wide">Pluto Wallet</h2>
          </div>
          <p className="text-sm text-gray-400">Syncing with database...</p>
        </div>
      )}

      {view === 'landing' && (
        <LandingPage
          onGetStarted={() => setView('onboarding')}
          onAccessWallet={() => setView('unlock')}
          onAdminAccess={() => setView('adminLogin')}
          isLoggedIn={isWalletUnlocked}
          userEmail={walletData?.email || ''}
          onViewWallet={handleViewWallet}
          onLogout={handleLogout}
          onLogoClick={handleLogoClick}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          onPrivacyClick={() => setView('privacy')}
        />
      )}

      {view === 'privacy' && (
        <PrivacyPolicy
          onBack={() => setView('landing')}
          darkMode={darkMode}
        />
      )}

      {view === 'onboarding' && (
        <WalletOnboarding
          onComplete={handleWalletCreated}
          onBack={() => setView('landing')}
          onImportAuth={handleImportWalletAuth}
        />
      )}

      {view === 'unlock' && (
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
        <div className="relative min-h-screen">
          {isImpersonatingUser && (
            <div className="sticky top-0 z-50 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white px-4 py-2.5 shadow-lg border-b border-purple-500/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
                </span>
                <p className="text-xs sm:text-sm font-medium flex items-center gap-2">
                  <span className="font-bold uppercase tracking-wider text-amber-300 text-[10px] px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-500/40">
                    Admin
                  </span>
                  <span>
                    Logged in as <strong className="text-white underline underline-offset-2">{walletData.email}</strong>
                  </span>
                </p>
              </div>
              <button
                onClick={handleExitImpersonation}
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 active:scale-95 text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/30 transition-all shadow-sm cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Admin</span>
              </button>
            </div>
          )}
          <WalletDashboard
            walletData={walletData}
            onLock={handleLockWallet}
            onUpdateWallet={handleUpdateWallet}
            onAssetOverviewChange={setShowingAssetOverview}
            darkMode={darkMode}
            onToggleDarkMode={toggleDarkMode}
            onLogoClick={handleLogoClick}
          />
        </div>
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
          onLoginAsUser={handleAdminLoginAsUser}
          currentAdmin={currentAdmin}
        />
      )}

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  );
}