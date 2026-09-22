import dataService from '../utils/dataService';
import transactionService from '../utils/transactionService';
import { useState, useEffect } from 'react';
import { 
  Home, 
  RefreshCw, 
  HelpCircle, 
  Settings, 
  Bell, 
  QrCode, 
  ArrowLeft,
  Eye,
  EyeOff,
  ArrowUpRight,
  ArrowDownLeft,
  ShoppingCart,
  Plus,
  DollarSign,
  Sun,
  Moon
} from 'lucide-react';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import SendModal from './wallet/SendModal';
import ReceiveModal from './wallet/ReceiveModal';
import SwapModal from './wallet/SwapModal';
import BuyModal from './wallet/BuyModal';
import SettingsModal from './wallet/SettingsModal';
import NotificationModal from './wallet/NotificationModal';
import SupportModal from './wallet/SupportModal';
import UserFloatingChat from './wallet/UserFloatingChat';
import QRScannerModal from './wallet/QRScannerModal';
import AssetOverview from './wallet/AssetOverview';
import TransactionReceiptModal from './wallet/TransactionReceiptModal';
import AssetLogo from './wallet/AssetLogo';
import Logo from './Logo';
import { loadAssetConfig, AssetConfig } from '../utils/assetConfig';
import { ensureWalletAddresses } from '../utils/addressGenerator';
import { useCryptoPrices } from '../hooks/useCryptoPrices';
import { formatPercentage, formatBalance, formatCryptoPrice } from '../utils/formatNumber';

interface WalletDashboardProps {
  walletData: any;
  onLock: () => void;
  onUpdateWallet: (data: any) => void;
  onAssetOverviewChange?: (showing: boolean) => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  onLogoClick?: () => void; // New prop for logo click
}

