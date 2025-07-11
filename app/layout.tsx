import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistema de Reconhecimento Facial - Estádio",
  description:
    "Sistema de controle de acesso via reconhecimento facial para estádio de futebol",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased" suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  );
}
