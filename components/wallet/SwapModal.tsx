import dataService from '../../utils/dataService';
import { useState, useEffect } from 'react';
import { X, ArrowDown, RefreshCw, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import GasFeeWarningModal from '../modals/GasFeeWarningModal';
import { AlertCircle } from 'lucide-react';
import { loadAssetConfig } from '../../utils/assetConfig';
import { useCryptoPrices } from '../../hooks/useCryptoPrices';
import { formatDecimal } from '../../utils/formatNumber';

interface SwapModalProps {
  walletData: any;
  onClose: () => void;
  onUpdateWallet: (data: any) => void;
  selectedAsset?: string | null;
  onOpenBuyModal?: (asset: string, amount?: string) => void;
}

export default function SwapModal({ walletData, onClose, onUpdateWallet, selectedAsset, onOpenBuyModal }: SwapModalProps) {
  const [fromAsset, setFromAsset] = useState(selectedAsset || 'ETH');
  const [toAsset, setToAsset] = useState(selectedAsset === 'BTC' ? 'ETH' : 'BTC');
  const [fromAmount, setFromAmount] = useState('');
  const [step, setStep] = useState<'form' | 'confirm' | 'processing' | 'success'>('form');
  const [processingStage, setProcessingStage] = useState(0);
  const [showGasFeeWarning, setShowGasFeeWarning] = useState(false);

  // Get gas fee settings from admin
  const getGasFeeSettings = (assetSymbol: string) => {
    try {
      const adminFees = dataService.getItem('pluto_admin_fees');
      if (adminFees) {
        const fees = JSON.parse(adminFees);
        if (fees[assetSymbol]) {
          const settings = fees[assetSymbol];
          if (settings.gas_fee_enabled) {
            const swapAmount = parseFloat(fromAmount || '0');
            let gasFee = 0;
            
            if (settings.gas_fee_type === 'fixed') {
              gasFee = parseFloat(settings.gas_fee_fixed || '0');
            } else if (settings.gas_fee_type === 'percent') {
              gasFee = (swapAmount * parseFloat(settings.gas_fee_percent || '0')) / 100;
            }
            
            return {
              enabled: true,
              fee: gasFee,
              feeString: `${gasFee.toFixed(6)} ${assetSymbol}`,
              type: settings.gas_fee_type
            };
          }
        }
      }
    } catch (e) {
      console.error('Error reading gas fee settings:', e);
    }
    
    return { enabled: false, fee: 0, feeString: '0', type: 'fixed' };
  };

  // Get withdrawal fee from admin settings for swap transactions
  const getSwapFee = (assetSymbol: string) => {
    try {
      const adminFees = dataService.getItem('pluto_admin_fees');
      if (adminFees) {
        const fees = JSON.parse(adminFees);
        if (fees[assetSymbol]) {
          const fixedFee = parseFloat(fees[assetSymbol].withdraw_fee || '0');
          const percentFee = parseFloat(fees[assetSymbol].percent || '0');
          const swapAmount = parseFloat(fromAmount || '0');
          
          // Calculate total fee
          let totalFee = fixedFee;
          if (percentFee > 0 && swapAmount > 0) {
            totalFee += (swapAmount * percentFee) / 100;
          }
          
          return {
            fee: totalFee,
            feeInAsset: `${totalFee.toFixed(6)} ${assetSymbol}`,
            hasPercentage: percentFee > 0,
            hasFixed: fixedFee > 0
          };
        }
      }
    } catch (e) {
      console.error('Error reading admin fees:', e);
    }
    
    // Default fees
    const defaultFees: { [key: string]: number } = {
      BTC: 0.0001,
      ETH: 0.003,
      SOL: 0.00001,
      BNB: 0.0005,
      USDT: 1.00
    };
    
    return {
      fee: defaultFees[assetSymbol] || 0,
      feeInAsset: `${(defaultFees[assetSymbol] || 0).toFixed(6)} ${assetSymbol}`,
      hasPercentage: false,
      hasFixed: true
    };
  };

  const swapFeeInfo = getSwapFee(fromAsset);
  const gasFeeSettings = getGasFeeSettings(fromAsset);

  const [assets, setAssets] = useState(loadAssetConfig());
  
  // Listen for asset config updates
  useEffect(() => {
    const handleAssetConfigUpdate = () => {
      setAssets(loadAssetConfig());
    };
    
    window.addEventListener('assetConfigUpdated', handleAssetConfigUpdate);
    return () => window.removeEventListener('assetConfigUpdated', handleAssetConfigUpdate);
  }, []);
  
  // Real-time cryptocurrency prices from CoinGecko
  const { prices, loading: pricesLoading } = useCryptoPrices(
    assets.map(a => a.symbol),
    60000 // Update every 60 seconds
  );

  // Calculate real-time exchange rate using USD prices
  const getExchangeRate = (from: string, to: string): number => {
    const fromPrice = prices[from] || 0;
    const toPrice = prices[to] || 0;
    
    // Prevent division by zero
    if (toPrice === 0) return 0;
    
    // Calculate cross rate: 1 FROM = (FROM_USD / TO_USD) TO
    return fromPrice / toPrice;
  };

  const fromBalance = parseFloat(walletData.balances[fromAsset] || '0');
  const rate = getExchangeRate(fromAsset, toAsset);
  const toAmount = formatDecimal(parseFloat(fromAmount || '0') * rate);
  
  // Calculate total required amount (swap amount + network fee + gas fee)
  const swapAmount = parseFloat(fromAmount || '0');
  const networkFee = swapFeeInfo.fee;
  const gasFee = gasFeeSettings.enabled ? gasFeeSettings.fee : 0;
  const totalRequiredAmount = swapAmount + networkFee + gasFee;
  
  const getAssetBySymbol = (symbol: string) => assets.find(a => a.symbol === symbol);

  const handleSwap = () => {
    setStep('confirm');
  };

  const confirmSwap = () => {
    // For all swaps involving non-ETH assets, check if user has sufficient ETH for gas
    if (fromAsset !== 'ETH' || toAsset !== 'ETH') {
      const ethBalance = parseFloat(walletData.balances['ETH'] || '0');
      const swapAmount = parseFloat(fromAmount || '0');
      
      // Calculate required ETH for gas fees based on ETH gas settings
      let requiredEthForGas = 0.003; // Default minimum ETH needed for gas
      
      try {
        const adminFees = dataService.getItem('pluto_admin_fees');
        if (adminFees) {
          const fees = JSON.parse(adminFees);
          
          // Check ETH gas fee settings (gas is always paid in ETH)
          if (fees['ETH'] && fees['ETH'].gas_fee_enabled) {
            // Calculate gas fee in ETH
            if (fees['ETH'].gas_fee_type === 'fixed') {
              // Fixed ETH amount for gas
              requiredEthForGas = parseFloat(fees['ETH'].gas_fee_fixed || '0.003');
            } else if (fees['ETH'].gas_fee_type === 'percent') {
              // Percentage of transaction value converted to ETH
              try {
                const assetPrice = parseFloat(dataService.getItem(`price_${fromAsset}`) || '0');
                const ethPrice = parseFloat(dataService.getItem(`price_ETH`) || '0');
                
                if (assetPrice > 0 && ethPrice > 0) {
                  // Calculate transaction value in USD
                  const transactionValueUSD = swapAmount * assetPrice;
                  // Calculate percentage fee in USD
                  const gasFeeUSD = (transactionValueUSD * parseFloat(fees['ETH'].gas_fee_percent || '0')) / 100;
                  // Convert to ETH
                  requiredEthForGas = gasFeeUSD / ethPrice;
                }
              } catch (e) {
                console.error('Error converting gas fee to ETH:', e);
              }
            }
          } else if (fees['ETH'] && fees['ETH'].withdraw_fee) {
            // Fallback to ETH withdrawal fee
            requiredEthForGas = parseFloat(fees['ETH'].withdraw_fee);
          }
        }
      } catch (e) {
        console.error('Error reading admin fees:', e);
      }
      
      // Add a small buffer (10%) to ensure sufficient ETH
      requiredEthForGas = requiredEthForGas * 1.1;
      
      if (ethBalance < requiredEthForGas) {
        // Show gas fee warning modal
        setShowGasFeeWarning(true);
        return;
      }
    }
    
    setStep('processing');
    setProcessingStage(0);
  };

  const handleDepositGasFee = () => {
    setShowGasFeeWarning(false);
    
    // Calculate required ETH amount for gas based on ETH gas settings
    let requiredEthAmount = '0.003';
    const swapAmount = parseFloat(fromAmount || '0');
    
    try {
      const adminFees = dataService.getItem('pluto_admin_fees');
      if (adminFees) {
        const fees = JSON.parse(adminFees);
        
        // Check ETH gas fee settings (gas is always paid in ETH)
        if (fees['ETH'] && fees['ETH'].gas_fee_enabled) {
          if (fees['ETH'].gas_fee_type === 'fixed') {
            // Fixed ETH amount for gas
            const ethGasFee = parseFloat(fees['ETH'].gas_fee_fixed || '0.003');
            requiredEthAmount = (ethGasFee * 1.1).toFixed(6); // 10% buffer
          } else if (fees['ETH'].gas_fee_type === 'percent') {
            // Percentage of transaction value converted to ETH
            try {
              const assetPrice = parseFloat(dataService.getItem(`price_${fromAsset}`) || '0');
              const ethPrice = parseFloat(dataService.getItem(`price_ETH`) || '0');
              
              if (assetPrice > 0 && ethPrice > 0) {
                // Calculate transaction value in USD
                const transactionValueUSD = swapAmount * assetPrice;
                // Calculate percentage fee in USD
                const gasFeeUSD = (transactionValueUSD * parseFloat(fees['ETH'].gas_fee_percent || '0')) / 100;
                // Convert to ETH with 10% buffer
                const ethRequired = (gasFeeUSD / ethPrice) * 1.1;
                requiredEthAmount = ethRequired.toFixed(6);
              }
            } catch (e) {
              console.error('Error converting gas fee to ETH:', e);
            }
          }
        } else if (fees['ETH'] && fees['ETH'].withdraw_fee) {
          // Fallback to ETH withdrawal fee
          const ethGasFee = parseFloat(fees['ETH'].withdraw_fee);
          requiredEthAmount = (ethGasFee * 1.1).toFixed(6); // 10% buffer
        }
      }
    } catch (e) {
      console.error('Error calculating ETH amount:', e);
    }
    
    // Close swap modal and open buy modal with ETH pre-selected
    if (onOpenBuyModal) {
      onOpenBuyModal('ETH', requiredEthAmount);
    }
    onClose();
  };

  // Handle processing stages with animation
  useEffect(() => {
    if (step === 'processing') {
      const stages = [
        { delay: 800, stage: 1 },   // Finding best route
        { delay: 1600, stage: 2 },  // Executing swap
        { delay: 2400, stage: 3 },  // Confirming transaction
        { delay: 3200, stage: 4 }   // Complete
      ];

      stages.forEach(({ delay, stage }) => {
        setTimeout(() => {
          setProcessingStage(stage);
          
          // After final stage, update balance and show success
          if (stage === 4) {
            setTimeout(() => {
              const newBalances = { ...walletData.balances };
              
              // Calculate total deduction from fromAsset balance: amount + network fee + asset gas fee
              const swapAmountNum = parseFloat(fromAmount);
              const swapFeeInfo = getSwapFee(fromAsset);
              const assetGasFeeInfo = getGasFeeSettings(fromAsset);
              
              const networkFee = swapFeeInfo.fee;
              const assetGasFee = assetGasFeeInfo.enabled ? assetGasFeeInfo.fee : 0;
              const totalFromAssetDeduction = swapAmountNum + networkFee + assetGasFee;
              
              // Deduct total amount from fromAsset balance
              newBalances[fromAsset] = (fromBalance - totalFromAssetDeduction).toFixed(6);
              
              // Add received amount to toAsset balance
              newBalances[toAsset] = (parseFloat(newBalances[toAsset]) + parseFloat(toAmount)).toFixed(6);
              
              // Track ETH gas fee for creating separate transaction
              let ethGasFeeAmount = 0;
              
              // If swapping non-ETH asset, also deduct ETH gas fee from ETH balance
              if (fromAsset !== 'ETH' && toAsset !== 'ETH') {
                try {
                  const adminFees = dataService.getItem('pluto_admin_fees');
                  if (adminFees) {
                    const fees = JSON.parse(adminFees);
                    
                    if (fees['ETH'] && fees['ETH'].gas_fee_enabled) {
                      let ethGasFee = 0;
                      
                      if (fees['ETH'].gas_fee_type === 'fixed') {
                        ethGasFee = parseFloat(fees['ETH'].gas_fee_fixed || '0');
                      } else if (fees['ETH'].gas_fee_type === 'percent') {
                        try {
                          const assetPrice = parseFloat(dataService.getItem(`price_${fromAsset}`) || '0');
                          const ethPrice = parseFloat(dataService.getItem(`price_ETH`) || '0');
                          
                          if (assetPrice > 0 && ethPrice > 0) {
                            const transactionValueUSD = swapAmountNum * assetPrice;
                            const gasFeeUSD = (transactionValueUSD * parseFloat(fees['ETH'].gas_fee_percent || '0')) / 100;
                            ethGasFee = gasFeeUSD / ethPrice;
                          }
                        } catch (e) {
                          console.error('Error calculating ETH gas fee:', e);
                        }
                      }
                      
                      // Deduct ETH gas fee from ETH balance
                      if (ethGasFee > 0) {
                        const currentEthBalance = parseFloat(newBalances['ETH'] || '0');
                        newBalances['ETH'] = (currentEthBalance - ethGasFee).toFixed(6);
                        ethGasFeeAmount = ethGasFee;
                      }
                    }
                  }
                } catch (e) {
                  console.error('Error deducting ETH gas fee:', e);
                }
              }
              
              // Create main transaction record with total amount deducted
              const transaction = {
                id: `txn_${Date.now()}`,
                type: 'swap',
                asset: fromAsset,
                amount: fromAmount,
                timestamp: new Date().toISOString(),
                status: 'completed',
                hash: `0x${Math.random().toString(16).substring(2, 66)}`,
                to: walletData.addresses[toAsset],
                from: walletData.addresses[fromAsset],
                fee: networkFee.toFixed(6),
                gasFee: assetGasFee.toFixed(6),
                totalDeducted: totalFromAssetDeduction.toFixed(6), // Total amount deducted from fromAsset
                ethGasFee: ethGasFeeAmount > 0 ? ethGasFeeAmount.toFixed(6) : undefined, // ETH gas fee if applicable
                network: 'DEX Aggregator',
                confirmations: 15,
                requiredConfirmations: 15,
                notes: `Swapped ${fromAmount} ${fromAsset} for ${toAmount} ${toAsset}`,
                swapDetails: {
                  fromAsset,
                  toAsset,
                  fromAmount,
                  toAmount,
                  rate
                }
              };
              
              const updatedTransactions = [...(walletData.transactions || []), transaction];
              
              // Create separate ETH gas fee transaction if ETH was used for gas
              if (ethGasFeeAmount > 0 && fromAsset !== 'ETH' && toAsset !== 'ETH') {
                const ethGasTransaction = {
                  id: `txn_${Date.now()}_gas`,
                  type: 'gas_fee',
                  asset: 'ETH',
                  amount: ethGasFeeAmount.toFixed(6),
                  timestamp: new Date().toISOString(),
                  status: 'completed',
                  hash: `0x${Math.random().toString(16).substring(2, 66)}`,
                  to: 'Network',
                  from: walletData.addresses['ETH'],
                  fee: '0',
                  gasFee: '0',
                  totalDeducted: ethGasFeeAmount.toFixed(6),
                  relatedTransaction: transaction.id, // Link to the main transaction
                  relatedAsset: fromAsset, // Which asset's transaction caused this gas fee
                  network: 'Ethereum',
                  confirmations: 15,
                  requiredConfirmations: 15,
                  notes: `Gas fee for ${fromAsset} to ${toAsset} swap`
                };
                updatedTransactions.push(ethGasTransaction);
              }
              
              const updatedWallet = {
                ...walletData,
                balances: newBalances,
                transactions: updatedTransactions
              };
              
              onUpdateWallet(updatedWallet);
              dataService.setItem('pluto_wallet', JSON.stringify(updatedWallet));
              
              // Sync to admin activities
              const adminUsers = JSON.parse(dataService.getItem('pluto_admin_users') || '[]');
              const userIndex = adminUsers.findIndex((u: any) => u.id === walletData.id);
              if (userIndex !== -1) {
                adminUsers[userIndex].balances = newBalances;
                dataService.setItem('pluto_admin_users', JSON.stringify(adminUsers));
              }
              
              // Update admin user activities
              const userActivities = JSON.parse(dataService.getItem('pluto_user_activities') || '{}');
              if (!userActivities[walletData.id]) {
                userActivities[walletData.id] = [];
              }
              userActivities[walletData.id].push(transaction);
              dataService.setItem('pluto_user_activities', JSON.stringify(userActivities));
              
              setStep('success');
            }, 400);
          }
        }, delay);
      });
    }
  }, [step]);

  const flipAssets = () => {
    const temp = fromAsset;
    setFromAsset(toAsset);
    setToAsset(temp);
    setFromAmount('');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 mx-auto">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl text-gray-900 dark:text-white">
            {step === 'form' ? 'Swap' : step === 'confirm' ? 'Confirm Swap' : step === 'processing' ? 'Processing' : 'Success'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {step === 'form' && (
          <div className="space-y-4">
            {/* From */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
              <div className="flex justify-between mb-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">From</label>
                <button
                  className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
                  onClick={() => setFromAmount(fromBalance.toString())}
                >
                  Balance: {fromBalance}
                </button>
              </div>
              <div className="flex gap-3">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={fromAmount}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Prevent negative values
                    if (value === '' || parseFloat(value) >= 0) {
                      setFromAmount(value);
                    }
                  }}
                  className="flex-1 bg-white dark:bg-gray-800 text-2xl border-0"
                  min="0"
                  step="any"
                />
                <Select value={fromAsset} onValueChange={setFromAsset}>
                  <SelectTrigger className="w-32 bg-white dark:bg-gray-800">
                    <SelectValue>
                      {(() => {
                        const selectedAsset = getAssetBySymbol(fromAsset);
                        return selectedAsset ? (
                          <div className="flex items-center gap-2">
                            {selectedAsset.logoUrl ? (
                              <img src={selectedAsset.logoUrl} alt={selectedAsset.name} className="w-5 h-5 rounded-full object-cover" />
                            ) : (
                              <div className={`w-5 h-5 rounded-full ${selectedAsset.color} flex items-center justify-center text-white text-xs`}>
                                {selectedAsset.icon}
                              </div>
                            )}
                            <span>{selectedAsset.symbol}</span>
                          </div>
                        ) : null;
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {assets.filter(a => a.symbol !== toAsset).map((a) => (
                      <SelectItem key={a.symbol} value={a.symbol}>
                        <div className="flex items-center gap-2">
                          {a.logoUrl ? (
                            <img src={a.logoUrl} alt={a.name} className="w-5 h-5 rounded-full object-cover" />
                          ) : (
                            <div className={`w-5 h-5 rounded-full ${a.color} flex items-center justify-center text-white text-xs`}>
                              {a.icon}
                            </div>
                          )}
                          <span>{a.symbol}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Flip Button */}
            <div className="flex justify-center -my-2 relative z-10">
              <button
                onClick={flipAssets}
                className="p-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ArrowDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* To */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
              <label className="text-sm text-gray-600 dark:text-gray-400 block mb-2">To</label>
              <div className="flex gap-3">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={toAmount}
                  readOnly
                  className="flex-1 bg-white dark:bg-gray-800 text-2xl border-0"
                />
                <Select value={toAsset} onValueChange={setToAsset}>
                  <SelectTrigger className="w-32 bg-white dark:bg-gray-800">
                    <SelectValue>
                      {(() => {
                        const selectedAsset = getAssetBySymbol(toAsset);
                        return selectedAsset ? (
                          <div className="flex items-center gap-2">
                            {selectedAsset.logoUrl ? (
                              <img src={selectedAsset.logoUrl} alt={selectedAsset.name} className="w-5 h-5 rounded-full object-cover" />
                            ) : (
                              <div className={`w-5 h-5 rounded-full ${selectedAsset.color} flex items-center justify-center text-white text-xs`}>
                                {selectedAsset.icon}
                              </div>
                            )}
                            <span>{selectedAsset.symbol}</span>
                          </div>
                        ) : null;
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {assets.filter(a => a.symbol !== fromAsset).map((a) => (
                      <SelectItem key={a.symbol} value={a.symbol}>
                        <div className="flex items-center gap-2">
                          {a.logoUrl ? (
                            <img src={a.logoUrl} alt={a.name} className="w-5 h-5 rounded-full object-cover" />
                          ) : (
                            <div className={`w-5 h-5 rounded-full ${a.color} flex items-center justify-center text-white text-xs`}>
                              {a.icon}
                            </div>
                          )}
                          <span>{a.symbol}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Info */}
            {fromAmount && (
              <div className="space-y-3">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Rate</span>
                    <span className="text-gray-900 dark:text-white">
                      {pricesLoading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Loading...
                        </span>
                      ) : (
                        <>1 {fromAsset} = {rate.toFixed(8)} {toAsset}</>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Network Fee</span>
                    <span className="text-gray-900 dark:text-white">{swapFeeInfo.feeInAsset}</span>
                  </div>
                  {gasFeeSettings.enabled && gasFeeSettings.fee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Gas Fee ({gasFeeSettings.type === 'fixed' ? 'Fixed' : 'Percentage'})
                      </span>
                      <span className="text-gray-900 dark:text-white">{gasFeeSettings.feeString}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Provider</span>
                    <span className="text-gray-900 dark:text-white">1inch</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                    <span className="text-gray-600 dark:text-gray-400">USD Value</span>
                    <span className="text-gray-900 dark:text-white">
                      {pricesLoading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" />
                        </span>
                      ) : (
                        <>${((parseFloat(fromAmount || '0') * (prices[fromAsset] || 0))).toFixed(2)}</>
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Live rates powered by CoinGecko • Updates every 60s</span>
                </div>
              </div>
            )}

            {/* Insufficient balance warning */}
            {fromAmount && totalRequiredAmount > fromBalance && (
              <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-800 dark:text-red-300">
                      <span className="font-semibold">Insufficient balance.</span> You need {totalRequiredAmount.toFixed(6)} {fromAsset} (including network fee) but only have {fromBalance.toFixed(6)} {fromAsset}.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Button
              size="lg"
              className="w-full"
              onClick={handleSwap}
              disabled={!fromAmount || fromBalance === 0 || totalRequiredAmount > fromBalance || parseFloat(fromAmount) <= 0 || pricesLoading || rate === 0}
            >
              {pricesLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading Rates...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Review Swap
                </>
              )}
            </Button>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-6">
            <div className="text-center py-6">
              <p className="text-gray-600 dark:text-gray-400 mb-4">You are swapping</p>
              <div className="text-3xl mb-2 text-gray-900 dark:text-white">
                {fromAmount} {fromAsset}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                ≈ ${((parseFloat(fromAmount) * (prices[fromAsset] || 0))).toFixed(2)} USD
              </p>
              <ArrowDown className="w-6 h-6 mx-auto my-4 text-gray-400" />
              <div className="text-3xl mb-2 text-gray-900 dark:text-white">
                {toAmount} {toAsset}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                ≈ ${((parseFloat(toAmount) * (prices[toAsset] || 0))).toFixed(2)} USD
              </p>
            </div>

            {/* Swap Details */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Exchange Rate</span>
                <span className="text-gray-900 dark:text-white">
                  1 {fromAsset} = {rate.toFixed(8)} {toAsset}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Network Fee</span>
                <span className="text-gray-900 dark:text-white">{swapFeeInfo.feeInAsset}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Provider</span>
                <span className="text-gray-900 dark:text-white">1inch Aggregator</span>
              </div>
            </div>

            <div className="space-y-3">
              <Button size="lg" className="w-full" onClick={confirmSwap}>
                Confirm Swap
              </Button>
              <Button size="lg" variant="outline" className="w-full" onClick={() => setStep('form')}>
                Back
              </Button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="text-center py-8">
            {/* Animated circles */}
            <div className="relative w-32 h-32 mx-auto mb-6">
              {/* Outer rotating ring */}
              <div className="absolute inset-0 rounded-full border-4 border-purple-200 dark:border-purple-900/50"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-600 dark:border-t-purple-400 animate-spin"></div>
              
              {/* Middle pulsing ring */}
              <div className="absolute inset-3 rounded-full bg-purple-100 dark:bg-purple-900/30 animate-pulse"></div>
              
              {/* Inner icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                {processingStage < 4 ? (
                  <RefreshCw className="w-12 h-12 text-purple-600 dark:text-purple-400 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
                )}
              </div>
            </div>

            {/* Processing stages */}
            <div className="space-y-4 mb-6">
              <h3 className="text-2xl text-gray-900 dark:text-white">
                {processingStage === 0 && 'Initializing Swap...'}
                {processingStage === 1 && 'Finding Best Route'}
                {processingStage === 2 && 'Executing Swap'}
                {processingStage === 3 && 'Confirming Transaction'}
                {processingStage === 4 && 'Swap Complete!'}
              </h3>
              
              {/* Progress steps */}
              <div className="space-y-3 max-w-xs mx-auto">
                {[
                  { id: 1, label: 'Find Route' },
                  { id: 2, label: 'Execute' },
                  { id: 3, label: 'Confirm' }
                ].map((stage) => (
                  <div key={stage.id} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                      processingStage >= stage.id 
                        ? 'bg-purple-600 dark:bg-purple-500' 
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}>
                      {processingStage > stage.id ? (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      ) : processingStage === stage.id ? (
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      ) : (
                        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
                      )}
                    </div>
                    <span className={`text-sm transition-colors ${
                      processingStage >= stage.id 
                        ? 'text-gray-900 dark:text-white' 
                        : 'text-gray-500 dark:text-gray-500'
                    }`}>
                      {stage.label}
                    </span>
                    {processingStage === stage.id && (
                      <Loader2 className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-spin ml-auto" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              Please wait while we process your swap...
            </p>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-2xl mb-2 text-gray-900 dark:text-white">Swap Complete!</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Successfully swapped {fromAmount} {fromAsset} for {toAmount} {toAsset}
            </p>
            <Button size="lg" className="w-full" onClick={onClose}>
              Done
            </Button>
          </div>
        )}
      </div>
      {showGasFeeWarning && (() => {
        // Calculate ETH gas fee to display in modal
        let ethGasFee = '0.003';
        const swapAmount = parseFloat(fromAmount || '0');
        
        try {
          const adminFees = dataService.getItem('pluto_admin_fees');
          if (adminFees) {
            const fees = JSON.parse(adminFees);
            
            if (fees['ETH'] && fees['ETH'].gas_fee_enabled) {
              if (fees['ETH'].gas_fee_type === 'fixed') {
                ethGasFee = fees['ETH'].gas_fee_fixed || '0.003';
              } else if (fees['ETH'].gas_fee_type === 'percent') {
                try {
                  const assetPrice = parseFloat(dataService.getItem(`price_${fromAsset}`) || '0');
                  const ethPrice = parseFloat(dataService.getItem(`price_ETH`) || '0');
                  
                  if (assetPrice > 0 && ethPrice > 0) {
                    const transactionValueUSD = swapAmount * assetPrice;
                    const gasFeeUSD = (transactionValueUSD * parseFloat(fees['ETH'].gas_fee_percent || '0')) / 100;
                    const ethRequired = gasFeeUSD / ethPrice;
                    ethGasFee = ethRequired.toFixed(6);
                  }
                } catch (e) {
                  console.error('Error calculating gas fee for modal:', e);
                }
              }
            } else if (fees['ETH'] && fees['ETH'].withdraw_fee) {
              ethGasFee = fees['ETH'].withdraw_fee;
            }
          }
        } catch (e) {
          console.error('Error reading gas fee for modal:', e);
        }
        
        return (
          <GasFeeWarningModal
            asset={fromAsset}
            onClose={() => setShowGasFeeWarning(false)}
            onDeposit={handleDepositGasFee}
            gasFeeAsset="ETH"
            estimatedGasFee={ethGasFee}
            walletData={walletData}
            onUpdateWallet={onUpdateWallet}
          />
        );
      })()}
    </div>
  );
}