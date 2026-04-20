"use client";

/**
 * RecommendationCard — Carte pour une recommandation architecte IA.
 *
 * Rendu : Client Component (interactions accepter/refuser).
 *
 * Affiche : icône par type, description, coût estimé, impact,
 * boutons Accepter/Refuser avec état visuellement distinct.
 *
 * Design tokens : sage #7D9B76 (accepté), red #EF4444 (refusé),
 * radius 8px, shadow standard.
 */

// ─── Types ──────────────────────────────────────────────────────────

type RecommendationType = "redistribute" | "merge" | "convert" | "add" | "optimize";

type RecommendationDecision = "pending" | "accepted" | "rejected";

interface Recommendation {
  id: string;
  type: RecommendationType;
  room_name: string;
  description: string;
  estimated_cost?: string | null;
  impact: string;
  rationale_buyer?: string | null;
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  decision?: RecommendationDecision;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}

// ─── Icon paths per type ────────────────────────────────────────────

const TYPE_ICONS: Record<RecommendationType, { path: string; label: string }> = {
  redistribute: {
    path: "M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01",
    label: "Redistribution",
  },
  merge: {
    path: "M17 8l4 4-4 4M7 8l-4 4 4 4M14 4l-4 16",
    label: "Fusion",
  },
  convert: {
    path: "M4 4v5h5M20 20v-5h-5M4 9a9 9 0 019-5M20 15a9 9 0 01-9 5",
    label: "Conversion",
  },
  add: {
    path: "M12 5v14M5 12h14",
    label: "Ajout",
  },
  optimize: {
    path: "M13 10V3L4 14h7v7l9-11h-7z",
    label: "Optimisation",
  },
};

// ─── Decision styles ────────────────────────────────────────────────

const DECISION_STYLES: Record<RecommendationDecision, { border: string; bg: string; badge?: { bg: string; text: string; label: string } }> = {
  pending: {
    border: "border-[#D1D0CB]/40",
    bg: "bg-white",
  },
  accepted: {
    border: "border-[#7D9B76]/40",
    bg: "bg-[#ECFDF5]/50",
    badge: {
      bg: "bg-[#ECFDF5]",
      text: "text-[#4A7A42]",
      label: "Appliquée",
    },
  },
  rejected: {
    border: "border-[#EF4444]/20",
    bg: "bg-[#FEF2F2]/30",
    badge: {
      bg: "bg-[#FEF2F2]",
      text: "text-[#B91C1C]",
      label: "Ignorée",
    },
  },
};

// ─── Component ──────────────────────────────────────────────────────

export default function RecommendationCard({
  recommendation,
  decision = "pending",
  onAccept,
  onReject,
}: RecommendationCardProps) {
  const { type, room_name, description, estimated_cost, impact, rationale_buyer } = recommendation;
  const iconConfig = TYPE_ICONS[type] || TYPE_ICONS.optimize;
  const decisionStyle = DECISION_STYLES[decision];

  return (
    <article
      className={`p-4 rounded-lg border transition-all duration-200
                  shadow-[0_1px_3px_rgba(28,28,30,0.08),0_1px_2px_rgba(28,28,30,0.04)]
                  ${decisionStyle.border} ${decisionStyle.bg}`}
    >
      {/* Header: icon + room name + decision badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#F5F5F0] flex items-center justify-center text-[#1C1C1E]">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={iconConfig.path} />
            </svg>
          </div>
          <div>
            <span className="text-[11px] font-medium tracking-[0.03em] text-[#9B9A94] uppercase">
              {iconConfig.label}
            </span>
            <h3 className="text-sm font-semibold text-[#1C1C1E] leading-5">
              {room_name}
            </h3>
          </div>
        </div>

        {/* Decision badge */}
        {decisionStyle.badge && (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px]
                        font-medium tracking-[0.03em] leading-[14px]
                        ${decisionStyle.badge.bg} ${decisionStyle.badge.text}`}
          >
            {decisionStyle.badge.label}
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-[#1C1C1E]/80 leading-5 mb-2">
        {description}
      </p>

      {/* Rationale buyer — argument de vente */}
      {rationale_buyer && (
        <p className="text-xs text-[#7D9B76] leading-4 mb-3 flex items-start gap-1.5">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="flex-shrink-0 mt-0.5"
          >
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>
            <span className="font-medium">Argument de vente :</span>{" "}
            {rationale_buyer}
          </span>
        </p>
      )}

      {/* Cost + Impact row */}
      <div className="flex flex-wrap gap-3 mb-3 text-xs text-[#9B9A94]">
        {estimated_cost && (
          <span className="inline-flex items-center gap-1">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
            Coût estimé : {estimated_cost}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
          {impact}
        </span>
      </div>

      {/* Action buttons (only visible when pending) */}
      {decision === "pending" && (
        <div className="flex gap-2">
          <button
            onClick={() => onAccept(recommendation.id)}
            className="flex-1 min-h-[44px] py-2 px-3 rounded-md text-sm font-medium
                       bg-[#7D9B76] text-white hover:bg-[#4A7A42]
                       transition-colors focus-visible:outline-none
                       focus-visible:ring-2 focus-visible:ring-[#7D9B76] focus-visible:ring-offset-2"
          >
            Appliquer au dossier
          </button>
          <button
            onClick={() => onReject(recommendation.id)}
            className="flex-1 min-h-[44px] py-2 px-3 rounded-md text-sm font-medium
                       bg-[#FEF2F2] text-[#B91C1C] hover:bg-[#FEE2E2]
                       transition-colors focus-visible:outline-none
                       focus-visible:ring-2 focus-visible:ring-[#EF4444] focus-visible:ring-offset-2"
          >
            Ignorer
          </button>
        </div>
      )}
    </article>
  );
}
