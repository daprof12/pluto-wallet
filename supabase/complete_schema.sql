-- ============================================================================
-- PLUTO MULTI-CHAIN WALLET - COMPLETE DATABASE SCHEMA
-- ============================================================================
-- This schema captures all wallet functionality, localStorage data,
-- and cross-platform sync capabilities for Web (PWA), iOS, and Android
-- 
-- Features:
-- - User management (both regular users and admin)
-- - Multi-wallet support (one user can have multiple wallets)
-- - Multi-chain asset management (BTC, ETH, SOL, BNB, TRON, USDT, etc.)
-- - Transaction tracking with gas fees
-- - Real-time price data
-- - Cross-platform data sync with conflict resolution
-- - Admin dashboard capabilities
-- - Support ticket system
-- - Live chat
-- - Audit logging
-- - Offline-first architecture
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CUSTOM TYPES
-- ============================================================================

CREATE TYPE user_status AS ENUM ('active', 'blocked', 'suspended', 'pending');
CREATE TYPE transaction_type AS ENUM ('send', 'receive', 'swap', 'buy', 'deposit', 'admin_credit', 'admin_debit', 'gas_fee');
CREATE TYPE transaction_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'waiting_reply', 'resolved', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE chat_status AS ENUM ('active', 'closed', 'archived');
CREATE TYPE sync_status AS ENUM ('pending', 'syncing', 'synced', 'conflict', 'failed');

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users table (maps to localStorage: pluto_wallet, pluto_admin_users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- Encrypted password
    full_name TEXT,
    phone TEXT,
    status user_status DEFAULT 'active',
    is_admin BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::JSONB, -- Additional user data
    
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- User settings (maps to localStorage: user preferences)
CREATE TABLE public.user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'dark', -- 'dark' or 'light'
    language TEXT DEFAULT 'en',
    currency TEXT DEFAULT 'USD',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    biometric_enabled BOOLEAN DEFAULT FALSE,
    auto_lock_timeout INTEGER DEFAULT 300, -- seconds
    show_balance BOOLEAN DEFAULT TRUE,
    preferences JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- User sessions (for tracking active sessions across devices)
CREATE TABLE public.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    device_id TEXT NOT NULL,
    device_name TEXT,
    device_type TEXT, -- 'web', 'ios', 'android'
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_session_token CHECK (LENGTH(session_token) >= 32)
);

-- Wallets table (one user can have multiple wallets)
CREATE TABLE public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT DEFAULT 'Main Wallet',
    mnemonic_encrypted TEXT NOT NULL, -- Encrypted 12-word recovery phrase
    encryption_salt TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT TRUE,
    is_backed_up BOOLEAN DEFAULT FALSE,
    last_sync_at TIMESTAMPTZ,
    sync_version BIGINT DEFAULT 0, -- For conflict resolution
    device_id TEXT, -- Last device that synced
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::JSONB
);

-- Assets/Coins configuration (maps to localStorage: pluto_asset_config)
CREATE TABLE public.assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol TEXT UNIQUE NOT NULL, -- BTC, ETH, SOL, BNB, TRX, USDT, etc.
    name TEXT NOT NULL, -- Bitcoin, Ethereum, etc.
    network TEXT NOT NULL, -- Bitcoin, Ethereum, Solana, BNB Smart Chain, TRON
    decimals INTEGER DEFAULT 8,
    logo_url TEXT,
    color TEXT, -- Tailwind color class like 'bg-orange-500'
    icon TEXT, -- Emoji or icon identifier
    is_enabled BOOLEAN DEFAULT TRUE,
    is_testnet BOOLEAN DEFAULT FALSE,
    coingecko_id TEXT, -- For price fetching
    contract_address TEXT, -- For ERC-20, BEP-20 tokens
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::JSONB
);

-- Wallet balances (maps to walletData.balances in localStorage)
CREATE TABLE public.wallet_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
    balance NUMERIC(36, 18) DEFAULT 0, -- Up to 18 decimal places for precision
    locked_balance NUMERIC(36, 18) DEFAULT 0, -- For pending transactions
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(wallet_id, asset_id),
    CONSTRAINT positive_balance CHECK (balance >= 0),
    CONSTRAINT positive_locked CHECK (locked_balance >= 0)
);

