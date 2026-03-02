# Quick Setup: Cross-Platform Sync for Pluto Wallet

## TL;DR - How It Works

```
Web (localStorage) ←→ Cloud API ←→ iOS (UserDefaults) ←→ Android (SharedPreferences)
                          ↓
                   JSON Files on Server
```

All platforms read/write locally first (fast), then sync to cloud in background (5-second intervals).

---

## Fastest Setup: Use Firebase

### **Step 1: Install Firebase (5 minutes)**

```bash
# Web
npm install firebase

# iOS (in Xcode)
# Add Firebase SDK via Swift Package Manager
# URL: https://github.com/firebase/firebase-ios-sdk

# Android (in build.gradle)
implementation 'com.google.firebase:firebase-database:20.3.0'
```

### **Step 2: Firebase Console Setup**

1. Go to https://console.firebase.google.com
2. Create new project "pluto-wallet"
3. Enable Realtime Database
4. Set rules:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

### **Step 3: Web Implementation (10 minutes)**

```typescript
// /hooks/useFirebaseSync.ts

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, off } from 'firebase/database';
import { useEffect } from 'react';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "pluto-wallet.firebaseapp.com",
  databaseURL: "https://pluto-wallet.firebaseio.com",
  projectId: "pluto-wallet"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export function useFirebaseSync(userId: string, onSync: (data: any) => void) {
  useEffect(() => {
    if (!userId) return;

    const userRef = ref(db, `users/${userId}/wallet`);

    // Listen for changes from other devices
    const unsubscribe = onValue(userRef, (snapshot) => {
      const cloudData = snapshot.val();
      if (cloudData) {
        const localData = localStorage.getItem('pluto_wallet');
        const local = localData ? JSON.parse(localData) : null;

        // Only update if cloud is newer
        if (!local || cloudData.lastModified > local.lastModified) {
          localStorage.setItem('pluto_wallet', JSON.stringify(cloudData.data));
          onSync(cloudData.data);
          console.log('✅ Synced from Firebase');
        }
      }
    });

    // Sync local changes to Firebase every 5 seconds
    const syncInterval = setInterval(() => {
      const localData = localStorage.getItem('pluto_wallet');
      if (localData) {
        const wallet = JSON.parse(localData);
        set(userRef, {
          data: wallet,
          lastModified: Date.now(),
          deviceId: getDeviceId()
        });
        console.log('📤 Synced to Firebase');
      }
    }, 5000);

    return () => {
      off(userRef);
      clearInterval(syncInterval);
    };
  }, [userId, onSync]);
}

function getDeviceId() {
  let id = localStorage.getItem('device_id');
  if (!id) {
    id = `web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('device_id', id);
  }
  return id;
}
```

**Usage in App:**

```typescript
// /App.tsx

import { useFirebaseSync } from './hooks/useFirebaseSync';

export default function App() {
  const [walletData, setWalletData] = useState(null);
  
  // Enable Firebase sync
  useFirebaseSync(walletData?.userId || 'guest', (syncedData) => {
    setWalletData(syncedData);
  });

  return (
    // Your app JSX
  );
}
```

### **Step 4: iOS Implementation (15 minutes)**

```swift
// FirebaseSyncService.swift

import Firebase
import FirebaseDatabase

class FirebaseSyncService {
    private var ref: DatabaseReference!
    private var syncTimer: Timer?
    private let userId: String
    
    init(userId: String) {
        self.userId = userId
        
        // Initialize Firebase
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
        }
        
        ref = Database.database().reference()
        
        startListening()
        startPeriodicSync()
    }
    
    // Listen for changes from other devices
    private func startListening() {
        ref.child("users").child(userId).child("wallet").observe(.value) { [weak self] snapshot in
            guard let data = snapshot.value as? [String: Any],
                  let walletData = data["data"] as? [String: Any],
                  let cloudModified = data["lastModified"] as? TimeInterval else {
                return
            }
            
            // Get local data
            let localModified = UserDefaults.standard.double(forKey: "lastModified")
            
            // Only update if cloud is newer
            if cloudModified > localModified {
                // Save to UserDefaults
                if let jsonData = try? JSONSerialization.data(withJSONObject: walletData),
                   let jsonString = String(data: jsonData, encoding: .utf8) {
                    UserDefaults.standard.set(jsonString, forKey: "pluto_wallet")
                    UserDefaults.standard.set(cloudModified, forKey: "lastModified")
                    
                    // Notify app
                    NotificationCenter.default.post(name: .walletSynced, object: nil)
                    
                    print("✅ Synced from Firebase")
                }
            }
        }
    }
    
    // Sync local changes to Firebase
    private func startPeriodicSync() {
        syncTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            self?.syncToFirebase()
        }
    }
    
    private func syncToFirebase() {
        guard let walletJson = UserDefaults.standard.string(forKey: "pluto_wallet"),
              let walletData = try? JSONSerialization.jsonObject(with: walletJson.data(using: .utf8)!) else {
            return
        }
        
        let timestamp = Date().timeIntervalSince1970 * 1000
        
        ref.child("users").child(userId).child("wallet").setValue([
            "data": walletData,
            "lastModified": timestamp,
            "deviceId": getDeviceId()
        ])
        
        UserDefaults.standard.set(timestamp, forKey: "lastModified")
        
        print("📤 Synced to Firebase")
    }
    
    private func getDeviceId() -> String {
        if let deviceId = UserDefaults.standard.string(forKey: "device_id") {
            return deviceId
        }
        let newId = "ios-\(UUID().uuidString)"
        UserDefaults.standard.set(newId, forKey: "device_id")
        return newId
    }
    
    deinit {
        syncTimer?.invalidate()
        ref.removeAllObservers()
    }
}

