/**
 * ============================================================================
 * PLUTO WALLET - LOCALSTORAGE TO SUPABASE MIGRATION SCRIPT
 * ============================================================================
 * This script migrates all localStorage data to Supabase database
 * 
 * Usage:
 * 1. Import this script in your app
 * 2. Call migrateAllDataToSupabase() when user is authenticated
 * 3. The script will preserve all existing data and sync to cloud
 * ============================================================================
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../utils/supabaseClient';

// Use the configured Supabase client
function getSupabaseClient(): SupabaseClient {
  return supabase;
}

interface MigrationResult {
  success: boolean;
  migratedTables: string[];
  errors: string[];
  summary: {
    users: number;
    wallets: number;
    transactions: number;
    assets: number;
    notifications: number;
    tickets: number;
  };
}

/**
 * Main migration function
 */
export async function migrateAllDataToSupabase(userId: string): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migratedTables: [],
    errors: [],
    summary: {
      users: 0,
      wallets: 0,
      transactions: 0,
      assets: 0,
      notifications: 0,
      tickets: 0,
    },
  };

  try {
    console.log('🚀 Starting localStorage to Supabase migration...');

    // 1. Migrate wallet data
    await migrateWalletData(userId, result);

    // 2. Migrate user settings
    await migrateUserSettings(userId, result);

    // 3. Migrate transactions
    await migrateTransactions(userId, result);

    // 4. Migrate assets configuration
    await migrateAssets(result);

    // 5. Migrate admin fee settings
    await migrateAdminFees(result);

    // 6. Migrate notifications
    await migrateNotifications(userId, result);

    // 7. Migrate support tickets
    await migrateSupportTickets(userId, result);

    // 8. Migrate audit logs
    await migrateAuditLogs(result);

    result.success = result.errors.length === 0;
    console.log('✅ Migration completed!', result.summary);

    return result;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    result.errors.push(String(error));
    return result;
  }
}

/**
 * Migrate wallet data from localStorage
 */
async function migrateWalletData(
  userId: string,
  result: MigrationResult
): Promise<void> {
  try {
    const walletDataStr = localStorage.getItem('pluto_wallet');
    if (!walletDataStr) {
      console.log('ℹ️ No wallet data found in localStorage');
      return;
    }

    const walletData = JSON.parse(walletDataStr);
    console.log('📦 Migrating wallet data...', walletData);

    // Check if wallet already exists
    const { data: existingWallet } = await getSupabaseClient()
      .from('wallets')
      .select('id')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .single();

    let walletId: string;

    if (existingWallet) {
      walletId = existingWallet.id;
      console.log('✓ Wallet already exists, updating...');

      // Update existing wallet
      await getSupabaseClient()
        .from('wallets')
        .update({
          mnemonic_encrypted: walletData.mnemonic || '',
          encryption_salt: walletData.id || '',
          last_sync_at: new Date().toISOString(),
          sync_version: Date.now(),
        })
        .eq('id', walletId);
    } else {
      // Create new wallet
      const { data: newWallet, error } = await getSupabaseClient()
        .from('wallets')
        .insert({
          user_id: userId,
          name: 'Main Wallet',
          mnemonic_encrypted: walletData.mnemonic || '',
          encryption_salt: walletData.id || '',
          is_primary: true,
          sync_version: Date.now(),
        })
        .select()
        .single();

      if (error) throw error;
      walletId = newWallet.id;
      console.log('✓ New wallet created');
    }

    // Migrate balances
    if (walletData.balances) {
      await migrateBalances(walletId, walletData.balances, result);
    }

    // Migrate addresses
    if (walletData.addresses) {
      await migrateAddresses(walletId, walletData.addresses, result);
    }

    result.summary.wallets++;
    result.migratedTables.push('wallets');
  } catch (error) {
    console.error('❌ Error migrating wallet data:', error);
    result.errors.push(`Wallet migration: ${error}`);
  }
}

/**
 * Migrate wallet balances
 */
