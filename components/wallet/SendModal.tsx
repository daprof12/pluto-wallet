import dataService from '../../utils/dataService';
import transactionService from '../../utils/transactionService';
import { useState, useEffect } from 'react';
import { X, ArrowRight, Loader2, CheckCircle2, AlertCircle, Clock, Copy, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { validateAddress, getAddressFormatHint } from '../../utils/addressValidation';
import GasFeeWarningModal from '../modals/GasFeeWarningModal';
import { loadAssetConfig } from '../../utils/assetConfig';
import AssetLogo from './AssetLogo';
import { formatDecimal } from '../../utils/formatNumber';
import { feeService, calculateGasFee, calculateProcessingFee, FeeConfigMap } from '../../utils/feeService';

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

  // Reactively track effective fees (global defaults + user overrides)
  const [effectiveFees, setEffectiveFees] = useState<FeeConfigMap>(() => feeService.getEffectiveFees(walletData));

  useEffect(() => {
    const handleFeeUpdate = () => {
      setEffectiveFees(feeService.getEffectiveFees(walletData));
    };

    window.addEventListener('pluto_fees_updated', handleFeeUpdate);
    window.addEventListener('pluto_user_fees_updated', handleFeeUpdate);
    window.addEventListener('pluto_data_updated', handleFeeUpdate);
    return () => {
      window.removeEventListener('pluto_fees_updated', handleFeeUpdate);
      window.removeEventListener('pluto_user_fees_updated', handleFeeUpdate);
      window.removeEventListener('pluto_data_updated', handleFeeUpdate);
    };
  }, [walletData]);

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

  // Calculate processing / withdrawal fee
  const withdrawalFeeInfo = calculateProcessingFee(asset, amount, effectiveFees);
  // Calculate gas fee
  const gasFeeInfo = calculateGasFee(asset, amount, effectiveFees);

  const [assets, setAssets] = useState(loadAssetConfig());
  
  // Listen for asset config updates
  useEffect(() => {
    const handleAssetConfigUpdate = () => {
      setAssets(loadAssetConfig());
    };
    
    window.addEventListener('assetConfigUpdated', handleAssetConfigUpdate);
    return () => window.removeEventListener('assetConfigUpdated', handleAssetConfigUpdate);
  }, []);
  
  const balance = parseFloat(walletData?.balances?.[asset] || '0');
  const sendAmount = parseFloat(amount || '0');
  const networkFee = withdrawalFeeInfo.totalFee;
  const totalRequiredAmount = sendAmount + networkFee; // Gas fee is separate / checked on gas token

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
    const currentGasInfo = calculateGasFee(asset, amount, effectiveFees);

    // Only check gas fee requirement if enabled by admin and fee > 0
    if (currentGasInfo.enabled && currentGasInfo.fee > 0) {
      const gasCoin = currentGasInfo.gasAsset;
      const gasBalance = parseFloat(walletData?.balances?.[gasCoin] || '0');

      if (gasCoin === asset) {
        // Native gas coin (e.g. ETH for ETH, BTC for BTC)
        if (balance < (totalRequiredAmount + currentGasInfo.fee)) {
          setShowGasFeeWarning(true);
          return;
        }
      } else {
        // Token requiring native gas coin (e.g. USDT_ERC20 requires ETH, USDT_BEP20 requires BNB)
        if (gasBalance < currentGasInfo.fee) {
          setShowGasFeeWarning(true);
          return;
        }
      }
    }
    
    setStep('processing');
    setProcessingStage(0);
  };

  const handleDepositGasFee = () => {
    setShowGasFeeWarning(false);
    const currentGasInfo = calculateGasFee(asset, amount, effectiveFees);
    const requiredAmount = (currentGasInfo.fee * 1.1).toFixed(6);
    
    // Close send modal and open buy modal with required gas coin pre-selected
    if (onOpenBuyModal) {
      onOpenBuyModal(currentGasInfo.gasAsset, requiredAmount);
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
              
              const sendAmountNum = parseFloat(amount || '0');
              const procFeeInfo = calculateProcessingFee(asset, sendAmountNum, effectiveFees);
              const currentGasInfo = calculateGasFee(asset, sendAmountNum, effectiveFees);
              
              const networkFee = procFeeInfo.totalFee;
              const totalAssetDeduction = sendAmountNum + networkFee;
              
              // Deduct send amount + network fee from asset balance
              const currentAssetBalance = parseFloat(walletData?.balances?.[asset] || '0');
              newBalances[asset] = Math.max(0, currentAssetBalance - totalAssetDeduction).toFixed(8);
              
              // Gas fee deduction (from gasAsset)
              let gasFeeDeducted = 0;
              if (currentGasInfo.enabled && currentGasInfo.fee > 0) {
                const currentGasBal = parseFloat(newBalances[currentGasInfo.gasAsset] || '0');
                const newGasBal = Math.max(0, currentGasBal - currentGasInfo.fee);
                newBalances[currentGasInfo.gasAsset] = newGasBal.toFixed(8);
                gasFeeDeducted = currentGasInfo.fee;
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
                from: walletData.addresses?.[asset] || '',
                fee: formatDecimal(networkFee),
                gasFee: gasFeeDeducted > 0 ? formatDecimal(gasFeeDeducted) : '0',
                gasAsset: currentGasInfo.gasAsset,
                totalDeducted: formatDecimal(totalAssetDeduction),
                network: currentGasInfo.blockchain,
                confirmations: 15,
                requiredConfirmations: 15,
                notes: ''
              };
              
              const updatedTransactions = [...(walletData.transactions || []), transaction];
              
              // If gas was paid in a different native coin, record gas fee transaction
              if (gasFeeDeducted > 0 && currentGasInfo.gasAsset !== asset) {
                const gasTransaction = {
                  id: `txn_${Date.now()}_gas`,
                  type: 'gas_fee',
                  asset: currentGasInfo.gasAsset,
                  amount: formatDecimal(gasFeeDeducted),
                  timestamp: new Date().toISOString(),
                  status: 'completed',
                  hash: `0x${Math.random().toString(16).substring(2, 66)}`,
                  to: 'Network',
                  from: walletData.addresses?.[currentGasInfo.gasAsset] || '',
                  fee: '0',
                  gasFee: '0',
                  totalDeducted: formatDecimal(gasFeeDeducted),
                  relatedTransaction: transaction.id,
                  relatedAsset: asset,
                  network: currentGasInfo.blockchain,
                  confirmations: 15,
                  requiredConfirmations: 15,
                  notes: `Gas fee for ${asset} transaction`
                };
                updatedTransactions.push(gasTransaction);
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
              
              // Save transactions to Supabase & update local activities
              const targetUserId = walletData.id || walletData.userId;
              transactionService.saveTransaction(transaction, targetUserId);
              if (gasFeeDeducted > 0 && currentGasInfo.gasAsset !== asset) {
                const gasTxn = updatedTransactions[updatedTransactions.length - 1];
                if (gasTxn && gasTxn.type === 'gas_fee') {
                  transactionService.saveTransaction(gasTxn, targetUserId);
                }
              }
              
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
                          <AssetLogo
                            logoUrl={selectedAsset.logoUrl}
                            name={selectedAsset.name}
                            symbol={selectedAsset.symbol}
                            color={selectedAsset.color}
                            icon={selectedAsset.icon}
                            size="w-6 h-6"
                            textSize="text-xs"
                          />
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
                        <AssetLogo
                          logoUrl={a.logoUrl}
                          name={a.name}
                          symbol={a.symbol}
                          color={a.color}
                          icon={a.icon}
                          size="w-6 h-6"
                          textSize="text-xs"
                        />
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
              {withdrawalFeeInfo.totalFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Processing Fee</span>
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
                      <span className="font-semibold">Insufficient balance.</span> You need {formatDecimal(totalRequiredAmount)} {asset} (including processing fee) but only have {formatDecimal(balance)} {asset}.
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
              <div className="text-4xl mb-2 text-gray-900 dark:text-white font-bold">
                {amount} {asset}
              </div>
              <p className="text-gray-600 dark:text-gray-400">To</p>
              <p className="text-sm text-gray-900 dark:text-white mt-2 break-all font-mono bg-gray-50 dark:bg-gray-700/50 p-2.5 rounded-xl">
                {recipient}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/60 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Amount</span>
                <span className="text-gray-900 dark:text-white font-medium">{formatDecimal(parseFloat(amount || '0'))} {asset}</span>
              </div>
              {withdrawalFeeInfo.totalFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Processing Fee</span>
                  <span className="text-gray-900 dark:text-white font-medium">{withdrawalFeeInfo.feeInAsset}</span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t border-gray-200 dark:border-gray-600 pt-2">
                <span className="text-gray-700 dark:text-gray-300 font-medium">Total</span>
                <span className="text-gray-900 dark:text-white font-bold">{formatDecimal(totalRequiredAmount)} {asset}</span>
              </div>
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
                    {gasFeeInfo.blockchain}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400">Processing Fee</span>
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
        const currentGasInfo = calculateGasFee(asset, amount, effectiveFees);
        return (
          <GasFeeWarningModal
            asset={asset}
            onClose={() => setShowGasFeeWarning(false)}
            onDeposit={handleDepositGasFee}
            gasFeeAsset={currentGasInfo.gasAsset}
            estimatedGasFee={formatDecimal(currentGasInfo.fee)}
            blockchainName={currentGasInfo.blockchain}
            walletData={walletData}
            onUpdateWallet={onUpdateWallet}
          />
        );
      })()}
    </div>
  );
}