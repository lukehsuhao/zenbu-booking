import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SessionProvider } from "next-auth/react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <SessionProvider session={session}>
      <div className="flex min-h-screen">
        <nav className="w-64 bg-gray-900 text-white p-4">
          <h2 className="text-lg font-bold mb-6">預約管理後台</h2>
          <ul className="space-y-2">
            <li><a href="/dashboard" className="block px-3 py-2 rounded hover:bg-gray-700">儀表板</a></li>
            <li><a href="/services" className="block px-3 py-2 rounded hover:bg-gray-700">服務管理</a></li>
            <li><a href="/providers" className="block px-3 py-2 rounded hover:bg-gray-700">提供者管理</a></li>
            <li><a href="/bookings" className="block px-3 py-2 rounded hover:bg-gray-700">預約紀錄</a></li>
            <li><a href="/settings" className="block px-3 py-2 rounded hover:bg-gray-700">提醒設定</a></li>
          </ul>
        </nav>
        <main className="flex-1 p-8 bg-gray-50">{children}</main>
      </div>
    </SessionProvider>
  );
}
