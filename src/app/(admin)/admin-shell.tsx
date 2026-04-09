"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { AdminNav } from "./admin-nav";
import { Calendar, Menu, X, LogOut } from "lucide-react";

type NavItem = { href: string; label: string };

export function AdminShell({
  children,
  items,
  userName,
  userEmail,
  isAdmin,
}: {
  children: React.ReactNode;
  items: NavItem[];
  userName: string;
  userEmail: string;
  isAdmin: boolean;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const initials = userName ? userName.charAt(0).toUpperCase() : "U";

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-surface)]">
      {/* TopNav */}
      <header className="h-14 md:h-16 flex-shrink-0 flex items-center px-4 bg-white border-b border-gray-200 z-50">
        {/* Mobile hamburger */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="md:hidden p-2 -ml-2 mr-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <Menu size={20} />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2.5 mr-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand)]">
            <Calendar size={16} className="text-white" />
          </div>
          <span className="text-base font-bold text-gray-900">LINE Booking</span>
        </div>

        <div className="flex-1" />

        {/* Right: user + logout */}
        <div className="flex items-center gap-2">
          <span className="hidden sm:block text-sm text-gray-700">{userName}</span>
          <div className="w-8 h-8 rounded-full bg-[var(--color-primary-100)] flex items-center justify-center">
            <span className="text-xs font-semibold text-[var(--color-brand)]">{initials}</span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-2 rounded-md text-gray-500 hover:text-[var(--color-error)] hover:bg-gray-100 transition-colors"
            title="登出"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-[220px] flex-shrink-0 flex-col bg-white border-r border-gray-200 overflow-y-auto">
          <AdminNav items={items} />
        </aside>

        {/* Mobile drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setDrawerOpen(false)}
            />
            <aside className="absolute left-0 top-0 bottom-0 w-[280px] bg-white flex flex-col shadow-xl">
              <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand)]">
                    <Calendar size={16} className="text-white" />
                  </div>
                  <span className="text-base font-bold text-gray-900">LINE Booking</span>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <AdminNav items={items} onItemClick={() => setDrawerOpen(false)} />
              {/* Mobile drawer bottom: user info */}
              <div className="p-3 border-t border-gray-200">
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-primary-100)] flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-[var(--color-brand)]">{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
                    <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-[var(--color-surface)] p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