async function migrateBalances(
  walletId: string,
  balances: Record<string, string>,
  result: MigrationResult
): Promise<void> {
  try {
    console.log('💰 Migrating balances...', balances);

    for (const [assetSymbol, balance] of Object.entries(balances)) {
      // Get asset ID
      const { data: asset } = await getSupabaseClient()
        .from('assets')
        .select('id')
        .eq('symbol', assetSymbol)
        .single();

      if (!asset) {
        console.warn(`⚠️ Asset ${assetSymbol} not found in database`);
        continue;
      }

      // Upsert balance
      await getSupabaseClient()
        .from('wallet_balances')
        .upsert({
          wallet_id: walletId,
          asset_id: asset.id,
          balance: parseFloat(balance),
          last_updated_at: new Date().toISOString(),
        }, {
          onConflict: 'wallet_id,asset_id'
        });
    }

    console.log('✓ Balances migrated');
  } catch (error) {
    console.error('❌ Error migrating balances:', error);
    result.errors.push(`Balances migration: ${error}`);
  }
}

/**
 * Migrate wallet addresses
 */
async function migrateAddresses(
  walletId: string,
  addresses: Record<string, string>,
  result: MigrationResult
): Promise<void> {
  try {
    console.log('📍 Migrating addresses...', addresses);

    for (const [assetSymbol, address] of Object.entries(addresses)) {
      // Get asset ID
      const { data: asset } = await getSupabaseClient()
        .from('assets')
        .select('id')
        .eq('symbol', assetSymbol)
        .single();

      if (!asset) {
        console.warn(`⚠️ Asset ${assetSymbol} not found in database`);
        continue;
      }

      // Check if address already exists
      const { data: existingAddress } = await getSupabaseClient()
        .from('wallet_addresses')
        .select('id')
        .eq('wallet_id', walletId)
        .eq('asset_id', asset.id)
        .eq('address', address)
        .single();

      if (!existingAddress) {
        // Insert new address
        await getSupabaseClient()
          .from('wallet_addresses')
          .insert({
            wallet_id: walletId,
            asset_id: asset.id,
            address: address,
            is_primary: true,
          });
      }
    }

    console.log('✓ Addresses migrated');
  } catch (error) {
    console.error('❌ Error migrating addresses:', error);
    result.errors.push(`Addresses migration: ${error}`);
  }
}

/**
 * Migrate transactions
 */
async function migrateTransactions(
  userId: string,
  result: MigrationResult
): Promise<void> {
  try {
    // Get wallet ID
    const { data: wallet } = await getSupabaseClient()
      .from('wallets')
      .select('id')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .single();

    if (!wallet) {
      console.warn('⚠️ No wallet found for user');
      return;
    }

    // Migrate from pluto_wallet transactions
    const walletDataStr = localStorage.getItem('pluto_wallet');
    if (walletDataStr) {
      const walletData = JSON.parse(walletDataStr);
      if (walletData.transactions && Array.isArray(walletData.transactions)) {
        await migrateTransactionArray(userId, wallet.id, walletData.transactions, result);
      }
    }

    // Migrate from pluto_user_activities
    const activitiesStr = localStorage.getItem('pluto_user_activities');
    if (activitiesStr) {
      const activities = JSON.parse(activitiesStr);
      const userActivities = activities[userId];
      if (userActivities && Array.isArray(userActivities)) {
        await migrateTransactionArray(userId, wallet.id, userActivities, result);
      }
    }

    result.migratedTables.push('transactions');
  } catch (error) {
    console.error('❌ Error migrating transactions:', error);
    result.errors.push(`Transactions migration: ${error}`);
  }
}

/**
 * Migrate array of transactions
 */
async function migrateTransactionArray(
  userId: string,
  walletId: string,
  transactions: any[],
  result: MigrationResult
): Promise<void> {
  console.log(`📝 Migrating ${transactions.length} transactions...`);

  for (const tx of transactions) {
    try {
      // Check if transaction already exists
      const { data: existingTx } = await getSupabaseClient()
        .from('transactions')
        .select('id')
        .eq('hash', tx.hash)
        .single();

      if (existingTx) {
        console.log(`✓ Transaction ${tx.hash} already exists, skipping`);
        continue;
      }

      // Get asset ID
      const { data: asset } = await getSupabaseClient()
        .from('assets')
        .select('id')
        .eq('symbol', tx.asset)
        .single();

      // Insert transaction
      await getSupabaseClient()
        .from('transactions')
        .insert({
          wallet_id: walletId,
          user_id: userId,
          type: tx.type,
          status: tx.status,
          asset_id: asset?.id,
          asset_symbol: tx.asset,
          amount: parseFloat(tx.amount),
          from_address: tx.from,
          to_address: tx.to,
          network: tx.network,
          hash: tx.hash,
          confirmations: tx.confirmations || 0,
          required_confirmations: tx.requiredConfirmations || 15,
          fee: tx.fee ? parseFloat(tx.fee) : 0,
          gas_fee: tx.gasFee ? parseFloat(tx.gasFee) : 0,
          total_deducted: tx.totalDeducted ? parseFloat(tx.totalDeducted) : null,
          eth_gas_fee: tx.ethGasFee ? parseFloat(tx.ethGasFee) : null,
          from_asset_symbol: tx.fromAsset,
          to_asset_symbol: tx.toAsset,
          from_amount: tx.fromAmount ? parseFloat(tx.fromAmount) : null,
          to_amount: tx.toAmount ? parseFloat(tx.toAmount) : null,
          payment_method: tx.paymentMethod,
          fiat_amount: tx.fiatAmount ? parseFloat(tx.fiatAmount.replace(/[$,]/g, '')) : null,
          fiat_currency: tx.fiatCurrency,
          notes: tx.notes,
          timestamp: tx.timestamp,
          metadata: tx,
        });

      result.summary.transactions++;
    } catch (error) {
      console.error(`❌ Error migrating transaction ${tx.id}:`, error);
    }
  }

  console.log(`✓ Migrated ${result.summary.transactions} transactions`);
}

