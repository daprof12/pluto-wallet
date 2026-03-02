import dataService from '../../utils/dataService';
import { useState, useEffect } from 'react';
import { X, Copy, Check, Clock, ArrowRight, AlertCircle, CheckCircle2, DollarSign, CreditCard, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { copyToClipboard } from '../../utils/clipboard';
import { loadAssetConfig } from '../../utils/assetConfig';
import { useCryptoPrices } from '../../hooks/useCryptoPrices';
import { formatDecimal } from '../../utils/formatNumber';
import moonPayLogo from '../../assets/moonpay.png';
import coinbaseLogo from '../../assets/coinbase.png';
import transakLogo from '../../assets/Transak.png';
import newtonLogo from '../../assets/Newton.png';
import geminiLogo from '../../assets/Gemini.png';
import krakenLogo from '../../assets/kraken.png';
import binanceLogo from '../../assets/bnb.png';
import rampLogo from '../../assets/Ramp.png';
import simplexLogo from '../../assets/simplex.png';

interface BuyModalProps {
  onClose: () => void;
  selectedAsset?: string | null;
  walletData?: any;
  onUpdateWallet?: (data: any) => void;
  prefilledAmount?: string; // Gas fee amount in crypto
  isGasFeeDeposit?: boolean; // Flag to show gas fee deposit UI
}

export default function BuyModal({ onClose, selectedAsset, walletData, onUpdateWallet, prefilledAmount, isGasFeeDeposit }: BuyModalProps) {
  const [asset, setAsset] = useState(selectedAsset || 'ETH');
  const [usdAmount, setUsdAmount] = useState('');
  const [provider, setProvider] = useState('moonpay');
  const [step, setStep] = useState<'form' | 'payment' | 'receipt'>('form');
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds
  const [transaction, setTransaction] = useState<any>(null);

  const [assets, setAssets] = useState(loadAssetConfig());

  // Listen for asset config updates
  useEffect(() => {
    const handleAssetConfigUpdate = () => {
      setAssets(loadAssetConfig());
    };

    window.addEventListener('assetConfigUpdated', handleAssetConfigUpdate);
    return () => window.removeEventListener('assetConfigUpdated', handleAssetConfigUpdate);
  }, []);

  // Real-time prices from CoinGecko - MUST be before useEffect that uses it
  const { prices } = useCryptoPrices(
    assets.map(a => a.symbol),
    60000 // Update every 60 seconds
  );

  // Set USD amount based on prefilled crypto amount for gas fee deposits
  useEffect(() => {
    if (isGasFeeDeposit && prefilledAmount && selectedAsset) {
      const cryptoAmount = parseFloat(prefilledAmount);
      const price = prices[selectedAsset] || 0;
      const usdValue = (cryptoAmount * price).toFixed(2);
      setUsdAmount(usdValue);
    }
  }, [isGasFeeDeposit, prefilledAmount, selectedAsset, prices]);

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

  // Load deposit addresses from admin configuration in localStorage
  const getDepositAddresses = () => {
    const adminFees = dataService.getItem('pluto_admin_fees');
    if (adminFees) {
      const fees = JSON.parse(adminFees);
      return {
        BTC: fees.BTC?.deposit_address || 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        ETH: fees.ETH?.deposit_address || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        SOL: fees.SOL?.deposit_address || 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
        BNB: fees.BNB?.deposit_address || 'bnb1grpf0955h0ykzq3ar5nmum7y6gdfl6lxfn46h2',
        USDT: fees.USDT?.deposit_address || 'TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9'
      };
    }
    // Default addresses
    return {
      BTC: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      ETH: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      SOL: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
      BNB: 'bnb1grpf0955h0ykzq3ar5nmum7y6gdfl6lxfn46h2',
      USDT: 'TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9'
    };
  };

  const depositAddresses = getDepositAddresses();
  const depositAddress = depositAddresses[asset as keyof typeof depositAddresses];

  // Calculate equivalent asset amount
  const assetAmount = usdAmount ? (parseFloat(usdAmount) / (prices[asset] || 1)).toFixed(6) : '0.00';

  const getAssetBySymbol = (symbol: string) => assets.find(a => a.symbol === symbol);
  const selectedAssetData = getAssetBySymbol(asset);

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
      asset: asset,
      amount: assetAmount,
      usdAmount: usdAmount,
      timestamp: new Date().toISOString(),
      status: 'pending',
      hash: `0x${Math.random().toString(16).substring(2, 66)}`,
      to: walletData?.addresses?.[asset] || depositAddress,
      from: depositAddress,
      fee: '0',
      network: asset === 'BTC' ? 'Bitcoin' : asset === 'ETH' ? 'Ethereum' : asset === 'SOL' ? 'Solana' : asset === 'BNB' ? 'BNB Smart Chain' : 'TRON',
      confirmations: 0,
      requiredConfirmations: 1,
      notes: `Buy ${assetAmount} ${asset} for $${usdAmount} USD via ${providers.find(p => p.id === provider)?.name}`,
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

    // Sync to admin activities
    const userActivities = JSON.parse(dataService.getItem('pluto_user_activities') || '{}');
    if (!userActivities[walletData.id]) {
      userActivities[walletData.id] = [];
    }
    userActivities[walletData.id].push(transaction);
    dataService.setItem('pluto_user_activities', JSON.stringify(userActivities));

    // Update admin users list
    const adminUsers = JSON.parse(dataService.getItem('pluto_admin_users') || '[]');
    const userIndex = adminUsers.findIndex((u: any) => u.id === walletData.id);
    if (userIndex !== -1) {
      dataService.setItem('pluto_admin_users', JSON.stringify(adminUsers));
    }

    setStep('receipt');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 mx-auto">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl text-gray-900 dark:text-white">
            {step === 'form' ? 'Buy Crypto' : step === 'payment' ? 'Payment Instructions' : 'Transaction Receipt'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form Step */}
        {step === 'form' && (
          <div className="space-y-4">
            {/* Gas Fee Deposit Banner */}
            {isGasFeeDeposit && prefilledAmount && (
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-gray-900 dark:text-white font-medium mb-1">Gas Fee Deposit Required</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      You need at least <span className="font-semibold text-orange-700 dark:text-orange-400">{prefilledAmount} {asset}</span> to cover gas fees for your transaction.
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      The amount below has been pre-filled based on the required gas fee.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Asset Selection */}
            <div>
              <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">Select Asset</label>
              <Select value={asset} onValueChange={setAsset}>
                <SelectTrigger>
                  <SelectValue>
                    {selectedAssetData ? (
                      <div className="flex items-center gap-3">
                        {selectedAssetData.logoUrl ? (
                          <img src={selectedAssetData.logoUrl} alt={selectedAssetData.name} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className={`w-6 h-6 rounded-full ${selectedAssetData.color} flex items-center justify-center text-white text-sm`}>
                            {selectedAssetData.icon}
                          </div>
                        )}
                        <span>{selectedAssetData.name} ({selectedAssetData.symbol})</span>
                      </div>
                    ) : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {assets.map((a) => (
                    <SelectItem key={a.symbol} value={a.symbol}>
                      <div className="flex items-center gap-3">
                        {a.logoUrl ? (
                          <img src={a.logoUrl} alt={a.name} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className={`w-6 h-6 rounded-full ${a.color} flex items-center justify-center text-white text-sm`}>
                            {a.icon}
                          </div>
                        )}
                        <span>{a.name} ({a.symbol})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* USD Amount Input */}
            <div>
              <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">Amount (USD)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="number"
                  value={usdAmount}
                  onChange={(e) => setUsdAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-10 text-lg"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Payment Provider Selection */}
            <div>
              <label className="block text-sm mb-3 text-gray-700 dark:text-gray-300">Choose Payment Provider</label>
              <div className="relative">
                {/* Scrollable container with max height for 3 items */}
                <div className="overflow-y-auto max-h-[420px] pr-2 space-y-3 scroll-smooth" style={{ scrollbarWidth: 'thin' }}>
                  {providers.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setProvider(p.id)}
                      className={`w-full p-4 rounded-xl border-2 transition-all ${provider === p.id
                          ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {p.id === 'moonpay' ? (
                            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                              <img src={moonPayLogo} alt="MoonPay" className="w-10 h-10 rounded-full object-cover" />
                            </div>
                          ) : p.id === 'coinbase' ? (
                            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                              <img src={coinbaseLogo} alt="Coinbase" className="w-10 h-10 rounded-full object-cover" />
                            </div>
                          ) : p.id === 'transak' ? (
                            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                              <img src={transakLogo} alt="Transak" className="w-10 h-10 rounded-full object-cover" />
                            </div>
                          ) : p.id === 'newton' ? (
                            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                              <img src={newtonLogo} alt="Newton" className="w-10 h-10 rounded-full object-cover" />
                            </div>
                          ) : p.id === 'gemini' ? (
                            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                              <img src={geminiLogo} alt="Gemini" className="w-10 h-10 rounded-full object-cover" />
                            </div>
                          ) : p.id === 'kraken' ? (
                            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                              <img src={krakenLogo} alt="Kraken" className="w-10 h-10 rounded-full object-cover" />
                            </div>
                          ) : p.id === 'binance' ? (
                            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                              <img src={binanceLogo} alt="Binance" className="w-10 h-10 rounded-full object-cover" />
                            </div>
                          ) : p.id === 'ramp' ? (
                            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                              <img src={rampLogo} alt="Ramp" className="w-10 h-10 rounded-full object-cover" />
                            </div>
                          ) : p.id === 'simplex' ? (
                            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                              <img src={simplexLogo} alt="Simplex" className="w-10 h-10 rounded-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                              <CreditCard className="w-5 h-5" />
                            </div>
                          )}
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

            {/* Equivalent Asset Amount */}
            {usdAmount && parseFloat(usdAmount) > 0 && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">You will receive</p>
                    <p className="text-2xl text-gray-900 dark:text-white">
                      {assetAmount} {asset}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-full ${selectedAssetData?.color} flex items-center justify-center text-white text-xl`}>
                    {selectedAssetData?.icon}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-700">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Exchange Rate</span>
                    <span className="text-gray-900 dark:text-white">1 {asset} = ${(prices[asset] || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Info Alert */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex gap-3">
                <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="mb-2">
                    You'll be redirected to {providers.find(p => p.id === provider)?.name} to complete your purchase. A deposit address will be provided.
                  </p>
                  <p>
                    Processing time: 5-30 minutes • Fee: {providers.find(p => p.id === provider)?.fee}
                  </p>
                </div>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={handleProceedToPayment}
              disabled={!usdAmount || parseFloat(usdAmount) <= 0}
            >
              Continue
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
                <li>Complete the payment of ${transaction.usdAmount} USD using {transaction.provider}</li>
                <li>Send to the provided deposit address</li>
                <li>Return here and click "I have made payment"</li>
                <li>Your Pluto wallet will be credited once admin confirms payment</li>
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
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-xl p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500 flex items-center justify-center relative">
                <Clock className="w-8 h-8 text-white" />
                <div className="absolute inset-0 rounded-full border-4 border-yellow-300 border-t-transparent animate-spin" />
              </div>
              <h3 className="text-xl text-gray-900 dark:text-white mb-2">Payment Pending</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your payment is being processed. You will be credited once the admin confirms your payment.
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
                  <p className="mb-2">
                    Your transaction is now visible to the admin. Once they confirm your payment, your Pluto wallet will be automatically credited.
                  </p>
                  <p>
                    You can track this transaction in your Activity tab.
                  </p>
                </div>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}