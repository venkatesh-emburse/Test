"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import StatusBadge from "@/components/admin/StatusBadge";
import Pagination from "@/components/admin/Pagination";

interface ReportItem {
  id: string;
  reporterName: string;
  reporterEmail: string;
  reportedName: string;
  reportedEmail: string;
  reportedId: string;
  reporterId: string;
  reason: string;
  description: string | null;
  isReviewed: boolean;
  reviewedAt: string | null;
  reviewedBy: string | null;
  actionTaken: string | null;
  createdAt: string;
}

interface ReportsResponse {
  reports: ReportItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type ReviewFilter = "all" | "pending" | "reviewed";

const REASONS = [
  "all",
  "fake_profile",
  "harassment",
  "spam",
  "scam",
  "inappropriate_content",
  "underage",
  "other",
];

export default function ReportsPage() {
  const { admin } = useAuth();
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("pending");
  const [reasonFilter, setReasonFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Review state
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [actionTaken, setActionTaken] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  const canReview = admin?.role === "super_admin" || admin?.role === "admin";

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (reviewFilter === "pending") params.set("isReviewed", "false");
      else if (reviewFilter === "reviewed") params.set("isReviewed", "true");
      if (reasonFilter !== "all") params.set("reason", reasonFilter);
      const result = await api.get<ReportsResponse>(`/admin/reports?${params.toString()}`);
      setData(result);
    } catch (err) {
      console.error("Failed to fetch reports:", err);
    } finally {
      setLoading(false);
    }
  }, [page, reviewFilter, reasonFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleReview = async (reportId: string) => {
    if (!actionTaken.trim()) {
      alert("Please enter the action taken");
      return;
    }
    setReviewLoading(true);
    try {
      await api.post(`/admin/reports/${reportId}/review`, {
        actionTaken: actionTaken.trim(),
      });
      setReviewingId(null);
      setActionTaken("");
      fetchReports();
    } catch (err: any) {
      alert(err.message || "Review failed");
    } finally {
      setReviewLoading(false);
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
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <div className="flex gap-2">
          {(["all", "pending", "reviewed"] as ReviewFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => { setReviewFilter(filter); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${
                reviewFilter === filter
                  ? "bg-rose-600 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {filter === "pending" ? "Pending Review" : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Reason filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {REASONS.map((reason) => (
          <button
            key={reason}
            onClick={() => { setReasonFilter(reason); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
              reasonFilter === reason
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {reason.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Reporter</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Reported User</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Reason</th>
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
            ) : !data?.reports?.length ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  No reports found
                </td>
              </tr>
            ) : (
              data.reports.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{r.reporterName}</div>
                    <div className="text-xs text-gray-500">{r.reporterEmail}</div>
                  </td>
                  <td className="px-6 py-4">
                    <a href={`/admin/users/${r.reportedId}`} className="text-sm font-medium text-blue-600 hover:underline">
                      {r.reportedName}
                    </a>
                    <div className="text-xs text-gray-500">{r.reportedEmail}</div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={r.reason} />
                    {r.description && (
                      <div className="text-xs text-gray-500 mt-1 max-w-48 truncate" title={r.description}>
                        {r.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{timeAgo(r.createdAt)}</td>
                  <td className="px-6 py-4">
                    {r.isReviewed ? (
                      <div>
                        <StatusBadge status="reviewed" />
                        {r.actionTaken && (
                          <div className="text-xs text-gray-500 mt-1">{r.actionTaken}</div>
                        )}
                      </div>
                    ) : (
                      <StatusBadge status="pending" />
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {!r.isReviewed && canReview ? (
                      reviewingId === r.id ? (
                        <div className="flex flex-col gap-2">
                          <input
                            type="text"
                            value={actionTaken}
                            onChange={(e) => setActionTaken(e.target.value)}
                            placeholder="Action taken..."
                            className="w-48 px-2 py-1 border rounded text-xs"
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleReview(r.id)}
                              disabled={reviewLoading}
                              className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                            >
                              Mark Reviewed
                            </button>
                            <button
                              onClick={() => { setReviewingId(null); setActionTaken(""); }}
                              className="px-2 py-1 border rounded text-xs hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setReviewingId(r.id)}
                          className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs hover:bg-rose-700"
                        >
                          Review
                        </button>
                      )
                    ) : (
                      <a href={`/admin/users/${r.reportedId}`} className="text-xs text-blue-600 hover:underline">
                        View User
                      </a>
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
