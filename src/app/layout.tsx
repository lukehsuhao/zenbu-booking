import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LINE 預約系統",
  description: "線上預約管理系統",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
