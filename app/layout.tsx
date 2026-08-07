import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WCDX Viewer",
  description: "Đọc và hiển thị ảnh bản vẽ từ file WCDX SQLite",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
