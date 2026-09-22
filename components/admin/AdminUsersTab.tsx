import { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  UserPlus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Users, 
  KeyRound, 
  Lock, 
  RefreshCw, 
  SlidersHorizontal,
  Mail,
  UserCheck,
  Ban,
  Clock,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { 
  AdminUser, 
  adminUserService, 
  ALL_TAB_PERMISSIONS, 
  DEFAULT_SUPER_ADMIN 
} from '../../utils/adminUserService';
import CreateAdminUserModal from './CreateAdminUserModal';

interface AdminUsersTabProps {
  users: any[];
  currentAdmin?: AdminUser | null;
}

export default function AdminUsersTab({ users = [], currentAdmin }: AdminUsersTabProps) {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(() => adminUserService.getAdminUsers());
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'super_admin' | 'admin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick helper to show notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync from cloud on mount and on refresh
  const loadAdmins = async () => {
    setIsRefreshing(true);
    try {
      const refreshed = await adminUserService.syncFromCloud();
      setAdminUsers(refreshed);
    } catch (e) {
      console.warn('Failed to sync admin users:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAdmins();

    const handleUpdateEvent = (e: any) => {
      if (e.detail?.adminUsers) {
        setAdminUsers(e.detail.adminUsers);
      }
    };
    window.addEventListener('pluto_admin_users_updated', handleUpdateEvent);
    return () => window.removeEventListener('pluto_admin_users_updated', handleUpdateEvent);
  }, []);

  // Filtered list
  const filteredAdmins = useMemo(() => {
    return adminUsers.filter(admin => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        admin.email.toLowerCase().includes(q) || 
        admin.id.toLowerCase().includes(q) ||
        (admin.created_by && admin.created_by.toLowerCase().includes(q));

      // Role filter
      const matchesRole = roleFilter === 'all' || admin.role === roleFilter;

      // Status filter
      const matchesStatus = statusFilter === 'all' || admin.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [adminUsers, searchQuery, roleFilter, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = adminUsers.length;
    const superCount = adminUsers.filter(a => a.role === 'super_admin').length;
    const restrictedCount = adminUsers.filter(a => a.role === 'admin').length;
    const activeCount = adminUsers.filter(a => a.status === 'active').length;
    return { total, superCount, restrictedCount, activeCount };
  }, [adminUsers]);

  // Action handlers
  const handleToggleStatus = async (admin: AdminUser) => {
    if (admin.email.toLowerCase() === DEFAULT_SUPER_ADMIN.email.toLowerCase()) {
      showToast('The primary Super Admin status cannot be changed.');
      return;
    }
    const newStatus = admin.status === 'active' ? 'suspended' : 'active';
    const res = await adminUserService.updateAdminUser(admin.id, { status: newStatus });
    if (res.success) {
      setAdminUsers(adminUserService.getAdminUsers());
      showToast(`Admin ${admin.email} marked as ${newStatus}.`);
    } else {
      showToast(res.error || 'Failed to update status.');
    }
  };

  const handleDeleteAdmin = async (admin: AdminUser) => {
    if (admin.email.toLowerCase() === DEFAULT_SUPER_ADMIN.email.toLowerCase()) {
      showToast('The primary Super Admin cannot be deleted.');
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete admin account "${admin.email}"?`)) {
      return;
    }

    const res = await adminUserService.deleteAdminUser(admin.id);
    if (res.success) {
      setAdminUsers(adminUserService.getAdminUsers());
      showToast(`Admin account "${admin.email}" deleted successfully.`);
    } else {
      showToast(res.error || 'Failed to delete admin.');
    }
  };

  const handleEditClick = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setIsCreateModalOpen(true);
  };

  const handleModalSuccess = (admin: AdminUser) => {
    setAdminUsers(adminUserService.getAdminUsers());
    showToast(`Admin ${admin.email} saved successfully!`);
    setEditingAdmin(null);
  };

  // Helper to format date
  const formatDate = (isoStr?: string) => {
    if (!isoStr) return 'Never';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-sm animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Subtitle */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Admin Users & Access Control</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Create administrative staff accounts, configure role permissions, and restrict assigned user scopes
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={loadAdmins}
              disabled={isRefreshing}
              className="h-10 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin text-purple-600' : ''}`} />
              {isRefreshing ? 'Syncing...' : 'Refresh'}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditingAdmin(null);
                setIsCreateModalOpen(true);
              }}
              className="h-10 bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 shadow-sm"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Create Admin User
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-700/60">
          <div className="bg-slate-50 dark:bg-gray-800/60 rounded-xl p-4 border border-slate-100 dark:border-gray-700/40">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Admin Accounts</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
          </div>
          <div className="bg-purple-50/50 dark:bg-purple-950/20 rounded-xl p-4 border border-purple-100/50 dark:border-purple-900/30">
            <p className="text-xs font-medium text-purple-700 dark:text-purple-300">Super Admins (Full Access)</p>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-200 mt-1">{stats.superCount}</p>
          </div>
          <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-xl p-4 border border-blue-100/50 dark:border-blue-900/30">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Restricted Admins</p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-200 mt-1">{stats.restrictedCount}</p>
          </div>
          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl p-4 border border-emerald-100/50 dark:border-emerald-900/30">
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Active Accounts</p>
            <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-200 mt-1">{stats.activeCount}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search admins by email or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 rounded-lg text-sm"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="h-10 px-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium focus:outline-none"
          >
            <option value="all">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Restricted Admin</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-10 px-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>

          {(searchQuery || roleFilter !== 'all' || statusFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('all');
                setStatusFilter('all');
              }}
              className="h-10 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white"
            >
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Admins Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="py-4 px-6">Admin Account</th>
                <th className="py-4 px-6">Role & Status</th>
                <th className="py-4 px-6">Permitted Tabs</th>
                <th className="py-4 px-6">Assigned Users</th>
                <th className="py-4 px-6">Last Activity</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-sm">
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500 dark:text-gray-400">
                    <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-gray-400 opacity-60" />
                    <p className="font-medium">No admin accounts found</p>
                    <p className="text-xs text-gray-400 mt-1">Try changing your search filters or create a new admin</p>
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => {
                  const isPrimarySuper = admin.email.toLowerCase() === DEFAULT_SUPER_ADMIN.email.toLowerCase();
                  const isSelf = currentAdmin?.email.toLowerCase() === admin.email.toLowerCase();

                  return (
                    <tr 
                      key={admin.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      {/* Admin Account */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                            admin.role === 'super_admin'
                              ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
                              : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                          }`}>
                            {admin.email.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-white truncate">
                                {admin.email}
                              </span>
                              {isSelf && (
                                <span className="text-[10px] bg-slate-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded font-medium">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-mono text-gray-400 block truncate">
                              {admin.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role & Status */}
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1.5 items-start">
                          {admin.role === 'super_admin' ? (
                            <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 border-none font-medium text-xs">
                              <ShieldCheck className="w-3 h-3 mr-1" />
                              Super Admin
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 border-none font-medium text-xs">
                              <Shield className="w-3 h-3 mr-1" />
                              Restricted Admin
                            </Badge>
                          )}

                          <div className="flex items-center gap-1.5 text-xs">
                            {admin.status === 'active' ? (
                              <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-amber-600 dark:text-amber-400 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
                                Suspended
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Permitted Tabs */}
                      <td className="py-4 px-6">
                        {admin.role === 'super_admin' ? (
                          <div className="flex items-center gap-1.5 text-xs text-purple-700 dark:text-purple-300 font-medium">
                            <CheckCircle2 className="w-4 h-4 text-purple-600" />
                            <span>All Tabs & Features (8)</span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {admin.permissions && admin.permissions.length > 0 ? (
                              admin.permissions.map((perm) => {
                                const found = ALL_TAB_PERMISSIONS.find(p => p.id === perm);
                                return (
                                  <span
                                    key={perm}
                                    className="inline-block text-[11px] bg-slate-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-md"
                                  >
                                    {found ? found.label : perm}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-xs text-gray-400 italic">No tabs permitted</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Assigned Users */}
                      <td className="py-4 px-6">
                        {admin.role === 'super_admin' ? (
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            All Users (Unrestricted)
                          </span>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-gray-900 dark:text-white">
                              {admin.assigned_user_ids?.length || 0} user{admin.assigned_user_ids?.length === 1 ? '' : 's'} assigned
                            </span>
                            {admin.assigned_user_ids && admin.assigned_user_ids.length > 0 ? (
                              <span className="text-[11px] text-gray-400 font-mono truncate max-w-[180px]">
                                {admin.assigned_user_ids.slice(0, 2).join(', ')}
                                {admin.assigned_user_ids.length > 2 ? ` +${admin.assigned_user_ids.length - 2} more` : ''}
                              </span>
                            ) : (
                              <span className="text-[11px] text-amber-500 italic">
                                No users assigned yet
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Last Activity */}
                      <td className="py-4 px-6">
                        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            <span>Login: {formatDate(admin.last_login)}</span>
                          </div>
                          <div className="text-[11px] text-gray-400">
                            Created: {formatDate(admin.created_at)}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem 
                              onClick={() => handleEditClick(admin)}
                              className="cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit Permissions
                            </DropdownMenuItem>

                            {!isPrimarySuper && (
                              <DropdownMenuItem 
                                onClick={() => handleToggleStatus(admin)}
                                className="cursor-pointer"
                              >
                                {admin.status === 'active' ? (
                                  <>
                                    <Ban className="w-4 h-4 mr-2 text-amber-600" />
                                    <span>Suspend Account</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
                                    <span>Activate Account</span>
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}

                            {!isPrimarySuper && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteAdmin(admin)}
                                  className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Account
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Best Practices Card */}
      <div className="bg-slate-50 dark:bg-gray-800/60 rounded-xl p-5 border border-slate-200/80 dark:border-gray-700/60 flex items-start gap-3.5">
        <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <p className="font-semibold text-gray-900 dark:text-white">
            Role-Based Access Control (RBAC) Architecture
          </p>
          <p>
            • <strong>Super Admins:</strong> Have unrestricted system access to all 8 dashboard tabs, can configure network fees, review audit logs, and manage other admin accounts.
          </p>
          <p>
            • <strong>Restricted Admins:</strong> Can only access tabs explicitly enabled for them. In the <em>User Management</em> tab, they are strictly quarantined to their assigned user accounts and cannot inspect or adjust unassigned users.
          </p>
        </div>
      </div>

      {/* Create / Edit Admin User Modal */}
      <CreateAdminUserModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingAdmin(null);
        }}
        onSuccess={handleModalSuccess}
        users={users}
        editingAdmin={editingAdmin}
      />
    </div>
  );
}
