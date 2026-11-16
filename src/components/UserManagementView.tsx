import React, { useState, useMemo } from 'react';
import { UserProfile, UserRole } from '../types';
import { 
  Users, 
  Search, 
  ShieldCheck, 
  Shield, 
  GraduationCap, 
  Trash2, 
  AlertTriangle, 
  X, 
  CheckCircle2, 
  UserX,
  Lock,
  ChevronDown
} from 'lucide-react';

interface UserManagementViewProps {
  users: UserProfile[];
  currentUserId?: string;
  onUpdateRole: (uid: string, role: UserRole) => Promise<void> | void;
  onRemoveUser: (uid: string, user: UserProfile) => Promise<void> | void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  currentUserId,
  onUpdateRole,
  onRemoveUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Statistics
  const stats = useMemo(() => {
    const adminCount = users.filter(u => u.role === 'admin').length;
    const teacherCount = users.filter(u => u.role === 'teacher').length;
    const studentCount = users.filter(u => u.role === 'student').length;
    return {
      total: users.length,
      adminCount,
      teacherCount,
      studentCount,
    };
  }, [users]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = u.displayName.toLowerCase().includes(q);
        const emailMatch = u.email.toLowerCase().includes(q);
        if (!nameMatch && !emailMatch) return false;
      }
      return true;
    });
  }, [users, roleFilter, searchQuery]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleRoleChange = async (uid: string, newRole: UserRole, user: UserProfile) => {
    try {
      await onUpdateRole(uid, newRole);
      showNotification('success', `Updated ${user.displayName}'s role to ${newRole}.`);
    } catch (error) {
      console.error('Failed to update role:', error);
      showNotification('error', 'Failed to update user role. Please try again.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await onRemoveUser(userToDelete.uid, userToDelete);
      showNotification('success', `User ${userToDelete.displayName} removed successfully.`);
      setUserToDelete(null);
    } catch (error) {
      console.error('Failed to remove user:', error);
      showNotification('error', 'Failed to remove user profile. Please check permissions.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-200 border ${
          notification.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 hover:bg-black/5 rounded text-current opacity-70 hover:opacity-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header and Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Total Users</span>
            <Users className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-2xl font-bold text-zinc-900 mt-2 font-mono">{stats.total}</p>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Registered accounts</span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-purple-700 uppercase tracking-wider">Administrators</span>
            <ShieldCheck className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-900 mt-2 font-mono">{stats.adminCount}</p>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Full facility access</span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-blue-700 uppercase tracking-wider">Teachers</span>
            <Shield className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-900 mt-2 font-mono">{stats.teacherCount}</p>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Schedule & class leaders</span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Students</span>
            <GraduationCap className="w-4 h-4 text-zinc-500" />
          </div>
          <p className="text-2xl font-bold text-zinc-800 mt-2 font-mono">{stats.studentCount}</p>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Workstation check-ins</span>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              <Users className="w-4 h-4 text-zinc-700" />
              User Access & Role Management
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Control laboratory permissions. Admins can manage labs and trainers; Teachers can manage class schedules; Students can check in to stations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 font-medium focus:outline-none focus:ring-1 focus:ring-zinc-900"
              >
                <option value="all">All Roles ({users.length})</option>
                <option value="admin">Admins ({stats.adminCount})</option>
                <option value="teacher">Teachers ({stats.teacherCount})</option>
                <option value="student">Students ({stats.studentCount})</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-8 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase tracking-wider font-semibold">
                <th className="px-4 py-3 font-mono">User</th>
                <th className="px-4 py-3 font-mono">Email</th>
                <th className="px-4 py-3">Current Role</th>
                <th className="px-4 py-3">Assign Role</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-sans">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-zinc-400">
                    <UserX className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                    <p className="font-medium text-zinc-600">No users found</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Try adjusting your search query or role filter.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => {
                  const isSelf = u.uid === currentUserId;

                  return (
                    <tr key={u.uid} className="hover:bg-zinc-50/80 transition-colors">
                      {/* User Info */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            u.role === 'admin' 
                              ? 'bg-purple-100 text-purple-700 border border-purple-200'
                              : u.role === 'teacher'
                              ? 'bg-blue-100 text-blue-700 border border-blue-200'
                              : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                          }`}>
                            {u.displayName.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-zinc-900 block leading-tight">
                                {u.displayName}
                              </span>
                              {isSelf && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              UID: {u.uid.slice(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3 font-mono text-zinc-600 text-[11px] whitespace-nowrap">
                        {u.email}
                      </td>

                      {/* Role Pill */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize ${
                          u.role === 'admin'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200/60'
                            : u.role === 'teacher'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                            : 'bg-zinc-100 text-zinc-700 border border-zinc-200/60'
                        }`}>
                          {u.role === 'admin' && <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />}
                          {u.role === 'teacher' && <Shield className="w-3.5 h-3.5 text-blue-600" />}
                          {u.role === 'student' && <GraduationCap className="w-3.5 h-3.5 text-zinc-500" />}
                          <span>{u.role}</span>
                        </span>
                      </td>

                      {/* Role Selector */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole, u)}
                          className="px-2.5 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg text-zinc-800 font-medium focus:outline-none focus:ring-1 focus:ring-zinc-900 shadow-2xs hover:border-zinc-300 transition-colors"
                        >
                          <option value="student">Student (Read & Check-In)</option>
                          <option value="teacher">Teacher (Class Schedules)</option>
                          <option value="admin">Admin (Full Control)</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {isSelf ? (
                          <span 
                            title="You cannot remove your own active administrator account"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] text-zinc-400 bg-zinc-50 border border-zinc-200/60 rounded-md cursor-not-allowed select-none"
                          >
                            <Lock className="w-3 h-3 text-zinc-400" />
                            Current Account
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setUserToDelete(u)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200/60 rounded-lg transition-colors cursor-pointer group"
                            title={`Remove ${u.displayName} from the system`}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500 group-hover:scale-110 transition-transform" />
                            <span>Remove</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for Removing User */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-zinc-200 overflow-hidden transform animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 bg-red-50/50 border-b border-red-100 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0 border border-red-200">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 tracking-tight">
                  Remove User & Revoke Access
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Are you sure you want to remove this user from the laboratory system?
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* User preview card */}
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                  userToDelete.role === 'admin' 
                    ? 'bg-purple-100 text-purple-700'
                    : userToDelete.role === 'teacher'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-zinc-200 text-zinc-700'
                }`}>
                  {userToDelete.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-xs text-zinc-900 truncate">
                      {userToDelete.displayName}
                    </p>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-white border border-zinc-200 text-zinc-600">
                      {userToDelete.role}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 font-mono truncate">
                    {userToDelete.email}
                  </p>
                </div>
              </div>

              <div className="text-xs text-zinc-600 space-y-2 bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5">
                <div className="flex items-center gap-2 text-amber-800 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Important Consequences</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-amber-900/80 text-[11px]">
                  <li>Their user profile document will be permanently deleted from the database.</li>
                  <li>All assigned administrative or teacher privileges will be immediately revoked.</li>
                  <li>If this person signs in again later, they will be registered as a default student.</li>
                </ul>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 hover:text-zinc-900 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Removing User...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Remove User</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
