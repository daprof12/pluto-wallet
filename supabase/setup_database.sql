-- ============================================================================
-- PLUTO MULTI-CHAIN WALLET - SUPABASE DATABASE SETUP
-- ============================================================================
-- Project ID: yuazbbilnbmfxffaedys
--
-- Instructions:
-- 1. Open Supabase Dashboard: https://supabase.com/dashboard/project/yuazbbilnbmfxffaedys/sql/new
-- 2. Paste this entire script into the SQL Editor.
-- 3. Click "Run" (or Ctrl+Enter / Cmd+Enter).
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. UNIFIED KEY-VALUE STORE TABLE (pluto_kv_store)
-- This table stores all application state:
-- - pluto_wallet (user wallets, balances, addresses, mnemonic)
-- - pluto_admin_users (admin user management & KYC data)
-- - pluto_admin_fees (global deposit, withdrawal, and gas fee configurations)
-- - pluto_all_user_fee_overrides (user-specific custom fee overrides)
-- - pluto_asset_config (supported tokens, popular networks, USDT variants)
-- - pluto_admin_messages (admin CRM messages & email campaigns)
-- - pluto_smtp_settings (SMTP server configurations)
-- - pluto_support_tickets (customer support tickets)
-- - pluto_live_chats (live support chat sessions)
-- - pluto_user_activities (user transaction logs)
-- - pluto_admin_audit_logs (security audit logs)
-- - pluto_notifications_* (per-user push notifications)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pluto_kv_store (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pluto_kv_store_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pluto_kv_store_timestamp ON public.pluto_kv_store;
CREATE TRIGGER trigger_pluto_kv_store_timestamp
    BEFORE UPDATE ON public.pluto_kv_store
    FOR EACH ROW
    EXECUTE FUNCTION update_pluto_kv_store_timestamp();

-- Enable Row-Level Security (RLS)
ALTER TABLE public.pluto_kv_store ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read pluto_kv_store" ON public.pluto_kv_store;
DROP POLICY IF EXISTS "Allow public insert pluto_kv_store" ON public.pluto_kv_store;
DROP POLICY IF EXISTS "Allow public update pluto_kv_store" ON public.pluto_kv_store;
DROP POLICY IF EXISTS "Allow public delete pluto_kv_store" ON public.pluto_kv_store;

-- Create permissive RLS policies for anonymous and authenticated users
CREATE POLICY "Allow public read pluto_kv_store" ON public.pluto_kv_store
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert pluto_kv_store" ON public.pluto_kv_store
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update pluto_kv_store" ON public.pluto_kv_store
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete pluto_kv_store" ON public.pluto_kv_store
    FOR DELETE USING (true);

-- Enable Supabase Realtime for instant cross-device updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.pluto_kv_store;

-- ============================================================================
-- 2. COMPATIBILITY ALIAS TABLE (kv_store)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.kv_store (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.kv_store ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read kv_store" ON public.kv_store;
DROP POLICY IF EXISTS "Allow public insert kv_store" ON public.kv_store;
DROP POLICY IF EXISTS "Allow public update kv_store" ON public.kv_store;
DROP POLICY IF EXISTS "Allow public delete kv_store" ON public.kv_store;

CREATE POLICY "Allow public read kv_store" ON public.kv_store
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert kv_store" ON public.kv_store
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update kv_store" ON public.kv_store
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete kv_store" ON public.kv_store
    FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.kv_store;

-- ============================================================================
-- 3. CONFIRMATION
-- ============================================================================
SELECT 'Pluto database tables and RLS policies created successfully!' AS status;
