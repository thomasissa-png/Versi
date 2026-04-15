/**
 * Page publique de dossier pro — /projet/partage/[token]
 *
 * Rendu : SSR (force-dynamic) — lecture DB sans auth.
 * Accessible par quiconque possède le lien (token UUID).
 * Affiche les lots, pièces avec visuels avant/après, description commerciale.
 * Branding marchand si profil configuré.
 */

import { Metadata } from "next";
import { getProjectByShareToken } from "@/lib/marchand/db";
import { getMerchantProfile } from "@/lib/merchant";

export const dynamic = "force-dynamic";

// ─── Style / Target labels ─────────────────────────────────────────

const STYLE_LABELS: Record<string, string> = {
  scandinavian: "Scandinave",
  contemporary: "Contemporain",
  industrial: "Industriel",
  japandi: "Japandi",
  "art-deco": "Art Déco",
  "mid-century": "Mid-Century",
  bohemian: "Bohème",
  mediterranean: "Méditerranéen",
  cosy: "Cosy Moderne",
  "wabi-sabi": "Wabi-Sabi",
  maximalist: "Maximaliste",
  haussmannian: "Haussmannien",
};

const TARGET_LABELS: Record<string, string> = {
  famille: "Famille",
  couple_sans_enfant: "Couple",
  investisseur_locatif: "Investisseur",
  etudiant: "Étudiant",
  senior: "Senior",
  professionnel_liberal: "Professionnel",
};

const TYPE_LABELS: Record<string, string> = {
  appartement: "Appartement",
  maison: "Maison",
  immeuble: "Immeuble",
  bureaux: "Bureaux",
  local_commercial: "Local commercial",
  loft: "Loft",
  studio: "Studio",
  duplex: "Duplex",
};

interface PageProps {
  params: { token: string };
}

// ─── Metadata ───────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getProjectByShareToken(params.token);

  if (!data) {
    return {
      title: "Dossier introuvable — Versimo",
      description: "Ce lien de partage est invalide ou a expiré.",
    };
  }

  const { project, lots } = data;
  const details: string[] = [];
  if (project.type_bien) details.push(TYPE_LABELS[project.type_bien] || project.type_bien);
  if (project.surface_totale) details.push(`${project.surface_totale} m²`);
  if (project.selling_price) {
    details.push(
      new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(project.selling_price)
    );
  }

  const title = `Dossier — ${project.adresse}`;
  const description = details.length > 0
    ? `${title} — ${details.join(", ")}. Visuels meublés par IA.`
    : `${title} — Visuels meublés par IA.`;

  // Find first visual output for OG image
  let ogImageUrl: string | undefined;
  for (const lot of lots) {
    for (const room of lot.rooms) {
      if (room.visual_output_path) {
        ogImageUrl = `https://versimo.fr/api/logs/image?path=${encodeURIComponent(room.visual_output_path)}`;
        break;
      }
    }
    if (ogImageUrl) break;
  }

  return {
    title: `${title} — Versimo`,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Versimo",
      ...(ogImageUrl ? { images: [{ url: ogImageUrl, width: 1200, height: 630, alt: `Visuel meublé — ${project.adresse}` }] } : {}),
    },
  };
}

// ─── Helper: format price ───────────────────────────────────────────

function formatPrice(price: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price);
}

// ─── Server Component ───────────────────────────────────────────────

