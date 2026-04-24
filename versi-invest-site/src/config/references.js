/**
 * Données de référence — opérations réelles Versi Invest
 *
 * RÈGLES :
 * - Données réelles validées par les fondateurs
 * - Photos dans public/references/[slug]/
 */

export const REFERENCES = [
  {
    id: 1,
    slug: 'nanterre-8-studios',
    ville: 'Nanterre',
    departement: '92',
    type: 'Lot de 8 studios',
    lots: 8,
    rendementBrut: 11.9,
    cashflowNet: 1750,
    montage: 'LMNP en couple',
    annee: 2025,
    prix: '590 000 €',
    travaux: '80 000 € (progressifs)',
    loyersAnnuels: '70 080 €',
    emprunt: '450 000 €',
    description: '8 studios au dernier étage d\'un immeuble à Nanterre. Déjà loués. Rendement brut 11,9%. Acquis en LMNP par un couple d\'investisseurs.',
    detail: {
      intro: 'Lot de 8 studios situés au dernier étage d\'un immeuble à Nanterre (92). Tous les studios étaient déjà loués au moment de l\'acquisition. Opération structurée en LMNP pour un couple d\'investisseurs.',
      travaux: 'Budget travaux de 80 000 € en progressif — les rénovations sont réalisées au fur et à mesure du changement de locataire pour ne pas interrompre les revenus locatifs.',
      duree: 'Acquisition finalisée en 2025.',
      structure: 'LMNP en couple. Emprunt bancaire de 450 000 € sur le prix d\'acquisition de 590 000 €.',
      resultat: 'Loyers annuels de 70 080 € soit un rendement brut de 11,9% sur le prix d\'acquisition. Cashflow net estimé à +1 750 €/mois après crédit, charges, taxe foncière et vacance provisionnée. Les studios étant déjà loués, les revenus locatifs ont démarré immédiatement.',
      chiffres: [
        { label: 'Prix d\'acquisition', value: '590 000 €' },
        { label: 'Travaux (progressifs)', value: '80 000 €' },
        { label: 'Loyers annuels', value: '70 080 €' },
        { label: 'Emprunt bancaire', value: '450 000 €' },
        { label: 'Mensualité crédit', value: '2 280 €/mois' },
        { label: 'Cashflow net estimé', value: '+1 750 €/mois' },
        { label: 'Montage', value: 'LMNP en couple' },
      ],
      photos: Array.from({ length: 7 }, (_, i) =>
        `/references/nanterre-8-studios/photo-${String(i + 1).padStart(2, '0')}.jpeg`
      ),
    },
  },
  {
    id: 2,
    slug: 'lille-arras-immeuble-10-lots',
    ville: 'Lille',
    departement: '59',
    type: 'Immeuble de rapport — 10 lots',
    lots: 10,
    rendementBrut: 13.9,
    cashflowNet: 2228,
    montage: 'SCI à l\'IS',
    annee: 2019,
    prix: '510 000 €',
    travaux: 'Rénovation 4 appartements + transformation discothèque en cabinet médical',
    loyersAnnuels: '79 320 €',
    emprunt: null,
    description: 'Immeuble de rapport 10 lots à Lille (310 m²). Cabinet médical 4 bureaux au RDC + 6 T2 aux étages. 100% loué. Rendement brut 13,9%.',
    detail: {
      intro: 'Immeuble de rapport de 310 m² situé au 46 rue d\'Arras à Lille (59), acquis en octobre 2019. Dix lots répartis sur quatre niveaux : un cabinet médical au rez-de-chaussée (quatre bureaux loués à des médecins généralistes et psychologues) et six appartements T2 sur trois étages. Tous les lots sont loués.',
      travaux: 'Transformation complète du rez-de-chaussée : une ancienne discothèque reconvertie en cabinet médical de quatre bureaux. Rénovation intégrale de quatre appartements sur les six que compte l\'immeuble — deux T2 du troisième étage restent à rénover pour porter les loyers annuels à 82 920 €.',
      duree: 'Acquisition finalisée le 14 octobre 2019. Travaux de rénovation étalés en plusieurs phases pour ne pas interrompre les revenus locatifs.',
      structure: 'Acquisition via SCI à l\'IS. Prix d\'acquisition 510 000 € + frais de notaire 40 639 € + frais d\'agence 20 000 € — montant total investi de 570 639 €.',
      resultat: 'Loyers annuels de 79 320 € charges comprises soit un rendement brut de 13,9% sur le prix d\'acquisition. Cashflow net de +2 228 €/mois après mensualité de crédit, charges, taxe foncière et frais de gestion. Estimation actuelle de l\'immeuble entre 950 000 € et 1 000 000 € en vente en bloc — prix de revente cumulé à la découpe estimé à 925 000 €.',
      chiffres: [
        { label: 'Prix d\'acquisition', value: '510 000 €' },
        { label: 'Frais de notaire', value: '40 639 €' },
        { label: 'Frais d\'agence', value: '20 000 €' },
        { label: 'Loyers annuels (CC)', value: '79 320 €' },
        { label: 'Charges annuelles', value: '52 580 €' },
        { label: 'Cashflow net', value: '+2 228 €/mois' },
        { label: 'Rentabilité brute', value: '13,9 %' },
        { label: 'Montage', value: 'SCI à l\'IS' },
        { label: 'Estimation vente en bloc', value: '950 000 – 1 000 000 €' },
      ],
      photos: Array.from({ length: 10 }, (_, i) =>
        `/references/rue-d-arras/photo-${String(i + 1).padStart(2, '0')}.jpeg`
      ),
    },
  },
];
