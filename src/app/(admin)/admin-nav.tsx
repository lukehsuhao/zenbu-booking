"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Tag,
  Bell,
  Users,
  Gift,
  UserCog,
  ShieldCheck,
  Settings,
  User,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  "/dashboard": LayoutDashboard,
  "/bookings": ClipboardList,
  "/services": Tag,
  "/settings": Bell,
  "/customers": Users,
  "/promotions": Gift,
  "/providers": UserCog,
  "/team": ShieldCheck,
  "/system": Settings,
  "/my-settings": User,
};

type NavItem = {
  href: string;
  label: string;
};

export function AdminNav({ items, onItemClick }: { items: NavItem[]; onItemClick?: () => void }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <nav className="flex-1 px-3 py-4">
      <ul className="space-y-0.5">
        {items.map((item) => {
          const isActive = mounted && pathname === item.href;
          const Icon = ICON_MAP[item.href];
          return (
            <li key={item.href}>
              <a
                href={item.href}
                onClick={onItemClick}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--color-primary-50)] text-[var(--color-brand)]"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {Icon && <Icon size={18} className="flex-shrink-0" />}
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
