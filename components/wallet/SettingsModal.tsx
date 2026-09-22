import dataService from '../../utils/dataService';
import { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Globe, Upload, Shield, Key, Lock, Eye, EyeOff, Edit2, CheckCircle, Copy, Check, HelpCircle, Info, Camera, Fingerprint, AlertTriangle, Download, LogOut, ShieldCheck, Clock, XCircle, FileText, Send, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import TwoFactorAuth from '../TwoFactorAuth';
import { loadAssetConfig } from '../../utils/assetConfig';
import AssetLogo from './AssetLogo';

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

  // KYC state
  const [kycStatus, setKycStatus] = useState<'verified' | 'pending' | 'rejected' | 'unverified'>(
    walletData.kyc_status || 'unverified'
  );
  const [isSubmittingKyc, setIsSubmittingKyc] = useState(false);
  const [showKycForm, setShowKycForm] = useState(false);
  const [kycForm, setKycForm] = useState({
    fullName: walletData.fullName || walletData.kyc_data?.fullName || '',
    dateOfBirth: walletData.kyc_data?.dateOfBirth || '1995-08-20',
    nationality: walletData.kyc_data?.nationality || 'United States',
    street: walletData.kyc_data?.residentialAddress?.street || '123 Market St',
    city: walletData.kyc_data?.residentialAddress?.city || 'San Francisco',
    state: walletData.kyc_data?.residentialAddress?.state || 'CA',
    postalCode: walletData.kyc_data?.residentialAddress?.postalCode || '94103',
    country: walletData.kyc_data?.residentialAddress?.country || 'United States',
    documentType: (walletData.kyc_data?.document?.type || 'passport') as 'passport' | 'national_id' | 'drivers_license',
    documentNumber: walletData.kyc_data?.document?.documentNumber || 'P92837182',
    expiryDate: walletData.kyc_data?.document?.expiryDate || '2030-05-15'
  });

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

  const handleToggleUserAssetDisplay = (symbol: string, shown: boolean) => {
    const currentSettings = walletData.assetDisplaySettings || {};
    const updatedSettings = {
      ...currentSettings,
      [symbol]: shown
    };
    
    const updatedWallet = {
      ...walletData,
      assetDisplaySettings: updatedSettings
    };

    if (onUpdateWallet) {
      onUpdateWallet(updatedWallet);
    }
    dataService.setItem('pluto_wallet', JSON.stringify(updatedWallet));

    // Also sync to pluto_admin_users if user exists there
    try {
      const adminUsers = JSON.parse(dataService.getItem('pluto_admin_users') || '[]');
      const userIndex = adminUsers.findIndex((u: any) => u.id === walletData.id);
      if (userIndex !== -1) {
        adminUsers[userIndex].assetDisplaySettings = updatedSettings;
        dataService.setItem('pluto_admin_users', JSON.stringify(adminUsers));
      }
    } catch (e) {
      console.error('Error syncing user asset display settings:', e);
    }

    // Trigger event for wallet home page
    window.dispatchEvent(new CustomEvent('walletUpdated', {
      detail: { wallet: updatedWallet }
    }));
  };

  const chains = loadAssetConfig().map(asset => ({
    symbol: asset.symbol,
    name: asset.name,
    network: asset.network || (
             asset.symbol === 'BTC' ? 'Bitcoin' : 
             asset.symbol === 'ETH' ? 'Ethereum' :
             asset.symbol === 'SOL' ? 'Solana' :
             asset.symbol === 'BNB' ? 'BNB Smart Chain' :
             asset.symbol === 'USDT' ? 'TRON' :
             asset.symbol === 'USDT_ERC20' ? 'Ethereum' :
             asset.symbol === 'USDT_BEP20' ? 'BNB Smart Chain' : 'Mainnet'),
    logoUrl: asset.logoUrl,
    color: asset.color,
    icon: asset.icon,
    enabled: asset.enabled
  }));

  const handleSubmitKyc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kycForm.fullName || !kycForm.documentNumber) {
      alert('Please fill out all required fields');
      return;
    }

    setIsSubmittingKyc(true);
    setTimeout(() => {
      const newKycData = {
        fullName: kycForm.fullName,
        dateOfBirth: kycForm.dateOfBirth,
        nationality: kycForm.nationality,
        residentialAddress: {
          street: kycForm.street,
          city: kycForm.city,
          state: kycForm.state,
          postalCode: kycForm.postalCode,
          country: kycForm.country
        },
        document: {
          id: `doc_${walletData.id}_${Date.now()}`,
          type: kycForm.documentType,
          documentNumber: kycForm.documentNumber,
          issuingCountry: kycForm.country,
          expiryDate: kycForm.expiryDate,
          frontUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80',
          backUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80',
          selfieUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
          proofOfAddressUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80'
        },
        submittedAt: new Date().toISOString()
      };

      const updatedWallet = {
        ...walletData,
        kyc_status: 'pending',
        kyc_data: newKycData
      };

      setKycStatus('pending');
      setShowKycForm(false);
      dataService.setItem('pluto_wallet', JSON.stringify(updatedWallet));
      
      // Update in pluto_admin_users
      try {
        const adminUsers = JSON.parse(dataService.getItem('pluto_admin_users') || '[]');
        const updatedAdminUsers = adminUsers.map((u: any) => {
          if (u.id === walletData.id) {
            return {
              ...u,
              kyc_status: 'pending',
              kyc_data: newKycData
            };
          }
          return u;
        });
        dataService.setItem('pluto_admin_users', JSON.stringify(updatedAdminUsers));
      } catch (err) {
        console.error('Error updating admin users list', err);
      }

      if (onUpdateWallet) {
        onUpdateWallet(updatedWallet);
      }

      setIsSubmittingKyc(false);
      alert('KYC submitted successfully! Our compliance team will review your application shortly.');
    }, 600);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full p-6 mx-auto">
      <div>
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-5 text-xs sm:text-sm">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="addresses">Addresses</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="kyc">KYC</TabsTrigger>
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

          {/* Addresses Tab matching Image 2 */}
          <TabsContent value="addresses" className="space-y-4 mt-4">
            {/* Header Card matching Image 2 */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700/60">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                Your Network Addresses & Display Settings
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Manage your deposit addresses and toggle which assets show on your Home page under &quot;Your Assets&quot;.
              </p>
            </div>

            {/* List of Token Address Cards matching Image 2 */}
            <div className="space-y-3">
              {chains.map((chain) => {
                const isShown = walletData.assetDisplaySettings?.[chain.symbol] !== false;
                const address = walletData.addresses?.[chain.symbol] || 
                  (chain.symbol === 'USDT_ERC20' ? walletData.addresses?.['ETH'] :
                   chain.symbol === 'USDT_BEP20' ? walletData.addresses?.['BNB'] : '') ||
                  '';

                return (
                  <div
                    key={chain.symbol}
                    className="p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 rounded-2xl shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <AssetLogo
                          logoUrl={chain.logoUrl}
                          name={chain.name}
                          symbol={chain.symbol}
                          color={chain.color}
                          icon={chain.icon}
                          size="w-10 h-10"
                          textSize="text-base"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 dark:text-white text-base">{chain.name}</span>
                            <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded font-semibold uppercase">
                              {chain.symbol}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {chain.network}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${isShown ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'}`}>
                          {isShown ? 'Shown' : 'Hidden'}
                        </span>
                        <Switch
                          checked={isShown}
                          onCheckedChange={(checked) => handleToggleUserAssetDisplay(chain.symbol, checked)}
                          className="data-[state=checked]:bg-purple-600"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-gray-200 font-mono break-all select-all">
                        {address || 'Generating address...'}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyAddress(chain.symbol, address)}
                        className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 transition-colors shrink-0"
                        title="Copy address"
                      >
                        {copiedAddress === chain.symbol ? (
                          <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
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
                  <span className="text-gray-900 dark:text-white font-mono">
                    {walletData.walletId || walletData.wallet_id || (walletData.id?.startsWith('usr_') ? walletData.id.replace(/^usr_/, 'wallet_') : (walletData.id?.startsWith('wallet_') ? walletData.id : `wallet_${walletData.id}`))}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-gray-600 dark:text-gray-400">Created</span>
                  <span className="text-gray-900 dark:text-white">
                    {(() => {
                      let created = walletData.created_at;
                      if ((!created || created.startsWith('2017')) && walletData.id?.startsWith('usr_')) {
                        const ts = parseInt(walletData.id.replace('usr_', ''));
                        if (!isNaN(ts) && ts > 1700000000000) {
                          created = new Date(ts).toISOString();
                        }
                      }
                      return created ? new Date(created).toLocaleDateString() : 'N/A';
                    })()}
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

          {/* KYC Identity Verification Tab */}
          <TabsContent value="kyc" className="space-y-6 mt-4">
            {/* Status Header Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/10 via-indigo-500/10 to-blue-500/10 border border-purple-200 dark:border-purple-800/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-base">Identity Verification (KYC)</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Compliance & Regulatory Tier 2 Verification</p>
                  </div>
                </div>
                <Badge
                  variant={
                    kycStatus === 'verified'
                      ? 'default'
                      : kycStatus === 'pending'
                      ? 'secondary'
                      : 'destructive'
                  }
                  className="capitalize text-xs font-semibold px-2.5 py-1"
                >
                  {kycStatus}
                </Badge>
              </div>
            </div>

            {/* Verified View */}
            {kycStatus === 'verified' && (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">Account Verified</h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                      Your identity documents have been approved by the compliance team. You have full access to deposit, swap, buy, and withdrawal limits.
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/60 p-4 rounded-xl space-y-3 text-xs">
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Verified Credentials</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Legal Name</span>
                      <p className="font-medium text-gray-900 dark:text-white mt-0.5">{walletData.kyc_data?.fullName || fullName}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Document Type</span>
                      <p className="font-medium text-gray-900 dark:text-white mt-0.5 capitalize">
                        {(walletData.kyc_data?.document?.type || 'Passport').replace('_', ' ')}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Verification Date</span>
                      <p className="font-medium text-gray-900 dark:text-white mt-0.5">
                        {walletData.kyc_data?.reviewedAt ? new Date(walletData.kyc_data.reviewedAt).toLocaleDateString() : 'Verified'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Daily Limit</span>
                      <p className="font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">Unlimited</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pending View */}
            {kycStatus === 'pending' && (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-300">Under Review</h4>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                      Your identity documents have been submitted and are currently in the compliance review queue. You will receive an in-app notification once verification is complete.
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/60 p-4 rounded-xl space-y-2 text-xs">
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Submitted Information</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Submitted Name</span>
                      <p className="font-medium text-gray-900 dark:text-white mt-0.5">{walletData.kyc_data?.fullName || kycForm.fullName}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Document Number</span>
                      <p className="font-mono font-medium text-gray-900 dark:text-white mt-0.5">{walletData.kyc_data?.document?.documentNumber || kycForm.documentNumber}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Rejected View */}
            {kycStatus === 'rejected' && !showKycForm && (
              <div className="space-y-4">
                <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-red-900 dark:text-red-300">Verification Rejected</h4>
                    <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                      Reason: <strong className="font-semibold">{walletData.kyc_data?.rejectionReason || 'Documents did not meet criteria.'}</strong>
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      Please resubmit with clear, valid government identification.
                    </p>
                  </div>
                </div>

                <Button 
                  onClick={() => setShowKycForm(true)} 
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Resubmit Identity Documents
                </Button>
              </div>
            )}

            {/* Unverified or Resubmitting Form */}
            {(kycStatus === 'unverified' || (kycStatus === 'rejected' && showKycForm)) && (
              <form onSubmit={handleSubmitKyc} className="space-y-4">
                <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                  <span>
                    Submit valid identification to unlock higher transaction limits and enhanced security protections.
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Legal Full Name</label>
                    <Input
                      placeholder="e.g. Johnathan Doe"
                      value={kycForm.fullName}
                      onChange={(e) => setKycForm({ ...kycForm, fullName: e.target.value })}
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Date of Birth</label>
                    <Input
                      type="date"
                      value={kycForm.dateOfBirth}
                      onChange={(e) => setKycForm({ ...kycForm, dateOfBirth: e.target.value })}
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Country of Residence</label>
                    <Input
                      placeholder="e.g. United States"
                      value={kycForm.country}
                      onChange={(e) => setKycForm({ ...kycForm, country: e.target.value })}
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Residential Street Address</label>
                    <Input
                      placeholder="e.g. 123 Main St"
                      value={kycForm.street}
                      onChange={(e) => setKycForm({ ...kycForm, street: e.target.value })}
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Document Type</label>
                    <select
                      value={kycForm.documentType}
                      onChange={(e) => setKycForm({ ...kycForm, documentType: e.target.value as any })}
                      className="w-full mt-1 h-10 px-3 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
                    >
                      <option value="passport">Passport</option>
                      <option value="national_id">National ID Card</option>
                      <option value="drivers_license">Driver's License</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Document Number</label>
                    <Input
                      placeholder="e.g. P93820193"
                      value={kycForm.documentNumber}
                      onChange={(e) => setKycForm({ ...kycForm, documentNumber: e.target.value })}
                      className="mt-1"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Attached Document Proofs</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 border border-dashed border-purple-300 dark:border-purple-800 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 text-center flex flex-col items-center justify-center">
                      <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400 mb-1" />
                      <span className="font-semibold text-gray-900 dark:text-white">ID Document Front & Back</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">✓ Ready for upload</span>
                    </div>
                    <div className="p-3 border border-dashed border-purple-300 dark:border-purple-800 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 text-center flex flex-col items-center justify-center">
                      <Camera className="w-5 h-5 text-purple-600 dark:text-purple-400 mb-1" />
                      <span className="font-semibold text-gray-900 dark:text-white">Selfie with ID</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">✓ Ready for upload</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  {kycStatus === 'rejected' && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowKycForm(false)}
                      className="w-1/3"
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    type="submit"
                    disabled={isSubmittingKyc}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {isSubmittingKyc ? 'Submitting Verification...' : 'Submit Verification Documents'}
                  </Button>
                </div>
              </form>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}