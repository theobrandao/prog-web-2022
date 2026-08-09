import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Turbo Ofertas",
  description: "Painel administrativo Turbo Ofertas",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <title>Turbo Ofertas</title>
      </head>
      <body>{children}</body>
    </html>
  );
}