export default async function ProPublicDossierPage({ params }: PageProps) {
  const data = await getProjectByShareToken(params.token);

  // Token invalid or project not found
  if (!data) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center px-5">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-semibold text-[#1C1C1E] mb-3">
            Dossier introuvable
          </h1>
          <p className="text-sm text-[#9B9A94] font-light">
            Ce lien de partage est invalide ou le dossier a été supprimé.
          </p>
        </div>
      </div>
    );
  }

  const { project, lots } = data;

  // Load merchant profile for branding
  const profile = await getMerchantProfile(project.user_id);
  const hasMerchant = profile?.is_merchant === true;
  const brandName = hasMerchant && profile?.raison_sociale
    ? profile.raison_sociale
    : "Versimo";

  // Compute totals
  const totalRooms = lots.reduce((acc, lot) => acc + lot.rooms.length, 0);
  const roomsWithVisuals = lots.reduce(
    (acc, lot) => acc + lot.rooms.filter((r) => r.visual_output_path).length,
    0
  );

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <header className="border-b border-[#1C1C1E]/5 bg-[#FAFAF8]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-3 sm:py-4 flex items-center justify-between">
          <span className="text-xl font-semibold text-[#1C1C1E] tracking-tighter">
            {brandName}
          </span>
          <span className="text-xs text-[#9B9A94] font-light">
            Dossier de pré-commercialisation
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-5 sm:px-8 py-8 sm:py-12">
        {/* Title section */}
        <div className="mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#1C1C1E] tracking-tight mb-3">
            {project.adresse}
          </h1>

          {/* Property details */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#9B9A94] font-light">
            {project.type_bien && (
              <span>{TYPE_LABELS[project.type_bien] || project.type_bien}</span>
            )}
            {project.surface_totale && (
              <span>{project.surface_totale} m²</span>
            )}
            <span>
              {lots.length} lot{lots.length > 1 ? "s" : ""} — {totalRooms} pièce{totalRooms > 1 ? "s" : ""}
            </span>
            {roomsWithVisuals > 0 && (
              <span>{roomsWithVisuals} visuel{roomsWithVisuals > 1 ? "s" : ""}</span>
            )}
            {project.selling_price && (
              <span
                className="text-xs text-white px-3 py-1.5 rounded-xl font-medium bg-[#1C1C1E]"
              >
                {formatPrice(project.selling_price)}
              </span>
            )}
          </div>

          <p className="text-xs text-[#9B9A94]/50 mt-3">
            Généré le {new Date(project.created_at).toLocaleDateString("fr-FR")}
          </p>
        </div>

        {/* Lots */}
        <div className="space-y-8">
          {lots.map((lot) => {
            const doneRooms = lot.rooms.filter((r) => r.visual_output_path);

            return (
              <section
                key={lot.id}
                className="rounded-lg bg-white border border-[#D1D0CB]/40 overflow-hidden
                           shadow-[0_1px_3px_rgba(28,28,30,0.08),0_1px_2px_rgba(28,28,30,0.04)]"
              >
                {/* Lot header */}
                <div className="px-4 py-3 bg-[#F5F5F0] border-b border-[#D1D0CB]/40">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-[#1C1C1E]">
                      {lot.name}
                    </h2>
                    <div className="flex gap-2">
                      {lot.style_id && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px]
                                        font-medium tracking-[0.03em] bg-[#F5F5F0] text-[#9B9A94] border border-[#D1D0CB]/40">
                          {STYLE_LABELS[lot.style_id] || lot.style_id}
                        </span>
                      )}
                      {lot.target_buyer && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px]
                                        font-medium tracking-[0.03em] bg-[#ECFDF5] text-[#4A7A42]">
                          {TARGET_LABELS[lot.target_buyer] || lot.target_buyer}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-[#9B9A94]">
                    {doneRooms.length} visuel{doneRooms.length > 1 ? "s" : ""} / {lot.rooms.length} pièce{lot.rooms.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="p-4 space-y-4">
                  {/* Visual grid — before/after per room */}
                  {doneRooms.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {doneRooms.map((room) => (
                        <div key={room.id} className="space-y-1">
                          <h3 className="text-sm font-medium text-[#1C1C1E]">
                            {room.name}
                          </h3>
                          <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
                            {/* Before */}
                            <div className="relative aspect-[4/3] bg-[#F5F5F0]">
                              {room.photo_path ? (
                                <img
                                  src={`/api/logs/image?path=${encodeURIComponent(room.photo_path)}`}
                                  alt={`${room.name} — avant`}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[#D1D0CB]">
                                  <span className="text-xs">Avant</span>
                                </div>
                              )}
                              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[10px]
                                              font-medium bg-black/50 text-white">
                                Avant
                              </span>
                            </div>
                            {/* After */}
                            <div className="relative aspect-[4/3] bg-[#F5F5F0]">
                              {room.visual_output_path ? (
                                <img
                                  src={`/api/logs/image?path=${encodeURIComponent(room.visual_output_path)}`}
                                  alt={`${room.name} — après`}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[#D1D0CB]">
                                  <span className="text-xs">Après</span>
                                </div>
                              )}
                              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[10px]
                                              font-medium bg-[#7D9B76] text-white">
                                Après
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Commercial description */}
                  {lot.commercial_description && (
                    <div className="border-t border-[#D1D0CB]/40 pt-4">
                      <h3 className="text-sm font-medium text-[#1C1C1E] mb-2">
                        Description commerciale
                      </h3>
                      <p className="text-sm text-[#1C1C1E]/80 leading-relaxed">
                        {lot.commercial_description}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-[#1C1C1E]/5 text-center space-y-2 pb-8">
          {hasMerchant && (profile?.raison_sociale || profile?.telephone || profile?.email_pro) && (
            <p className="text-xs text-[#9B9A94] font-light">
              {[profile?.raison_sociale, profile?.telephone, profile?.email_pro].filter(Boolean).join(" — ")}
            </p>
          )}
          <p className="text-sm text-[#9B9A94]/60 font-light">
            Visuels d&apos;aménagement générés par intelligence artificielle — le bien est livré brut. Ces images sont à titre indicatif et ne sont pas contractuelles.
          </p>
          <p className="text-xs text-[#9B9A94]/40 font-light mt-1">
            <a
              href="https://versimo.fr/"
              className="hover:text-[#9B9A94]/60 transition-colors underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Versimo
            </a>
            {" "}&mdash; &copy; {new Date().getFullYear()}
          </p>
        </div>
      </main>
    </div>
  );
}
