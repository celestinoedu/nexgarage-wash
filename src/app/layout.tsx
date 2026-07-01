import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NexGarage",
  description: "Sistema simples para gestão de oficinas mecânicas."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
