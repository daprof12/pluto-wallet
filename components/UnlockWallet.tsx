import { useState } from 'react';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import Logo from './Logo';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import dataService from '../utils/dataService';
import transactionService from '../utils/transactionService';

interface UnlockWalletProps {
  walletData?: any;
  onUnlock: (wallet?: any) => void;
  onForgot: () => void;
  onCreateNew: () => void;
  onBackToLanding: () => void;
  isImporting?: boolean;
}

export default function UnlockWallet({ walletData, onUnlock, onForgot, onCreateNew, onBackToLanding, isImporting = false }: UnlockWalletProps) {
  const [email, setEmail] = useState(() => {
    return walletData?.email || (typeof localStorage !== 'undefined' ? localStorage.getItem('pluto_last_login_email') : '') || '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleUnlock = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 1. Search in Supabase 'users' table
      let matchedUser: any = null;
      if (isSupabaseConfigured()) {
        try {
          const { data: remoteUser, error: queryErr } = await supabase
            .from('users')
            .select('*')
            .ilike('email', trimmedEmail)
            .maybeSingle();
          if (!queryErr && remoteUser) {
            matchedUser = remoteUser;
          }
        } catch (e) {
          console.warn('[UnlockWallet] Supabase user query error:', e);
        }
      }

      // 2. Fallback to local admin users cache
      if (!matchedUser) {
        const cachedUsersStr = dataService.getItem('pluto_admin_users');
        if (cachedUsersStr) {
          try {
            const cached = JSON.parse(cachedUsersStr);
            matchedUser = cached.find((u: any) => u.email?.toLowerCase() === trimmedEmail.toLowerCase());
          } catch {}
        }
      }

      // 3. Fallback to passed walletData or active local wallet
      if (!matchedUser) {
        if (walletData && walletData.email?.toLowerCase() === trimmedEmail.toLowerCase()) {
          matchedUser = walletData;
        } else {
          const localWStr = dataService.getItem('pluto_wallet');
          if (localWStr) {
            try {
              const localW = JSON.parse(localWStr);
              if (localW.email?.toLowerCase() === trimmedEmail.toLowerCase()) {
                matchedUser = localW;
              }
            } catch {}
          }
        }
      }

      if (!matchedUser) {
        setError('No account found for this email address. Please check or create a new wallet.');
        setIsLoading(false);
        return;
      }

      if (matchedUser.blocked) {
        setError('This account has been restricted. Please contact support.');
        setIsLoading(false);
        return;
      }

      // 4. Verify password
      const storedPwd = matchedUser.password;
      let isMatch = false;

      if (storedPwd) {
        let decodedStored = '';
        try { decodedStored = atob(storedPwd); } catch {}
        let encodedEntered = '';
        try { encodedEntered = btoa(password); } catch {}

        isMatch = (
          password === storedPwd ||
          password === decodedStored ||
          encodedEntered === storedPwd
        );
      } else if (password.length >= 6) {
        // Fallback for legacy wallets without stored password
        isMatch = true;
      }

      if (!isMatch) {
        setError('Incorrect password. Please try again.');
        setPassword('');
        setIsLoading(false);
        return;
      }

      // Remember email for next login
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('pluto_last_login_email', trimmedEmail);
      }

      // 5. Fetch associated wallet record from Supabase 'wallets' table
      let matchedWallet: any = null;
      if (isSupabaseConfigured()) {
        try {
          const { data: remoteWallet } = await supabase
            .from('wallets')
            .select('*')
            .ilike('email', trimmedEmail)
            .maybeSingle();
          if (remoteWallet) {
            matchedWallet = remoteWallet;
          }
        } catch {}
      }

      const computedWalletId = matchedWallet?.id?.startsWith('wallet_')
        ? matchedWallet.id
        : `wallet_${matchedUser.id?.replace(/^usr_/, '')}`;

      let userCreatedAt = matchedUser.created_at || matchedWallet?.created_at;
      if ((!userCreatedAt || userCreatedAt.startsWith('2017')) && matchedUser.id?.startsWith('usr_')) {
        const ts = parseInt(matchedUser.id.replace('usr_', ''));
        if (!isNaN(ts) && ts > 1700000000000) {
          userCreatedAt = new Date(ts).toISOString();
        }
      }
      if (!userCreatedAt || userCreatedAt.startsWith('2017')) {
        userCreatedAt = new Date().toISOString();
      }

      // Fetch transactions directly from Supabase transactions table
      let userTxns = matchedWallet?.transactions || [];
      try {
        const fetched = await transactionService.fetchUserTransactions(matchedUser.id);
        if (fetched && fetched.length > 0) {
          userTxns = fetched;
        }
      } catch (txErr) {
        console.warn('[UnlockWallet] Could not fetch transactions from Supabase:', txErr);
      }

      // Reconstruct full active wallet session
      const activeWallet = {
        id: matchedUser.id,
        userId: matchedUser.id,
        walletId: computedWalletId,
        wallet_id: computedWalletId,
        email: matchedUser.email,
        phone: matchedUser.phone || '',
        fullName: matchedUser.full_name || matchedUser.fullName || trimmedEmail.split('@')[0],
        password: matchedUser.password || password,
        balances: matchedUser.balances || matchedWallet?.balances || { BTC: '0', ETH: '0', SOL: '0', BNB: '0', USDT: '0' },
        addresses: matchedUser.addresses || matchedWallet?.addresses || {},
        transactions: userTxns,
        mnemonic_encrypted: matchedWallet?.mnemonic_encrypted || matchedUser.mnemonic_encrypted || '',
        kyc_status: matchedUser.kyc_status || 'pending',
        kyc_data: matchedUser.kyc_data || {},
        blocked: !!matchedUser.blocked,
        twoFactorAuth: matchedUser.two_factor_auth || matchedUser.twoFactorAuth || matchedWallet?.two_factor_auth || {},
        user_restriction: matchedUser.user_restriction || {},
        created_at: userCreatedAt,
        last_login: new Date().toISOString()
      };

      // Set active wallet
      const activeWalletStr = JSON.stringify(activeWallet);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('pluto_wallet', activeWalletStr);
      }
      dataService.setItem('pluto_wallet', activeWalletStr);

      onUnlock(activeWallet);
    } catch (err) {
      console.error('[UnlockWallet] Login error:', err);
      setError('An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
        <div className="text-center mb-10">
          <Logo size="md" showText={true} onClick={onBackToLanding} />
          <p className="text-gray-400 mt-4">v2.20.4.2</p>
        </div>

        {/* Unlock Card */}
        <div className="bg-gray-900/50 backdrop-blur-xl rounded-3xl p-8 border border-gray-800 shadow-2xl">
          <h2 className="text-2xl text-white mb-2 text-center font-semibold">
            {isImporting ? 'Authenticate Wallet' : 'Welcome Back'}
          </h2>
          <p className="text-gray-400 text-sm text-center mb-6">
            Enter your email and password to access your wallet
          </p>
          
          {isImporting && (
            <div className="mb-6 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
              <p className="text-blue-200 text-sm text-center">
                Wallet found! Please enter your credentials to access your wallet.
              </p>
            </div>
          )}

          {/* Email Input */}
          <div className="mb-4">
            <label className="block text-gray-300 mb-2 text-sm">Email</label>
            <div className="relative">
              <Input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                onKeyPress={handleKeyPress}
                placeholder="Insert your email"
                className="w-full bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 pl-11 h-14 rounded-2xl focus:border-purple-500 focus:ring-purple-500"
                autoFocus={!email}
              />
              <Mail className="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Password Input */}
          <div className="mb-6">
            <label className="block text-gray-300 mb-2 text-sm">Password</label>
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
                className="w-full bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 pl-11 pr-12 h-14 rounded-2xl focus:border-purple-500 focus:ring-purple-500"
                autoFocus={!!email}
              />
              <Lock className="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
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
            disabled={isLoading || !email || !password}
            className="w-full h-14 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-2xl text-lg disabled:opacity-50 disabled:cursor-not-allowed mb-4 shadow-lg shadow-purple-600/30"
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
      </div>
    </div>
  );
}