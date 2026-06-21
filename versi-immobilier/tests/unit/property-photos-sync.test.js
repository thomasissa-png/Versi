// versi-immobilier/tests/unit/property-photos-sync.test.js
// -----------------------------------------------------------------------------
// Tests unitaires upsertPropertyPhotosDb + ensurePropertyPhotoSchema.
// Pattern URL-only (calqué sur project_photos) : DELETE + INSERT idempotent
// au boot depuis public/properties/manifest.json. Pas de base64.
//
// Run : node --test tests/unit/property-photos-sync.test.js
// -----------------------------------------------------------------------------

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  upsertPropertyPhotosDb,
  ensurePropertyPhotoSchema,
} from '../../scripts/photo-sync.js';

// Mock client PG — capture les query() pour inspection.
function createMockClient() {
  const calls = [];
  return {
    calls,
    query: async (sql, params) => {
      calls.push({ sql, params });
      return { rows: [], rowCount: 0 };
    },
  };
}

describe('upsertPropertyPhotosDb', () => {
  test('DELETE puis INSERT pour chaque photo avec url + alt', async () => {
    const client = createMockClient();
    await upsertPropertyPhotosDb(client, 'muguets-lot-1-rdc', [
      {
        url: '/properties/muguets-lot-1-rdc/photo-01.jpeg',
        alt: 'Séjour-cuisine',
        filename: 'photo-01.jpeg',
        mime_type: 'image/jpeg',
        size_bytes: 200_000,
        sort_order: 0,
      },
      {
        url: '/properties/muguets-lot-1-rdc/avant-01.jpeg',
        alt: 'Avant - bureaux',
        filename: 'avant-01.jpeg',
        mime_type: 'image/jpeg',
        size_bytes: 11_000,
        sort_order: 5,
      },
    ]);

    assert.equal(client.calls.length, 3, '1 DELETE + 2 INSERT');
    assert.match(client.calls[0].sql, /^DELETE FROM property_photos/);
    assert.equal(client.calls[0].params[0], 'muguets-lot-1-rdc');

    for (let i = 1; i <= 2; i += 1) {
      assert.match(client.calls[i].sql, /INSERT INTO property_photos/);
      assert.match(client.calls[i].sql, /url, alt, filename, mime_type, size_bytes, sort_order/);
    }
    assert.equal(client.calls[1].params[1], '/properties/muguets-lot-1-rdc/photo-01.jpeg');
    assert.equal(client.calls[1].params[2], 'Séjour-cuisine');
  });

  test('alt optionnel — null inséré si absent', async () => {
    const client = createMockClient();
    await upsertPropertyPhotosDb(client, 'muguets-lot-2-t3', [
      {
        url: '/properties/muguets-lot-2-t3/photo-01.jpeg',
        filename: 'photo-01.jpeg',
        mime_type: 'image/jpeg',
        size_bytes: 213_429,
        sort_order: 0,
      },
    ]);
    assert.equal(client.calls[1].params[2], null);
  });

  test('photos vide — DELETE seul, pas d\'INSERT', async () => {
    const client = createMockClient();
    await upsertPropertyPhotosDb(client, 'muguets-lot-3-duplex', []);
    assert.equal(client.calls.length, 1);
    assert.match(client.calls[0].sql, /^DELETE FROM property_photos/);
  });

  test('idempotent — rejouable 2x (mêmes appels)', async () => {
    const client1 = createMockClient();
    const client2 = createMockClient();
    const photos = [{
      url: '/properties/x/photo-01.jpeg',
      alt: 'a',
      filename: 'photo-01.jpeg',
      mime_type: 'image/jpeg',
      size_bytes: 100,
      sort_order: 0,
    }];
    await upsertPropertyPhotosDb(client1, 'muguets-lot-1-rdc', photos);
    await upsertPropertyPhotosDb(client2, 'muguets-lot-1-rdc', photos);
    assert.deepEqual(client1.calls.map((c) => c.sql), client2.calls.map((c) => c.sql));
  });

  test('rejette property_id avec caractères interdits (anti path-traversal)', async () => {
    const client = createMockClient();
    await assert.rejects(
      () => upsertPropertyPhotosDb(client, '../../etc/passwd', []),
      /invalide/,
    );
    assert.equal(client.calls.length, 0);
  });
});

describe('ensurePropertyPhotoSchema', () => {
  test('exécute ALTER TABLE ADD COLUMN url + alt + index (idempotent)', async () => {
    const client = createMockClient();
    await ensurePropertyPhotoSchema(client);

    const sqls = client.calls.map((c) => c.sql).join('\n');
    assert.match(sqls, /ADD COLUMN IF NOT EXISTS url/);
    assert.match(sqls, /ADD COLUMN IF NOT EXISTS alt/);
    assert.match(sqls, /ALTER COLUMN data DROP NOT NULL/);
    assert.match(sqls, /CREATE INDEX IF NOT EXISTS idx_property_photos_property_sort/);
  });
});
