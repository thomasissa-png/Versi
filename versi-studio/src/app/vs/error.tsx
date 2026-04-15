/**
 * Error boundary — /vs/*
 * Affiché en cas d'erreur non-catchée dans les pages VS.
 */

"use client";

export default function VsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-4xl text-center">
      <div className="w-16 h-16 mb-lg rounded-full bg-error/10 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-error"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-medium text-text-default mb-sm">
        Une erreur est survenue
      </h2>
      <p className="text-sm text-text-muted mb-xl max-w-md">
        {error.message || "Veuillez réessayer. Si le problème persiste, contactez le support."}
      </p>
      <button
        onClick={reset}
        className="
          px-xl py-sm rounded-md text-sm font-medium
          bg-interactive-primary text-text-inverse
          hover:bg-interactive-hover
          transition-colors duration-200
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary
        "
      >
        Réessayer
      </button>
    </div>
  );
}