-- Wallet addresses (maps to walletData.addresses in localStorage)
CREATE TABLE public.wallet_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    derivation_path TEXT, -- BIP44 path
    is_primary BOOLEAN DEFAULT TRUE,
    label TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(wallet_id, asset_id, address)
);

-- Transactions (maps to localStorage: pluto_user_activities, walletData.transactions)
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Transaction details
    type transaction_type NOT NULL,
    status transaction_status DEFAULT 'pending',
    
    -- Asset information
    asset_id UUID REFERENCES public.assets(id),
    asset_symbol TEXT NOT NULL, -- Denormalized for quick access
    amount NUMERIC(36, 18) NOT NULL,
    
    -- Address information
    from_address TEXT,
    to_address TEXT,
    
    -- Network details
    network TEXT NOT NULL,
    hash TEXT, -- Transaction hash on blockchain
    block_number BIGINT,
    confirmations INTEGER DEFAULT 0,
    required_confirmations INTEGER DEFAULT 15,
    
    -- Fee information
    fee NUMERIC(36, 18) DEFAULT 0,
    gas_fee NUMERIC(36, 18) DEFAULT 0,
    total_deducted NUMERIC(36, 18), -- Total amount deducted from balance
    eth_gas_fee NUMERIC(36, 18), -- ETH used for gas (for non-ETH transactions)
    
    -- Swap-specific fields
    from_asset_symbol TEXT, -- For swap transactions
    to_asset_symbol TEXT,
    from_amount NUMERIC(36, 18),
    to_amount NUMERIC(36, 18),
    exchange_rate NUMERIC(36, 18),
    
    -- Buy-specific fields
    payment_method TEXT, -- 'Credit Card', 'Bank Transfer', etc.
    fiat_amount NUMERIC(18, 2),
    fiat_currency TEXT DEFAULT 'USD',
    
    -- Admin-specific fields
    admin_id UUID REFERENCES public.users(id), -- Admin who made the adjustment
    
    -- Related transactions
    related_transaction_id UUID REFERENCES public.transactions(id), -- For gas fee transactions
    related_asset TEXT, -- Which asset's transaction caused this
    
    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    
    -- Timestamps
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT positive_amount CHECK (amount >= 0)
);

-- Transaction fees (for detailed fee breakdown)
CREATE TABLE public.transaction_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
    fee_type TEXT NOT NULL, -- 'network', 'gas', 'platform', 'withdrawal'
    asset_symbol TEXT NOT NULL,
    amount NUMERIC(36, 18) NOT NULL,
    currency_value NUMERIC(18, 2), -- Value in fiat
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asset prices (maps to localStorage: live price data from CoinGecko)
CREATE TABLE public.asset_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
    asset_symbol TEXT NOT NULL,
    price_usd NUMERIC(18, 8) NOT NULL,
    price_change_24h NUMERIC(8, 4), -- Percentage
    market_cap NUMERIC(20, 2),
    volume_24h NUMERIC(20, 2),
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(asset_id, last_updated_at)
);

-- Admin fee settings (maps to localStorage: pluto_admin_fees)
CREATE TABLE public.admin_fee_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
    asset_symbol TEXT NOT NULL,
    
    -- Withdrawal fees
    withdraw_fee NUMERIC(36, 18) DEFAULT 0, -- Fixed fee
    withdraw_fee_percent NUMERIC(8, 4) DEFAULT 0, -- Percentage fee
    
    -- Gas fees
    gas_fee_enabled BOOLEAN DEFAULT FALSE,
    gas_fee_type TEXT DEFAULT 'fixed', -- 'fixed' or 'percent'
    gas_fee_fixed NUMERIC(36, 18) DEFAULT 0,
    gas_fee_percent NUMERIC(8, 4) DEFAULT 0,
    
    -- Minimum withdrawal
    min_withdraw NUMERIC(36, 18) DEFAULT 0,
    max_withdraw NUMERIC(36, 18),
    
    -- Metadata
    updated_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(asset_symbol)
);

