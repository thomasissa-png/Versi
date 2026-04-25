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
    cashflowNet: 1301,
    montage: 'LMNP en couple',
    annee: 2025,
    prix: '590 000 €',
    travaux: '80 000 € (progressifs)',
    loyersAnnuels: '70 080 €',
    emprunt: '550 000 € sur 25 ans à 3,1 %',
    description: '8 studios au dernier étage d\'un immeuble à Nanterre. Déjà loués. Rendement brut 11,9%. Acquis en LMNP par un couple d\'investisseurs.',
    detail: {
      intro: 'Lot de 8 studios situés au dernier étage d\'un immeuble à Nanterre (92). Tous les studios étaient déjà loués au moment de l\'acquisition. Opération structurée en LMNP pour un couple d\'investisseurs.',
      travaux: 'Budget travaux de 80 000 € en progressif — les rénovations sont réalisées au fur et à mesure du changement de locataire pour ne pas interrompre les revenus locatifs.',
      duree: 'Acquisition finalisée en 2025.',
      structure: 'LMNP en couple. Apport 120 000 € (couvrant une partie des travaux et les frais de notaire) + emprunt bancaire de 550 000 € sur 25 ans à 3,1 %, mensualité 2 729 €/mois assurance comprise.',
      resultat: 'Loyers annuels de 70 080 € soit un rendement brut de 11,9 % sur le prix d\'acquisition. Cashflow net de +1 301 €/mois après crédit (assurance comprise), charges, taxe foncière et vacance provisionnée. Les studios étant déjà loués, les revenus locatifs ont démarré immédiatement.',
      chiffres: [
        { label: 'Prix d\'acquisition', value: '590 000 €' },
        { label: 'Travaux (progressifs)', value: '80 000 €' },
        { label: 'Loyers annuels', value: '70 080 €' },
        { label: 'Apport', value: '120 000 €' },
        { label: 'Emprunt bancaire', value: '550 000 € sur 25 ans à 3,1 %' },
        { label: 'Mensualité crédit', value: '2 729 €/mois (assurance comprise)' },
        { label: 'Cashflow net', value: '+1 301 €/mois' },
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
    cashflowNet: 2523,
    montage: 'SCI à l\'IS',
    annee: 2024,
    prix: '510 000 €',
    travaux: 'Rénovation 4 appartements + transformation discothèque en cabinet médical',
    loyersAnnuels: '79 320 €',
    emprunt: '520 639 € sur 25 ans à 3,5 %',
    description: 'Immeuble de rapport 10 lots à Lille (310 m²). Cabinet médical 4 bureaux au RDC + 6 T2 aux étages. 100% loué. Rendement brut 13,9%.',
    detail: {
      intro: 'Immeuble de rapport de 310 m² situé au 46 rue d\'Arras à Lille (59), acquis en 2024. Dix lots répartis sur quatre niveaux : un cabinet médical au rez-de-chaussée (quatre bureaux loués à des médecins généralistes et psychologues) et six appartements T2 sur trois étages. Tous les lots sont loués.',
      travaux: 'Transformation complète du rez-de-chaussée : une ancienne discothèque reconvertie en cabinet médical de quatre bureaux. Rénovation intégrale de quatre appartements sur les six que compte l\'immeuble — deux T2 du troisième étage restent à rénover pour porter les loyers annuels à 82 920 €.',
      duree: 'Acquisition finalisée en 2024. Travaux de rénovation étalés en plusieurs phases pour ne pas interrompre les revenus locatifs.',
      structure: 'Acquisition via SCI à l\'IS. Prix d\'acquisition 510 000 € + frais de notaire 40 639 € + frais d\'agence 20 000 € — montant total investi de 570 639 €. Apport 50 000 €, emprunt 520 639 € sur 25 ans à 3,5 %.',
      resultat: 'Loyers annuels de 79 320 € charges comprises soit un rendement brut de 13,9% sur le total investi. Cashflow net de +2 523 €/mois après mensualité de crédit, charges, taxe foncière et frais de gestion.',
      chiffres: [
        { label: 'Prix d\'acquisition', value: '510 000 €' },
        { label: 'Frais de notaire', value: '40 639 €' },
        { label: 'Frais d\'agence', value: '20 000 €' },
        { label: 'Apport', value: '50 000 €' },
        { label: 'Emprunt', value: '520 639 € sur 25 ans à 3,5 %' },
        { label: 'Loyers annuels (CC)', value: '79 320 €' },
        { label: 'Mensualité crédit', value: '2 606 €/mois' },
        { label: 'Charges annuelles', value: '49 046 €' },
        { label: 'Cashflow net', value: '+2 523 €/mois' },
        { label: 'Rentabilité brute', value: '13,9 %' },
        { label: 'Montage', value: 'SCI à l\'IS' },
      ],
      photos: Array.from({ length: 10 }, (_, i) =>
        `/references/rue-d-arras/photo-${String(i + 1).padStart(2, '0')}.jpeg`
      ),
    },
  },
];
