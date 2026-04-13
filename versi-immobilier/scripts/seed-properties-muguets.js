// Seed script — 3 properties at 10 rue des Muguets, Lille
// Idempotent: uses ON CONFLICT DO UPDATE
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const PROPERTIES = [
  {
    id: 'muguets-lot-1-rdc',
    title: 'Rue des Muguets — T2 avec espace extérieur privatif',
    city: 'Lille',
    location: 'Lille',
    neighborhood: null,
    address: '10 rue des Muguets, Lille',
    nearby_transport: null,
    nearby_amenities: null,
    type: 'Appartement',
    surface: '47 m²',
    rooms: 2,
    price: '95 000 €',
    price_num: 95000,
    price_note: 'Prix avant travaux, hors frais de notaire. Option clé en main livré prêt à habiter : 130 000 € HFN.',
    status: 'disponible',
    dpe: null,
    dpe_note: 'DPE en cours',
    floor: 'RDC',
    tenancy: 'Libre',
    renovation_year: null,
    charges: null,
    description: `Rez-de-chaussée de 47 m², accès direct à un espace extérieur privatif de 10 m². Un profil rare dans le collectif — et délibérément choisi pour ce lot dans la restructuration du 10 rue des Muguets.

Séjour-cuisine ouvert de 26 m² en plain-pied, chambre de 10,2 m², chauffage collectif. La place de parking extérieure couverte est incluse dans le prix. Pas de charges d'ascenseur, pas de voisins au-dessus.

Le lot est proposé en pré-commercialisation : les travaux ne sont pas encore démarrés. Versi Immobilier assure l'opération de bout en bout — restructuration, second-œuvre, finitions. Livraison estimée fin 2026. Assurance dommages-ouvrage et garantie décennale incluses. Deux options d'acquisition : avant travaux à 95 000 €, ou clé en main livré prêt à habiter à 130 000 €.`,
    works: JSON.stringify([]),
    features: JSON.stringify([
      'Séjour-cuisine ouvert 26 m²',
      'Chambre 10,2 m²',
      'Espace extérieur privatif 10 m²',
      'Chauffage collectif',
      'Parking extérieur couvert inclus',
      'Pas de charges d\'ascenseur',
    ]),
    sort_order: 0,
  },
  {
    id: 'muguets-lot-2-t3',
    title: 'Rue des Muguets — T3 de 82 m², séjour 40 m²',
    city: 'Lille',
    location: 'Lille',
    neighborhood: null,
    address: '10 rue des Muguets, Lille',
    nearby_transport: null,
    nearby_amenities: null,
    type: 'Appartement',
    surface: '82,2 m²',
    rooms: 3,
    price: '165 000 €',
    price_num: 165000,
    price_note: 'Prix avant travaux, hors frais de notaire. Option clé en main livré prêt à habiter : 230 000 € HFN.',
    status: 'disponible',
    dpe: null,
    dpe_note: 'DPE en cours',
    floor: '1er étage',
    tenancy: 'Libre',
    renovation_year: null,
    charges: null,
    description: `Premier étage, 82,2 m². Un T3 avec un séjour-cuisine de 40,5 m² — soit deux fois la surface d'un séjour standard dans le neuf collectif lillois. Ce gabarit vient directement de l'ancienne destination bureaux de l'immeuble : des plateaux ouverts, sans les contraintes de distribution du résidentiel standard.

Deux chambres — 14 m² et 9 m² — complètent la distribution. Chauffage collectif. Place de parking extérieur couverte incluse.

Lot proposé en pré-commercialisation : les travaux n'ont pas démarré. Versi Immobilier pilote l'opération sans intermédiaire, de l'acquisition à la livraison. Livraison estimée fin 2026. Assurance dommages-ouvrage et garantie décennale incluses. Acquisition avant travaux à 165 000 €, ou clé en main livré prêt à habiter à 230 000 €.`,
    works: JSON.stringify([]),
    features: JSON.stringify([
      'Séjour-cuisine 40,5 m²',
      'Chambre 1 — 14 m²',
      'Chambre 2 — 9 m²',
      'Chauffage collectif',
      'Parking extérieur couvert inclus',
    ]),
    sort_order: 1,
  },
  {
    id: 'muguets-lot-3-duplex',
    title: 'Rue des Muguets — Duplex 126 m², terrasse, plafond cathédrale',
    city: 'Lille',
    location: 'Lille',
    neighborhood: null,
    address: '10 rue des Muguets, Lille',
    nearby_transport: null,
    nearby_amenities: null,
    type: 'Duplex',
    surface: '126,3 m²',
    rooms: 5,
    price: '250 000 €',
    price_num: 250000,
    price_note: 'Prix avant travaux, hors frais de notaire. Option clé en main livré prêt à habiter : 355 000 € HFN.',
    status: 'disponible',
    dpe: null,
    dpe_note: 'DPE en cours',
    floor: '2e et 3e étages',
    tenancy: 'Libre',
    renovation_year: null,
    charges: null,
    description: `Deuxième et troisième étages, 126,3 m² sur deux niveaux, terrasse avec vue sur l'église. Ce duplex occupe les étages supérieurs de l'immeuble du 10 rue des Muguets — le lot le plus élevé, le plus lumineux, et le seul à bénéficier d'un plafond cathédrale en partie haute.

Trois chambres de 15 m² chacune — une symétrie de distribution que la construction neuve ne propose presque jamais. Séjour-cuisine de 47 m² avec vue dégagée, terrasse de 12 m². Chauffage collectif. Place de parking extérieur couverte incluse.

Lot proposé en pré-commercialisation avant démarrage des travaux. Versi Immobilier maîtrise l'intégralité du process, de la restructuration structurelle au second-œuvre. Livraison estimée fin 2026. Assurance dommages-ouvrage et garantie décennale incluses. Acquisition avant travaux à 250 000 €, ou clé en main livré prêt à habiter à 355 000 €.`,
    works: JSON.stringify([]),
    features: JSON.stringify([
      'Séjour-cuisine 47 m²',
      '3 chambres de 15 m²',
      'Terrasse 12 m² — vue sur église',
      'Plafond cathédrale',
      'Duplex sur deux niveaux',
      'Chauffage collectif',
      'Parking extérieur couvert inclus',
    ]),
    sort_order: 2,
  },
];

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

seed();
