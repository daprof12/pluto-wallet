# Exporting from Figma Make and Publishing to App Stores

## Current Situation

You're developing in **Figma Make** (web-based React environment).

**What you CAN'T do from here:**
- ❌ Build iOS apps (requires macOS + Xcode)
- ❌ Build Android apps (requires Android Studio)
- ❌ Submit to App Store (requires Mac)
- ❌ Submit to Play Store (requires signing tools)

**What you CAN do:**
- ✅ Download all your code
- ✅ Set up locally on your computer
- ✅ Build and publish from there

---

## Step-by-Step: From Here to App Stores

### **Phase 1: Export Your Code (5 minutes)**

#### **Option A: Download as ZIP**

1. Look for "Export" or "Download" button in Figma Make
2. Download all files as ZIP
3. Extract to your computer

#### **Option B: Manual Copy (if no export)**

Since you have access to all files, you'll need to:

1. **Create a new folder on your computer:**
   ```bash
   mkdir pluto-wallet
   cd pluto-wallet
   ```

2. **Initialize a new React project:**
   ```bash
   npm create vite@latest . -- --template react-ts
   ```

3. **Copy all your files manually:**
   - Copy all `/components/*.tsx` files
   - Copy all `/utils/*.ts` files
   - Copy all `/hooks/*.ts` files
   - Copy `/App.tsx`
   - Copy `/styles/globals.css`
   - Copy all `/public/*` files
   - Copy any other custom files

4. **Install dependencies:**
   ```bash
   npm install
   npm install lucide-react recharts react-slick
   # Add all other packages you used
   ```

5. **Test locally:**
   ```bash
   npm run dev
   # Open http://localhost:5173
   # Verify everything works
   ```

---

### **Phase 2: Set Up Your Local Environment**

#### **For iOS (Requires Mac):**

**Requirements:**
- 💻 **Mac computer** (MacBook, iMac, Mac Mini)
  - Cannot build iOS apps on Windows or Linux
  - Need macOS 12.0 or later
  
**Install Required Software:**

1. **Xcode** (Free, ~12GB)
   ```bash
   # Download from Mac App Store
   # Or: https://developer.apple.com/xcode/
   
   # After install, run:
   sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
   sudo xcodebuild -runFirstLaunch
   ```

2. **Node.js** (if not installed)
   ```bash
   # Download from https://nodejs.org
   # Or use Homebrew:
   brew install node
   ```

3. **CocoaPods** (iOS dependency manager)
   ```bash
   sudo gem install cocoapods
   ```

#### **For Android (Works on Mac, Windows, Linux):**

**Install Required Software:**

1. **Android Studio** (Free, ~3GB)
   - Download: https://developer.android.com/studio
   - Install and run
   - Follow setup wizard
   - Install Android SDK (API 33)

2. **Java Development Kit (JDK)**
   ```bash
   # Mac:
   brew install openjdk@17
   
   # Windows:
   # Download from https://adoptium.net/
   
   # Linux:
   sudo apt install openjdk-17-jdk
   ```

3. **Set Environment Variables (Windows/Linux):**
   ```bash
   # Add to ~/.bashrc or ~/.zshrc (Mac/Linux)
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/tools/bin
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   
   # Windows: Set in System Environment Variables
   ANDROID_HOME=C:\Users\YourName\AppData\Local\Android\Sdk
   ```

---

### **Phase 3: Install Capacitor (10 minutes)**

Once your code is running locally:

```bash
# 1. Install Capacitor
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
npm install @capacitor/preferences

# 2. Initialize Capacitor
npx cap init
# App name: Pluto Multi-Chain Wallet
# App ID: com.plutowallet.app (use your own)
# Web directory: dist

# 3. Add platforms
npx cap add ios      # Mac only
npx cap add android  # Any OS

# 4. Build your React app
npm run build

# 5. Sync to native projects
npx cap sync
```

---

### **Phase 4: Update Code for Native (2-4 hours)**

You need to replace `localStorage` with native storage.

**1. Create `/utils/platform.ts`:**