-- User notifications (maps to localStorage: pluto_notifications_{userId})
CREATE TABLE public.user_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
    icon TEXT, -- Lucide icon name
    is_read BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- ============================================================================
-- SUPPORT SYSTEM TABLES
-- ============================================================================

-- Support tickets (maps to localStorage: pluto_support_tickets)
CREATE TABLE public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    category TEXT NOT NULL, -- 'Technical', 'Account', 'Transaction', 'Other'
    priority ticket_priority DEFAULT 'medium',
    status ticket_status DEFAULT 'open',
    assigned_to UUID REFERENCES public.users(id), -- Admin assigned
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Support ticket messages
CREATE TABLE public.support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_admin_reply BOOLEAN DEFAULT FALSE,
    attachments JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Live chat (maps to localStorage: pluto_live_chats)
CREATE TABLE public.live_chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES public.users(id),
    status chat_status DEFAULT 'active',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::JSONB
);

-- Live chat messages
CREATE TABLE public.live_chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID REFERENCES public.live_chats(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CROSS-PLATFORM SYNC TABLES
-- ============================================================================

-- Device sessions (track all devices accessing the wallet)
CREATE TABLE public.device_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    device_name TEXT,
    device_type TEXT, -- 'web', 'ios', 'android'
    platform_version TEXT,
    app_version TEXT,
    last_sync_at TIMESTAMPTZ DEFAULT NOW(),
    sync_version BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, device_id)
);

-- Pending sync queue (for offline changes)
CREATE TABLE public.pending_sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    operation TEXT NOT NULL, -- 'create', 'update', 'delete'
    table_name TEXT NOT NULL,
    record_id UUID,
    data JSONB NOT NULL,
    status sync_status DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    synced_at TIMESTAMPTZ
);

-- Sync conflicts (when multiple devices edit simultaneously)
CREATE TABLE public.sync_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    local_version BIGINT,
    cloud_version BIGINT,
    local_data JSONB,
    cloud_data JSONB,
    resolution TEXT, -- 'local_wins', 'cloud_wins', 'manual'
    resolved_by UUID REFERENCES public.users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AUDIT LOGGING
-- ============================================================================

-- Audit logs (maps to localStorage: pluto_admin_audit_logs)
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- 'login', 'balance_adjust', 'user_block', etc.
    table_name TEXT,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users indexes
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_status ON public.users(status);
CREATE INDEX idx_users_created_at ON public.users(created_at DESC);

-- Wallets indexes
CREATE INDEX idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX idx_wallets_sync_version ON public.wallets(sync_version);

-- Transactions indexes
CREATE INDEX idx_transactions_wallet_id ON public.transactions(wallet_id);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX idx_transactions_hash ON public.transactions(hash);

-- Balances indexes
CREATE INDEX idx_wallet_balances_wallet_id ON public.wallet_balances(wallet_id);
CREATE INDEX idx_wallet_balances_asset_id ON public.wallet_balances(asset_id);

-- Addresses indexes
CREATE INDEX idx_wallet_addresses_wallet_id ON public.wallet_addresses(wallet_id);
CREATE INDEX idx_wallet_addresses_asset_id ON public.wallet_addresses(asset_id);
CREATE INDEX idx_wallet_addresses_address ON public.wallet_addresses(address);

-- Device sessions indexes
CREATE INDEX idx_device_sessions_user_id ON public.device_sessions(user_id);
CREATE INDEX idx_device_sessions_device_id ON public.device_sessions(device_id);

