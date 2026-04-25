// photo-sync.js — Migration des photos projets : base64 DB → fichiers statiques disque
//
// Pattern reproduit depuis versi-invest (public/references/<slug>/photo-NN.jpeg).
// Source : Photos/references/<dir>/ (workspace, source de vérité).
// Cible : versi-immobilier/public/projects/<project_id>/photo-NN.jpeg.
//
// Avantages vs base64-en-DB :
// - Cache HTTP (express.static envoie ETag + Cache-Control)
// - Payload API léger (URLs courtes au lieu de ~2 Mo de base64 par photo)
// - DB allégée (~262 Mo → < 5 Mo)
// - Resize on-the-fly via sharp (max 1600px, qualité 85)
//
// Naming standard :
// - photo-01.jpeg = hero (première "après")
// - photo-02..NN.jpeg = autres "après"
// - avant-01..MM.jpeg = photos "avant"
//
// Idempotent : peut être ré-exécuté à chaque boot. Le contenu de
// public/projects/<id>/ est nettoyé puis re-créé pour rester en phase
// avec Photos/references/.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PHOTOS_ROOT = path.resolve(__dirname, '..', '..', 'Photos', 'references');
const PUBLIC_PROJECTS_DIR = path.resolve(__dirname, '..', 'public', 'projects');

const MAX_WIDTH = 1600;
const JPEG_QUALITY = 85;

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

const AVANT_KEYWORDS = ['avant travaux', 'avant rénovation', 'avant renovation', 'pendant travaux', 'en travaux', 'travaux en cours'];
const APRES_KEYWORDS = ['après travaux', 'apres travaux', 'après rénovation', 'apres renovation', 'après', 'apres', 'meublé', 'meuble', 'louée', 'louee'];

function normalize(s) {
  return s.normalize('NFC').toLowerCase();
}

function isWebSupportedImage(filename) {
  const lower = filename.toLowerCase();
  return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png');
}

function detectCategory(filename) {
  const n = normalize(filename);
  if (APRES_KEYWORDS.some((k) => n.includes(k) && !n.includes('avant'))) return 'apres';
  if (AVANT_KEYWORDS.some((k) => n.includes(k))) return 'avant';
  return 'apres';
}

// Sanitize project_id pour éviter path traversal (alphanum + tirets uniquement)
function sanitizeProjectId(id) {
  if (typeof id !== 'string' || !/^[a-z0-9-]+$/i.test(id)) {
    throw new Error(`[photo-sync] project_id invalide (caractères interdits) : ${id}`);
  }
  return id;
}

// Tolérant NFC/NFD pour macOS vs Linux
function resolveDirNFCNFD(relPath) {
  const direct = path.join(PHOTOS_ROOT, relPath);
  if (fs.existsSync(direct)) return direct;
  const parts = relPath.split('/');
  let current = PHOTOS_ROOT;
  for (const segment of parts) {
    const target = normalize(segment);
    if (!fs.existsSync(current)) return null;
    const siblings = fs.readdirSync(current);
    const match = siblings.find((s) => normalize(s) === target);
    if (!match) return null;
    current = path.join(current, match);
  }
  return current;
}

