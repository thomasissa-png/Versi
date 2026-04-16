/**
 * Layout Versi Studio — /vs/*
 *
 * Header + Footer Versi (style fidèle à versi.fr / versi-immobilier).
 * Header : fond sombre #1A1A1A, logo VERSI thin uppercase, liens nav uppercase.
 * Footer : fond sombre #0F0F0F, logo VERSI thin + entités groupe + mentions.
 *
 * SEO : noindex/nofollow sur toutes les routes /vs/* — outil interne.
 */

import type { Metadata } from "next";
import AppHeader from "@/components/vs/AppHeader";
import AppFooter from "@/components/vs/AppFooter";

export const metadata: Metadata = {
  title: "Versi Studio — Outil de découpe et visualisation",
  description:
    "Outil interne Versi — découpe de lots, visualisation et pré-commercialisation pour marchands de biens.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function VsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-bg-default">
      <AppHeader />
      {/* Padding-top 80px compense la hauteur du header fixe (.vs-nav height: 80px). */}
      <main className="flex-1 max-w-screen-xl mx-auto w-full px-xl py-2xl" style={{ paddingTop: "112px" }}>
        {children}
      </main>
      <AppFooter />
    </div>
  );
}
