// Seed script — 3 properties at 10 rue des Muguets, Lille
// Idempotent: uses ON CONFLICT DO UPDATE
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const PROPERTIES = [
  {
    id: 'muguets-lot-1-rdc',
    title: 'Rez-de-chaussée avec extérieur privatif — 47 m², Lille-Sud',
    city: 'Lille',
    location: 'Lille',
    neighborhood: 'Lille-Sud',
    address: '10 rue des Muguets, Lille',
    nearby_transport: 'Métro ligne 1 — Porte des Postes à 600 m. Bus L5 arrêt Muguets. Gare Lille Flandres à 15 min.',
    nearby_amenities: 'Parc des Dondaines à 400 m. Groupe scolaire Condorcet, commerces rue du Faubourg des Postes. CHR Lille à 10 min.',
    type: 'Appartement',
    surface: '47 m²',
    rooms: 2,
    price: '95 000 €',
    price_num: 95000,
    price_note: 'Prix avant travaux, hors frais de notaire. Option prêt à habiter : 130 000 € HFN.',
    status: 'disponible',
    dpe: null,
    dpe_note: 'DPE en cours',
    floor: 'RDC',
    tenancy: 'Libre',
    renovation_year: null,
    charges: null,
    description: `Ce T2 de 47 m² est le seul appartement de l'immeuble à bénéficier d'un accès direct à l'extérieur : 10 m² de jardin privatif au sol, sans vis-à-vis immédiat. Dans le collectif lillois, ce profil est rare — et délibérément préservé dans la nouvelle distribution.

Le séjour-cuisine de 26 m² est conçu en plain-pied, sans rupture de niveau entre l'intérieur et l'extérieur. La chambre de 10,2 m² donne sur la cour. Chauffage collectif — pas de charge d'ascenseur. La place de parking couverte est comprise dans le prix.

Le bien est en pré-commercialisation : les travaux n'ont pas encore démarré. Versi Immobilier pilote l'intégralité de l'opération — de l'acquisition à la livraison. Deux options d'acquisition : avant travaux à 95 000 €, ou prêt à habiter à 130 000 €. Livraison estimée fin 2026. Assurance dommages-ouvrage et garantie décennale incluses.`,
    works: JSON.stringify([]),
    features: JSON.stringify([
      'Jardin privatif 10 m², accès plain-pied',
      'Séjour-cuisine ouvert 26 m²',
      'Chambre 10,2 m²',
      'Parking couvert inclus',
      'Pas de charges d\'ascenseur',
      'Livraison fin 2026 — garantie décennale',
    ]),
    sort_order: 0,
  },
  {
    id: 'muguets-lot-2-t3',
    title: 'T3 avec séjour de 40 m² — 82 m², 1er étage, Lille-Sud',
    city: 'Lille',
    location: 'Lille',
    neighborhood: 'Lille-Sud',
    address: '10 rue des Muguets, Lille',
    nearby_transport: 'Métro ligne 1 — Porte des Postes à 600 m. Bus L5 arrêt Muguets. Gare Lille Flandres à 15 min.',
    nearby_amenities: 'Parc des Dondaines à 400 m. Groupe scolaire Condorcet, commerces rue du Faubourg des Postes. CHR Lille à 10 min.',
    type: 'Appartement',
    surface: '82,2 m²',
    rooms: 3,
    price: '165 000 €',
    price_num: 165000,
    price_note: 'Prix avant travaux, hors frais de notaire. Option prêt à habiter : 230 000 € HFN.',
    status: 'disponible',
    dpe: null,
    dpe_note: 'DPE en cours',
    floor: '1er étage',
    tenancy: 'Libre',
    renovation_year: null,
    charges: null,
    description: `Un séjour-cuisine de 40,5 m² dans un T3 collectif, ce n'est pas un standard de la promotion neuve lilloise — c'est le double de ce que les programmes récents proposent sur des surfaces comparables. Cette générosité vient de l'histoire du bâtiment : l'immeuble était à usage de bureaux. Les plateaux ouverts, sans la distribution contrainte du résidentiel standard, ont rendu possible cette configuration.

Deux chambres de 14 m² et 9 m² complètent l'appartement. Chauffage collectif. Place de parking couverte incluse dans le prix.

Le bien est en pré-commercialisation : les travaux n'ont pas encore démarré. Versi Immobilier conduit l'opération sans intermédiaire, de l'acquisition à la livraison. Acquisition avant travaux à 165 000 €, ou prêt à habiter à 230 000 €. Livraison estimée fin 2026. Assurance dommages-ouvrage et garantie décennale incluses.`,
    works: JSON.stringify([]),
    features: JSON.stringify([
      'Séjour-cuisine 40,5 m² — double du standard neuf',
      'Chambre principale 14 m²',
      'Chambre 9 m²',
      'Distribution issue d\'un ancien plateau bureau',
      'Parking couvert inclus',
      'Livraison fin 2026 — garantie décennale',
    ]),
    sort_order: 1,
  },
  {
    id: 'muguets-lot-3-duplex',
    title: 'Duplex 126 m², terrasse avec vue, plafond cathédrale — Lille-Sud',
    city: 'Lille',
    location: 'Lille',
    neighborhood: 'Lille-Sud',
    address: '10 rue des Muguets, Lille',
    nearby_transport: 'Métro ligne 1 — Porte des Postes à 600 m. Bus L5 arrêt Muguets. Gare Lille Flandres à 15 min.',
    nearby_amenities: 'Parc des Dondaines à 400 m. Groupe scolaire Condorcet, commerces rue du Faubourg des Postes. CHR Lille à 10 min.',
    type: 'Duplex',
    surface: '126,3 m²',
    rooms: 5,
    price: '250 000 €',
    price_num: 250000,
    price_note: 'Prix avant travaux, hors frais de notaire. Option prêt à habiter : 355 000 € HFN.',
    status: 'disponible',
    dpe: null,
    dpe_note: 'DPE en cours',
    floor: '2e et 3e étages',
    tenancy: 'Libre',
    renovation_year: null,
    charges: null,
    description: `Ce duplex occupe les deux derniers niveaux de l'immeuble — 126 m² sur deux étages, avec une terrasse de 12 m² orientée vers l'église du quartier. La partie haute bénéficie d'un plafond cathédrale : une hauteur que la construction neuve ne propose plus dans ce segment de prix.

Trois chambres de 15 m² chacune — une symétrie de distribution que la contrainte des dalles standard rend quasi impossible dans un programme neuf. Le séjour-cuisine de 47 m² bénéficie d'une vue dégagée. Chauffage collectif. Place de parking couverte incluse.

Le bien est en pré-commercialisation : les travaux n'ont pas encore démarré. Versi Immobilier maîtrise l'intégralité du process, de la restructuration structurelle aux finitions. Acquisition avant travaux à 250 000 €, ou prêt à habiter à 355 000 €. Livraison estimée fin 2026. Assurance dommages-ouvrage et garantie décennale incluses.`,
    works: JSON.stringify([]),
    features: JSON.stringify([
      'Duplex sur deux niveaux — 126 m²',
      'Terrasse 12 m² avec vue sur l\'église',
      'Plafond cathédrale en partie haute',
      'Séjour-cuisine 47 m² vue dégagée',
      '3 chambres de 15 m² — distribution symétrique',
      'Parking couvert inclus',
      'Livraison fin 2026 — garantie décennale',
    ]),
    sort_order: 2,
  },
];

