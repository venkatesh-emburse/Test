"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import StatusBadge from "@/components/admin/StatusBadge";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

interface AdminTeamMember {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function TeamPage() {
  const { admin } = useAuth();
  const [admins, setAdmins] = useState<AdminTeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Add admin modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("admin");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  // Deactivate confirm
  const [deactivateTarget, setDeactivateTarget] = useState<AdminTeamMember | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTeam = async () => {
    try {
      const data = await api.get<AdminTeamMember[]>("/admin/team");
      setAdmins(data);
    } catch (err) {
      console.error("Failed to fetch team:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    setAddLoading(true);
    try {
      await api.post("/admin/team", {
        email: newEmail,
        password: newPassword,
        name: newName,
        role: newRole,
      });
      setShowAddModal(false);
      setNewEmail("");
      setNewName("");
      setNewPassword("");
      setNewRole("admin");
      fetchTeam();
    } catch (err: any) {
      setAddError(err.message || "Failed to create admin");
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setActionLoading(true);
    try {
      await api.del(`/admin/team/${deactivateTarget.id}`);
      setDeactivateTarget(null);
      fetchTeam();
    } catch (err: any) {
      alert(err.message || "Failed to deactivate");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleChange = async (adminId: string, role: string) => {
    try {
      await api.patch(`/admin/team/${adminId}`, { role });
      fetchTeam();
    } catch (err: any) {
      alert(err.message || "Failed to update role");
    }
  };

  const handleToggleActive = async (member: AdminTeamMember) => {
    try {
      await api.patch(`/admin/team/${member.id}`, { isActive: !member.isActive });
      fetchTeam();
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  if (admin?.role !== "super_admin") {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-lg font-medium">Access Denied</p>
        <p className="text-sm mt-1">Only super admins can manage the team.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Team</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700"
        >
          + Add Admin
        </button>
      </div>

      {/* Team Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Last Login</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  <div className="animate-spin h-6 w-6 border-2 border-rose-600 border-t-transparent rounded-full mx-auto" />
                </td>
              </tr>
            ) : admins.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  No admin users found
                </td>
              </tr>
            ) : (
              admins.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center text-sm font-bold text-rose-600">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-sm font-medium text-gray-900">{member.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{member.email}</td>
                  <td className="px-6 py-4">
                    {member.id === admin?.id ? (
                      <StatusBadge status={member.role} />
                    ) : (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        className="px-2 py-1 border rounded text-xs"
                      >
                        <option value="super_admin">Super Admin</option>
                        <option value="admin">Admin</option>
                        <option value="support">Support</option>
                      </select>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={member.isActive ? "active" : "inactive"} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {member.lastLoginAt ? formatDate(member.lastLoginAt) : "Never"}
                  </td>
                  <td className="px-6 py-4">
                    {member.id === admin?.id ? (
                      <span className="text-xs text-gray-400">You</span>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleActive(member)}
                          className={`px-3 py-1 rounded text-xs ${
                            member.isActive
                              ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                              : "bg-green-100 text-green-700 hover:bg-green-200"
                          }`}
                        >
                          {member.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Admin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Admin User</h3>

            {addError && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddAdmin} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="admin@liveconnect.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Min 6 characters"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="admin">Admin</option>
                  <option value="support">Support</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 disabled:opacity-50"
                >
                  {addLoading ? "Creating..." : "Create Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate Confirm */}
      <ConfirmDialog
        open={!!deactivateTarget}
        title="Deactivate Admin"
        message={`Are you sure you want to deactivate ${deactivateTarget?.name}? They will no longer be able to log in.`}
        confirmLabel="Deactivate"
        confirmVariant="danger"
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
        loading={actionLoading}
      />
    </div>
  );
}
