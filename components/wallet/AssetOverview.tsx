import { useState } from 'react';
import { ArrowLeft, TrendingUp, Coins, ArrowUpRight, ArrowDownLeft, RefreshCw, ShoppingCart, Eye, Edit, Trash2, ExternalLink, ChevronUp, ChevronDown, DollarSign } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import TransactionReceiptModal from './TransactionReceiptModal';
import { loadAssetConfig } from '../../utils/assetConfig';
import PriceChart from './PriceChart';
import { formatDecimal } from '../../utils/formatNumber';

interface Asset {
  symbol: string;
  name: string;
  balance: string;
  value: string;
  change: string;
  icon: string;
  network: string;
  logoUrl?: string;
}

interface AssetOverviewProps {
  asset: Asset;
  onBack: () => void;
  isDark: boolean;
  walletData: any;
  onUpdateWallet: (data: any) => void;
  onNavigateToSend: (asset: string) => void;
  onNavigateToReceive: (asset: string) => void;
  onNavigateToSwap: (asset: string) => void;
  onNavigateToBuy: (asset: string) => void;
  isAdmin?: boolean;
}

// Mock chart data generator
const generateChartData = (timeframe: string) => {
  const dataPoints = {
    '1H': 12,
    '1D': 24,
    '1W': 7,
    '1M': 30,
    'YTD': 180,
    'ALL': 365
  };

  const points = dataPoints[timeframe as keyof typeof dataPoints] || 24;
  const basePrice = 91000;
  
  return Array.from({ length: points }, (_, i) => ({
    time: i,
    value: basePrice + Math.random() * 5000 + Math.sin(i / 3) * 2000
  }));
};

// Mock activity data
const mockActivity = [
  { 
    id: 'tx-001',
    type: 'send', 
    amount: '0.0045',
    asset: 'BTC',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'completed', 
    hash: '0x7a8b9c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b',
    from: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    to: '3J98t1WpEZ73CNmYviecrnyiWrnqRhWNLy',
    fee: '0.00002',
    confirmations: 6,
    requiredConfirmations: 6
  },
  { 
    id: 'tx-002',
    type: 'receive', 
    amount: '0.0123',
    asset: 'BTC',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    status: 'completed', 
    hash: '0x3f4e5d6c7b8a9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4',
    from: '3FZbgi29cpjq2GjdwV8eyHuJJnkLtktZc5',
    to: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    fee: '0.00001',
    confirmations: 12,
    requiredConfirmations: 6
  },
  { 
    id: 'tx-003',
    type: 'swap', 
    amount: '0.0089',
    asset: 'BTC',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'completed', 
    hash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    from: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    fee: '0.00003',
    confirmations: 15,
    requiredConfirmations: 6,
    toAsset: 'ETH',
    toAmount: '0.345'
  },
  { 
    id: 'tx-004',
    type: 'buy', 
    amount: '0.0200',
    asset: 'BTC',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'completed', 
    hash: '0x9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e',
    to: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    fee: '0.00001',
    confirmations: 20,
    requiredConfirmations: 6,
    fiatAmount: '$1,850.00',
    paymentMethod: 'Credit Card'
  },
  { 
    id: 'tx-005',
    type: 'send', 
    amount: '1.5',
    asset: 'ETH',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    status: 'processing', 
    hash: '0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
    from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    to: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
    fee: '0.0015',
    confirmations: 8,
    requiredConfirmations: 12
  },
  { 
    id: 'tx-006',
    type: 'receive', 
    amount: '2.3',
    asset: 'ETH',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    status: 'completed', 
    hash: '0xb2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3',
    from: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
    to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    fee: '0.0012',
    confirmations: 18,
    requiredConfirmations: 12
  },
  { 
    id: 'tx-007',
    type: 'send', 
    amount: '150',
    asset: 'SOL',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    status: 'pending', 
    hash: '0xc3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4',
    from: '7EqQdEUuLS2rSJPM6L4bH2gR3dnqPjqQJVd8Lw8xK2xJ',
    to: 'BvgqW7Q2pMkU9L1dQ6yH8vT5jB3qP9wF4xE6rR2nY8zK',
    fee: '0.00025',
    confirmations: 2,
    requiredConfirmations: 32
  },
  { 
    id: 'tx-008',
    type: 'swap', 
    amount: '0.5',
    asset: 'BNB',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    status: 'completed', 
    hash: '0xd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5',
    from: 'bnb1grpf0955h0ykzq3ar5nmum7y6gdfl6lxfn46h2',
    to: 'TRX: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    fee: '0.0005',
    confirmations: 15,
    requiredConfirmations: 15,
    toAsset: 'TRX',
    toAmount: '2500'
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'pending':
    case 'processing':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'failed':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
  }
};