export default function WalletDashboard({ walletData, onLock, onUpdateWallet, onAssetOverviewChange, darkMode, onToggleDarkMode, onLogoClick }: WalletDashboardProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [showTransactionReceipt, setShowTransactionReceipt] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [showAssetOverview, setShowAssetOverview] = useState(false);
  const [currentPage, setCurrentPage] = useState<'home' | 'swap' | 'support' | 'receive' | 'buy' | 'settings' | 'send'>('home');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [gasFeeDepositInfo, setGasFeeDepositInfo] = useState<{asset: string; amount: string} | null>(null);

  const currentUserId = walletData?.id || walletData?.userId;
  const [userTransactions, setUserTransactions] = useState<any[]>(() => walletData?.transactions || []);

  useEffect(() => {
    if (!currentUserId) return;

    let isSubscribed = true;

    const loadRemoteTransactions = async () => {
      try {
        const txs = await transactionService.fetchUserTransactions(currentUserId);
        if (isSubscribed && Array.isArray(txs)) {
          setUserTransactions(txs);
        }
      } catch (err) {
        console.warn('[WalletDashboard] Failed loading transactions:', err);
      }
    };

    loadRemoteTransactions();

    const handleTxUpdate = (e: any) => {
      if (!e.detail || !e.detail.userId || e.detail.userId === currentUserId) {
        loadRemoteTransactions();
      }
    };

    const handleWalletUpdated = (e: any) => {
      const w = e.detail?.walletData || e.detail?.wallet;
      if (w && (w.id === currentUserId || w.userId === currentUserId)) {
        if (Array.isArray(w.transactions)) {
          setUserTransactions(w.transactions);
        }
      }
    };

    window.addEventListener('pluto_transactions_updated', handleTxUpdate);
    window.addEventListener('walletDataUpdated', handleWalletUpdated);

    return () => {
      isSubscribed = false;
      window.removeEventListener('pluto_transactions_updated', handleTxUpdate);
      window.removeEventListener('walletDataUpdated', handleWalletUpdated);
    };
  }, [currentUserId]);

  // Get notification count from localStorage (admin-sent notifications)
  const getNotificationCount = () => {
    try {
      const notifications = JSON.parse(dataService.getItem(`pluto_notifications_${walletData.id}`) || '[]');
      return notifications.filter((n: any) => !n.read).length;
    } catch {
      return 0;
    }
  };
  
  const [notificationCount, setNotificationCount] = useState(getNotificationCount());
  
  // Listen for notification updates
  useEffect(() => {
    const handleNotificationUpdate = () => {
      setNotificationCount(getNotificationCount());
    };
    
    window.addEventListener('notificationsUpdated', handleNotificationUpdate);
    return () => window.removeEventListener('notificationsUpdated', handleNotificationUpdate);
  }, [walletData.id]);

  const [assets, setAssets] = useState<AssetConfig[]>(loadAssetConfig());
  
  // Listen for asset config updates (when admin adds new coins)
  useEffect(() => {
    const handleAssetConfigUpdate = (event: any) => {
      setAssets(loadAssetConfig());
    };
    
    // Note: walletUpdated / walletDataUpdated are handled by App.tsx at the top level
    // to update walletData prop without triggering unwanted cloud write-backs.
    window.addEventListener('assetConfigUpdated', handleAssetConfigUpdate);
    
    return () => {
      window.removeEventListener('assetConfigUpdated', handleAssetConfigUpdate);
    };
  }, []);

  // Ensure all configured tokens have a deposit address ready
  useEffect(() => {
    if (walletData && walletData.addresses) {
      const updated = ensureWalletAddresses(walletData);
      if (updated !== walletData) {
        onUpdateWallet(updated);
      }
    }
  }, [walletData?.id]);

  // Real-time cryptocurrency prices from multi-provider live service
  const { prices, priceChanges, loading: pricesLoading, refetch: refetchPrices } = useCryptoPrices(
    assets.map(a => a.symbol),
    30000 // Update every 30 seconds
  );

  const [assetFilterMode, setAssetFilterMode] = useState<'highest' | 'with_balance' | 'all'>('highest');

  const getAssetBalanceInfo = (symbol: string) => {
    const rawStr = (walletData?.balances?.[symbol] ?? '0').toString().trim();
    const bal = parseFloat(rawStr);
    const validBal = isNaN(bal) || bal < 0 ? 0 : bal;
    let price = prices[symbol as keyof typeof prices];
    if (price === undefined || isNaN(price) || price === 0) {
      if (symbol.startsWith('USDT') || symbol.startsWith('USDC')) {
        price = 1.0;
      } else {
        price = 0;
      }
    }
    const usdVal = validBal * price;
    return { bal: validBal, usdVal: isNaN(usdVal) ? 0 : usdVal };
  };

  // Filter assets to show on home page:
  // 1. Admin enabled (asset.enabled !== false)
  // 2. User enabled (walletData.assetDisplaySettings?.[asset.symbol] !== false)
  // 3. Filtered and sorted based on highest balance by default
  const baseVisibleAssets = assets.filter((asset) => {
    const adminEnabled = asset.enabled !== false;
    const userEnabled = walletData.assetDisplaySettings?.[asset.symbol] !== false;
    return adminEnabled && userEnabled;
  });

  const visibleAssets = [...baseVisibleAssets]
    .filter((asset) => {
      if (assetFilterMode === 'with_balance') {
        const { bal } = getAssetBalanceInfo(asset.symbol);
        return bal > 0;
      }
      return true;
    })
    .sort((a, b) => {
      if (assetFilterMode === 'highest' || assetFilterMode === 'with_balance') {
        const infoA = getAssetBalanceInfo(a.symbol);
        const infoB = getAssetBalanceInfo(b.symbol);
        // Primary sort: highest USD value first
        if (Math.abs(infoB.usdVal - infoA.usdVal) > 0.000001) {
          return infoB.usdVal - infoA.usdVal;
        }
        // Secondary sort: highest numerical balance
        if (Math.abs(infoB.bal - infoA.bal) > 0.000001) {
          return infoB.bal - infoA.bal;
        }
      }
      return 0;
    });

  const calculateTotal = () => {
    if (!walletData?.balances || typeof walletData.balances !== 'object') return 0;
    let total = 0;
    Object.entries(walletData.balances || {}).forEach(([asset, balance]) => {
      const rawStr = (balance !== null && balance !== undefined ? balance : '0').toString().trim();
      const val = parseFloat(rawStr);
      if (isNaN(val) || val <= 0) return;

      let price = prices[asset as keyof typeof prices];
      if (price === undefined || isNaN(price) || price === 0) {
        if (asset.startsWith('USDT') || asset.startsWith('USDC')) {
          price = 1.0;
        } else {
          price = 0;
        }
      }
      const itemVal = val * price;
      if (!isNaN(itemVal) && isFinite(itemVal)) {
        total += itemVal;
      }
    });
    return isNaN(total) || !isFinite(total) ? 0 : total;
  };

  // Filter out any non-asset activity (e.g. kyc_review, login, non-asset events)
  const isAssetTx = (tx: any) => {
    if (!tx || typeof tx !== 'object') return false;
    const type = (tx.type || '').toLowerCase();
    if (type === 'kyc_review' || type === 'kyc' || type === 'security' || type === 'login') return false;
    return true;
  };

  // Get transactions from state or wallet data (sorted by timestamp, newest first)
  const rawTxList = (userTransactions.length > 0 ? userTransactions : (walletData.transactions || [])).filter(isAssetTx);
  const transactions = [...rawTxList].sort((a: any, b: any) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const handleViewTransaction = (transaction: any) => {
    setSelectedTransaction(transaction);
    setShowTransactionReceipt(true);
  };

  const handleAssetClick = (asset: any) => {
    setSelectedAsset(asset);
    setShowAssetOverview(true);
    onAssetOverviewChange?.(true);
  };

  const handleAssetOverviewBack = () => {
    setShowAssetOverview(false);
    onAssetOverviewChange?.(false);
  };

  // Check local cache periodically for external updates (e.g. from admin) and notify UI without re-uploading
  useEffect(() => {
    const syncInterval = setInterval(() => {
      const storedWallet = dataService.getItem('pluto_wallet');
      if (storedWallet) {
        try {
          const parsedWallet = JSON.parse(storedWallet);
          const balancesChanged = JSON.stringify(parsedWallet.balances) !== JSON.stringify(walletData.balances);
          const addressesChanged = JSON.stringify(parsedWallet.addresses) !== JSON.stringify(walletData.addresses);
          
          if (balancesChanged || addressesChanged) {
            // Update React state via event without triggering storage.set write-back
            window.dispatchEvent(new CustomEvent('walletDataUpdated', {
              detail: { walletData: parsedWallet }
            }));
          }
        } catch {}
      }
    }, 4000);

    return () => clearInterval(syncInterval);
  }, [walletData.balances, walletData.addresses]);

  // Show Asset Overview if selected
  if (showAssetOverview && selectedAsset) {
    return (
      <AssetOverview
        asset={selectedAsset}
        onBack={handleAssetOverviewBack}
        isDark={walletData.theme === 'dark'}
        walletData={{ ...walletData, transactions }}
        onUpdateWallet={onUpdateWallet}
        isAdmin={false}
        onNavigateToSend={(assetSymbol) => {
          setSelectedAsset(assetSymbol);
          setCurrentPage('send');
          setShowAssetOverview(false);
          onAssetOverviewChange?.(false);
        }}
        onNavigateToReceive={(assetSymbol) => {
          setSelectedAsset(assetSymbol);
          setCurrentPage('receive');
          setShowAssetOverview(false);
          onAssetOverviewChange?.(false);
        }}
        onNavigateToSwap={(assetSymbol) => {
          setSelectedAsset(assetSymbol);
          setCurrentPage('swap');
          setShowAssetOverview(false);
          onAssetOverviewChange?.(false);
        }}
        onNavigateToBuy={(assetSymbol) => {
          setSelectedAsset(assetSymbol);
          setCurrentPage('buy');
          setShowAssetOverview(false);
          onAssetOverviewChange?.(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <div className="flex items-center justify-between">
            {currentPage === 'home' ? (
              <>
                <div className="flex items-center gap-3">
                  <Logo size="sm" showText={false} onClick={onLogoClick} />
                  <div>
                    <h1 className="text-xl text-gray-900 dark:text-white">Pluto Wallet</h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Multi-Chain</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowQRScanner(true)}>
                    <QrCode className="w-5 h-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowNotifications(true)}
                    className="relative"
                  >
                    <Bell className="w-5 h-5" />
                    {notificationCount > 0 && (
                      <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                        {notificationCount}
                      </span>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setCurrentPage('home');
                      setActiveTab('home');
                    }}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <h1 className="text-xl text-gray-900 dark:text-white capitalize">
                    {currentPage}
                  </h1>
                </div>
                {currentPage === 'settings' ? (
                  <div className="flex items-center gap-2">
                    {onToggleDarkMode && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={onToggleDarkMode}
                        className="hover:bg-gray-100 dark:hover:bg-gray-700"
                        aria-label="Toggle dark mode"
                      >
                        {darkMode ? (
                          <Sun className="w-5 h-5 text-yellow-500" />
                        ) : (
                          <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                        )}
                      </Button>
                    )}
                  </div>
                ) : currentPage !== 'send' && (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowQRScanner(true)}>
                      <QrCode className="w-5 h-5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowNotifications(true)}
                      className="relative"
                    >
                      <Bell className="w-5 h-5" />
                      {notificationCount > 0 && (
                        <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                          {notificationCount}
                        </span>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {currentPage === 'home' && (
        <div className="container mx-auto px-4 py-6 pb-24 max-w-4xl">
          {/* Portfolio Summary */}
        <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl p-8 mb-6 text-white">
          <p className="text-sm opacity-90 mb-2">
            Total Balance
            {pricesLoading && <span className="ml-2 text-xs opacity-75">(updating...)</span>}
          </p>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-5xl">
              {showBalance ? `$${calculateTotal().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••'}
            </h2>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label={showBalance ? 'Hide balance' : 'Show balance'}
            >
              {showBalance ? <Eye className="w-6 h-6" /> : <EyeOff className="w-6 h-6" />}
            </button>
            <button
              onClick={async () => {
                setIsRefreshing(true);
                try {
                  await Promise.allSettled([
                    dataService.initCloudSync(),
                    refetchPrices()
                  ]);
                  if (currentUserId) {
                    const freshTxs = await transactionService.fetchUserTransactions(currentUserId);
                    if (Array.isArray(freshTxs)) setUserTransactions(freshTxs);
                  }
                  const storedWallet = dataService.getItem('pluto_wallet');
                  if (storedWallet) {
                    window.dispatchEvent(new CustomEvent('walletDataUpdated', {
                      detail: { walletData: JSON.parse(storedWallet) }
                    }));
                  }
                } catch {}
                setTimeout(() => {
                  setIsRefreshing(false);
                }, 800);
              }}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
              aria-label="Refresh balance"
              title="Refresh balance"
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-6 h-6 transition-transform ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <div className="grid grid-cols-4 gap-4">
            <button
              onClick={() => setCurrentPage('send')}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95"
            >
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <ArrowUpRight className="w-6 h-6" />
              </div>
              <span className="text-sm">Send</span>
            </button>
            <button
              onClick={() => setCurrentPage('receive')}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95"
            >
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <ArrowDownLeft className="w-6 h-6" />
              </div>
              <span className="text-sm">Receive</span>
            </button>
            <button
              onClick={() => setCurrentPage('swap')}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95"
            >
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <RefreshCw className="w-6 h-6" />
              </div>
              <span className="text-sm">Swap</span>
            </button>
            <button
              onClick={() => setCurrentPage('buy')}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95"
            >
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <span className="text-sm">Buy</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="assets" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Assets Tab */}
          <TabsContent value="assets">
            <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg text-gray-900 dark:text-white">Your Assets</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    {visibleAssets.length}
                  </span>
                </div>

                {/* Filter and Sort based on highest balance */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700/60 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setAssetFilterMode('highest')}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                      assetFilterMode === 'highest'
                        ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-sm font-semibold'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    title="Sort assets by highest balance first"
                  >
                    Highest Balance
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssetFilterMode('with_balance')}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                      assetFilterMode === 'with_balance'
                        ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-sm font-semibold'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    title="Show only assets with balance"
                  >
                    With Balance
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssetFilterMode('all')}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                      assetFilterMode === 'all'
                        ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-sm font-semibold'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    title="Show all assets"
                  >
                    All
                  </button>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {pricesLoading ? (
                  // Skeleton loading state
                  <>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="p-4">
                        <div className="flex items-center gap-4">
                          <Skeleton className="w-12 h-12 rounded-full" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <Skeleton className="h-5 w-24" />
                              <Skeleton className="h-5 w-32" />
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-4 w-12 rounded" />
                              </div>
                              <Skeleton className="h-4 w-20" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                ) : visibleAssets.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
                      No assets currently displayed on your home page.
                    </p>
                    <button
                      type="button"
                      onClick={() => setCurrentPage('settings')}
                      className="text-sm font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      Manage displayed assets in Settings → Addresses
                    </button>
                  </div>
                ) : (
                  visibleAssets.map((asset) => {
                    const balance = parseFloat(walletData.balances[asset.symbol] || '0');
                    const price = prices[asset.symbol as keyof typeof prices] || (asset.symbol.includes('USDT') ? 1.00 : 0);
                    const value = balance * price;
                    const change = priceChanges[asset.symbol as keyof typeof priceChanges] || 0;

                    const assetData = {
                      symbol: asset.symbol,
                      name: asset.name,
                      balance: formatBalance(balance),
                      price: price,
                      value: `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                      change: formatPercentage(change),
                      icon: asset.color,
                      network: asset.network || asset.name
                    };

                    return (
                      <div
                        key={asset.symbol}
                        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                        onClick={() => handleAssetClick(assetData)}
                      >
                        <div className="flex items-center gap-4">
                          <AssetLogo
                            logoUrl={asset.logoUrl}
                            name={asset.name}
                            symbol={asset.symbol}
                            color={asset.color}
                            icon={asset.icon}
                            size="w-12 h-12"
                            textSize="text-xl"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2 truncate">
                                <span className="text-gray-900 dark:text-white font-medium">{asset.name}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">({asset.symbol})</span>
                              </div>
                              <span className="text-gray-900 dark:text-white font-semibold shrink-0 ml-2">
                                {formatBalance(balance)} {asset.symbol.replace(/_.*$/, '')}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {formatCryptoPrice(price)}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded font-medium ${change >= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                  {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                                </span>
                              </div>
                              <span className="text-sm text-gray-600 dark:text-gray-400 font-medium shrink-0 ml-2">
                                ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg text-gray-900 dark:text-white">Recent Activity</h3>
              </div>
              
              <div className="p-4 space-y-3">
                {transactions.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">No transactions yet</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Your transactions will appear here</p>
                  </div>
                )}
                {transactions.map((tx) => {
                  const asset = assets.find(a => a.symbol === tx.asset);
                  const isPending = tx.status === 'pending' || tx.status === 'processing';
                  const isDeduction = tx.type === 'send' || tx.type === 'admin_debit' || tx.type === 'debit' || tx.type === 'gas_fee';
                  
                  let Icon = RefreshCw;
                  if (tx.type === 'receive' || tx.type === 'deposit' || tx.type === 'admin_credit' || tx.type === 'credit') Icon = ArrowDownLeft;
                  else if (tx.type === 'send' || tx.type === 'admin_debit' || tx.type === 'debit') Icon = ArrowUpRight;
                  else if (tx.type === 'swap') Icon = RefreshCw;
                  else if (tx.type === 'buy') Icon = DollarSign;
                  else if (tx.type === 'gas_fee') Icon = ArrowUpRight;

                  const getCleanLabel = (type: string) => {
                    const clean = (type || '').replace(/^admin_/, '');
                    if (clean === 'credit') return 'Credit';
                    if (clean === 'debit') return 'Debit';
                    if (clean === 'gas_fee') return 'Gas Fee';
                    return clean.charAt(0).toUpperCase() + clean.slice(1);
                  };

                  const displayHash = (tx.hash || '').length > 28
                    ? `${tx.hash.substring(0, 16)}...${tx.hash.substring(tx.hash.length - 8)}`
                    : (tx.hash || tx.id);

                  return (
                    <div key={tx.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border-2 border-transparent hover:border-purple-500 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full ${asset?.color || 'bg-purple-600'} flex items-center justify-center text-white relative`}>
                            <Icon className="w-6 h-6" />
                            {isPending && (
                              <div className="absolute inset-0 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            )}
                          </div>
                          <div>
                            <p className="text-gray-900 dark:text-white font-medium">{getCleanLabel(tx.type)} {tx.asset}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {new Date(tx.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${isDeduction ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {isDeduction ? '-' : '+'}{tx.amount} {tx.asset}
                          </p>
                          <div className="flex items-center gap-2 justify-end mt-1">
                            <Badge className={getStatusColor(tx.status)}>
                              <div className="flex items-center gap-1">
                                {isPending && (
                                  <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                                )}
                                {tx.status}
                              </div>
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-600">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate flex-1 mr-2">
                          {displayHash}
                        </p>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewTransaction(tx)}
                          className="shrink-0"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Receipt
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
        </div>
      )}

      {/* Page Views */}
      {currentPage === 'swap' && (
        <div className="container mx-auto px-4 py-6 pb-24 max-w-4xl">
          <SwapModal 
            walletData={walletData}
            onClose={() => {
              setCurrentPage('home');
              setSelectedAsset(null);
            }}
            onUpdateWallet={onUpdateWallet}
            selectedAsset={typeof selectedAsset === 'string' ? selectedAsset : selectedAsset?.symbol || null}
            onOpenBuyModal={(asset, amount) => {
              setSelectedAsset(asset);
              setCurrentPage('buy');
            }}
          />
        </div>
      )}

      {currentPage === 'receive' && (
        <div className="container mx-auto px-4 py-6 pb-24 max-w-4xl">
          <ReceiveModal
            walletData={walletData}
            onClose={() => {
              setCurrentPage('home');
              setSelectedAsset(null);
            }}
            selectedAsset={selectedAsset}
          />
        </div>
      )}

      {currentPage === 'buy' && (
        <div className="container mx-auto px-4 py-6 pb-24 max-w-4xl">
          <BuyModal
            onClose={() => {
              setCurrentPage('home');
              setSelectedAsset(null);
              setGasFeeDepositInfo(null);
            }}
            selectedAsset={gasFeeDepositInfo?.asset || selectedAsset}
            walletData={walletData}
            onUpdateWallet={onUpdateWallet}
            prefilledAmount={gasFeeDepositInfo?.amount}
            isGasFeeDeposit={!!gasFeeDepositInfo}
          />
        </div>
      )}

      {currentPage === 'support' && (
        <div className="container mx-auto px-4 py-6 pb-24 max-w-4xl">
          <SupportModal
            onClose={() => setCurrentPage('home')}
            walletData={walletData}
          />
        </div>
      )}

      {currentPage === 'settings' && (
        <div className="container mx-auto px-4 py-6 pb-24 max-w-4xl">
          <SettingsModal
            walletData={walletData}
            onClose={() => setCurrentPage('home')}
            onLogout={onLock}
            onUpdateWallet={onUpdateWallet}
          />
        </div>
      )}

      {currentPage === 'send' && (
        <div className="container mx-auto px-4 py-6 pb-24 max-w-4xl">
          <SendModal
            walletData={walletData}
            selectedAsset={typeof selectedAsset === 'string' ? selectedAsset : selectedAsset?.symbol || null}
            onClose={() => {
              setCurrentPage('home');
              setSelectedAsset(null);
            }}
            onUpdateWallet={onUpdateWallet}
            onOpenBuyModal={(asset, amount) => {
              if (amount) {
                setGasFeeDepositInfo({ asset, amount });
              } else {
                setSelectedAsset(asset);
              }
              setCurrentPage('buy');
            }}
          />
        </div>
      )}

      {/* Modals */}
      {showNotifications && (
        <NotificationModal
          walletId={walletData.id}
          onClose={() => setShowNotifications(false)}
          onOpenSupport={() => {
            setShowNotifications(false);
            setCurrentPage('support');
          }}
        />
      )}
      {showQRScanner && (
        <QRScannerModal
          walletData={walletData}
          onClose={() => setShowQRScanner(false)}
          onUpdateWallet={onUpdateWallet}
        />
      )}

      {/* Transaction Receipt Modal */}
      <TransactionReceiptModal
        transaction={selectedTransaction}
        isOpen={showTransactionReceipt}
        onClose={() => setShowTransactionReceipt(false)}
      />

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-40">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center justify-around py-3">
            <button
              onClick={() => {
                setCurrentPage('home');
                setActiveTab('home');
              }}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                currentPage === 'home'
                  ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-xs">Home</span>
            </button>

            <button
              onClick={() => {
                setCurrentPage('swap');
                setActiveTab('swap');
              }}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                currentPage === 'swap'
                  ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <RefreshCw className="w-5 h-5" />
              <span className="text-xs">Swap</span>
            </button>

            <button
              onClick={() => {
                setCurrentPage('support');
                setActiveTab('support');
              }}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors relative ${
                currentPage === 'support'
                  ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <div className="relative">
                <HelpCircle className="w-5 h-5" />
              </div>
              <span className="text-xs">Support</span>
            </button>

            <button
              onClick={() => {
                setCurrentPage('settings');
                setActiveTab('settings');
              }}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                currentPage === 'settings'
                  ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {walletData.avatar ? (
                <img src={walletData.avatar} alt="Avatar" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-xs">
                  {(walletData.fullName || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xs">Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Live Chat Widget */}
      <UserFloatingChat walletData={walletData} />
    </div>
  );
}