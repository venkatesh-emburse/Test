"use client";

interface StatCardProps {
  label: string;
  value: number | string;
  color: string;
  icon?: string;
}

export default function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className={`h-1 w-12 ${color} rounded mt-3`} />
    </div>
  );
}
