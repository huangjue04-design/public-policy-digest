import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "公共管理热点｜每日面试复习",
  description: "每日十条公共管理与公共政策热点，附可溯源原文和六维口述分析。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
