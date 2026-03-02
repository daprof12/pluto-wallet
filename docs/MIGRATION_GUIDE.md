# 🚀 Pluto Wallet - Data Migration Guide

This guide explains how to migrate your local wallet data to Supabase for cloud sync and cross-platform access.

---

## ✨ What Gets Migrated?

The migration script will sync the following data to Supabase:

✅ **Wallet Data**
- Wallet name and ID
- Encrypted mnemonic phrase
- Wallet creation date

✅ **Wallet Balances**
- All cryptocurrency balances (BTC, ETH, SOL, BNB, USDT, etc.)
- Balance history and updates

✅ **Wallet Addresses**
- All blockchain addresses for each supported coin
- Address labels and metadata

✅ **Transactions**
- Complete transaction history
- Transaction status and confirmations
- Fee information
- Transaction metadata

✅ **User Settings**
- Theme preferences (dark/light mode)
- Notification settings
- Display preferences

✅ **Assets Configuration**
- Custom asset configurations
- Asset display order
- Asset preferences

✅ **Admin Fee Settings**
- Withdrawal fee configurations
- Gas fee settings
- Minimum withdraw amounts

✅ **Notifications**
- User notifications
- Notification read status

✅ **Support Data**
- Support tickets
- Ticket messages
- Live chat history

✅ **Audit Logs**
- Admin audit logs
- System event logs

---

## 🎯 How to Run Migration

### Step 1: Access Settings

1. Open your Pluto Wallet
2. Unlock your wallet with PIN or password
3. Click on **Settings** icon in the bottom navigation
4. Click on the **Sync** tab (database icon)

### Step 2: Review Migration Panel

The Migration Panel will show you:

- **Status of local data**: What data you have stored locally
- **Migration status**: Whether you've already migrated
- **Data summary**: How many wallets, transactions, etc. will be migrated

### Step 3: Start Migration

1. Click the **"Start Migration"** button
2. Wait for the migration process to complete (usually takes 10-30 seconds)
3. Review the migration summary

### Step 4: Verify Migration

After migration completes, check:

- ✅ Migration success message appears
- ✅ Summary shows correct counts (wallets, transactions, etc.)
- ✅ No errors are displayed
- ✅ `pluto_migrated_to_supabase` flag is set in localStorage

### Step 5: (Optional) Clear Local Storage

After successful migration:

1. Your data is now safely stored in Supabase
2. You can optionally click **"Clear Local Storage"** to free up space
3. Data will automatically sync back from Supabase when needed

---

## 📊 Migration States

### State 1: Not Started
- Fresh wallet with no migration history
- Shows **"Start Migration"** button
- Displays what data will be migrated

### State 2: In Progress
- Shows progress bar
- Displays migration status messages
- Console logs show detailed progress

### State 3: Complete
- Shows success message with summary
- Displays migrated tables
- Shows migration date/time
- Option to clear local storage

### State 4: Already Migrated
- Shows **"Migration Already Complete"** message
- Displays original migration date
- Option to clear local storage if data still exists

---

## 🔄 What Happens During Migration?

### Phase 1: Wallet Data (10%)
1. Reads `pluto_wallet` from localStorage
2. Creates or updates wallet in Supabase
3. Migrates wallet balances
4. Migrates wallet addresses

### Phase 2: User Settings (30%)
1. Reads user preferences from localStorage
2. Creates user_settings record in Supabase

### Phase 3: Transactions (50%)
1. Reads all transactions from localStorage
2. Checks for duplicates (by transaction hash)
3. Inserts new transactions into Supabase

### Phase 4: Assets & Fees (70%)
1. Migrates custom asset configurations
2. Migrates admin fee settings

### Phase 5: Support Data (85%)
1. Migrates notifications
2. Migrates support tickets
3. Migrates live chat data

### Phase 6: Audit Logs (95%)
1. Migrates admin audit logs

### Phase 7: Complete (100%)
1. Sets migration completion flag
2. Shows summary
3. Returns result

---

## ⚠️ Important Notes

### Data Safety
- ✅ **Local data is NOT deleted** during migration
- ✅ Migration is **non-destructive** - it only adds/updates data in Supabase
- ✅ Duplicate transactions are automatically skipped (based on hash)
- ✅ You can run migration multiple times safely

### Re-running Migration
- Running migration again will:
  - Update existing wallet data
  - Add new transactions since last migration
  - Skip duplicate transactions
  - Not create duplicate records

