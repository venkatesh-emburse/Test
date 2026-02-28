"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import StatusBadge from "@/components/admin/StatusBadge";
import Pagination from "@/components/admin/Pagination";

interface UserItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  gender: string;
  intent: string;
  safetyScore: number;
  isVerified: boolean;
  isSuspended: boolean;
  isBanned: boolean;
  isActive: boolean;
  lastActiveAt: string | null;
  createdAt: string;
  photo: string | null;
}

interface UsersResponse {
  users: UserItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function getScoreTier(score: number) {
  if (score >= 80) return { label: "Trusted", color: "bg-yellow-100 text-yellow-800" };
  if (score >= 60) return { label: "Verified", color: "bg-gray-100 text-gray-700" };
  if (score >= 30) return { label: "Basic", color: "bg-orange-100 text-orange-800" };
  return { label: "New", color: "bg-gray-100 text-gray-500" };
}

export default function UsersPage() {
  const router = useRouter();
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [intent, setIntent] = useState("all");
  const [verified, setVerified] = useState("all");
  const [suspended, setSuspended] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("DESC");
  const [page, setPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        sortBy,
        sortOrder,
      });
      if (searchDebounced) params.set("search", searchDebounced);
      if (intent !== "all") params.set("intent", intent);
      if (verified !== "all") params.set("isVerified", verified);
      if (suspended !== "all") params.set("isSuspended", suspended);

      const result = await api.get<UsersResponse>(`/admin/users?${params.toString()}`);
      setData(result);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  }, [page, searchDebounced, intent, verified, suspended, sortBy, sortOrder]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm w-80 focus:outline-none focus:ring-2 focus:ring-rose-500"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={intent}
          onChange={(e) => { setIntent(e.target.value); setPage(1); }}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
        >
          <option value="all">All Intents</option>
          <option value="marriage">Marriage</option>
          <option value="long_term">Long Term</option>
          <option value="short_term">Short Term</option>
          <option value="companionship">Companionship</option>
        </select>

        <select
          value={verified}
          onChange={(e) => { setVerified(e.target.value); setPage(1); }}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
        >
          <option value="all">All Verification</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>

        <select
          value={suspended}
          onChange={(e) => { setSuspended(e.target.value); setPage(1); }}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
        >
          <option value="all">All Status</option>
          <option value="true">Suspended</option>
          <option value="false">Active</option>
        </select>

        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [sb, so] = e.target.value.split("-");
            setSortBy(sb);
            setSortOrder(so);
            setPage(1);
          }}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
        >
          <option value="createdAt-DESC">Newest First</option>
          <option value="createdAt-ASC">Oldest First</option>
          <option value="safetyScore-DESC">Highest Score</option>
          <option value="safetyScore-ASC">Lowest Score</option>
          <option value="name-ASC">Name A-Z</option>
          <option value="name-DESC">Name Z-A</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Contact</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Intent</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Safety Score</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Joined</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                  <div className="animate-spin h-6 w-6 border-2 border-rose-600 border-t-transparent rounded-full mx-auto" />
                </td>
              </tr>
            ) : !data?.users?.length ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                  {searchDebounced ? `No users found for "${searchDebounced}"` : "No users found"}
                </td>
              </tr>
            ) : (
              data.users.map((u) => {
                const tier = getScoreTier(u.safetyScore);
                return (
                  <tr key={u.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/admin/users/${u.id}`)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {u.photo ? (
                          <img src={u.photo} className="w-9 h-9 rounded-full object-cover" alt="" />
                        ) : (
                          <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-sm text-gray-500">
                            {u.name?.charAt(0) || "?"}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{u.name}</div>
                          <div className="text-xs text-gray-500 capitalize">{u.gender}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{u.email || "\u2014"}</div>
                      <div className="text-xs text-gray-500">{u.phone || "\u2014"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={u.intent} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{u.safetyScore}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${tier.color}`}>
                          {tier.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {u.isVerified && <StatusBadge status="verified" />}
                        {u.isSuspended && <StatusBadge status="suspended" />}
                        {u.isBanned && <StatusBadge status="banned" />}
                        {!u.isVerified && !u.isSuspended && !u.isBanned && (
                          <span className="text-xs text-gray-400">Unverified</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(u.createdAt)}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/admin/users/${u.id}`); }}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs hover:bg-gray-200"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })
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
