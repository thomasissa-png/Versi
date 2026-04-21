import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Replit dev preview — autoriser les domaines *.replit.dev / *.repl.co
  // pour que le dev server accepte les requêtes du proxy Replit.
  allowedDevOrigins: ["*.replit.dev", "*.repl.co", "*.picard.replit.dev"],

  // pdf-to-img casse le bundling Next.js côté serveur s'il est importé
  // statiquement — on le traite comme package externe au runtime (Node.js).
  // Complémentaire du pattern `await import("pdf-to-img")` déjà appliqué.
  // s24 — tesseract.js même problème : Turbopack ne résout pas le worker
  // script, crash uncaughtException "Cannot find module .../worker-script/node/index.js".
  serverExternalPackages: ["pdf-to-img", "tesseract.js"],
};

export default nextConfig;
