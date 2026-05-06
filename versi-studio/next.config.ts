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

  // pdf-to-img casse le bundling Next.js côté serveur s'il est importé
  // statiquement — on le traite comme package externe au runtime (Node.js).
  // Complémentaire du pattern `await import("pdf-to-img")` déjà appliqué.
  // s24 — tesseract.js même problème : Turbopack ne résout pas le worker
  // script, crash uncaughtException "Cannot find module .../worker-script/node/index.js".
  // s27 — pdfjs-dist bundlé par Turbopack throw "Échec parsing PDF" en SSR
  // prod (route `/api/vs/diagnostics/pipeline-new` reproduit le bug en local).
  // Externaliser comme pdf-to-img / tesseract.js résout. Cause root du bug
  // 5102 reporté par Thomas après commit 4d8a519.
  serverExternalPackages: ["pdf-to-img", "tesseract.js", "pdfjs-dist"],

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
