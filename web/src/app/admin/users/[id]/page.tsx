"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import StatusBadge from "@/components/admin/StatusBadge";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

interface UserDetail {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    gender: string;
    dateOfBirth: string;
    intent: string;
    safetyScore: number;
    isVerified: boolean;
    isSuspended: boolean;
    suspendedAt: string | null;
    isBanned: boolean;
    isActive: boolean;
    lastActiveAt: string | null;
    phoneVerified: boolean;
    emailVerified: boolean;
    swipeWarningCount: number;
    createdAt: string;
  };
  profile: {
    bio: string;
    photos: string[];
    interests: string[];
    occupation: string;
    education: string;
    height: number;
  } | null;
  scoreBreakdown: {
    selfieVerification: number;
    profileQuality: number;
    identityVerification: number;
    accountAge: number;
    behavioralScore: number;
    activityBonus: number;
    reportPenalty: number;
  };
  verifications: Array<{
    id: string;
    type: string;
    status: string;
    createdAt: string;
    verifiedAt: string | null;
    adminNotes: string | null;
    failureReason: string | null;
  }>;
  reportsReceived: Array<{
    id: string;
    reason: string;
    description: string;
    reporterName: string;
    isReviewed: boolean;
    actionTaken: string;
    createdAt: string;
  }>;
  reportsFiled: Array<{
    id: string;
    reason: string;
    description: string;
    reportedName: string;
    isReviewed: boolean;
    createdAt: string;
  }>;
  scoreHistory: Array<{
    id: string;
    previousScore: number;
    newScore: number;
    changeAmount: number;
    reason: string;
    category: string;
    createdAt: string;
  }>;
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { admin } = useAuth();
  const userId = params.id as string;

  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Score adjustment
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  // Confirm dialogs
  const [confirmAction, setConfirmAction] = useState<{
    type: string;
    title: string;
    message: string;
  } | null>(null);

  const canModify = admin?.role === "super_admin" || admin?.role === "admin";

  const fetchUser = async () => {
    try {
      const result = await api.get<UserDetail>(`/admin/users/${userId}`);
      setData(result);
    } catch (err) {
      console.error("Failed to fetch user:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const handleAction = async (type: string) => {
    setActionLoading(true);
    try {
      if (type === "ban") {
        await api.patch(`/admin/users/${userId}`, { isBanned: true });
      } else if (type === "unban") {
        await api.patch(`/admin/users/${userId}`, { isBanned: false });
      } else if (type === "suspend") {
        await api.patch(`/admin/users/${userId}`, { isSuspended: true });
      } else if (type === "unsuspend") {
        await api.patch(`/admin/users/${userId}`, { isSuspended: false });
      }
      setConfirmAction(null);
      fetchUser();
    } catch (err: any) {
      alert(err.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdjustScore = async () => {
    const amount = parseInt(adjustAmount);
    if (isNaN(amount) || amount === 0) return alert("Enter a valid amount");
    if (!adjustReason.trim()) return alert("Enter a reason");

    setActionLoading(true);
    try {
      await api.post(`/admin/users/${userId}/adjust-score`, {
        amount,
        reason: adjustReason.trim(),
      });
      setAdjustAmount("");
      setAdjustReason("");
      fetchUser();
    } catch (err: any) {
      alert(err.message || "Failed to adjust score");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-rose-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-20 text-gray-400">User not found</div>;
  }

  const { user, profile, scoreBreakdown, verifications, reportsReceived, reportsFiled, scoreHistory } = data;

  const age = Math.floor((Date.now() - new Date(user.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));

  return (
    <div>
      {/* Back button */}
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-4">
        &larr; Back to Users
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {profile?.photos?.[0] ? (
              <img src={profile.photos[0]} className="w-16 h-16 rounded-full object-cover" alt="" />
            ) : (
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-xl text-gray-500">
                {user.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500 capitalize">{user.gender}, {age}y</span>
                <span className="text-gray-300">|</span>
                <StatusBadge status={user.intent} />
                {user.isVerified && <StatusBadge status="verified" />}
                {user.isSuspended && <StatusBadge status="suspended" />}
                {user.isBanned && <StatusBadge status="banned" />}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {user.email || ""} {user.phone ? `\u2022 ${user.phone}` : ""}
              </div>
              <div className="text-xs text-gray-400">
                Member since {formatDate(user.createdAt)}
                {user.lastActiveAt && ` \u2022 Last active ${formatDate(user.lastActiveAt)}`}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {canModify && (
            <div className="flex gap-2">
              {user.isSuspended ? (
                <button
                  onClick={() => setConfirmAction({ type: "unsuspend", title: "Unsuspend User", message: `Are you sure you want to unsuspend ${user.name}?` })}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Unsuspend
                </button>
              ) : (
                <button
                  onClick={() => setConfirmAction({ type: "suspend", title: "Suspend User", message: `Are you sure you want to suspend ${user.name}? They will be excluded from discovery.` })}
                  className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Suspend
                </button>
              )}
              {user.isBanned ? (
                <button
                  onClick={() => setConfirmAction({ type: "unban", title: "Unban User", message: `Are you sure you want to unban ${user.name}?` })}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Unban
                </button>
              ) : (
                <button
                  onClick={() => setConfirmAction({ type: "ban", title: "Ban User", message: `Are you sure you want to ban ${user.name}? This will deactivate their account.` })}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Ban
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Safety Score Breakdown */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Safety Score: <span className="text-rose-600">{user.safetyScore}</span>
          </h2>
          <div className="space-y-3">
            {[
              { label: "Selfie/Video Verification", value: scoreBreakdown.selfieVerification, max: 30 },
              { label: "Profile Quality", value: scoreBreakdown.profileQuality, max: 25 },
              { label: "Identity Verification", value: scoreBreakdown.identityVerification, max: 15 },
              { label: "Account Age", value: scoreBreakdown.accountAge, max: 10 },
              { label: "Behavioral Score", value: scoreBreakdown.behavioralScore, max: 15 },
              { label: "Activity Bonus", value: scoreBreakdown.activityBonus, max: 5 },
              { label: "Report Penalty", value: scoreBreakdown.reportPenalty, max: 0 },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{item.label}</span>
                <span className={`text-sm font-semibold ${item.value < 0 ? "text-red-600" : "text-gray-900"}`}>
                  {item.value < 0 ? item.value : `${item.value}/${item.max}`}
                </span>
              </div>
            ))}
          </div>

          {/* Manual score adjustment */}
          {canModify && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Manual Adjustment</h3>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="+/- amount"
                  min={-50}
                  max={50}
                  className="w-24 px-3 py-1.5 border rounded-lg text-sm"
                />
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Reason..."
                  className="flex-1 px-3 py-1.5 border rounded-lg text-sm"
                />
                <button
                  onClick={handleAdjustScore}
                  disabled={actionLoading}
                  className="px-4 py-1.5 bg-rose-600 text-white rounded-lg text-sm hover:bg-rose-700 disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile Info */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile</h2>
          {profile ? (
            <div className="space-y-3">
              {profile.bio && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Bio</div>
                  <p className="text-sm text-gray-700">{profile.bio}</p>
                </div>
              )}
              {profile.occupation && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Occupation</span>
                  <span className="text-sm text-gray-900">{profile.occupation}</span>
                </div>
              )}
              {profile.education && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Education</span>
                  <span className="text-sm text-gray-900">{profile.education}</span>
                </div>
              )}
              {profile.height && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Height</span>
                  <span className="text-sm text-gray-900">{profile.height} cm</span>
                </div>
              )}
              {profile.interests?.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Interests</div>
                  <div className="flex flex-wrap gap-1">
                    {profile.interests.map((interest) => (
                      <span key={interest} className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-700">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {profile.photos?.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-2">Photos ({profile.photos.length})</div>
                  <div className="flex gap-2 flex-wrap">
                    {profile.photos.map((photo, i) => (
                      <a key={i} href={photo} target="_blank" rel="noopener noreferrer">
                        <img src={photo} className="w-16 h-16 rounded-lg object-cover" alt={`Photo ${i + 1}`} />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Phone verified</span>
                <span className={`text-sm ${user.phoneVerified ? "text-green-600" : "text-gray-400"}`}>
                  {user.phoneVerified ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Email verified</span>
                <span className={`text-sm ${user.emailVerified ? "text-green-600" : "text-gray-400"}`}>
                  {user.emailVerified ? "Yes" : "No"}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No profile data</p>
          )}
        </div>
      </div>

      {/* Verification History */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Verification History</h2>
        {verifications.length === 0 ? (
          <p className="text-sm text-gray-400">No verification attempts</p>
        ) : (
          <div className="space-y-3">
            {verifications.map((v) => (
              <div key={v.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <StatusBadge status={v.type} />
                  <StatusBadge status={v.status} />
                  <span className="text-sm text-gray-500">{formatDate(v.createdAt)}</span>
                </div>
                {v.failureReason && <span className="text-xs text-red-600">{v.failureReason}</span>}
                {v.adminNotes && <span className="text-xs text-gray-500">{v.adminNotes}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Reports Received */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Reports Received ({reportsReceived.length})</h2>
          {reportsReceived.length === 0 ? (
            <p className="text-sm text-gray-400">No reports received</p>
          ) : (
            <div className="space-y-3">
              {reportsReceived.map((r) => (
                <div key={r.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={r.reason} />
                    <span className="text-xs text-gray-500">by {r.reporterName}</span>
                    <span className="text-xs text-gray-400">{formatDate(r.createdAt)}</span>
                  </div>
                  {r.description && <p className="text-xs text-gray-600">{r.description}</p>}
                  {r.isReviewed && (
                    <div className="text-xs text-green-600 mt-1">Reviewed: {r.actionTaken}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reports Filed */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Reports Filed ({reportsFiled.length})</h2>
          {reportsFiled.length === 0 ? (
            <p className="text-sm text-gray-400">No reports filed</p>
          ) : (
            <div className="space-y-3">
              {reportsFiled.map((r) => (
                <div key={r.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={r.reason} />
                    <span className="text-xs text-gray-500">against {r.reportedName}</span>
                    <span className="text-xs text-gray-400">{formatDate(r.createdAt)}</span>
                  </div>
                  {r.description && <p className="text-xs text-gray-600">{r.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Score History */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Score History</h2>
        {scoreHistory.length === 0 ? (
          <p className="text-sm text-gray-400">No score changes recorded</p>
        ) : (
          <div className="space-y-2">
            {scoreHistory.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{formatDate(s.createdAt)}</span>
                  <span className="text-sm text-gray-700">{s.reason}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-semibold ${s.changeAmount >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {s.changeAmount >= 0 ? `+${s.changeAmount}` : s.changeAmount}
                  </span>
                  <span className="text-xs text-gray-500">{s.newScore}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.title || ""}
        message={confirmAction?.message || ""}
        confirmLabel={confirmAction?.type === "ban" ? "Ban User" : confirmAction?.type === "suspend" ? "Suspend User" : "Confirm"}
        confirmVariant={confirmAction?.type === "ban" || confirmAction?.type === "suspend" ? "danger" : "primary"}
        onConfirm={() => confirmAction && handleAction(confirmAction.type)}
        onCancel={() => setConfirmAction(null)}
        loading={actionLoading}
      />
    </div>
  );
}
