# Pluto Multi-Chain Wallet - Supabase Migration Guide

This directory contains all the SQL scripts and migration tools needed to set up Supabase for cross-platform sync.

## 📁 Files Overview

### 1. `drop_all_tables.sql`
Drops all existing Supabase tables and related objects. **Use with caution!**

### 2. `complete_schema.sql`
Complete database schema that includes:
- 26 tables covering all wallet functionality
- Cross-platform sync tables
- User management & admin capabilities
- Transaction tracking with gas fees
- Support system & live chat
- Audit logging
- Row-level security (RLS)
- Helper functions for common operations

### 3. `migrate_localstorage_to_supabase.ts`
TypeScript migration script to move all localStorage data to Supabase

## 🚀 Quick Start

### Step 1: Set Up Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be ready (takes ~2 minutes)
3. Copy your project URL and anon key

### Step 2: Drop Existing Tables (If Any)

If you previously ran the old schema, drop all tables first:

```sql
-- Execute in Supabase SQL Editor
\i drop_all_tables.sql
```

Or manually copy and paste the contents of `drop_all_tables.sql` into the Supabase SQL Editor.

### Step 3: Create New Schema

Execute the complete schema:

```sql
-- Execute in Supabase SQL Editor
\i complete_schema.sql
```

Or manually copy and paste the contents of `complete_schema.sql` into the Supabase SQL Editor.

This will create:
- ✅ 26 tables
- ✅ 5+ helper functions
- ✅ Custom types
- ✅ Indexes for performance
- ✅ Row-level security policies
- ✅ Default asset data (BTC, ETH, SOL, BNB, TRX, USDT)

### Step 4: Configure Environment Variables

Add to your `.env` file:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Step 5: Migrate localStorage Data

In your app, import and run the migration script:

```typescript
import { migrateAllDataToSupabase } from './supabase/migrate_localstorage_to_supabase';

// After user logs in
const userId = 'user-uuid-from-auth';
const result = await migrateAllDataToSupabase(userId);

if (result.success) {
  console.log('Migration successful!', result.summary);
} else {
  console.error('Migration errors:', result.errors);
}
```

## 📊 Database Schema Overview

### Core Tables

#### Users & Authentication
- `users` - User accounts (regular users and admins)
- `user_settings` - User preferences (theme, language, etc.)
- `user_sessions` - Active sessions across devices

#### Wallets & Assets
- `wallets` - User wallets with encrypted mnemonics
- `wallet_balances` - Current balances for each asset
- `wallet_addresses` - Blockchain addresses for each asset
- `assets` - Supported cryptocurrencies configuration
- `asset_prices` - Real-time price data

#### Transactions
- `transactions` - All transaction history
- `transaction_fees` - Detailed fee breakdown

#### Admin Features
- `admin_fee_settings` - Fee configuration per asset
- `audit_logs` - Admin action audit trail

#### Support System
- `support_tickets` - User support tickets
- `support_ticket_messages` - Ticket conversation history
- `live_chats` - Live chat sessions
- `live_chat_messages` - Chat message history
- `user_notifications` - User notifications

#### Cross-Platform Sync
- `device_sessions` - Track active devices
- `pending_sync_queue` - Queue for offline changes
- `sync_conflicts` - Handle sync conflicts

## 🔄 Cross-Platform Sync Architecture

The schema supports real-time sync across Web, iOS, and Android:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Web PWA   │────▶│   Supabase  │◀────│ iOS/Android │
│ localStorage│     │   Database  │     │   Native    │
└─────────────┘     └─────────────┘     └─────────────┘
      ▲                    │                    ▲
      │                    │                    │
      └────────────────────┴────────────────────┘
              Real-time Bidirectional Sync