/**
 * Migrate user settings
 */
async function migrateUserSettings(
  userId: string,
  result: MigrationResult
): Promise<void> {
  try {
    const walletDataStr = localStorage.getItem('pluto_wallet');
    if (!walletDataStr) return;

    const walletData = JSON.parse(walletDataStr);

    await getSupabaseClient()
      .from('user_settings')
      .upsert({
        user_id: userId,
        theme: walletData.theme || 'dark',
        show_balance: true,
        notifications_enabled: true,
      }, {
        onConflict: 'user_id'
      });

    console.log('✓ User settings migrated');
    result.migratedTables.push('user_settings');
  } catch (error) {
    console.error('❌ Error migrating user settings:', error);
    result.errors.push(`User settings migration: ${error}`);
  }
}

/**
 * Migrate assets configuration
 */
async function migrateAssets(result: MigrationResult): Promise<void> {
  try {
    const assetsStr = localStorage.getItem('pluto_asset_config');
    if (!assetsStr) {
      console.log('ℹ️ No custom assets found in localStorage');
      return;
    }

    const assets = JSON.parse(assetsStr);
    console.log(`🪙 Migrating ${assets.length} assets...`);

    for (const asset of assets) {
      await getSupabaseClient()
        .from('assets')
        .upsert({
          symbol: asset.symbol,
          name: asset.name,
          network: asset.name,
          decimals: asset.decimals || 8,
          logo_url: asset.logoUrl,
          color: asset.color,
          icon: asset.icon,
          is_enabled: true,
          sort_order: assets.indexOf(asset),
        }, {
          onConflict: 'symbol'
        });

      result.summary.assets++;
    }

    console.log('✓ Assets migrated');
    result.migratedTables.push('assets');
  } catch (error) {
    console.error('❌ Error migrating assets:', error);
    result.errors.push(`Assets migration: ${error}`);
  }
}

/**
 * Migrate admin fee settings
 */
async function migrateAdminFees(result: MigrationResult): Promise<void> {
  try {
    const feesStr = localStorage.getItem('pluto_admin_fees');
    if (!feesStr) {
      console.log('ℹ️ No admin fees found in localStorage');
      return;
    }

    const fees = JSON.parse(feesStr);
    console.log('💸 Migrating admin fee settings...');

    for (const [assetSymbol, feeSettings] of Object.entries(fees as any)) {
      // Get asset ID
      const { data: asset } = await getSupabaseClient()
        .from('assets')
        .select('id')
        .eq('symbol', assetSymbol)
        .single();

      if (!asset) continue;

      await getSupabaseClient()
        .from('admin_fee_settings')
        .upsert({
          asset_id: asset.id,
          asset_symbol: assetSymbol,
          withdraw_fee: parseFloat(feeSettings.withdraw_fee || '0'),
          withdraw_fee_percent: parseFloat(feeSettings.percent || '0'),
          gas_fee_enabled: feeSettings.gas_fee_enabled || false,
          gas_fee_type: feeSettings.gas_fee_type || 'fixed',
          gas_fee_fixed: parseFloat(feeSettings.gas_fee_fixed || '0'),
          gas_fee_percent: parseFloat(feeSettings.gas_fee_percent || '0'),
          min_withdraw: parseFloat(feeSettings.min_withdraw || '0'),
        }, {
          onConflict: 'asset_symbol'
        });
    }

    console.log('✓ Admin fees migrated');
    result.migratedTables.push('admin_fee_settings');
  } catch (error) {
    console.error('❌ Error migrating admin fees:', error);
    result.errors.push(`Admin fees migration: ${error}`);
  }
}

