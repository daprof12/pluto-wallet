import { useState, useRef, useEffect } from 'react';
import { X, Camera, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface QRScannerModalProps {
  walletData: any;
  onClose: () => void;
  onUpdateWallet: (data: any) => void;
}

export default function QRScannerModal({ walletData, onClose, onUpdateWallet }: QRScannerModalProps) {
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState<{ address: string; network: string } | null>(null);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('BTC');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Mock price data
  const prices = {
    BTC: 45230.50,
    ETH: 3420.75,
    SOL: 98.32,
    BNB: 315.60,
    USDT: 1.00
  };

  const networkMap: { [key: string]: string } = {
    'bitcoin': 'BTC',
    'btc': 'BTC',
    'ethereum': 'ETH',
    'eth': 'ETH',
    'solana': 'SOL',
    'sol': 'SOL',
    'bnb': 'BNB',
    'bsc': 'BNB',
    'binance': 'BNB',
    'tron': 'TRX',
    'trx': 'TRX'
  };

  const startCamera = async () => {
    setError('');
    setPermissionDenied(false);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraStream(stream);
        setScanning(true);
        
        // Start scanning for QR codes
        scanIntervalRef.current = setInterval(() => {
          scanQRCode();
        }, 500);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setPermissionDenied(true);
      setError('Camera access denied. Please enable camera permissions in your browser settings.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setScanning(false);
  };

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    // Use jsQR library to decode QR code
    try {
      // @ts-ignore - jsQR is loaded via CDN
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      
      if (code) {
        handleQRCodeDetected(code.data);
      }
    } catch (err) {
      // jsQR not available, use mock detection for demo
      // In production, this would use a proper QR code library
    }
  };

  const handleQRCodeDetected = (data: string) => {
    stopCamera();
    
    // Parse QR code data
    // Expected formats:
    // 1. bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
    // 2. ethereum:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
    // 3. Just an address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
    
    let address = '';
    let network = '';
    
    // Check if it's a URI format
    if (data.includes(':')) {
      const parts = data.split(':');
      const networkName = parts[0].toLowerCase();
      address = parts[1].split('?')[0]; // Remove any query parameters
      
      // Map network name to symbol
      network = networkMap[networkName] || 'ETH';
    } else {
      // Just an address, try to detect network from format
      address = data;
      
      // Simple heuristic detection
      if (address.startsWith('0x')) {
        network = 'ETH'; // Could be ETH, BNB, etc.
      } else if (address.startsWith('1') || address.startsWith('3') || address.startsWith('bc1')) {
        network = 'BTC';
      } else if (address.length >= 32 && address.length <= 44) {
        network = 'SOL';
      } else if (address.startsWith('T')) {
        network = 'TRX';
      } else {
        network = 'ETH'; // Default to ETH
      }
    }
    
    setScannedData({ address, network });
  };

  const handleSend = () => {
    if (!scannedData || !amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const balance = parseFloat(walletData.balances[scannedData.network] || '0');
    if (parseFloat(amount) > balance) {
      setError('Insufficient balance');
      return;
    }

    // Update wallet balance
    const newBalances = {
      ...walletData.balances,
      [scannedData.network]: (balance - parseFloat(amount)).toFixed(8)
    };

    onUpdateWallet({
      ...walletData,
      balances: newBalances
    });

    alert(`Successfully sent ${amount} ${scannedData.network} to ${scannedData.address.substring(0, 10)}...`);
    onClose();
  };

  const handleManualEntry = () => {
    setManualEntry(true);
  };

  const handleManualAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setManualAddress(e.target.value);
  };

  const handleManualNetworkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedNetwork(e.target.value);
  };

  const handleManualSubmit = () => {
    if (!manualAddress) {
      setError('Please enter a wallet address');
      return;
    }

    setScannedData({ address: manualAddress, network: selectedNetwork });
    setManualEntry(false);
  };

  useEffect(() => {
    // Load jsQR library dynamically
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      stopCamera();
      document.body.removeChild(script);
    };
  }, []);

  const getBalance = () => {
    if (!scannedData) return '0';
    return walletData.balances[scannedData.network] || '0';
  };

  const getBalanceUSD = () => {
    if (!scannedData) return 0;
    const balance = parseFloat(getBalance());
    const price = prices[scannedData.network as keyof typeof prices] || 0;
    return balance * price;
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 overflow-y-auto">
      <div className="h-full flex flex-col">
        {/* Header with X close button */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl text-gray-900 dark:text-white">
            {scannedData ? 'Send Payment' : 'Scan QR Code'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 p-4 max-w-md mx-auto w-full">

        {!scannedData ? (
          <div className="space-y-4">
            {!manualEntry ? (
              <>
                {/* Camera View */}
                {scanning ? (
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-64 bg-black rounded-xl object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    
                    {/* Scanning Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-48 border-2 border-purple-500 rounded-xl relative">
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-purple-500 rounded-tl-xl"></div>
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-purple-500 rounded-tr-xl"></div>
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-purple-500 rounded-bl-xl"></div>
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-purple-500 rounded-br-xl"></div>
                      </div>
                    </div>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm">
                      Position QR code within frame
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-64 bg-gray-100 dark:bg-gray-700 rounded-xl flex flex-col items-center justify-center gap-4">
                    <Camera className="w-16 h-16 text-gray-400" />
                    <p className="text-gray-600 dark:text-gray-400 text-center px-4">
                      {permissionDenied 
                        ? 'Camera permission denied' 
                        : 'Click the button below to start scanning'}
                    </p>
                  </div>
                )}

                {error && (
                  <div className="flex items-start gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                <div className="space-y-3">
                  {!scanning ? (
                    <Button onClick={startCamera} className="w-full">
                      <Camera className="w-4 h-4 mr-2" />
                      Scan QR Code
                    </Button>
                  ) : (
                    <Button onClick={stopCamera} variant="outline" className="w-full">
                      Stop Scanning
                    </Button>
                  )}
                  
                  <Button onClick={handleManualEntry} variant="outline" className="w-full">
                    Enter Address Manually
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Manual Entry Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
                      Select Network
                    </label>
                    <select
                      value={selectedNetwork}
                      onChange={handleManualNetworkChange}
                      className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="BTC">Bitcoin (BTC)</option>
                      <option value="ETH">Ethereum (ETH)</option>
                      <option value="SOL">Solana (SOL)</option>
                      <option value="BNB">BNB Smart Chain (BNB)</option>
                      <option value="TRX">TRON (TRX)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
                      Recipient Address
                    </label>
                    <Input
                      type="text"
                      value={manualAddress}
                      onChange={handleManualAddressChange}
                      placeholder="Enter wallet address"
                      className="h-12 font-mono"
                    />
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button 
                      onClick={() => {
                        setManualEntry(false);
                        setManualAddress('');
                        setError('');
                      }} 
                      variant="outline" 
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button onClick={handleManualSubmit} className="flex-1">
                      Continue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Scanned Address Info */}
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white">
                  ✓
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">QR Code Scanned</p>
                  <p className="text-green-600 dark:text-green-400">{scannedData.network} Network</p>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Recipient Address</p>
                <p className="text-sm text-gray-900 dark:text-white break-all font-mono">
                  {scannedData.address}
                </p>
              </div>
            </div>

            {/* Available Balance */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Available Balance</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl text-gray-900 dark:text-white">
                  {parseFloat(getBalance()).toFixed(8)} {scannedData.network}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ≈ ${getBalanceUSD().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">
                Amount to Send ({scannedData.network})
              </label>
              <div className="relative">
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError('');
                  }}
                  placeholder="0.00"
                  step="0.00000001"
                  min="0"
                  className="pr-20"
                />
                <button
                  onClick={() => setAmount(getBalance())}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                >
                  Max
                </button>
              </div>
              {amount && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  ≈ ${(parseFloat(amount) * (prices[scannedData.network as keyof typeof prices] || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button onClick={() => setScannedData(null)} variant="outline" className="flex-1">
                Scan Again
              </Button>
              <Button onClick={handleSend} className="flex-1">
                Send Payment
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}