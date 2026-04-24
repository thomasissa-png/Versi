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
  manifest: "/site.webmanifest",
  twitter: {
    card: "summary_large_image",
    title: "Versi Studio",
    description:
      "Pré-commercialisation simplifiée pour marchands de biens. Déposez vos plans, découpez vos lots, créez vos visuels.",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-48x48.png", type: "image/png", sizes: "48x48" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    other: [
      { rel: "mask-icon", url: "/favicon.svg", color: "#0B0B0B" },
    ],
  },
  themeColor: "#0B0B0B",
  appleWebApp: {
    title: "Versi Studio",
    capable: true,
    statusBarStyle: "black-translucent",
  },
  other: {
    "msapplication-config": "/browserconfig.xml",
    "msapplication-TileColor": "#0B0B0B",
  },
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
