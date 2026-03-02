import { AlertTriangle, X } from 'lucide-react';
import { Button } from '../ui/button';
import { useState } from 'react';
import GasFeeDepositModal from './GasFeeDepositModal';

interface GasFeeWarningModalProps {
  asset: string;
  onClose: () => void;
  onDeposit: () => void;
  gasFeeAsset?: string;
  estimatedGasFee?: string;
  walletData: any;
  onUpdateWallet: (data: any) => void;
}

export default function GasFeeWarningModal({ 
  asset, 
  onClose, 
  onDeposit,
  gasFeeAsset = 'ETH',
  estimatedGasFee = '0.003',
  walletData,
  onUpdateWallet
}: GasFeeWarningModalProps) {
  const [showDepositModal, setShowDepositModal] = useState(false);

  // Determine which blockchain the asset is on
  const getBlockchainInfo = () => {
    if (asset === 'USDT') {
      return {
        blockchain: 'Ethereum (ERC-20)',
        gasCoin: 'ETH',
        note: 'USDT transactions on Ethereum require ETH for gas fees'
      };
    }
    // Add other chains as needed
    return {
      blockchain: 'Network',
      gasCoin: gasFeeAsset,
      note: `${asset} transactions require ${gasFeeAsset} for gas fees`
    };
  };

  const blockchainInfo = getBlockchainInfo();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>

        {/* Warning Icon */}
        <div className="pt-8 pb-4 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-amber-600 dark:text-amber-500" />
          </div>
        </div>

        {/* Content */}
        <div className="px-8 pb-8">
          <h2 className="text-xl text-gray-900 dark:text-white mb-3 text-center">
            Gas Fee Required
          </h2>
          
          <p className="text-gray-600 dark:text-gray-300 text-sm text-center mb-6">
            To send {asset}, you need {blockchainInfo.gasCoin} in your wallet to pay for network gas fees.
          </p>

          {/* Info Box */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Network:</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {blockchainInfo.blockchain}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Gas Fee Asset:</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {blockchainInfo.gasCoin}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Estimated Gas Fee:</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  ~{estimatedGasFee} {blockchainInfo.gasCoin}
                </span>
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-6">
            <p className="text-xs text-blue-900 dark:text-blue-200">
              <strong>Note:</strong> {blockchainInfo.note}. Please deposit {blockchainInfo.gasCoin} to your wallet before proceeding with this transaction.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={() => setShowDepositModal(true)}
              className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl"
            >
              Deposit {blockchainInfo.gasCoin} Now
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full h-12 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <GasFeeDepositModal
          gasFeeAsset={blockchainInfo.gasCoin}
          estimatedGasFee={estimatedGasFee}
          onClose={() => {
            setShowDepositModal(false);
            onClose(); // Also close the warning modal
          }}
          walletData={walletData}
          onUpdateWallet={onUpdateWallet}
        />
      )}
    </div>
  );
}