// Export des données pour autoSeed dans server.js
export { PROPERTIES as MUGUETS_PROPERTIES };

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error('[seed-muguets] DATABASE_URL non définie.');
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    for (const prop of PROPERTIES) {
      await client.query(
        `INSERT INTO properties (
          id, title, city, location, neighborhood, address,
          nearby_transport, nearby_amenities, type, surface, rooms,
          price, price_num, price_note, status, dpe, dpe_note,
          floor, tenancy, renovation_year, charges, description,
          works, features, sort_order
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          city = EXCLUDED.city,
          location = EXCLUDED.location,
          neighborhood = EXCLUDED.neighborhood,
          address = EXCLUDED.address,
          nearby_transport = EXCLUDED.nearby_transport,
          nearby_amenities = EXCLUDED.nearby_amenities,
          type = EXCLUDED.type,
          surface = EXCLUDED.surface,
          rooms = EXCLUDED.rooms,
          price = EXCLUDED.price,
          price_num = EXCLUDED.price_num,
          price_note = EXCLUDED.price_note,
          status = EXCLUDED.status,
          dpe = EXCLUDED.dpe,
          dpe_note = EXCLUDED.dpe_note,
          floor = EXCLUDED.floor,
          tenancy = EXCLUDED.tenancy,
          renovation_year = EXCLUDED.renovation_year,
          charges = EXCLUDED.charges,
          description = EXCLUDED.description,
          works = EXCLUDED.works,
          features = EXCLUDED.features,
          sort_order = EXCLUDED.sort_order`,
        [
          prop.id, prop.title, prop.city, prop.location, prop.neighborhood, prop.address,
          prop.nearby_transport, prop.nearby_amenities, prop.type, prop.surface, prop.rooms,
          prop.price, prop.price_num, prop.price_note, prop.status, prop.dpe, prop.dpe_note,
          prop.floor, prop.tenancy, prop.renovation_year, prop.charges, prop.description,
          prop.works, prop.features, prop.sort_order,
        ]
      );
      console.log(`[seed-muguets] Upserted: ${prop.id} — ${prop.title}`);
    }
    console.log('[seed-muguets] 3 biens Muguets insérés/mis à jour.');
  } catch (err) {
    console.error('[seed-muguets] Erreur :', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Ne s'exécute que si lancé directement (pas à l'import)
import { fileURLToPath } from 'url';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  seed();
}
