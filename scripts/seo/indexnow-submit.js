/**
 * IndexNow Bing — Soumission batch pour les 3 sites Versi
 *
 * USAGE (depuis la racine du repo, chez Thomas) :
 *   INDEXNOW_KEY=votre_cle_32_chars node scripts/seo/indexnow-submit.js
 *
 * PRÉ-REQUIS OBLIGATOIRE — fichiers de vérification IndexNow (1 par site) :
 *   src/public/<INDEXNOW_KEY>.txt          → servi sur https://versi.fr/<INDEXNOW_KEY>.txt
 *   versi-immobilier/public/<INDEXNOW_KEY>.txt  → servi sur https://versi-immobilier.fr/<INDEXNOW_KEY>.txt
 *   versi-invest-site/public/<INDEXNOW_KEY>.txt → servi sur https://versi-invest.fr/<INDEXNOW_KEY>.txt
 *
 * Chaque fichier doit contenir UNIQUEMENT la clé (sans retour à la ligne).
 * Créer via : echo -n "$INDEXNOW_KEY" > src/public/$INDEXNOW_KEY.txt
 *
 * Générer une clé : python3 -c "import secrets; print(secrets.token_hex(16))"
 *
 * Dépendances : aucune (fetch natif Node 18+, pas de npm install requis)
 */

"use strict";

const INDEXNOW_ENDPOINT = "https://www.bing.com/indexnow";

const SITES = [
  {
    host: "versi.fr",
    sitemapUrl: "https://versi.fr/sitemap.xml",
  },
  {
    host: "versi-immobilier.fr",
    sitemapUrl: "https://versi-immobilier.fr/sitemap.xml",
  },
  {
    host: "versi-invest.fr",
    sitemapUrl: "https://versi-invest.fr/sitemap.xml",
  },
];

// Extrait les URLs <loc> d'un sitemap XML (regex, sans dep npm)
function extractUrls(xmlText) {
  const matches = [...xmlText.matchAll(/<loc>\s*(https?:\/\/[^<\s]+)\s*<\/loc>/gi)];
  return matches.map((m) => m[1].trim());
}

async function fetchSitemap(sitemapUrl) {
  const res = await fetch(sitemapUrl, {
    headers: { "User-Agent": "Versi-IndexNow-Bot/1.0" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} sur ${sitemapUrl}`);
  }
  return res.text();
}

async function submitToIndexNow(host, key, urls) {
  const keyLocation = `https://${host}/${key}.txt`;
  const body = JSON.stringify({
    host,
    key,
    keyLocation,
    urlList: urls,
  });

  const res = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body,
    signal: AbortSignal.timeout(15000),
  });

  return res.status;
}

async function processSite(site, key) {
  console.log(`\n--- ${site.host} ---`);

  let urls;
  try {
    const xml = await fetchSitemap(site.sitemapUrl);
    urls = extractUrls(xml);
    console.log(`  Sitemap lu : ${urls.length} URL(s) trouvée(s)`);
    if (urls.length === 0) {
      console.warn(`  AVERTISSEMENT : aucune <loc> dans le sitemap — vérifier ${site.sitemapUrl}`);
      return;
    }
  } catch (err) {
    console.error(`  ERREUR fetch sitemap : ${err.message}`);
    console.error(`  Cause probable (env Replit) : DNS sandbox bloque les domaines externes.`);
    console.error(`  Relancer ce script depuis la machine locale de Thomas.`);
    return;
  }

  let status;
  try {
    status = await submitToIndexNow(site.host, key, urls);
  } catch (err) {
    console.error(`  ERREUR soumission IndexNow : ${err.message}`);
    return;
  }

  const statusLabel =
    status === 200 ? "OK (indexé)"
    : status === 202 ? "Accepted (file d'attente Bing)"
    : status === 400 ? "Bad Request — vérifier format JSON / URLs"
    : status === 403 ? "Forbidden — fichier <KEY>.txt inaccessible sur le site"
    : status === 422 ? "Unprocessable — URL(s) hors du domaine déclaré"
    : status === 429 ? "Too Many Requests — quota journalier dépassé"
    : `Statut inattendu`;

  const isSuccess = status === 200 || status === 202;
  const prefix = isSuccess ? "  OK" : "  ECHEC";
  console.log(`${prefix} — ${urls.length} URL(s) soumises — HTTP ${status} ${statusLabel}`);

  if (!isSuccess) {
    console.log(`  Vérifier :`);
    console.log(`    1. Fichier public/${key}.txt déployé et accessible sur https://${site.host}/${key}.txt`);
    console.log(`    2. URLs du sitemap correspondent bien au domaine ${site.host}`);
    console.log(`    3. Quota IndexNow non dépassé (10 000 URL/jour par site)`);
  }
}

async function main() {
  const key = process.env.INDEXNOW_KEY;

  if (!key || key.trim().length < 8) {
    console.error("ERREUR : variable INDEXNOW_KEY manquante ou trop courte.");
    console.error("Usage : INDEXNOW_KEY=votre_cle_32_chars node scripts/seo/indexnow-submit.js");
    console.error("Générer une clé : python3 -c \"import secrets; print(secrets.token_hex(16))\"");
    process.exit(1);
  }

  console.log(`IndexNow Bing — soumission batch Versi`);
  console.log(`Clé : ${key.slice(0, 4)}${"*".repeat(key.length - 4)} (${key.length} chars)`);
  console.log(`Endpoint : ${INDEXNOW_ENDPOINT}`);
  console.log(`Sites : ${SITES.map((s) => s.host).join(", ")}`);

  for (const site of SITES) {
    await processSite(site, key);
  }

  console.log("\nSoumission terminée.");
  console.log("Attendre 24-48h pour que Bing confirme le crawl dans Webmaster Tools.");
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});
