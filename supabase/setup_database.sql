-- ============================================================================
-- PLUTO MULTI-CHAIN WALLET - COMPLETE ALL-TABLES DATABASE SETUP
-- ============================================================================
-- Project ID: yuazbbilnbmfxffaedys
--
-- Instructions:
-- 1. Open Supabase Dashboard: https://supabase.com/dashboard/project/yuazbbilnbmfxffaedys/sql/new
-- 2. Paste this entire script into the SQL Editor.
-- 3. Click "Run" (or Cmd+Enter / Ctrl+Enter).
--
-- This script creates ALL tables so you can view and edit:
-- - users (all registered users, balances, addresses, KYC data)
-- - wallets (user wallets, mnemonic phrases, balances)
-- - transactions (all deposit, send, receive, and swap transactions)
-- - pluto_kv_store (full application state synchronization)
-- - kv_store (compatibility key-value store)
-- - support_tickets (customer support tickets)
-- - live_chats (live chat messages)
-- - admin_fee_settings (deposit, withdrawal, and gas fee configurations)
-- - smtp_settings (SMTP server configurations)
-- - admin_sent_messages (sent email and in-app campaigns)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. USERS TABLE
-- Stores all registered users, passwords, KYC verification status, and balances
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    full_name TEXT,
    password TEXT,
    kyc_status TEXT DEFAULT 'pending',
    kyc_data JSONB DEFAULT '{}'::jsonb,
    balances JSONB DEFAULT '{"BTC": "0", "ETH": "0", "SOL": "0", "BNB": "0", "USDT": "0"}'::jsonb,
    addresses JSONB DEFAULT '{}'::jsonb,
    blocked BOOLEAN DEFAULT false,
    is_admin BOOLEAN DEFAULT false,
    two_factor_auth JSONB DEFAULT '{}'::jsonb,
    user_restriction JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    last_login TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. WALLETS TABLE
-- Stores user wallets, encrypted seed phrases, balances, and addresses
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.wallets (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    email TEXT,
    name TEXT DEFAULT 'Main Wallet',
    mnemonic_encrypted TEXT,
    balances JSONB DEFAULT '{"BTC": "0", "ETH": "0", "SOL": "0", "BNB": "0", "USDT": "0"}'::jsonb,
    addresses JSONB DEFAULT '{}'::jsonb,
    transactions JSONB DEFAULT '[]'::jsonb,
    two_factor_auth JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. TRANSACTIONS TABLE
-- Stores all user and admin transaction records
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    type TEXT NOT NULL,
    asset TEXT NOT NULL,
    amount TEXT NOT NULL,
    status TEXT DEFAULT 'completed',
    hash TEXT,
    from_address TEXT,
    to_address TEXT,
    network TEXT,
    fee TEXT DEFAULT '0',
    gas_fee TEXT DEFAULT '0',
    total_deducted TEXT,
    notes TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. UNIFIED KEY-VALUE STORE TABLES (pluto_kv_store & kv_store)
-- Stores synchronized application state across all devices
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pluto_kv_store (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.kv_store (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. SUPPORT TICKETS TABLE
-- Stores customer support tickets and conversation history
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_email TEXT,
    ticket_number TEXT,
    subject TEXT,
    category TEXT,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'open',
    messages JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. LIVE CHATS TABLE
-- Stores live customer support chats
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.live_chats (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_email TEXT,
    user_name TEXT,
    messages JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. ADMIN FEE SETTINGS TABLE
-- Stores deposit, withdrawal, and gas fee configurations
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_fee_settings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    asset_symbol TEXT UNIQUE NOT NULL,
    withdraw_fee TEXT DEFAULT '0',
    percent TEXT DEFAULT '0',
    deposit_address TEXT,
    deposit_enabled BOOLEAN DEFAULT true,
    gas_fee_enabled BOOLEAN DEFAULT false,
    gas_fee_type TEXT DEFAULT 'fixed',
    gas_fee_fixed TEXT DEFAULT '0',
    gas_fee_percent TEXT DEFAULT '0',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 8. SMTP SETTINGS TABLE
-- Stores email server configurations
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.smtp_settings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    host TEXT NOT NULL,
    port TEXT NOT NULL,
    username TEXT,
    password TEXT,
    from_email TEXT NOT NULL,
    from_name TEXT,
    secure BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 9. ADMIN SENT MESSAGES TABLE
-- Stores logs of sent broadcast and targeted messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_sent_messages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    delivery_method TEXT DEFAULT 'in_app',
    recipients_count INTEGER DEFAULT 0,
    target_type TEXT DEFAULT 'all',
    target_user_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS and grant full read/write access for anonymous and authenticated
-- ============================================================================

DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'users',
        'wallets',
        'transactions',
        'pluto_kv_store',
        'kv_store',
        'support_tickets',
        'live_chats',
        'admin_fee_settings',
        'smtp_settings',
        'admin_sent_messages'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all operations for %s" ON public.%I;', tbl, tbl);
        EXECUTE format('CREATE POLICY "Allow all operations for %s" ON public.%I FOR ALL USING (true) WITH CHECK (true);', tbl, tbl);
    END LOOP;
END $$;

-- ============================================================================
-- ENABLE REALTIME REPLICATION FOR INSTANT SYNC
-- ============================================================================
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pluto_kv_store;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.kv_store;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chats;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- SEED INITIAL USERS
-- ============================================================================
INSERT INTO public.users (id, email, phone, full_name, password, kyc_status, balances, addresses)
VALUES
(
    'usr_001',
    'john@example.com',
    '+1234567890',
    'Johnathan Doe',
    'Password123!',
    'verified',
    '{"BTC": "0.5", "ETH": "10.0", "SOL": "50.0", "BNB": "5.0", "USDT": "5000.00"}'::jsonb,
    '{"BTC": "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq", "ETH": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", "SOL": "7YpJ5x9nE4kBYmJmGKZhCvXBAPngXzFqPmgvT8KJnKvH", "BNB": "bnb136ns6lfw4zs5hg4n85vdthaad7hq5m4gtkgf23", "USDT": "TJDENsfBJs4RFETt1X1W8wMDc8M5XnJhCe"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET updated_at = NOW();

INSERT INTO public.users (id, email, phone, full_name, password, kyc_status, balances, addresses)
VALUES
(
    'usr_002',
    'sarah@example.com',
    '+1987654321',
    'Sarah Smith',
    'Password456!',
    'pending',
    '{"BTC": "0.1", "ETH": "2.5", "SOL": "15.0", "BNB": "1.2", "USDT": "1200.00"}'::jsonb,
    '{"BTC": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", "ETH": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", "SOL": "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK", "BNB": "bnb1grpf0955h0ykzq3ar5nmum7y6gdfl6lxfn46h2", "USDT": "TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET updated_at = NOW();

-- Confirmation output
SELECT 'All Pluto database tables, RLS policies, realtime replication, and seed users created successfully!' AS status;
