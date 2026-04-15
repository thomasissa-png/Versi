"use client";

/**
 * ProPaymentGate — Paywall conditionnel pour le pipeline marchand.
 *
 * Vérifie les crédits pro de l'utilisateur via GET /api/pro/credits.
 * - Si crédits > 0 : affiche les children normalement.
 * - Si crédits === 0 : affiche un overlay paywall avec les 3 offres Dossier Pro.
 *
 * Design minimaliste cohérent avec Versimo (#FAFAF8, #1C1C1E, #7D9B76).
 */

import { useState, useEffect, type ReactNode } from "react";

interface ProPaymentGateProps {
  children: ReactNode;
}

interface ProPack {
  id: string;
  name: string;
  credits: number;
  priceCents: number;
  mode: "payment" | "subscription";
}

const PRO_PACKS: ProPack[] = [
  { id: "pro-dossier-1", name: "1 projet", credits: 1, priceCents: 4900, mode: "payment" },
  { id: "pro-dossier-5", name: "5 projets", credits: 5, priceCents: 19900, mode: "payment" },
  { id: "pro-dossier-illimite", name: "Illimité", credits: 999, priceCents: 9900, mode: "subscription" },
];

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function getPackDescription(pack: ProPack): string {
  if (pack.mode === "subscription") return "/mois";
  if (pack.credits === 1) return "par dossier";
  return `soit ${formatPrice(pack.priceCents / pack.credits)}/dossier`;
}

export default function ProPaymentGate({ children }: ProPaymentGateProps) {
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCredits() {
      try {
        const res = await fetch("/api/pro/credits");
        if (res.ok) {
          const data = await res.json();
          setCredits(data.credits);
        } else {
          // On error, assume no credits to show paywall
          setCredits(0);
        }
      } catch {
        setCredits(0);
      } finally {
        setLoading(false);
      }
    }
    fetchCredits();
  }, []);

  async function handleCheckout(packId: string) {
    setCheckoutLoading(packId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erreur lors de la création du paiement.");
        return;
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch {
      alert("Erreur réseau. Réessayez dans quelques instants.");
    } finally {
      setCheckoutLoading(null);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-foreground/20 border-t-sage rounded-full animate-spin" />
      </div>
    );
  }

  // User has credits — render children normally
  if (credits !== null && credits > 0) {
    return <>{children}</>;
  }

  // Paywall overlay
  return (
    <div className="relative">
      {/* Blurred children behind */}
      <div className="blur-sm opacity-30 pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>

      {/* Paywall overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
        <div className="max-w-3xl w-full mx-4 sm:mx-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-foreground tracking-tight mb-2">
              Accédez au Mode Pro
            </h2>
            <p className="text-sm text-muted font-light max-w-md mx-auto">
              Créez des dossiers de home staging complets pour vos biens immobiliers.
              Plans, visuels HD, dossier PDF professionnel.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PRO_PACKS.map((pack) => {
              const isPopular = pack.id === "pro-dossier-5";
              const isLoading = checkoutLoading === pack.id;

              return (
                <div
                  key={pack.id}
                  className={`relative rounded-2xl border p-6 flex flex-col items-center text-center transition-all ${
                    isPopular
                      ? "border-sage bg-sage/5 shadow-sm"
                      : "border-foreground/10 bg-background"
                  }`}
                >
                  {isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sage text-white text-[10px] font-medium px-3 py-1 rounded-full uppercase tracking-wider">
                      Populaire
                    </span>
                  )}

                  <h3 className="text-lg font-semibold text-foreground mt-1 mb-1">
                    {pack.name}
                  </h3>

                  <div className="mb-1">
                    <span className="text-3xl font-bold text-foreground tracking-tight">
                      {formatPrice(pack.priceCents)}
                    </span>
                  </div>

                  <p className="text-xs text-muted font-light mb-5">
                    {getPackDescription(pack)}
                  </p>

                  <button
                    onClick={() => handleCheckout(pack.id)}
                    disabled={isLoading || checkoutLoading !== null}
                    className={`w-full py-2.5 px-4 rounded-full text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isPopular
                        ? "bg-sage text-white hover:bg-sage/90"
                        : "bg-foreground text-background hover:bg-foreground/85"
                    }`}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Redirection…
                      </span>
                    ) : (
                      "Choisir"
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