```

### How It Works

1. **Local-First**: All operations write to local storage first (fast)
2. **Background Sync**: Changes sync to Supabase in background
3. **Real-time Updates**: Other devices receive updates via Supabase Realtime
4. **Conflict Resolution**: Automatic conflict detection and resolution
5. **Offline Support**: Changes queue when offline and sync when back online

## 🔐 Security Features

### Row-Level Security (RLS)
All tables have RLS enabled with policies:
- Users can only access their own data
- Admins can access all data
- Transactions are tied to specific users/wallets

### Data Encryption
- Mnemonics are encrypted before storage
- Passwords are hashed using bcrypt
- Sensitive data never stored in plain text

### Audit Logging
All admin actions are logged with:
- User ID
- Action type
- Old and new values
- IP address and user agent
- Timestamp

## 📝 Key Functions

### `sync_wallet_data(user_id, wallet_data, sync_version)`
Sync wallet data from localStorage with conflict detection

```sql
SELECT sync_wallet_data(
  'user-uuid',
  '{"balances": {...}, "addresses": {...}}'::jsonb,
  1638316800000
);
```

### `get_user_wallet_data(user_id)`
Get complete wallet data for sync

```sql
SELECT get_user_wallet_data('user-uuid');
```

Returns:
```json
{
  "user": {...},
  "wallets": [...],
  "balances": {"BTC": "0.5", "ETH": "2.3"},
  "addresses": {"BTC": "1A1z...", "ETH": "0x123..."},
  "transactions": [...]
}
```

### `update_wallet_balance(wallet_id, asset_symbol, new_balance)`
Update a specific asset balance

```sql
SELECT update_wallet_balance(
  'wallet-uuid',
  'ETH',
  2.497
);
```

### `create_transaction(...)`
Create a new transaction

```sql
SELECT create_transaction(
  'wallet-uuid',
  'user-uuid',
  'send',
  'ETH',
  0.5,
  '{"to_address": "0x123...", "hash": "0xabc..."}'::jsonb
);
```

### `get_platform_statistics()`
Get platform-wide stats for admin dashboard

```sql
SELECT get_platform_statistics();
```

Returns:
```json
{
  "total_users": 1250,
  "active_users": 980,
  "total_wallets": 1450,
  "total_transactions": 8932,
  "pending_transactions": 23,
  "total_volume_24h": 125000.50,
  "open_tickets": 5,
  "active_chats": 2
}
```

## 🔍 Common Queries

### Get User's Total Balance in USD
```sql
SELECT 
  u.email,
  SUM(wb.balance * COALESCE(ap.price_usd, 0)) as total_usd
FROM users u
JOIN wallets w ON w.user_id = u.id
JOIN wallet_balances wb ON wb.wallet_id = w.id
JOIN assets a ON a.id = wb.asset_id
LEFT JOIN LATERAL (
  SELECT price_usd 
  FROM asset_prices 
  WHERE asset_id = a.id 
  ORDER BY last_updated_at DESC 
  LIMIT 1
) ap ON TRUE
WHERE u.id = 'user-uuid'
GROUP BY u.email;
```

### Get Recent Transactions with Asset Details
```sql
SELECT 
  t.id,
  t.type,
  t.status,
  a.name as asset_name,
  a.symbol as asset_symbol,
  t.amount,
  t.from_address,
  t.to_address,
  t.hash,
  t.timestamp
FROM transactions t
JOIN assets a ON a.id = t.asset_id
WHERE t.user_id = 'user-uuid'
ORDER BY t.timestamp DESC
LIMIT 50;
```

### Get Platform Assets Summary
```sql
SELECT 
  a.symbol,
  a.name,
  SUM(wb.balance) as total_balance,
  COUNT(DISTINCT wb.wallet_id) as holders,
  SUM(wb.balance * COALESCE(ap.price_usd, 0)) as total_value_usd
FROM assets a
LEFT JOIN wallet_balances wb ON wb.asset_id = a.id
LEFT JOIN LATERAL (
  SELECT price_usd 
  FROM asset_prices 
  WHERE asset_id = a.id 
  ORDER BY last_updated_at DESC 
  LIMIT 1
) ap ON TRUE
GROUP BY a.id, a.symbol, a.name
ORDER BY total_value_usd DESC;
```

## 🛠️ Maintenance

### Update Asset Prices
Should be run periodically (e.g., every 60 seconds):

```typescript
import { supabase } from './supabase';