const getTransactionTypeLabel = (type: string) => {
  switch (type) {
    case 'admin_credit':
      return 'Credit';
    case 'admin_debit':
      return 'Debit';
    case 'gas_fee':
      return 'Gas Fee';
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
};

export default function AssetOverview({ asset, onBack, isDark, walletData, onUpdateWallet, onNavigateToSend, onNavigateToReceive, onNavigateToSwap, onNavigateToBuy, isAdmin = false }: AssetOverviewProps) {
  const [showChart, setShowChart] = useState(false);
  const [timeframe, setTimeframe] = useState('1D');
  const [chartData, setChartData] = useState(generateChartData('1D'));
  const [showAbout, setShowAbout] = useState(false);
  const [showTransactionReceipt, setShowTransactionReceipt] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showEditTransaction, setShowEditTransaction] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  
  // Load asset config to get logo
  const assetConfig = loadAssetConfig().find(a => a.symbol === asset.symbol);
  
  // Filter transactions for current asset from wallet data
  const filteredActivity = (walletData.transactions || [])
    .filter((tx: any) => tx.asset === asset.symbol)
    .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleTimeframeChange = (newTimeframe: string) => {
    setTimeframe(newTimeframe);
    setChartData(generateChartData(newTimeframe));
  };

  const handleViewReceipt = (transaction: any) => {
    // Add network and fee info if not present
    const fullTransaction = {
      ...transaction,
      network: assetInfo.network + ' Mainnet',
      fee: '0.0001'
    };
    setSelectedTransaction(fullTransaction);
    setShowTransactionReceipt(true);
  };

  const handleEditTransaction = (transaction: any) => {
    // Add all fields with defaults if not present
    const fullTransaction = {
      ...transaction,
      network: transaction.network || assetInfo.network + ' Mainnet',
      fee: transaction.fee || '0.0001',
      confirmations: transaction.confirmations !== undefined ? transaction.confirmations : 0,
      requiredConfirmations: transaction.requiredConfirmations || 6,
      from: transaction.from || '',
      to: transaction.to || '',
      toAsset: transaction.toAsset || 'ETH',
      toAmount: transaction.toAmount || '',
      fiatAmount: transaction.fiatAmount || '',
      paymentMethod: transaction.paymentMethod || 'Credit Card'
    };
    setEditingTransaction(fullTransaction);
    setShowEditTransaction(true);
    setShowTransactionReceipt(false);
  };

  const handleDeleteTransaction = (transactionId: string) => {
    if (confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
      // In a real app, this would call an API to delete the transaction
      alert(`Transaction ${transactionId} deleted successfully`);
      setShowTransactionReceipt(false);
    }
  };

  const handleSaveEditedTransaction = () => {
    // In a real app, this would call an API to update the transaction
    alert('Transaction updated successfully');
    setShowEditTransaction(false);
    setEditingTransaction(null);
  };

  const priceChange = '+$138.15';
  const percentChange = '+0.15%';
  const isPositive = true;

  // Mock asset data
  const assetInfo = {
    network: asset.symbol === 'BTC' ? 'Bitcoin' : asset.symbol === 'ETH' ? 'Ethereum' : asset.symbol === 'SOL' ? 'Solana' : asset.symbol === 'BNB' ? 'BNB Smart Chain' : 'Tron',
    marketCap: asset.symbol === 'BTC' ? '$1.82T' : asset.symbol === 'ETH' ? '$410B' : asset.symbol === 'SOL' ? '$42B' : '$48B',
    totalSupply: asset.symbol === 'BTC' ? '21M' : asset.symbol === 'ETH' ? 'Unlimited' : asset.symbol === 'SOL' ? '580M' : '200M',
    circulatingSupply: asset.symbol === 'BTC' ? '19.5M' : asset.symbol === 'ETH' ? '120M' : asset.symbol === 'SOL' ? '460M' : '153M'
  };

  const aboutText = {
    BTC: 'Bitcoin is a decentralized digital currency that can be transferred on the peer-to-peer bitcoin network. Bitcoin transactions are verified by network nodes through cryptography and recorded in a public distributed ledger called a blockchain. The cryptocurrency was invented in 2008 by an unknown person or group of people using the name Satoshi Nakamoto. Bitcoin is the first and most valuable cryptocurrency in the world.',
    ETH: 'Ethereum is a decentralized, open-source blockchain with smart contract functionality. Ether is the native cryptocurrency of the platform. Among cryptocurrencies, ether is second only to bitcoin in market capitalization. Ethereum was conceived in 2013 by programmer Vitalik Buterin.',
    SOL: 'Solana is a high-performance blockchain supporting builders around the world creating crypto apps that scale. Solana is known for its fast transaction speeds and low costs, making it a popular choice for DeFi and NFT projects.',
    BNB: 'BNB is the cryptocurrency coin that powers the BNB Chain ecosystem. As one of the world\'s most popular utility tokens, BNB can be used for trading fee discounts, payments, and various applications on the BNB Chain.',
    TRX: 'TRON is a blockchain-based decentralized platform that aims to build a free, global digital content entertainment system with distributed storage technology, and allows easy and cost-effective sharing of digital content.'
  };

  const officialLinks = {
    BTC: 'https://bitcoin.org',
    ETH: 'https://ethereum.org',
    SOL: 'https://solana.com',
    BNB: 'https://www.bnbchain.org',
    TRX: 'https://tron.network'
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between p-4">
            <button 
              onClick={onBack} 
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
            >
              <ArrowLeft className="w-6 h-6 text-gray-900 dark:text-white" />
            </button>
            
            <div className="flex-1 text-center">
              <div className="font-semibold text-lg text-gray-900 dark:text-white">{asset.name}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{asset.symbol}</div>
            </div>

            <button 
              onClick={() => setShowChart(!showChart)}
              className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all ${showChart ? 'bg-purple-100 dark:bg-purple-900/50' : ''}`}
            >
              {showChart ? (
                <Coins className="w-6 h-6 text-gray-900 dark:text-white" />
              ) : (
                <TrendingUp className="w-6 h-6 text-gray-900 dark:text-white" />
              )}
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 pb-24">
          {/* Balance View */}
          {!showChart && (
            <>
              {/* Asset Balance */}
              <div className="text-center space-y-4">
                {assetConfig?.logoUrl ? (
                  <img 
                    src={assetConfig.logoUrl} 
                    alt={asset.name} 
                    className="w-24 h-24 mx-auto rounded-full shadow-lg object-cover"
                  />
                ) : (
                  <div className={`w-24 h-24 mx-auto rounded-full ${asset.icon} flex items-center justify-center text-5xl shadow-lg`}>
                    {asset.symbol.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="text-4xl mb-2 text-gray-900 dark:text-white">{asset.balance} {asset.symbol}</div>
                  <div className="text-2xl text-gray-600 dark:text-gray-400">{asset.value}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-4 gap-4">
                <button
                  onClick={() => onNavigateToSend(asset.symbol)}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-14 h-14 rounded-full bg-blue-500/20 hover:bg-blue-500/30 flex items-center justify-center transition-all active:scale-95">
                    <ArrowUpRight className="w-6 h-6 text-blue-400" />
                  </div>
                  <span className="text-sm text-gray-900 dark:text-white">Send</span>
                </button>
                <button
                  onClick={() => onNavigateToReceive(asset.symbol)}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-14 h-14 rounded-full bg-green-500/20 hover:bg-green-500/30 flex items-center justify-center transition-all active:scale-95">
                    <ArrowDownLeft className="w-6 h-6 text-green-400" />
                  </div>
                  <span className="text-sm text-gray-900 dark:text-white">Receive</span>
                </button>
                <button
                  onClick={() => onNavigateToSwap(asset.symbol)}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-14 h-14 rounded-full bg-orange-500/20 hover:bg-orange-500/30 flex items-center justify-center transition-all active:scale-95">
                    <RefreshCw className="w-6 h-6 text-orange-400" />
                  </div>
                  <span className="text-sm text-gray-900 dark:text-white">Swap</span>
                </button>
                <button
                  onClick={() => onNavigateToBuy(asset.symbol)}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-14 h-14 rounded-full bg-purple-500/20 hover:bg-purple-500/30 flex items-center justify-center transition-all active:scale-95">
                    <ShoppingCart className="w-6 h-6 text-purple-400" />
                  </div>
                  <span className="text-sm text-gray-900 dark:text-white">Buy</span>
                </button>
              </div>

              {/* Recent Activity */}
              <div className="rounded-2xl bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg text-gray-900 dark:text-white">Recent Transactions</h3>
                </div>
                
                <div className="p-4 space-y-3">
                  {filteredActivity.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500 dark:text-gray-400">No transactions yet</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Your {asset.symbol} transactions will appear here</p>
                    </div>
                  )}
                  {filteredActivity.map((tx) => {
                    const isPending = tx.status === 'pending' || tx.status === 'processing';
                    
                    let Icon = RefreshCw;
                    if (tx.type === 'receive') Icon = ArrowDownLeft;
                    else if (tx.type === 'send') Icon = ArrowUpRight;
                    else if (tx.type === 'swap') Icon = RefreshCw;
                    else if (tx.type === 'buy') Icon = DollarSign;
                    else if (tx.type === 'admin_credit') Icon = Coins;
                    else if (tx.type === 'admin_debit') Icon = Coins;

                    return (
                      <div 
                        key={tx.id} 
                        className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border-2 border-transparent hover:border-purple-500 transition-all"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-full ${asset.icon} flex items-center justify-center text-white relative`}>
                              <Icon className="w-6 h-6" />
                              {isPending && (
                                <div className="absolute inset-0 rounded-full border-2 border-white border-t-transparent animate-spin" />
                              )}
                            </div>
                            <div>
                              <p className="text-gray-900 dark:text-white">
                                {getTransactionTypeLabel(tx.type).replace('Credit', 'Deposit')} {tx.asset}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {new Date(tx.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-gray-900 dark:text-white ${tx.type === 'send' || tx.type === 'gas_fee' || tx.type === 'admin_debit' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                              {tx.type === 'send' || tx.type === 'gas_fee' || tx.type === 'admin_debit' ? '-' : '+'}{formatDecimal(parseFloat(tx.amount))} {tx.asset}
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
                            {tx.hash.substring(0, 20)}...{tx.hash.substring(tx.hash.length - 8)}
                          </p>
                          <div className="flex items-center gap-2 shrink-0">
                            {isAdmin && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleEditTransaction(tx)}
                                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleDeleteTransaction(tx.id)}
                                  className="text-red-600 hover:text-red-700 dark:text-red-400"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleViewReceipt(tx)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Receipt
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Chart View */}
          {showChart && (
            <>
              {/* Real-time Price Chart */}
              <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-lg">
                <PriceChart 
                  symbol={asset.symbol}
                  currentPrice={parseFloat(asset.value.replace(/[^0-9.]/g, '')) / parseFloat(asset.balance)}
                  priceChange={parseFloat(asset.change)}
                  darkMode={isDark}
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-4 gap-4">
                <button
                  onClick={() => onNavigateToSend(asset.symbol)}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-14 h-14 rounded-full bg-blue-500/20 hover:bg-blue-500/30 flex items-center justify-center transition-all active:scale-95">
                    <ArrowUpRight className="w-6 h-6 text-blue-400" />
                  </div>
                  <span className="text-sm text-gray-900 dark:text-white">Send</span>
                </button>
                <button
                  onClick={() => onNavigateToReceive(asset.symbol)}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-14 h-14 rounded-full bg-green-500/20 hover:bg-green-500/30 flex items-center justify-center transition-all active:scale-95">
                    <ArrowDownLeft className="w-6 h-6 text-green-400" />
                  </div>
                  <span className="text-sm text-gray-900 dark:text-white">Receive</span>
                </button>
                <button
                  onClick={() => onNavigateToSwap(asset.symbol)}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-14 h-14 rounded-full bg-orange-500/20 hover:bg-orange-500/30 flex items-center justify-center transition-all active:scale-95">
                    <RefreshCw className="w-6 h-6 text-orange-400" />
                  </div>
                  <span className="text-sm text-gray-900 dark:text-white">Swap</span>
                </button>
                <button
                  onClick={() => onNavigateToBuy(asset.symbol)}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-14 h-14 rounded-full bg-purple-500/20 hover:bg-purple-500/30 flex items-center justify-center transition-all active:scale-95">
                    <ShoppingCart className="w-6 h-6 text-purple-400" />
                  </div>
                  <span className="text-sm text-gray-900 dark:text-white">Buy</span>
                </button>
              </div>

              {/* Asset Information */}
              <div className="rounded-2xl bg-white dark:bg-gray-800 p-4 space-y-3 shadow-lg">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Asset Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600 dark:text-gray-400">Name</span>
                    <span className="font-medium text-gray-900 dark:text-white">{asset.name}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600 dark:text-gray-400">Symbol</span>
                    <span className="font-medium text-gray-900 dark:text-white">{asset.symbol}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600 dark:text-gray-400">Network</span>
                    <span className="font-medium text-gray-900 dark:text-white">{assetInfo.network}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600 dark:text-gray-400">Market Cap</span>
                    <span className="font-medium text-gray-900 dark:text-white">{assetInfo.marketCap}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600 dark:text-gray-400">Total Supply</span>
                    <span className="font-medium text-gray-900 dark:text-white">{assetInfo.totalSupply}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600 dark:text-gray-400">Circulating Supply</span>
                    <span className="font-medium text-gray-900 dark:text-white">{assetInfo.circulatingSupply}</span>
                  </div>
                </div>
              </div>

              {/* About Section */}
              <div className="rounded-2xl bg-white dark:bg-gray-800 p-4 space-y-3 shadow-lg">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">About {asset.name}</h3>
                <div className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                  <p className={showAbout ? '' : 'line-clamp-3'}>
                    {aboutText[asset.symbol as keyof typeof aboutText] || aboutText.BTC}
                  </p>
                </div>
                <button
                  onClick={() => setShowAbout(!showAbout)}
                  className="flex items-center gap-1 text-sm text-purple-600 dark:text-purple-400 hover:underline"
                >
                  {showAbout ? (
                    <>
                      Show Less <ChevronUp className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Show More <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Links */}
                <div className="flex gap-3 pt-2 flex-wrap">
                  <a
                    href={officialLinks[asset.symbol as keyof typeof officialLinks] || officialLinks.BTC}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-all text-gray-900 dark:text-white"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="text-sm">Official Site</span>
                  </a>
                  <a
                    href={`https://x.com/${asset.symbol.toLowerCase()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-all text-gray-900 dark:text-white"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span className="text-sm">X (Twitter)</span>
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Transaction Receipt Modal */}
      {selectedTransaction && (
        <TransactionReceiptModal
          transaction={selectedTransaction}
          isOpen={showTransactionReceipt}
          onClose={() => {
            setShowTransactionReceipt(false);
            setSelectedTransaction(null);
          }}
          isAdmin={isAdmin}
          onEdit={handleEditTransaction}
          onDelete={handleDeleteTransaction}
        />
      )}

      {/* Edit Transaction Modal (Admin Only) */}
      {showEditTransaction && editingTransaction && isAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowEditTransaction(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl text-gray-900 dark:text-white">Edit Transaction</h2>
              <button onClick={() => setShowEditTransaction(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <span className="text-gray-500 text-xl">×</span>
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Transaction Type */}
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Transaction Type</label>
                <select
                  value={editingTransaction.type}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, type: e.target.value })}
                  className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-900 dark:text-white"
                >
                  <option value="send">Send</option>
                  <option value="receive">Receive</option>
                  <option value="swap">Swap</option>
                  <option value="buy">Buy</option>
                  <option value="admin_credit">Admin Credit</option>
                  <option value="admin_debit">Admin Debit</option>
                  <option value="gas_fee">Gas Fee</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Status</label>
                <select
                  value={editingTransaction.status}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, status: e.target.value })}
                  className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-900 dark:text-white"
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Asset */}
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Asset</label>
                  <select
                    value={editingTransaction.asset}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, asset: e.target.value })}
                    className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-900 dark:text-white"
                  >
                    <option value="BTC">BTC</option>
                    <option value="ETH">ETH</option>
                    <option value="SOL">SOL</option>
                    <option value="BNB">BNB</option>
                    <option value="TRX">TRX</option>
                    <option value="USDT">USDT</option>
                    <option value="USDC">USDC</option>
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Amount</label>
                  <input
                    type="text"
                    value={editingTransaction.amount}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, amount: e.target.value })}
                    className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-900 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Network Fee */}
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Network Fee</label>
                  <input
                    type="text"
                    value={editingTransaction.fee || '0.0001'}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, fee: e.target.value })}
                    className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-900 dark:text-white"
                    placeholder="0.0001"
                  />
                </div>

                {/* Network */}
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Network</label>
                  <select
                    value={editingTransaction.network || 'Ethereum Mainnet'}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, network: e.target.value })}
                    className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-900 dark:text-white"
                  >
                    <option value="Bitcoin Mainnet">Bitcoin Mainnet</option>
                    <option value="Ethereum Mainnet">Ethereum Mainnet</option>
                    <option value="Solana Mainnet">Solana Mainnet</option>
                    <option value="BNB Smart Chain">BNB Smart Chain</option>
                    <option value="TRON (TRC20)">TRON (TRC20)</option>
                  </select>
                </div>
              </div>

              {/* Date & Time */}
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Date & Time</label>
                <input
                  type="datetime-local"
                  value={editingTransaction.timestamp ? new Date(editingTransaction.timestamp).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, timestamp: new Date(e.target.value).toISOString() })}
                  className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-900 dark:text-white"
                />
              </div>

              {/* Transaction ID */}
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Transaction ID</label>
                <input
                  type="text"
                  value={editingTransaction.id}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, id: e.target.value })}
                  className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-900 dark:text-white font-mono text-sm"
                  placeholder="Transaction ID"
                />
              </div>

              {/* Network Confirmations */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Current Confirmations</label>
                  <input
                    type="number"
                    value={editingTransaction.confirmations || 0}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, confirmations: parseInt(e.target.value) || 0 })}
                    className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-900 dark:text-white"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Required Confirmations</label>
                  <input
                    type="number"
                    value={editingTransaction.requiredConfirmations || 6}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, requiredConfirmations: parseInt(e.target.value) || 6 })}
                    className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-900 dark:text-white"
                    min="1"
                  />
                </div>
              </div>

              {/* From Address */}
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">From Address</label>
                <input
                  type="text"
                  value={editingTransaction.from || ''}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, from: e.target.value })}
                  className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-900 dark:text-white font-mono text-sm"
                  placeholder="0x..."
                />
              </div>

              {/* To Address */}
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">To Address</label>
                <input
                  type="text"
                  value={editingTransaction.to || ''}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, to: e.target.value })}
                  className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-900 dark:text-white font-mono text-sm"
                  placeholder="0x..."
                />
              </div>

              {/* Transaction Hash */}
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Transaction Hash</label>
                <input
                  type="text"
                  value={editingTransaction.hash}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, hash: e.target.value })}
                  className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-900 dark:text-white font-mono text-sm"
                  placeholder="0x..."
                />
              </div>

              {/* Swap-specific fields */}
              {editingTransaction.type === 'swap' && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">To Asset</label>
                    <select
                      value={editingTransaction.toAsset || 'ETH'}
                      onChange={(e) => setEditingTransaction({ ...editingTransaction, toAsset: e.target.value })}
                      className="w-full p-3 bg-white dark:bg-gray-700 rounded-xl text-gray-900 dark:text-white"
                    >
                      <option value="BTC">BTC</option>
                      <option value="ETH">ETH</option>
                      <option value="SOL">SOL</option>
                      <option value="BNB">BNB</option>
                      <option value="TRX">TRX</option>
                      <option value="USDT">USDT</option>
                      <option value="USDC">USDC</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">To Amount</label>
                    <input
                      type="text"
                      value={editingTransaction.toAmount || ''}
                      onChange={(e) => setEditingTransaction({ ...editingTransaction, toAmount: e.target.value })}
                      className="w-full p-3 bg-white dark:bg-gray-700 rounded-xl text-gray-900 dark:text-white"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}

              {/* Buy-specific fields */}
              {editingTransaction.type === 'buy' && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Fiat Amount</label>
                    <input
                      type="text"
                      value={editingTransaction.fiatAmount || ''}
                      onChange={(e) => setEditingTransaction({ ...editingTransaction, fiatAmount: e.target.value })}
                      className="w-full p-3 bg-white dark:bg-gray-700 rounded-xl text-gray-900 dark:text-white"
                      placeholder="$100.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Payment Method</label>
                    <select
                      value={editingTransaction.paymentMethod || 'Credit Card'}
                      onChange={(e) => setEditingTransaction({ ...editingTransaction, paymentMethod: e.target.value })}
                      className="w-full p-3 bg-white dark:bg-gray-700 rounded-xl text-gray-900 dark:text-white"
                    >
                      <option value="Credit Card">Credit Card</option>
                      <option value="Debit Card">Debit Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="PayPal">PayPal</option>
                      <option value="Apple Pay">Apple Pay</option>
                      <option value="Google Pay">Google Pay</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowEditTransaction(false);
                    setEditingTransaction(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveEditedTransaction}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}