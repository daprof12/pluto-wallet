-- ============================================================================
-- PLUTO MULTI-CHAIN WALLET - DROP ALL TABLES SCRIPT
-- ============================================================================
-- This script drops all existing Supabase tables and functions
-- WARNING: This will permanently delete all data!
-- Execute this script with caution in production environments
-- ============================================================================

-- Drop all tables in reverse dependency order
DROP TABLE IF EXISTS public.sync_conflicts CASCADE;
DROP TABLE IF EXISTS public.device_sessions CASCADE;
DROP TABLE IF EXISTS public.pending_sync_queue CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.support_ticket_messages CASCADE;
DROP TABLE IF EXISTS public.support_tickets CASCADE;
DROP TABLE IF EXISTS public.live_chat_messages CASCADE;
DROP TABLE IF EXISTS public.live_chats CASCADE;
DROP TABLE IF EXISTS public.user_notifications CASCADE;
DROP TABLE IF EXISTS public.transaction_fees CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.wallet_addresses CASCADE;
DROP TABLE IF EXISTS public.wallet_balances CASCADE;
DROP TABLE IF EXISTS public.wallets CASCADE;
DROP TABLE IF EXISTS public.asset_prices CASCADE;
DROP TABLE IF EXISTS public.assets CASCADE;
DROP TABLE IF EXISTS public.admin_fee_settings CASCADE;
DROP TABLE IF EXISTS public.user_settings CASCADE;
DROP TABLE IF EXISTS public.user_sessions CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS transaction_status CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS ticket_status CASCADE;
DROP TYPE IF EXISTS ticket_priority CASCADE;
DROP TYPE IF EXISTS chat_status CASCADE;
DROP TYPE IF EXISTS sync_status CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS sync_wallet_data(UUID, JSONB, BIGINT) CASCADE;
DROP FUNCTION IF EXISTS resolve_sync_conflict(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_user_wallet_data(UUID) CASCADE;
DROP FUNCTION IF EXISTS create_transaction(UUID, UUID, TEXT, TEXT, NUMERIC, JSONB) CASCADE;
DROP FUNCTION IF EXISTS update_wallet_balance(UUID, TEXT, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS get_platform_statistics() CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users CASCADE;
DROP TRIGGER IF EXISTS update_wallets_updated_at ON public.wallets CASCADE;
DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions CASCADE;
DROP TRIGGER IF EXISTS update_assets_updated_at ON public.assets CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_users_email CASCADE;
DROP INDEX IF EXISTS idx_users_status CASCADE;
DROP INDEX IF EXISTS idx_wallets_user_id CASCADE;
DROP INDEX IF EXISTS idx_transactions_wallet_id CASCADE;
DROP INDEX IF EXISTS idx_transactions_status CASCADE;
DROP INDEX IF EXISTS idx_transactions_created_at CASCADE;
DROP INDEX IF EXISTS idx_wallet_balances_wallet_id CASCADE;
DROP INDEX IF EXISTS idx_wallet_addresses_wallet_id CASCADE;
DROP INDEX IF EXISTS idx_device_sessions_user_id CASCADE;
DROP INDEX IF EXISTS idx_pending_sync_user_id CASCADE;
DROP INDEX IF EXISTS idx_audit_logs_user_id CASCADE;
DROP INDEX IF EXISTS idx_support_tickets_user_id CASCADE;

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can view own data" ON public.users CASCADE;
DROP POLICY IF EXISTS "Users can update own data" ON public.users CASCADE;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users CASCADE;
DROP POLICY IF EXISTS "Users can view own wallets" ON public.wallets CASCADE;
DROP POLICY IF EXISTS "Users can update own wallets" ON public.wallets CASCADE;
DROP POLICY IF EXISTS "Admins can view all wallets" ON public.wallets CASCADE;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions CASCADE;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions CASCADE;

COMMENT ON SCHEMA public IS 'All Pluto Wallet tables dropped successfully';
