/**
 * Données de référence — immeubles placeholder V1
 * Source : vi2-functional-specs.md section 2.5 + vi2-landing-page-copy.md PAGE 5
 *
 * RÈGLES ABSOLUES (décision fondateur) :
 * - JAMAIS de prix d'achat, marge brute/nette, montant travaux
 * - JAMAIS de noms fictifs comme faux témoignages
 * - Descriptions anonymisées uniquement
 */

export const REFERENCES = [
  {
    id: 1,
    ville: 'Lille',
    departement: '59',
    type: 'Immeuble de rapport',
    lots: 4,
    rendementBrut: 8.7,
    cashflowNet: 340,
    montage: 'SCI à l\'IS',
    annee: 2024,
    description:
      'Immeuble 4 lots — Hauts-de-France, 2024. Rénovation intégrale (électricité, plomberie, second oeuvre). Rendement brut 8,7 %. Cashflow net +340 \u20AC/mois. Structure : SCI à l\'IS.',
  },
  {
    id: 2,
    ville: 'Roubaix',
    departement: '59',
    type: 'Maison divisée',
    lots: 3,
    rendementBrut: 9.2,
    cashflowNet: 280,
    montage: 'Nom propre',
    annee: 2023,
    description:
      'Appartement T3 — Métropole lilloise, 2024. Mise aux normes énergétiques, DPE D vers B. Rendement brut 7,9 %. Cashflow net +195 \u20AC/mois. Structure : LMNP au réel.',
  },
  {
    id: 3,
    ville: 'Tourcoing',
    departement: '59',
    type: 'Immeuble mixte',
    lots: 5,
    rendementBrut: 8.1,
    cashflowNet: 420,
    montage: 'SCI à l\'IS',
    annee: 2024,
    description:
      'Appartement T2 — Hauts-de-France, 2023. Bien acheté off-market, travaux légers (rafraîchissement). Rendement brut 9,1 %. Cashflow net +220 \u20AC/mois. Mis en location sous 3 semaines.',
  },
  {
    id: 4,
    ville: 'Lens',
    departement: '62',
    type: 'Immeuble de rapport',
    lots: 6,
    rendementBrut: 10.3,
    cashflowNet: 580,
    montage: 'SCI à l\'IS',
    annee: 2023,
    description:
      'Immeuble 6 lots — Hauts-de-France, 2023. Opération de marchand de biens suivie d\'une revente en lots. Rendement moyen brut 8,4 % sur les lots investisseurs. Volume : 480k \u20AC.',
  },
  {
    id: 5,
    ville: 'Nanterre',
    departement: '92',
    type: 'Immeuble de rapport',
    lots: 3,
    rendementBrut: 7.4,
    cashflowNet: 210,
    montage: 'SCI à l\'IR',
    annee: 2025,
    description:
      'Appartement T4 — Île-de-France, 2024. Bien identifié hors marché, rénovation complète. Rendement brut 6,8 % (marché IDF). Cashflow net +90 \u20AC/mois. Structure : SCI à l\'IS, montage familial.',
  },
];