/**
 * Migrate notifications
 */
async function migrateNotifications(
  userId: string,
  result: MigrationResult
): Promise<void> {
  try {
    const notificationsStr = localStorage.getItem(`pluto_notifications_${userId}`);
    if (!notificationsStr) {
      console.log('ℹ️ No notifications found in localStorage');
      return;
    }

    const notifications = JSON.parse(notificationsStr);
    console.log(`🔔 Migrating ${notifications.length} notifications...`);

    for (const notification of notifications) {
      await getSupabaseClient()
        .from('user_notifications')
        .insert({
          user_id: userId,
          title: notification.title,
          message: notification.message,
          type: notification.type || 'info',
          icon: notification.icon,
          is_read: notification.read || false,
        });

      result.summary.notifications++;
    }

    console.log('✓ Notifications migrated');
    result.migratedTables.push('user_notifications');
  } catch (error) {
    console.error('❌ Error migrating notifications:', error);
    result.errors.push(`Notifications migration: ${error}`);
  }
}

/**
 * Migrate support tickets
 */
async function migrateSupportTickets(
  userId: string,
  result: MigrationResult
): Promise<void> {
  try {
    const ticketsStr = localStorage.getItem('pluto_support_tickets');
    if (!ticketsStr) {
      console.log('ℹ️ No support tickets found in localStorage');
      return;
    }

    const tickets = JSON.parse(ticketsStr);
    console.log(`🎫 Migrating ${tickets.length} support tickets...`);

    for (const ticket of tickets) {
      // Only migrate tickets for this user
      if (ticket.userId !== userId) continue;

      await getSupabaseClient()
        .from('support_tickets')
        .insert({
          ticket_number: ticket.id,
          user_id: userId,
          subject: ticket.subject,
          category: ticket.category,
          priority: ticket.priority,
          status: ticket.status,
          created_at: ticket.createdAt,
        });

      result.summary.tickets++;
    }

    console.log('✓ Support tickets migrated');
    result.migratedTables.push('support_tickets');
  } catch (error) {
    console.error('❌ Error migrating support tickets:', error);
    result.errors.push(`Support tickets migration: ${error}`);
  }
}

/**
 * Migrate audit logs
 */
async function migrateAuditLogs(result: MigrationResult): Promise<void> {
  try {
    const logsStr = localStorage.getItem('pluto_admin_audit_logs');
    if (!logsStr) {
      console.log('ℹ️ No audit logs found in localStorage');
      return;
    }

    const logs = JSON.parse(logsStr);
    console.log(`📋 Migrating ${logs.length} audit logs...`);

    for (const log of logs) {
      await getSupabaseClient()
        .from('audit_logs')
        .insert({
          action: log.action,
          metadata: log,
          created_at: log.timestamp,
        });
    }

    console.log('✓ Audit logs migrated');
    result.migratedTables.push('audit_logs');
  } catch (error) {
    console.error('❌ Error migrating audit logs:', error);
    result.errors.push(`Audit logs migration: ${error}`);
  }
}

/**
 * Clear localStorage after successful migration (optional)
 */
export function clearLocalStorageAfterMigration(): void {
  const confirmation = confirm(
    'Migration successful! Do you want to clear localStorage data?\n\n' +
    'This will remove local data since it\'s now safely stored in the cloud.\n' +
    'You can always sync it back from the cloud.'
  );

  if (confirmation) {
    const keysToKeep = ['pluto_device_id', 'pluto_session_active'];
    const allKeys = Object.keys(localStorage);
    
    allKeys.forEach(key => {
      if (key.startsWith('pluto_') && !keysToKeep.includes(key)) {
        localStorage.removeItem(key);
      }
    });

    console.log('✓ localStorage cleared');
  }
}

/**
 * Example usage
 */
export async function performMigration() {
  // Get current user ID (from your auth system)
  const userId = 'user-uuid-here'; // Replace with actual user ID

  // Run migration
  const result = await migrateAllDataToSupabase(userId);

  if (result.success) {
    console.log('✅ Migration completed successfully!');
    console.log('Summary:', result.summary);
    
    // Optionally clear localStorage
    // clearLocalStorageAfterMigration();
  } else {
    console.error('❌ Migration failed with errors:', result.errors);
  }

  return result;
}