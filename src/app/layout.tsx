import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResuMagic - 简历魔法师",
  description:
    "面向海投求职者的动态简历匹配与管理工作台。AI 一键将原始经历转化为 STAR 法则专业简历描述。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
