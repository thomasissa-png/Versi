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
    nearby_transport: 'Métro Oscar Lambret (ligne 1) à 10 minutes à pied (3 minutes en vélo). Lille Flandres à environ 10 minutes en métro, ligne 1 directe. CHU de Lille à proximité immédiate.',
    nearby_amenities: 'Écoles maternelles Florian et La Briqueterie, école élémentaire Turgot (rue du Faubourg des Postes), collège Louise Michel. Crèches municipales Marie Curie et Les P\'tits Minouches. Parc du Grand Sud (4 hectares). Centre commercial Lillenium (rue du Faubourg des Postes, une centaine d\'enseignes). CHU de Lille — Hôpital Roger Salengro dans le quartier (urgences adultes et pédiatriques).',
    type: 'Appartement',
    surface: '47 m²',
    rooms: 2,
    price: '118 000 €',
    price_num: 118000,
    price_note: 'Prix brut (avant travaux), hors frais de notaire. Option prêt à habiter : 145 000 €.',
    status: 'disponible',
    dpe: 'B',
    dpe_note: 'Classe visée au DPE projeté : B (71–110 kWh/m²/an, énergie primaire). DPE définitif établi à la livraison.',
    floor: 'RDC',
    tenancy: 'Libre',
    renovation_year: null,
    charges: '~ 60 €/mois (estimation indicative)',
    description: `C'est le seul appartement de l'immeuble avec un espace extérieur privatif : 10 m² de plain-pied avec le séjour, sans vis-à-vis. Rez-de-chaussée, accès direct.

Le séjour-cuisine de 26 m² est lumineux et ouvre sur l'extérieur sans marche, sans seuil. L'été, on pose la table dehors et on mange à l'air libre. L'hiver, la lumière traverse le séjour toute la journée. La chambre de 10,2 m² donne côté cour, au calme. Chauffage collectif, pas de charge d'ascenseur. Place de parking extérieur sécurisé (accès par double porte) comprise dans le prix.

L'immeuble est un ancien bâtiment de bureaux que Versi transforme en 3 logements de qualité. Finitions soignées : parquet contrecollé chêne, menuiseries double vitrage, salle d'eau carrelée grand format, cuisine pré-équipée. Deux formules : à 118 000 € vous achetez avant travaux et vous choisissez vos finitions, à 145 000 € on vous livre prêt à habiter. Permis déposé, début des travaux septembre 2026, livraison décembre 2026. Dommages-ouvrage et garantie décennale incluses.

Pour visiter ou recevoir le dossier complet du bien, contactez-nous.`,
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
    title: 'T3 de 86 m² avec séjour traversant de 40 m², 1er étage',
    city: 'Lille',
    location: 'Lille',
    neighborhood: 'Lille-Sud',
    address: '10 rue des Muguets, Lille',
    nearby_transport: 'Métro Oscar Lambret (ligne 1) à 10 minutes à pied (3 minutes en vélo). Lille Flandres à environ 10 minutes en métro, ligne 1 directe. CHU de Lille à proximité immédiate.',
    nearby_amenities: 'Écoles maternelles Florian et La Briqueterie, école élémentaire Turgot (rue du Faubourg des Postes), collège Louise Michel. Crèches municipales Marie Curie et Les P\'tits Minouches. Parc du Grand Sud (4 hectares). Centre commercial Lillenium (rue du Faubourg des Postes, une centaine d\'enseignes). CHU de Lille — Hôpital Roger Salengro dans le quartier (urgences adultes et pédiatriques).',
    type: 'Appartement',
    surface: '86 m²',
    rooms: 3,
    price: '176 300 €',
    price_num: 176300,
    price_note: 'Prix brut (avant travaux), hors frais de notaire. Option prêt à habiter : 232 200 €.',
    status: 'disponible',
    dpe: 'B',
    dpe_note: 'Classe visée au DPE projeté : B (71–110 kWh/m²/an, énergie primaire). DPE définitif établi à la livraison.',
    floor: '1er étage',
    tenancy: 'Libre',
    renovation_year: null,
    charges: '~ 107 €/mois (estimation indicative)',
    description: `86 m² d'un seul tenant, sans couloir qui mange la surface, sans mur porteur au milieu. C'est ce que donne un ancien plateau de bureaux quand on le transforme bien. Un séjour-cuisine de 40,5 m² sans cloisonnement, deux chambres (14 m² et 9 m²), une salle d'eau. Tout l'espace est utile.

Le séjour donne une vraie liberté d'aménagement. Table de 8, canapé d'angle, coin bureau, tout rentre sans compromis. Les deux chambres sont séparées du séjour. Chauffage collectif. Place de parking extérieur sécurisé (accès par double porte) comprise.

Ancien bâtiment de bureaux transformé en 3 logements de qualité par Versi. Sols en parquet contrecollé chêne, double vitrage sur toutes les menuiseries, salle d'eau grand format, cuisine pré-équipée. À 176 300 € avant travaux ou 232 200 € livré prêt à habiter. Début des travaux septembre 2026, livraison décembre 2026. Couvert par l'assurance dommages-ouvrage et la garantie décennale.

Pour visiter ou recevoir le dossier complet du bien, contactez-nous.`,
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
    title: 'Duplex 137 m² sur deux niveaux, terrasse et plafond cathédrale',
    city: 'Lille',
    location: 'Lille',
    neighborhood: 'Lille-Sud',
    address: '10 rue des Muguets, Lille',
    nearby_transport: 'Métro Oscar Lambret (ligne 1) à 10 minutes à pied (3 minutes en vélo). Lille Flandres à environ 10 minutes en métro, ligne 1 directe. CHU de Lille à proximité immédiate.',
    nearby_amenities: 'Écoles maternelles Florian et La Briqueterie, école élémentaire Turgot (rue du Faubourg des Postes), collège Louise Michel. Crèches municipales Marie Curie et Les P\'tits Minouches. Parc du Grand Sud (4 hectares). Centre commercial Lillenium (rue du Faubourg des Postes, une centaine d\'enseignes). CHU de Lille — Hôpital Roger Salengro dans le quartier (urgences adultes et pédiatriques).',
    type: 'Duplex',
    surface: '137 m²',
    rooms: 5,
    price: '274 000 €',
    price_num: 274000,
    price_note: 'Prix avant travaux, hors frais de notaire. Option prêt à habiter : 342 500 €.',
    status: 'disponible',
    dpe: null,
    dpe_note: 'DPE en cours',
    floor: '2e et 3e étages',
    tenancy: 'Libre',
    renovation_year: null,
    charges: null,
    description: `Terrasse de 12 m² donnant sur l'église du quartier. Vue sur pierre, pas sur fenêtres d'immeuble. En haut, un plafond cathédrale qui donne au séjour une hauteur qu'on ne retrouve nulle part ailleurs dans l'immeuble. Les deux derniers étages, pour un seul appartement : 137 m² sur deux niveaux.

En bas : trois chambres de 15 m² chacune, chaque chambre indépendante, chacun son espace, et une salle d'eau. En haut : un séjour-cuisine de 47 m² sous les toits, lumineux, avec accès direct à la terrasse. On prend le café dehors le matin avec vue sur le clocher, on reçoit des amis le soir dans un séjour où personne n'est à l'étroit. Chauffage collectif. Place de parking extérieur sécurisé (accès par double porte) comprise.

L'immeuble, ancien bâtiment de bureaux, est intégralement transformé par Versi en 3 logements de qualité. Chaque finition est choisie pour durer : parquet contrecollé chêne, menuiseries double vitrage, salle d'eau carrelée grand format, cuisine pré-équipée. À 274 000 € avant travaux ou 342 500 € livré prêt à habiter. Début des travaux septembre 2026, livraison décembre 2026. Couvert par l'assurance dommages-ouvrage et la garantie décennale.

Pour visiter le duplex ou recevoir la plaquette détaillée, contactez-nous.`,
    works: JSON.stringify([]),
    features: JSON.stringify([
      'Duplex 137 m² sur deux niveaux',
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
