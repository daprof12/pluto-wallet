import dataService from '../../utils/dataService';
import transactionService from '../../utils/transactionService';
import { useState, useEffect } from 'react';
import { X, Copy, Check, Clock, ArrowRight, AlertCircle, CheckCircle2, DollarSign, CreditCard, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { copyToClipboard } from '../../utils/clipboard';
import { loadAssetConfig } from '../../utils/assetConfig';
import { feeService } from '../../utils/feeService';
import AssetLogo from '../wallet/AssetLogo';

interface GasFeeDepositModalProps {
  onClose: () => void;
  gasFeeAsset: string;
  estimatedGasFee: string;
  walletData: any;
  onUpdateWallet: (data: any) => void;
  transactionAsset?: string;
}

export default function GasFeeDepositModal({ 
  onClose, 
  gasFeeAsset, 
  estimatedGasFee, 
  walletData,
  onUpdateWallet,
  transactionAsset
}: GasFeeDepositModalProps) {
  const [usdAmount, setUsdAmount] = useState('');
  const [provider, setProvider] = useState('moonpay');
  const [step, setStep] = useState<'form' | 'payment' | 'receipt'>('form');
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds
  const [transaction, setTransaction] = useState<any>(null);

  const providers = [
    { id: 'moonpay', name: 'MoonPay', fee: '3.5%', url: 'https://www.moonpay.com', description: 'Fast & secure crypto purchases' },
    { id: 'transak', name: 'Transak', fee: '2.99%', url: 'https://global.transak.com', description: 'Global fiat-to-crypto gateway' },
    { id: 'ramp', name: 'Ramp', fee: '2.9%', url: 'https://ramp.network', description: 'Instant crypto purchases' },
    { id: 'simplex', name: 'Simplex', fee: '3.5%', url: 'https://www.simplex.com', description: 'Credit/debit card payments' },
    { id: 'coinbase', name: 'Coinbase', fee: '1.49%', url: 'https://www.coinbase.com', description: 'Leading crypto exchange' },
    { id: 'kraken', name: 'Kraken', fee: '1.5%', url: 'https://www.kraken.com', description: 'Trusted crypto trading' },
    { id: 'binance', name: 'Binance', fee: '0.5%', url: 'https://www.binance.com', description: 'World\'s largest exchange' },
    { id: 'newton', name: 'Newton', fee: '0%', url: 'https://www.newton.co', description: 'Zero-fee Canadian exchange' },
    { id: 'gemini', name: 'Gemini', fee: '1.49%', url: 'https://www.gemini.com', description: 'Regulated crypto platform' }
  ];

  const assets = loadAssetConfig();

  // Mock prices in USD
  const prices: any = {
    BTC: 43250.00,
    ETH: 2280.50,
    SOL: 98.75,
    BNB: 315.20,
    USDT: 1.00,
    TRX: 0.15,
    AVAX: 35.00,
    MATIC: 0.85,
    DOGE: 0.12,
    ADA: 0.50,
    XRP: 0.55
  };

  // Set USD amount based on estimated gas fee
  useEffect(() => {
    const cryptoAmount = parseFloat(estimatedGasFee) || 0;
    const price = prices[gasFeeAsset] || 1;
    const usdValue = (cryptoAmount * price).toFixed(2);
    setUsdAmount(usdValue);
  }, [estimatedGasFee, gasFeeAsset]);

  // Load deposit addresses from admin configuration (respects user-specific overrides and covers all assets)
  const getDepositAddresses = () => {
    try {
      const fees = feeService.getEffectiveFees(walletData?.userId || walletData?.id);
      const addresses: Record<string, string> = {};
      Object.keys(fees).forEach((assetKey) => {
        if (fees[assetKey]?.deposit_address) {
          addresses[assetKey] = fees[assetKey].deposit_address;
        }
      });
      return addresses;
    } catch {
      return {
        BTC: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        ETH: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        SOL: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
        BNB: 'bnb1grpf0955h0ykzq3ar5nmum7y6gdfl6lxfn46h2',
        USDT: 'TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9'
      };
    }
  };

  const depositAddresses = getDepositAddresses();
  const depositAddress = depositAddresses[gasFeeAsset as keyof typeof depositAddresses];

  // Calculate equivalent asset amount
  const assetAmount = usdAmount ? (parseFloat(usdAmount) / prices[gasFeeAsset]).toFixed(6) : '0.00';

  const getAssetBySymbol = (symbol: string) => assets.find(a => a.symbol === symbol);
  const selectedAssetData = getAssetBySymbol(gasFeeAsset);
  const targetAsset = transactionAsset || gasFeeAsset;

  // Countdown timer
  useEffect(() => {
    if (step === 'payment' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [step, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyAddress = async () => {
    const success = await copyToClipboard(depositAddress);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleProceedToPayment = () => {
    if (!usdAmount || parseFloat(usdAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    // Create transaction record
    const newTransaction = {
      id: `txn_${Date.now()}`,
      type: 'buy',
      asset: gasFeeAsset,
      amount: assetAmount,
      usdAmount: usdAmount,
      timestamp: new Date().toISOString(),
      status: 'pending',
      hash: `0x${Math.random().toString(16).substring(2, 66)}`,
      to: walletData?.addresses?.[gasFeeAsset] || depositAddress,
      from: depositAddress,
      fee: '0',
      network: gasFeeAsset === 'BTC' ? 'Bitcoin' : gasFeeAsset === 'ETH' ? 'Ethereum' : gasFeeAsset === 'SOL' ? 'Solana' : gasFeeAsset === 'BNB' ? 'BNB Smart Chain' : 'TRON',
      confirmations: 0,
      requiredConfirmations: 1,
      notes: `Gas fee deposit: ${assetAmount} ${gasFeeAsset} for $${usdAmount} USD via ${providers.find(p => p.id === provider)?.name}`,
      depositAddress: depositAddress,
      provider: providers.find(p => p.id === provider)?.name || 'Payment Provider',
      providerUrl: providers.find(p => p.id === provider)?.url || ''
    };

    setTransaction(newTransaction);
    setStep('payment');
  };

  const handlePaymentMade = () => {
    if (!walletData || !transaction) {
      alert('Wallet data not available');
      return;
    }

    // Store transaction in user wallet
    const updatedTransactions = [...(walletData.transactions || []), transaction];
    const updatedWallet = {
      ...walletData,
      transactions: updatedTransactions
    };

    if (onUpdateWallet) {
      onUpdateWallet(updatedWallet);
    }
    dataService.setItem('pluto_wallet', JSON.stringify(updatedWallet));

    // Save transaction to Supabase & update local activities
    const targetUserId = walletData.id || walletData.userId;
    transactionService.saveTransaction(transaction, targetUserId);

    // Update admin users list
    const adminUsers = JSON.parse(dataService.getItem('pluto_admin_users') || '[]');
    const userIndex = adminUsers.findIndex((u: any) => u.id === walletData.id);
    if (userIndex !== -1) {
      dataService.setItem('pluto_admin_users', JSON.stringify(adminUsers));
    }

    setStep('receipt');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl text-gray-900 dark:text-white">
              {step === 'form' ? 'Deposit Gas Fee' : step === 'payment' ? 'Payment Instructions' : 'Transaction Receipt'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Form Step */}
          {step === 'form' && (
            <div className="space-y-4">
              {/* Gas Fee Banner */}
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-gray-900 dark:text-white font-medium mb-1">Gas Fee Required</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      You need at least <span className="font-semibold text-orange-700 dark:text-orange-400">{estimatedGasFee} {gasFeeAsset}</span> to cover gas fees for your {targetAsset} transaction.
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      The amount below has been pre-filled based on the required gas fee.
                    </p>
                  </div>
                </div>
              </div>

              {/* Asset Display (Read-only) */}
              <div>
                <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">Asset</label>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 border-2 border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-3">
                    {selectedAssetData && (
                      <>
                        <AssetLogo
                          logoUrl={selectedAssetData.logoUrl}
                          symbol={selectedAssetData.symbol}
                          color={selectedAssetData.color}
                          icon={selectedAssetData.icon}
                          size="md"
                        />
                        <div>
                          <div className="text-gray-900 dark:text-white font-medium">{selectedAssetData.name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">{selectedAssetData.symbol}</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* USD Amount Display (Read-only) */}
              <div>
                <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">Amount (USD)</label>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 border-2 border-purple-300 dark:border-purple-600">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <span className="text-2xl text-gray-900 dark:text-white">{usdAmount}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    ≈ {estimatedGasFee} {gasFeeAsset} at current rate
                  </p>
                </div>
              </div>

              {/* Payment Provider Selection */}
              <div>
                <label className="block text-sm mb-3 text-gray-700 dark:text-gray-300">Choose Payment Provider</label>
                <div className="relative">
                  <div className="overflow-y-auto max-h-[300px] pr-2 space-y-3 scroll-smooth" style={{ scrollbarWidth: 'thin' }}>
                    {providers.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setProvider(p.id)}
                        className={`w-full p-4 rounded-xl border-2 transition-all ${
                          provider === p.id
                            ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                              <CreditCard className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                              <div className="text-gray-900 dark:text-white font-medium">{p.name}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{p.description}</div>
                              <div className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-0.5">Fee: {p.fee}</div>
                            </div>
                          </div>
                          {provider === p.id && (
                            <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  {/* Scroll indicator */}
                  {providers.length > 3 && (
                    <div className="mt-2 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                        <svg className="w-4 h-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        Scroll to see more providers
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Info Alert */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex gap-3">
                  <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="mb-2">
                      You'll be redirected to {providers.find(p => p.id === provider)?.name} to complete your gas fee deposit.
                    </p>
                    <p>
                      Processing time: 5-30 minutes • Fee: {providers.find(p => p.id === provider)?.fee}
                    </p>
                  </div>
                </div>
              </div>

              <Button 
                size="lg" 
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                onClick={handleProceedToPayment}
              >
                Continue to Payment
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Payment Step */}
          {step === 'payment' && transaction && (
            <div className="space-y-4">
              {/* Countdown Timer */}
              <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Time remaining</p>
                      <p className="text-2xl text-gray-900 dark:text-white">{formatTime(timeLeft)}</p>
                    </div>
                  </div>
                  <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                    Pending Payment
                  </Badge>
                </div>
              </div>

              {/* Transaction Details */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 space-y-3">
                <h3 className="text-gray-900 dark:text-white mb-3">Transaction Details</h3>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Amount (USD)</span>
                  <span className="text-gray-900 dark:text-white">${transaction.usdAmount}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">You will receive</span>
                  <span className="text-gray-900 dark:text-white">{transaction.amount} {transaction.asset}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Network</span>
                  <span className="text-gray-900 dark:text-white">{transaction.network}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Transaction ID</span>
                  <span className="text-gray-900 dark:text-white font-mono text-xs">
                    {transaction.id}
                  </span>
                </div>
              </div>

              {/* Payment Provider Button */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-gray-900 dark:text-white mb-1">Payment Provider</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {transaction.provider}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white">
                    <CreditCard className="w-6 h-6" />
                  </div>
                </div>
                
                <Button 
                  size="lg" 
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  onClick={() => window.open(transaction.providerUrl, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open {transaction.provider}
                </Button>
              </div>

              {/* Deposit Address */}
              <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-xl p-4">
                <h3 className="text-gray-900 dark:text-white mb-3">Deposit Address</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Send your payment to this address using {transaction.provider}:
                </p>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {transaction.network} Address
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-900 dark:text-white font-mono break-all flex-1">
                      {depositAddress}
                    </p>
                    <button
                      onClick={handleCopyAddress}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="text-sm text-blue-900 dark:text-blue-200 mb-2">Payment Instructions:</h4>
                <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                  <li>Click "Open {transaction.provider}" button above</li>
                  <li>Copy the deposit address provided</li>
                  <li>Complete the payment of ${transaction.usdAmount} USD</li>
                  <li>Send to the provided deposit address</li>
                  <li>Return here and click "I have made payment"</li>
                  <li>Your wallet will be credited once payment is confirmed</li>
                </ol>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button 
                  size="lg" 
                  className="flex-1"
                  onClick={handlePaymentMade}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  I have made payment
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={onClose}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Receipt Step */}
          {step === 'receipt' && transaction && (
            <div className="space-y-4">
              {/* Status Banner */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl text-gray-900 dark:text-white mb-2">Payment Submitted</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your gas fee deposit is being processed. You'll be credited once confirmed.
                </p>
              </div>

              {/* Transaction Details */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Transaction ID</span>
                  <span className="text-gray-900 dark:text-white font-mono text-xs">
                    {transaction.id}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Amount Paid</span>
                  <span className="text-gray-900 dark:text-white">${transaction.usdAmount} USD</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">To Receive</span>
                  <span className="text-gray-900 dark:text-white">{transaction.amount} {transaction.asset}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Status</span>
                  <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    Pending Confirmation
                  </Badge>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Date</span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(transaction.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p>
                      Once your gas fee deposit is confirmed, you can proceed with your {targetAsset} transaction.
                    </p>
                  </div>
                </div>
              </div>

              <Button size="lg" className="w-full" onClick={onClose}>
                Done
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}