```typescript
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

export const isNative = Capacitor.isNativePlatform();
export const isIOS = Capacitor.getPlatform() === 'ios';
export const isAndroid = Capacitor.getPlatform() === 'android';

export const storage = {
  async set(key: string, value: any) {
    if (isNative) {
      await Preferences.set({
        key,
        value: JSON.stringify(value)
      });
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  },

  async get(key: string) {
    if (isNative) {
      const { value } = await Preferences.get({ key });
      return value ? JSON.parse(value) : null;
    } else {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    }
  },

  async remove(key: string) {
    if (isNative) {
      await Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  },

  async clear() {
    if (isNative) {
      await Preferences.clear();
    } else {
      localStorage.clear();
    }
  }
};
```

**2. Find all localStorage usage:**

```bash
# Search for localStorage
grep -r "localStorage" src/

# You'll find it in:
# - /utils/walletStorage.ts
# - /utils/adminStorage.ts
# - /App.tsx
# - /components/OnboardingFlow.tsx
# - /components/ImportWallet.tsx
# - etc.
```

**3. Replace in each file:**

I can help you update each file if you'd like. Would you like me to update all the files now?

---

### **Phase 5: Build for iOS (Mac Only)**

```bash
# 1. Build React app
npm run build

# 2. Sync to iOS
npx cap sync ios

# 3. Open Xcode
npx cap open ios

# In Xcode:
# 4. Select your Apple Developer Team
#    - Xcode → Preferences → Accounts
#    - Add your Apple ID
#    - Download certificates

# 5. Configure app
#    - Select project → General
#    - Bundle Identifier: com.plutowallet.app
#    - Version: 1.0.0
#    - Team: Your team

# 6. Add app icons
#    - Assets → AppIcon
#    - Drag icons for all sizes

# 7. Test on simulator
#    - Select iPhone simulator
#    - Click Run (⌘R)

# 8. Test on real device
#    - Connect iPhone via USB
#    - Select your device
#    - Click Run
#    - Trust developer on iPhone

# 9. Archive for App Store
#    - Select "Any iOS Device (arm64)"
#    - Product → Archive
#    - Wait for build
#    - Click "Distribute App"
#    - Choose "App Store Connect"
#    - Upload
```

---

### **Phase 6: Build for Android (Any OS)**

```bash
# 1. Build React app
npm run build

# 2. Sync to Android
npx cap sync android

# 3. Open Android Studio
npx cap open android

# In Android Studio:
# 4. Wait for Gradle sync to complete

# 5. Generate signing key (first time only)
# Build → Generate Signed Bundle/APK
# Create new keystore
#   - Key store path: ~/pluto-wallet.keystore
#   - Password: [create strong password]
#   - Alias: plutowallet
#   - Validity: 25 years
# SAVE THIS KEYSTORE - You need it for all future updates!

# 6. Test on emulator
#    - Tools → AVD Manager
#    - Create Virtual Device
#    - Select device (Pixel 5)
#    - Download system image (API 33)
#    - Click Run

# 7. Test on real device
#    - Enable Developer Mode on Android phone
#    - Enable USB Debugging
#    - Connect via USB
#    - Click Run

# 8. Build for Play Store
#    - Build → Generate Signed Bundle/APK
#    - Choose "Android App Bundle" (AAB)
#    - Select your keystore
#    - Enter passwords
#    - Choose "release"
#    - Build
#    - Find AAB in: android/app/release/app-release.aab
```

---

### **Phase 7: Submit to App Store (iOS)**

**Prerequisites:**
- ✅ Mac computer
- ✅ Apple Developer Account ($99/year)
- ✅ App built and archived in Xcode

**Steps:**

1. **Create App Store Connect Listing:**
   - Go to: https://appstoreconnect.apple.com
   - Click "My Apps" → "+"
   - Create New App
   - Platform: iOS
   - Name: Pluto Multi-Chain Wallet
   - Primary Language: English
   - Bundle ID: com.plutowallet.app (must match Xcode)
   - SKU: plutowallet001

2. **Add App Information:**
   - Subtitle: Multi-Chain Crypto Wallet
   - Category: Finance
   - Age Rating: Complete questionnaire

3. **Add Screenshots:**
   - 6.5" iPhone (1284 x 2778) - Required
   - Take screenshots from simulator
   - Need 3-10 screenshots

4. **Add Description:**
   ```
   Pluto Wallet is a beautiful, secure multi-chain cryptocurrency wallet 
   that supports Bitcoin (BTC), Ethereum (ETH), Solana (SOL), BNB Smart 
   Chain, and TRON.
   
   [See template in /docs/NATIVE_APP_DEPLOYMENT.md]
   ```

