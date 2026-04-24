// Lille references — Rue de Friedland (2) + Rue du Prieuré (6) = 8 apparts
// Données extraites des PDFs descriptifs 17/04/2026 fournis par le fondateur.
// Photos lues depuis Photos/references/rue-de-friedland/ et rue-du-prieure/
// Pattern identique à Nanterre (server.js L1820-1920) : PROJECT + AVANT_FILES
// + APRES_FILES + loadPhotos() + upsertProject() idempotent via ON CONFLICT.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PHOTOS_ROOT = path.resolve(__dirname, '..', '..', 'Photos', 'references');

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

Prix de revente estimé à la découpe : 135 000 €. Loyer mensuel charges comprises : 720 €. Rentabilité brute de l'immeuble : 14,4 % sur le prix d'acquisition de 336 000 €.`,
    featured: false,
    sort_order: 10,
    photos: {
      avantDir: 'rue-de-friedland/2ème Droite',
      apresDir: 'rue-de-friedland/2ème Droite',
      // Les fichiers contiennent "avant" ou "après" dans le nom — auto-détection
      autoDetect: true,
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

Prix de revente estimé à la découpe : 110 000 €. Loyer mensuel charges comprises : 690 €. Rentabilité brute de l'immeuble : 14,4 % sur le prix d'acquisition de 336 000 €.`,
    featured: false,
    sort_order: 11,
    photos: {
      avantDir: 'rue-de-friedland/2ème gauche',
      apresDir: 'rue-de-friedland/2ème gauche',
      autoDetect: true,
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
    description: `T2 de 27 m² au premier étage du 23 rue du Prieuré à Lille, orienté rue. Rénovation intégrale : chambre, séjour, cuisine, salle de bain. Immeuble de sept lots acquis en octobre 2024 via SCI à l'IS.

Prix de revente estimé à la découpe : 89 000 €. Loyer mensuel charges comprises : 630 €.`,
    featured: false,
    sort_order: 22,
    photos: {
      avantDir: 'rue-du-prieure/Appartements Rue',
      apresDir: 'rue-du-prieure/Appartements Rue',
      autoDetect: true,
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
    description: `T2 de 27 m² au deuxième étage du 23 rue du Prieuré à Lille, orienté jardin. Rénovation intégrale identique au 1er étage jardin. Immeuble acquis en octobre 2024 via SCI à l'IS.

Prix de revente estimé à la découpe : 92 000 €. Loyer mensuel charges comprises : 630 €.`,
    featured: false,
    sort_order: 23,
    photos: {
      avantDir: 'rue-du-prieure/Appartements Jardin',
      apresDir: 'rue-du-prieure/Appartements Jardin',
      autoDetect: true,
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
    description: `T2 de 27 m² au deuxième étage du 23 rue du Prieuré à Lille, orienté rue. Rénovation intégrale identique au 1er étage rue. Immeuble acquis en octobre 2024 via SCI à l'IS.

Prix de revente estimé à la découpe : 89 000 €. Loyer mensuel charges comprises : 630 €.`,
    featured: false,
    sort_order: 24,
    photos: {
      avantDir: 'rue-du-prieure/Appartements Rue',
      apresDir: 'rue-du-prieure/Appartements Rue',
      autoDetect: true,
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
    description: `T2 de 35 m² au troisième étage du 23 rue du Prieuré à Lille, sous combles aménagés. Surface habitable la plus généreuse de l'immeuble. Rénovation intégrale : chambre, séjour, cuisine ouverte, salle de bain. Immeuble acquis en octobre 2024 via SCI à l'IS.

Prix de revente estimé à la découpe : 105 000 €. Loyer mensuel charges comprises : 730 €.`,
    featured: true,
    sort_order: 25,
    photos: {
      avantDir: 'rue-du-prieure/3ème étage',
      apresDir: 'rue-du-prieure/3ème étage',
      autoDetect: true,
    },
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Photos loading — scan disque, détection avant/après par nom de fichier
// ────────────────────────────────────────────────────────────────────────────

const AVANT_KEYWORDS = ['avant travaux', 'avant rénovation', 'avant renovation', 'pendant travaux', 'en travaux', 'travaux en cours'];
const APRES_KEYWORDS = ['après travaux', 'apres travaux', 'après rénovation', 'apres renovation', 'après', 'apres', 'meublé', 'meuble', 'louée', 'louee'];

// On normalise pour échapper aux NFC/NFD + accents + casse
function normalize(s) {
  return s.normalize('NFC').toLowerCase();
}

// Les fichiers .heic / .HEIC ne sont pas supportés nativement par les
// navigateurs — on les skippe (à convertir en JPEG plus tard si besoin).
function isWebSupportedImage(filename) {
  const lower = filename.toLowerCase();
  return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png');
}

function detectCategory(filename) {
  const n = normalize(filename);
  // Priorité "après" : un fichier "Chambre - Avant / Après travaux" est "après"
  if (APRES_KEYWORDS.some((k) => n.includes(k) && !n.includes('avant'))) return 'apres';
  if (AVANT_KEYWORDS.some((k) => n.includes(k))) return 'avant';
  // Fallback : pas de mot clef → considérer "après" (photo finale/meublée par défaut)
  return 'apres';
}

// Résout un chemin logique relatif en vrai chemin disque, tolérant NFC/NFD.
// Les macOS encodent les noms avec accents en NFD, Linux/repo en NFC → match.
function resolveDirNFCNFD(relPath) {
  const direct = path.join(PHOTOS_ROOT, relPath);
  if (fs.existsSync(direct)) return direct;
  // Fallback : scan parent + match normalisé
  const parts = relPath.split('/');
  let current = PHOTOS_ROOT;
  for (const segment of parts) {
    const target = normalize(segment);
    const siblings = fs.readdirSync(current);
    const match = siblings.find((s) => normalize(s) === target);
    if (!match) return null;
    current = path.join(current, match);
  }
  return current;
}

export function loadProjectPhotos(project) {
  const { avantDir, apresDir, autoDetect } = project.photos;

  if (!autoDetect) {
    // Fallback : modes manuels possibles plus tard (ex: files explicit list)
    return [];
  }

  // avantDir et apresDir pointent souvent vers le même dossier avec mots-clés mélangés
  const scanDir = resolveDirNFCNFD(avantDir);
  if (!scanDir || !fs.existsSync(scanDir)) {
    console.warn(`[lille-projects] Dossier introuvable : ${avantDir}`);
    return [];
  }

  const files = fs.readdirSync(scanDir).filter(isWebSupportedImage);
  const avant = [];
  const apres = [];

  for (const filename of files) {
    const filePath = path.join(scanDir, filename);
    const buffer = fs.readFileSync(filePath);
    const mimeType = filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    const photo = {
      data: `data:${mimeType};base64,${buffer.toString('base64')}`,
      filename,
      mime_type: mimeType,
      size_bytes: buffer.length,
    };
    const category = detectCategory(filename);
    if (category === 'avant') avant.push(photo);
    else apres.push(photo);
  }

  // Tri alphabétique pour un sort_order stable
  avant.sort((a, b) => a.filename.localeCompare(b.filename));
  apres.sort((a, b) => a.filename.localeCompare(b.filename));

  const photos = [];
  avant.forEach((p, i) => photos.push({ ...p, category: 'avant', sort_order: i }));
  apres.forEach((p, i) => photos.push({ ...p, category: 'apres', sort_order: i }));
  return photos;
}

// ────────────────────────────────────────────────────────────────────────────
// Upsert projet + photos (idempotent, pattern Nanterre)
// ────────────────────────────────────────────────────────────────────────────

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

  // Photos : DELETE + re-INSERT (idempotent, rejoue la sélection disque à chaque boot)
  await client.query('DELETE FROM project_photos WHERE project_id = $1', [project.id]);

  const photos = loadProjectPhotos(project);
  for (const photo of photos) {
    await client.query(
      `INSERT INTO project_photos (project_id, data, filename, mime_type, size_bytes, category, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [project.id, photo.data, photo.filename, photo.mime_type, photo.size_bytes, photo.category, photo.sort_order]
    );
  }

  const avantCount = photos.filter((p) => p.category === 'avant').length;
  const apresCount = photos.filter((p) => p.category === 'apres').length;
  console.log(`[lille-projects] "${project.id}" : ${avantCount} avant + ${apresCount} après.`);
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
