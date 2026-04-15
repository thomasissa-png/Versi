/**
 * Layout Versi Studio — /vs/*
 *
 * Header avec logo + lien retour "Mes opérations".
 * Le stepper est affiché uniquement dans les pages projet (pas le dashboard).
 * Rendu : SSR — layout shell sans données dynamiques.
 */

import Link from "next/link";

export default function VsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-default">
      {/* Header */}
      <header className="border-b border-border-default bg-bg-card">
        <div className="max-w-screen-xl mx-auto px-xl py-md flex items-center justify-between">
          <Link
            href="/vs"
            className="text-xs uppercase tracking-widest text-text-default font-medium hover:text-text-muted transition-colors"
          >
            Versi Studio
          </Link>
          <Link
            href="/vs"
            className="text-sm text-text-muted hover:text-text-default transition-colors flex items-center gap-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Mes opérations
          </Link>
        </div>
      </header>

      {/* Contenu */}
      <main className="max-w-screen-xl mx-auto px-xl py-2xl">{children}</main>
    </div>
  );
}