function ensureDirSync(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

// Accepte soit ["filename1", "filename2"] soit [{file:"...", sort: 0}, ...].
// Renvoie ["filename1", ...] dans l'ordre voulu.
function normalizeExplicitList(list) {
  const items = list.map((entry, idx) => {
    if (typeof entry === 'string') return { file: entry, sort: idx };
    return { file: entry.file, sort: typeof entry.sort === 'number' ? entry.sort : idx };
  });
  items.sort((a, b) => a.sort - b.sort);
  return items.map((it) => it.file);
}

function rmDirContentsSync(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    fs.rmSync(full, { recursive: true, force: true });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Pipeline : resize + write d'une photo source
// ────────────────────────────────────────────────────────────────────────────

async function resizeAndWrite(srcPath, destPath) {
  const buffer = fs.readFileSync(srcPath);
  const img = sharp(buffer, { failOn: 'none' }).rotate(); // auto-orient EXIF
  const meta = await img.metadata();
  let pipeline = img;
  if (meta.width && meta.width > MAX_WIDTH) {
    pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
  }
  // Force jpeg en sortie (peu importe le format source)
  const out = await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
  fs.writeFileSync(destPath, out);
  return out.length;
}

// ────────────────────────────────────────────────────────────────────────────
// API publique : syncProjectPhotos(project) → renvoie le manifest [{ url, ... }]
// ────────────────────────────────────────────────────────────────────────────
//
// project doit fournir :
//   - id (string sanitizable)
//   - photos.scanDir (string : chemin relatif sous Photos/references/)
//   - photos.heroFilename (string optionnel : filename du hero attendu)
//   - photos.autoDetect (bool, default true)
//
// Retour : tableau ordonné de manifests
//   [{ url, filename, mime_type, category, sort_order, size_bytes }]
//
// Comportement :
// - DELETE puis re-CREATE le dossier <public>/projects/<id>/ (idempotent)
// - Resize chaque photo > MAX_WIDTH
// - Naming : photo-NN.jpeg (après) + avant-MM.jpeg (avant)

export async function syncProjectPhotos(project) {
  const safeId = sanitizeProjectId(project.id);
  const scanDirRel = project.photos.scanDir;
  const heroFilename = project.photos.heroFilename;
  const apresFilesExplicit = project.photos.apresFiles; // [{ file, sort }] OU [filename, ...]
  const avantFilesExplicit = project.photos.avantFiles;

  const scanDir = resolveDirNFCNFD(scanDirRel);
  if (!scanDir || !fs.existsSync(scanDir)) {
    console.warn(`[photo-sync] Dossier introuvable pour "${safeId}" : ${scanDirRel}`);
    return [];
  }

  const destDir = path.join(PUBLIC_PROJECTS_DIR, safeId);
  rmDirContentsSync(destDir);
  ensureDirSync(destDir);

  let avant = [];
  let apres = [];

  if (Array.isArray(apresFilesExplicit) && apresFilesExplicit.length > 0) {
    // Mode "liste explicite ordonnée" — utilisé pour Nanterre où le fondateur
    // a hand-picked une sélection précise dans un dossier qui contient
    // beaucoup d'autres photos non retenues.
    apres = normalizeExplicitList(apresFilesExplicit);
    avant = Array.isArray(avantFilesExplicit) ? normalizeExplicitList(avantFilesExplicit) : [];
  } else {
    // Mode "auto-detect" — scan complet du dossier, classement par mots-clefs.
    const files = fs.readdirSync(scanDir).filter(isWebSupportedImage);
    for (const filename of files) {
      const category = detectCategory(filename);
      if (category === 'avant') avant.push(filename);
      else apres.push(filename);
    }
    avant.sort((a, b) => a.localeCompare(b));
    apres.sort((a, b) => a.localeCompare(b));

    // Hero : remonte en tête de "après" (uniquement en mode auto-detect ;
    // en mode explicite, l'ordre fourni est la source de vérité).
    if (heroFilename) {
      const heroIdx = apres.findIndex((f) => normalize(f) === normalize(heroFilename));
      if (heroIdx > 0) {
        const [hero] = apres.splice(heroIdx, 1);
        apres.unshift(hero);
      } else if (heroIdx === -1) {
        console.warn(`[photo-sync] Hero introuvable pour "${safeId}" : ${heroFilename}`);
      }
    }
  }

  const manifest = [];

  // "Après" : photo-01..NN.jpeg
  let writtenApres = 0;
  for (let i = 0; i < apres.length; i++) {
    const srcFilename = apres[i];
    const srcPath = path.join(scanDir, srcFilename);
    if (!fs.existsSync(srcPath)) {
      console.warn(`[photo-sync] Source manquante "${srcFilename}" pour "${safeId}", skip.`);
      continue;
    }
    const seq = String(writtenApres + 1).padStart(2, '0');
    const destFilename = `photo-${seq}.jpeg`;
    const destPath = path.join(destDir, destFilename);
    try {
      const sizeBytes = await resizeAndWrite(srcPath, destPath);
      manifest.push({
        url: `/projects/${safeId}/${destFilename}`,
        filename: destFilename,
        original_filename: srcFilename,
        mime_type: 'image/jpeg',
        category: 'apres',
        sort_order: writtenApres,
        size_bytes: sizeBytes,
      });
      writtenApres++;
    } catch (err) {
      console.warn(`[photo-sync] Erreur traitement "${srcFilename}" pour "${safeId}" : ${err.message}`);
    }
  }

  // "Avant" : avant-01..MM.jpeg
  let writtenAvant = 0;
  for (let i = 0; i < avant.length; i++) {
    const srcFilename = avant[i];
    const srcPath = path.join(scanDir, srcFilename);
    if (!fs.existsSync(srcPath)) {
      console.warn(`[photo-sync] Source avant manquante "${srcFilename}" pour "${safeId}", skip.`);
      continue;
    }
    const seq = String(writtenAvant + 1).padStart(2, '0');
    const destFilename = `avant-${seq}.jpeg`;
    const destPath = path.join(destDir, destFilename);
    try {
      const sizeBytes = await resizeAndWrite(srcPath, destPath);
      manifest.push({
        url: `/projects/${safeId}/${destFilename}`,
        filename: destFilename,
        original_filename: srcFilename,
        mime_type: 'image/jpeg',
        category: 'avant',
        sort_order: writtenAvant,
        size_bytes: sizeBytes,
      });
      writtenAvant++;
    } catch (err) {
      console.warn(`[photo-sync] Erreur traitement "${srcFilename}" pour "${safeId}" : ${err.message}`);
    }
  }

  console.log(`[photo-sync] "${safeId}" : ${writtenApres} après + ${writtenAvant} avant écrits dans ${path.relative(process.cwd(), destDir)}`);
  return manifest;
}

// ────────────────────────────────────────────────────────────────────────────
// upsertProjectPhotosDb(client, projectId, manifest)
// → DELETE + INSERT dans project_photos avec colonne url (pas de base64)
// ────────────────────────────────────────────────────────────────────────────

export async function upsertProjectPhotosDb(client, projectId, manifest) {
  const safeId = sanitizeProjectId(projectId);
  await client.query('DELETE FROM project_photos WHERE project_id = $1', [safeId]);
  for (const photo of manifest) {
    await client.query(
      `INSERT INTO project_photos (project_id, url, filename, mime_type, size_bytes, category, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [safeId, photo.url, photo.filename, photo.mime_type, photo.size_bytes, photo.category, photo.sort_order]
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Migration DB : ajout colonne url + relâchement contrainte data NOT NULL
// Idempotent — appelée au boot.
// ────────────────────────────────────────────────────────────────────────────

export async function ensurePhotoSchema(client) {
  await client.query(`ALTER TABLE project_photos ADD COLUMN IF NOT EXISTS url TEXT`);
  // Si data était NOT NULL, le relâcher (ancien schéma)
  await client.query(`
    DO $$ BEGIN
      ALTER TABLE project_photos ALTER COLUMN data DROP NOT NULL;
    EXCEPTION WHEN undefined_column THEN NULL;
    WHEN others THEN NULL;
    END $$;
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_project_photos_project_url ON project_photos(project_id, sort_order)`);
}
