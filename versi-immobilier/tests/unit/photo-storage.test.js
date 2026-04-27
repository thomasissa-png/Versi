// versi-immobilier/tests/unit/photo-storage.test.js
// -----------------------------------------------------------------------------
// Tests unitaires PhotoStorage — focus Base64DbAdapter (round-trip) + factory.
// Les adapters R2 et Replit OS sont testés en stub (throw not implemented).
//
// Run : node --test tests/unit/photo-storage.test.js
// -----------------------------------------------------------------------------

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  Base64DbAdapter,
  R2Adapter,
  ReplitObjectStorageAdapter,
  getPhotoStorage,
  _resetPhotoStorageCacheForTests,
} from '../../src/lib/photo-storage.js';

// -----------------------------------------------------------------------------
// Mock pool PostgreSQL — capture les query() pour inspection.
// -----------------------------------------------------------------------------
function createMockPool({ insertResult, deleteResult } = {}) {
  const calls = [];
  return {
    calls,
    query: async (sql, params) => {
      calls.push({ sql, params });
      if (sql.startsWith('INSERT INTO property_photos')) {
        return insertResult ?? {
          rows: [{
            id: 42,
            filename: params[2],
            mime_type: params[3],
            size_bytes: params[4],
            sort_order: params[5],
            created_at: new Date('2026-04-27T10:00:00Z'),
          }],
        };
      }
      if (sql.startsWith('DELETE FROM property_photos')) {
        return deleteResult ?? { rows: [{ id: params[0] }], rowCount: 1 };
      }
      return { rows: [] };
    },
  };
}

describe('Base64DbAdapter', () => {
  test('upload() encode buffer en base64 et retourne data URL', async () => {
    const mockPool = createMockPool();
    const adapter = new Base64DbAdapter(mockPool);
    const buffer = Buffer.from('FAKE_JPEG_BYTES', 'utf8');
    const result = await adapter.upload(buffer, {
      propertyId: 'prop-1',
      filename: 'photo.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1234,
      sortOrder: 0,
    });

    assert.equal(mockPool.calls.length, 1);
    assert.match(mockPool.calls[0].sql, /INSERT INTO property_photos/);
    assert.equal(mockPool.calls[0].params[0], 'prop-1');
    assert.equal(mockPool.calls[0].params[1], buffer.toString('base64'));
    assert.equal(result.id, 42);
    assert.equal(result.storageBackend, 'db');
    assert.ok(result.url.startsWith('data:image/jpeg;base64,'));
  });

  test('delete() exécute DELETE FROM property_photos avec id', async () => {
    const mockPool = createMockPool();
    const adapter = new Base64DbAdapter(mockPool);
    await adapter.delete({ id: 42 });
    assert.equal(mockPool.calls.length, 1);
    assert.match(mockPool.calls[0].sql, /DELETE FROM property_photos/);
    assert.equal(mockPool.calls[0].params[0], 42);
  });

  test('getUrl() retourne data URL quand data + mimeType fournis', () => {
    const adapter = new Base64DbAdapter(createMockPool());
    const url = adapter.getUrl({ id: 1, data: 'AAAA', mimeType: 'image/png' });
    assert.equal(url, 'data:image/png;base64,AAAA');
    assert.equal(adapter.getUrl({}), null);
  });
});

describe('Stub adapters R2 / Replit OS', () => {
  test('R2Adapter.upload() throw "not implemented"', async () => {
    const adapter = new R2Adapter();
    await assert.rejects(() => adapter.upload(Buffer.from(''), {}), /not implemented/);
  });

  test('ReplitObjectStorageAdapter.upload() throw "not implemented"', async () => {
    const adapter = new ReplitObjectStorageAdapter();
    await assert.rejects(() => adapter.upload(Buffer.from(''), {}), /not implemented/);
  });
});

describe('Factory getPhotoStorage()', () => {
  beforeEach(() => {
    _resetPhotoStorageCacheForTests();
    delete process.env.PHOTO_STORAGE_BACKEND;
  });

  test('default → Base64DbAdapter', () => {
    const adapter = getPhotoStorage({ forceReload: true });
    assert.ok(adapter instanceof Base64DbAdapter);
    assert.equal(adapter.backend, 'db');
  });

  test('PHOTO_STORAGE_BACKEND=r2 → R2Adapter', () => {
    process.env.PHOTO_STORAGE_BACKEND = 'r2';
    const adapter = getPhotoStorage({ forceReload: true });
    assert.ok(adapter instanceof R2Adapter);
    assert.equal(adapter.backend, 'r2');
  });

  test('PHOTO_STORAGE_BACKEND=replit-os → ReplitObjectStorageAdapter', () => {
    process.env.PHOTO_STORAGE_BACKEND = 'replit-os';
    const adapter = getPhotoStorage({ forceReload: true });
    assert.ok(adapter instanceof ReplitObjectStorageAdapter);
    assert.equal(adapter.backend, 'replit-os');
  });

  test('valeur inconnue → fallback Base64DbAdapter (zéro régression)', () => {
    process.env.PHOTO_STORAGE_BACKEND = 'foobar';
    const adapter = getPhotoStorage({ forceReload: true });
    assert.ok(adapter instanceof Base64DbAdapter);
  });
});
