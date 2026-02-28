"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import StatCard from "@/components/admin/StatCard";

interface DashboardStats {
  totalUsers: number;
  pendingVerifications: number;
  openReports: number;
  verifiedUsers: number;
  activeToday: number;
  newThisWeek: number;
  suspendedUsers: number;
  matchesToday: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const data = await api.get<DashboardStats>("/admin/dashboard/stats");
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <StatCard label="Total Users" value={stats.totalUsers} color="bg-blue-500" />
            <StatCard label="Pending Verifications" value={stats.pendingVerifications} color="bg-amber-500" />
            <StatCard label="Open Reports" value={stats.openReports} color="bg-red-500" />
            <StatCard label="Verified Users" value={stats.verifiedUsers} color="bg-green-500" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard label="Active Today" value={stats.activeToday} color="bg-indigo-500" />
            <StatCard label="New This Week" value={stats.newThisWeek} color="bg-purple-500" />
            <StatCard label="Suspended" value={stats.suspendedUsers} color="bg-orange-500" />
            <StatCard label="Matches Today" value={stats.matchesToday} color="bg-pink-500" />
          </div>
        </>
      ) : (
        <div className="text-center text-gray-400 py-12">Failed to load stats</div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/admin/verifications"
            className="p-4 rounded-lg border border-gray-200 hover:border-rose-300 hover:bg-rose-50 transition"
          >
            <div className="font-medium text-gray-900">Review Verifications</div>
            <div className="text-sm text-gray-500 mt-1">
              Approve or reject pending selfie/video verifications
            </div>
          </a>
          <a
            href="/admin/reports"
            className="p-4 rounded-lg border border-gray-200 hover:border-rose-300 hover:bg-rose-50 transition"
          >
            <div className="font-medium text-gray-900">Handle Reports</div>
            <div className="text-sm text-gray-500 mt-1">
              Review user reports for fake profiles, harassment, etc.
            </div>
          </a>
          <a
            href="/admin/users"
            className="p-4 rounded-lg border border-gray-200 hover:border-rose-300 hover:bg-rose-50 transition"
          >
            <div className="font-medium text-gray-900">Manage Users</div>
            <div className="text-sm text-gray-500 mt-1">
              Search, view, and manage user accounts
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
