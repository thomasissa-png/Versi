/**
 * Not Found — /vs/*
 * Affiché quand une page VS n'existe pas.
 */

import Link from "next/link";

export default function VsNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-4xl text-center">
      <h2 className="text-lg font-medium text-text-default mb-sm">
        Page introuvable
      </h2>
      <p className="text-sm text-text-muted mb-xl">
        Cette page n'existe pas ou a été déplacée.
      </p>
      <Link
        href="/vs"
        className="
          px-xl py-sm rounded-md text-sm font-medium
          bg-interactive-primary text-text-inverse
          hover:bg-interactive-hover
          transition-colors duration-200
        "
      >
        Retour aux opérations
      </Link>
    </div>
  );
}
