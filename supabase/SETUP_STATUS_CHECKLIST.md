# 🔍 Pluto Wallet - Supabase Setup Status Checklist

Use this checklist to verify your Supabase setup is complete.

---

## ✅ Phase 1: Supabase Project Setup

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

### Tasks:

- [ ] **1.1** Created Supabase account at [supabase.com](https://supabase.com)
- [ ] **1.2** Created new Supabase project
- [ ] **1.3** Project is ready (green status indicator)
- [ ] **1.4** Saved database password securely

**How to verify:**
- Log into Supabase dashboard
- You should see your project listed
- Project should show "Active" status

---

## ✅ Phase 2: Environment Configuration

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

### Tasks:

- [ ] **2.1** `.env` file exists in project root
- [ ] **2.2** `.env` contains `VITE_SUPABASE_URL` with real value
- [ ] **2.3** `.env` contains `VITE_SUPABASE_ANON_KEY` with real value
- [ ] **2.4** `.gitignore` includes `.env` (prevents committing secrets)
- [ ] **2.5** `.env.example` exists for team reference

**How to verify:**
```bash
# Check if .env exists
ls -la .env

# Check if .gitignore includes .env
cat .gitignore | grep "\.env"

# Verify environment variables are set (should show your values)
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY
```

**Your credentials should look like:**
```bash
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODMxNjgwMCwiZXhwIjoxOTUzODkyODAwfQ.SomeRandomStringHere
```

❌ **Not like this (these are placeholders):**
```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## ✅ Phase 3: Database Schema Creation

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

### Tasks:

- [ ] **3.1** Opened Supabase SQL Editor
- [ ] **3.2** Copied entire `/supabase/complete_schema.sql` file
- [ ] **3.3** Pasted into SQL Editor
- [ ] **3.4** Clicked "Run" and got success message
- [ ] **3.5** No error messages in output

**How to verify:**

1. **In Supabase Dashboard → SQL Editor:**
   - Look for success messages:
   ```
   NOTICE: Pluto Wallet schema created successfully!
   NOTICE: Total tables: 26
   NOTICE: Total functions: 5
   ```

2. **In Supabase Dashboard → Table Editor:**
   - You should see 26 tables:
   
   **Core Tables (11):**
   - [ ] users
   - [ ] user_settings
   - [ ] user_sessions
   - [ ] wallets
   - [ ] wallet_balances
   - [ ] wallet_addresses
   - [ ] assets
   - [ ] asset_prices
   - [ ] transactions
   - [ ] transaction_fees
   - [ ] admin_fee_settings
   
   **Support Tables (6):**
   - [ ] user_notifications
   - [ ] support_tickets
   - [ ] support_ticket_messages
   - [ ] live_chats
   - [ ] live_chat_messages
   - [ ] audit_logs
   
   **Sync Tables (3):**
   - [ ] device_sessions
   - [ ] pending_sync_queue
   - [ ] sync_conflicts

3. **Check Assets Table has data:**
   - Click on `assets` table
   - Should see 6 rows:
     - [ ] Bitcoin (BTC)
     - [ ] Ethereum (ETH)
     - [ ] Solana (SOL)
     - [ ] BNB (BNB)
     - [ ] TRON (TRX)
     - [ ] Tether (USDT)

---

## ✅ Phase 4: Connection Test

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

### Tasks:

- [ ] **4.1** Installed Supabase client: `npm install @supabase/supabase-js`
- [ ] **4.2** Created test connection file
- [ ] **4.3** Test connection successful
- [ ] **4.4** Can fetch assets from database

**Quick Test:**

Create `test-connection.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

async function test() {
  const { data, error } = await supabase.from('assets').select('*');
  
  if (error) {
    console.error('❌ Connection failed:', error.message);
    return false;
  }
  
  console.log('✅ Connected successfully!');
  console.log('📊 Found', data.length, 'assets');
  return true;
}

test();
```

Run:
```bash
npx tsx test-connection.ts
```

Expected output:
```
✅ Connected successfully!
📊 Found 6 assets
```

---

## ✅ Phase 5: Application Integration

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

### Tasks:

- [ ] **5.1** App can read `process.env.VITE_SUPABASE_URL`
- [ ] **5.2** App can read `process.env.VITE_SUPABASE_ANON_KEY`
- [ ] **5.3** Supabase client initialized in app
- [ ] **5.4** Dev server restarted after `.env` changes

**How to verify:**
```bash
# Restart dev server
npm run dev

# Check browser console for Supabase connection
# Should NOT see errors like:
# "Failed to initialize Supabase"
# "Invalid API key"
```

---

## ✅ Phase 6: Data Migration (Optional)

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Not Needed

### Tasks (if you have existing localStorage data):

- [ ] **6.1** Migration script imported
- [ ] **6.2** Migration function called
- [ ] **6.3** Wallet data migrated successfully
- [ ] **6.4** Transactions migrated successfully
- [ ] **6.5** Verified data in Supabase tables

**Skip this if:** You're starting fresh with no existing wallet data.

---

## ✅ Phase 7: Production Readiness

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

### Tasks:

- [ ] **7.1** Changed default admin password in `.env`
- [ ] **7.2** Row-Level Security (RLS) policies verified
- [ ] **7.3** Enabled Supabase Realtime for required tables
- [ ] **7.4** Set up database backups
- [ ] **7.5** Configured monitoring/alerts
- [ ] **7.6** API rate limits reviewed
- [ ] **7.7** SSL/HTTPS enabled
- [ ] **7.8** Created separate production Supabase project

---

## 🚨 Common Issues & Solutions

### Issue 1: "Cannot find .env file"
**Solution:** Create it in project root, not in `/supabase/` folder
```bash
touch .env
```

### Issue 2: "Invalid API key"
**Solutions:**
- Check for typos in `.env`
- Make sure key doesn't have extra spaces
- Verify you copied the **anon/public** key, not service_role key
- Restart dev server after changing `.env`

### Issue 3: "Table does not exist"
**Solution:** Run the `complete_schema.sql` in Supabase SQL Editor

### Issue 4: "Permission denied"
**Solution:** Check Row-Level Security policies are enabled

### Issue 5: Environment variables are undefined
**Solution:** 
- Restart dev server
- Check file is named `.env` not `env.txt`
- Variables must start with `VITE_` for Vite to expose them

---

## 📊 Setup Status Summary

Count your checkmarks:

- **0-5 tasks:** 🔴 Just getting started
- **6-15 tasks:** 🟡 Making progress
- **16-25 tasks:** 🟢 Almost there!
- **26-30 tasks:** ✅ Setup complete!
- **31+ tasks:** 🎉 Production ready!

---

## 🎯 What's Your Current Status?

### Minimum Required (to start development):
- ✅ Phase 1: Supabase Project Setup
- ✅ Phase 2: Environment Configuration  
- ✅ Phase 3: Database Schema Creation
- ✅ Phase 4: Connection Test

### Recommended (for full functionality):
- ✅ Phase 5: Application Integration
- ✅ Phase 6: Data Migration (if needed)

### Before Production Launch:
- ✅ Phase 7: Production Readiness

---

## 📝 Next Steps Based on Your Status

### If you haven't completed Phase 1-2:
👉 Follow `/supabase/SETUP_GUIDE.md` steps 1-3

### If you haven't completed Phase 3:
👉 Run `/supabase/complete_schema.sql` in Supabase SQL Editor

### If you haven't completed Phase 4:
👉 Test connection with the test script above

### If everything is complete:
🎉 **You're ready to build!** Start your development server and begin using Supabase!

---

## 🆘 Need Help?

1. **Check** `/supabase/SETUP_GUIDE.md` for detailed instructions
2. **Review** `/supabase/README.md` for technical details
3. **Check** Supabase dashboard logs for errors
4. **Verify** environment variables are loaded correctly

---

**Last Updated:** After creating schema files
**Your Project:** Pluto Multi-Chain Wallet