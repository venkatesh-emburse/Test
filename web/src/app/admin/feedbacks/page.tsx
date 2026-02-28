"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import StatusBadge from "@/components/admin/StatusBadge";
import Pagination from "@/components/admin/Pagination";

interface FeedbackItem {
  id: string;
  type: string;
  description: string;
  status: string;
  adminNotes: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  userName: string;
  userEmail: string;
  userId: string;
}

interface FeedbacksResponse {
  feedbacks: FeedbackItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type StatusFilter = "all" | "open" | "in_progress" | "resolved" | "closed";
type TypeFilter = "all" | "bug_report" | "feature_request" | "general_feedback";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "bug_report", label: "Bug Report" },
  { value: "feature_request", label: "Feature Request" },
  { value: "general_feedback", label: "General Feedback" },
];

const STATUS_OPTIONS = ["open", "in_progress", "resolved", "closed"];

export default function FeedbacksPage() {
  const { admin } = useAuth();
  const [data, setData] = useState<FeedbacksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [page, setPage] = useState(1);

  // Update state
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);

  const canManage = admin?.role === "super_admin" || admin?.role === "admin" || admin?.role === "support";

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);
      const result = await api.get<FeedbacksResponse>(`/admin/feedbacks?${params.toString()}`);
      setData(result);
    } catch (err) {
      console.error("Failed to fetch feedbacks:", err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const handleUpdate = async (feedbackId: string) => {
    if (!newStatus) {
      alert("Please select a status");
      return;
    }
    setUpdateLoading(true);
    try {
      await api.patch(`/admin/feedbacks/${feedbackId}`, {
        status: newStatus,
        adminNotes: adminNotes.trim() || undefined,
      });
      setUpdatingId(null);
      setNewStatus("");
      setAdminNotes("");
      fetchFeedbacks();
    } catch (err: any) {
      alert(err.message || "Update failed");
    } finally {
      setUpdateLoading(false);
    }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feedbacks</h1>
          <p className="text-sm text-gray-500 mt-1">
            User bug reports, feature requests, and feedback
          </p>
        </div>
        <div className="flex gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => { setStatusFilter(filter.value); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                statusFilter === filter.value
                  ? "bg-rose-600 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Type filter */}
      <div className="flex gap-2 mb-4">
        {TYPE_FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => { setTypeFilter(filter.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              typeFilter === filter.value
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Feedbacks Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
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
            ) : !data?.feedbacks?.length ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  No feedbacks found
                </td>
              </tr>
            ) : (
              data.feedbacks.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <a href={`/admin/users/${f.userId}`} className="text-sm font-medium text-blue-600 hover:underline">
                      {f.userName}
                    </a>
                    <div className="text-xs text-gray-500">{f.userEmail}</div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={f.type} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-700 max-w-xs line-clamp-2" title={f.description}>
                      {f.description}
                    </div>
                    {f.adminNotes && (
                      <div className="text-xs text-gray-500 mt-1 italic">
                        Admin: {f.adminNotes}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{timeAgo(f.createdAt)}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={f.status} />
                  </td>
                  <td className="px-6 py-4">
                    {canManage ? (
                      updatingId === f.id ? (
                        <div className="flex flex-col gap-2">
                          <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            className="w-40 px-2 py-1 border rounded text-xs text-gray-900"
                          >
                            <option value="">Select status...</option>
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {s.replace(/_/g, " ")}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            placeholder="Admin notes (optional)"
                            className="w-40 px-2 py-1 border rounded text-xs text-gray-900 placeholder-gray-400"
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleUpdate(f.id)}
                              disabled={updateLoading}
                              className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => { setUpdatingId(null); setNewStatus(""); setAdminNotes(""); }}
                              className="px-2 py-1 border rounded text-xs hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setUpdatingId(f.id); setNewStatus(f.status); }}
                          className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs hover:bg-rose-700"
                        >
                          Update
                        </button>
                      )
                    ) : (
                      <span className="text-xs text-gray-400">View only</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
