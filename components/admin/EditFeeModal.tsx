import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { loadAssetConfig } from '../../utils/assetConfig';

interface EditFeeModalProps {
  asset: string;
  assetName: string;
  assetIcon: string;
  assetColor: string;
  feeData: {
    deposit_address: string;
    withdraw_fee: string;
    percent: string;
    deposit_enabled: boolean;
    gas_fee_enabled?: boolean;
    gas_fee_type?: 'fixed' | 'percent';
    gas_fee_fixed?: string;
    gas_fee_percent?: string;
  };
  onSave: (updatedFee: any) => void;
  onClose: () => void;
  targetUser?: {
    id: string;
    fullName?: string;
    email: string;
  } | null;
}

export default function EditFeeModal({
  asset,
  assetName,
  assetIcon,
  assetColor,
  feeData,
  onSave,
  onClose,
  targetUser
}: EditFeeModalProps) {
  const assetConfig = loadAssetConfig();
  const assetInfo = assetConfig.find(a => a.symbol === asset);
  
  const initialFeeType: 'fixed' | 'percentage' | 'both' = (() => {
    const hasFixed = parseFloat(feeData.withdraw_fee || '0') > 0;
    const hasPercent = parseFloat(feeData.percent || '0') > 0;
    if (hasFixed && hasPercent) return 'both';
    if (hasPercent) return 'percentage';
    return 'fixed';
  })();

  const [formData, setFormData] = useState({
    deposit_address: feeData.deposit_address,
    withdraw_fee: feeData.withdraw_fee,
    percent: feeData.percent,
    deposit_enabled: feeData.deposit_enabled,
    fee_type: initialFeeType,
    gas_fee_enabled: feeData.gas_fee_enabled ?? true,
    gas_fee_type: (feeData.gas_fee_type || 'fixed') as 'fixed' | 'percent',
    gas_fee_fixed: feeData.gas_fee_fixed || '0',
    gas_fee_percent: feeData.gas_fee_percent || '0'
  });

  const [errors, setErrors] = useState({
    deposit_address: '',
    withdraw_fee: '',
    percent: '',
    gas_fee_fixed: '',
    gas_fee_percent: ''
  });

  const validateAddress = (address: string, asset: string): boolean => {
    if (!address || address.trim() === '') {
      return false;
    }

    // Basic validation patterns for different chains
    const patterns: { [key: string]: RegExp } = {
      BTC: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/,
      ETH: /^0x[a-fA-F0-9]{40}$/,
      SOL: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
      BNB: /^bnb[0-9a-z]{39}$/,
      USDT: /^T[A-Za-z1-9]{33}$/ // TRON address
    };

    const pattern = patterns[asset];
    return pattern ? pattern.test(address) : true;
  };

  const handleSave = () => {
    // Validate form
    const newErrors = {
      deposit_address: '',
      withdraw_fee: '',
      percent: '',
      gas_fee_fixed: '',
      gas_fee_percent: ''
    };

    let hasErrors = false;

    // Validate deposit address
    if (!validateAddress(formData.deposit_address, asset)) {
      newErrors.deposit_address = `Invalid ${asset} address format`;
      hasErrors = true;
    }

    // Validate withdrawal fee
    if (formData.fee_type === 'fixed' || formData.fee_type === 'both') {
      const fee = parseFloat(formData.withdraw_fee);
      if (isNaN(fee) || fee < 0) {
        newErrors.withdraw_fee = 'Invalid fee amount';
        hasErrors = true;
      }
    }

    // Validate percentage
    if (formData.fee_type === 'percentage' || formData.fee_type === 'both') {
      const percent = parseFloat(formData.percent);
      if (isNaN(percent) || percent < 0 || percent > 100) {
        newErrors.percent = 'Percentage must be between 0 and 100';
        hasErrors = true;
      }
    }

    // Validate gas fees if enabled
    if (formData.gas_fee_enabled) {
      if (formData.gas_fee_type === 'fixed') {
        const gasFee = parseFloat(formData.gas_fee_fixed);
        if (isNaN(gasFee) || gasFee < 0) {
          newErrors.gas_fee_fixed = 'Invalid gas fee amount';
          hasErrors = true;
        }
      } else {
        const gasPercent = parseFloat(formData.gas_fee_percent);
        if (isNaN(gasPercent) || gasPercent < 0 || gasPercent > 100) {
          newErrors.gas_fee_percent = 'Percentage must be between 0 and 100';
          hasErrors = true;
        }
      }
    }

    if (hasErrors) {
      setErrors(newErrors);
      return;
    }

    const finalWithdrawFee = formData.fee_type === 'percentage' ? '0' : (formData.withdraw_fee || '0');
    const finalPercent = formData.fee_type === 'fixed' ? '0' : (formData.percent || '0');
    const finalGasFixed = !formData.gas_fee_enabled || formData.gas_fee_type === 'percent' ? '0' : (formData.gas_fee_fixed || '0');
    const finalGasPercent = !formData.gas_fee_enabled || formData.gas_fee_type === 'fixed' ? '0' : (formData.gas_fee_percent || '0');

    // Save the updated fee
    onSave({
      deposit_address: formData.deposit_address,
      withdraw_fee: finalWithdrawFee,
      percent: finalPercent,
      deposit_enabled: formData.deposit_enabled,
      gas_fee_enabled: formData.gas_fee_enabled,
      gas_fee_type: formData.gas_fee_type,
      gas_fee_fixed: finalGasFixed,
      gas_fee_percent: finalGasPercent
    });
    
    // Close the modal after saving
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {assetInfo?.logoUrl ? (
                <img src={assetInfo.logoUrl} alt={assetInfo.name} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className={`w-12 h-12 rounded-full ${assetColor} flex items-center justify-center text-white text-xl`}>
                  {assetIcon}
                </div>
              )}
              <div>
                <h2 className="text-xl text-gray-900 dark:text-white">Edit Fee Settings</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{assetName} ({asset})</p>
                  {targetUser ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                      User: {targetUser.fullName || targetUser.email}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                      Global Platform Default
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-6">
          {/* Deposit Address */}
          <div>
            <Label htmlFor="deposit_address" className="text-gray-900 dark:text-white mb-2">
              Deposit Address *
            </Label>
            <Input
              id="deposit_address"
              value={formData.deposit_address}
              onChange={(e) => {
                setFormData({ ...formData, deposit_address: e.target.value });
                setErrors({ ...errors, deposit_address: '' });
              }}
              placeholder={`Enter ${asset} deposit address`}
              className={`font-mono ${errors.deposit_address ? 'border-red-500' : ''}`}
            />
            {errors.deposit_address && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.deposit_address}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              This is the address where users will send {asset} to deposit funds into their wallet.
            </p>
          </div>

          {/* Deposit Enabled Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
            <div>
              <Label htmlFor="deposit_enabled" className="text-gray-900 dark:text-white mb-1">
                Enable Deposits
              </Label>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Allow users to deposit {asset} to this address
              </p>
            </div>
            <Switch
              id="deposit_enabled"
              checked={formData.deposit_enabled}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, deposit_enabled: checked })
              }
            />
          </div>

          {/* Withdrawal Fee Type Selection */}
          <div>
            <Label className="text-gray-900 dark:text-white mb-3">Withdrawal Fee Structure</Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setFormData({ ...formData, fee_type: 'fixed' })}
                className={`p-4 rounded-xl border-2 transition-all ${
                  formData.fee_type === 'fixed'
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <p className="text-sm text-gray-900 dark:text-white font-medium">Fixed Fee</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Flat amount</p>
              </button>
              <button
                onClick={() => setFormData({ ...formData, fee_type: 'percentage' })}
                className={`p-4 rounded-xl border-2 transition-all ${
                  formData.fee_type === 'percentage'
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <p className="text-sm text-gray-900 dark:text-white font-medium">Percentage</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">% of amount</p>
              </button>
              <button
                onClick={() => setFormData({ ...formData, fee_type: 'both' })}
                className={`p-4 rounded-xl border-2 transition-all ${
                  formData.fee_type === 'both'
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <p className="text-sm text-gray-900 dark:text-white font-medium">Both</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Fixed + %</p>
              </button>
            </div>
          </div>

          {/* Fixed Fee Input */}
          {(formData.fee_type === 'fixed' || formData.fee_type === 'both') && (
            <div>
              <Label htmlFor="withdraw_fee" className="text-gray-900 dark:text-white mb-2">
                Fixed Withdrawal Fee
              </Label>
              <div className="relative">
                <Input
                  id="withdraw_fee"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={formData.withdraw_fee}
                  onChange={(e) => {
                    setFormData({ ...formData, withdraw_fee: e.target.value });
                    setErrors({ ...errors, withdraw_fee: '' });
                  }}
                  placeholder="0.0000"
                  className={errors.withdraw_fee ? 'border-red-500' : ''}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  {asset}
                </span>
              </div>
              {errors.withdraw_fee && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.withdraw_fee}
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Fixed amount charged per withdrawal transaction
              </p>
            </div>
          )}

          {/* Percentage Fee Input */}
          {(formData.fee_type === 'percentage' || formData.fee_type === 'both') && (
            <div>
              <Label htmlFor="percent" className="text-gray-900 dark:text-white mb-2">
                Percentage Withdrawal Fee
              </Label>
              <div className="relative">
                <Input
                  id="percent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.percent}
                  onChange={(e) => {
                    setFormData({ ...formData, percent: e.target.value });
                    setErrors({ ...errors, percent: '' });
                  }}
                  placeholder="0.00"
                  className={errors.percent ? 'border-red-500' : ''}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  %
                </span>
              </div>
              {errors.percent && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.percent}
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Percentage of withdrawal amount charged as fee
              </p>
            </div>
          )}

          {/* Fee Example Calculation */}
          {(formData.fee_type === 'fixed' || formData.fee_type === 'percentage' || formData.fee_type === 'both') && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <p className="text-sm text-blue-900 dark:text-blue-200 font-medium mb-2">
                Fee Calculation Example
              </p>
              <div className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                <p>If a user withdraws 1 {asset}:</p>
                {formData.fee_type === 'fixed' && (
                  <p className="font-medium">• Fee: {formData.withdraw_fee || '0'} {asset}</p>
                )}
                {formData.fee_type === 'percentage' && (
                  <p className="font-medium">• Fee: {((1 * parseFloat(formData.percent || '0')) / 100).toFixed(6)} {asset} ({formData.percent}%)</p>
                )}
                {formData.fee_type === 'both' && (
                  <>
                    <p className="font-medium">• Fixed: {formData.withdraw_fee || '0'} {asset}</p>
                    <p className="font-medium">• Percentage: {((1 * parseFloat(formData.percent || '0')) / 100).toFixed(6)} {asset} ({formData.percent}%)</p>
                    <p className="font-medium border-t border-blue-300 dark:border-blue-700 pt-1 mt-1">
                      • Total Fee: {(parseFloat(formData.withdraw_fee || '0') + (1 * parseFloat(formData.percent || '0')) / 100).toFixed(6)} {asset}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Gas Fee Settings */}
          <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Label className="text-gray-900 dark:text-white mb-1">Estimated Gas Fees</Label>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Configure gas fee estimates for {asset} transactions
                </p>
              </div>
              <Switch
                checked={formData.gas_fee_enabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, gas_fee_enabled: checked })
                }
              />
            </div>

            {formData.gas_fee_enabled && (
              <>
                {/* Gas Fee Type Selection */}
                <div className="mb-4">
                  <Label className="text-gray-900 dark:text-white mb-3">Gas Fee Type</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setFormData({ ...formData, gas_fee_type: 'fixed' })}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formData.gas_fee_type === 'fixed'
                          ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <p className="text-sm text-gray-900 dark:text-white font-medium">Fixed Amount</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Flat gas fee</p>
                    </button>
                    <button
                      onClick={() => setFormData({ ...formData, gas_fee_type: 'percent' })}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formData.gas_fee_type === 'percent'
                          ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <p className="text-sm text-gray-900 dark:text-white font-medium">Percentage</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">% of amount</p>
                    </button>
                  </div>
                </div>

                {/* Fixed Gas Fee Input */}
                {formData.gas_fee_type === 'fixed' && (
                  <div>
                    <Label htmlFor="gas_fee_fixed" className="text-gray-900 dark:text-white mb-2">
                      Fixed Gas Fee Amount
                    </Label>
                    <div className="relative">
                      <Input
                        id="gas_fee_fixed"
                        type="number"
                        step="0.000001"
                        min="0"
                        value={formData.gas_fee_fixed}
                        onChange={(e) => {
                          setFormData({ ...formData, gas_fee_fixed: e.target.value });
                          setErrors({ ...errors, gas_fee_fixed: '' });
                        }}
                        placeholder="0.000000"
                        className={errors.gas_fee_fixed ? 'border-red-500' : ''}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                        {asset}
                      </span>
                    </div>
                    {errors.gas_fee_fixed && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.gas_fee_fixed}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Fixed gas fee amount estimated for transactions
                    </p>
                  </div>
                )}

                {/* Percentage Gas Fee Input */}
                {formData.gas_fee_type === 'percent' && (
                  <div>
                    <Label htmlFor="gas_fee_percent" className="text-gray-900 dark:text-white mb-2">
                      Percentage Gas Fee
                    </Label>
                    <div className="relative">
                      <Input
                        id="gas_fee_percent"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.gas_fee_percent}
                        onChange={(e) => {
                          setFormData({ ...formData, gas_fee_percent: e.target.value });
                          setErrors({ ...errors, gas_fee_percent: '' });
                        }}
                        placeholder="0.00"
                        className={errors.gas_fee_percent ? 'border-red-500' : ''}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                        %
                      </span>
                    </div>
                    {errors.gas_fee_percent && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.gas_fee_percent}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Percentage of transaction amount estimated for gas fees
                    </p>
                  </div>
                )}

                {/* Gas Fee Example */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mt-4">
                  <p className="text-sm text-green-900 dark:text-green-200 font-medium mb-2">
                    Gas Fee Example
                  </p>
                  <div className="text-xs text-green-800 dark:text-green-300 space-y-1">
                    <p>For a 1 {asset} transaction:</p>
                    {formData.gas_fee_type === 'fixed' && (
                      <p className="font-medium">• Estimated Gas Fee: {formData.gas_fee_fixed || '0'} {asset}</p>
                    )}
                    {formData.gas_fee_type === 'percent' && (
                      <p className="font-medium">• Estimated Gas Fee: {((1 * parseFloat(formData.gas_fee_percent || '0')) / 100).toFixed(6)} {asset} ({formData.gas_fee_percent}%)</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
            <p className="text-sm text-yellow-900 dark:text-yellow-200">
              <strong>⚠️ Important:</strong> Changes to fee settings and deposit addresses will take effect immediately for all users. All modifications will be logged in the audit trail. Ensure deposit addresses are correct before enabling deposits.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6 rounded-b-3xl">
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 h-12"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}