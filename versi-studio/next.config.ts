import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // s32 — Build standalone pour déploiement Replit autoscale.
  // Génère `.next/standalone/` qui n'inclut QUE les deps réellement utilisées
  // par les routes (pas tout `node_modules`). Réduit drastiquement la taille
  // de l'image (sharp + heic-convert + tesseract.js + pdfjs-dist + openai
  // pèsent plusieurs centaines de Mo en bundle complet → ~50-80 Mo en
  // standalone). Permet au déploiement Replit de réussir là où l'image
  // complète timeout / OOM au boot.
  // Server lance via `node .next/standalone/server.js` (HOST=0.0.0.0 PORT=$PORT).
  // Note : les fichiers statiques (`public/`, `.next/static/`) doivent être
  // copiés à côté du standalone — Next.js documente le pattern.
  output: "standalone",

  // Replit dev preview — autoriser les domaines *.replit.dev / *.repl.co
  // pour que le dev server accepte les requêtes du proxy Replit.
  allowedDevOrigins: ["*.replit.dev", "*.repl.co", "*.picard.replit.dev"],

  // s32 — pdf-to-img casse le bundling Next.js côté serveur s'il est importé
  // statiquement — on le traite comme package externe au runtime (Node.js).
  // Complémentaire du pattern `await import("pdf-to-img")` déjà appliqué.
  // s24 — tesseract.js même problème : Turbopack ne résout pas le worker
  // script, crash uncaughtException "Cannot find module .../worker-script/node/index.js".
  // s27 — pdfjs-dist bundlé par Turbopack throw "Échec parsing PDF" en SSR
  // prod (route `/api/vs/diagnostics/pipeline-new` reproduit le bug en local).
  // Externaliser comme pdf-to-img / tesseract.js résout. Cause root du bug
  // 5102 reporté par Thomas après commit 4d8a519.
  serverExternalPackages: ["pdf-to-img", "tesseract.js", "pdfjs-dist"],

  // s32 hotfix Cloud Run — `serverExternalPackages` dit à Next de ne PAS
  // bundler ces packages (résolution runtime depuis node_modules). MAIS en
  // standalone, Next copie SEULEMENT les modules tracés. Les workers chargés
  // dynamiquement (pdf.worker.mjs via import.meta.url, tesseract worker-script)
  // ne sont PAS tracés → MODULE_NOT_FOUND en prod.
  // Fix : forcer l'inclusion explicite de leurs fichiers dans le standalone.
  // Reproduit en prod Replit après upload PDF avec :
  //   "Setting up fake worker failed: Cannot find module
  //   '.../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'"
  outputFileTracingIncludes: {
    "*": [
      // pdfjs-dist : worker chargé via import.meta.url + assets statiques
      "node_modules/pdfjs-dist/legacy/build/**/*",
      "node_modules/pdfjs-dist/cmaps/**/*",
      "node_modules/pdfjs-dist/standard_fonts/**/*",
      // pdf-to-img : wrapper qui require pdfjs-dist en runtime
      "node_modules/pdf-to-img/**/*",
      // tesseract.js : worker-script + core WASM (fra.traineddata téléchargé runtime via CDN)
      "node_modules/tesseract.js/**/*",
      "node_modules/tesseract.js-core/**/*",
      // s32 audit Cloud Run — heic-convert chargé via `await import("heic-convert")`
      // dans photo-preprocessor.ts. Le tracer Next.js ne suit pas les imports
      // dynamiques string-literal → MODULE_NOT_FOUND quand iPhone HEIC arrive en prod.
      "node_modules/heic-convert/**/*",
      // libheif-js : dep transitive de heic-convert (WASM bundle libheif décode HEIC).
      // Pas dans le bundle de heic-convert lui-même → à inclure explicitement.
      "node_modules/libheif-js/**/*",
      // exifr : dynamic import dans photo-preprocessor pour lire EXIF orientation.
      "node_modules/exifr/**/*",
      // sharp : prebuilds natifs par OS (libvips bindings). Le tracer copie sharp
      // mais peut rater @img/sharp-libvips-* (libvips C lib partagée). On force
      // l'inclusion de TOUS les @img/* pour couvrir linux-x64 (gnu) et linuxmusl-x64
      // (Alpine/Cloud Run). Sans ça, "Cannot find module @img/sharp-libvips-..."
      // au premier appel sharp().
      "node_modules/@img/**/*",
      "node_modules/sharp/**/*",
    ],
  },

  // s32 — autoriser next/image à optimiser les fichiers servis par notre
  // route `/api/vs/files?path=...` (query string requise par Next.js 16
  // dès qu'on utilise `?`). Sans cette entrée, `Image` lève
  // `next-image-unconfigured-localpatterns` et crash le rendu de la page
  // (galerie wizard preview, miniatures recap, etc.).
  // Cf. https://nextjs.org/docs/messages/next-image-unconfigured-localpatterns
  images: {
    localPatterns: [
      {
        pathname: "/api/vs/files",
        // search omis → autorise n'importe quelle query string (ou aucune).
      },
    ],
  },
};

export default nextConfig;
