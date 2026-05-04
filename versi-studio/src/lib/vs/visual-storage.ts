/**
 * Versi Studio — Helper de stockage des visuels générés (s30 Vague 2)
 *
 * Centralise la persistance des images base64 produites par OpenAI
 * gpt-image-2 (anchor + secondaires + régénérations). Découplé pour
 * permettre une migration future vers Object Storage Replit / S3 / R2
 * sans toucher au pipeline de génération.
 *
 * Note Replit autoscale : /tmp est éphémère mais suffit V2 (les visuels
 * persistés < 1h le temps de la session Thomas). Migration vers Object
 * Storage = changement local au file_path retourné, le reste du code
 * reste identique.
 */

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const VISUALS_DIR = "/tmp/vs-uploads/visuals";

/**
 * Persiste une image base64 sur le filesystem et retourne le file_path
 * absolu à stocker en BDD (vs_visuals.file_path).
 */
export async function storeVisualImage(base64: string, logicalName: string): Promise<string> {
  await mkdir(VISUALS_DIR, { recursive: true });
  // logicalName sert au log/debug — on ajoute un UUID pour garantir l'unicité
  // même si Thomas régénère la même pièce 10 fois.
  const safeName = logicalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `${randomUUID()}-${safeName}`;
  const filePath = join(VISUALS_DIR, fileName.endsWith(".png") ? fileName : `${fileName}.png`);
  await writeFile(filePath, Buffer.from(base64, "base64"));
  return filePath;
}

/**
 * Charge un visuel persisté en bytes (utilisé par la régénération
 * secondaire qui doit recharger l'ancre depuis le storage).
 * Retourne null si le fichier est absent (cas /tmp purgé Replit).
 */
export async function loadVisualImage(filePath: string): Promise<Buffer | null> {
  try {
    return await readFile(filePath);
  } catch {
    return null;
  }
}
