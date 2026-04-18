import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "☕ 咖啡廳老闆就是你！",
  description: "咖啡廳經營模擬遊戲",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className="bg-amber-50 min-h-screen">
        {children}
        <div className="fixed bottom-2 right-3 text-[10px] text-amber-400/60 select-none pointer-events-none">
          2026 © Dr.Huang W-L
        </div>
      </body>
    </html>
  );
}
