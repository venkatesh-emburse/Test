"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/auth-context";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/verifications", label: "Verifications", icon: "✅" },
  { href: "/admin/reports", label: "Reports", icon: "🚨" },
  { href: "/admin/feedbacks", label: "Feedbacks", icon: "💬" },
  { href: "/admin/users", label: "Users", icon: "👥" },
];

const superAdminItems = [
  { href: "/admin/team", label: "Team", icon: "🔑" },
];

function AdminSidebar() {
  const pathname = usePathname();
  const { admin, loading, logout } = useAuth();

  // Don't render sidebar on login page
  if (pathname === "/admin/login") return null;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-rose-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated — redirect
  if (!admin) {
    if (typeof window !== "undefined") {
      window.location.href = "/admin/login";
    }
    return null;
  }

  const allNavItems = [
    ...navItems,
    ...(admin.role === "super_admin" ? superAdminItems : []),
  ];

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col shrink-0">
      <div className="p-6 border-b border-gray-800">
        <Link href="/" className="text-xl font-bold text-rose-400">
          LiveConnect
        </Link>
        <div className="text-xs text-gray-400 mt-1">Admin Dashboard</div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {allNavItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition ${
                isActive
                  ? "bg-rose-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Admin profile + logout */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-rose-600 rounded-full flex items-center justify-center text-sm font-bold">
            {admin.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{admin.name}</div>
            <div className="text-xs text-gray-400 capitalize">
              {admin.role.replace("_", " ")}
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Login page uses its own layout
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AuthProvider>
  );
}
