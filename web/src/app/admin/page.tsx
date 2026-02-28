export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Total Users", value: "—", color: "bg-blue-500" },
          { label: "Pending Verifications", value: "—", color: "bg-amber-500" },
          { label: "Open Reports", value: "—", color: "bg-red-500" },
          { label: "Verified Users", value: "—", color: "bg-green-500" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-sm text-gray-500 mb-1">{stat.label}</div>
            <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
            <div className={`h-1 w-12 ${stat.color} rounded mt-3`} />
          </div>
        ))}
      </div>

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
