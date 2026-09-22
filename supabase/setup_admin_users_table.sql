-- ============================================================================
-- PLUTO MULTI-CHAIN WALLET - ADMIN USERS & RBAC TABLE SETUP
-- ============================================================================
-- Project ID: yuazbbilnbmfxffaedys
--
-- Instructions:
-- 1. Open Supabase Dashboard: https://supabase.com/dashboard/project/yuazbbilnbmfxffaedys/sql/new
-- 2. Paste this entire script into the SQL Editor.
-- 3. Click "Run" (or Cmd+Enter / Ctrl+Enter).
--
-- Features:
-- - Role-Based Access Control: super_admin (full access) vs admin (restricted)
-- - Granular Tab Permissions: users, assets, fees, messages, support, chat, audit, sync
-- - Assigned Users Scoping: admin can only access assigned user IDs
-- - Status toggle: active vs suspended
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.admin_users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin', -- 'super_admin' or 'admin'
    permissions JSONB NOT NULL DEFAULT '["users", "support"]'::jsonb,
    assigned_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'active', -- 'active' or 'suspended'
    created_by TEXT DEFAULT 'Super Admin',
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Permissive policy for Pluto Admin client access
DROP POLICY IF EXISTS "Allow all access to admin_users" ON public.admin_users;
CREATE POLICY "Allow all access to admin_users" 
ON public.admin_users 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Insert or preserve default super admin
INSERT INTO public.admin_users (
    id,
    email,
    password_hash,
    role,
    permissions,
    assigned_user_ids,
    status,
    created_by,
    created_at
) VALUES (
    'admin_super_001',
    'admin@pluto.io',
    'Admin@123',
    'super_admin',
    '["users", "assets", "fees", "messages", "support", "chat", "audit", "sync"]'::jsonb,
    '[]'::jsonb,
    'active',
    'System Initializer',
    '2026-09-01T00:00:00.000Z'
)
ON CONFLICT (email) DO UPDATE SET
    role = 'super_admin',
    status = 'active',
    permissions = '["users", "assets", "fees", "messages", "support", "chat", "audit", "sync"]'::jsonb,
    updated_at = NOW();
