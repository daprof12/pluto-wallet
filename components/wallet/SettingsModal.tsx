import dataService from '../../utils/dataService';
import { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Globe, Upload, Shield, Key, Lock, Eye, EyeOff, Edit2, CheckCircle, Copy, Check, HelpCircle, Info, Camera, Fingerprint, AlertTriangle, Download, LogOut } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import TwoFactorAuth from '../TwoFactorAuth';
import { copyToClipboard } from '../../utils/clipboard';
import { loadAssetConfig } from '../../utils/assetConfig';

interface SettingsModalProps {
  walletData: any;
  onClose: () => void;
  onLogout: () => void;
  onUpdateWallet?: (data: any) => void;
}

export default function SettingsModal({ walletData, onClose, onLogout, onUpdateWallet }: SettingsModalProps) {
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [password, setPassword] = useState('');
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [copiedMnemonic, setCopiedMnemonic] = useState(false);
  
  // Profile state
  const [fullName, setFullName] = useState(walletData.fullName || 'John Doe');
  const [email, setEmail] = useState(walletData.email || 'user@example.com');
  const [phone, setPhone] = useState(walletData.phone || '+1234567890');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(walletData.avatar || '');
  
  // 2FA state
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [twoFAMethod, setTwoFAMethod] = useState<'passcode' | 'biometric'>(walletData.twoFactorAuth?.preferredMethod || 'passcode');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmNewPasscode, setConfirmNewPasscode] = useState('');
  const [biometricProcessing, setBiometricProcessing] = useState(false);
  const [twoFAError, setTwoFAError] = useState('');

  const mnemonic = atob(walletData.mnemonic_encrypted).split(' ');

  const handleCopyAddress = async (asset: string, address: string) => {
    const success = await copyToClipboard(address);
    if (success) {
      setCopiedAddress(asset);
      setTimeout(() => setCopiedAddress(null), 2000);
    }
  };

  const handleCopyMnemonic = async () => {
    const mnemonicText = mnemonic.join(' ');
    const success = await copyToClipboard(mnemonicText);
    if (success) {
      setCopiedMnemonic(true);
      setTimeout(() => setCopiedMnemonic(false), 2000);
    }
  };

  const handleExportPrivateKey = () => {
    if (!password) {
      alert('Please enter your password');
      return;
    }
    alert('Private key export functionality (mock)');
  };

  const handleUpdateProfile = () => {
    const updatedWallet = {
      ...walletData,
      fullName,
      email,
      phone,
      avatar: avatarUrl
    };
    dataService.setItem('pluto_wallet', JSON.stringify(updatedWallet));
    alert('Profile updated successfully!');
  };

  const handleResetPassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Please fill in all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    alert('Password reset successfully!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleAvatarChange = () => {
    const url = prompt('Enter avatar URL:');
    if (url) {
      setAvatarUrl(url);
    }
  };

  const handleSetupPasscode = () => {
    if (!newPasscode || !confirmNewPasscode) {
      setTwoFAError('Please enter and confirm your passcode');
      return;
    }
    if (newPasscode.length !== 6) {
      setTwoFAError('Passcode must be 6 digits');
      return;
    }
    if (newPasscode !== confirmNewPasscode) {
      setTwoFAError('Passcodes do not match');
      return;
    }

    const updatedWallet = {
      ...walletData,
      twoFactorAuth: {
        ...walletData.twoFactorAuth,
        enabled: true,
        passcode: newPasscode,
        preferredMethod: 'passcode',
        setupDate: new Date().toISOString()
      }
    };
    
    if (onUpdateWallet) {
      onUpdateWallet(updatedWallet);
    }
    dataService.setItem('pluto_wallet', JSON.stringify(updatedWallet));
    setTwoFAError('');
    setShow2FASetup(false);
    setNewPasscode('');
    setConfirmNewPasscode('');
    alert('Passcode authentication enabled successfully!');
  };

  const handleSetupBiometric = async () => {
    setBiometricProcessing(true);
    setTwoFAError('');

    try {
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() > 0.05) {
            resolve(true);
          } else {
            reject(new Error('Biometric setup failed'));
          }
        }, 2000);
      });

      const updatedWallet = {
        ...walletData,
        twoFactorAuth: {
          ...walletData.twoFactorAuth,
          enabled: true,
          biometricEnabled: true,
          biometricData: 'simulated_biometric_hash_' + Date.now(),
          preferredMethod: 'biometric',
          setupDate: new Date().toISOString()
        }
      };
      
      if (onUpdateWallet) {
        onUpdateWallet(updatedWallet);
      }
      dataService.setItem('pluto_wallet', JSON.stringify(updatedWallet));
      setBiometricProcessing(false);
      setShow2FASetup(false);
      alert('Biometric authentication enabled successfully!');
    } catch (err) {
      setBiometricProcessing(false);
      setTwoFAError('Biometric setup failed. Please try again.');
    }
  };

  const handleDisable2FA = () => {
    if (confirm('Are you sure you want to disable Two-Factor Authentication? This will make your wallet less secure.')) {
      const updatedWallet = {
        ...walletData,
        twoFactorAuth: {
          enabled: false,
          passcode: null,
          biometricEnabled: false,
          biometricData: null,
          preferredMethod: null
        }
      };
      
      if (onUpdateWallet) {
        onUpdateWallet(updatedWallet);
      }
      dataService.setItem('pluto_wallet', JSON.stringify(updatedWallet));
      alert('Two-Factor Authentication has been disabled');
    }
  };

  const handleChangePreferredMethod = (method: 'passcode' | 'biometric') => {
    const updatedWallet = {
      ...walletData,
      twoFactorAuth: {
        ...walletData.twoFactorAuth,
        preferredMethod: method
      }
    };
    
    if (onUpdateWallet) {
      onUpdateWallet(updatedWallet);
    }
    dataService.setItem('pluto_wallet', JSON.stringify(updatedWallet));
    setTwoFAMethod(method);
    alert(`Preferred authentication method changed to ${method}`);
  };

  const chains = loadAssetConfig().map(asset => ({
    symbol: asset.symbol,
    name: asset.name,
    network: asset.symbol === 'BTC' ? 'Bitcoin Mainnet' : 
             asset.symbol === 'ETH' ? 'Ethereum Mainnet' :
             asset.symbol === 'SOL' ? 'Solana Mainnet' :
             asset.symbol === 'BNB' ? 'BSC Mainnet' :
             asset.symbol === 'USDT' ? 'TRON Mainnet' : 'Mainnet',
    logoUrl: asset.logoUrl,
    color: asset.color,
    icon: asset.icon
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full p-6 mx-auto">
      <div>
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="addresses">Addresses</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6 mt-4">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4 p-6 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="relative">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-3xl">
                    {fullName.charAt(0).toUpperCase()}
                  </div>
                )}
                <button
                  onClick={handleAvatarChange}
                  className="absolute bottom-0 right-0 p-2 bg-purple-600 rounded-full text-white hover:bg-purple-700"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <div className="text-center">
                <h3 className="text-xl text-gray-900 dark:text-white">{fullName}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{email}</p>
              </div>
            </div>

            {/* Personal Information */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <h3 className="text-lg mb-4 text-gray-900 dark:text-white">Personal Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">Full Name</label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">Phone Number</label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter your phone number"
                  />
                </div>
                <Button onClick={handleUpdateProfile} className="w-full">
                  Update Profile
                </Button>
              </div>
            </div>

            {/* Reset Password */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <h3 className="text-lg mb-4 text-gray-900 dark:text-white">Reset Password</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">Current Password</label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">New Password</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">Confirm New Password</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
                <Button onClick={handleResetPassword} variant="outline" className="w-full">
                  Reset Password
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses" className="space-y-4 mt-4">
            {chains.map((chain) => (
              <div key={chain.symbol} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {chain.logoUrl ? (
                      <img src={chain.logoUrl} alt={chain.name} className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className={`w-10 h-10 rounded-full ${chain.color} flex items-center justify-center text-white text-lg`}>
                        {chain.icon || chain.symbol.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="text-gray-900 dark:text-white">{chain.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{chain.network}</div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <div className="flex-1 p-2 bg-white dark:bg-gray-800 rounded text-sm text-gray-900 dark:text-white break-all">
                    {walletData.addresses[chain.symbol]}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyAddress(chain.symbol, walletData.addresses[chain.symbol])}
                  >
                    {copiedAddress === chain.symbol ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6 mt-4">
            {/* Two-Factor Authentication */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="text-lg text-gray-900 dark:text-white">Two-Factor Authentication</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Add an extra layer of security to your wallet
              </p>

              {walletData.twoFactorAuth?.enabled ? (
                <div className="space-y-4">
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div className="flex-1">
                      <p className="text-sm text-green-800 dark:text-green-200">
                        Two-Factor Authentication is enabled
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Setup on {new Date(walletData.twoFactorAuth.setupDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm text-gray-700 dark:text-gray-300">Preferred Method</h4>
                    
                    {walletData.twoFactorAuth?.passcode && (
                      <button
                        onClick={() => handleChangePreferredMethod('passcode')}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                          twoFAMethod === 'passcode'
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            twoFAMethod === 'passcode'
                              ? 'bg-purple-500'
                              : 'bg-gray-200 dark:bg-gray-700'
                          }`}>
                            <Lock className={`w-5 h-5 ${twoFAMethod === 'passcode' ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-900 dark:text-white">6-Digit Passcode</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Use numeric passcode</p>
                          </div>
                          {twoFAMethod === 'passcode' && (
                            <Check className="w-5 h-5 text-purple-500" />
                          )}
                        </div>
                      </button>
                    )}

                    {walletData.twoFactorAuth?.biometricEnabled && (
                      <button
                        onClick={() => handleChangePreferredMethod('biometric')}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                          twoFAMethod === 'biometric'
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            twoFAMethod === 'biometric'
                              ? 'bg-purple-500'
                              : 'bg-gray-200 dark:bg-gray-700'
                          }`}>
                            <Fingerprint className={`w-5 h-5 ${twoFAMethod === 'biometric' ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-900 dark:text-white">Biometric</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Fingerprint or face recognition</p>
                          </div>
                          {twoFAMethod === 'biometric' && (
                            <Check className="w-5 h-5 text-purple-500" />
                          )}
                        </div>
                      </button>
                    )}

                    <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                      <Button
                        variant="outline"
                        onClick={() => setShow2FASetup(true)}
                        className="w-full mb-2"
                      >
                        {walletData.twoFactorAuth?.passcode ? 'Update Passcode' : 'Setup Passcode'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShow2FASetup(true);
                          setTwoFAMethod('biometric');
                        }}
                        className="w-full mb-2"
                      >
                        {walletData.twoFactorAuth?.biometricEnabled ? 'Re-enroll Biometric' : 'Setup Biometric'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleDisable2FA}
                        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        Disable 2FA
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg mb-4">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Two-Factor Authentication is not enabled. Enable it for better security.
                    </p>
                  </div>
                  <Button
                    onClick={() => setShow2FASetup(true)}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Enable Two-Factor Authentication
                  </Button>
                </div>
              )}

              {/* 2FA Setup Modal */}
              {show2FASetup && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]" onClick={() => setShow2FASetup(false)}>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                    <h3 className="text-xl text-gray-900 dark:text-white mb-4">
                      {twoFAMethod === 'passcode' ? 'Setup Passcode' : 'Setup Biometric'}
                    </h3>

                    {twoFAMethod === 'passcode' ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Enter Passcode</label>
                          <input
                            type="password"
                            value={newPasscode}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                              setNewPasscode(value);
                              setTwoFAError('');
                            }}
                            placeholder="Enter 6-digit passcode"
                            className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-xl text-center text-xl tracking-widest text-gray-900 dark:text-white"
                            maxLength={6}
                            inputMode="numeric"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Confirm Passcode</label>
                          <input
                            type="password"
                            value={confirmNewPasscode}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                              setConfirmNewPasscode(value);
                              setTwoFAError('');
                            }}
                            placeholder="Confirm 6-digit passcode"
                            className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-xl text-center text-xl tracking-widest text-gray-900 dark:text-white"
                            maxLength={6}
                            inputMode="numeric"
                          />
                        </div>
                        {twoFAError && (
                          <p className="text-sm text-red-600 dark:text-red-400">{twoFAError}</p>
                        )}
                        <div className="flex gap-3">
                          <Button variant="outline" onClick={() => setShow2FASetup(false)} className="flex-1">
                            Cancel
                          </Button>
                          <Button onClick={handleSetupPasscode} className="flex-1">
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <button
                          onClick={handleSetupBiometric}
                          disabled={biometricProcessing}
                          className="w-full p-12 bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-2xl transition-all disabled:opacity-50"
                        >
                          <div className="relative">
                            <Fingerprint className={`w-24 h-24 text-white mx-auto ${biometricProcessing ? 'animate-pulse' : ''}`} />
                            {biometricProcessing && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-32 h-32 border-4 border-white border-t-transparent rounded-full animate-spin" />
                              </div>
                            )}
                          </div>
                        </button>
                        {twoFAError && (
                          <p className="text-sm text-red-600 dark:text-red-400">{twoFAError}</p>
                        )}
                        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                          Tap the fingerprint to register your biometric data
                        </p>
                        <Button variant="outline" onClick={() => setShow2FASetup(false)} className="w-full">
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Recovery Phrase */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <h3 className="text-lg mb-2 text-gray-900 dark:text-white">Recovery Phrase</h3>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  Never share your recovery phrase. Anyone with these words can access your funds.
                </p>
              </div>

              {!showMnemonic ? (
                <Button onClick={() => setShowMnemonic(true)} variant="outline" className="w-full">
                  <Eye className="w-4 h-4 mr-2" />
                  Reveal Recovery Phrase
                </Button>
              ) : (
                <div>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {mnemonic.map((word, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{idx + 1}.</span>
                        <span className="text-sm text-gray-900 dark:text-white">{word}</span>
                      </div>
                    ))}
                  </div>
                  <Button onClick={handleCopyMnemonic} variant="outline" className="w-full">
                    {copiedMnemonic ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy to Clipboard
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Export Private Key */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <h3 className="text-lg mb-2 text-gray-900 dark:text-white">Export Private Key</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Enter your password to export your private keys
              </p>
              <div className="space-y-3">
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button onClick={handleExportPrivateKey} variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Export Private Keys
                </Button>
              </div>
            </div>

            {/* Change PIN */}

          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about" className="space-y-4 mt-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <svg width="42" height="42" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 3L10 3L10 10L3 10L3 3Z" fill="white"/>
                    <path d="M3 14L10 21" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl text-gray-900 dark:text-white">Pluto Wallet</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Version 1.0.0</p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-gray-600 dark:text-gray-400">Wallet ID</span>
                  <span className="text-gray-900 dark:text-white">{walletData.id}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-gray-600 dark:text-gray-400">Created</span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(walletData.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600 dark:text-gray-400">Chains Supported</span>
                  <span className="text-gray-900 dark:text-white">5</span>
                </div>
              </div>
            </div>

            <div className="text-center space-y-2">
              <Button variant="link" className="text-purple-600 dark:text-purple-400">
                Terms of Service
              </Button>
              <Button variant="link" className="text-purple-600 dark:text-purple-400">
                Privacy Policy
              </Button>
              <Button variant="link" className="text-purple-600 dark:text-purple-400">
                Support & Help
              </Button>
            </div>

            {/* Logout Button */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button 
                onClick={onLogout} 
                variant="outline" 
                className="w-full text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout from Wallet
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}