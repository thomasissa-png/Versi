/**
 * Seed script — Insère les articles A1 et A6 dans la table blog_articles.
 * Idempotent : ON CONFLICT (slug) DO UPDATE.
 *
 * Usage : node scripts/seed-blog-articles.js
 */

import pool from '../db.js';

const articles = [
  {
    id: 'marchand-de-biens-lille-acquereur',
    title: 'Marchand de biens à Lille : ce que ça change pour vous',
    slug: 'marchand-de-biens-lille-acquereur',
    excerpt: "Acheter chez un marchand de biens à Lille, ce n'est pas acheter à une agence. Ce que ça change concrètement pour vous en tant qu'acquéreur.",
    content: `# Marchand de biens à Lille : ce que ça change pour vous

Un marchand de biens à Lille acquiert des biens, les transforme, puis les revend en direct. Ce n'est pas une agence. Ce n'est pas un promoteur. Cette distinction a des conséquences concrètes sur votre achat — sur les garanties, sur la traçabilité des travaux, sur la possibilité d'accéder à un bien avant qu'il soit mis sur les portails.

---

## Un marchand de biens n'est pas une agence

Une agence immobilière est un intermédiaire. Elle met en relation un vendeur et un acheteur. Elle ne possède pas le bien, ne connaît pas l'historique des travaux, et ne peut pas répondre à des questions précises sur l'état des installations.

Un marchand de biens achète le bien sur ses fonds propres. Il mène les travaux. Il revend le bien terminé — ou parfois en cours de transformation. Il est vendeur, pas intermédiaire.

La différence n'est pas que sémantique. Elle change ce que vous pouvez exiger, ce que vous pouvez vérifier, et la nature des garanties dont vous bénéficiez.

Versi Immobilier opère sur ce modèle dans la métropole lilloise et dans les Hauts-de-France — à Roubaix, Tourcoing, Valenciennes, et dans d'autres communes de la zone. Chaque bien que vous voyez sur notre site est un bien que nous avons acquis, transformé, et que nous vendons en direct.

---

## Ce que vous achetez réellement (et ce que ça implique)

Quand vous achetez à un marchand de biens, vous achetez à une société qui a engagé ses propres fonds dans l'opération. Ce positionnement change plusieurs choses concrètes.

**La traçabilité des travaux.** Nous savons exactement ce qui a été fait : quel artisan est intervenu, quand, sur quelle installation, pour quel montant. Cette traçabilité n'existe pas dans une transaction entre particuliers. Elle est disponible pour vous, sur demande, avant la signature.

**L'historique de l'actif.** Avant d'acheter le bien, nous avons conduit une analyse complète : état du bâti, diagnostics, contraintes d'urbanisme, état de la copropriété si applicable. Ces informations font partie du dossier de vente.

**L'absence de surprise post-achat.** Un particulier qui revend après avoir fait réaliser des travaux n'a pas nécessairement les moyens — ni l'obligation — de corriger des malfaçons. Un marchand de biens professionnel est soumis à des obligations légales qui s'étendent après la vente.

Vous pouvez consulter [nos réalisations](/realisations) pour voir comment nous documentons chaque opération.

---

## Les garanties d'un bien rénové par un professionnel

C'est le point le plus concret de la distinction entre marchands de biens et particuliers — et il joue en votre faveur.

Quand un marchand de biens fait réaliser des travaux, il est soumis à des obligations d'assurance spécifiques. Deux d'entre elles vous protègent directement en tant qu'acquéreur.

**La garantie décennale.** Elle couvre les travaux pendant dix ans après leur réalisation. Si un défaut structurel ou une malfaçon apparaît dans ce délai — sur la toiture, la structure, les réseaux —, cette garantie s'applique. Elle est souscrite par les entreprises qui ont réalisé les travaux.

**L'assurance dommage-ouvrage.** Elle permet de déclencher rapidement une indemnisation sans attendre la désignation d'un responsable en justice. Pour vous, ça signifie moins d'attente si quelque chose se passe.

Ces garanties ne sont pas automatiques dans une transaction entre particuliers — elles existent parce qu'un professionnel a fait réaliser et supervisé les travaux.

Pour aller plus loin sur ce point, nous détaillons [les garanties d'un bien rénové par un professionnel](/blog/appartement-renove-marchand-de-biens-garanties) dans un article dédié.

---

## Acheter avant la mise en vente officielle : la précommercialisation

Un avantage moins connu de l'achat chez un marchand de biens : la possibilité d'accéder à des biens avant qu'ils soient publiés sur les portails.

Quand Versi Immobilier acquiert un bien et démarre les travaux, certains acquéreurs peuvent réserver ce bien pendant la phase de transformation. C'est ce qu'on appelle la précommercialisation.

Concrètement, cela signifie que vous pouvez visiter un bien en cours de rénovation, vous mettre d'accord sur un prix, signer un compromis sous conditions suspensives, et attendre la livraison. Vous n'achetez pas "sur plan" comme dans le neuf — vous achetez un bien existant dont vous pouvez voir l'état initial et les plans de finition.

Ce mécanisme vous donne accès à des biens avant qu'ils soient disponibles au grand public — et donc avant la compétition entre acquéreurs. Nous expliquons [comment fonctionne l'achat avant la mise en vente officielle](/blog/precommercialisation-immobilier-lille) dans un article complet.

---

## Ce que ça change pour vous à Lille

Le marché immobilier de la métropole lilloise présente une diversité utile pour l'acquéreur. Les prix médians varient sensiblement selon la commune : Roubaix se situe autour de 1 994 à 2 182 €/m² (Meilleurs Agents, avril 2026), Tourcoing autour de 1 702 €/m² (action.immo, 2026), Valenciennes autour de 1 984 €/m² (lagence-exclusive.fr, 2026). Ces villes de la métropole sont significativement plus accessibles que Lille pour un budget comparable.

Dans chacune de ces zones, Versi Immobilier opère sur de l'ancien à transformer. Ce tissu produit des biens que les portails grand public ne montrent pas toujours en premier. Les biens en précommercialisation, les transactions en cours de finalisation, les opérations récemment achevées — tout ce stock passe d'abord par les réseaux des opérateurs avant d'atterrir sur les portails.

En tant qu'acquéreur, connaître le fonctionnement d'un marchand de biens vous donne accès à ces biens plus tôt. Être en mesure d'évaluer le sérieux d'un opérateur — ses garanties, ses réalisations passées, sa traçabilité — vous protège avant de signer.

Chez Versi Immobilier, nous opérons en direct sur chaque bien que nous vendons. Pas d'intermédiaire entre vous et l'opérateur qui a mené l'opération.

[Voir nos biens disponibles](/nos-biens)

---

*Par l'équipe Versi — Maxime, Thomas & Carl*`,
    cover_image: null,
    author: 'Équipe Versi — Maxime, Thomas & Carl',
    tags: JSON.stringify(['marchand de biens', 'Lille', 'acquéreur', 'garanties']),
    status: 'published',
  },
  {
    id: 'precommercialisation-immobilier-lille',
    title: 'Précommercialisation immobilière à Lille : comment accéder aux biens avant les autres',
    slug: 'precommercialisation-immobilier-lille',
    excerpt: "Acheter un appartement avant sa mise en vente officielle à Lille est possible chez un marchand de biens. Voici comment la précommercialisation fonctionne.",
    content: `# Précommercialisation immobilière à Lille : comment accéder aux biens avant les autres

La précommercialisation immobilière permet d'acheter un appartement avant sa mise en vente officielle — pendant les travaux, parfois même avant qu'ils commencent. Chez un marchand de biens comme Versi Immobilier, c'est une pratique courante. Voici comment elle fonctionne, ce qu'elle vous apporte et ce qu'elle exige de vous.

---

## La précommercialisation : qu'est-ce que c'est concrètement

Un bien en précommercialisation est un bien existant, acquis par un marchand de biens, en cours de transformation. Il n'est pas encore visible sur les portails d'annonces. Il n'est pas encore livré. Pourtant, il peut déjà être réservé — et acheté.

La précommercialisation n'est pas la VEFA. La VEFA (vente en l'état futur d'achèvement) est un mécanisme de la promotion immobilière neuve. Elle concerne des logements construits de zéro, sur des délais de deux à trois ans, avec un cadre juridique très encadré. La précommercialisation chez un marchand de biens concerne un bien ancien en cours de rénovation, livré en général sous deux à cinq mois. C'est un mécanisme plus souple, sur un calendrier plus court.

Pour comprendre pourquoi ce mécanisme existe, il aide de comprendre [ce qu'est un marchand de biens](/blog/marchand-de-biens-lille-acquereur) et comment il opère. En résumé : le marchand de biens achète, rénove, revend. La précommercialisation lui permet de sécuriser un acquéreur pendant la phase de travaux — et à vous d'accéder à un bien avant tout le monde.

---

## Ce que vous achetez avant la fin des travaux

Quand Versi Immobilier propose un bien en précommercialisation, vous recevez un dossier complet. Pas une promesse verbale. Un dossier.

Ce dossier contient le plan coté du bien, la liste précise des travaux prévus, les matériaux et finitions retenus, la date de livraison estimée et le prix net vendeur. Vous pouvez, selon l'état d'avancement du chantier, visiter le bien en cours de transformation.

Ce que vous achetez est documenté avant d'être livré. Ce que vous signez est un compromis de vente sous conditions suspensives — principalement la condition suspensive d'obtention de votre prêt immobilier. Vous disposez d'un délai de rétractation de dix jours après signature du compromis.

Notre [process de rénovation](/notre-approche) précise ce qui est systématiquement inclus dans nos opérations : mise aux normes électriques, isolation, équipements sanitaires, finitions. Ces éléments sont définis avant que le chantier commence — pas ajustés en cours de route.

---

## Les garanties d'un achat en précommercialisation

C'est la question que les acquéreurs posent le plus souvent : est-ce que j'achète quelque chose de sécurisé, ou est-ce que je prends un risque ?

La réponse est nuancée — et honnête.

**Ce qui est garanti.** Les travaux structurels réalisés par les entreprises intervenant sur le chantier sont couverts par la garantie décennale de ces entreprises. Cette garantie se transfère à vous le jour de l'acte authentique. Les équipements dissociables (robinetterie, électroménager) sont couverts par les garanties constructeur standards. Les [garanties qui vous protègent](/blog/appartement-renove-marchand-de-biens-garanties) dans le cadre d'un achat chez un marchand de biens sont les mêmes que pour un bien livré — elles ne sont pas diminuées par le fait que vous achetez pendant les travaux.

**Ce qui ne l'est pas.** La date de livraison est une estimation. Un chantier peut prendre du retard — approvisionner les matériaux, coordonner plusieurs corps de métier, faire face à un imprévu structurel sur un bâti ancien. Demandez au marchand de biens quelle est sa marge habituelle sur les délais, et ce qui se passe contractuellement en cas de retard significatif. Un opérateur sérieux répond à ces questions sans hésitation.

**Ce qu'il faut vérifier.** Avant de signer, posez trois questions : qui réalise les travaux (entreprises identifiées, pas des particuliers au noir), est-ce qu'une assurance dommages-ouvrage est souscrite sur l'opération, et quel est le périmètre exact des travaux inclus dans le prix. Ces éléments doivent figurer dans le dossier de vente.

---

## Les avantages concrets pour l'acquéreur

**Pas de concurrence au moment de la décision.** Une annonce publiée sur un portail génère plusieurs dizaines de contacts dans les 48 premières heures. La précommercialisation, elle, n'est pas publique. Vous avez le temps d'examiner le dossier, de poser des questions, de faire valider votre financement avant de décider.

**Un prix fixé avant la livraison.** Le prix est arrêté au moment de la réservation. Ce que vous signez, c'est le prix que vous payez. Si les travaux se révèlent plus coûteux pour le marchand de biens, c'est sa marge qui absorbe l'écart — pas votre budget.

**Un délai de préparation.** Entre la signature du compromis et la livraison du bien, deux à cinq mois s'écoulent. C'est le temps dont vous disposez pour finaliser votre crédit, organiser votre déménagement, ou, si c'est un investissement locatif, trouver votre premier locataire.

**Un bien rénové sans travaux à prévoir.** Vous n'achetez pas un appartement "avec du potentiel" qui cache trois ans de chantier. Vous achetez un bien dont le programme de travaux est défini, réalisé par des professionnels, et couvert par des garanties.

---

## Ce que ça change pour vous

La précommercialisation immobilière à Lille change une chose fondamentale : vous n'êtes plus en position de réaction face au marché. Vous accédez à un stock de biens avant qu'ils soient publics. Vous décidez sans pression de concurrence. Vous achetez avec un dossier complet en main.

Ce mécanisme n'est pas réservé aux investisseurs ou aux acheteurs avertis. Il est accessible à tout acquéreur qui prend le temps de contacter un marchand de biens directement — avant que le bien soit sur SeLoger.

Chez Versi Immobilier, les biens en précommercialisation sont signalés sur notre page dédiée. Vous y trouvez l'état d'avancement de chaque opération, le dossier disponible et le contact direct.

[Voir les biens en précommercialisation](/nos-biens)

---

*Par l'équipe Versi — Maxime, Thomas & Carl*`,
    cover_image: null,
    author: 'Équipe Versi — Maxime, Thomas & Carl',
    tags: JSON.stringify(['précommercialisation', 'Lille', 'achat immobilier', 'marchand de biens']),
    status: 'published',
  },
];

