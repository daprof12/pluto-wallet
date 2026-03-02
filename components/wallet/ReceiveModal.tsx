import { useState, useEffect } from 'react';
import { X, Copy, Check, QrCode, Share2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import QRCode from 'react-qr-code';
import { copyToClipboard } from '../../utils/clipboard';
import { loadAssetConfig } from '../../utils/assetConfig';

interface ReceiveModalProps {
  walletData: any;
  onClose: () => void;
  selectedAsset?: string | null;
}

export default function ReceiveModal({ walletData, onClose, selectedAsset }: ReceiveModalProps) {
  const [asset, setAsset] = useState(selectedAsset || 'ETH');
  const [copied, setCopied] = useState(false);

  const [assets, setAssets] = useState(loadAssetConfig());
  
  // Listen for asset config updates
  useEffect(() => {
    const handleAssetConfigUpdate = () => {
      setAssets(loadAssetConfig());
    };
    
    window.addEventListener('assetConfigUpdated', handleAssetConfigUpdate);
    return () => window.removeEventListener('assetConfigUpdated', handleAssetConfigUpdate);
  }, []);

  const address = walletData.addresses[asset];

  const handleCopy = async () => {
    const success = await copyToClipboard(address);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    const shareText = `Send ${asset.replace('_TRC20', '')} to my Pluto Wallet:\n${address}`;
    
    // Check if Web Share API is available
    if (navigator.share) {
      try {
        await navigator.share({
          title: `My ${asset.replace('_TRC20', '')} Address`,
          text: shareText,
        });
      } catch (err) {
        // User cancelled or share failed
        console.log('Share cancelled or failed:', err);
      }
    } else {
      // Fallback: Copy to clipboard
      const success = await copyToClipboard(shareText);
      if (success) {
        alert('Address copied to clipboard! You can now paste it in your preferred social media.');
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 mx-auto">
      <div className="space-y-6">
          <div>
            <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">Select Asset</label>
            <Select value={asset} onValueChange={setAsset}>
              <SelectTrigger>
                <SelectValue>
                  {(() => {
                    const selectedAsset = assets.find(a => a.symbol === asset);
                    return selectedAsset ? (
                      <div className="flex items-center gap-3">
                        {selectedAsset.logoUrl ? (
                          <img src={selectedAsset.logoUrl} alt={selectedAsset.name} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className={`w-6 h-6 rounded-full ${selectedAsset.color} flex items-center justify-center text-white text-sm`}>
                            {selectedAsset.icon}
                          </div>
                        )}
                        <span>{selectedAsset.name} ({selectedAsset.symbol.replace('_TRC20', '')})</span>
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
                        <img src={a.logoUrl} alt={a.name} className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className={`w-6 h-6 rounded-full ${a.color} flex items-center justify-center text-white text-sm`}>
                          {a.icon}
                        </div>
                      )}
                      <span>{a.name} ({a.symbol.replace('_TRC20', '')})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* QR Code */}
          <div className="bg-white dark:bg-gray-100 p-6 md:p-8 rounded-xl border-2 border-gray-200 dark:border-gray-600">
            <div className="bg-white p-4 rounded-lg mx-auto max-w-[240px]">
              <QRCode
                value={address}
                size={256}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                viewBox={`0 0 256 256`}
                fgColor="#000000"
                bgColor="#ffffff"
              />
            </div>
            <p className="text-center mt-4 text-sm text-gray-600 dark:text-gray-400">
              Scan QR with camera<br />
              to send {asset.replace('_TRC20', '')} to your wallet.
            </p>
          </div>

          <div>
            <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">Your Address</label>
            <div className="flex gap-2">
              <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white break-all">
                {address}
              </div>
              <Button variant="outline" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Share Button */}
          <Button 
            onClick={handleShare}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Address & QR Code
          </Button>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> Only send {asset.replace('_TRC20', '')} to this address. 
              Sending other assets may result in permanent loss.
            </p>
          </div>

        </div>
    </div>
  );
}