# Pluto Wallet - Cross-Platform Data Sync Architecture

## Overview

This guide explains how to sync localStorage-based data across **Web (PWA)**, **iOS Native App**, and **Android Native App** in real-time without using a traditional database.

---

## The Challenge

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Web PWA   │     │  iOS Native │     │Android Native│
│             │     │             │     │             │
│ localStorage│     │UserDefaults │     │SharedPrefs  │
│             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
      ❌                  ❌                  ❌
   Isolated           Isolated           Isolated
   
Problem: Each platform has separate local storage!
User changes on iPhone won't appear on Android or Web.
```

---

## Solution Architecture

### **Option 1: Cloud Sync Service (Recommended)**

Use a lightweight sync service to sync localStorage/files across platforms.

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloud Sync Service                       │
│              (Firebase, Supabase, or Custom)                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │            User Data Collections                     │  │
│  │  {                                                   │  │
│  │    userId: "user123",                                │  │
│  │    walletData: {...},                                │  │
│  │    lastModified: 1234567890,                         │  │
│  │    deviceId: "web-chrome-abc",                       │  │
│  │    version: 5                                        │  │
│  │  }                                                   │  │
│  └─────────────────────────────────────────────────────┘  │
│                         ▲ ▲ ▲                              │
│                         │ │ │                              │
└─────────────────────────┼─┼─┼──────────────────────────────┘
                          │ │ │
          ┌───────────────┘ │ └───────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
    ┌──────────┐      ┌──────────┐      ┌──────────┐
    │Web (PWA) │      │   iOS    │      │ Android  │
    │          │      │  Native  │      │  Native  │
    │localStorage◄────►UserDefaults◄────►SharedPrefs│
    │          │      │          │      │          │
    └──────────┘      └──────────┘      └──────────┘
     Real-time         Real-time         Real-time
       Sync              Sync              Sync
```

---

## Implementation Strategy

### **Architecture: Hybrid Local + Cloud**

```
Local Storage (Fast, Offline)
         +
Cloud Storage (Sync, Backup)
         =
Best of Both Worlds
```

### **Key Principles:**

1. **Local-First**: Always read/write locally first (fast)
2. **Background Sync**: Sync to cloud in background
3. **Conflict Resolution**: Handle simultaneous edits
4. **Offline Support**: Queue changes when offline
5. **Encryption**: Encrypt sensitive data before sync

---

## Step-by-Step Implementation

### **Step 1: Create Sync Service Layer**

