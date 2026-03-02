# 🚀 Pluto Wallet - Supabase Setup Guide

This guide will walk you through setting up Supabase for your Pluto Multi-Chain Wallet in just a few minutes.

---

## ✅ Prerequisites

- [x] Node.js installed (v16 or higher)
- [x] A Supabase account (free tier is fine)
- [x] Basic knowledge of SQL

---

## 📋 Step-by-Step Setup

### Step 1: Create Supabase Project

1. **Go to** [supabase.com](https://supabase.com)
2. **Click** "Start your project" or "New Project"
3. **Create organization** (if you don't have one)
4. **Fill in project details:**
   - Project name: `pluto-wallet` (or your preferred name)
   - Database Password: Create a strong password (save it!)
   - Region: Choose closest to your users
   - Pricing Plan: Free (or Pro if you need more)
5. **Click** "Create new project"
6. **Wait** ~2 minutes for project to be ready ⏳

---

### Step 2: Get Your API Credentials

Once your project is ready:

1. **Click** on your project to open it
2. **Go to** Settings (gear icon in left sidebar)
3. **Click** "API" in the settings menu
4. **Copy these values:**

   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (long string)

5. **Keep these safe!** You'll need them in the next step

---

### Step 3: Configure Environment Variables

1. **Open** the `.env` file in your project root
2. **Replace the placeholder values:**

```bash
# Before:
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# After (with your actual values):
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. **Save** the file

> 🔒 **Security Note:** Never commit the `.env` file to Git! It's already in `.gitignore`.

---

### Step 4: Create Database Schema

1. **Go to** SQL Editor in your Supabase dashboard (database icon in sidebar)
2. **Click** "New query"
3. **Copy** the entire contents of `/supabase/complete_schema.sql`
4. **Paste** into the SQL editor
5. **Click** "Run" (or press `Cmd/Ctrl + Enter`)
6. **Wait** for execution to complete (~30 seconds)

You should see success messages:
```
✅ Pluto Wallet schema created successfully!
✅ Total tables: 26
✅ Total functions: 5
✅ Cross-platform sync: Enabled
✅ Row-level security: Enabled
```

---

### Step 5: Verify Database Setup

1. **Go to** Table Editor in Supabase dashboard
2. **Check** that you see these tables:
   - ✅ users
   - ✅ wallets
   - ✅ wallet_balances
   - ✅ wallet_addresses
   - ✅ transactions
   - ✅ assets
   - ✅ And 20 more tables...

3. **Click** on the `assets` table
4. **Verify** you see 6 default assets:
   - Bitcoin (BTC)
   - Ethereum (ETH)
   - Solana (SOL)
   - BNB (BNB)
   - TRON (TRX)
   - Tether (USDT)

If you see all of these, **you're good to go!** 🎉

---

### Step 6: Install Supabase Client

If you haven't already installed the Supabase client library:

```bash
npm install @supabase/supabase-js
```

---

### Step 7: Test the Connection

Create a simple test file to verify everything works:

```typescript
// test-connection.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  // Test 1: Fetch assets
  const { data: assets, error } = await supabase
    .from('assets')
    .select('*');

  if (error) {
    console.error('❌ Error connecting to Supabase:', error);
  } else {
    console.log('✅ Connected to Supabase!');
    console.log('📊 Found', assets.length, 'assets');
    console.log(assets);
  }
}

testConnection();
```

Run it:
```bash
npx tsx test-connection.ts
```

You should see:
```
✅ Connected to Supabase!
📊 Found 6 assets
[
  { id: '...', symbol: 'BTC', name: 'Bitcoin', ... },
  { id: '...', symbol: 'ETH', name: 'Ethereum', ... },
  ...
]
```

---

## 🔄 Optional: Migrate Existing Data

If you have existing localStorage data, you can migrate it to Supabase:

### Option 1: Manual Migration

1. **Import** the migration script:
```typescript
import { migrateAllDataToSupabase } from './supabase/migrate_localstorage_to_supabase';
```

2. **Call it** after user logs in:
```typescript
// After user authentication
const userId = 'user-uuid-from-your-auth-system';
const result = await migrateAllDataToSupabase(userId);

if (result.success) {
  console.log('✅ Migration successful!', result.summary);
} else {
  console.error('❌ Migration errors:', result.errors);
}
```

### Option 2: Automatic Migration

Add to your app initialization:
```typescript
// In App.tsx or main entry point
useEffect(() => {
  const migrateIfNeeded = async () => {
    const hasMigrated = localStorage.getItem('pluto_migrated_to_supabase');
    
    if (!hasMigrated && walletData) {
      const result = await migrateAllDataToSupabase(userId);
      
      if (result.success) {
        localStorage.setItem('pluto_migrated_to_supabase', 'true');
        toast.success('Data synced to cloud!');
      }
    }
  };
  
  migrateIfNeeded();
}, [userId, walletData]);
```

---

## 🔐 Security Best Practices

### 1. Row-Level Security (RLS)

RLS is **already enabled** in the schema. This means:
- Users can only access their own data
- Admins can access all data
- Unauthenticated users can't access anything

### 2. API Keys

- ✅ **anon/public key**: Safe to use in frontend (already configured)
- ⚠️ **service_role key**: Never expose in frontend! Only use server-side

### 3. Environment Variables

- ✅ Never commit `.env` to Git
- ✅ Use `.env.example` as a template
- ✅ Use different keys for dev/staging/production

### 4. Password Security

Change the default admin password before going to production!

In `.env`:
```bash
VITE_DEFAULT_ADMIN_PASSWORD=YourSecurePassword123!
```

---

## 🎯 Next Steps

Now that Supabase is set up, you can:

1. **Enable Realtime** for live updates across devices
2. **Set up authentication** with Supabase Auth
3. **Configure storage** for user uploads
4. **Add edge functions** for server-side logic
5. **Set up monitoring** and logs

---

## 📚 Additional Resources

### Supabase Documentation
- [Getting Started](https://supabase.com/docs/guides/getting-started)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Realtime](https://supabase.com/docs/guides/realtime)
- [Database Functions](https://supabase.com/docs/guides/database/functions)

### Pluto Wallet Documentation
- [Complete Schema](./complete_schema.sql)
- [Migration Script](./migrate_localstorage_to_supabase.ts)
- [Cross-Platform Sync Guide](../docs/CROSS_PLATFORM_SYNC_GUIDE.md)

---

## 🆘 Troubleshooting

### Problem: "Could not connect to Supabase"

**Solution:**
1. Check your `.env` file has correct values
2. Verify project URL doesn't have trailing slash
3. Make sure anon key is complete (very long string)
4. Restart your dev server after changing `.env`

### Problem: "relation does not exist"

**Solution:**
1. Make sure you ran the `complete_schema.sql` file
2. Check the SQL Editor for any error messages
3. Try running the schema again

### Problem: "permission denied for table"

**Solution:**
1. Check Row Level Security policies are correct
2. Make sure user is authenticated
3. Verify user has correct permissions

### Problem: "Failed to run sql query: ERROR: 42601"

**Solution:**
1. Use the **fixed** version of `complete_schema.sql` (with SELECT instead of VALUES...FROM)
2. Make sure you're using the latest version of the schema

### Problem: Migration fails with "Asset not found"

**Solution:**
1. Make sure default assets are seeded (check `assets` table)
2. Run the seed data section separately if needed

---

## ✅ Checklist

Before going to production:

- [ ] Supabase project created
- [ ] `.env` file configured with real credentials
- [ ] Database schema created (26 tables)
- [ ] Default assets seeded (6 assets)
- [ ] Connection test passed
- [ ] RLS policies verified
- [ ] Admin password changed
- [ ] Data migration completed (if applicable)
- [ ] Realtime enabled for required tables
- [ ] Backup strategy configured
- [ ] Monitoring set up

---

## 🎉 You're All Set!

Your Pluto Wallet is now connected to Supabase with:
- ✅ Cross-platform sync
- ✅ Real-time updates
- ✅ Secure data storage
- ✅ Automatic conflict resolution
- ✅ Offline-first architecture

Happy building! 🚀

---

## 💬 Need Help?

- Check the [README.md](./README.md) for more details
- Review the [troubleshooting guide](#-troubleshooting)
- Check Supabase logs in the dashboard
- Review browser console for errors