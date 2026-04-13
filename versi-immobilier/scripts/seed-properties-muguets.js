// Seed script — 3 properties at 10 rue des Muguets, Lille
// Idempotent: uses ON CONFLICT DO UPDATE
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const PROPERTIES = [
  {
    id: 'muguets-lot-1-rdc',
    title: 'T2 de 47 m² avec espace extérieur privatif, rez-de-chaussée',
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
    description: `Rez-de-chaussée, accès direct à l'extérieur. C'est le seul appartement de l'immeuble à avoir son propre espace extérieur : 10 m² privatifs, de plain-pied avec le séjour, sans vis-à-vis.

L'intérieur est simple et bien distribué. Un séjour-cuisine de 26 m² lumineux qui ouvre directement sur l'extérieur, sans marche, sans seuil. Une chambre de 10,2 m² côté cour, au calme. Chauffage collectif, pas de charge d'ascenseur. Place de parking extérieur sécurisé (accès par double porte) comprise dans le prix.

L'immeuble est un ancien bâtiment de bureaux que Versi transforme en 3 logements de qualité. Parquet contrecollé chêne, menuiseries double vitrage, salle d'eau carrelée grand format, cuisine pré-équipée. Deux formules : à 95 000 € vous achetez avant travaux et vous choisissez vos finitions, à 130 000 € on vous livre prêt à habiter. Permis déposé, début des travaux septembre 2026, livraison décembre 2026. Dommages-ouvrage et garantie décennale incluses.`,
    works: JSON.stringify([]),
    features: JSON.stringify([
      'Espace extérieur privatif 10 m², de plain-pied',
      'Séjour-cuisine 26 m² lumineux, ouvert sur l\'extérieur',
      'Chambre 10,2 m² côté cour',
      'Parquet chêne, menuiseries double vitrage',
      'Parking extérieur sécurisé (double porte)',
      'Pas de charges d\'ascenseur',
    ]),
    sort_order: 0,
  },
  {
    id: 'muguets-lot-2-t3',
    title: 'T3 de 82 m² avec séjour traversant de 40 m², 1er étage',
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
    description: `Le premier étage, c'est celui qui a le plus grand volume habitable. 82 m² répartis simplement : un séjour-cuisine de 40,5 m² sans cloisonnement, deux chambres (14 m² et 9 m²), une salle d'eau. L'appartement est issu d'un ancien plateau de bureaux. C'est ce qui explique les volumes : pas de mur porteur au milieu, pas de couloir qui mange la surface. Tout l'espace est utile.

Le séjour donne une vraie liberté d'aménagement. Table de 8, canapé d'angle, coin bureau, tout rentre sans compromis. Les deux chambres sont séparées du séjour, chacune avec sa fenêtre. Chauffage collectif. Place de parking extérieur sécurisé (accès par double porte) comprise.

L'immeuble, ancien bâtiment de bureaux, est entièrement repris par Versi et transformé en 3 logements de qualité. Parquet contrecollé chêne, menuiseries double vitrage, salle d'eau carrelée grand format, cuisine pré-équipée. À 165 000 € avant travaux ou 230 000 € livré prêt à habiter. Permis déposé, début des travaux septembre 2026, livraison décembre 2026. Dommages-ouvrage et garantie décennale incluses.`,
    works: JSON.stringify([]),
    features: JSON.stringify([
      'Séjour-cuisine de 40,5 m² sans cloisonnement',
      'Chambre principale 14 m²',
      'Chambre 9 m²',
      'Aucun mur porteur central',
      'Parquet chêne, menuiseries double vitrage',
      'Parking extérieur sécurisé (double porte)',
    ]),
    sort_order: 1,
  },
  {
    id: 'muguets-lot-3-duplex',
    title: 'Duplex 126 m² sur deux niveaux, terrasse et plafond cathédrale',
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
    description: `Les deux derniers étages de l'immeuble, pour un seul appartement. 126 m² répartis sur deux niveaux, avec une terrasse de 12 m² donnant sur l'église du quartier. En haut, le plafond cathédrale donne au séjour une hauteur qu'on ne trouve pas dans du logement standard.

En bas : trois chambres de 15 m² chacune et une salle d'eau. En haut : un séjour-cuisine de 47 m² sous les toits, lumineux, avec accès direct à la terrasse. C'est un vrai appartement familial, avec de la place pour chacun et un espace commun où l'on respire. Chauffage collectif. Place de parking extérieur sécurisé (accès par double porte) comprise.

L'immeuble entier, ancien bâtiment de bureaux, est transformé par Versi en 3 logements de qualité. Parquet contrecollé chêne, menuiseries double vitrage, salle d'eau carrelée grand format, cuisine pré-équipée. À 250 000 € avant travaux ou 355 000 € livré prêt à habiter. Permis déposé, début des travaux septembre 2026, livraison décembre 2026. Dommages-ouvrage et garantie décennale incluses.`,
    works: JSON.stringify([]),
    features: JSON.stringify([
      'Duplex 126 m² sur deux niveaux',
      'Terrasse 12 m² donnant sur l\'église',
      'Plafond cathédrale au dernier étage',
      'Séjour-cuisine 47 m² sous les toits',
      '3 chambres de 15 m² chacune',
      'Parquet chêne, menuiseries double vitrage',
      'Parking extérieur sécurisé (double porte)',
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
