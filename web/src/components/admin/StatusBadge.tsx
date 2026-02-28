"use client";

const statusStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  verified: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  in_progress: "bg-blue-100 text-blue-800",
  reviewed: "bg-green-100 text-green-800",
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-600",
  suspended: "bg-orange-100 text-orange-800",
  banned: "bg-red-100 text-red-800",
  super_admin: "bg-purple-100 text-purple-800",
  admin: "bg-blue-100 text-blue-800",
  support: "bg-gray-100 text-gray-700",
  // Report reasons
  fake_profile: "bg-red-100 text-red-800",
  harassment: "bg-red-100 text-red-800",
  spam: "bg-amber-100 text-amber-800",
  scam: "bg-red-100 text-red-800",
  inappropriate_content: "bg-orange-100 text-orange-800",
  underage: "bg-red-100 text-red-800",
  other: "bg-gray-100 text-gray-700",
  // Intents
  marriage: "bg-pink-100 text-pink-800",
  long_term: "bg-purple-100 text-purple-800",
  short_term: "bg-blue-100 text-blue-800",
  companionship: "bg-teal-100 text-teal-800",
  // Verification types
  selfie: "bg-indigo-100 text-indigo-800",
  video: "bg-violet-100 text-violet-800",
  // Feedback statuses
  open: "bg-amber-100 text-amber-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-600",
  // Feedback types
  bug_report: "bg-red-100 text-red-800",
  feature_request: "bg-blue-100 text-blue-800",
  general_feedback: "bg-teal-100 text-teal-800",
};

export default function StatusBadge({ status, className = "" }: { status: string; className?: string }) {
  const style = statusStyles[status] || "bg-gray-100 text-gray-700";
  const label = status.replace(/_/g, " ");

  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${style} ${className}`}
    >
      {label}
    </span>
  );
}