5. **Add Privacy Policy:**
   - Create privacy policy (template below)
   - Host on website
   - Add URL to App Store Connect

6. **Upload Build:**
   - In Xcode: Product → Archive
   - Click "Distribute App"
   - Choose "App Store Connect"
   - Upload
   - Wait 10-30 minutes for processing

7. **Submit for Review:**
   - In App Store Connect
   - Select your app
   - Select build
   - Answer questions
   - Submit for Review

8. **Wait for Approval:**
   - Usually 24-48 hours
   - Check email for updates
   - Fix any issues if rejected

---

### **Phase 8: Submit to Play Store (Android)**

**Prerequisites:**
- ✅ Google Play Console Account ($25 one-time)
- ✅ Signed AAB file

**Steps:**

1. **Create Play Console Account:**
   - Go to: https://play.google.com/console
   - Pay $25 registration fee
   - Complete identity verification

2. **Create New App:**
   - Click "Create app"
   - App name: Pluto Multi-Chain Wallet
   - Default language: English
   - App or Game: App
   - Free or Paid: Free

3. **Complete Store Listing:**
   - Short description (80 chars)
   - Full description (4000 chars)
   - App icon (512x512)
   - Feature graphic (1024x500)
   - Screenshots (phone: 2-8, tablet: optional)

4. **Complete Content Rating:**
   - Start questionnaire
   - Category: Utility, Communication, or Entertainment
   - Answer questions honestly
   - Get rating (usually PEGI 3 or Everyone)

5. **Set Up Store Presence:**
   - Privacy Policy URL (required)
   - App category: Finance
   - Contact email
   - Add store listing in other languages (optional)

6. **Upload APK/AAB:**
   - Production → Create new release
   - Upload AAB file
   - Release name: 1.0.0
   - Release notes: "Initial release"

7. **Complete Data Safety:**
   - Data types collected
   - Data usage and handling
   - Security practices

8. **Set Pricing & Distribution:**
   - Countries: Select all (or specific countries)
   - Pricing: Free
   - Content rating: From questionnaire
   - Target audience: Everyone

9. **Submit for Review:**
   - Review and roll out
   - Submit
   - Wait for approval (few hours to 7 days)

---

## What You Need to Prepare

### **1. App Icons**

You already have these in `/public/icons/`:
- ✅ icon-72x72.png
- ✅ icon-96x96.png
- ✅ icon-192x192.png
- ✅ icon-512x512.png

**For iOS, generate all sizes:**
- Use https://www.appicon.co/
- Upload icon-512x512.png
- Download complete icon set
- Drag into Xcode Assets

**For Android:**
- Android Studio can auto-generate
- Or use: https://romannurik.github.io/AndroidAssetStudio/

---

### **2. Screenshots**

**iOS (Required):**
- 6.5" iPhone (1284 x 2778 pixels)
- 3-10 screenshots

**Android (Required):**
- Phone (1080 x 1920 or higher)
- 2-8 screenshots

**How to create:**
1. Run app on simulator/emulator
2. Navigate to key screens:
   - Dashboard (wallet balance)
   - Send screen
   - Receive screen (QR code)
   - Swap screen
   - Transaction history
3. Take screenshots (Cmd+S in iOS Simulator, toolbar button in Android)
4. Optionally add device frames: https://www.appmockup.com/

---

### **3. Privacy Policy**

**Template:**

```markdown
# Privacy Policy for Pluto Multi-Chain Wallet

Last updated: December 3, 2025

## Introduction
Pluto Multi-Chain Wallet ("we", "our", or "us") operates as a non-custodial 
cryptocurrency wallet. We are committed to protecting your privacy.

## Data We Collect
### Information You Provide
- Wallet addresses (stored locally on your device)
- Transaction history (stored locally on your device)
- App preferences (stored locally on your device)

### Automatically Collected Information
- Device information (for crash reporting)
- App usage statistics (anonymous)

## How We Use Data
- To provide wallet functionality
- To sync data across your devices (if enabled)
- To improve app performance
- To provide customer support

## Data Storage
- All wallet data is stored locally on your device
- We do not have access to your private keys
- We do not custody your funds
- Optional cloud sync is encrypted

## Third-Party Services
We use the following third-party services:
- CoinGecko API (cryptocurrency prices)
- [Third-party on-ramp providers] (if you choose to buy crypto)

## Your Rights
You have the right to:
- Access your data
- Delete your data
- Export your data
- Opt-out of analytics

## Security
- Your private keys never leave your device
- All data is encrypted
- We recommend using biometric authentication

## Children's Privacy
Our app is not intended for users under 18 years of age.

## Contact Us
If you have questions about this Privacy Policy, contact us at:
support@plutowallet.com

## Changes to This Policy
We may update this policy from time to time. We will notify you of any changes.
```

