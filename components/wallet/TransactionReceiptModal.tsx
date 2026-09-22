import { Copy, ExternalLink, CheckCircle, XCircle, Clock, Edit, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { copyToClipboard } from '../../utils/clipboard';
import { formatDecimal } from '../../utils/formatNumber';

interface Transaction {
  id: string;
  type: string;
  asset: string;
  amount: string;
  status: string;
  timestamp: string;
  hash: string;
  network: string;
  fee: string;
  from?: string;
  to?: string;
  toAmount?: string;
  toAsset?: string;
  fiatAmount?: string;
  paymentMethod?: string;
  confirmations?: number;
  requiredConfirmations?: number;
  totalDeducted?: string; // Total amount deducted (amount + fees)
  ethGasFee?: string; // ETH gas fee if applicable
  gasFee?: string; // Asset-specific gas fee
  relatedTransaction?: string; // For gas_fee transactions
  relatedAsset?: string; // Which asset caused this gas fee
  notes?: string; // Additional notes
}

interface TransactionReceiptModalProps {
  transaction: Transaction;
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transactionId: string) => void;
}

const getStatusColor = (status: string) => {
  switch(status) {
    case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'processing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
  }
};

const getTransactionTypeLabel = (type: string) => {
  const clean = (type || '').toLowerCase().replace(/^admin_/, '');
  switch (clean) {
    case 'credit':
      return 'Credit';
    case 'debit':
      return 'Debit';
    case 'gas_fee':
      return 'Gas Fee';
    default:
      return clean.charAt(0).toUpperCase() + clean.slice(1);
  }
};

