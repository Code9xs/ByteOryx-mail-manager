import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ByteOryx 邮箱管理器",
  description: "本地 Outlook 邮箱管理后台"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
