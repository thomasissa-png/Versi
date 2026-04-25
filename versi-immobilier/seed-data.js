/**
 * seed-data.js — Centralise les exports de données pour autoSeed().
 * Réexporte les constantes depuis les scripts de seed individuels.
 */

export { MUGUETS_PROPERTIES } from './scripts/seed-properties-muguets.js';
// NANTERRE_PHOTOS supprimé : les photos Nanterre sont désormais sync'ées
// par scripts/photo-sync.js depuis Photos/references/nanterre-barbusse/
// vers public/projects/nanterre-barbusse/. Plus aucun base64 stocké en DB.
export { NANTERRE_PROJECT } from './scripts/seed-project-nanterre.js';
export { BLOG_ARTICLES_A1_A6 } from './scripts/seed-blog-articles.js';
export { BLOG_ARTICLES_A2_A8 } from './scripts/seed-blog-articles-A2-A8.js';
