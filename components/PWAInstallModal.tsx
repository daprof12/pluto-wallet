import { X, Share, Plus, MoreVertical, Chrome, Download } from 'lucide-react';
import { Button } from './ui/button';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS: boolean;
}

export default function PWAInstallModal({ isOpen, onClose, isIOS }: PWAInstallModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Download className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl text-gray-900 dark:text-white mb-2">
            Install Pluto Wallet
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Add to your home screen for quick access
          </p>
        </div>

        {/* iOS Instructions */}
        {isIOS && (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="text-sm text-blue-900 dark:text-blue-300 mb-3">
                For iPhone/iPad users:
              </h3>
              <ol className="space-y-3 text-sm text-blue-800 dark:text-blue-200">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">
                    1
                  </span>
                  <span>
                    Tap the <Share className="inline w-4 h-4 mx-1" /> Share button in Safari
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">
                    2
                  </span>
                  <span>
                    Scroll down and tap "Add to Home Screen" <Plus className="inline w-4 h-4 mx-1" />
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">
                    3
                  </span>
                  <span>Tap "Add" in the top right corner</span>
                </li>
              </ol>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Note: This feature only works in Safari browser on iOS
            </p>
          </div>
        )}

        {/* Android/Desktop Instructions */}
        {!isIOS && (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h3 className="text-sm text-green-900 dark:text-green-300 mb-3">
                Installation Instructions:
              </h3>
              <ol className="space-y-3 text-sm text-green-800 dark:text-green-200">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs">
                    1
                  </span>
                  <span>
                    Click the <MoreVertical className="inline w-4 h-4 mx-1" /> menu or <Chrome className="inline w-4 h-4 mx-1" /> install icon in your browser
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs">
                    2
                  </span>
                  <span>Select "Install Pluto Wallet" or "Add to Home Screen"</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs">
                    3
                  </span>
                  <span>Confirm the installation when prompted</span>
                </li>
              </ol>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Supported on Chrome, Edge, and other modern browsers
            </p>
          </div>
        )}

        {/* Close Button */}
        <div className="mt-6">
          <Button onClick={onClose} className="w-full" size="lg">
            Got it!
          </Button>
        </div>
      </div>
    </div>
  );
}