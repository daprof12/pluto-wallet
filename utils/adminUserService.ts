/**
 * ============================================================================
 * PLUTO WALLET - ADMIN USER & ROLE PERMISSION SERVICE
 * ============================================================================
 * 
 * Manages administrative staff accounts, role-based access control (RBAC),
 * tab-level permissions, and user account assignment scopes.
 * 
 * Roles:
 * - `super_admin`: Full system access across all tabs, users, and admin management.
 * - `admin`: Restricted access; can only see selected tabs and assigned users.
 * ============================================================================
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import dataService from './dataService';

export type AdminRole = 'super_admin' | 'admin';

export type AdminTabPermission = 
  | 'users'      // User Management
  | 'assets'     // Assets Overview
  | 'fees'       // Fee Settings
  | 'messages'   // Message Settings
  | 'support'    // Support Tickets
  | 'chat'       // Live Chat
  | 'audit'      // Audit Logs
  | 'sync';      // Data Sync

export interface AdminUser {
  id: string;
  email: string;
  password?: string;
  role: AdminRole;
  permissions: AdminTabPermission[];
  assigned_user_ids: string[];
  status: 'active' | 'suspended';
  created_at: string;
  last_login?: string;
  created_by?: string;
}

export const ALL_TAB_PERMISSIONS: { id: AdminTabPermission; label: string; description: string }[] = [
  { id: 'users', label: 'User Management', description: 'View, edit, KYC review, and balance adjustments for assigned users' },
  { id: 'assets', label: 'Assets Overview', description: 'Configure supported cryptocurrencies, pricing, and visibility' },
  { id: 'fees', label: 'Fee Settings', description: 'Configure global network fees, percentage cuts, and user fee overrides' },
  { id: 'messages', label: 'Message Settings', description: 'Send administrative inbox notices and manage SMTP server config' },
  { id: 'support', label: 'Support Tickets', description: 'Manage and resolve customer support tickets for assigned users' },
  { id: 'chat', label: 'Live Chat', description: 'Real-time live messaging and customer assistance with assigned users' },
  { id: 'audit', label: 'Audit Logs', description: 'Review system events, transaction logs, and operational activity' },
  { id: 'sync', label: 'Data Sync', description: 'Inspect Supabase connectivity, cloud synchronization, and database state' }
];

export const DEFAULT_SUPER_ADMIN: AdminUser = {
  id: 'admin_super_001',
  email: 'admin@pluto.io',
  password: 'Admin@123',
  role: 'super_admin',
  permissions: ['users', 'assets', 'fees', 'messages', 'support', 'chat', 'audit', 'sync'],
  assigned_user_ids: [],
  status: 'active',
  created_at: '2026-09-01T00:00:00.000Z',
  last_login: '2026-09-22T08:00:00.000Z'
};

const STORAGE_KEY = 'pluto_system_admin_users';
const SESSION_KEY = 'pluto_admin_session';

export const adminUserService = {
  /**
   * Retrieve all admin staff accounts from cache or storage
   */
  getAdminUsers(): AdminUser[] {
    try {
      const raw = dataService.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Always ensure the default super admin is in the list
          const hasSuper = parsed.some(a => a.email.toLowerCase() === DEFAULT_SUPER_ADMIN.email.toLowerCase());
          if (!hasSuper) {
            parsed.unshift(DEFAULT_SUPER_ADMIN);
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[AdminUserService] Error reading admin users:', e);
    }
    return [DEFAULT_SUPER_ADMIN];
  },

  /**
   * Synchronize admin users from Supabase cloud database
   */
  async syncFromCloud(): Promise<AdminUser[]> {
    if (!isSupabaseConfigured()) {
      return this.getAdminUsers();
    }

    try {
      // 1. Try dedicated admin_users table first
      const { data: remoteAdmins, error: tableErr } = await supabase.from('admin_users').select('*');
      if (!tableErr && remoteAdmins && remoteAdmins.length > 0) {
        const mapped: AdminUser[] = remoteAdmins.map(r => ({
          id: r.id,
          email: r.email,
          password: r.password_hash || r.password,
          role: (r.role === 'super_admin' ? 'super_admin' : 'admin') as AdminRole,
          permissions: Array.isArray(r.permissions) ? r.permissions : (['users', 'support'] as AdminTabPermission[]),
          assigned_user_ids: Array.isArray(r.assigned_user_ids) ? r.assigned_user_ids : [],
          status: r.status === 'suspended' ? 'suspended' : 'active',
          created_at: r.created_at || new Date().toISOString(),
          last_login: r.last_login
        }));

        this.persistLocal(mapped);
        return mapped;
      }

      // 2. Fallback to pluto_kv_store key
      const { data: kvData } = await supabase
        .from('pluto_kv_store')
        .select('value')
        .eq('key', STORAGE_KEY)
        .maybeSingle();

      if (kvData && kvData.value) {
        const val = typeof kvData.value === 'string' ? JSON.parse(kvData.value) : kvData.value;
        if (Array.isArray(val) && val.length > 0) {
          this.persistLocal(val);
          return val;
        }
      }
    } catch (e) {
      console.warn('[AdminUserService] Cloud sync warning:', e);
    }

    return this.getAdminUsers();
  },

  /**
   * Save admin users list locally and to cloud
   */
  async saveAdminUsers(admins: AdminUser[]): Promise<void> {
    this.persistLocal(admins);

    if (isSupabaseConfigured()) {
      try {
        // Sync to KV store
        await supabase
          .from('pluto_kv_store')
          .upsert({ key: STORAGE_KEY, value: admins });

        // Also attempt direct admin_users table upsert if table exists
        for (const admin of admins) {
          try {
            await supabase.from('admin_users').upsert({
              id: admin.id,
              email: admin.email,
              password_hash: admin.password,
              role: admin.role,
              permissions: admin.permissions,
              assigned_user_ids: admin.assigned_user_ids,
              status: admin.status,
              created_at: admin.created_at,
              last_login: admin.last_login,
              updated_at: new Date().toISOString()
            });
          } catch {}
        }
      } catch (err) {
        console.warn('[AdminUserService] Cloud persist warning:', err);
      }
    }
  },

  /**
   * Internal helper to persist locally and dispatch notification event
   */
  persistLocal(admins: AdminUser[]): void {
    const jsonStr = JSON.stringify(admins);
    dataService.setItem(STORAGE_KEY, jsonStr);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, jsonStr);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pluto_admin_users_updated', {
        detail: { adminUsers: admins }
      }));
    }
  },

  /**
   * Create a new administrative user with role, permissions, and assigned users
   */
  async createAdminUser(params: {
    email: string;
    password: string;
    role: AdminRole;
    permissions: AdminTabPermission[];
    assigned_user_ids: string[];
    createdBy?: string;
  }): Promise<{ success: boolean; error?: string; admin?: AdminUser }> {
    const trimmedEmail = params.email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!params.password || params.password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    const currentAdmins = this.getAdminUsers();
    if (currentAdmins.some(a => a.email.toLowerCase() === trimmedEmail)) {
      return { success: false, error: 'An admin account with this email already exists.' };
    }

    const newAdmin: AdminUser = {
      id: `admin_${Date.now()}`,
      email: trimmedEmail,
      password: params.password,
      role: params.role,
      permissions: params.role === 'super_admin' 
        ? ['users', 'assets', 'fees', 'messages', 'support', 'chat', 'audit', 'sync']
        : params.permissions,
      assigned_user_ids: params.role === 'super_admin' ? [] : params.assigned_user_ids,
      status: 'active',
      created_at: new Date().toISOString(),
      created_by: params.createdBy || 'Super Admin'
    };

    currentAdmins.push(newAdmin);
    await this.saveAdminUsers(currentAdmins);
    return { success: true, admin: newAdmin };
  },

  /**
   * Update an existing admin user's role, permissions, assigned users, or password
   */
  async updateAdminUser(id: string, updates: Partial<AdminUser>): Promise<{ success: boolean; error?: string }> {
    const currentAdmins = this.getAdminUsers();
    const idx = currentAdmins.findIndex(a => a.id === id);
    if (idx === -1) {
      return { success: false, error: 'Admin account not found.' };
    }

    const existing = currentAdmins[idx];

    // If changing email, check for uniqueness
    if (updates.email && updates.email.trim().toLowerCase() !== existing.email.toLowerCase()) {
      const emailTaken = currentAdmins.some(a => a.id !== id && a.email.toLowerCase() === updates.email!.trim().toLowerCase());
      if (emailTaken) {
        return { success: false, error: 'Another admin user already uses this email.' };
      }
    }

    // Protect primary super admin role
    if (existing.email.toLowerCase() === DEFAULT_SUPER_ADMIN.email.toLowerCase()) {
      updates.role = 'super_admin';
      updates.status = 'active';
      updates.permissions = ['users', 'assets', 'fees', 'messages', 'support', 'chat', 'audit', 'sync'];
    }

    const updated: AdminUser = {
      ...existing,
      ...updates,
      email: updates.email ? updates.email.trim().toLowerCase() : existing.email,
      permissions: updates.role === 'super_admin'
        ? ['users', 'assets', 'fees', 'messages', 'support', 'chat', 'audit', 'sync']
        : (updates.permissions || existing.permissions),
      assigned_user_ids: updates.role === 'super_admin'
        ? []
        : (updates.assigned_user_ids !== undefined ? updates.assigned_user_ids : existing.assigned_user_ids)
    };

    currentAdmins[idx] = updated;
    await this.saveAdminUsers(currentAdmins);

    // If updating currently logged in admin, update active session
    const currentSession = this.getCurrentAdminSession();
    if (currentSession && currentSession.id === id) {
      this.saveAdminSession(updated);
    }

    return { success: true };
  },

  /**
   * Delete an administrative staff account
   */
  async deleteAdminUser(id: string): Promise<{ success: boolean; error?: string }> {
    const currentAdmins = this.getAdminUsers();
    const target = currentAdmins.find(a => a.id === id);

    if (!target) {
      return { success: false, error: 'Admin user not found.' };
    }

    // Do not allow deleting the default super admin
    if (target.email.toLowerCase() === DEFAULT_SUPER_ADMIN.email.toLowerCase()) {
      return { success: false, error: 'The primary Super Admin account cannot be deleted.' };
    }

    const filtered = currentAdmins.filter(a => a.id !== id);
    await this.saveAdminUsers(filtered);

    // If Supabase table exists, delete row
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('admin_users').delete().eq('id', id);
      } catch {}
    }

    return { success: true };
  },

  /**
   * Authenticate admin credentials on login
   */
  async authenticateAdmin(email: string, password: string): Promise<{ success: boolean; error?: string; admin?: AdminUser }> {
    const trimmedEmail = email.trim().toLowerCase();
    await this.syncFromCloud();
    const admins = this.getAdminUsers();

    const matched = admins.find(a => a.email.toLowerCase() === trimmedEmail);
    if (!matched) {
      return { success: false, error: 'Invalid email or password.' };
    }

    // Verify password (plain or base64)
    let isMatch = false;
    if (matched.password) {
      let decoded = '';
      try { decoded = atob(matched.password); } catch {}
      isMatch = (password === matched.password || password === decoded);
    }

    if (!isMatch) {
      return { success: false, error: 'Invalid email or password.' };
    }

    if (matched.status === 'suspended') {
      return { success: false, error: 'This admin account has been suspended. Please contact Super Admin.' };
    }

    // Update last login
    matched.last_login = new Date().toISOString();
    this.saveAdminSession(matched);
    this.saveAdminUsers(admins);

    return { success: true, admin: matched };
  },

  /**
   * Get the active admin session
   */
  getCurrentAdminSession(): AdminUser | null {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(SESSION_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.email) {
          // Re-sync with latest admin record to reflect recent permission edits
          const admins = this.getAdminUsers();
          const latest = admins.find(a => a.email.toLowerCase() === parsed.email.toLowerCase());
          if (latest) {
            return latest;
          }
          return parsed;
        }
      }
    } catch {}
    return null;
  },

  /**
   * Save active admin session
   */
  saveAdminSession(admin: AdminUser): void {
    const sessionData = {
      ...admin,
      sessionId: `sess_${Math.random().toString(36).substring(7)}`,
      loginTime: new Date().toISOString()
    };
    const jsonStr = JSON.stringify(sessionData);
    dataService.setItem(SESSION_KEY, jsonStr);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SESSION_KEY, jsonStr);
    }
  },

  /**
   * Clear active admin session
   */
  clearAdminSession(): void {
    dataService.removeItem(SESSION_KEY);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(SESSION_KEY);
    }
  },

  /**
   * Check if an admin has access to a specific tab
   */
  hasTabPermission(admin: AdminUser | null, tab: string): boolean {
    if (!admin) return false;
    if (admin.role === 'super_admin') return true;
    return admin.permissions?.includes(tab as AdminTabPermission) || false;
  },

  /**
   * Check if a specific user ID is assigned to this admin
   */
  isUserAssigned(admin: AdminUser | null, userId: string, userEmail?: string): boolean {
    if (!admin) return false;
    if (admin.role === 'super_admin') return true;
    if (!admin.assigned_user_ids || admin.assigned_user_ids.length === 0) return false;

    return admin.assigned_user_ids.includes(userId) ||
      (userEmail ? admin.assigned_user_ids.some(id => id.toLowerCase() === userEmail.toLowerCase()) : false);
  }
};

export default adminUserService;
