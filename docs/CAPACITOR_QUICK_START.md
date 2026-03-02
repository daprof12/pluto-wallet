# Capacitor Quick Start - Pluto Wallet

## TL;DR

```bash
# 1. Install Capacitor (2 minutes)
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init

# 2. Add platforms (3 minutes)
npx cap add ios
npx cap add android

# 3. Build and sync (1 minute)
npm run build
npx cap sync

# 4. Open in native IDEs
npx cap open ios      # Opens Xcode
npx cap open android  # Opens Android Studio

# 5. Run on device
# Click "Run" in Xcode or Android Studio

# Done! Your web app is now a native app ✨
```

---

## File Changes Required

### **1. Create `capacitor.config.ts`**

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.plutowallet.app',
  appName: 'Pluto Wallet',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
  }
};

export default config;
```

### **2. Update `package.json`**

Add these scripts:

```json
{
  "scripts": {
    "cap:sync": "cap sync",
    "cap:ios": "cap open ios",
    "cap:android": "cap open android",
    "build:ios": "npm run build && cap sync ios && cap open ios",
    "build:android": "npm run build && cap sync android && cap open android"
  }
}
```

### **3. Create `/utils/platform.ts`**

```typescript
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

export const isNative = Capacitor.isNativePlatform();
export const isIOS = Capacitor.getPlatform() === 'ios';
export const isAndroid = Capacitor.getPlatform() === 'android';

