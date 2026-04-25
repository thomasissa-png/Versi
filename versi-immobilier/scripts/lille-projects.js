// Lille references — Rue de Friedland (2) + Rue du Prieuré (6) = 8 apparts
// Données extraites des PDFs descriptifs 17/04/2026 fournis par le fondateur.
//
// Photos : déléguées à scripts/photo-sync.js qui copie + resize chaque
// fichier source de Photos/references/<dir>/ vers public/projects/<id>/
// puis stocke uniquement l'URL relative en DB (pattern versi-invest).
// → Payload API divisé par ~100, cache HTTP exploitable, DB allégée.

import { syncProjectPhotos, upsertProjectPhotosDb } from './photo-sync.js';

// ────────────────────────────────────────────────────────────────────────────
// Projects metadata
// ────────────────────────────────────────────────────────────────────────────

export const LILLE_PROJECTS = [
  // ─── FRIEDLAND (2 apparts 2ème étage rénovés, photos dispo) ────────────
  {
    id: 'friedland-2eme-droite',
    title: 'Friedland — 2ème droite, T2 45 m²',
    city: 'Lille',
    type: 'Rénovation complète T2 45 m² dans immeuble de rapport 6 lots',
    surface: '45 m²',
    units: 1,
    status: 'completed',
    buy_price: null,
    works_amount: null,
    sell_price: '135 000 €',
    offer_delay: null,
    signature_delay: null,
    duration: null,
    description: `T2 de 45 m² au deuxième étage du 2 rue de Friedland à Lille. Rénovation complète : chambre, séjour, cuisine, salle de bain, couloir. Immeuble de 280 m² acquis en septembre 2016 par la SCI MMM (IS), six lots au total — kinésithérapeute et restaurant au rez-de-chaussée, quatre appartements aux étages. Trois appartements sur quatre rénovés et loués à ce jour.

Prix de revente estimé à la découpe : 135 000 €. Loyer mensuel charges comprises : 720 €. Rentabilité brute de l'immeuble : 14,4 % (prix d'acquisition 336 000 € + frais de notaire 24 443 €).`,
    featured: false,
    sort_order: 10,
    photos: {
      avantDir: 'rue-de-friedland/2ème Droite',
      apresDir: 'rue-de-friedland/2ème Droite',
      // Les fichiers contiennent "avant" ou "après" dans le nom — auto-détection
      autoDetect: true,
      hero: 'Cuisine après rénovation - louée.jpeg',
    },
  },
  {
    id: 'friedland-2eme-gauche',
    title: 'Friedland — 2ème gauche, T2 35 m²',
    city: 'Lille',
    type: 'Rénovation complète T2 35 m² dans immeuble de rapport 6 lots',
    surface: '35 m²',
    units: 1,
    status: 'completed',
    buy_price: null,
    works_amount: null,
    sell_price: '110 000 €',
    offer_delay: null,
    signature_delay: null,
    duration: null,
    description: `T2 de 35 m² au deuxième étage du 2 rue de Friedland à Lille. Rénovation complète : chambre, séjour, cuisine, salle de bain, entrée. Immeuble de 280 m² acquis en septembre 2016 par la SCI MMM (IS), six lots au total — kinésithérapeute et restaurant au rez-de-chaussée, quatre appartements aux étages.

Prix de revente estimé à la découpe : 110 000 €. Loyer mensuel charges comprises : 690 €. Rentabilité brute de l'immeuble : 14,4 % (prix d'acquisition 336 000 € + frais de notaire 24 443 €).`,
    featured: false,
    sort_order: 11,
    photos: {
      avantDir: 'rue-de-friedland/2ème gauche',
      apresDir: 'rue-de-friedland/2ème gauche',
      autoDetect: true,
      hero: 'Séjour après travaux 2.jpeg',
    },
  },

  // ─── PRIEURÉ (6 apparts avec photos, skip RDC Rue Studio sans après) ───
  {
    id: 'prieure-rdc-jardin',
    title: 'Prieuré — RDC jardin, T1 Bis 27 m²',
    city: 'Lille',
    type: 'Rénovation complète T1 Bis 27 m² avec accès jardin',
    surface: '27 m²',
    units: 1,
    status: 'completed',
    buy_price: null,
    works_amount: null,
    sell_price: '87 000 €',
    offer_delay: null,
    signature_delay: null,
    duration: null,
    description: `T1 Bis de 27 m² au rez-de-chaussée du 23 rue du Prieuré à Lille, avec accès direct au jardin de l'immeuble. Rénovation intégrale : chambre, séjour-cuisine ouvert, salle de bain. Immeuble de 210 m² acquis en octobre 2024 par la SCI MMO (IS), sept appartements rénovés en totalité et loués à ce jour.

Prix de revente estimé à la découpe : 87 000 €. Loyer mensuel charges comprises : 630 €. Revenus locatifs annuels de l'immeuble : 52 440 €.`,
    featured: false,
    sort_order: 20,
    photos: {
      avantDir: 'rue-du-prieure/RDC Jardin',
      apresDir: 'rue-du-prieure/RDC Jardin',
      autoDetect: true,
      hero: 'Séjour cuisine après travaux.jpeg',
    },
  },
  {
    id: 'prieure-1er-jardin',
    title: 'Prieuré — 1er étage jardin, T2 27 m²',
    city: 'Lille',
    type: 'Rénovation complète T2 27 m² côté jardin',
    surface: '27 m²',
    units: 1,
    status: 'completed',
    buy_price: null,
    works_amount: null,
    sell_price: '92 000 €',
    offer_delay: null,
    signature_delay: null,
    duration: null,
    description: `T2 de 27 m² au premier étage du 23 rue du Prieuré à Lille, orienté jardin. Rénovation intégrale : chambre, séjour, cuisine ouverte, salle de bain. Immeuble de 210 m² acquis en octobre 2024 par la SCI MMO (IS), sept lots rénovés en totalité et loués.

Prix de revente estimé à la découpe : 92 000 €. Loyer mensuel charges comprises : 630 €.`,
    featured: false,
    sort_order: 21,
    photos: {
      avantDir: 'rue-du-prieure/Appartements Jardin',
      apresDir: 'rue-du-prieure/Appartements Jardin',
      autoDetect: true,
      hero: 'Séjour cuisine - Après travaux - Meublé.jpeg',
    },
  },
  {
    id: 'prieure-1er-rue',
    title: 'Prieuré — 1er étage rue, T2 27 m²',
    city: 'Lille',
    type: 'Rénovation complète T2 27 m² côté rue',
    surface: '27 m²',
    units: 1,
    status: 'completed',
    buy_price: null,
    works_amount: null,
    sell_price: '89 000 €',
    offer_delay: null,
    signature_delay: null,
    duration: null,
    description: `T2 de 27 m² au premier étage du 23 rue du Prieuré à Lille, orienté rue. Rénovation intégrale : chambre, séjour, cuisine, salle de bain. Immeuble de 210 m² acquis en octobre 2024 par la SCI MMO (IS), sept lots rénovés en totalité et loués.

Prix de revente estimé à la découpe : 89 000 €. Loyer mensuel charges comprises : 630 €.`,
    featured: false,
    sort_order: 22,
    photos: {
      avantDir: 'rue-du-prieure/Appartements Rue',
      apresDir: 'rue-du-prieure/Appartements Rue',
      autoDetect: true,
      hero: 'Cuisine - Après travaux.jpeg',
    },
  },
  {
    id: 'prieure-2eme-jardin',
    title: 'Prieuré — 2ème étage jardin, T2 27 m²',
    city: 'Lille',
    type: 'Rénovation complète T2 27 m² côté jardin',
    surface: '27 m²',
    units: 1,
    status: 'completed',
    buy_price: null,
    works_amount: null,
    sell_price: '92 000 €',
    offer_delay: null,
    signature_delay: null,
    duration: null,
    description: `T2 de 27 m² au deuxième étage du 23 rue du Prieuré à Lille, orienté jardin. Rénovation intégrale : chambre, séjour, cuisine ouverte, salle de bain — même niveau de finition que l'étage inférieur, vue sur le jardin de l'immeuble. Immeuble de 210 m² acquis en octobre 2024 par la SCI MMO (IS), sept lots rénovés en totalité et loués.

Prix de revente estimé à la découpe : 92 000 €. Loyer mensuel charges comprises : 630 €.`,
    featured: false,
    sort_order: 23,
    photos: {
      avantDir: 'rue-du-prieure/Appartements Jardin',
      apresDir: 'rue-du-prieure/Appartements Jardin',
      autoDetect: true,
      hero: 'Séjour cuisine - Après travaux - Meublé.jpeg',
    },
  },
  {
    id: 'prieure-2eme-rue',
    title: 'Prieuré — 2ème étage rue, T2 27 m²',
    city: 'Lille',
    type: 'Rénovation complète T2 27 m² côté rue',
    surface: '27 m²',
    units: 1,
    status: 'completed',
    buy_price: null,
    works_amount: null,
    sell_price: '89 000 €',
    offer_delay: null,
    signature_delay: null,
    duration: null,
    description: `T2 de 27 m² au deuxième étage du 23 rue du Prieuré à Lille, orienté rue. Rénovation intégrale : chambre, séjour, cuisine, salle de bain — même niveau de finition que l'étage inférieur, exposition rue. Immeuble de 210 m² acquis en octobre 2024 par la SCI MMO (IS), sept lots rénovés en totalité et loués.

Prix de revente estimé à la découpe : 89 000 €. Loyer mensuel charges comprises : 630 €.`,
    featured: false,
    sort_order: 24,
    photos: {
      avantDir: 'rue-du-prieure/Appartements Rue',
      apresDir: 'rue-du-prieure/Appartements Rue',
      autoDetect: true,
      hero: 'Cuisine - Après travaux.jpeg',
    },
  },
  {
    id: 'prieure-3eme',
    title: 'Prieuré — 3ème étage, T2 35 m²',
    city: 'Lille',
    type: 'Rénovation complète T2 35 m² — combles aménagés',
    surface: '35 m²',
    units: 1,
    status: 'completed',
    buy_price: null,
    works_amount: null,
    sell_price: '105 000 €',
    offer_delay: null,
    signature_delay: null,
    duration: null,
    description: `T2 de 35 m² au troisième étage du 23 rue du Prieuré à Lille, sous combles aménagés. La surface la plus généreuse de l'immeuble, avec une hauteur sous plafond travaillée et une lumière zénithale. Rénovation intégrale : chambre, séjour, cuisine ouverte, salle de bain. Immeuble de 210 m² acquis en octobre 2024 par la SCI MMO (IS), sept lots rénovés en totalité et loués.

Prix de revente estimé à la découpe : 105 000 €. Loyer mensuel charges comprises : 730 €.`,
    featured: true,
    sort_order: 25,
    photos: {
      avantDir: 'rue-du-prieure/3ème étage',
      apresDir: 'rue-du-prieure/3ème étage',
      autoDetect: true,
      hero: 'Séjour - Après travaux - Meublé.jpeg',
    },
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Upsert projet + photos (idempotent — DELETE + INSERT à chaque boot)
// Photos : déléguées à syncProjectPhotos qui copie+resize les sources
// vers public/projects/<id>/, puis upsertProjectPhotosDb persiste les URLs.
// ────────────────────────────────────────────────────────────────────────────

// Adapte le `spec.photos` du projet vers le format attendu par photo-sync.
// Les projets Lille utilisent {avantDir, apresDir, autoDetect, hero} avec
// avantDir == apresDir (même dossier, classement par mot-clef du nom).
// photo-sync attend {scanDir, heroFilename, autoDetect}.
function toSyncSpec(project) {
  const p = project.photos || {};
  const scanDir = p.scanDir || p.apresDir || p.avantDir;
  return {
    id: project.id,
    photos: {
      scanDir,
      heroFilename: p.hero || p.heroFilename,
    },
  };
}

export async function upsertLilleProject(client, project) {
  await client.query(
    `INSERT INTO projects (
      id, title, city, type, surface, units, status,
      buy_price, works_amount, sell_price, offer_delay, signature_delay,
      duration, description, featured, sort_order
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title, city = EXCLUDED.city, type = EXCLUDED.type,
      surface = EXCLUDED.surface, units = EXCLUDED.units, status = EXCLUDED.status,
      buy_price = EXCLUDED.buy_price, works_amount = EXCLUDED.works_amount,
      sell_price = EXCLUDED.sell_price, offer_delay = EXCLUDED.offer_delay,
      signature_delay = EXCLUDED.signature_delay, duration = EXCLUDED.duration,
      description = EXCLUDED.description, featured = EXCLUDED.featured,
      sort_order = EXCLUDED.sort_order, updated_at = NOW()`,
    [
      project.id, project.title, project.city, project.type, project.surface,
      project.units, project.status, project.buy_price, project.works_amount,
      project.sell_price, project.offer_delay, project.signature_delay,
      project.duration, project.description, project.featured, project.sort_order,
    ]
  );

  // Sync photos sur disque + persist URLs en DB (idempotent).
  const manifest = await syncProjectPhotos(toSyncSpec(project));
  await upsertProjectPhotosDb(client, project.id, manifest);

  const avantCount = manifest.filter((p) => p.category === 'avant').length;
  const apresCount = manifest.filter((p) => p.category === 'apres').length;
  console.log(`[lille-projects] "${project.id}" : ${avantCount} avant + ${apresCount} après (URL-only).`);
  return { avantCount, apresCount };
}

export async function upsertLilleProjects(client) {
  let total = 0;
  for (const project of LILLE_PROJECTS) {
    await upsertLilleProject(client, project);
    total++;
  }
  console.log(`[lille-projects] ${total} projets Lille upsertés (Friedland + Prieuré).`);
}
