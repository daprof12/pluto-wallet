# 🚀 Pluto Multi-Chain Wallet

<div align="center">

![Pluto Wallet](public/icons/icon-192x192.png)

**A beautiful hybrid custodial/non-custodial cryptocurrency wallet**

Supporting BTC • ETH • SOL • BNB • TRON

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Deploy](#-deploy-to-native)

</div>

---

## 📱 What is Pluto Wallet?

Pluto Wallet is a **full-featured cryptocurrency wallet** built with React, TypeScript, and Tailwind CSS. It works as:

- 🌐 **Progressive Web App (PWA)** - Install on any device
- 🍎 **iOS Native App** - Publish to App Store
- 🤖 **Android Native App** - Publish to Play Store

**All from ONE codebase!**

---

## ✨ Features

### **User Features:**
- ✅ Multi-chain support (BTC, ETH, SOL, BNB, TRON)
- ✅ Send, Receive, Swap, Buy crypto
- ✅ Real-time price tracking (CoinGecko API)
- ✅ Transaction history
- ✅ QR code generation
- ✅ Gas fee warnings
- ✅ 2FA authentication
- ✅ Biometric support (Face ID, Touch ID)
- ✅ Support ticket system
- ✅ Live chat support
- ✅ Dark/Light mode
- ✅ PWA offline support

### **Admin Features:**
- ✅ Full user management dashboard
- ✅ Balance adjustments
- ✅ User blocking/unblocking
- ✅ Fee configuration
- ✅ Transaction monitoring
- ✅ Support ticket management
- ✅ Live chat management
- ✅ Audit logs
- ✅ User analytics

### **Technical Features:**
- ✅ Cross-platform storage (works on web + native)
- ✅ Encrypted mnemonic storage
- ✅ Professional UI (Klever-inspired)
- ✅ Responsive design
- ✅ TypeScript
- ✅ Tailwind CSS v4
- ✅ Shadcn/ui components
- ✅ PWA with service worker

---

## 🚀 Quick Start

### **Prerequisites:**

- Node.js 18+ ([Download](https://nodejs.org))
- npm or yarn
- Git

### **Installation:**

```bash
# 1. Clone or extract the project
cd pluto-wallet

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Open browser
# Navigate to: http://localhost:5173
```

**That's it!** The app should now be running locally.

---

## 🎮 Demo Credentials

### **Admin Dashboard:**
- **URL:** Click "Admin Portal" on landing page
- **Email:** `admin@pluto.io`
- **Password:** `Admin@123`

### **Create Test Wallet:**
1. Click "Create New Wallet"
2. Set up PIN
3. Save recovery phrase
4. Set up 2FA (optional)

---

## 📂 Project Structure

```
pluto-wallet/
├── public/              # Static assets
│   ├── icons/          # App icons (PWA, iOS, Android)
│   └── manifest.json   # PWA manifest
│
├── src/
│   ├── components/     # React components
│   │   ├── ui/        # Shadcn/ui components
│   │   └── wallet/    # Wallet-specific components
│   │
│   ├── utils/         # Utilities
│   │   ├── platform.ts        # ⭐ Cross-platform storage
│   │   ├── storageHelpers.ts  # Storage convenience functions
│   │   └── assetConfig.ts     # Asset configuration
│   │
│   ├── hooks/         # Custom React hooks
│   ├── styles/        # Global styles
│   └── App.tsx        # Main app component
│
├── docs/              # Documentation
│   ├── LOCALSTORAGE_MIGRATION_COMPLETE.md
│   ├── NATIVE_APP_DEPLOYMENT.md
│   ├── CAPACITOR_QUICK_START.md
│   └── ...
│
├── package.json       # Dependencies
├── vite.config.ts     # Vite configuration
├── capacitor.config.ts # Capacitor configuration
└── README.md          # This file
```

---

## 🛠️ Available Scripts

### **Development:**
```bash
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Build for production
npm run preview      # Preview production build
```

### **Native App (Capacitor):**
```bash
# First time setup
npm run native:setup  # Initialize Capacitor + add iOS & Android

# Development workflow
npm run ios          # Build and open in Xcode
npm run android      # Build and open in Android Studio

# Manual commands
npm run cap:sync     # Sync web code to native projects
npm run cap:open:ios     # Open Xcode
npm run cap:open:android # Open Android Studio
```

---

## 🌐 Deploy as PWA (Web)

### **Option 1: Vercel (Recommended)**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### **Option 2: Netlify**
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

### **Option 3: GitHub Pages**
See: [PWA_INSTALL_GUIDE.md](docs/PWA_INSTALL_GUIDE.md)

---

## 📱 Deploy to Native

### **iOS App Store:**

**Requirements:**
- Mac computer
- Xcode 15+
- Apple Developer Account ($99/year)

**Steps:**
1. Install Capacitor: `npm run native:setup`
2. Open Xcode: `npm run ios`
3. Configure signing & certificates
4. Build and archive
5. Upload to App Store Connect
6. Submit for review

**Full guide:** [NATIVE_APP_DEPLOYMENT.md](docs/NATIVE_APP_DEPLOYMENT.md)

---

### **Google Play Store:**

**Requirements:**
- Any computer (Windows, Mac, Linux)
- Android Studio
- Google Play Console account ($25 one-time)

**Steps:**
1. Install Capacitor: `npm run native:setup`
2. Open Android Studio: `npm run android`
3. Generate signing key
4. Build signed AAB
5. Upload to Play Console
6. Submit for review

**Full guide:** [NATIVE_APP_DEPLOYMENT.md](docs/NATIVE_APP_DEPLOYMENT.md)

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [INSTALL.md](INSTALL.md) | Detailed installation guide |
| [QUICK_START_NATIVE.md](QUICK_START_NATIVE.md) | Native app quick start |
| [LOCALSTORAGE_MIGRATION_COMPLETE.md](docs/LOCALSTORAGE_MIGRATION_COMPLETE.md) | Storage migration guide |
| [NATIVE_APP_DEPLOYMENT.md](docs/NATIVE_APP_DEPLOYMENT.md) | Publishing to app stores |
| [CAPACITOR_QUICK_START.md](docs/CAPACITOR_QUICK_START.md) | Capacitor reference |
| [CROSS_PLATFORM_SYNC_GUIDE.md](docs/CROSS_PLATFORM_SYNC_GUIDE.md) | Cloud sync setup |
| [PWA_INSTALL_GUIDE.md](docs/PWA_INSTALL_GUIDE.md) | PWA installation |

---

## 🔧 Configuration

### **Capacitor (Native Apps):**

Edit `capacitor.config.ts`:
```typescript
{
  appId: 'com.plutowallet.app',    // Change this!
  appName: 'Pluto Wallet',
  webDir: 'dist'
}
```

### **PWA (Web):**

Edit `vite.config.ts` → `VitePWA` section:
```typescript
{
  manifest: {
    name: 'Pluto Multi-Chain Wallet',
    short_name: 'Pluto Wallet',
    // ...
  }
}
```

---

## 🎨 Customization

### **Colors:**

Edit `styles/globals.css`:
```css
:root {
  --primary: 262.1 83.3% 57.8%;  /* Purple */
  --secondary: 220 14.3% 95.9%;
  /* ... */
}
```

### **Supported Assets:**

Edit `utils/assetConfig.ts`:
```typescript
export const defaultAssets = [
  { symbol: 'BTC', name: 'Bitcoin', enabled: true },
  { symbol: 'ETH', name: 'Ethereum', enabled: true },
  // Add more...
];
```

---

## 🔐 Security Notes

⚠️ **Important:**

1. **This is a demo/template** - Not production-ready for real crypto
2. **Private keys** are stored locally (encrypted with PIN)
3. **Admin credentials** are hardcoded (change in production!)
4. **No real blockchain integration** - Mock transactions only
5. **File-based storage** - Not suitable for production at scale

**For production:**
- Implement real blockchain integration
- Use proper backend authentication
- Implement HSM for key management
- Add proper encryption
- Use real database
- Implement KYC/AML
- Add proper security audits

---

## 🐛 Troubleshooting

### **"Module not found" errors:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### **Port 5173 already in use:**
```bash
# Edit vite.config.ts, change port:
server: { port: 3000 }
```

### **Capacitor not working:**
```bash
# Reinstall Capacitor
npm uninstall @capacitor/core @capacitor/cli
npm install @capacitor/core @capacitor/cli
npx cap sync
```

### **Build errors:**
```bash
# Clear cache and rebuild
rm -rf dist node_modules
npm install
npm run build
```

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License**.

See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- **Figma Make** - For the development environment
- **Shadcn/ui** - For beautiful components
- **Tailwind CSS** - For styling
- **Capacitor** - For native app support
- **CoinGecko** - For crypto price data
- **Klever Wallet** - For UI inspiration

---

## 📞 Support

- 📧 Email: support@plutowallet.com
- 💬 Discord: [Join our community](#)
- 🐦 Twitter: [@PlutoWallet](#)
- 📖 Docs: [Full documentation](docs/)

---

## 🗺️ Roadmap

- [ ] Complete localStorage migration (93 calls remaining)
- [ ] Real blockchain integration
- [ ] Hardware wallet support
- [ ] WalletConnect integration
- [ ] DApp browser
- [ ] NFT support
- [ ] Staking features
- [ ] Multi-language support
- [ ] Desktop apps (Electron)

---

## ⭐ Star History

If you find this project useful, please consider giving it a star! ⭐

---

<div align="center">

Made with ❤️ by the Pluto Wallet Team

**[Website](#) • [Twitter](#) • [Discord](#)**

</div>
