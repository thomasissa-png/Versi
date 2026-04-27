// versi-immobilier/src/lib/photo-storage.js
// -----------------------------------------------------------------------------
// PhotoStorage — abstraction du stockage des photos de biens.
//
// Permet de basculer entre 3 backends sans toucher aux routes server.js :
//   - "db"        → Base64DbAdapter (status quo, écrit dans property_photos.data)
//   - "r2"        → R2Adapter (Cloudflare R2, stub — à implémenter post-arbitrage)
//   - "replit-os" → ReplitObjectStorageAdapter (stub — fallback stratégie A)
//
// Choix runtime via env var PHOTO_STORAGE_BACKEND (default: "db").
// Référence décisionnelle : docs/infra/property-photos-storage-options.md
// -----------------------------------------------------------------------------

// Import lazy du pool pg : permet de tester l'adapter avec un mock sans charger
// `pg` (utile en CI/sandbox sans node_modules installés).
let _defaultPool = null;
async function getDefaultPool() {
  if (_defaultPool) return _defaultPool;
  const mod = await import('../../db.js');
  _defaultPool = mod.default;
  return _defaultPool;
}

// -----------------------------------------------------------------------------
// Contrat PhotoStorage (interface implicite — JS pas de TS ici)
//   upload(buffer: Buffer, metadata: { propertyId, filename, mimeType, sizeBytes, sortOrder })
//     → Promise<{ id, url, key, storageBackend }>
//   delete(key: { id, storageKey })
//     → Promise<void>
//   getUrl(key: { id, storageKey, data?, mimeType? })
//     → string  (data URL pour db, URL publique pour r2/replit-os)
// -----------------------------------------------------------------------------

/**
 * Base64DbAdapter — wrapper sur le schéma actuel property_photos.data TEXT.
 * 100% rétro-compatible avec le code existant. Utilisé par défaut.
 */
export class Base64DbAdapter {
  constructor(dbPool = null) {
    this.pool = dbPool; // si null, résolu lazy via getDefaultPool() au 1er upload()
    this.backend = 'db';
  }

  async _pool() {
    if (this.pool) return this.pool;
    this.pool = await getDefaultPool();
    return this.pool;
  }

  async upload(buffer, metadata) {
    const { propertyId, filename, mimeType, sizeBytes, sortOrder } = metadata;
    const data = Buffer.isBuffer(buffer) ? buffer.toString('base64') : String(buffer);
    const pool = await this._pool();
    const result = await pool.query(
      'INSERT INTO property_photos (property_id, data, filename, mime_type, size_bytes, sort_order) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, filename, mime_type, size_bytes, sort_order, created_at',
      [propertyId, data, filename, mimeType, sizeBytes ?? null, sortOrder ?? 0]
    );
    const row = result.rows[0];
    return {
      id: row.id,
      url: `data:${mimeType};base64,${data}`,
      key: null,
      storageBackend: 'db',
      row,
    };
  }

  async delete(key) {
    const id = typeof key === 'object' ? key.id : key;
    const pool = await this._pool();
    await pool.query('DELETE FROM property_photos WHERE id = $1', [id]);
  }

  getUrl(key) {
    if (key && key.data && key.mimeType) {
      return `data:${key.mimeType};base64,${key.data}`;
    }
    return null;
  }
}

/**
 * R2Adapter — stub Cloudflare R2 (stratégie B recommandée).
 * À implémenter post-arbitrage Thomas (~30 lignes : install @aws-sdk/client-s3,
 * remplir upload() avec PutObjectCommand, remplir delete() avec DeleteObjectCommand).
 */
export class R2Adapter {
  constructor() {
    this.backend = 'r2';
    this.accessKeyId = process.env.R2_ACCESS_KEY_ID;
    this.secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.bucket = process.env.R2_BUCKET;
    this.publicUrl = process.env.R2_PUBLIC_URL;
    this.endpoint = process.env.R2_ENDPOINT;
  }

  async upload(_buffer, _metadata) {
    // TODO: implement when R2 secrets provided (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL).
    // Pseudo-code :
    //   const key = `properties/${propertyId}/${randomUUID()}-${filename}`;
    //   await s3.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: buffer, ContentType: mimeType }));
    //   const publicUrl = `${this.publicUrl}/${key}`;
    //   INSERT INTO property_photos (property_id, url, storage_backend, ...) VALUES (...);
    throw new Error('R2Adapter.upload() not implemented — fournir secrets R2_* puis implémenter (cf. docs/infra/property-photos-storage-options.md §Plan implémentation Étape 2).');
  }

  async delete(_key) {
    // TODO: implement DeleteObjectCommand R2 + DELETE row property_photos.
    throw new Error('R2Adapter.delete() not implemented.');
  }

  getUrl(key) {
    if (key && key.storageKey && this.publicUrl) {
      return `${this.publicUrl}/${key.storageKey}`;
    }
    return null;
  }
}

/**
 * ReplitObjectStorageAdapter — stub Replit Object Storage natif (stratégie A fallback).
 * À implémenter si Thomas refuse Cloudflare (~30 lignes : @replit/object-storage,
 * client.uploadFromBytes / downloadAsBytes / delete).
 */
export class ReplitObjectStorageAdapter {
  constructor() {
    this.backend = 'replit-os';
    this.bucketId = process.env.REPLIT_OBJECT_STORAGE_BUCKET_ID;
  }

  async upload(_buffer, _metadata) {
    // TODO: implement when REPLIT_OBJECT_STORAGE_BUCKET_ID provided.
    // Pseudo-code :
    //   import { Client } from '@replit/object-storage';
    //   const client = new Client({ bucketId: this.bucketId });
    //   const key = `properties/${propertyId}/${randomUUID()}-${filename}`;
    //   await client.uploadFromBytes(key, buffer);
    //   const publicUrl = client.getPublicUrl(key); // ou signed URL si privé
    //   INSERT INTO property_photos (property_id, url, storage_backend, ...) VALUES (...);
    throw new Error('ReplitObjectStorageAdapter.upload() not implemented — activer bucket Replit Object Storage puis implémenter.');
  }

  async delete(_key) {
    // TODO: implement client.delete(key) + DELETE row.
    throw new Error('ReplitObjectStorageAdapter.delete() not implemented.');
  }

  getUrl(key) {
    if (key && key.storageKey && key.url) {
      return key.url;
    }
    return null;
  }
}

// -----------------------------------------------------------------------------
// Factory : lit PHOTO_STORAGE_BACKEND env var et retourne l'adapter approprié.
// Default = "db" (status quo, zéro régression).
// -----------------------------------------------------------------------------

let _cachedAdapter = null;

export function getPhotoStorage({ forceReload = false } = {}) {
  if (_cachedAdapter && !forceReload) return _cachedAdapter;

  const backend = (process.env.PHOTO_STORAGE_BACKEND || 'db').toLowerCase();
  switch (backend) {
    case 'r2':
      _cachedAdapter = new R2Adapter();
      break;
    case 'replit-os':
    case 'replit':
      _cachedAdapter = new ReplitObjectStorageAdapter();
      break;
    case 'db':
    default:
      _cachedAdapter = new Base64DbAdapter();
      break;
  }
  return _cachedAdapter;
}

// Helper test-only : reset du cache pour pouvoir changer de backend en tests.
export function _resetPhotoStorageCacheForTests() {
  _cachedAdapter = null;
}