async function updatePrices(prices: Record<string, number>) {
  for (const [symbol, price] of Object.entries(prices)) {
    const { data: asset } = await supabase
      .from('assets')
      .select('id')
      .eq('symbol', symbol)
      .single();

    if (asset) {
      await supabase
        .from('asset_prices')
        .insert({
          asset_id: asset.id,
          asset_symbol: symbol,
          price_usd: price,
          last_updated_at: new Date().toISOString(),
        });
    }
  }
}
```

### Clean Old Asset Prices
Keep only last 24 hours of price data:

```sql
DELETE FROM asset_prices 
WHERE last_updated_at < NOW() - INTERVAL '24 hours';
```

### Archive Old Transactions
Move old transactions to archive table (optional):

```sql
-- Create archive table (same structure as transactions)
CREATE TABLE transactions_archive (LIKE transactions INCLUDING ALL);

-- Move old transactions
INSERT INTO transactions_archive
SELECT * FROM transactions
WHERE created_at < NOW() - INTERVAL '1 year';

DELETE FROM transactions
WHERE created_at < NOW() - INTERVAL '1 year';
```

## 📈 Performance Optimization

### Indexes
All critical indexes are already created in the schema:
- User email (for login)
- Transaction wallet_id and user_id (for history)
- Transaction status and created_at (for filtering)
- Device sessions user_id (for sync)

### Query Optimization Tips

1. **Use LIMIT** - Always limit large result sets
2. **Use Indexes** - Query by indexed columns
3. **Avoid SELECT *** - Select only needed columns
4. **Use Lateral Joins** - For latest price data
5. **Batch Inserts** - Insert multiple records at once

## 🔧 Troubleshooting

### Migration Issues

**Problem**: "Asset not found" errors during migration
**Solution**: Make sure default assets are seeded first:
```sql
INSERT INTO public.assets (symbol, name, network, ...) VALUES (...);
```

**Problem**: RLS blocking data access
**Solution**: Check that user is authenticated and policies are correct:
```sql
-- Temporarily disable RLS for testing (NOT in production!)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

**Problem**: Sync conflicts
**Solution**: Check `sync_conflicts` table and resolve:
```sql
SELECT * FROM sync_conflicts WHERE user_id = 'user-uuid';
```

### Performance Issues

**Problem**: Slow transaction queries
**Solution**: Add compound index:
```sql
CREATE INDEX idx_transactions_user_created 
ON transactions(user_id, created_at DESC);
```

**Problem**: Slow balance calculations
**Solution**: Use materialized view:
```sql
CREATE MATERIALIZED VIEW user_total_balances AS
SELECT 
  w.user_id,
  SUM(wb.balance * ap.price_usd) as total_usd
FROM wallets w
JOIN wallet_balances wb ON wb.wallet_id = w.id
JOIN LATERAL (
  SELECT price_usd FROM asset_prices 
  WHERE asset_id = wb.asset_id 
  ORDER BY last_updated_at DESC LIMIT 1
) ap ON TRUE
GROUP BY w.user_id;

-- Refresh periodically
REFRESH MATERIALIZED VIEW user_total_balances;
```

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Cross-Platform Sync Guide](../docs/CROSS_PLATFORM_SYNC_GUIDE.md)
- [Row-Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Realtime](https://supabase.com/docs/guides/realtime)

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the complete schema comments
3. Check Supabase logs in dashboard
4. Review migration errors in console

## ✅ Checklist

Before going to production:

- [ ] Run `drop_all_tables.sql` to clean old schema
- [ ] Run `complete_schema.sql` to create new schema
- [ ] Verify all 26 tables created successfully
- [ ] Test RLS policies with different user roles
- [ ] Run migration script with test data
- [ ] Verify cross-platform sync works
- [ ] Set up price update cron job
- [ ] Configure backup strategy
- [ ] Enable Supabase realtime for relevant tables
- [ ] Test conflict resolution
- [ ] Review and adjust rate limits
- [ ] Set up monitoring and alerts

## 🎉 You're Ready!

Your Supabase database is now configured for:
- ✅ Multi-chain wallet management
- ✅ Cross-platform real-time sync
- ✅ Admin dashboard capabilities
- ✅ Support ticket system
- ✅ Audit logging
- ✅ Offline-first architecture
- ✅ Automatic conflict resolution

Happy syncing! 🚀
