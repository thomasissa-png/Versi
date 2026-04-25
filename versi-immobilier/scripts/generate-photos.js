// generate-photos.js — Précompilation locale des photos projets
//
// Pourquoi : sharp+resize de ~140 photos au boot Replit prenait > 60s,
// Neon coupait la connexion DB idle (FATAL 57P01) et autoSeed crashait.
// Solution : on resize les photos UNE FOIS en local, on commit le résultat
// dans le repo (public/projects/), prod ne fait que lire le manifest.
//
// CLI :
//   cd versi-immobilier && node scripts/generate-photos.js
//
// Aucune DB requise. Lit Photos/references/<dir>/ (workspace racine),
// écrit public/projects/<id>/photo-NN.jpeg + public/projects/manifest.json.
//
// Idempotent : DELETE+REGEN du contenu de public/projects/<id>/ à chaque run.
// Naming : photo-01.jpeg = hero, photo-02..NN = autres "après", avant-01..MM = "avant".

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

import { LILLE_PROJECTS } from './lille-projects.js';
import { NANTERRE_PROJECT, NANTERRE_APRES_FILES } from './seed-project-nanterre.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PHOTOS_ROOT = path.resolve(__dirname, '..', '..', 'Photos', 'references');
const PUBLIC_PROJECTS_DIR = path.resolve(__dirname, '..', 'public', 'projects');

const MAX_WIDTH = 1600;
const JPEG_QUALITY = 85;

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

function sanitizeProjectId(id) {
  if (typeof id !== 'string' || !/^[a-z0-9-]+$/i.test(id)) {
    throw new Error(`[generate-photos] project_id invalide : ${id}`);
  }
  return id;
}

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

function rmDirContentsSync(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    fs.rmSync(full, { recursive: true, force: true });
  }
}

function normalizeExplicitList(list) {
  const items = list.map((entry, idx) => {
    if (typeof entry === 'string') return { file: entry, sort: idx };
    return { file: entry.file, sort: typeof entry.sort === 'number' ? entry.sort : idx };
  });
  items.sort((a, b) => a.sort - b.sort);
  return items.map((it) => it.file);
}

async function resizeAndWrite(srcPath, destPath) {
  const buffer = fs.readFileSync(srcPath);
  const img = sharp(buffer, { failOn: 'none' }).rotate();
  const meta = await img.metadata();
  let pipeline = img;
  if (meta.width && meta.width > MAX_WIDTH) {
    pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
  }
  const out = await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
  fs.writeFileSync(destPath, out);
  return out.length;
}

// Convertit la spec d'un projet (formats Nanterre OU Lille) vers
// {scanDir, heroFilename, apresFilesExplicit?, avantFilesExplicit?}.
function toGenSpec(project) {
  const p = project.photos || {};
  const scanDir = p.scanDir || p.apresDir || p.avantDir;
  return {
    id: project.id,
    scanDir,
    heroFilename: p.hero || p.heroFilename,
    apresFilesExplicit: p.apresFiles,
    avantFilesExplicit: p.avantFiles,
  };
}

async function generateForProject(spec) {
  const safeId = sanitizeProjectId(spec.id);
  const scanDirAbs = resolveDirNFCNFD(spec.scanDir);
  if (!scanDirAbs || !fs.existsSync(scanDirAbs)) {
    console.warn(`[generate-photos] Dossier introuvable pour "${safeId}" : ${spec.scanDir}`);
    return { id: safeId, hero: null, photos: [] };
  }

  const destDir = path.join(PUBLIC_PROJECTS_DIR, safeId);
  rmDirContentsSync(destDir);
  ensureDirSync(destDir);

  let avant = [];
  let apres = [];

  if (Array.isArray(spec.apresFilesExplicit) && spec.apresFilesExplicit.length > 0) {
    apres = normalizeExplicitList(spec.apresFilesExplicit);
    avant = Array.isArray(spec.avantFilesExplicit) ? normalizeExplicitList(spec.avantFilesExplicit) : [];
  } else {
    const files = fs.readdirSync(scanDirAbs).filter(isWebSupportedImage);
    for (const filename of files) {
      const category = detectCategory(filename);
      if (category === 'avant') avant.push(filename);
      else apres.push(filename);
    }
    avant.sort((a, b) => a.localeCompare(b));
    apres.sort((a, b) => a.localeCompare(b));

    if (spec.heroFilename) {
      const heroIdx = apres.findIndex((f) => normalize(f) === normalize(spec.heroFilename));
      if (heroIdx > 0) {
        const [hero] = apres.splice(heroIdx, 1);
        apres.unshift(hero);
      } else if (heroIdx === -1) {
        console.warn(`[generate-photos] Hero introuvable pour "${safeId}" : ${spec.heroFilename}`);
      }
    }
  }

  const photos = [];

  let writtenApres = 0;
  for (const srcFilename of apres) {
    const srcPath = path.join(scanDirAbs, srcFilename);
    if (!fs.existsSync(srcPath)) {
      console.warn(`[generate-photos] Source manquante "${srcFilename}" pour "${safeId}".`);
      continue;
    }
    const seq = String(writtenApres + 1).padStart(2, '0');
    const destFilename = `photo-${seq}.jpeg`;
    const destPath = path.join(destDir, destFilename);
    try {
      const sizeBytes = await resizeAndWrite(srcPath, destPath);
      photos.push({
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
      console.warn(`[generate-photos] Erreur "${srcFilename}" pour "${safeId}" : ${err.message}`);
    }
  }

  let writtenAvant = 0;
  for (const srcFilename of avant) {
    const srcPath = path.join(scanDirAbs, srcFilename);
    if (!fs.existsSync(srcPath)) {
      console.warn(`[generate-photos] Source avant manquante "${srcFilename}" pour "${safeId}".`);
      continue;
    }
    const seq = String(writtenAvant + 1).padStart(2, '0');
    const destFilename = `avant-${seq}.jpeg`;
    const destPath = path.join(destDir, destFilename);
    try {
      const sizeBytes = await resizeAndWrite(srcPath, destPath);
      photos.push({
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
      console.warn(`[generate-photos] Erreur avant "${srcFilename}" pour "${safeId}" : ${err.message}`);
    }
  }

  const hero = photos.find((p) => p.category === 'apres')?.url || photos[0]?.url || null;
  console.log(`[generate-photos] "${safeId}" : ${writtenApres} après + ${writtenAvant} avant → ${path.relative(process.cwd(), destDir)}`);

  return { id: safeId, hero, photos };
}

async function main() {
  ensureDirSync(PUBLIC_PROJECTS_DIR);

  const allSpecs = [
    toGenSpec({ ...NANTERRE_PROJECT, photos: { scanDir: 'nanterre-barbusse', apresFiles: NANTERRE_APRES_FILES } }),
    ...LILLE_PROJECTS.map(toGenSpec),
  ];

  const manifest = {
    generated_at: new Date().toISOString(),
    projects: {},
  };

  let totalPhotos = 0;
  for (const spec of allSpecs) {
    const result = await generateForProject(spec);
    manifest.projects[result.id] = {
      hero: result.hero,
      photos: result.photos,
    };
    totalPhotos += result.photos.length;
  }

  const manifestPath = path.join(PUBLIC_PROJECTS_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`\n[generate-photos] Manifest écrit : ${path.relative(process.cwd(), manifestPath)}`);
  console.log(`[generate-photos] Total : ${totalPhotos} photos sur ${allSpecs.length} projets.`);
}

main().catch((err) => {
  console.error('[generate-photos] Erreur fatale :', err);
  process.exit(1);
});
