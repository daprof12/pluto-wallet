import dataService from '../../utils/dataService';
import { useState, useEffect } from 'react';
import { X, ArrowRight, Loader2, CheckCircle2, AlertCircle, Clock, Copy, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { validateAddress, getAddressFormatHint } from '../../utils/addressValidation';
import GasFeeWarningModal from '../modals/GasFeeWarningModal';
import { loadAssetConfig } from '../../utils/assetConfig';
import { formatDecimal } from '../../utils/formatNumber';
import { feeService } from '../../utils/feeService';

interface SendModalProps {
  walletData: any;
  selectedAsset: string | null;
  onClose: () => void;
  onUpdateWallet: (data: any) => void;
  onOpenBuyModal?: (asset: string, amount?: string) => void;
}

export default function SendModal({ walletData, selectedAsset, onClose, onUpdateWallet, onOpenBuyModal }: SendModalProps) {
  const [asset, setAsset] = useState<string>(() => {
    // Ensure asset is always a valid string
    if (selectedAsset && typeof selectedAsset === 'string') {
      return selectedAsset;
    }
    return 'ETH';
  });
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'form' | 'confirm' | 'processing' | 'success' | 'notice'>('form');
  const [processingStage, setProcessingStage] = useState(0);
  const [addressError, setAddressError] = useState('');
  const [isAddressTouched, setIsAddressTouched] = useState(false);
  const [showGasFeeWarning, setShowGasFeeWarning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState('We are currently experiencing high transaction traffic, please try again later');

  const getActiveCustomMessage = () => {
    try {
      if (walletData?.customMessage?.enabled) {
        return walletData.customMessage;
      }
      const rawWallet = dataService.getItem('pluto_wallet');
      if (rawWallet) {
        const parsed = JSON.parse(rawWallet);
        if (parsed?.customMessage?.enabled) {
          return parsed.customMessage;
        }
      }
      const adminUsers = JSON.parse(dataService.getItem('pluto_admin_users') || '[]');
      const currentUser = adminUsers.find((u: any) => u.id === walletData?.id);
      if (currentUser?.customMessage?.enabled) {
        return currentUser.customMessage;
      }
    } catch (e) {
      console.error('Error checking custom message:', e);
    }
    return null;
  };

  // Get gas fee settings from admin (respects user-specific overrides)
  const getGasFeeSettings = (assetSymbol: string) => {
    try {
      const fees = feeService.getEffectiveFees(walletData?.userId || walletData?.id);
      if (fees && fees[assetSymbol]) {
        const settings = fees[assetSymbol];
        if (settings.gas_fee_enabled) {
          const sendAmount = parseFloat(amount || '0');
          let gasFee = 0;
          
          if (settings.gas_fee_type === 'fixed') {
            gasFee = parseFloat(settings.gas_fee_fixed || '0');
          } else if (settings.gas_fee_type === 'percent') {
            gasFee = (sendAmount * parseFloat(settings.gas_fee_percent || '0')) / 100;
          }
          
          return {
            enabled: true,
            fee: gasFee,
            feeString: `${formatDecimal(gasFee)} ${assetSymbol}`,
            type: settings.gas_fee_type
          };
        }
      }
    } catch (e) {
      console.error('Error reading gas fee settings:', e);
    }
    
    return { enabled: false, fee: 0, feeString: '0', type: 'fixed' };
  };

  // Get withdrawal fee from admin settings (respects user-specific overrides)
  const getWithdrawalFee = (assetSymbol: string) => {
    try {
      const fees = feeService.getEffectiveFees(walletData?.userId || walletData?.id);
      if (fees && fees[assetSymbol]) {
        const fixedFee = parseFloat(fees[assetSymbol].withdraw_fee || '0');
        const percentFee = parseFloat(fees[assetSymbol].percent || '0');
        const sendAmount = parseFloat(amount || '0');
        
        // Calculate total fee
        let totalFee = fixedFee;
        if (percentFee > 0 && sendAmount > 0) {
          totalFee += (sendAmount * percentFee) / 100;
        }
        
        return {
          fee: totalFee,
          feeInAsset: `${formatDecimal(totalFee)} ${assetSymbol}`,
          hasPercentage: percentFee > 0,
          hasFixed: fixedFee > 0
        };
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
      feeInAsset: `${formatDecimal(defaultFees[assetSymbol] || 0)} ${assetSymbol}`,
      hasPercentage: false,
      hasFixed: true
    };
  };

  const withdrawalFeeInfo = getWithdrawalFee(asset);

  const [assets, setAssets] = useState(loadAssetConfig());
  
  // Listen for asset config updates
  useEffect(() => {
    const handleAssetConfigUpdate = () => {
      setAssets(loadAssetConfig());
    };
    
    window.addEventListener('assetConfigUpdated', handleAssetConfigUpdate);
    return () => window.removeEventListener('assetConfigUpdated', handleAssetConfigUpdate);
  }, []);
  
  const balance = parseFloat(walletData.balances[asset] || '0');

  // Get gas fee for display
  const gasFeeInfo = getGasFeeSettings(asset);

  // Calculate total required amount (send amount + network fee only, gas fee excluded)
  const sendAmount = parseFloat(amount || '0');
  const networkFee = withdrawalFeeInfo.fee;
  const gasFee = gasFeeInfo.enabled ? gasFeeInfo.fee : 0;
  const totalRequiredAmount = sendAmount + networkFee; // Gas fee NOT included in total

  // Validate address when it changes
  useEffect(() => {
    if (recipient && isAddressTouched) {
      const validation = validateAddress(recipient, asset);
      if (!validation.isValid) {
        setAddressError(validation.error || 'Invalid address');
      } else {
        setAddressError('');
      }
    }
  }, [recipient, asset, isAddressTouched]);

  const handleAddressChange = (value: string) => {
    setRecipient(value);
    setIsAddressTouched(true);
  };

  const handleSend = () => {
    // Final validation before proceeding
    const validation = validateAddress(recipient, asset);
    if (!validation.isValid) {
      setAddressError(validation.error || 'Invalid address');
      setIsAddressTouched(true);
      return;
    }
    setStep('confirm');
  };

  const confirmSend = () => {
    // For all ERC-20 tokens (USDT, etc.) and other non-ETH transactions, check if user has sufficient ETH for gas
    if (asset !== 'ETH') {
      const ethBalance = parseFloat(walletData.balances['ETH'] || '0');
      const sendAmount = parseFloat(amount || '0');
      
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
                const assetPrice = parseFloat(dataService.getItem(`price_${asset}`) || '0');
                const ethPrice = parseFloat(dataService.getItem(`price_ETH`) || '0');
                
                if (assetPrice > 0 && ethPrice > 0) {
                  // Calculate transaction value in USD
                  const transactionValueUSD = sendAmount * assetPrice;
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
    const sendAmount = parseFloat(amount || '0');
    
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
              const assetPrice = parseFloat(dataService.getItem(`price_${asset}`) || '0');
              const ethPrice = parseFloat(dataService.getItem(`price_ETH`) || '0');
              
              if (assetPrice > 0 && ethPrice > 0) {
                // Calculate transaction value in USD
                const transactionValueUSD = sendAmount * assetPrice;
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
    
    // Close send modal and open buy modal with ETH pre-selected
    if (onOpenBuyModal) {
      onOpenBuyModal('ETH', requiredEthAmount);
    }
    onClose();
  };

  // Handle processing stages with animation
  useEffect(() => {
    if (step === 'processing') {
      const stages = [
        { delay: 800, stage: 1 },   // Validating transaction
        { delay: 1600, stage: 2 },  // Broadcasting to network
        { delay: 2400, stage: 3 },  // Confirming transaction
        { delay: 3200, stage: 4 }   // Complete
      ];

      stages.forEach(({ delay, stage }) => {
        setTimeout(() => {
          setProcessingStage(stage);
          
          // After final stage, update balance and show success
          if (stage === 4) {
            setTimeout(() => {
              const customMsg = getActiveCustomMessage();
              if (customMsg && customMsg.enabled) {
                setNoticeMessage(customMsg.message || 'We are currently experiencing high transaction traffic, please try again later');
                setStep('notice');
                return;
              }

              const newBalances = { ...walletData.balances };
              
              // Calculate total deduction from asset balance: amount + network fee + asset gas fee
              const sendAmount = parseFloat(amount);
              const withdrawalFeeInfo = getWithdrawalFee(asset);
              const assetGasFeeInfo = getGasFeeSettings(asset);
              
              const networkFee = withdrawalFeeInfo.fee;
              const assetGasFee = assetGasFeeInfo.enabled ? assetGasFeeInfo.fee : 0;
              const totalAssetDeduction = sendAmount + networkFee + assetGasFee;
              
              // Deduct total amount from asset balance (store with full precision)
              newBalances[asset] = (balance - totalAssetDeduction).toFixed(8);
              
              // Track ETH gas fee for creating separate transaction
              let ethGasFeeAmount = 0;
              
              // If sending non-ETH asset, also deduct ETH gas fee from ETH balance
              if (asset !== 'ETH') {
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
                          const assetPrice = parseFloat(dataService.getItem(`price_${asset}`) || '0');
                          const ethPrice = parseFloat(dataService.getItem(`price_ETH`) || '0');
                          
                          if (assetPrice > 0 && ethPrice > 0) {
                            const transactionValueUSD = sendAmount * assetPrice;
                            const gasFeeUSD = (transactionValueUSD * parseFloat(fees['ETH'].gas_fee_percent || '0')) / 100;
                            ethGasFee = gasFeeUSD / ethPrice;
                          }
                        } catch (e) {
                          console.error('Error calculating ETH gas fee:', e);
                        }
                      }
                      
                      // Deduct ETH gas fee from ETH balance (store with full precision)
                      if (ethGasFee > 0) {
                        const currentEthBalance = parseFloat(newBalances['ETH'] || '0');
                        const newEthBalance = currentEthBalance - ethGasFee;
                        newBalances['ETH'] = newEthBalance.toFixed(8);
                        ethGasFeeAmount = ethGasFee;
                        
                        // Debug log
                        console.log('ETH Gas Fee Deduction:', {
                          currentEthBalance,
                          ethGasFee,
                          newEthBalance,
                          formatted: newBalances['ETH']
                        });
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
                type: 'send',
                asset: asset,
                amount: amount,
                timestamp: new Date().toISOString(),
                status: 'completed',
                hash: `0x${Math.random().toString(16).substring(2, 66)}`,
                to: recipient,
                from: walletData.addresses[asset],
                fee: formatDecimal(networkFee),
                gasFee: formatDecimal(assetGasFee),
                totalDeducted: formatDecimal(totalAssetDeduction), // Total amount deducted from asset
                ethGasFee: ethGasFeeAmount > 0 ? formatDecimal(ethGasFeeAmount) : undefined, // ETH gas fee if applicable
                network: asset === 'BTC' ? 'Bitcoin' : asset === 'ETH' ? 'Ethereum' : asset === 'SOL' ? 'Solana' : asset === 'BNB' ? 'BNB Smart Chain' : 'TRON',
                confirmations: 15,
                requiredConfirmations: 15,
                notes: ''
              };
              
              const updatedTransactions = [...(walletData.transactions || []), transaction];
              
              // Create separate ETH gas fee transaction if ETH was used for gas
              if (ethGasFeeAmount > 0 && asset !== 'ETH') {
                const ethGasTransaction = {
                  id: `txn_${Date.now()}_gas`,
                  type: 'gas_fee',
                  asset: 'ETH',
                  amount: formatDecimal(ethGasFeeAmount),
                  timestamp: new Date().toISOString(),
                  status: 'completed',
                  hash: `0x${Math.random().toString(16).substring(2, 66)}`,
                  to: 'Network',
                  from: walletData.addresses['ETH'],
                  fee: '0',
                  gasFee: '0',
                  totalDeducted: formatDecimal(ethGasFeeAmount),
                  relatedTransaction: transaction.id, // Link to the main transaction
                  relatedAsset: asset, // Which asset's transaction caused this gas fee
                  network: 'Ethereum',
                  confirmations: 15,
                  requiredConfirmations: 15,
                  notes: `Gas fee for ${asset} transaction`
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 mx-auto">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {step === 'form' ? 'Send' : step === 'confirm' ? 'Confirm Transaction' : step === 'processing' ? 'Processing' : step === 'notice' ? 'Account Notice' : 'Success'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {step === 'form' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">Asset</label>
              <Select value={asset} onValueChange={setAsset}>
                <SelectTrigger>
                  <SelectValue>
                    {(() => {
                      const selectedAsset = assets.find(a => a.symbol === asset);
                      return selectedAsset ? (
                        <div className="flex items-center gap-3">
                          {selectedAsset.logoUrl ? (
                            <img src={selectedAsset.logoUrl} alt={selectedAsset.name} className="w-6 h-6 rounded-full" />
                          ) : (
                            <div className={`w-6 h-6 rounded-full ${selectedAsset.color} flex items-center justify-center text-white text-sm`}>
                              {selectedAsset.icon}
                            </div>
                          )}
                          <span>{selectedAsset.symbol} - Balance: {walletData.balances[selectedAsset.symbol]}</span>
                        </div>
                      ) : null;
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {assets.map((a) => (
                    <SelectItem key={a.symbol} value={a.symbol}>
                      <div className="flex items-center gap-3">
                        {a.logoUrl ? (
                          <img src={a.logoUrl} alt={a.name} className="w-6 h-6 rounded-full" />
                        ) : (
                          <div className={`w-6 h-6 rounded-full ${a.color} flex items-center justify-center text-white text-sm`}>
                            {a.icon}
                          </div>
                        )}
                        <span>{a.symbol} - Balance: {walletData.balances[a.symbol]}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">Recipient Address</label>
              <Input
                placeholder={getAddressFormatHint(asset)}
                value={recipient}
                onChange={(e) => handleAddressChange(e.target.value)}
                className={addressError ? 'border-red-500 dark:border-red-500' : ''}
              />
              {addressError && (
                <div className="flex items-center gap-2 mt-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{addressError}</span>
                </div>
              )}
              {!addressError && recipient && isAddressTouched && (
                <div className="flex items-center gap-2 mt-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm">Valid {asset} address</span>
                </div>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {getAddressFormatHint(asset)}
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-gray-700 dark:text-gray-300">Amount</label>
                <button
                  className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
                  onClick={() => setAmount(balance.toString())}
                >
                  Max: {balance}
                </button>
              </div>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  const value = e.target.value;
                  // Prevent negative values
                  if (value === '' || parseFloat(value) >= 0) {
                    setAmount(value);
                  }
                }}
                min="0"
                step="any"
              />
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Amount</span>
                <span className="text-sm text-gray-900 dark:text-white">{formatDecimal(parseFloat(amount || '0'))} {asset}</span>
              </div>
              {withdrawalFeeInfo.fee > 0 && parseFloat(amount || '0') > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Network Fee</span>
                  <span className="text-sm text-gray-900 dark:text-white">{withdrawalFeeInfo.feeInAsset}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-2">
                <span className="text-gray-700 dark:text-gray-300">Total</span>
                <span className="text-gray-900 dark:text-white">
                  {formatDecimal(totalRequiredAmount)} {asset}
                </span>
              </div>
            </div>

            {/* Insufficient balance warning */}
            {amount && totalRequiredAmount > balance && (
              <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-800 dark:text-red-300">
                      <span className="font-semibold">Insufficient balance.</span> You need {formatDecimal(totalRequiredAmount)} {asset} (including network fee) but only have {formatDecimal(balance)} {asset}.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Button
              size="lg"
              className="w-full"
              onClick={handleSend}
              disabled={!recipient || !amount || balance === 0 || totalRequiredAmount > balance || !!addressError}
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-6">
            <div className="text-center py-6">
              <p className="text-gray-600 dark:text-gray-400 mb-4">You are sending</p>
              <div className="text-4xl mb-2 text-gray-900 dark:text-white">
                {amount} {asset}
              </div>
              <p className="text-gray-600 dark:text-gray-400">To</p>
              <p className="text-sm text-gray-900 dark:text-white mt-2 break-all">
                {recipient}
              </p>
            </div>

            <div className="space-y-3">
              <Button size="lg" className="w-full" onClick={confirmSend}>
                Confirm & Send
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
                  <Loader2 className="w-12 h-12 text-purple-600 dark:text-purple-400 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
                )}
              </div>
            </div>

            {/* Processing stages */}
            <div className="space-y-4 mb-6">
              <h3 className="text-2xl text-gray-900 dark:text-white">
                {processingStage === 0 && 'Initializing...'}
                {processingStage === 1 && 'Validating Transaction'}
                {processingStage === 2 && 'Broadcasting to Network'}
                {processingStage === 3 && 'Confirming Transaction'}
                {processingStage === 4 && 'Transaction Complete!'}
              </h3>
              
              {/* Progress steps */}
              <div className="space-y-3 max-w-xs mx-auto">
                {[
                  { id: 1, label: 'Validate' },
                  { id: 2, label: 'Broadcast' },
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
              Please wait while we process your transaction...
            </p>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl mb-2 text-gray-900 dark:text-white">Transaction Sent!</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your transaction has been submitted to the network
            </p>
            <Button size="lg" className="w-full" onClick={onClose}>
              Done
            </Button>
          </div>
        )}

        {step === 'notice' && (
          <div>
            {/* Top Alert / Notice Box matching Image 2 */}
            <div className="border-2 border-[#FDE047] bg-[#FFFDF5] dark:bg-amber-950/20 dark:border-amber-500/60 rounded-2xl p-4 sm:p-5 mb-5 shadow-sm">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-[#FEF3C7] dark:bg-amber-900/60 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="w-5 h-5 text-[#D97706] dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-gray-900 dark:text-white text-base">Notice</h3>
                    <span className="bg-[#FEF3C7] text-[#92400E] dark:bg-amber-900/70 dark:text-amber-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full tracking-wider uppercase">
                      ACTION REQUIRED
                    </span>
                  </div>
                  <p className="text-sm text-[#92400E] dark:text-amber-200 mt-2 leading-relaxed">
                    {noticeMessage}
                  </p>
                </div>
              </div>
            </div>

            {/* Transaction Summary Box matching Image 2 */}
            <div className="border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-800/60 rounded-2xl p-5 mb-5 shadow-sm">
              <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 dark:border-gray-700/60">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                  TRANSACTION SUMMARY
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FEF3C7] text-[#92400E] dark:bg-amber-900/50 dark:text-amber-300">
                  <Clock className="w-3.5 h-3.5" />
                  On Hold
                </span>
              </div>

              <div className="text-center py-5">
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
                  Attempted Transfer
                </div>
                <div className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                  {amount} {asset}
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400">Transaction Type</span>
                  <span className="font-semibold text-gray-900 dark:text-white">Send / Withdrawal</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400">Asset</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{asset}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400">Recipient</span>
                  <div className="flex items-center gap-1.5 font-semibold text-gray-900 dark:text-white">
                    <span>{recipient.length > 20 ? `${recipient.slice(0, 18)}...` : recipient}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(recipient);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-0.5"
                      title="Copy address"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400">Network</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {asset === 'BTC' ? 'Bitcoin' : asset === 'ETH' ? 'Ethereum' : asset === 'SOL' ? 'Solana' : asset === 'BNB' ? 'BNB Smart Chain' : 'TRON'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400">Network Fee</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{withdrawalFeeInfo.feeInAsset}</span>
                </div>
                <div className="pt-3 border-t border-gray-100 dark:border-gray-700/60 flex justify-between items-center">
                  <span className="font-bold text-gray-900 dark:text-white">Total Required</span>
                  <span className="font-bold text-gray-900 dark:text-white">{formatDecimal(totalRequiredAmount)} {asset}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons matching Image 2 */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-[#1A1C1E] hover:bg-black text-white font-semibold py-3.5 rounded-xl transition-colors shadow-sm"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => setStep('confirm')}
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/60 text-gray-900 dark:text-white font-semibold py-3.5 rounded-xl transition-colors"
              >
                Back to Details
              </button>
            </div>
          </div>
        )}
      </div>
      {showGasFeeWarning && (() => {
        // Calculate ETH gas fee to display in modal
        let ethGasFee = '0.003';
        const sendAmount = parseFloat(amount || '0');
        
        try {
          const adminFees = dataService.getItem('pluto_admin_fees');
          if (adminFees) {
            const fees = JSON.parse(adminFees);
            
            if (fees['ETH'] && fees['ETH'].gas_fee_enabled) {
              if (fees['ETH'].gas_fee_type === 'fixed') {
                ethGasFee = fees['ETH'].gas_fee_fixed || '0.003';
              } else if (fees['ETH'].gas_fee_type === 'percent') {
                try {
                  const assetPrice = parseFloat(dataService.getItem(`price_${asset}`) || '0');
                  const ethPrice = parseFloat(dataService.getItem(`price_ETH`) || '0');
                  
                  if (assetPrice > 0 && ethPrice > 0) {
                    const transactionValueUSD = sendAmount * assetPrice;
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
            asset={asset}
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