### Error Handling
If migration encounters errors:
1. Errors are collected and displayed
2. Partial migration is still saved
3. You can re-run migration to complete missing parts
4. Check browser console for detailed error messages

---

## 🐛 Troubleshooting

### Problem: "No Data to Migrate"
**Cause**: No localStorage data found
**Solution**: Create a wallet first, then try migration

### Problem: "Migration Failed"
**Possible Causes:**
1. Supabase credentials not configured
2. Network connection issues
3. Supabase project not set up

**Solutions:**
1. Check `.env` file has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
2. Verify internet connection
3. Check Supabase dashboard is accessible
4. Run `/supabase/complete_schema.sql` in Supabase SQL Editor

### Problem: "Asset not found in database"
**Cause**: Asset exists in localStorage but not in Supabase
**Solution**: 
1. Run `/supabase/complete_schema.sql` to seed default assets
2. Or add the asset manually in Supabase dashboard

### Problem: Migration stuck at specific percentage
**Cause**: Specific table migration failing
**Solutions:**
1. Check browser console for detailed error
2. Verify that table exists in Supabase
3. Check Supabase Row-Level Security policies
4. Try re-running migration after fixing the issue

### Problem: "Permission denied for table"
**Cause**: Row-Level Security (RLS) policies blocking access
**Solution**:
1. Check RLS policies in Supabase dashboard
2. Ensure user authentication is working
3. Verify `userId` is being passed correctly

---

## 🔐 Security Considerations

### What Gets Encrypted?
- ✅ Mnemonic phrase (already encrypted before storage)
- ✅ Sensitive user data (handled by Supabase)

### What Doesn't Get Encrypted?
- Transaction hashes (public blockchain data)
- Wallet addresses (public blockchain data)
- Asset symbols and names

### Supabase Security Features
- ✅ Row-Level Security (RLS) enabled
- ✅ Users can only access their own data
- ✅ Admins have separate access controls
- ✅ All connections use SSL/HTTPS

---

## 📈 Migration Performance

### Typical Migration Times

| Data Volume | Time |
|------------|------|
| 1 wallet, 0-10 transactions | 5-10 seconds |
| 1 wallet, 10-100 transactions | 10-20 seconds |
| 1 wallet, 100-500 transactions | 20-40 seconds |
| 1 wallet, 500+ transactions | 40-60 seconds |

### Performance Tips
1. **Good internet connection**: Migration needs to upload data
2. **Don't close browser**: Wait for completion
3. **Check Supabase quota**: Free tier has limits
4. **Run during off-peak hours**: Better Supabase performance

---

## 🎓 Advanced Usage

### Programmatic Migration

You can also trigger migration programmatically:

```typescript
import { migrateAllDataToSupabase } from './supabase/migrate_localstorage_to_supabase';

const userId = 'your-user-id';
const result = await migrateAllDataToSupabase(userId);

if (result.success) {
  console.log('✅ Migration successful!');
  console.log('Summary:', result.summary);
} else {
  console.log('❌ Migration failed');
  console.log('Errors:', result.errors);
}
```

### Custom Migration Logic

You can customize migration by modifying `/supabase/migrate_localstorage_to_supabase.ts`:

- Add custom data sources
- Skip certain tables
- Transform data before migration
- Add custom validation logic

---

## 📚 Related Documentation

- [Supabase Setup Guide](/supabase/SETUP_GUIDE.md)
- [Supabase README](/supabase/README.md)
- [Cross-Platform Sync Guide](/docs/CROSS_PLATFORM_SYNC_GUIDE.md)
- [Complete Schema](/supabase/complete_schema.sql)

---

## ✅ Migration Checklist

Before migration:
- [ ] Supabase project created
- [ ] Environment variables configured
- [ ] Database schema created (26 tables)
- [ ] Wallet data exists in localStorage
- [ ] Internet connection stable

During migration:
- [ ] Don't close browser window
- [ ] Don't navigate away from page
- [ ] Monitor progress bar
- [ ] Check for error messages

After migration:
- [ ] Verify success message
- [ ] Check migration summary
- [ ] Verify data in Supabase dashboard
- [ ] Test wallet functionality
- [ ] (Optional) Clear local storage

---

## 🆘 Need Help?

If you encounter issues:

1. **Check Console**: Open browser DevTools (F12) and check Console tab
2. **Check Supabase Logs**: Go to Supabase Dashboard > Logs
3. **Review Error Messages**: Migration panel shows detailed errors
4. **Check Documentation**: Review setup guides
5. **Try Again**: Most issues are temporary - retry migration

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Pluto Wallet Team**