// Export des données pour autoSeed dans server.js
export { articles as BLOG_ARTICLES_A1_A6 };

async function seedBlogArticles() {
  console.log('[SEED] Insertion des articles A1 et A6...');

  for (const article of articles) {
    try {
      await pool.query(
        `INSERT INTO blog_articles (id, title, slug, excerpt, content, cover_image, author, tags, status, published_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
         ON CONFLICT (slug) DO UPDATE SET
           title = EXCLUDED.title,
           excerpt = EXCLUDED.excerpt,
           content = EXCLUDED.content,
           cover_image = EXCLUDED.cover_image,
           author = EXCLUDED.author,
           tags = EXCLUDED.tags,
           status = EXCLUDED.status,
           published_at = COALESCE(blog_articles.published_at, NOW()),
           updated_at = NOW()`,
        [
          article.id,
          article.title,
          article.slug,
          article.excerpt,
          article.content,
          article.cover_image,
          article.author,
          article.tags,
          article.status,
        ]
      );
      console.log(`  [OK] ${article.slug}`);
    } catch (err) {
      console.error(`  [ERREUR] ${article.slug} :`, err.message);
    }
  }

  console.log('[SEED] Terminé.');
  await pool.end();
}

// Ne s'exécute que si lancé directement (pas à l'import)
import { fileURLToPath } from 'url';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  seedBlogArticles();
}
