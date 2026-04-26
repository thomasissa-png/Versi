// Lille references — Rue de Friedland (2) + Rue du Prieuré (6) = 8 apparts
// Données extraites des PDFs descriptifs 17/04/2026 fournis par le fondateur.
//
// Photos : pré-compilées en local par scripts/generate-photos.js (resize
// sharp + écriture des JPEG dans public/projects/<id>/ + manifest.json).
// La prod LIT le manifest et INSERT URLs en DB — zéro sharp au boot.
// Fix Neon timeout 57P01 (autoSeed prenait > 60s sur Replit).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { upsertProjectPhotosDb } from './photo-sync.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = path.resolve(__dirname, '..', 'public', 'projects', 'manifest.json');

function readManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.warn(`[lille-projects] Manifest absent : ${MANIFEST_PATH} — lance scripts/generate-photos.js en local.`);
    return { projects: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  } catch (err) {
    console.warn(`[lille-projects] Manifest illisible : ${err.message}`);
    return { projects: {} };
  }
}

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
      scanDir: 'rue-de-friedland/2ème Droite',
      apresFiles: [
        { file: 'Séjour après rénovation 2.JPG', sort: 0 },
        { file: 'Cuisine après rénovation - louée.jpeg', sort: 1 },
        { file: 'Chambre après rénovation.JPG', sort: 2 },
        { file: 'Séjour après rénovation.JPG', sort: 3 },
      ],
      avantFiles: [
        { file: 'Séjour avant rénovation.JPG', sort: 0 },
        { file: 'Cuisine avant rénovation.JPG', sort: 1 },
        { file: 'Chambre avant rénovation.JPG', sort: 2 },
      ],
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
      scanDir: 'rue-de-friedland/2ème gauche',
      apresFiles: [
        { file: 'Séjour après travaux 2.jpeg', sort: 0 },
        { file: 'Cuisine après travaux.jpeg', sort: 1 },
        { file: 'Chambre après travaux.jpeg', sort: 2 },
        { file: 'Salle de bain après travaux.jpeg', sort: 3 },
      ],
      avantFiles: [
        { file: 'Séjour avant travaux.jpeg', sort: 0 },
        { file: 'Cuisine pendant travaux.jpeg', sort: 1 },
        { file: 'Chambre pendant travaux 4.jpeg', sort: 2 },
      ],
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
      scanDir: 'rue-du-prieure/RDC Jardin',
      apresFiles: [
        { file: 'Séjour cuisine après travaux.jpeg', sort: 0 },
        { file: 'Séjour après travaux.jpeg', sort: 1 },
        { file: 'Chambre après travaux.jpeg', sort: 2 },
        { file: 'Salle de bain après travaux.jpeg', sort: 3 },
      ],
      avantFiles: [
        { file: 'Séjour - Avant travaux.jpg', sort: 0 },
        { file: 'Salle de bain - Avant travaux.jpg', sort: 1 },
      ],
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
      scanDir: 'rue-du-prieure/Appartements Jardin',
      apresFiles: [
        { file: 'Séjour cuisine - Après travaux - Meublé.jpeg', sort: 0 },
        { file: 'Salle de bain - Après travaux - Meublé.jpeg', sort: 1 },
        { file: 'Salle de bain - Après travaux .jpeg', sort: 2 },
      ],
      avantFiles: [
        { file: 'Séjour - Avant travaux - 7.jpg', sort: 0 },
        { file: 'Séjour - Avant travaux 2.jpeg', sort: 1 },
      ],
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
      scanDir: 'rue-du-prieure/Appartements Rue',
      apresFiles: [
        { file: 'Cuisine - Après travaux.jpeg', sort: 0 },
        { file: 'Chambre - Après travaux.jpeg', sort: 1 },
        { file: 'Entrée - Après travaux.jpeg', sort: 2 },
        { file: 'Salle de bain - Après travaux.jpeg', sort: 3 },
      ],
      avantFiles: [
        { file: 'Chambre - Pendant travaux.jpg', sort: 0 },
        { file: 'Cuisine - Travaux en cours.jpeg', sort: 1 },
      ],
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
      scanDir: 'rue-du-prieure/Appartements Jardin',
      apresFiles: [
        { file: 'Séjour - Après travaux - Meublé.jpeg', sort: 0 },
        { file: 'Chambre - Après travaux - Meublé.jpeg', sort: 1 },
      ],
      avantFiles: [
        { file: 'Séjour - Avant travaux 3.jpeg', sort: 0 },
        { file: 'Séjour - Pendant travaux.jpeg', sort: 1 },
      ],
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
      scanDir: 'rue-du-prieure/Appartements Rue',
      apresFiles: [
        { file: 'Séjour - Après travaux.jpeg', sort: 0 },
        { file: 'Cuisine - Après travaux - 2.jpeg', sort: 1 },
        { file: 'Chambre - Après travaux 2.jpeg', sort: 2 },
        { file: 'Salle de bain après travaux.jpeg', sort: 3 },
      ],
      avantFiles: [
        { file: 'Chambre - Salle de bain - Avant travaux.jpg', sort: 0 },
        { file: 'Séjour - Travaux en cours.jpeg', sort: 1 },
      ],
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
      scanDir: 'rue-du-prieure/3ème étage',
      apresFiles: [
        { file: 'Séjour - Après travaux - Meublé.jpeg', sort: 0 },
        { file: 'Séjour - Après travaux 3.jpeg', sort: 1 },
        { file: 'Chambre - Après travaux.jpeg', sort: 2 },
        { file: 'Cuisine - Après travaux.jpeg', sort: 3 },
        { file: 'Salle de bain - Après travaux.jpeg', sort: 4 },
      ],
      avantFiles: [
        { file: 'Séjour - Avant travaux.jpg', sort: 0 },
        { file: 'Chambre - Avant travaux - 2.jpeg', sort: 1 },
        { file: 'Salle de bain - En travaux.jpeg', sort: 2 },
      ],
    },
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Upsert projet + photos (idempotent — DELETE + INSERT à chaque boot)
// Photos : lecture du manifest pré-compilé. Zéro I/O lourd au boot.
// ────────────────────────────────────────────────────────────────────────────

export async function upsertLilleProject(client, project, manifest) {
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

  const photos = manifest?.projects?.[project.id]?.photos || [];
  await upsertProjectPhotosDb(client, project.id, photos);

  const avantCount = photos.filter((p) => p.category === 'avant').length;
  const apresCount = photos.filter((p) => p.category === 'apres').length;
  console.log(`[lille-projects] "${project.id}" : ${avantCount} avant + ${apresCount} après (URL-only).`);
  return { avantCount, apresCount };
}

export async function upsertLilleProjects(client) {
  const manifest = readManifest();
  let total = 0;
  for (const project of LILLE_PROJECTS) {
    await upsertLilleProject(client, project, manifest);
    total++;
  }
  console.log(`[lille-projects] ${total} projets Lille upsertés (Friedland + Prieuré).`);
}
