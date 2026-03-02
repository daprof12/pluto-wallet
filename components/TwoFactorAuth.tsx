import { useState, useEffect } from 'react';
import { Fingerprint, Lock, ArrowLeft, Eye, EyeOff, Delete } from 'lucide-react';
import { Button } from './ui/button';

interface TwoFactorAuthProps {
  walletData: any;
  onSuccess: () => void;
  onBack: () => void;
  onSkip?: () => void;
  onUpdateWallet: (data: any) => void;
  isSetup?: boolean;
}

export default function TwoFactorAuth({ walletData, onSuccess, onBack, onSkip, onUpdateWallet, isSetup = false }: TwoFactorAuthProps) {
  const [method, setMethod] = useState<'biometric' | 'passcode'>(
    walletData.twoFactorAuth?.preferredMethod || 'passcode'
  );
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [error, setError] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [biometricProcessing, setBiometricProcessing] = useState(false);
  const [setupStep, setSetupStep] = useState<'choose' | 'setup-passcode' | 'setup-biometric' | 'confirm-passcode'>('choose');

  // Check if 2FA is already set up
  const is2FASetup = walletData.twoFactorAuth?.enabled;
  const hasBiometric = walletData.twoFactorAuth?.biometricEnabled;
  const hasPasscode = walletData.twoFactorAuth?.passcode;

  // Numeric keypad handler
  const handleKeypadPress = (digit: string, isConfirm = false) => {
    if (isConfirm) {
      if (confirmPasscode.length < 6) {
        setConfirmPasscode(confirmPasscode + digit);
        setError('');
      }
    } else {
      if (passcode.length < 6) {
        setPasscode(passcode + digit);
        setError('');
      }
    }
  };

  const handleKeypadDelete = (isConfirm = false) => {
    if (isConfirm) {
      setConfirmPasscode(confirmPasscode.slice(0, -1));
    } else {
      setPasscode(passcode.slice(0, -1));
    }
    setError('');
  };

  useEffect(() => {
    // If in setup mode and no 2FA exists, show setup flow
    if (isSetup && !is2FASetup) {
      setSetupStep('choose');
    } else if (!isSetup && is2FASetup) {
      // In auth mode, use preferred method or fallback
      if (walletData.twoFactorAuth?.preferredMethod === 'biometric' && hasBiometric) {
        setMethod('biometric');
        // Auto-trigger biometric on load
        setTimeout(() => handleBiometricAuth(), 500);
      } else {
        setMethod('passcode');
      }
    }
  }, [isSetup, is2FASetup]);

  const handlePasscodeAuth = () => {
    if (!passcode) {
      setError('Please enter your passcode');
      return;
    }

    if (passcode.length !== 6) {
      setError('Passcode must be 6 digits');
      return;
    }

    // Validate passcode
    if (passcode === walletData.twoFactorAuth?.passcode) {
      setError('');
      onSuccess();
    } else {
      setError('Invalid passcode. Please try again.');
      setPasscode('');
    }
  };

  const handlePasscodeSetup = () => {
    if (!passcode || !confirmPasscode) {
      setError('Please enter and confirm your passcode');
      return;
    }

    if (passcode.length !== 6) {
      setError('Passcode must be 6 digits');
      return;
    }

    if (passcode !== confirmPasscode) {
      setError('Passcodes do not match');
      return;
    }

    // Save passcode
    const updatedWallet = {
      ...walletData,
      twoFactorAuth: {
        ...walletData.twoFactorAuth,
        enabled: true,
        passcode: passcode,
        preferredMethod: 'passcode',
        setupDate: new Date().toISOString()
      }
    };
    onUpdateWallet(updatedWallet);
    setError('');
    onSuccess();
  };

  const handleBiometricAuth = async () => {
    setBiometricProcessing(true);
    setError('');

    // Simulate biometric authentication
    // In a real app, this would use Web Authentication API or native biometrics
    try {
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // Simulate success rate (90% success for demo)
          if (Math.random() > 0.1) {
            resolve(true);
          } else {
            reject(new Error('Biometric authentication failed'));
          }
        }, 1500);
      });

      setBiometricProcessing(false);
      onSuccess();
    } catch (err) {
      setBiometricProcessing(false);
      setError('Biometric authentication failed. Please try again or use passcode.');
    }
  };

  const handleBiometricSetup = async () => {
    setBiometricProcessing(true);
    setError('');

    // Simulate biometric enrollment
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

      // Save biometric as enabled
      const updatedWallet = {
        ...walletData,
        twoFactorAuth: {
          ...walletData.twoFactorAuth,
          enabled: true,
          biometricEnabled: true,
          biometricData: 'simulated_biometric_hash_' + Date.now(), // In real app, this would be actual biometric data
          preferredMethod: 'biometric',
          setupDate: new Date().toISOString()
        }
      };
      onUpdateWallet(updatedWallet);
      setBiometricProcessing(false);
      setError('');
      onSuccess();
    } catch (err) {
      setBiometricProcessing(false);
      setError('Biometric setup failed. Please try again or choose passcode.');
    }
  };

  // Setup flow for first-time users
  if (isSetup && !is2FASetup) {
    if (setupStep === 'choose') {
      return (
        <div className="fixed inset-0 bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              {onSkip && (
                <button 
                  onClick={onSkip}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Skip
                </button>
              )}
            </div>

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl text-gray-900 dark:text-white mb-2">Setup Two-Factor Authentication</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Choose your preferred authentication method for added security
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setSetupStep('setup-biometric')}
                className="w-full p-6 bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Fingerprint className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white mb-1">Biometric Authentication</h3>
                    <p className="text-sm text-white/80">Use fingerprint or face recognition</p>
                  </div>
                  <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity">→</div>
                </div>
              </button>

              <button
                onClick={() => setSetupStep('setup-passcode')}
                className="w-full p-6 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                    <Lock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-gray-900 dark:text-white mb-1">6-Digit Passcode</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Use a numeric passcode</p>
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">→</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (setupStep === 'setup-passcode') {
      return (
        <div className="fixed inset-0 bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 sm:p-8 max-w-md w-full max-h-screen overflow-y-auto">
            <button onClick={() => setSetupStep('choose')} className="mb-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl text-gray-900 dark:text-white mb-2">Create Your Passcode</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Enter a 6-digit passcode to secure your wallet
              </p>
            </div>

            <div className="space-y-6">
              {/* Passcode Display */}
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-3 text-center">Enter Passcode</label>
                <div className="flex justify-center gap-2 sm:gap-3 mb-4">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <div
                      key={index}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center border-2 border-gray-200 dark:border-gray-600 transition-all"
                    >
                      {passcode[index] ? (
                        showPasscode ? (
                          <span className="text-xl sm:text-2xl text-gray-900 dark:text-white">{passcode[index]}</span>
                        ) : (
                          <div className="w-3 h-3 rounded-full bg-purple-600" />
                        )
                      ) : null}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="mx-auto flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                >
                  {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showPasscode ? 'Hide' : 'Show'} Passcode
                </button>
              </div>

              {/* Numeric Keypad */}
              <div className="space-y-2 sm:space-y-3">
                {/* Numbers 1-9 in 3x3 grid */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleKeypadPress(num.toString())}
                      disabled={passcode.length >= 6}
                      className="aspect-square rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95 transition-all text-2xl text-gray-900 dark:text-white disabled:opacity-50"
                    >
                      {num}
                    </button>
                  ))}
                </div>

                {/* Bottom row with fingerprint, 0, and delete */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <button
                    onClick={() => setSetupStep('choose')}
                    className="aspect-square rounded-xl bg-gray-300 dark:bg-gray-600 cursor-not-allowed opacity-50 transition-all flex items-center justify-center"
                    title="Biometric not set up yet"
                    disabled
                  >
                    <Fingerprint className="w-6 h-6 sm:w-7 sm:h-7 text-gray-500 dark:text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleKeypadPress('0')}
                    disabled={passcode.length >= 6}
                    className="aspect-square rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95 transition-all text-2xl text-gray-900 dark:text-white disabled:opacity-50"
                  >
                    0
                  </button>
                  <button
                    onClick={() => handleKeypadDelete()}
                    className="aspect-square rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-900/30 active:scale-95 transition-all flex items-center justify-center"
                  >
                    <Delete className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              <Button
                size="lg"
                onClick={() => {
                  if (passcode.length === 6) {
                    setSetupStep('confirm-passcode');
                  } else {
                    setError('Please enter a 6-digit passcode');
                  }
                }}
                disabled={passcode.length !== 6}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (setupStep === 'confirm-passcode') {
      return (
        <div className="fixed inset-0 bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 sm:p-8 max-w-md w-full max-h-screen overflow-y-auto">
            <button onClick={() => {
              setSetupStep('setup-passcode');
              setConfirmPasscode('');
              setError('');
            }} className="mb-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl text-gray-900 dark:text-white mb-2">Confirm Your Passcode</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Re-enter your passcode to confirm
              </p>
            </div>

            <div className="space-y-6">
              {/* Passcode Display */}
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-3 text-center">Confirm Passcode</label>
                <div className="flex justify-center gap-2 sm:gap-3 mb-4">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <div
                      key={index}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center border-2 border-gray-200 dark:border-gray-600 transition-all"
                    >
                      {confirmPasscode[index] ? (
                        showPasscode ? (
                          <span className="text-xl sm:text-2xl text-gray-900 dark:text-white">{confirmPasscode[index]}</span>
                        ) : (
                          <div className="w-3 h-3 rounded-full bg-purple-600" />
                        )
                      ) : null}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="mx-auto flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                >
                  {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showPasscode ? 'Hide' : 'Show'} Passcode
                </button>
              </div>

              {/* Numeric Keypad */}
              <div className="space-y-2 sm:space-y-3">
                {/* Numbers 1-9 in 3x3 grid */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleKeypadPress(num.toString(), true)}
                      disabled={confirmPasscode.length >= 6}
                      className="aspect-square rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95 transition-all text-2xl text-gray-900 dark:text-white disabled:opacity-50"
                    >
                      {num}
                    </button>
                  ))}
                </div>

                {/* Bottom row with fingerprint, 0, and delete */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <button
                    className="aspect-square rounded-xl bg-gray-300 dark:bg-gray-600 cursor-not-allowed opacity-50 transition-all flex items-center justify-center"
                    title="Biometric not set up yet"
                    disabled
                  >
                    <Fingerprint className="w-6 h-6 sm:w-7 sm:h-7 text-gray-500 dark:text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleKeypadPress('0', true)}
                    disabled={confirmPasscode.length >= 6}
                    className="aspect-square rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95 transition-all text-2xl text-gray-900 dark:text-white disabled:opacity-50"
                  >
                    0
                  </button>
                  <button
                    onClick={() => handleKeypadDelete(true)}
                    className="aspect-square rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-900/30 active:scale-95 transition-all flex items-center justify-center"
                  >
                    <Delete className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              <Button
                size="lg"
                onClick={handlePasscodeSetup}
                disabled={confirmPasscode.length !== 6}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                Setup Passcode
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (setupStep === 'setup-biometric') {
      return (
        <div className="fixed inset-0 bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full">
            <button onClick={() => setSetupStep('choose')} className="mb-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Fingerprint className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl text-gray-900 dark:text-white mb-2">Setup Biometric</h2>
              <p className="text-gray-600 dark:text-gray-400">
                {biometricProcessing ? 'Scanning your biometric data...' : 'Tap the button below to register your fingerprint or face'}
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleBiometricSetup}
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

              {error && (
                <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                This is a simulated biometric authentication. In a real app, this would use your device's biometric sensors.
              </p>
            </div>
          </div>
        </div>
      );
    }
  }

  // Authentication flow for existing users
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 sm:p-8 max-w-md w-full max-h-screen overflow-y-auto">
        <button onClick={onBack} className="mb-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>

        <div className="text-center mb-6 sm:mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            {method === 'biometric' ? (
              <Fingerprint className="w-8 h-8 text-white" />
            ) : (
              <Lock className="w-8 h-8 text-white" />
            )}
          </div>
          <h2 className="text-2xl text-gray-900 dark:text-white mb-2">Two-Factor Authentication</h2>
          <p className="text-gray-600 dark:text-gray-400">
            {method === 'biometric' ? 'Use your biometric to continue' : 'Enter your 6-digit passcode'}
          </p>
        </div>

        {method === 'passcode' ? (
          <div className="space-y-6">
            {/* Passcode Display */}
            <div>
              <div className="flex justify-center gap-2 sm:gap-3 mb-4">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <div
                    key={index}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center border-2 border-gray-200 dark:border-gray-600 transition-all"
                  >
                    {passcode[index] ? (
                      showPasscode ? (
                        <span className="text-xl sm:text-2xl text-gray-900 dark:text-white">{passcode[index]}</span>
                      ) : (
                        <div className="w-3 h-3 rounded-full bg-purple-600" />
                      )
                    ) : null}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowPasscode(!showPasscode)}
                className="mx-auto flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
              >
                {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPasscode ? 'Hide' : 'Show'} Passcode
              </button>
            </div>

            {/* Numeric Keypad */}
            <div className="space-y-2 sm:space-y-3">
              {/* Numbers 1-9 in 3x3 grid */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleKeypadPress(num.toString())}
                    disabled={passcode.length >= 6}
                    className="aspect-square rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95 transition-all text-2xl text-gray-900 dark:text-white disabled:opacity-50"
                  >
                    {num}
                  </button>
                ))}
              </div>

              {/* Bottom row with fingerprint, 0, and delete */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {hasBiometric ? (
                  <button
                    onClick={() => {
                      setMethod('biometric');
                      setPasscode('');
                      setError('');
                      setTimeout(() => handleBiometricAuth(), 500);
                    }}
                    className="aspect-square rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 active:scale-95 transition-all flex items-center justify-center"
                    title="Switch to Biometric"
                  >
                    <Fingerprint className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </button>
                ) : (
                  <button
                    className="aspect-square rounded-xl bg-gray-300 dark:bg-gray-600 cursor-not-allowed opacity-50 transition-all flex items-center justify-center"
                    title="Biometric not enabled"
                    disabled
                  >
                    <Fingerprint className="w-6 h-6 sm:w-7 sm:h-7 text-gray-500 dark:text-gray-400" />
                  </button>
                )}
                <button
                  onClick={() => handleKeypadPress('0')}
                  disabled={passcode.length >= 6}
                  className="aspect-square rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95 transition-all text-2xl text-gray-900 dark:text-white disabled:opacity-50"
                >
                  0
                </button>
                <button
                  onClick={() => handleKeypadDelete()}
                  className="aspect-square rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-900/30 active:scale-95 transition-all flex items-center justify-center"
                >
                  <Delete className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            <Button
              size="lg"
              onClick={handlePasscodeAuth}
              disabled={passcode.length !== 6}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              Verify Passcode
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={handleBiometricAuth}
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

            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {hasPasscode && (
              <button
                onClick={() => {
                  setMethod('passcode');
                  setError('');
                }}
                className="w-full p-4 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl transition-all text-center"
              >
                Use Passcode Instead
              </button>
            )}

            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              This is a simulated biometric authentication. In a real app, this would use your device's biometric sensors.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
