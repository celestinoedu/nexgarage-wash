import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { StoreProvider } from "@/components/StoreProvider";

export const metadata: Metadata = {
  title: {
    default: "NexWash",
    template: "%s · NexWash"
  },
  description: "Gestão multiloja para lava-rápidos e estética automotiva.",
  icons: { icon: "/assets/favicon.png" }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body><AuthProvider><StoreProvider>{children}</StoreProvider></AuthProvider></body>
    </html>
  );
}