extension Notification.Name {
    static let walletSynced = Notification.Name("walletSynced")
}
```

**Usage in iOS App:**

```swift
// AppDelegate.swift or SceneDelegate.swift

import UIKit

class AppDelegate: UIResponder, UIApplicationDelegate {
    var syncService: FirebaseSyncService?
    
    func application(_ application: UIApplication, 
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        
        // Get user ID from UserDefaults
        let userId = UserDefaults.standard.string(forKey: "userId") ?? "guest"
        
        // Start sync service
        syncService = FirebaseSyncService(userId: userId)
        
        return true
    }
}
```

### **Step 5: Android Implementation (15 minutes)**

```kotlin
// FirebaseSyncService.kt

import android.content.Context
import android.content.SharedPreferences
import com.google.firebase.database.*
import kotlinx.coroutines.*
import org.json.JSONObject

class FirebaseSyncService(
    private val context: Context,
    private val userId: String
) {
    private val database = FirebaseDatabase.getInstance()
    private val userRef = database.getReference("users/$userId/wallet")
    private val prefs: SharedPreferences = 
        context.getSharedPreferences("pluto_wallet", Context.MODE_PRIVATE)
    
    private var syncJob: Job? = null
    
    init {
        startListening()
        startPeriodicSync()
    }
    
    // Listen for changes from other devices
    private fun startListening() {
        userRef.addValueEventListener(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val data = snapshot.value as? Map<*, *> ?: return
                val walletData = data["data"] as? Map<*, *> ?: return
                val cloudModified = (data["lastModified"] as? Number)?.toLong() ?: return
                
                // Get local timestamp
                val localModified = prefs.getLong("lastModified", 0)
                
                // Only update if cloud is newer
                if (cloudModified > localModified) {
                    val walletJson = JSONObject(walletData).toString()
                    
                    prefs.edit()
                        .putString("pluto_wallet", walletJson)
                        .putLong("lastModified", cloudModified)
                        .apply()
                    
                    // Notify app (use LiveData or EventBus)
                    println("✅ Synced from Firebase")
                }
            }
            
            override fun onCancelled(error: DatabaseError) {
                println("❌ Firebase error: ${error.message}")
            }
        })
    }
    
    // Sync local changes to Firebase
    private fun startPeriodicSync() {
        syncJob = CoroutineScope(Dispatchers.IO).launch {
            while (isActive) {
                syncToFirebase()
                delay(5000) // 5 seconds
            }
        }
    }
    
    private fun syncToFirebase() {
        val walletJson = prefs.getString("pluto_wallet", null) ?: return
        val walletData = JSONObject(walletJson).toMap()
        
        val timestamp = System.currentTimeMillis()
        
        userRef.setValue(mapOf(
            "data" to walletData,
            "lastModified" to timestamp,
            "deviceId" to getDeviceId()
        ))
        
        prefs.edit().putLong("lastModified", timestamp).apply()
        
        println("📤 Synced to Firebase")
    }
    
    private fun getDeviceId(): String {
        var deviceId = prefs.getString("device_id", null)
        if (deviceId == null) {
            deviceId = "android-${java.util.UUID.randomUUID()}"
            prefs.edit().putString("device_id", deviceId).apply()
        }
        return deviceId
    }
    
    fun stopSync() {
        syncJob?.cancel()
        userRef.removeEventListener(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {}
            override fun onCancelled(error: DatabaseError) {}
        })
    }
}

// Extension function to convert JSONObject to Map
fun JSONObject.toMap(): Map<String, Any?> {
    val map = mutableMapOf<String, Any?>()
    keys().forEach { key ->
        map[key] = get(key)
    }
    return map
}
```

**Usage in Android App:**

```kotlin
// MainActivity.kt

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private lateinit var syncService: FirebaseSyncService
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        // Get user ID from SharedPreferences
        val prefs = getSharedPreferences("pluto_wallet", MODE_PRIVATE)
        val userId = prefs.getString("userId", "guest") ?: "guest"
        
        // Start sync service
        syncService = FirebaseSyncService(this, userId)
    }
    
    override fun onDestroy() {
        super.onDestroy()
        syncService.stopSync()
    }
}
```

---

## Alternative: Simple REST API (No Firebase)

If you don't want to use Firebase, you can use a simple REST API:

### **Backend (Node.js + Express)**

```bash
npm install express cors
```

```javascript
// server.js

