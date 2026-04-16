/**
 * Root Layout — Versi Studio
 * Rendu : statique (layout shell, pas de données dynamiques)
 */

import type { Metadata } from "next";
import "./globals.css";
import AppHeader from "@/components/vs/AppHeader";
import AppFooter from "@/components/vs/AppFooter";

export const metadata: Metadata = {
  title: "Versi Studio",
  description:
    "Pré-commercialisation simplifiée pour marchands de biens. Déposez vos plans, découpez vos lots, créez vos visuels.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=pp-neue-montreal@400,500,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <AppHeader />
        {/* padding-top 80px compense la hauteur du header fixe Versi (.vs-nav height) */}
        <main style={{ paddingTop: "80px" }}>{children}</main>
        <AppFooter />
      </body>
    </html>
  );
}