// Storage wrapper
export const storage = {
  async set(key: string, value: any) {
    if (isNative) {
      await Preferences.set({ key, value: JSON.stringify(value) });
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
  }
};
```

### **4. Update All localStorage Calls**

**Before:**
```typescript
localStorage.setItem('pluto_wallet', JSON.stringify(data));
const data = JSON.parse(localStorage.getItem('pluto_wallet') || '{}');
```

**After:**
```typescript
import { storage } from './utils/platform';

await storage.set('pluto_wallet', data);
const data = await storage.get('pluto_wallet') || {};
```

**Files to update:**
- `/App.tsx` - Main wallet state
- `/utils/walletStorage.ts` - All wallet operations
- `/utils/adminStorage.ts` - Admin operations
- `/components/OnboardingFlow.tsx` - Wallet creation
- `/components/ImportWallet.tsx` - Wallet import
- Any component using localStorage

---

## Code Migration Pattern

### **Pattern 1: Simple Get/Set**

```typescript
// OLD (Web only)
localStorage.setItem('key', JSON.stringify(value));
const value = JSON.parse(localStorage.getItem('key') || 'null');

// NEW (Web + Native)
await storage.set('key', value);
const value = await storage.get('key');
```

### **Pattern 2: In useState**

```typescript
// OLD
const [data, setData] = useState(() => {
  const saved = localStorage.getItem('key');
  return saved ? JSON.parse(saved) : null;
});

// NEW
const [data, setData] = useState(null);

useEffect(() => {
  storage.get('key').then(setData);
}, []);
```

### **Pattern 3: Save on Change**

```typescript
// OLD
useEffect(() => {
  localStorage.setItem('key', JSON.stringify(data));
}, [data]);

// NEW
useEffect(() => {
  if (data) {
    storage.set('key', data);
  }
}, [data]);
```

---

## Testing Workflow

```bash
# 1. Make changes to your code
# Edit /App.tsx or any component

# 2. Build React app
npm run build

# 3. Sync to native
npx cap sync

# 4. Test on iOS
npx cap open ios
# Click Run in Xcode

# 5. Test on Android
npx cap open android
# Click Run in Android Studio

# 6. Test on Web (still works!)
npm run dev
```

---

## Common Issues & Fixes

### **Issue 1: "localStorage is not defined"**

**Cause:** Using `localStorage` directly in native app

**Fix:**
```typescript
// Don't do this:
localStorage.setItem('key', value);

// Do this:
import { storage } from './utils/platform';
await storage.set('key', value);
```

---

### **Issue 2: "White screen on app launch"**

**Cause:** Build output not synced

**Fix:**
```bash
npm run build
npx cap sync
npx cap open ios  # or android
```

---

### **Issue 3: "Cannot read property of undefined"**

**Cause:** Async storage not awaited

**Fix:**
```typescript
// Don't do this:
const data = storage.get('key'); // Returns Promise!

// Do this:
const data = await storage.get('key');

// Or in useEffect:
useEffect(() => {
  storage.get('key').then(data => {
    console.log(data);
  });
}, []);
```

---

### **Issue 4: "App crashes on startup"**

**Cause:** Error in initialization code

**Fix:**
Check Xcode console or Android Logcat for errors:
```bash
# iOS debugging
npx cap open ios
# View → Debug Area → Activate Console

# Android debugging
npx cap open android
# View → Tool Windows → Logcat
```

---

### **Issue 5: "Network requests fail"**

**Cause:** CORS or HTTPS issues

**Fix:**

For iOS, add to `ios/App/App/Info.plist`:
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

For Android, add to `android/app/src/main/res/xml/network_security_config.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true" />
</network-security-config>
```

---

## Useful Capacitor Plugins

```bash
# Essential for wallet app
npm install @capacitor/preferences        # Storage
npm install @capacitor/splash-screen      # Launch screen
npm install @capacitor/status-bar         # Status bar styling
npm install @capacitor/keyboard           # Keyboard handling
npm install @capacitor/haptics            # Vibration feedback
npm install @capacitor/share              # Share functionality
npm install @capacitor/clipboard          # Copy/paste

# Security features
npm install @capacitor-community/biometric-auth  # Face ID, Touch ID

# QR Code scanning
npm install @capacitor-community/barcode-scanner

# Push notifications
npm install @capacitor/push-notifications

# Camera access
npm install @capacitor/camera
```

---

## Platform-Specific Code

```typescript
import { Capacitor } from '@capacitor/core';

// Check if running in native app
if (Capacitor.isNativePlatform()) {
  // Native-only code
  console.log('Running in native app');
}

// Check specific platform
const platform = Capacitor.getPlatform();
if (platform === 'ios') {
  // iOS-specific code
} else if (platform === 'android') {
  // Android-specific code
} else {
  // Web-specific code
}

// Check if plugin is available
if (Capacitor.isPluginAvailable('Camera')) {
  // Use camera
}
```

---

## Build Commands Reference

```bash
# Development
npm run dev                    # Web dev server
npm run build                  # Build for production
npx cap sync                   # Sync to native projects

# iOS
npx cap add ios               # Add iOS platform (once)
npx cap sync ios              # Sync web build to iOS
npx cap open ios              # Open Xcode
npx cap run ios               # Build and run on device
npx cap run ios --target      # List available devices

# Android
npx cap add android           # Add Android platform (once)
npx cap sync android          # Sync web build to Android
npx cap open android          # Open Android Studio
npx cap run android           # Build and run on device
npx cap run android --list    # List available devices

# Both
npx cap sync                  # Sync to both platforms
npx cap update                # Update Capacitor version
```

---

## Production Build

### **iOS (App Store):**

```bash
# 1. Build web app
npm run build

# 2. Sync to iOS
npx cap sync ios

# 3. Open Xcode
npx cap open ios

# 4. In Xcode:
# - Select "Any iOS Device (arm64)"
# - Product → Archive
# - Distribute App → App Store Connect
```

### **Android (Play Store):**

```bash
# 1. Build web app
npm run build

# 2. Sync to Android
npx cap sync android

# 3. Open Android Studio
npx cap open android

# 4. In Android Studio:
# - Build → Generate Signed Bundle/APK
# - Choose Android App Bundle (AAB)
# - Select release
# - Sign with your keystore
```

---

## App Store Requirements Checklist

### **iOS:**
- ✅ Apple Developer Account ($99/year)
- ✅ App icons (all sizes)
- ✅ Launch screen
- ✅ Screenshots (6.5" iPhone, 12.9" iPad)
- ✅ App description
- ✅ Privacy policy URL
- ✅ Support URL
- ✅ Age rating completed
- ✅ Export compliance information

### **Android:**
- ✅ Google Play Console account ($25 one-time)
- ✅ App icons (all densities)
- ✅ Feature graphic (1024x500)
- ✅ Screenshots (phone, tablet)
- ✅ App description
- ✅ Privacy policy URL
- ✅ Content rating questionnaire
- ✅ Data safety form
- ✅ Signed APK/AAB

---

## Folder Structure After Setup

```
pluto-wallet/
├── src/                          # Your React app
├── public/                       # Static assets
├── dist/                         # Build output
├── capacitor.config.ts           # Capacitor config
│
├── ios/                          # iOS project (auto-generated)
│   └── App/
│       ├── App/
│       │   ├── AppDelegate.swift
│       │   └── Info.plist
│       └── public/               # Your web app (synced from dist/)
│
├── android/                      # Android project (auto-generated)
│   └── app/
│       └── src/
│           └── main/
│               ├── AndroidManifest.xml
│               ├── res/          # Icons, splash screens
│               └── assets/
│                   └── public/   # Your web app (synced from dist/)
│
└── package.json
```

---

## Performance Tips

1. **Optimize Images:**
   ```bash
   # Use WebP format
   # Compress PNGs
   # Lazy load images
   ```

2. **Reduce Bundle Size:**
   ```bash
   # Code splitting
   # Tree shaking
   # Remove unused dependencies
   ```

3. **Use Native Features:**
   ```typescript
   // Use Capacitor plugins instead of web APIs
   import { Haptics } from '@capacitor/haptics';
   await Haptics.impact({ style: 'medium' });
   ```

4. **Optimize Startup:**
   ```typescript
   // Load critical data first
   // Lazy load non-critical features
   // Use splash screen to hide loading
   ```

---

## Security Checklist

- ✅ Use HTTPS only
- ✅ Encrypt sensitive data
- ✅ Store keys in native keychains (iOS Keychain, Android Keystore)
- ✅ Implement biometric authentication
- ✅ Prevent screenshots (optional)
- ✅ Validate all user inputs
- ✅ Use Content Security Policy
- ✅ Implement SSL pinning (optional)
- ✅ Obfuscate code (ProGuard for Android)

---

## Resources

- **Capacitor Docs:** https://capacitorjs.com/docs
- **iOS Setup:** https://capacitorjs.com/docs/ios
- **Android Setup:** https://capacitorjs.com/docs/android
- **Plugins:** https://capacitorjs.com/docs/plugins
- **Community Plugins:** https://github.com/capacitor-community

---

## Summary

**Time Investment:** 17-29 hours
**Cost:** $124 (first year)
**Result:** Native iOS + Android apps from your web code

**Your Pluto Wallet is ready for the App Store and Play Store!** 🚀
