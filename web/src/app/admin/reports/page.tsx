export default function ReportsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Reports</h1>

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
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                Connect to the backend API to load reports.
                <br />
                <span className="text-sm">
                  Requires admin API endpoints for report management.
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