```typescript
// /utils/syncService.ts

interface SyncConfig {
  userId: string;
  apiEndpoint: string;
  apiKey: string;
  encryptionKey: string;
}

interface SyncData {
  userId: string;
  data: any;
  lastModified: number;
  deviceId: string;
  version: number;
  checksum: string;
}

class PlutoSyncService {
  private config: SyncConfig;
  private syncInterval: NodeJS.Timeout | null = null;
  private isOnline: boolean = navigator.onLine;
  private pendingChanges: any[] = [];

  constructor(config: SyncConfig) {
    this.config = config;
    this.initializeSync();
  }

  // Initialize sync listeners
  private initializeSync() {
    // Listen for online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingChanges();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Listen for localStorage changes (from other tabs)
    window.addEventListener('storage', (e) => {
      if (e.key === 'pluto_wallet') {
        this.handleLocalChange(e.newValue);
      }
    });

    // Start periodic sync (every 5 seconds)
    this.startPeriodicSync(5000);
  }

  // Start periodic background sync
  private startPeriodicSync(interval: number) {
    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.syncToCloud();
      }
    }, interval);
  }

  // Sync local data to cloud
  async syncToCloud() {
    try {
      const localData = localStorage.getItem('pluto_wallet');
      if (!localData) return;

      const walletData = JSON.parse(localData);
      const deviceId = this.getDeviceId();
      
      // Get current version from cloud
      const cloudVersion = await this.getCloudVersion();
      
      // Create sync payload
      const syncData: SyncData = {
        userId: this.config.userId,
        data: this.encryptData(walletData),
        lastModified: Date.now(),
        deviceId: deviceId,
        version: cloudVersion + 1,
        checksum: this.calculateChecksum(walletData)
      };

      // Send to cloud
      const response = await fetch(`${this.config.apiEndpoint}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-User-Id': this.config.userId
        },
        body: JSON.stringify(syncData)
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      console.log('✅ Synced to cloud successfully');
    } catch (error) {
      console.error('❌ Sync to cloud failed:', error);
      this.pendingChanges.push({ timestamp: Date.now() });
    }
  }

  // Sync cloud data to local
  async syncFromCloud() {
    try {
      const response = await fetch(
        `${this.config.apiEndpoint}/sync?userId=${this.config.userId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'X-User-Id': this.config.userId
          }
        }
      );

      if (!response.ok) {
        throw new Error('Sync from cloud failed');
      }

      const syncData: SyncData = await response.json();
      
      // Decrypt data
      const cloudData = this.decryptData(syncData.data);
      
      // Get local data
      const localData = localStorage.getItem('pluto_wallet');
      const localWallet = localData ? JSON.parse(localData) : null;

      // Conflict resolution
      if (this.shouldUpdateLocal(localWallet, syncData)) {
        localStorage.setItem('pluto_wallet', JSON.stringify(cloudData));
        
        // Notify app of update
        window.dispatchEvent(new CustomEvent('wallet-synced', {
          detail: { data: cloudData, source: 'cloud' }
        }));
        
        console.log('✅ Synced from cloud successfully');
      }
    } catch (error) {
      console.error('❌ Sync from cloud failed:', error);
    }
  }

  // Conflict resolution: Determine which version is newer
  private shouldUpdateLocal(localData: any, cloudData: SyncData): boolean {
    if (!localData) return true; // No local data, use cloud
    
    const localModified = localData.lastModified || 0;
    const cloudModified = cloudData.lastModified;

    // Use the most recent version
    return cloudModified > localModified;
  }

  // Encrypt sensitive data before sending to cloud
  private encryptData(data: any): string {
    // Use Web Crypto API for encryption
    const jsonString = JSON.stringify(data);
    
    // For production, use proper AES-256-GCM encryption
    // This is a simplified example
    return btoa(jsonString); // Base64 encoding (use real encryption!)
  }

  // Decrypt data from cloud
  private decryptData(encryptedData: string): any {
    // Decrypt using the same key
    const jsonString = atob(encryptedData);
    return JSON.parse(jsonString);
  }

  // Calculate checksum for data integrity
  private calculateChecksum(data: any): string {
    const jsonString = JSON.stringify(data);
    
    // Simple hash (use crypto.subtle.digest in production)
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  // Get device identifier
  private getDeviceId(): string {
    let deviceId = localStorage.getItem('pluto_device_id');
    
    if (!deviceId) {
      deviceId = `web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('pluto_device_id', deviceId);
    }
    
    return deviceId;
  }

  // Get current version from cloud
  private async getCloudVersion(): Promise<number> {
    try {
      const response = await fetch(
        `${this.config.apiEndpoint}/version?userId=${this.config.userId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'X-User-Id': this.config.userId
          }
        }
      );
      
      const data = await response.json();
      return data.version || 0;
    } catch (error) {
      return 0;
    }
  }

  // Handle local storage changes
  private handleLocalChange(newValue: string | null) {
    if (newValue) {
      console.log('📝 Local data changed, syncing...');
      this.syncToCloud();
    }
  }

  // Sync pending changes when back online
  private async syncPendingChanges() {
    if (this.pendingChanges.length > 0) {
      console.log(`🔄 Syncing ${this.pendingChanges.length} pending changes...`);
      await this.syncToCloud();
      this.pendingChanges = [];
    }
  }

  // Stop sync service
  public stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Force immediate sync
  public async forceSyncNow() {
    await this.syncToCloud();
    await this.syncFromCloud();
  }
}

export default PlutoSyncService;
```

---

### **Step 2: Integrate Sync Service in App**

```typescript
// /App.tsx

import { useEffect, useRef } from 'react';
import PlutoSyncService from './utils/syncService';

export default function App() {
  const syncServiceRef = useRef<PlutoSyncService | null>(null);
  const [walletData, setWalletData] = useState<any>(null);

  useEffect(() => {
    // Initialize sync service
    const userId = walletData?.userId || 'guest';
    
    syncServiceRef.current = new PlutoSyncService({
      userId: userId,
      apiEndpoint: 'https://your-api.com/api',
      apiKey: 'your-api-key',
      encryptionKey: 'your-encryption-key'
    });

    // Listen for sync events
    const handleWalletSynced = (event: CustomEvent) => {
      console.log('💾 Wallet data synced from cloud');
      setWalletData(event.detail.data);
    };

    window.addEventListener('wallet-synced', handleWalletSynced as EventListener);

    return () => {
      // Cleanup
      syncServiceRef.current?.stopSync();
      window.removeEventListener('wallet-synced', handleWalletSynced as EventListener);
    };
  }, [walletData?.userId]);

  // Update wallet and trigger sync
  const handleUpdateWallet = (newData: any) => {
    // Update local storage
    localStorage.setItem('pluto_wallet', JSON.stringify(newData));
    
    // Update state
    setWalletData(newData);
    
    // Sync will happen automatically via background interval
  };

  return (
    // Your app JSX
  );
}
```

---

### **Step 3: Backend API for Sync**

You need a simple API to handle sync operations:

```typescript
// Backend API (Node.js/Express example)

import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const app = express();
app.use(express.json());

// Storage directory
const STORAGE_DIR = './user-data';

// Ensure storage directory exists
fs.mkdir(STORAGE_DIR, { recursive: true });

// POST /api/sync - Upload wallet data
app.post('/api/sync', async (req, res) => {
  try {
    const { userId, data, lastModified, deviceId, version, checksum } = req.body;
    
    // Validate
    if (!userId || !data) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // File path for user data
    const userFilePath = path.join(STORAGE_DIR, `${userId}.json`);
    
    // Read existing data (if any)
    let existingData = null;
    try {
      const fileContent = await fs.readFile(userFilePath, 'utf-8');
      existingData = JSON.parse(fileContent);
    } catch (error) {
      // File doesn't exist, that's okay
    }

    // Conflict resolution: Check version
    if (existingData && existingData.version >= version) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Cloud version is newer',
        cloudVersion: existingData.version,
        cloudData: existingData
      });
    }

    // Save new data
    const syncData = {
      userId,
      data,
      lastModified,
      deviceId,
      version,
      checksum,
      syncedAt: Date.now()
    };

    await fs.writeFile(userFilePath, JSON.stringify(syncData, null, 2));
    
    res.json({
      success: true,
      version: version,
      message: 'Data synced successfully'
    });

  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/sync - Download wallet data
app.get('/api/sync', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const userFilePath = path.join(STORAGE_DIR, `${userId}.json`);
    
    // Read user data
    const fileContent = await fs.readFile(userFilePath, 'utf-8');
    const syncData = JSON.parse(fileContent);
    
    res.json(syncData);

  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'User data not found' });
    }
    
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/version - Get current version
app.get('/api/version', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const userFilePath = path.join(STORAGE_DIR, `${userId}.json`);
    
    try {
      const fileContent = await fs.readFile(userFilePath, 'utf-8');
      const syncData = JSON.parse(fileContent);
      
      res.json({ version: syncData.version || 0 });
    } catch (error) {
      res.json({ version: 0 });
    }

  } catch (error) {
    console.error('Version check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(3000, () => {
  console.log('Sync API running on port 3000');
});
```

---

## Native App Implementation

### **iOS (Swift)**

```swift
// SyncService.swift

import Foundation

class PlutoSyncService {
    private let apiEndpoint = "https://your-api.com/api"
    private let userId: String
    private var syncTimer: Timer?
    
    init(userId: String) {
        self.userId = userId
        startPeriodicSync()
    }
    
    // Start background sync
    func startPeriodicSync() {
        // Sync every 5 seconds
        syncTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            self?.syncToCloud()
        }
    }
    
    // Sync to cloud
    func syncToCloud() {
        // Get data from UserDefaults
        guard let walletData = UserDefaults.standard.string(forKey: "pluto_wallet") else {
            return
        }
        
        let deviceId = getDeviceId()
        let version = getCloudVersion() + 1
        
        let syncData: [String: Any] = [
            "userId": userId,
            "data": encryptData(walletData),
            "lastModified": Date().timeIntervalSince1970 * 1000,
            "deviceId": deviceId,
            "version": version,
            "checksum": calculateChecksum(walletData)
        ]
        
        // Create request
        guard let url = URL(string: "\(apiEndpoint)/sync") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.addValue("Bearer your-api-key", forHTTPHeaderField: "Authorization")
        request.httpBody = try? JSONSerialization.data(withJSONObject: syncData)
        
        // Send request
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("❌ Sync failed:", error)
                return
            }
            
            print("✅ Synced to cloud successfully")
        }.resume()
    }
    
    // Sync from cloud
    func syncFromCloud(completion: @escaping (Bool) -> Void) {
        guard let url = URL(string: "\(apiEndpoint)/sync?userId=\(userId)") else {
            completion(false)
            return
        }
        
        var request = URLRequest(url: url)
        request.addValue("Bearer your-api-key", forHTTPHeaderField: "Authorization")
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            guard let data = data, error == nil else {
                completion(false)
                return
            }
            
            if let syncData = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let encryptedData = syncData["data"] as? String {
                
                let decryptedData = self.decryptData(encryptedData)
                
                // Save to UserDefaults
                UserDefaults.standard.set(decryptedData, forKey: "pluto_wallet")
                
                // Notify app
                NotificationCenter.default.post(name: .walletSynced, object: nil)
                
                completion(true)
            } else {
                completion(false)
            }
        }.resume()
    }
    
    // Helper methods
    private func getDeviceId() -> String {
        if let deviceId = UserDefaults.standard.string(forKey: "pluto_device_id") {
            return deviceId
        }
        
        let newDeviceId = "ios-\(UUID().uuidString)"
        UserDefaults.standard.set(newDeviceId, forKey: "pluto_device_id")
        return newDeviceId
    }
    
    private func encryptData(_ data: String) -> String {
        // Implement proper encryption (AES-256)
        return data.data(using: .utf8)?.base64EncodedString() ?? ""
    }
    
    private func decryptData(_ encrypted: String) -> String {
        // Implement proper decryption
        guard let data = Data(base64Encoded: encrypted) else { return "" }
        return String(data: data, encoding: .utf8) ?? ""
    }
    
    private func calculateChecksum(_ data: String) -> String {
        // Calculate hash
        return String(data.hashValue)
    }
    
    private func getCloudVersion() -> Int {
        // Fetch current version from cloud
        return 0 // Simplified
    }
    
    deinit {
        syncTimer?.invalidate()
    }
}

// Notification extension
extension Notification.Name {
    static let walletSynced = Notification.Name("walletSynced")
}
```

### **Android (Kotlin)**

```kotlin
// SyncService.kt

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.*

class PlutoSyncService(
    private val context: Context,
    private val userId: String
) {
    private val apiEndpoint = "https://your-api.com/api"
    private val prefs: SharedPreferences = 
        context.getSharedPreferences("pluto_wallet", Context.MODE_PRIVATE)
    
    private val client = OkHttpClient()
    private var syncJob: Job? = null
    
    init {
        startPeriodicSync()
    }
    
    // Start background sync
    private fun startPeriodicSync() {
        syncJob = CoroutineScope(Dispatchers.IO).launch {
            while (isActive) {
                syncToCloud()
                delay(5000) // 5 seconds
            }
        }
    }
    
    // Sync to cloud
    private suspend fun syncToCloud() {
        withContext(Dispatchers.IO) {
            try {
                val walletData = prefs.getString("pluto_wallet", null) ?: return@withContext
                
                val deviceId = getDeviceId()
                val version = getCloudVersion() + 1
                
                val syncData = JSONObject().apply {
                    put("userId", userId)
                    put("data", encryptData(walletData))
                    put("lastModified", System.currentTimeMillis())
                    put("deviceId", deviceId)
                    put("version", version)
                    put("checksum", calculateChecksum(walletData))
                }
                
                val body = syncData.toString()
                    .toRequestBody("application/json".toMediaType())
                
                val request = Request.Builder()
                    .url("$apiEndpoint/sync")
                    .post(body)
                    .addHeader("Authorization", "Bearer your-api-key")
                    .build()
                
                val response = client.newCall(request).execute()
                
                if (response.isSuccessful) {
                    println("✅ Synced to cloud successfully")
                } else {
                    println("❌ Sync failed: ${response.code}")
                }
                
            } catch (e: Exception) {
                println("❌ Sync error: ${e.message}")
            }
        }
    }
    
    // Sync from cloud
    suspend fun syncFromCloud(): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                val request = Request.Builder()
                    .url("$apiEndpoint/sync?userId=$userId")
                    .addHeader("Authorization", "Bearer your-api-key")
                    .build()
                
                val response = client.newCall(request).execute()
                
                if (response.isSuccessful) {
                    val jsonData = JSONObject(response.body?.string() ?: "{}")
                    val encryptedData = jsonData.getString("data")
                    val decryptedData = decryptData(encryptedData)
                    
                    // Save to SharedPreferences
                    prefs.edit()
                        .putString("pluto_wallet", decryptedData)
                        .apply()
                    
                    // Notify app
                    // Use LiveData or EventBus to notify UI
                    
                    println("✅ Synced from cloud successfully")
                    true
                } else {
                    println("❌ Sync from cloud failed: ${response.code}")
                    false
                }
                
            } catch (e: Exception) {
                println("❌ Sync from cloud error: ${e.message}")
                false
            }
        }
    }
    
    // Helper methods
    private fun getDeviceId(): String {
        var deviceId = prefs.getString("pluto_device_id", null)
        
        if (deviceId == null) {
            deviceId = "android-${UUID.randomUUID()}"
            prefs.edit().putString("pluto_device_id", deviceId).apply()
        }
        
        return deviceId
    }
    
    private fun encryptData(data: String): String {
        // Implement proper AES-256 encryption
        return android.util.Base64.encodeToString(
            data.toByteArray(),
            android.util.Base64.DEFAULT
        )
    }
    
    private fun decryptData(encrypted: String): String {
        // Implement proper decryption
        return String(
            android.util.Base64.decode(encrypted, android.util.Base64.DEFAULT)
        )
    }
    
    private fun calculateChecksum(data: String): String {
        return data.hashCode().toString()
    }
    
    private fun getCloudVersion(): Int {
        // Fetch version from cloud
        return 0 // Simplified
    }
    
    fun stopSync() {
        syncJob?.cancel()
    }
}
```

---

## Cloud Service Options

### **Option A: Firebase Realtime Database**

```typescript
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue } from 'firebase/database';

const firebaseConfig = {
  apiKey: "your-api-key",
  databaseURL: "https://pluto-wallet.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Write data
function syncToFirebase(userId: string, walletData: any) {
  const userRef = ref(db, `users/${userId}/wallet`);
  set(userRef, {
    data: walletData,
    lastModified: Date.now(),
    version: Date.now()
  });
}

// Read data (real-time)
function listenToFirebase(userId: string, callback: (data: any) => void) {
  const userRef = ref(db, `users/${userId}/wallet`);
  onValue(userRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  });
}
```

### **Option B: Supabase Realtime**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
);

// Write data
async function syncToSupabase(userId: string, walletData: any) {
  const { data, error } = await supabase
    .from('wallet_data')
    .upsert({
      user_id: userId,
      data: walletData,
      last_modified: new Date().toISOString(),
      version: Date.now()
    });
}

// Read data (real-time)
function listenToSupabase(userId: string, callback: (data: any) => void) {
  supabase
    .channel('wallet-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'wallet_data',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();
}
```

---

## Conflict Resolution Strategies

### **Strategy 1: Last Write Wins**

```typescript
function resolveConflict(localData: any, cloudData: any) {
  // Use most recent timestamp
  if (cloudData.lastModified > localData.lastModified) {
    return cloudData; // Cloud is newer
  }
  return localData; // Local is newer
}
```

### **Strategy 2: Version-Based**

```typescript
function resolveConflict(localData: any, cloudData: any) {
  if (cloudData.version > localData.version) {
    return cloudData;
  }
  return localData;
}
```

### **Strategy 3: Merge Strategy**

```typescript
function resolveConflict(localData: any, cloudData: any) {
  // Merge specific fields
  return {
    balances: cloudData.balances, // Use cloud balances (admin may have adjusted)
    transactions: mergeTransactions(localData.transactions, cloudData.transactions),
    settings: localData.settings, // Keep local settings
    lastModified: Math.max(localData.lastModified, cloudData.lastModified)
  };
}

function mergeTransactions(local: any[], cloud: any[]) {
  // Combine and deduplicate transactions
  const allTransactions = [...local, ...cloud];
  const uniqueTransactions = Array.from(
    new Map(allTransactions.map(tx => [tx.id, tx])).values()
  );
  return uniqueTransactions;
}
```

---

## Security Best Practices

### **1. Encryption**

```typescript
// Use Web Crypto API for encryption
async function encryptData(data: any, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(JSON.stringify(data));
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    dataBuffer
  );
  
  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encryptedBuffer), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

async function decryptData(encryptedData: string, key: CryptoKey): Promise<any> {
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    data
  );
  
  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(decryptedBuffer));
}
```

### **2. Authentication**

```typescript
// Use JWT tokens for API authentication
const token = await getUserToken(); // Get from auth service

fetch('https://your-api.com/api/sync', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-User-Id': userId
  }
});
```

### **3. Rate Limiting**

```typescript
// Implement exponential backoff
class SyncRateLimiter {
  private attempts = 0;
  private maxAttempts = 5;
  
