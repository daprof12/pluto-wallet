import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import Logo from './Logo';

interface UnlockWalletProps {
  walletData: any;
  onUnlock: () => void;
  onForgot: () => void;
  onCreateNew: () => void;
  onBackToLanding: () => void;
  isImporting?: boolean;
}

export default function UnlockWallet({ walletData, onUnlock, onForgot, onCreateNew, onBackToLanding, isImporting = false }: UnlockWalletProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleUnlock = async () => {
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);
    setError('');

    // Simulate password verification
    setTimeout(() => {
      // In a real app, this would verify the password against the encrypted wallet
      // For demo purposes, we check against the stored password
      const storedPassword = walletData.password;
      
      // Check if password matches (either plain or base64 encoded)
      if (storedPassword && (password === storedPassword || password === atob(storedPassword))) {
        onUnlock();
      } else if (!storedPassword && password.length >= 8) {
        // Fallback for legacy wallets without password field
        onUnlock();
      } else {
        setError('Incorrect password. Please try again.');
        setPassword('');
      }
      setIsLoading(false);
    }, 500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUnlock();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo and Brand */}
        <div className="text-center mb-12">
          <Logo size="md" showText={true} onClick={onBackToLanding} />
          <p className="text-gray-400 mt-4">v2.20.4.2</p>
        </div>

        {/* Unlock Card */}
        <div className="bg-gray-900/50 backdrop-blur-xl rounded-3xl p-8 border border-gray-800 shadow-2xl">
          <h2 className="text-2xl text-white mb-6 text-center">
            {isImporting ? 'Authenticate Wallet' : 'Welcome Back'}
          </h2>
          
          {isImporting && (
            <div className="mb-6 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
              <p className="text-blue-200 text-sm text-center">
                Wallet found! Please enter your password to access your wallet.
              </p>
            </div>
          )}

          {/* Password Input */}
          <div className="mb-6">
            <label className="block text-gray-300 mb-3 text-sm">Password</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                onKeyPress={handleKeyPress}
                placeholder="Insert your password"
                className="w-full bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 pr-12 h-14 rounded-2xl focus:border-purple-500 focus:ring-purple-500"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {error && (
              <p className="text-red-400 text-sm mt-2">{error}</p>
            )}
          </div>

          {/* Unlock Button */}
          <Button
            onClick={handleUnlock}
            disabled={isLoading || !password}
            className="w-full h-14 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-2xl text-lg disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            {isLoading ? 'Unlocking...' : 'Unlock wallet'}
          </Button>

          {/* Alternative Options */}
          <div className="text-center space-y-3">
            <button
              onClick={onForgot}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Can't login? Try another method
            </button>
            <div className="text-gray-400 text-sm">
              <button
                onClick={onCreateNew}
                className="text-white hover:text-purple-400 transition-colors"
              >
                Create new wallet
              </button>
              {' or '}
              <button
                onClick={onCreateNew}
                className="text-white hover:text-purple-400 transition-colors"
              >
                Import an existing one
              </button>
            </div>
          </div>
        </div>

        {/* Wallet Info */}
        {walletData && (
          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              Wallet: {walletData.addresses?.BTC?.substring(0, 8)}...{walletData.addresses?.BTC?.substring(-6)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}