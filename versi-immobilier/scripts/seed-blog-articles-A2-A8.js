/**
 * Seed script — Insère les articles A2 et A8 dans la table blog_articles.
 * Idempotent : ON CONFLICT (slug) DO UPDATE.
 *
 * Usage : node scripts/seed-blog-articles-A2-A8.js
 */

import pool from '../db.js';

const articles = [
  {
    id: 'appartement-renove-marchand-de-biens-garanties',
    title: 'Appartement rénové par un opérateur vs bien de particulier : les vraies différences',
    slug: 'appartement-renove-marchand-de-biens-garanties',
    excerpt: "Garantie décennale, dommage-ouvrage, traçabilité des travaux : ce que vous obtenez quand vous achetez un bien rénové par un professionnel — et pas par un particulier.",
    content: `# Appartement rénové par un opérateur vs bien de particulier : les vraies différences

Quand un particulier revend un appartement qu'il a rénové, il ne vous doit aucune garantie sur les travaux. Quand un professionnel le fait, la situation est radicalement différente. Les garanties existent. Elles durent. Elles jouent en votre faveur.

Le mot "rénové" dans une annonce ne dit pas grand-chose par lui-même. Ce qui compte, c'est le statut de celui qui a fait réaliser les travaux — et les obligations légales qui en découlent.

---

## Ce que vous obtenez quand vous achetez à un particulier

Un particulier qui a fait rénover son appartement avant de vendre peut légitimement décrire le bien comme "rénové". Ce qu'il ne peut pas toujours vous garantir : que les artisans étaient couverts par une assurance décennale, que les travaux ont été réceptionnés formellement, que les documents sont disponibles.

Sur les vices cachés, il a une obligation légale : vous informer des défauts qu'il connaît. Si le défaut était apparent ou s'il ne pouvait pas le connaître, cette protection ne s'applique pas.

Sur les travaux eux-mêmes, aucune obligation de vous couvrir. Il n'a pas nécessairement souscrit une assurance dommage-ouvrage — ce n'est pas obligatoire pour un particulier qui fait réaliser des travaux pour lui-même.

Résultat : vous achetez un appartement dont vous ne savez pas avec certitude qui a fait quoi, avec quelle assurance, ni quels recours vous aurez si quelque chose se passe.

---

## Ce que vous obtenez quand vous achetez à un professionnel

Un [marchand de biens à Lille](/blog/marchand-de-biens-lille-acquereur) est maître d'ouvrage. Il a commandé les travaux, réceptionné les chantiers, signé les procès-verbaux avec les entreprises. Ce statut active des obligations légales dont vous bénéficiez directement.

**La dommage-ouvrage est obligatoire.** Un marchand de biens qui fait réaliser des travaux importants doit souscrire une assurance dommage-ouvrage avant le démarrage du chantier.

**Les attestations d'assurance décennale sont traçables.** Les artisans transmettent leurs attestations à la réception. Ces documents font partie du dossier de l'opération.

**Le dossier de travaux existe.** Chaque intervention est documentée : entreprise, nature des travaux, date d'intervention. Ce dossier est transmissible à l'acheteur.

---

## La garantie décennale : 10 ans de couverture sur les travaux

La garantie décennale est régie par l'article 1792 du Code civil. Elle couvre pendant dix ans les désordres qui compromettent la solidité de l'ouvrage ou le rendent impropre à sa destination — structure, toiture, étanchéité, réseaux selon la nature des travaux réalisés.

Elle est souscrite par les entreprises qui ont réalisé les travaux. Quand un marchand de biens fait intervenir un professionnel du bâtiment, ce professionnel est tenu de fournir son attestation décennale à la réception du chantier.

Concrètement pour vous : si un désordre couvert par la décennale apparaît dans les dix ans suivant la réalisation des travaux, vous avez un recours direct contre l'entreprise concernée. Ce recours existe parce qu'un professionnel a supervisé les travaux dans les règles.

Dans une transaction entre particuliers, cette protection peut ne pas s'appliquer — notamment si les travaux ont été réalisés par le propriétaire lui-même ou par des artisans sans attestation.

---

## L'assurance dommage-ouvrage : une indemnisation sans bataille juridique

L'assurance dommage-ouvrage (DO) est une obligation légale issue de la loi Spinetta de 1978. Elle est souscrite par le maître d'ouvrage avant le début du chantier.

Son rôle est distinct de la garantie décennale : elle ne désigne pas le responsable. Elle garantit une indemnisation rapide en cas de sinistre relevant de la décennale, sans attendre qu'un tribunal statue. L'assurance DO verse en premier. Les recours entre assureurs se règlent ensuite, sans vous impliquer.

Pour vous en tant qu'acquéreur : si un désordre décennal survient sur votre appartement, vous n'attendez pas une procédure pour obtenir réparation. L'assurance prend en charge rapidement.

Un particulier n'est pas systématiquement tenu de souscrire une DO pour des travaux réalisés sur son bien propre. Ce mécanisme de protection n'est donc pas disponible dans toutes les transactions entre particuliers.

---

## La traçabilité des travaux : ce que vous pouvez exiger avant de signer

Avant de signer chez un marchand de biens, vous pouvez demander des documents précis :

- La liste des entreprises intervenues avec leurs attestations d'assurance décennale
- Le détail des travaux réalisés (lots concernés, dates d'intervention)
- L'attestation dommage-ouvrage souscrite pour l'opération
- Les diagnostics techniques réalisés avant et après travaux

Ces documents vous permettent d'évaluer la qualité de l'opérateur avant de vous engager. Ils constituent aussi une base documentée si un problème survient après l'achat.

Un particulier vendeur n'a pas toujours conservé ces documents — ou les travaux ont été réalisés sans suivi formel.

Chez Versi Immobilier, ces informations font partie du dossier de chaque opération. Vous pouvez consulter [nos réalisations](/realisations) pour voir comment nous documentons chaque transformation.

Pour savoir précisément quoi demander lors de votre premier contact avec un opérateur, nous détaillons [les questions à poser avant de signer](/blog/questions-marchand-de-biens-acheteur).

---

Les garanties ne se voient pas dans les photos d'annonce. Elles se lisent dans le dossier de l'opération. C'est ce dossier qui distingue un appartement rénové par un professionnel d'un appartement rénové par un particulier — pas les finitions.

[Voir nos biens disponibles](/nos-biens)

---

*Par l'équipe Versi — Maxime, Thomas & Carl*`,
    cover_image: null,
    author: 'Équipe Versi — Maxime, Thomas & Carl',
    tags: JSON.stringify(['garanties', 'acquéreur', 'rénovation', 'marchand de biens']),
    status: 'published',
  },
  {
    id: 'questions-marchand-de-biens-acheteur',
    title: '5 questions à poser à un marchand de biens avant de signer',
    slug: 'questions-marchand-de-biens-acheteur',
    excerpt: "Garantie décennale, dommage-ouvrage, historique de l'opération, artisans intervenus, délai de livraison : les 5 questions que vous ne poserez pas à un vendeur classique — mais que vous devez poser à un marchand de biens.",
    content: `# 5 questions à poser à un marchand de biens avant de signer

Acheter chez un [marchand de biens](/blog/marchand-de-biens-lille-acquereur) n'est pas la même chose qu'acheter à un particulier ou à une agence. Les questions à poser ne sont pas les mêmes non plus. Les listes génériques "questions à poser lors d'une visite" ne couvrent pas ce qui compte vraiment dans ce type de transaction — les garanties professionnelles, l'historique d'opération, la traçabilité des travaux.

Voici les 5 questions que seul un marchand de biens peut — et doit — vous répondre.

---

## Question 1 — L'opération est-elle couverte par une assurance dommage-ouvrage ?

**Ce que vous demandez :** "Avez-vous souscrit une assurance dommage-ouvrage avant le démarrage des travaux ? Pouvez-vous m'en transmettre l'attestation ?"

**Pourquoi cette question est MDB-spécifique :** La dommage-ouvrage (DO) est une obligation légale pour tout maître d'ouvrage professionnel qui fait réaliser des travaux de construction ou de rénovation lourde (loi Spinetta, 1978). Un particulier qui rénove son bien propre n'y est pas systématiquement soumis dans les mêmes conditions. Un marchand de biens, si.

**Ce que vous obtenez si la réponse est oui :** En cas de sinistre relevant de la garantie décennale, l'assurance DO indemnise rapidement, sans attendre qu'un tribunal désigne un responsable. Vous ne supportez pas l'attente de procédures judiciaires pour obtenir réparation.

**Ce que la réponse vous dit sur l'opérateur :** Un marchand de biens qui n'a pas souscrit de DO, ou qui ne peut pas vous en remettre l'attestation, n'a pas conduit l'opération dans les règles. C'est une information décisive avant de signer.

Pour comprendre en détail ce que ces garanties changent pour vous, l'article [les garanties d'un appartement rénové par un professionnel](/blog/appartement-renove-marchand-de-biens-garanties) développe le sujet.

---

## Question 2 — Quelles entreprises ont réalisé les travaux, et sont-elles couvertes par une décennale ?

**Ce que vous demandez :** "Pouvez-vous me communiquer la liste des entreprises intervenues sur ce bien, avec leurs attestations d'assurance décennale ?"

**Pourquoi cette question est MDB-spécifique :** La garantie décennale (art. 1792 du Code civil) couvre les désordres compromettant la solidité de l'ouvrage ou le rendant impropre à sa destination pendant dix ans après réception du chantier. Elle est souscrite par chaque entreprise pour les travaux relevant de son domaine — électricité, plomberie, charpente, selon les interventions.

Vous devez pouvoir identifier les entreprises pour exercer un recours si nécessaire. Sans cette liste, la garantie décennale reste théorique.

**Ce que vous obtenez si la réponse est complète :** Un dossier de travaux avec les attestations décennales des artisans intervenus, valable pendant la durée restante de la garantie à compter de la date de réception du chantier.

**Ce que la réponse vous dit sur l'opérateur :** Un opérateur sérieux a ce dossier constitué. S'il ne peut pas vous le fournir avant la signature, posez-vous la question de la rigueur avec laquelle l'opération a été conduite.

---

## Question 3 — Quel était l'état du bien avant les travaux, et quel est son historique ?

**Ce que vous demandez :** "Quel était l'état du bien à l'acquisition ? Quels diagnostics ont été réalisés avant les travaux ? Avez-vous un rapport de l'état initial ?"

**Pourquoi cette question est MDB-spécifique :** Un marchand de biens conduit une analyse du bien avant d'acquérir. Il sait ce qu'il a acheté — état du bâti, diagnostics, situation de copropriété. Ces informations font partie de sa décision d'investissement. Il peut donc vous les transmettre.

Un particulier qui a acheté son appartement il y a dix ans et l'a rénové progressivement n'a pas nécessairement cette vision consolidée de l'état initial.

**Ce que vous obtenez si la réponse est documentée :** Une image claire de ce qu'était le bien avant transformation — qui vous permet d'évaluer l'ampleur réelle des travaux réalisés et leur pertinence.

**Ce que la réponse vous dit sur l'opérateur :** Elle vous montre comment il travaille. Un opérateur qui documente l'état initial prend l'opération au sérieux. Un opérateur qui ne peut pas répondre à cette question a peut-être acheté vite et travaillé vite.

---

## Question 4 — Qui a supervisé le chantier, et comment les travaux ont-ils été réceptionnés ?

**Ce que vous demandez :** "Y a-t-il eu un maître d'oeuvre sur ce chantier ? Les travaux ont-ils fait l'objet d'un procès-verbal de réception avec chaque entreprise ?"

**Pourquoi cette question est MDB-spécifique :** La réception du chantier est l'acte par lequel le maître d'ouvrage accepte le travail réalisé par chaque entreprise (art. 1792-6 du Code civil). C'est à partir de cette date que courent les garanties — biennale pour les équipements, décennale pour le gros oeuvre. Sans réception formalisée, les garanties sont plus difficiles à faire valoir.

**Ce que vous obtenez si la réponse est rigoureuse :** Des procès-verbaux de réception datés, une date de départ claire pour vos garanties, et la preuve que le chantier a été suivi sérieusement.

**Ce que la réponse vous dit sur l'opérateur :** La réception formelle est une étape que les opérateurs peu structurés négligent. Si votre interlocuteur ne sait pas répondre à cette question, les garanties dont vous bénéficierez seront plus difficiles à activer.

---

## Question 5 — Quel est le délai entre la signature du compromis et la livraison du bien ?

**Ce que vous demandez :** "Si le bien n'est pas encore livré, quel est le délai prévu entre la signature du compromis et la remise des clés ? Ce délai est-il contractualisé ?"

**Pourquoi cette question est MDB-spécifique :** La précommercialisation — acheter un bien en cours de transformation — est une des particularités de l'achat chez un marchand de biens. Vous pouvez accéder à un bien avant sa mise en vente publique, mais vous assumez une incertitude sur le délai de livraison.

Un opérateur sérieux vous communique un délai réaliste, fondé sur l'avancement du chantier. Il ne vous promet pas une livraison en trois semaines si le chantier n'est pas commencé.

**Ce que vous obtenez si la réponse est précise :** Un engagement contractuel ou, a minima, un cadrage clair — qui vous permet de planifier votre déménagement, votre financement, et votre situation locative actuelle.

**Ce que la réponse vous dit sur l'opérateur :** La gestion des délais est un indicateur de fiabilité opérationnelle. Un opérateur qui ne peut pas cadrer ses délais ne maîtrise pas son chantier. Consultez [nos biens disponibles](/nos-biens) pour voir l'état actuel de chaque opération en cours.

---

Ces cinq questions ne remplacent pas la visite, ni l'analyse du bien lui-même. Elles vous permettent d'évaluer l'opérateur avant de vous engager — et de distinguer les opérateurs structurés de ceux qui ne le sont pas.

Chez Versi Immobilier, nous répondons à ces questions pour chaque bien que nous vendons. Si vous voulez les poser directement :

[Nous contacter](/contact)

---

*Par l'équipe Versi — Maxime, Thomas & Carl*`,
    cover_image: null,
    author: 'Équipe Versi — Maxime, Thomas & Carl',
    tags: JSON.stringify(['acquéreur', 'questions', 'marchand de biens', 'guide']),
    status: 'published',
  },
];

async function seedBlogArticles() {
  console.log('[SEED] Insertion des articles A2 et A8...');

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

seedBlogArticles();
