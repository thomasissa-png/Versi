/**
 * Seed : insère 3 articles de blog dans la table blog_articles.
 * Usage : node scripts/seed-blog.js
 * Requiert DATABASE_URL dans l'environnement.
 */

import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,
  connectionTimeoutMillis: 5000,
});

const ARTICLES = [
  {
    title: 'Rendement locatif : brut, net, net-net — comment s\'y retrouver ?',
    slug: 'rendement-locatif-brut-net-net-net',
    excerpt:
      'Les trois niveaux de rendement locatif décortiqués avec des exemples chiffrés. La différence entre brut et net peut changer la décision d\'investissement.',
    content: `## Rendement brut : le point de départ

Le rendement brut est le ratio le plus simple : loyers annuels divisés par le prix d'acquisition. C'est le chiffre que vous verrez sur les annonces et les plateformes.

Formule : (loyer mensuel x 12) / prix d'acquisition x 100

Exemple : un bien à 150 000 € avec un loyer de 800 €/mois affiche un rendement brut de 6,4 %. Ce chiffre ne dit rien sur ce que vous mettrez réellement en poche.

## Rendement net : la réalité des charges

Le rendement net déduit les charges réelles : taxe foncière, charges de copropriété, assurance propriétaire non occupant, vacance locative provisionnée, frais de gestion si applicable.

Formule : (loyer mensuel net de charges x 12) / prix d'acquisition x 100

Sur le même bien, avec 1 200 € de taxe foncière, 80 €/mois de charges copro et 1 mois de vacance provisionné, le rendement net tombe à 4,8 %. La différence avec le brut (1,6 point) est significative.

## Rendement net-net : après fiscalité

Le rendement net-net intègre la fiscalité applicable selon votre régime : micro-foncier, réel, LMNP au réel, SCI à l'IS. C'est le rendement final — ce qui reste après que l'État a pris sa part.

Ce chiffre dépend de votre situation personnelle. C'est pourquoi Versi Invest recommande systématiquement de consulter un expert-comptable pour le calcul exact.

## Ce que Versi Invest utilise en interne

Chez Versi Invest, chaque dossier est évalué sur le rendement net, pas le brut. Si le rendement net ne tient pas en scénario prudent (+15 % de charges, 1 mois de vacance supplémentaire), le bien n'est pas présenté à nos investisseurs. C'est la base de notre sélection.`,
    author: 'Versi Invest',
  },
  {
    title: 'Cashflow positif : mythe ou réalité en 2026 ?',
    slug: 'cashflow-positif-mythe-realite-2026',
    excerpt:
      'Le cashflow positif dès le premier mois est-il encore possible avec les taux actuels ? Analyse concrète avec les chiffres du marché Hauts-de-France.',
    content: `## Le cashflow positif, c'est quoi exactement ?

Le cashflow positif signifie que les loyers perçus couvrent l'intégralité des charges : mensualité de crédit, taxe foncière, charges de copropriété, assurance, vacance locative et frais de gestion. Après avoir tout payé, il reste de l'argent.

C'est l'opposé de l'effort d'épargne — cette somme que vous devez sortir de votre poche chaque mois pour compléter le loyer.

## Pourquoi c'est plus difficile en 2026

Les taux d'emprunt se sont stabilisés autour de 3,2 % à 3,8 % pour un investissement locatif sur 20 ans. C'est significativement plus haut que les 1,2 % de 2021. Sur un emprunt de 150 000 €, la différence de mensualité est d'environ 180 €/mois.

Conséquence directe : le rendement brut nécessaire pour atteindre le cashflow positif est plus élevé. En 2021, un bien à 6 % brut pouvait être autofinancé. En 2026, il faut viser 8 % à 9 % brut minimum.

## Où trouver du cashflow positif en 2026

Les marchés où le cashflow positif reste accessible ont deux caractéristiques : des prix au m² modérés et des loyers relativement élevés par rapport au prix d'achat.

Les Hauts-de-France cochent ces deux cases. Lille métropole, Lens, Valenciennes, Douai — ces zones affichent des rendements bruts entre 7 % et 11 % sur les immeubles de rapport. Le marché locatif y est tendu (demande forte, offre limitée en bon état), ce qui limite la vacance.

## La méthode Versi Invest

Chaque bien que nous présentons est simulé avec un scénario prudent : charges majorées de 15 %, vacance locative d'un mois par an. Si le cashflow ne tient pas dans ce scénario pessimiste, le bien n'est pas présenté. C'est notre filtre principal.

Résultat : nos investisseurs obtiennent un cashflow positif dès le premier mois sur la grande majorité des opérations. Pas parce que les chiffres sont optimistes — parce que les biens sont sélectionnés pour ça.`,
    author: 'Versi Invest',
  },
  {
    title: 'Investir dans les Hauts-de-France : les zones à surveiller',
    slug: 'investir-hauts-de-france-zones-a-surveiller',
    excerpt:
      'Pourquoi les Hauts-de-France attirent les investisseurs locatifs en 2026. Analyse des zones les plus intéressantes par le réseau terrain Versi.',
    content: `## Pourquoi les Hauts-de-France

La région combine trois facteurs favorables à l'investissement locatif : des prix d'acquisition parmi les plus bas de France métropolitaine, une demande locative soutenue (bassin d'emploi, universités, mobilité Paris-Lille en 1h) et un réseau d'artisans compétitif qui permet des rénovations à coût maîtrisé.

Le rendement brut moyen sur un immeuble de rapport en métropole lilloise oscille entre 7 % et 10 %. Sur des villes secondaires comme Lens, Douai ou Valenciennes, il peut dépasser 10 %.

## Lille métropole : la valeur sûre

Lille reste le marché le plus liquide de la région. Les biens se louent vite, la vacance est faible, et la plus-value à moyen terme est probable (dynamique de prix positive depuis 10 ans). Le rendement brut est plus modéré (6 % à 8 %) mais la sécurité du placement compense.

Les quartiers à surveiller : Fives (en pleine transformation urbaine), Hellemmes (encore accessible), Lomme et Lambersart (demande familiale forte).

## Roubaix et Tourcoing : le rapport qualité-prix

Ces deux villes de la métropole lilloise offrent des prix au m² 40 % à 50 % inférieurs à Lille centre. Le rendement brut peut atteindre 9 % à 12 % sur des immeubles bien rénovés. La contrepartie : un travail de sélection plus fin pour éviter les zones à risque (vacance, impayés).

C'est exactement le type de sourcing où le réseau terrain fait la différence. Un immeuble à Roubaix, selon la rue, peut être un excellent investissement ou un piège. La connaissance locale est non négociable.

## Le bassin minier : Lens, Douai, Valenciennes

Le bassin minier offre les rendements les plus élevés de la région. Des immeubles de rapport à 6 lots s'y trouvent sous les 200 000 €, avec des rendements bruts dépassant 10 %. La demande locative existe (emplois tertiaires, hôpital, université d'Artois) mais le marché est moins tendu qu'à Lille.

Le risque principal : la qualité du bâti. Beaucoup de biens nécessitent des rénovations lourdes. Le chiffrage précis des travaux avant acquisition est indispensable — c'est une des étapes clés de notre accompagnement.

## Ce que fait Versi Invest dans la région

Le réseau Versi Invest est ancré dans les Hauts-de-France. Nos fondateurs y investissent personnellement depuis plusieurs années. Notre branche marchand de biens (Versi Immobilier) opère principalement dans ce territoire — ce qui nous donne un accès direct aux opportunités avant qu'elles n'arrivent sur le marché.`,
    author: 'Versi Invest',
  },
];

async function seed() {
  console.log('[SEED] Connexion à la base de données...');

  try {
    // Vérification que la table existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blog_articles (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        excerpt TEXT,
        content TEXT NOT NULL,
        author VARCHAR(100) DEFAULT 'Versi Invest',
        image_url VARCHAR(500),
        published BOOLEAN DEFAULT false,
        published_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    for (const article of ARTICLES) {
      // Upsert : insérer si le slug n'existe pas, sinon ignorer
      const existing = await pool.query(
        'SELECT id FROM blog_articles WHERE slug = $1',
        [article.slug],
      );

      if (existing.rows.length > 0) {
        console.log(`[SEED] Article déjà existant, ignoré : "${article.title}"`);
        continue;
      }

      await pool.query(
        `INSERT INTO blog_articles (title, slug, excerpt, content, author, published, published_at)
         VALUES ($1, $2, $3, $4, $5, true, NOW())`,
        [article.title, article.slug, article.excerpt, article.content, article.author],
      );
      console.log(`[SEED] Article inséré : "${article.title}"`);
    }

    console.log('[SEED] Seed terminé avec succès.');
  } catch (err) {
    console.error('[SEED] Erreur :', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
