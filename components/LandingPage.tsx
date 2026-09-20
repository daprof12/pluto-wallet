import { Chrome, Download, ArrowRight, LogOut, ChevronDown, Moon, Sun, Shield } from 'lucide-react';
import { Button } from './ui/button';
import Logo from './Logo';
import { useState, useRef, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import PWAInstallModal from './PWAInstallModal';
import { storage, storageSync } from '../utils/platform';
import svgPaths from "../imports/svg-yqnuw3xv95";
import imgBtcWrappedBtc from "../assets/btc.png";
import imgEthEtherPortal from "../assets/eth.png";
import imgSolSolPortal from "../assets/sol.png";
import imgWbnbWrappedBnb from "../assets/bnb.png";
import imgUsDtTetherToken from "../assets/usdt.png";
import imgSend2Go9UiMl1Mp4 from "../assets/send_2GO9uiMl-1.png";
import imgAutosignUJxVbonYMp4 from "../assets/Blur.png";
import imgMultipleAccounts932ZuZ9F1Mp4 from "../assets/asset.png";
import imgDappsConnect1Mp4 from "../assets/blur.png";
import imgImagem20250611165751009Png from "../assets/blur.png";
import imgNewDappsImage from "../assets/Background.png";

interface LandingPageProps {
  onGetStarted: () => void;
  onAccessWallet: () => void;
  onAdminAccess: () => void;
  isLoggedIn?: boolean;
  userEmail?: string;
  onViewWallet?: () => void;
  onLogout?: () => void;
  onLogoClick?: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  onPrivacyClick?: () => void;
}

export default function LandingPage({
  onGetStarted,
  onAccessWallet,
  onAdminAccess,
  isLoggedIn = false,
  userEmail = '',
  onViewWallet,
  onLogout,
  onLogoClick,
  darkMode: darkModeProp,
  onToggleDarkMode,
  onPrivacyClick
}: LandingPageProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showPWAModal, setShowPWAModal] = useState(false);

  // Use prop darkMode if provided, otherwise use local state
  const darkMode = darkModeProp !== undefined ? darkModeProp : (() => {
    const saved = storageSync.get('darkMode');
    return saved !== null ? saved : true;
  })();

  // Use prop toggle function if provided, otherwise manage locally
  const toggleDarkMode = onToggleDarkMode || (() => {
    const newMode = !darkMode;
    storage.set('darkMode', newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  });

  // PWA Install Hook
  const { isInstallable, isInstalled, isIOS, installPWA, canInstall } = usePWAInstall();

  // Handle PWA Install
  const handlePWAInstall = async () => {
    if (canInstall) {
      // Try to install directly (Android/Desktop)
      const installed = await installPWA();
      if (!installed) {
        // If installation failed or was dismissed, show instructions
        setShowPWAModal(true);
      }
    } else {
      // Show instructions modal (iOS or already installed)
      setShowPWAModal(true);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Get user initials for avatar
  const getUserInitials = (email: string) => {
    if (!email) return 'U';
    const parts = email.split('@');
    const name = parts[0];
    return name.substring(0, 2).toUpperCase();
  };

  const supportedChains = [
    { name: 'Bitcoin', symbol: 'BTC', img: imgBtcWrappedBtc },
    { name: 'Ethereum', symbol: 'ETH', img: imgEthEtherPortal },
    { name: 'Solana', symbol: 'SOL', img: imgSolSolPortal },
    { name: 'BNB Chain', symbol: 'BNB', img: imgWbnbWrappedBnb },
    { name: 'USDT', symbol: 'USDT', img: imgUsDtTetherToken }
  ];

  const features = [
    {
      title: 'Send and receive multiple NFTs',
      description: 'Instantly Send and Receive Tokens and NFTs that are supported on the Klever Blockchain. Collect and view your NFTs in a section dedicated to showcasing all your digital collectibles.',
      image: imgSend2Go9UiMl1Mp4,
      bgColor: 'bg-cyan-300 dark:bg-cyan-400'
    },
    {
      title: 'AutoSign Feature',
      description: 'The Autosign Feature allows you to complete multiple transfers or sales easily, with a trusted, time-limited transaction auto-approval.',
      image: imgAutosignUJxVbonYMp4,
      bgColor: 'bg-yellow-300 dark:bg-yellow-400'
    },
    {
      title: 'Multiple Accounts, Multiple Opportunities',
      description: 'Manage multiple accounts from one wallet, making it easy to organize your investments and track your portfolio, simplifying your investments.',
      image: imgMultipleAccounts932ZuZ9F1Mp4,
      bgColor: 'bg-orange-200 dark:bg-orange-300'
    }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? 'bg-[#1a2332] dark' : 'bg-gray-50'}`}>
      {/* Header/Navigation */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-[#1a2332]/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800/50">
        <div className="container mx-auto px-4 py-6">
          <nav className="flex items-center justify-between">
            <Logo
              size="sm"
              showText={true}
              variant="gradient-text"
              textClassName="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"
              onClick={onLogoClick}
            />
            <div className="flex items-center gap-4">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
                aria-label="Toggle dark mode"
              >
                {darkMode ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-700" />
                )}
              </button>
              <button
                onClick={onAdminAccess}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-gray-700 hover:text-purple-600 dark:text-gray-300 dark:hover:text-purple-400 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                Admin
              </button>

              {isLoggedIn ? (
                <div className="relative" ref={dropdownRef}>
                  {/* User Avatar Button */}
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-3 px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 transition-all shadow-md hover:shadow-lg border border-gray-300 dark:border-gray-700"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white shadow-md">
                      <span className="text-sm">{getUserInitials(userEmail)}</span>
                    </div>
                    <div className="hidden sm:block text-left">
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-300">{userEmail.split('@')[0]}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">My Wallet</div>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''
                        }`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                      {/* User Info Header */}
                      <div className="px-4 py-3 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white shadow-md">
                            <span className="text-sm">{getUserInitials(userEmail)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{userEmail}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Active Wallet</div>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        <button
                          onClick={() => {
                            setShowDropdown(false);
                            onViewWallet?.();
                          }}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">View Wallet</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Access your wallet</div>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            setShowDropdown(false);
                            onLogout?.();
                          }}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left border-t border-gray-200 dark:border-gray-700"
                        >
                          <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <LogOut className="w-4 h-4 text-red-600 dark:text-red-400" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-red-600 dark:text-red-400">Log Out</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Lock your wallet</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={onAccessWallet}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 transition-colors"
                >
                  Open Wallet
                </button>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-12 md:pt-20 pb-6 md:pb-10 text-center relative z-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl lg:text-6xl mb-4 text-gray-900 dark:text-white">
            Your Gateway to
            <span className="block bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent mt-2">
              Multi-Chain Finance
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            One wallet for all your crypto needs. Secure, fast, and beautiful. Manage Bitcoin, Ethereum, Solana, and more from a single interface.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button
              onClick={onGetStarted}
              className="px-8 py-3 rounded-lg bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 text-lg"
            >
              Create Wallet
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={onAccessWallet}
              className="px-8 py-3 rounded-lg bg-white text-gray-900 hover:bg-gray-100 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 transition-colors border border-gray-300 dark:border-gray-700 text-lg"
            >
              Import Wallet
            </button>
          </div>

          {/* Browser Extensions */}
          <div className="flex flex-wrap gap-4 justify-center items-center text-sm text-gray-600 dark:text-gray-400">
            <span>Available for:</span>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors shadow-sm border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200">
              <Chrome className="w-4 h-4" />
              Chrome
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors shadow-sm border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200">
              <Download className="w-4 h-4" />
              Firefox
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors shadow-sm border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200">
              <Download className="w-4 h-4" />
              Edge
            </button>
            <button
              onClick={handlePWAInstall}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors shadow-sm border ${isInstalled
                ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-300 cursor-default'
                : 'bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-300 hover:from-purple-200 hover:to-blue-200 dark:hover:from-purple-800/40 dark:hover:to-blue-800/40'
                }`}
              disabled={isInstalled}
            >
              <Download className="w-4 h-4" />
              {isInstalled ? 'Installed' : 'PWA'}
            </button>
          </div>
        </div>
      </section>

      {/* Multi-Chain Support Section */}
      <section className="container mx-auto px-4 pt-6 md:pt-8 pb-12 md:pb-16">
        <h2 className="text-2xl md:text-3xl text-center mb-8 md:mb-12 text-gray-900 dark:text-white">
          Multi-Chain Support
        </h2>
        <div className="flex flex-wrap justify-center gap-4 md:gap-6 max-w-5xl mx-auto">
          {supportedChains.map((chain) => (
            <div
              key={chain.symbol}
              className="flex items-center gap-3 px-4 md:px-6 py-3 md:py-4 rounded-xl bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all hover:bg-gray-50 dark:hover:bg-gray-750 border border-gray-200 dark:border-gray-700"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <img src={chain.img} alt={chain.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="text-gray-900 dark:text-white">{chain.name}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{chain.symbol}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Elevate Your Web3 Experience */}
      <section className="container mx-auto px-4 pt-6 md:pt-8 pb-12 md:pb-16">
        <h2 className="text-2xl md:text-3xl lg:text-4xl text-center mb-4 text-gray-900 dark:text-white">
          Elevate Your Web3 Experience with a Multi-Chain Crypto Wallet
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8 md:mb-12 max-w-3xl mx-auto">
          Navigate seamlessly with Klever Wallet, securing your private keys while accessing all Blockchain Networks through a user-friendly gateway and more.
        </p>
        <div className="text-center mb-12">
          <button
            onClick={onGetStarted}
            className="px-8 py-3 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
          >
            Get started w/ Downloads
          </button>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`${feature.bgColor} rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all transform hover:scale-105`}
            >
              <div className="p-6">
                <h3 className="text-xl mb-3 text-gray-900 font-bold">
                  {feature.title}
                </h3>
                <p className="text-gray-800 text-sm mb-4">
                  {feature.description}
                </p>
              </div>
              <div className="relative h-48 md:h-56 overflow-hidden">
                <img
                  src={feature.image}
                  alt={feature.title}
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Seamless dApps Connection */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-3xl overflow-hidden shadow-2xl border border-purple-200 dark:border-purple-700/30 max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="p-8 md:p-12">
              <h2 className="text-3xl md:text-4xl mb-4 text-gray-900 dark:text-white">
                Seamless dApps Connection
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                Experience hassle-free Web3 Application interaction as you can interact with Blockchain Apps via the most popular app store of each operating system. Explore your favorite DApps with ease.
              </p>
            </div>
            <div className="relative h-64 md:h-96">
              <img
                src={imgNewDappsImage}
                alt="Seamless dApps Connection"
                className="w-full h-full object-cover object-center"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Features Section */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Feature 1 */}
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl mb-2 text-gray-900 dark:text-white">Ethereum Blockchain</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Explore, transact, and interact with the entire Ethereum ecosystem.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl mb-2 text-gray-900 dark:text-white">Efficient Ethereum Gas Handling</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Track and forecast gas fees before transactions.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl mb-2 text-gray-900 dark:text-white">Web3 Domains</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Create and manage your Web3 identity with custom domains.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 pt-8 md:pt-10 pb-16 md:pb-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl mb-4 text-gray-900 dark:text-white">
            Join millions of users managing their crypto with Pluto Wallet. Safe Anywhere. Your Security, Our Priority
          </h2>
          <h3 className="text-xl md:text-2xl mb-8 text-gray-800 dark:text-white">
            Ready to Get Started?
          </h3>
          <button
            onClick={onGetStarted}
            className="px-8 py-4 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl text-lg"
          >
            Create Your Wallet
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-gray-200 dark:border-gray-800">
        <div className="text-center text-gray-600 dark:text-gray-400">
          <p>© 2025 Pluto Wallet. All rights reserved.</p>
          <p
            onClick={onAdminAccess}
            className="text-sm mt-2 cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
          >
            Version 8.0 | Q2 2026 Launch
          </p>
          {onPrivacyClick && (
            <p
              onClick={onPrivacyClick}
              className="text-sm mt-3 cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition-colors underline"
            >
              Privacy Policy
            </p>
          )}
        </div>
      </footer>

      {/* PWA Install Modal */}
      <PWAInstallModal
        isOpen={showPWAModal}
        onClose={() => setShowPWAModal(false)}
        isIOS={isIOS}
      />
    </div>
  );
}