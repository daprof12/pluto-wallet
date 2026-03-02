# 📦 Pluto Wallet - Complete Installation Guide

This guide will walk you through setting up Pluto Wallet on your local machine, from export to running the app.

---

## 📋 Table of Contents

1. [System Requirements](#system-requirements)
2. [Quick Install (5 Minutes)](#quick-install-5-minutes)
3. [Detailed Installation](#detailed-installation)
4. [Verify Installation](#verify-installation)
5. [Troubleshooting](#troubleshooting)
6. [Next Steps](#next-steps)

---

## 🖥️ System Requirements

### **Minimum:**
- **Operating System:** Windows 10+, macOS 10.15+, or Linux
- **Node.js:** Version 18.0 or higher
- **RAM:** 4GB minimum
- **Disk Space:** 500MB free space
- **Internet:** Required for initial setup

### **Recommended:**
- **Node.js:** Version 20 LTS
- **RAM:** 8GB or more
- **Disk Space:** 2GB free space
- **Browser:** Chrome, Firefox, Safari, or Edge (latest version)

### **For Native App Development:**

**iOS Development (Mac only):**
- macOS 12.0 or later
- Xcode 15 or later (free from App Store)
- Apple Developer Account ($99/year)
- 20GB disk space for Xcode

**Android Development (Any OS):**
- Android Studio (latest version)
- JDK 17
- 10GB disk space for Android Studio
- Google Play Console account ($25 one-time)

---

## ⚡ Quick Install (5 Minutes)

### **Step 1: Install Node.js**

**Check if already installed:**
```bash
node --version
npm --version
```

If you see version numbers (e.g., `v20.10.0`), skip to Step 2.

**If not installed:**

- **Windows/Mac:** Download from https://nodejs.org (choose LTS version)
- **Linux (Ubuntu/Debian):**
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```

- **macOS (Homebrew):**
  ```bash
  brew install node
  ```

### **Step 2: Extract Project**

Extract the Pluto Wallet files to your desired location:

```bash
# Example: Extract to Documents
cd ~/Documents
# (Extract the zip file here)
cd pluto-wallet
```

### **Step 3: Install Dependencies**

```bash
npm install
```

This will take 2-5 minutes. You'll see a progress bar.

### **Step 4: Start Development Server**

```bash
npm run dev
```

You should see:
```
  VITE v5.0.8  ready in 2345 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.100:5173/
  ➜  press h to show help
```

### **Step 5: Open in Browser**

Open your browser and go to: **http://localhost:5173**

🎉 **Success!** You should see the Pluto Wallet landing page.

---

## 📖 Detailed Installation

### **1. Install Node.js & npm**

#### **Windows:**

1. Download installer: https://nodejs.org/en/download/
2. Run the installer (choose "Recommended" settings)
3. Restart your computer
4. Verify installation:
   ```cmd
   node --version
   npm --version
   ```

#### **macOS:**

**Option A: Official Installer**
1. Download from: https://nodejs.org
2. Run `.pkg` file
3. Follow installation wizard
4. Verify in Terminal:
   ```bash
   node --version
   npm --version
   ```

**Option B: Homebrew (Recommended)**
```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node

# Verify
node --version
npm --version
```

#### **Linux (Ubuntu/Debian):**

```bash
# Update package list
sudo apt update

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
npm --version
```

#### **Linux (Fedora/RHEL/CentOS):**

```bash
# Install Node.js 20
sudo dnf module install nodejs:20

# Verify
node --version
npm --version
```

---

### **2. Extract/Clone Project**

#### **If you downloaded a ZIP:**

1. Extract the ZIP file to your preferred location:
   - **Windows:** Right-click → Extract All
   - **Mac:** Double-click the ZIP
   - **Linux:** `unzip pluto-wallet.zip`

2. Navigate to the folder:
   ```bash
   cd pluto-wallet
   ```

#### **If using Git:**

```bash
# Clone repository (if applicable)
git clone <repository-url>
cd pluto-wallet
```

---

### **3. Install Dependencies**

```bash
npm install
```

**What this does:**
- Downloads all required packages (~200 packages)
- Installs React, TypeScript, Tailwind CSS
- Installs Capacitor for native apps
- Sets up development tools

**Expected output:**
```
added 842 packages, and audited 843 packages in 2m

127 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

**If you see warnings about vulnerabilities:**
```bash
# Run audit fix (safe)
npm audit fix

# If still warnings, it's usually safe to ignore for development
```

---

### **4. Start Development Server**

```bash
npm run dev
```

**Expected output:**
```
  VITE v5.0.8  ready in 2345 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.100:5173/
  ➜  press h + enter to show help
```

**What this means:**
- ✅ Server is running
- ✅ App is available at `http://localhost:5173`
- ✅ Also accessible on your local network (useful for mobile testing)

**Keep this terminal window open!** Closing it will stop the server.

---

### **5. Open in Browser**

1. Open your browser
2. Navigate to: `http://localhost:5173`
3. You should see the Pluto Wallet landing page

**Supported browsers:**
- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Brave

---

## ✅ Verify Installation

### **Check 1: Landing Page**
- [ ] Landing page loads without errors
- [ ] Animations work smoothly
- [ ] Dark/Light mode toggle works

### **Check 2: Create Wallet**
- [ ] Click "Create New Wallet"
- [ ] Set PIN: `1234`
- [ ] Recovery phrase is generated
- [ ] Can proceed to 2FA setup

### **Check 3: Admin Portal**
- [ ] Click "Admin Portal" button
- [ ] Login with:
  - Email: `admin@pluto.io`
  - Password: `Admin@123`
- [ ] Admin dashboard loads

### **Check 4: PWA Features**
- [ ] Open DevTools (F12)
- [ ] Go to Application tab
- [ ] Check "Service Workers" - should see registered worker

### **Check 5: Hot Reload**
- [ ] Open `App.tsx` in editor
- [ ] Change some text
- [ ] Save file
- [ ] Browser should auto-reload with changes

**All checks passed?** ✅ Installation successful!

---

## 🐛 Troubleshooting

### **Issue: `npm install` fails**

**Error: `EACCES: permission denied`**

**Solution:**
```bash
# Don't use sudo! Instead, fix npm permissions:
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
npm install
```

**Error: `ERESOLVE unable to resolve dependency tree`**

**Solution:**
```bash
# Use legacy peer deps
npm install --legacy-peer-deps
```

---

### **Issue: Port 5173 already in use**

**Error:** `Port 5173 is already in use`

**Solution 1: Kill the process**
```bash
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5173 | xargs kill -9
```

**Solution 2: Use different port**

Edit `vite.config.ts`:
```typescript
server: {
  port: 3000,  // Change to any available port
  host: true
}
```

Then run `npm run dev` again.

---

### **Issue: "Module not found" errors**

**Solution:**
```bash
# Clear everything and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

---

### **Issue: TypeScript errors**

**Solution:**
```bash
# Restart TypeScript server in VSCode
# Press: Ctrl+Shift+P (Cmd+Shift+P on Mac)
# Type: "TypeScript: Restart TS Server"

# Or rebuild
npm run build
```

---

### **Issue: Browser shows blank page**

**Check browser console (F12) for errors**

**Common fixes:**
```bash
# 1. Hard refresh
Ctrl+Shift+R (Cmd+Shift+R on Mac)

# 2. Clear browser cache
# In DevTools: Right-click refresh button → Empty Cache and Hard Reload

# 3. Try different browser

# 4. Rebuild
npm run build
npm run preview
```

---

### **Issue: Styles not loading**

**Solution:**
```bash
# Rebuild Tailwind CSS
rm -rf dist
npm run dev
```

---

### **Issue: Vite shows "Optimizing dependencies"**

This is normal on first run. Wait 10-30 seconds.

If it hangs:
```bash
# Stop server (Ctrl+C)
# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

---

## 🔄 Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build

# Native (after Capacitor setup)
npm run native:setup     # Initialize Capacitor
npm run ios             # Open in Xcode
npm run android         # Open in Android Studio
npm run cap:sync        # Sync web → native

# Maintenance
npm install             # Install dependencies
npm update              # Update dependencies
npm audit fix           # Fix vulnerabilities
npm cache clean --force # Clear npm cache
```

---

## 📁 Folder Structure

After installation, you should have:

```
pluto-wallet/
├── node_modules/          # Dependencies (auto-generated)
├── public/               # Static files
│   ├── icons/           # App icons
│   └── manifest.json    # PWA manifest
├── src/                 # Source code
│   ├── components/      # React components
│   ├── utils/          # Utilities
│   ├── hooks/          # Custom hooks
│   ├── styles/         # CSS files
│   └── App.tsx         # Main app
├── docs/               # Documentation
├── package.json        # Dependencies list
├── vite.config.ts      # Vite config
├── capacitor.config.ts # Capacitor config
└── README.md           # Overview
```

---

## 🚀 Next Steps

Now that installation is complete:

### **1. Explore the App**
- Create a test wallet
- Try Send/Receive/Swap features
- Test admin dashboard
- Enable dark mode

### **2. Review Documentation**
- [README.md](README.md) - Overview
- [QUICK_START_NATIVE.md](QUICK_START_NATIVE.md) - Native apps
- [NATIVE_APP_DEPLOYMENT.md](docs/NATIVE_APP_DEPLOYMENT.md) - Publishing

### **3. Finish localStorage Migration**

**Important:** Only 20% of localStorage calls have been converted to native storage.

Follow: [LOCALSTORAGE_MIGRATION_COMPLETE.md](docs/LOCALSTORAGE_MIGRATION_COMPLETE.md)

**Quick summary:**
```typescript
// Update all files to use:
import { storage } from './utils/platform';

// Instead of:
localStorage.getItem('key')
// Use:
await storage.get('key')
```

### **4. Set Up for Native (Optional)**

To build iOS/Android apps:

```bash
# Install Capacitor
npm run native:setup

# This will:
# - Initialize Capacitor
# - Add iOS platform (Mac only)
# - Add Android platform

# Then:
npm run ios      # Open Xcode (Mac)
npm run android  # Open Android Studio
```

See: [NATIVE_APP_DEPLOYMENT.md](docs/NATIVE_APP_DEPLOYMENT.md)

### **5. Customize**

- Change app name in `capacitor.config.ts`
- Update colors in `styles/globals.css`
- Add your own icons in `public/icons/`
- Modify assets in `utils/assetConfig.ts`

---

## 💡 Development Tips

### **Hot Reload**
Vite automatically reloads when you save files. No need to refresh manually!

### **Debug Tools**
```bash
# Open browser DevTools: F12 (Cmd+Option+I on Mac)
# React DevTools: Install extension from Chrome Web Store
# Vue DevTools: Also useful for debugging
```

### **VSCode Extensions (Recommended)**
- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- TypeScript Error Translator
- Prettier - Code formatter
- ESLint

### **Performance**
```bash
# If dev server is slow:
# 1. Close other apps
# 2. Increase Node memory:
export NODE_OPTIONS="--max-old-space-size=4096"
npm run dev
```

---

## 📊 Build Sizes

**Development:** ~15MB (uncompressed, with source maps)
**Production:** ~500KB (compressed, optimized)

```bash
# Check production build size
npm run build
ls -lh dist/assets/
```

---

## 🆘 Need More Help?

### **Check Documentation:**
- [README.md](README.md)
- [docs/](docs/) folder
- [QUICK_START_NATIVE.md](QUICK_START_NATIVE.md)

### **Common Issues:**
- Module errors → Delete `node_modules`, reinstall
- Port in use → Change port in `vite.config.ts`
- Build errors → Clear cache, rebuild
- Styles broken → Restart dev server

### **Still Stuck?**

1. Check browser console (F12) for errors
2. Check terminal for error messages
3. Try in different browser
4. Restart computer (seriously, sometimes helps!)

---

## ✅ Installation Complete!

You now have Pluto Wallet running locally! 🎉

**Summary:**
- ✅ Node.js installed
- ✅ Dependencies installed
- ✅ Dev server running
- ✅ App accessible at http://localhost:5173
- ✅ Ready for development

**What's next?**
1. **Explore the app**
2. **Read documentation**
3. **Finish localStorage migration**
4. **Build native apps**
5. **Deploy to production**

**Happy coding!** 🚀

---

<div align="center">

Made with ❤️ by the Pluto Wallet Team

**[Back to README](README.md)**

</div>
