# Pluto Multi-Chain Wallet - PWA Installation Guide

## Overview

The Pluto Multi-Chain Wallet is a Progressive Web App (PWA) that can be installed on any device (mobile, tablet, or desktop) and works like a native app. This guide explains how the PWA installation system works.

---

## How PWA Installation Works

### 1. **Core Components**

#### A. Manifest File (`/public/manifest.json`)
The manifest file defines how the app appears when installed:

```json
{
  "name": "Pluto Multi-Chain Wallet",
  "short_name": "Pluto Wallet",
  "display": "standalone",
  "start_url": "/",
  "theme_color": "#9333EA",
  "background_color": "#1F2937",
  "icons": [...],
  "shortcuts": [...]
}
```

**Key Properties:**
- `display: "standalone"` - Runs in full-screen mode without browser UI
- `icons` - Multiple sizes (72x72 to 512x512) for different devices
- `shortcuts` - Quick actions (Send/Receive) from home screen
- `theme_color` - Purple (#9333EA) matches app branding
- `screenshots` - App store-like preview images

#### B. Service Worker (`/public/sw.js`)
The service worker enables:
- **Offline functionality** - App works without internet
- **Caching strategy** - Fast load times
- **Background sync** - Sync data when connection returns
- **Push notifications** - Future feature support

**Caching Strategies:**
```javascript
// Static assets: Cache-first (instant loading)
- index.html, manifest.json, icons

// API calls: Network-first with cache fallback
- CoinGecko prices, external APIs

// Navigation: Network-first
- Always try to load fresh content
```

#### C. PWA Install Prompt Component (`/components/PWAInstallPrompt.tsx`)
Handles the installation UI and user experience.

---

### 2. **Installation Flow**

#### **For Android/Chrome/Edge (Desktop & Mobile):**

**Step 1: Detection**
```typescript
// Listen for beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // Prevent default browser prompt
  setDeferredPrompt(e); // Save for later
});
```

**Step 2: Delayed Display**
```typescript
// Show custom prompt after 10 seconds
setTimeout(() => {
  setShowPrompt(true);
}, 10000);
```

**Step 3: User Action**
```typescript
const handleInstallClick = async () => {
  await deferredPrompt.prompt(); // Show native install dialog
  const { outcome } = await deferredPrompt.userChoice;
  
  if (outcome === 'accepted') {
    console.log('User installed the app');
  }
};
```

**Step 4: Installation Complete**
```typescript
// App installed successfully
window.addEventListener('appinstalled', () => {
  setIsInstalled(true);
  setShowPrompt(false);
});
```

#### **For iOS (Safari):**

iOS doesn't support the `beforeinstallprompt` event, so we show manual instructions:

**Detection:**
```typescript
const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
setIsIOS(iOS);
```

**Instructions Shown:**
1. Tap the Share button (bottom of Safari)
2. Scroll down and tap "Add to Home Screen"
3. Tap "Add" in the top right corner

---

### 3. **User Experience Timeline**

```
User visits Pluto Wallet
         ↓
Service Worker registers (background)
         ↓
User browses for 10 seconds
         ↓
PWA Install Prompt slides up from bottom
         ↓
User clicks "Install" button
         ↓
Native browser install dialog appears
         ↓
User confirms installation
         ↓
App icon added to home screen
         ↓
Opens as standalone app (no browser UI)
```

---

### 4. **Installation States**

#### **Already Installed Check:**
```typescript
// Detect if app is running in standalone mode
if (window.matchMedia('(display-mode: standalone)').matches) {
  setIsInstalled(true); // Don't show prompt
}
```

#### **Dismissed by User:**
```typescript
const handleDismiss = () => {
  localStorage.setItem('pwa_install_dismissed', 'true');
  
  // Show again after 7 days
  setTimeout(() => {
    localStorage.removeItem('pwa_install_dismissed');
  }, 7 * 24 * 60 * 60 * 1000);
};
```

---

### 5. **Visual Design**

The install prompt uses:
- **Slide-up animation** (`animate-slide-up` from globals.css)
- **Gradient icon** (purple to pink)
- **Dark mode support**
- **Fixed bottom positioning** (mobile-friendly)
- **Non-intrusive dismiss button**

```tsx
<div className="fixed bottom-0 left-0 right-0 z-50 
     bg-white dark:bg-gray-800 border-t 
     shadow-2xl animate-slide-up">
  {/* Prompt content */}
</div>
```

---

### 6. **Service Worker Hook**

The `useServiceWorker` hook (`/hooks/useServiceWorker.ts`) manages:

#### **Registration:**
```typescript
const registration = await navigator.serviceWorker.register('/sw.js', {
  scope: '/'
});
```

#### **Update Detection:**
```typescript
// Check for updates every hour
setInterval(() => {
  registration.update();
}, 60 * 60 * 1000);

// Notify user when update is available
registration.addEventListener('updatefound', () => {
  if (confirm('New version available. Update now?')) {
    newWorker.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  }
});
```

#### **Cache Management:**
```typescript
const clearCaches = async () => {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
};
```

---

### 7. **Benefits of Installation**

Once installed, users get:

✅ **Home Screen Icon** - Launch like a native app
✅ **Standalone Mode** - No browser UI (full screen)
✅ **Offline Access** - Works without internet
✅ **Faster Loading** - Assets cached locally
✅ **Push Notifications** - (Future feature)
✅ **Background Sync** - Sync transactions when online
✅ **App Shortcuts** - Quick access to Send/Receive

---

### 8. **Installation Criteria**

For browsers to offer PWA installation, the app must meet:

✅ **HTTPS** - Secure connection required
✅ **Manifest** - Valid manifest.json with required fields
✅ **Service Worker** - Registered and active
✅ **Icons** - At least 192x192 and 512x512 icons
✅ **Start URL** - Valid start_url in manifest
✅ **Display Mode** - standalone or fullscreen
✅ **Engagement** - User visits at least twice (Chrome)

---

### 9. **Testing Installation**

#### **Development:**
```bash
# Service Worker only works in production
npm run build
npm run preview

# Or deploy to HTTPS server
```

#### **Chrome DevTools:**
1. Open DevTools → Application tab
2. Check Manifest section (should show all fields)
3. Check Service Workers section (should be registered)
4. Click "Update on reload" for testing
5. Click "Add to home screen" to test installation

#### **Lighthouse PWA Audit:**
```bash
# Run PWA audit
1. Open Chrome DevTools
2. Lighthouse tab
3. Select "Progressive Web App"
4. Click "Generate report"
```

---

### 10. **Browser Support**

| Browser | Install Support | Notes |
|---------|----------------|-------|
| Chrome (Android/Desktop) | ✅ Full | Native beforeinstallprompt |
| Edge (Desktop) | ✅ Full | Native beforeinstallprompt |
| Safari (iOS) | ⚠️ Manual | Manual instructions shown |
| Firefox (Android) | ✅ Full | Native beforeinstallprompt |
| Samsung Internet | ✅ Full | Native beforeinstallprompt |
| Safari (macOS) | ⚠️ Limited | Dock only, no prompt |

---

### 11. **Customization Options**

You can customize the install prompt by modifying:

**Timing:**
```typescript
// Change delay from 10 seconds to 30 seconds
setTimeout(() => {
  setShowPrompt(true);
}, 30000); // 30 seconds
```

**Frequency:**
```typescript
// Change from 7 days to 30 days
setTimeout(() => {
  localStorage.removeItem('pwa_install_dismissed');
}, 30 * 24 * 60 * 60 * 1000); // 30 days
```

**Conditions:**
```typescript
// Only show after user performs specific action
if (userHasCompletedTransaction) {
  setShowPrompt(true);
}
```

---

### 12. **Troubleshooting**

#### **Prompt doesn't show:**
- Check if app is already installed
- Verify HTTPS connection
- Check if user dismissed in last 7 days
- Ensure manifest.json is valid
- Verify service worker is registered

#### **Installation fails:**
- Check console for errors
- Verify all icons exist
- Test manifest with validator
- Clear browser cache and try again

#### **iOS install instructions not showing:**
- Verify user is on iOS device
- Check if already added to home screen
- Ensure Safari is being used (not Chrome on iOS)

---

### 13. **Analytics & Tracking**

Track installation events:

```typescript
window.addEventListener('appinstalled', () => {
  // Track successful installation
  console.log('App installed');
  
  // Send to analytics
  if (window.gtag) {
    gtag('event', 'pwa_install', {
      method: 'automatic'
    });
  }
});

// Track dismissals
const handleDismiss = () => {
  console.log('Install prompt dismissed');
  
  if (window.gtag) {
    gtag('event', 'pwa_dismiss');
  }
};
```

---

## Summary

The Pluto Wallet PWA installation system provides:

1. **Automatic detection** of installation capability
2. **Platform-specific UX** (native prompt for Android/Chrome, instructions for iOS)
3. **Smart timing** (10-second delay after page load)
4. **Dismissal tracking** (don't annoy users)
5. **Offline functionality** (service worker caching)
6. **Update management** (automatic update detection)
7. **Beautiful UI** (slide-up animation, dark mode support)

The installation is completely optional and enhances the user experience without being required to use the wallet.