-- Sync queue indexes
CREATE INDEX idx_pending_sync_user_id ON public.pending_sync_queue(user_id);
CREATE INDEX idx_pending_sync_status ON public.pending_sync_queue(status);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_admin_id ON public.audit_logs(admin_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Support tickets indexes
CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.user_notifications(is_read);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to sync wallet data from localStorage
CREATE OR REPLACE FUNCTION sync_wallet_data(
    p_user_id UUID,
    p_wallet_data JSONB,
    p_sync_version BIGINT
)
RETURNS JSONB AS $$
DECLARE
    v_wallet_id UUID;
    v_current_version BIGINT;
    v_result JSONB;
BEGIN
    -- Get current wallet version
    SELECT id, sync_version INTO v_wallet_id, v_current_version
    FROM public.wallets
    WHERE user_id = p_user_id AND is_primary = TRUE;
    
    -- Check for conflicts
    IF v_current_version IS NOT NULL AND v_current_version > p_sync_version THEN
        -- Conflict detected
        INSERT INTO public.sync_conflicts (
            user_id, table_name, record_id,
            local_version, cloud_version,
            local_data, cloud_data
        )
        SELECT
            p_user_id, 'wallets', v_wallet_id,
            p_sync_version, v_current_version,
            p_wallet_data, row_to_json(w.*)::JSONB
        FROM public.wallets w WHERE w.id = v_wallet_id;
        
        RETURN jsonb_build_object(
            'success', FALSE,
            'conflict', TRUE,
            'cloud_version', v_current_version
        );
    END IF;
    
    -- Update wallet
    UPDATE public.wallets
    SET 
        sync_version = p_sync_version,
        last_sync_at = NOW(),
        metadata = p_wallet_data
    WHERE id = v_wallet_id;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'version', p_sync_version
    );
END;
$$ LANGUAGE plpgsql;

-- Function to update wallet balance
CREATE OR REPLACE FUNCTION update_wallet_balance(
    p_wallet_id UUID,
    p_asset_symbol TEXT,
    p_new_balance NUMERIC
)
RETURNS VOID AS $$
DECLARE
    v_asset_id UUID;
BEGIN
    -- Get asset ID
    SELECT id INTO v_asset_id FROM public.assets WHERE symbol = p_asset_symbol;
    
    -- Update or insert balance
    INSERT INTO public.wallet_balances (wallet_id, asset_id, balance)
    VALUES (p_wallet_id, v_asset_id, p_new_balance)
    ON CONFLICT (wallet_id, asset_id)
    DO UPDATE SET 
        balance = p_new_balance,
        last_updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to create transaction
