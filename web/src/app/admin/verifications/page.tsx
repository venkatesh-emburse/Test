"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import StatusBadge from "@/components/admin/StatusBadge";
import Pagination from "@/components/admin/Pagination";

interface Verification {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  userPhoto: string | null;
  verificationType: string;
  verificationStatus: string;
  selfieImageUrl: string | null;
  videoUrl: string | null;
  challengeCode: string | null;
  phraseShown: string | null;
  adminNotes: string | null;
  createdAt: string;
  verifiedAt: string | null;
}

interface VerificationsResponse {
  verifications: Verification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type StatusFilter = "all" | "pending" | "verified" | "failed";
type TypeFilter = "all" | "selfie" | "video";

export default function VerificationsPage() {
  const { admin } = useAuth();
  const [data, setData] = useState<VerificationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [page, setPage] = useState(1);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  const canReview = admin?.role === "super_admin" || admin?.role === "admin";

  const fetchVerifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);
      const result = await api.get<VerificationsResponse>(
        `/admin/verifications?${params.toString()}`
      );
      setData(result);
    } catch (err) {
      console.error("Failed to fetch verifications:", err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter]);

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  const handleReview = async (verificationId: string, status: "verified" | "failed") => {
    setReviewLoading(true);
    try {
      await api.post(`/admin/verifications/${verificationId}/review`, {
        status,
        notes: reviewNotes || undefined,
      });
      setReviewingId(null);
      setReviewNotes("");
      fetchVerifications();
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
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Verifications</h1>
        <div className="flex gap-2">
          {(["all", "pending", "verified", "failed"] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${
                statusFilter === status
                  ? "bg-rose-600 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Type filter */}
      <div className="flex gap-2 mb-4">
        {(["all", "selfie", "video"] as TypeFilter[]).map((type) => (
          <button
            key={type}
            onClick={() => { setTypeFilter(type); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
              typeFilter === type
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Verifications Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Submitted</th>
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
            ) : !data?.verifications?.length ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  No verifications found
                </td>
              </tr>
            ) : (
              data.verifications.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {v.userPhoto ? (
                        <img src={v.userPhoto} className="w-8 h-8 rounded-full object-cover" alt="" />
                      ) : (
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs text-gray-500">
                          {v.userName?.charAt(0) || "?"}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{v.userName}</div>
                        <div className="text-xs text-gray-500">{v.userEmail || v.userPhone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={v.verificationType} />
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={v.verificationStatus} />
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-gray-700">
                      {v.challengeCode || v.phraseShown || "\u2014"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{timeAgo(v.createdAt)}</td>
                  <td className="px-6 py-4">
                    {v.verificationStatus === "pending" && canReview ? (
                      <div className="flex gap-2">
                        {reviewingId === v.id ? (
                          <div className="flex flex-col gap-2">
                            <textarea
                              value={reviewNotes}
                              onChange={(e) => setReviewNotes(e.target.value)}
                              placeholder="Notes (optional)..."
                              className="w-48 px-2 py-1 border rounded text-xs"
                              rows={2}
                            />
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleReview(v.id, "verified")}
                                disabled={reviewLoading}
                                className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReview(v.id, "failed")}
                                disabled={reviewLoading}
                                className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => { setReviewingId(null); setReviewNotes(""); }}
                                className="px-2 py-1 border rounded text-xs hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setReviewingId(v.id)}
                            className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs hover:bg-rose-700"
                          >
                            Review
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">
                        {v.verificationStatus !== "pending" ? v.verificationStatus : "View only"}
                      </span>
                    )}
                    {/* Media preview links */}
                    <div className="flex gap-2 mt-1">
                      {v.selfieImageUrl && (
                        <a href={v.selfieImageUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                          View Selfie
                        </a>
                      )}
                      {v.videoUrl && (
                        <a href={v.videoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                          View Video
                        </a>
                      )}
                    </div>
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
