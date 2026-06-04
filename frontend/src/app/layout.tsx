import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PENTING - Pencegahan Stunting Terintegrasi",
  description: "Sistem monitoring gizi bayi dan pencegahan stunting di tingkat Posyandu",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
