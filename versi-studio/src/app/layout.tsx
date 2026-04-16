/**
 * Root Layout — Versi Studio
 * Rendu : statique (layout shell, pas de données dynamiques)
 *
 * NOTE versi-s20 : le header/footer Versi sont définis dans `app/vs/layout.tsx`
 * (qui couvre toutes les pages /vs/*). Pas de header global ici pour éviter
 * la duplication.
 */

import type { Metadata } from "next";
import "./globals.css";

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
      <body className="antialiased">{children}</body>
    </html>
  );
}
