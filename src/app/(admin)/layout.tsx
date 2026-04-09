import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { AdminShell } from "./admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user?.role || "admin";
  const isAdmin = role === "admin";

  const navItems = [
    { href: "/dashboard", label: "儀表板" },
    { href: "/bookings", label: "預約紀錄" },
    ...(isAdmin ? [{ href: "/services", label: "服務管理" }] : []),
    ...(isAdmin ? [{ href: "/settings", label: "通知訊息設定" }] : []),
    ...(isAdmin ? [{ href: "/customers", label: "用戶列表" }] : []),
    ...(isAdmin ? [{ href: "/promotions", label: "活動設定" }] : []),
    ...(isAdmin ? [{ href: "/providers", label: "提供者列表" }] : []),
    ...(isAdmin ? [{ href: "/team", label: "管理員列表" }] : []),
    ...(isAdmin ? [{ href: "/system", label: "系統設定" }] : []),
    ...(!isAdmin ? [{ href: "/my-settings", label: "我的設定" }] : []),
  ];

  return (
    <SessionProvider session={session}>
      <AdminShell
        items={navItems}
        userName={session.user?.name || session.user?.email || ""}
        userEmail={session.user?.email || ""}
        isAdmin={isAdmin}
      >
        {children}
      </AdminShell>
    </SessionProvider>
  );
}
