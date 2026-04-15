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
];
