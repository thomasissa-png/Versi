/**
 * Loading — /vs/*
 * Affiché pendant le chargement des pages VS.
 */

export default function VsLoading() {
  return (
    <div className="flex items-center justify-center py-4xl">
      <div className="inline-block w-6 h-6 border-2 border-border-default border-t-interactive-primary rounded-full animate-spin" />
    </div>
  );
}
