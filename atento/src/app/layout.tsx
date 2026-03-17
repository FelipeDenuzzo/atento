import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ATENTO - Treino de Atenção",
  description:
    "Jogo web para treino de atenção seletiva, sustentada, dividida e alternada.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ margin: 0, padding: 0 }}
      >
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            zIndex: 9999,
            textAlign: "center",
            fontSize: "0.75rem",
            color: "#fff",
            background: "transparent",
            pointerEvents: "none",
            fontFamily: "inherit",
            padding: "6px 0 0 0"
          }}
        >
          versão - 1.001.001.001 - 17/03/26 - 16:57
        </div>
        <div style={{ paddingTop: "24px" }}>{children}</div>
      </body>
    </html>
  );
}