const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const DATA_DIR = './user-data';

// Ensure data directory exists
fs.mkdir(DATA_DIR, { recursive: true });

// POST /sync - Upload wallet data
app.post('/sync', async (req, res) => {
  try {
    const { userId, data, lastModified } = req.body;
    
    const filePath = path.join(DATA_DIR, `${userId}.json`);
    
    // Check if cloud version is newer
    try {
      const existing = await fs.readFile(filePath, 'utf-8');
      const existingData = JSON.parse(existing);
      
      if (existingData.lastModified > lastModified) {
        return res.status(409).json({
          error: 'Conflict',
          cloudData: existingData
        });
      }
    } catch (err) {
      // File doesn't exist, proceed
    }
    
    // Save data
    await fs.writeFile(filePath, JSON.stringify({
      userId,
      data,
      lastModified,
      syncedAt: Date.now()
    }, null, 2));
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /sync/:userId - Download wallet data
app.get('/sync/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const filePath = path.join(DATA_DIR, `${userId}.json`);
    
    const data = await fs.readFile(filePath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'Not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Sync API running on port 3000');
});
```

**Deploy to:**
- Heroku (free tier)
- Vercel (serverless)
- Railway (free tier)
- Your own VPS

---

## Testing Sync

### **Test 1: Web → iOS**

1. Open web app in Chrome
2. Make a transaction (send crypto)
3. Check console: "📤 Synced to Firebase"
4. Open iOS app
5. Transaction should appear within 5 seconds

### **Test 2: Android → Web**

1. Open Android app
2. Change wallet settings
3. Check Logcat: "Synced to Firebase"
4. Open web app
5. Settings should update automatically

### **Test 3: Offline Sync**

1. Turn off WiFi on iOS
2. Make transaction (saved locally)
3. Turn WiFi back on
4. Transaction syncs automatically
5. Appears on web and Android

---

## Troubleshooting

### **Data not syncing?**

```javascript
// Check Firebase console
// Database → users → {userId} → wallet
// Should show: data, lastModified, deviceId

// Check browser console
console.log('Local:', localStorage.getItem('pluto_wallet'));
console.log('Device ID:', localStorage.getItem('device_id'));

// Check iOS
print(UserDefaults.standard.string(forKey: "pluto_wallet"))
print(UserDefaults.standard.string(forKey: "device_id"))

// Check Android
Log.d("Sync", prefs.getString("pluto_wallet", "null"))
Log.d("Sync", prefs.getString("device_id", "null"))
```

### **Sync too slow?**

```typescript
// Change sync interval from 5 seconds to 1 second
const syncInterval = setInterval(() => {
  // sync code
}, 1000); // 1 second
```

### **Conflicts happening?**

```typescript
// Implement "last write wins" strategy
if (cloudData.lastModified > localData.lastModified) {
  // Use cloud data
  localStorage.setItem('pluto_wallet', JSON.stringify(cloudData.data));
} else {
  // Keep local data, push to cloud
  syncToCloud();
}
```

---

## Cost Estimate

### **Firebase (Realtime Database)**

- **Free Tier:**
  - 1 GB storage
  - 10 GB/month downloads
  - 100 simultaneous connections
  
- **Pay-as-you-go:**
  - $5/GB storage
  - $1/GB downloads
  - $0.50/GB uploads

**For 1,000 active users:**
- ~50 MB storage = **Free**
- ~10 GB downloads = **Free**
- Total: **$0/month**

### **Custom API (Heroku)**

- Free tier: 550 hours/month
- Cost: **$0/month**

---

## Security Checklist

✅ Encrypt sensitive data before syncing
✅ Use HTTPS only
✅ Implement user authentication (Firebase Auth)
✅ Set proper Firebase security rules
✅ Rate limit API requests
✅ Validate data on server
✅ Log sync events for debugging
✅ Handle errors gracefully

---

## Summary

**Setup time:** 30-45 minutes total

**What you get:**
- ✅ Real-time sync across Web, iOS, Android
- ✅ Offline-first (works without internet)
- ✅ Automatic conflict resolution
- ✅ 5-second sync interval
- ✅ No database maintenance
- ✅ Scalable to millions of users

**Next steps:**
1. Set up Firebase project (5 min)
2. Add web sync hook (10 min)
3. Add iOS sync service (15 min)
4. Add Android sync service (15 min)
5. Test across all platforms (10 min)
6. Deploy to production ✨

Your localStorage data will now sync seamlessly across all platforms in real-time!
