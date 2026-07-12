import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "海豚企策",
  description: "把行业趋势翻译成老板的下一步",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