**Host this at:**
- https://plutowallet.com/privacy
- Or use GitHub Pages (free)

---

### **4. Support Resources**

**Support Email:**
- Create: support@plutowallet.com
- Or use your personal email

**Support Website:**
- Create simple website with:
  - How to create wallet
  - How to send/receive
  - How to backup
  - FAQ
  - Contact form

**Can use:**
- GitHub Pages (free)
- Vercel (free)
- Netlify (free)

---

## Alternative: Use CI/CD Services

If you don't have a Mac but need to build iOS apps:

### **Option 1: Rent a Mac**
- **MacStadium:** $79-199/month
- **AWS Mac Instances:** ~$1/hour
- **MacinCloud:** $49/month

### **Option 2: Use Cloud Build Services**
- **Codemagic:** $0-95/month (free tier available)
- **Bitrise:** $0-90/month (free tier available)
- **GitHub Actions with Mac runners:** Pay per minute

### **Option 3: Expo EAS Build** (if you use React Native)
- Build iOS apps without Mac
- ~$29/month

---

## Timeline Summary

```
Export Code from Figma Make          →  30 minutes
Set up local development              →  1-2 hours
Install Capacitor                     →  30 minutes
Update localStorage code              →  4-6 hours
Configure iOS (Mac only)              →  2-3 hours
Configure Android                     →  2-3 hours
Test on devices                       →  4-8 hours
Create screenshots & assets           →  2-4 hours
Create privacy policy & support       →  1-2 hours
Submit to App Store                   →  1 hour
Submit to Play Store                  →  1 hour
Wait for approval                     →  1-7 days
────────────────────────────────────────────────────
Total Development Time                →  18-32 hours
Total Calendar Time                   →  3-10 days
```

---

## Cost Summary

| Item | Cost |
|------|------|
| **Required:** | |
| Apple Developer Account | $99/year |
| Google Play Console | $25 one-time |
| **Optional:** | |
| Mac computer (if you don't have) | $699-2499 |
| Or rent Mac cloud service | $50-200/month |
| Privacy policy hosting | $0 (GitHub Pages) |
| Support website | $0 (Vercel/Netlify) |
| **Total (if you have Mac)** | **$124** |
| **Total (if you need Mac)** | **$124 + Mac cost** |

---

## Do You Have a Mac?

### **YES - I have a Mac** ✅
Great! You can build both iOS and Android apps:
1. Export code from here
2. Set up locally
3. Follow Phase 1-8 above
4. Publish to both stores

**Time:** 3-10 days
**Cost:** $124

### **NO - I don't have a Mac** ❌
You have options:
1. **Build Android only** (can do on Windows/Linux)
   - Still reach millions of users
   - No Mac needed
   - $25 one-time cost

2. **Borrow/buy a Mac**
   - One-time purchase
   - Can use for all future updates
   - Recommended if serious about iOS

3. **Use cloud Mac service**
   - $50-200/month
   - No hardware investment
   - Good for testing

4. **Hire someone to build iOS**
   - Fiverr/Upwork: $100-500
   - One-time for initial build
   - You can update Android yourself

---

## Next Steps

**What would you like to do?**

1. **Export code and set up locally?**
   - I can guide you through exporting
   - Help set up local environment
   - Update all localStorage code

2. **Build Android only first?**
   - Skip iOS for now
   - Launch on Play Store
   - Add iOS later when you get Mac

3. **Need help with specific part?**
   - Privacy policy creation
   - Screenshot design
   - Store listing optimization
   - Code updates

Let me know what you'd like to do next, and I'll help you with the specific steps!