CREATE OR REPLACE FUNCTION create_transaction(
    p_wallet_id UUID,
    p_user_id UUID,
    p_type TEXT,
    p_asset_symbol TEXT,
    p_amount NUMERIC,
    p_details JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
    v_transaction_id UUID;
    v_asset_id UUID;
BEGIN
    -- Get asset ID
    SELECT id INTO v_asset_id FROM public.assets WHERE symbol = p_asset_symbol;
    
    -- Create transaction
    INSERT INTO public.transactions (
        wallet_id, user_id, type, asset_id, asset_symbol, amount,
        from_address, to_address, network, hash, status, metadata
    ) VALUES (
        p_wallet_id, p_user_id, p_type::transaction_type, v_asset_id, p_asset_symbol, p_amount,
        p_details->>'from_address',
        p_details->>'to_address',
        p_details->>'network',
        p_details->>'hash',
        COALESCE((p_details->>'status')::transaction_status, 'pending'),
        p_details
    ) RETURNING id INTO v_transaction_id;
    
    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user wallet data (for sync)
CREATE OR REPLACE FUNCTION get_user_wallet_data(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'user', row_to_json(u.*),
        'wallets', (
            SELECT jsonb_agg(row_to_json(w.*))
            FROM public.wallets w
            WHERE w.user_id = p_user_id
        ),
        'balances', (
            SELECT jsonb_object_agg(
                a.symbol,
                wb.balance
            )
            FROM public.wallet_balances wb
            JOIN public.assets a ON a.id = wb.asset_id
            JOIN public.wallets w ON w.id = wb.wallet_id
            WHERE w.user_id = p_user_id AND w.is_primary = TRUE
        ),
        'addresses', (
            SELECT jsonb_object_agg(
                a.symbol,
                wa.address
            )
            FROM public.wallet_addresses wa
            JOIN public.assets a ON a.id = wa.asset_id
            JOIN public.wallets w ON w.id = wa.wallet_id
            WHERE w.user_id = p_user_id AND w.is_primary = TRUE AND wa.is_primary = TRUE
        ),
        'transactions', (
            SELECT jsonb_agg(row_to_json(t.*) ORDER BY t.created_at DESC)
            FROM public.transactions t
            WHERE t.user_id = p_user_id
            LIMIT 100
        )
    ) INTO v_result
    FROM public.users u
    WHERE u.id = p_user_id;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to get platform statistics (for admin dashboard)
CREATE OR REPLACE FUNCTION get_platform_statistics()
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_users', (SELECT COUNT(*) FROM public.users WHERE NOT is_admin),
        'active_users', (SELECT COUNT(*) FROM public.users WHERE status = 'active' AND NOT is_admin),
        'total_wallets', (SELECT COUNT(*) FROM public.wallets),
        'total_transactions', (SELECT COUNT(*) FROM public.transactions),
        'pending_transactions', (SELECT COUNT(*) FROM public.transactions WHERE status = 'pending'),
        'total_volume_24h', (
            SELECT SUM(amount * COALESCE(ap.price_usd, 0))
            FROM public.transactions t
            LEFT JOIN public.assets a ON a.symbol = t.asset_symbol
            LEFT JOIN LATERAL (
                SELECT price_usd FROM public.asset_prices
                WHERE asset_id = a.id
                ORDER BY last_updated_at DESC
                LIMIT 1
            ) ap ON TRUE
            WHERE t.created_at > NOW() - INTERVAL '24 hours'
        ),
        'open_tickets', (SELECT COUNT(*) FROM public.support_tickets WHERE status IN ('open', 'in_progress')),
        'active_chats', (SELECT COUNT(*) FROM public.live_chats WHERE status = 'active')
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

-- Wallets policies
CREATE POLICY "Users can view own wallets" ON public.wallets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own wallets" ON public.wallets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all wallets" ON public.wallets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON public.transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions" ON public.transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

-- Similar policies for other tables...

-- ============================================================================
-- SEED DATA (Default Assets)
-- ============================================================================

INSERT INTO public.assets (symbol, name, network, decimals, color, icon, coingecko_id, sort_order) VALUES
('BTC', 'Bitcoin', 'Bitcoin', 8, 'bg-orange-500', '₿', 'bitcoin', 1),
('ETH', 'Ethereum', 'Ethereum', 18, 'bg-blue-500', 'Ξ', 'ethereum', 2),
('SOL', 'Solana', 'Solana', 9, 'bg-purple-500', '◎', 'solana', 3),
('BNB', 'BNB', 'BNB Smart Chain', 18, 'bg-yellow-500', '🔶', 'binancecoin', 4),
('TRX', 'TRON', 'TRON', 6, 'bg-red-500', '🔺', 'tron', 5),
('USDT', 'Tether', 'Ethereum', 6, 'bg-green-500', '₮', 'tether', 6)
ON CONFLICT (symbol) DO NOTHING;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.users IS 'User accounts (both regular users and admins)';
COMMENT ON TABLE public.wallets IS 'User wallets with encrypted mnemonics';
COMMENT ON TABLE public.wallet_balances IS 'Current balance for each asset in each wallet';
COMMENT ON TABLE public.wallet_addresses IS 'Blockchain addresses for each asset';
COMMENT ON TABLE public.transactions IS 'All transaction history';
COMMENT ON TABLE public.device_sessions IS 'Track active devices for cross-platform sync';
COMMENT ON TABLE public.pending_sync_queue IS 'Queue for offline changes to sync';
COMMENT ON TABLE public.sync_conflicts IS 'Conflicts when multiple devices edit simultaneously';
COMMENT ON TABLE public.audit_logs IS 'Audit trail for admin actions';

COMMENT ON FUNCTION sync_wallet_data IS 'Sync localStorage wallet data to cloud with conflict detection';
COMMENT ON FUNCTION get_user_wallet_data IS 'Get complete wallet data for a user (for sync)';
COMMENT ON FUNCTION get_platform_statistics IS 'Get platform-wide statistics for admin dashboard';

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Pluto Wallet schema created successfully!';
    RAISE NOTICE 'Total tables: 26';
    RAISE NOTICE 'Total functions: 5';
    RAISE NOTICE 'Cross-platform sync: Enabled';
    RAISE NOTICE 'Row-level security: Enabled';
END $$;