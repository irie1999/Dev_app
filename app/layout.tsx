import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yumeiro - 眠れない夜のための映像",
  description: "眠れない夜に、見ていて気持ちの良い映像をお届けします。雨、海、焚き火、森、宇宙など、癒しの映像でゆっくりお休みください。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#0a0a0f] text-white">
        {children}
      </body>
    </html>
  );
}