  async syncWithBackoff() {
    try {
      await this.sync();
      this.attempts = 0; // Reset on success
    } catch (error) {
      this.attempts++;
      
      if (this.attempts >= this.maxAttempts) {
        console.error('Max sync attempts reached');
        return;
      }
      
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      const delay = Math.pow(2, this.attempts) * 1000;
      setTimeout(() => this.syncWithBackoff(), delay);
    }
  }
}
```

---

## Testing Sync Across Platforms

```bash
# 1. Start web app
npm run dev

# 2. Open in browser
# Make changes to wallet (e.g., send transaction)

# 3. Check sync API
curl https://your-api.com/api/sync?userId=test123

# 4. Open iOS simulator
# Changes should appear automatically

# 5. Open Android emulator
# Changes should appear automatically

# 6. Make change on Android
# Changes should sync to web and iOS
```

---

## Summary

```
┌─────────────────────────────────────────────────────────┐
│              Cross-Platform Sync Flow                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  User makes change on iOS                              │
│          ↓                                              │
│  Save to UserDefaults (local)                          │
│          ↓                                              │
│  Background sync uploads to cloud (encrypted)          │
│          ↓                                              │
│  Cloud API saves to file                               │
│          ↓                                              │
│  Android & Web poll for changes                        │
│          ↓                                              │
│  Download and decrypt data                             │
│          ↓                                              │
│  Update local storage (SharedPrefs / localStorage)     │
│          ↓                                              │
│  UI updates automatically                              │
│                                                         │
│  ✅ All platforms in sync!                             │
└─────────────────────────────────────────────────────────┘
```

**Key Benefits:**
- ✅ Real-time sync across all platforms
- ✅ Offline-first (local storage)
- ✅ Encrypted data in transit and at rest
- ✅ Conflict resolution
- ✅ No database required (file-based)
- ✅ Works with PWA, iOS, and Android

This architecture ensures your localStorage data stays synchronized across all platforms in real-time!
