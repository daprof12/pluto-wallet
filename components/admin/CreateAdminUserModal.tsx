import { useState, useEffect, useMemo } from 'react';
import { X, Eye, EyeOff, Search, Shield, ShieldCheck, Check, AlertCircle, Users } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { 
  AdminUser, 
  AdminRole, 
  AdminTabPermission, 
  ALL_TAB_PERMISSIONS, 
  adminUserService 
} from '../../utils/adminUserService';

interface CreateAdminUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (admin: AdminUser) => void;
  users: any[];
  editingAdmin?: AdminUser | null;
}

export default function CreateAdminUserModal({
  isOpen,
  onClose,
  onSuccess,
  users = [],
  editingAdmin = null
}: CreateAdminUserModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<AdminRole>('admin');
  const [selectedPermissions, setSelectedPermissions] = useState<AdminTabPermission[]>([
    'users',
    'support'
  ]);
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [status, setStatus] = useState<'active' | 'suspended'>('active');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state when editing or opening
  useEffect(() => {
    if (!isOpen) return;

    if (editingAdmin) {
      setEmail(editingAdmin.email);
      setPassword(editingAdmin.password || '');
      setRole(editingAdmin.role);
      setSelectedPermissions(editingAdmin.permissions || ['users', 'support']);
      setAssignedUserIds(editingAdmin.assigned_user_ids || []);
      setStatus(editingAdmin.status || 'active');
    } else {
      setEmail('');
      setPassword('');
      setRole('admin');
      setSelectedPermissions(['users', 'support']);
      setAssignedUserIds([]);
      setStatus('active');
    }
    setError(null);
    setUserSearchQuery('');
  }, [isOpen, editingAdmin]);

  // When role changes to super_admin, auto-select all tab permissions
  useEffect(() => {
    if (role === 'super_admin') {
      setSelectedPermissions(ALL_TAB_PERMISSIONS.map(p => p.id));
    }
  }, [role]);

  // Filter users by search query
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return users;
    const q = userSearchQuery.toLowerCase();
    return users.filter(u => 
      u.email?.toLowerCase().includes(q) ||
      u.id?.toLowerCase().includes(q) ||
      u.fullName?.toLowerCase().includes(q)
    );
  }, [users, userSearchQuery]);

  if (!isOpen) return null;

  const togglePermission = (permId: AdminTabPermission) => {
    if (role === 'super_admin') return; // Cannot toggle if super admin
    setSelectedPermissions(prev => 
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const toggleUserAssignment = (userId: string) => {
    setAssignedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllUsers = () => {
    const allIds = users.map(u => u.id).filter(Boolean);
    setAssignedUserIds(allIds);
  };

  const handleDeselectAllUsers = () => {
    setAssignedUserIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!editingAdmin && (!password || password.length < 6)) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (role === 'admin' && selectedPermissions.length === 0) {
      setError('Please select at least one tab permission for this admin.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingAdmin) {
        // Updating existing admin
        const updatePayload: Partial<AdminUser> = {
          email: trimmedEmail,
          role,
          permissions: role === 'super_admin' ? ALL_TAB_PERMISSIONS.map(p => p.id) : selectedPermissions,
          assigned_user_ids: role === 'super_admin' ? [] : assignedUserIds,
          status
        };
        if (password && password.trim()) {
          updatePayload.password = password.trim();
        }

        const res = await adminUserService.updateAdminUser(editingAdmin.id, updatePayload);
        if (!res.success) {
          setError(res.error || 'Failed to update admin user.');
          setIsSubmitting(false);
          return;
        }

        const updatedAdmin: AdminUser = {
          ...editingAdmin,
          ...updatePayload
        };
        onSuccess(updatedAdmin);
      } else {
        // Creating new admin
        const res = await adminUserService.createAdminUser({
          email: trimmedEmail,
          password: password.trim(),
          role,
          permissions: selectedPermissions,
          assigned_user_ids: assignedUserIds,
          createdBy: 'Super Admin'
        });

        if (!res.success || !res.admin) {
          setError(res.error || 'Failed to create admin user.');
          setIsSubmitting(false);
          return;
        }

        onSuccess(res.admin);
      }

      onClose();
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Define the 2 columns of 4 permissions matching the screenshot exactly
  const col1Permissions: { id: AdminTabPermission; label: string }[] = [
    { id: 'users', label: 'User Management' },
    { id: 'fees', label: 'Fee Settings' },
    { id: 'support', label: 'Support Tickets' },
    { id: 'audit', label: 'Audit Logs' }
  ];

  const col2Permissions: { id: AdminTabPermission; label: string }[] = [
    { id: 'assets', label: 'Assets Overview' },
    { id: 'messages', label: 'Message Settings' },
    { id: 'chat', label: 'Live Chat' },
    { id: 'sync', label: 'Data Sync' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col border border-gray-100 dark:border-gray-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-gray-100 dark:border-gray-700/60">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {editingAdmin ? 'Edit Admin User' : 'Create Admin User'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {error && (
            <div className="p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2.5 text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: Email & Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin3@pluto.com"
                required
                className="h-11 bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-lg focus:bg-white dark:focus:bg-gray-800 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {editingAdmin ? 'Password (leave blank to keep)' : 'Password'}
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required={!editingAdmin}
                  className="h-11 pr-10 bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-lg focus:bg-white dark:focus:bg-gray-800 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Role
            </label>
            <div className="relative">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as AdminRole)}
                className="w-full h-11 px-3.5 appearance-none bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all cursor-pointer"
              >
                <option value="admin">Admin (Restricted Access)</option>
                <option value="super_admin">Super Admin (Full Access)</option>
              </select>
              <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Section: Tab Permissions */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Tab Permissions
              </h3>
              {role === 'super_admin' && (
                <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                  Full system access enabled
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {/* Column 1 */}
              <div className="space-y-3">
                {col1Permissions.map((perm) => {
                  const isChecked = role === 'super_admin' || selectedPermissions.includes(perm.id);
                  return (
                    <label 
                      key={perm.id} 
                      className={`flex items-center gap-2.5 text-sm select-none ${
                        role === 'super_admin' ? 'cursor-default opacity-85' : 'cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={role === 'super_admin'}
                        onChange={() => togglePermission(perm.id)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                      />
                      <span className="text-gray-800 dark:text-gray-200">
                        {perm.label}
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* Column 2 */}
              <div className="space-y-3">
                {col2Permissions.map((perm) => {
                  const isChecked = role === 'super_admin' || selectedPermissions.includes(perm.id);
                  return (
                    <label 
                      key={perm.id} 
                      className={`flex items-center gap-2.5 text-sm select-none ${
                        role === 'super_admin' ? 'cursor-default opacity-85' : 'cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={role === 'super_admin'}
                        onChange={() => togglePermission(perm.id)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                      />
                      <span className="text-gray-800 dark:text-gray-200">
                        {perm.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section: Assigned Users */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Assigned Users
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {role === 'super_admin' ? 'All users (unrestricted)' : `${assignedUserIds.length} selected`}
              </span>
            </div>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              {role === 'super_admin' 
                ? 'Super Admin can view and manage all users across the entire platform.' 
                : 'Select which users this admin can view and manage in the User Management tab.'}
            </p>

            {role === 'admin' && (
              <div className="space-y-2">
                {/* Search & Bulk select controls */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search users by email or ID..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="h-8 pl-8 text-xs bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllUsers}
                    className="h-8 text-xs px-2.5 text-gray-600 dark:text-gray-300"
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDeselectAllUsers}
                    className="h-8 text-xs px-2.5 text-gray-600 dark:text-gray-300"
                  >
                    Clear
                  </Button>
                </div>

                {/* Users Checkbox List */}
                <div className="border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 max-h-52 overflow-y-auto space-y-3 bg-white dark:bg-gray-800/60 divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.length === 0 ? (
                    <div className="py-6 text-center text-xs text-gray-500">
                      No users found.
                    </div>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSelected = assignedUserIds.includes(u.id);
                      return (
                        <label
                          key={u.id}
                          className="pt-2 first:pt-0 flex items-start gap-3 cursor-pointer select-none group"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleUserAssignment(u.id)}
                            className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                              {u.email}
                            </div>
                            <div className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate">
                              {u.id}
                            </div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-gray-800/50">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-10 px-5 text-sm font-medium border-slate-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="h-10 px-6 text-sm font-medium bg-[#0B0F19] hover:bg-black text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 rounded-lg shadow-sm transition-all"
          >
            {isSubmitting 
              ? (editingAdmin ? 'Saving...' : 'Creating...') 
              : (editingAdmin ? 'Save Changes' : 'Create Admin')}
          </Button>
        </div>
      </div>
    </div>
  );
}
