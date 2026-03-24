
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ATENTO",
  description: "Programa de Treino de Atenção",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className={inter.className} style={{ margin: 0, padding: 0 }}>
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
          versão - 1.001.001.004 - 24/03/26 - 17:04
        </div>
        <div style={{ paddingTop: "24px" }}>{children}</div>
      </body>
    </html>
  );
}