export default function TransactionReceiptModal({ 
  transaction, 
  isOpen, 
  onClose, 
  isAdmin = false,
  onEdit,
  onDelete
}: TransactionReceiptModalProps) {
  if (!isOpen) return null;

  const handleCopy = async (text: string, label: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      alert(`${label} copied!`);
    }
  };

  const handleViewOnExplorer = () => {
    const explorerUrls: any = {
      'Ethereum Mainnet': 'https://etherscan.io/tx/',
      'Bitcoin Mainnet': 'https://blockchain.com/btc/tx/',
      'Solana Mainnet': 'https://explorer.solana.com/tx/',
      'BNB Smart Chain': 'https://bscscan.com/tx/',
      'TRON (TRC20)': 'https://tronscan.org/#/transaction/'
    };
    const baseUrl = explorerUrls[transaction.network] || 'https://etherscan.io/tx/';
    window.open(`${baseUrl}${transaction.hash}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto my-8 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl text-gray-900 dark:text-white">Transaction Receipt</h2>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <button 
                  onClick={() => onEdit && onEdit(transaction)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-blue-600 dark:text-blue-400"
                  title="Edit Transaction"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => onDelete && onDelete(transaction.id)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-red-600 dark:text-red-400"
                  title="Delete Transaction"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <span className="text-gray-500 text-xl">×</span>
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Status Banner */}
          <div className={`p-4 rounded-xl border-2 ${
            transaction.status === 'completed' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
            transaction.status === 'pending' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
            transaction.status === 'processing' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' :
            'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {transaction.status === 'pending' || transaction.status === 'processing' ? (
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div className="absolute inset-0 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                  </div>
                ) : transaction.status === 'completed' ? (
                  <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-white" />
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Transaction Status</p>
                  <p className="text-xl text-gray-900 dark:text-white capitalize">{transaction.status}</p>
                </div>
              </div>
              <Badge className={getStatusColor(transaction.status)}>
                {transaction.status}
              </Badge>
            </div>

            {transaction.status === 'pending' && (
              <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                ⏱️ Your transaction is being broadcast to the network. This usually takes a few minutes.
              </div>
            )}
            {transaction.status === 'processing' && (
              <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                ⚡ Your transaction is being confirmed. Please wait for network confirmations.
              </div>
            )}
            {transaction.status === 'completed' && (
              <div className="mt-3 text-sm text-green-700 dark:text-green-300">
                ✅ Transaction completed successfully!
              </div>
            )}
          </div>

          {/* Transaction Details */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Transaction Type</p>
                <p className="text-sm text-gray-900 dark:text-white">{getTransactionTypeLabel(transaction.type)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Asset</p>
                <p className="text-sm text-gray-900 dark:text-white">{transaction.asset}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Amount</p>
                <p className="text-sm text-gray-900 dark:text-white">{formatDecimal(parseFloat(transaction.amount))} {transaction.asset}</p>
              </div>
              {transaction.type === 'swap' && transaction.toAmount && transaction.toAsset && (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Received</p>
                  <p className="text-sm text-gray-900 dark:text-white">{formatDecimal(parseFloat(transaction.toAmount))} {transaction.toAsset}</p>
                </div>
              )}
              {transaction.type === 'buy' && transaction.fiatAmount && (
                <>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Fiat Amount</p>
                    <p className="text-sm text-gray-900 dark:text-white">{transaction.fiatAmount}</p>
                  </div>
                  {transaction.paymentMethod && (
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Payment Method</p>
                      <p className="text-sm text-gray-900 dark:text-white">{transaction.paymentMethod}</p>
                    </div>
                  )}
                </>
              )}
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Network Fee</p>
                <p className="text-sm text-gray-900 dark:text-white">{formatDecimal(parseFloat(transaction.fee))} {transaction.asset}</p>
              </div>
              {transaction.gasFee && parseFloat(transaction.gasFee) > 0 && (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Gas Fee ({transaction.asset})</p>
                  <p className="text-sm text-gray-900 dark:text-white">{formatDecimal(parseFloat(transaction.gasFee))} {transaction.asset}</p>
                </div>
              )}
              {transaction.ethGasFee && parseFloat(transaction.ethGasFee) > 0 && (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">ETH Gas Fee</p>
                  <p className="text-sm text-gray-900 dark:text-white">{formatDecimal(parseFloat(transaction.ethGasFee))} ETH</p>
                </div>
              )}
              {transaction.totalDeducted && transaction.type !== 'receive' && transaction.type !== 'buy' && (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Deducted</p>
                  <p className="text-sm text-gray-900 dark:text-white font-semibold">{formatDecimal(parseFloat(transaction.totalDeducted))} {transaction.asset}</p>
                </div>
              )}
              {transaction.type === 'gas_fee' && transaction.relatedAsset && (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Related Asset</p>
                  <p className="text-sm text-gray-900 dark:text-white">{transaction.relatedAsset}</p>
                </div>
              )}
              {transaction.notes && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Notes</p>
                  <p className="text-sm text-gray-900 dark:text-white">{transaction.notes.replace(/Admin /gi, '')}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Network</p>
                <p className="text-sm text-gray-900 dark:text-white">{transaction.network}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Date & Time</p>
                <p className="text-sm text-gray-900 dark:text-white">{new Date(transaction.timestamp).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Transaction ID</p>
                <p className="text-sm text-gray-900 dark:text-white font-mono">{transaction.id}</p>
              </div>
            </div>

            {(transaction.confirmations !== undefined && transaction.requiredConfirmations !== undefined) && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Network Confirmations</p>
                  <p className="text-xs text-gray-900 dark:text-white">
                    {transaction.confirmations} / {transaction.requiredConfirmations}
                  </p>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((transaction.confirmations / transaction.requiredConfirmations) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {transaction.confirmations >= transaction.requiredConfirmations 
                    ? '✅ Fully confirmed' 
                    : `⏳ ${transaction.requiredConfirmations - transaction.confirmations} more confirmations needed`
                  }
                </p>
              </div>
            )}

            {transaction.from && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">From Address</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-900 dark:text-white font-mono break-all flex-1">{transaction.from}</p>
                  <button
                    onClick={() => handleCopy(transaction.from!, 'Address')}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg shrink-0"
                  >
                    <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>
            )}

            {transaction.to && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">To Address</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-900 dark:text-white font-mono break-all flex-1">{transaction.to}</p>
                  <button
                    onClick={() => handleCopy(transaction.to!, 'Address')}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg shrink-0"
                  >
                    <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Transaction Hash</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-900 dark:text-white font-mono break-all flex-1">{transaction.hash}</p>
                <button
                  onClick={() => handleCopy(transaction.hash, 'Transaction hash')}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg shrink-0"
                >
                  <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={handleViewOnExplorer}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View on Explorer
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={onClose}
            >
              Close
            </Button>
          </div>

          {/* Help Text */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              💡 <strong>Need help?</strong> If you have questions about this transaction, please contact our support team with the Transaction ID.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}