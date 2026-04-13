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
    price: '94 000 €',
    price_num: 94000,
    price_note: 'Hors frais de notaire. Disponible clé en main à 131 600 € — travaux et finitions inclus.',
    status: 'disponible',
    dpe: null,
    dpe_note: 'DPE en cours',
    floor: 'RDC',
    tenancy: 'Libre',
    renovation_year: null,
    charges: null,
    description: `Ancien bâtiment de bureaux en cours de transformation au 10 rue des Muguets, à Lille. Ce lot de rez-de-chaussée de 47 m² est proposé en pré-commercialisation avant le démarrage des travaux.

La configuration retenue organise le lot autour d'un séjour-cuisine ouvert de 26 m², donnant directement sur un espace extérieur privatif de 10 m². La chambre, de 10,2 m², complète la distribution. Chauffage collectif. Place de parking extérieur couverte incluse dans le prix.

La reconversion de l'immeuble permet de proposer des surfaces et des hauteurs sous plafond atypiques pour du collectif neuf, avec une finition maîtrisée de A à Z par Versi Immobilier. Deux options de prix : acquisition avant travaux à 94 000 €, ou livraison clé en main à 131 600 €.`,
    works: JSON.stringify([]),
    features: JSON.stringify([
      'Séjour-cuisine ouvert 26 m²',
      'Espace extérieur privatif 10 m²',
      'Chauffage collectif',
      'Parking extérieur couvert inclus',
      'Pré-commercialisation avant travaux',
    ]),
    sort_order: 0,
  },
  {
    id: 'muguets-lot-2-t3',
    title: 'Rue des Muguets — T3 de 82 m², 1er étage',
    city: 'Lille',
    location: 'Lille',
    neighborhood: null,
    address: '10 rue des Muguets, Lille',
    nearby_transport: null,
    nearby_amenities: null,
    type: 'Appartement',
    surface: '82,2 m²',
    rooms: 3,
    price: '164 400 €',
    price_num: 164400,
    price_note: 'Hors frais de notaire. Disponible clé en main à 230 160 € — travaux et finitions inclus.',
    status: 'disponible',
    dpe: null,
    dpe_note: 'DPE en cours',
    floor: '1er étage',
    tenancy: 'Libre',
    renovation_year: null,
    charges: null,
    description: `Au premier étage du 10 rue des Muguets, Lille, ce lot de 82,2 m² est issu de la transformation d'un immeuble de bureaux en appartements résidentiels. Bien proposé en pré-commercialisation avant travaux.

La distribution comprend un séjour-cuisine de 40,5 m² et deux chambres de 14 m² et 9 m². Des volumes généreux, cohérents avec l'architecture d'origine du bâtiment. Chauffage collectif. Place de parking extérieur couverte incluse.

Versi Immobilier assure l'ensemble de l'opération — de l'acquisition du bâtiment à la livraison des lots — sans intermédiaire. Acquisition avant travaux à 164 400 €, ou livraison clé en main à 230 160 €.`,
    works: JSON.stringify([]),
    features: JSON.stringify([
      'Séjour-cuisine 40,5 m²',
      'Chambre 1 — 14 m²',
      'Chambre 2 — 9 m²',
      'Chauffage collectif',
      'Parking extérieur couvert inclus',
      'Pré-commercialisation avant travaux',
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
    price: '252 600 €',
    price_num: 252600,
    price_note: 'Hors frais de notaire. Disponible clé en main à 353 640 € — travaux et finitions inclus.',
    status: 'disponible',
    dpe: null,
    dpe_note: 'DPE en cours',
    floor: '2e et 3e étages',
    tenancy: 'Libre',
    renovation_year: null,
    charges: null,
    description: `Au sommet du 10 rue des Muguets, Lille, ce duplex de 126,3 m² occupe les deuxième et troisième étages de l'immeuble en cours de transformation. Lot proposé en pré-commercialisation avant travaux.

La configuration réunit trois chambres de 15 m² chacune, un séjour-cuisine de 47 m² bénéficiant d'une vue dégagée, et une terrasse de 12 m² avec vue sur l'église. Le plafond cathédrale en partie haute confère à l'ensemble un caractère rare dans le collectif lillois. Chauffage collectif. Place de parking extérieur couverte incluse.

La transformation d'un bâtiment de bureaux en logements permet de préserver des hauteurs et des volumes que la construction neuve standard ne propose plus. Versi Immobilier maîtrise l'intégralité du process, de la restructuration au second-œuvre. Acquisition avant travaux à 252 600 €, ou livraison clé en main à 353 640 €.`,
    works: JSON.stringify([]),
    features: JSON.stringify([
      'Séjour-cuisine 47 m²',
      '3 chambres de 15 m²',
      'Terrasse 12 m² — vue sur église',
      'Plafond cathédrale',
      'Chauffage collectif',
      'Parking extérieur couvert inclus',
      'Pré-commercialisation avant travaux',
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
