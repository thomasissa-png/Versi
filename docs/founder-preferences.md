# Préférences Fondateur — Thomas Issa

> Source de vérité pour l'agent @moi.
> Mis à jour automatiquement depuis `docs/lessons-learned.md` (catégorie "préférence fondateur").
> Dernière mise à jour : 2026-04-13

## Préférences validées

### Animation & Motion
- **Hero = fade global 300ms ease-out** sur TOUS les sites Versi. Pas de cascade, pas de scroll hint, pas d'animations séquentielles décalées. Le mouvement doit être invisible, pas démonstratif. Pattern canonique : `src/src/components/Hero.jsx`.
- Animation institutionnelle/premium : un seul fade global, pas de SaaS-style stagger.

### Copywriting
- **Taglines immédiatement compréhensibles.** Pas de formule abstraite ("Zéro posture") même si elle est dans le ton de marque. Test : si Thomas ne comprend pas, Laurent non plus.
- "Trois fondateurs. Quarante ans de terrain." validé — concret, factuel, crédible.
- "Trois associés. Zéro posture." rejeté — "je comprends pas trop cette phrase".

### Infrastructure & Déploiement
- **Replit deploymentTarget = "autoscale"** toujours. Ne jamais modifier sans accord explicite.
- Configuration Replit = décision fondateur, pas décision technique.

### Navigation
- Menu versi.fr : VISION, ACTIVITÉS, APPROCHE, ÉQUIPE, CONTACT. IMPLANTATION supprimé (trop vide pour l'instant).
- APPROCHE toujours présent dans le menu.

### Analytics
- **Umami Analytics uniquement.** Jamais Plausible, jamais GA4. Umami est cookieless, RGPD-exempt, hébergé EU. Toute mention de Plausible dans le code ou les docs client-facing doit être remplacée par Umami.

### Qualité
- **Objectif toujours 10/10.** Thomas exige l'itération des audits jusqu'à 10/10. Pas de "suffisant" ni de "GO conditionnel accepté". Citation : "fais itérer jusque 10/10" puis "Fixe même les petits points". Les agents doivent viser l'excellence dès la première passe.
- Même les "petits points" cosmétiques doivent être corrigés. Pas de dette technique tolérée.

### Back office & Admin
- **Nav + Footer du site public sur toutes les pages admin.** Thomas veut que le back office fasse partie du site, pas une app séparée. Citation : "garde le header et footer en permanence sur toutes les pages, pour qu'on ait l'impression d'être sur le site".

### Contenu & Blog
- **Content marketing terrain = validé.** Thomas voit chaque réalisation comme une histoire à raconter. Citation : "On est des marchands, on peut avoir de jolies histoires à raconter sur l'acquisition, la rénovation etc." Le blog doit être factuel et narratif, pas du marketing générique.

### Positionnement éditorial (blog & contenu)
- **Experts marchands de biens Hauts-de-France.** Le positionnement éditorial cible = être reconnu comme les grands experts MDB des Hauts-de-France. Également présents en région parisienne mais en montants plus modestes — ne pas surjouer la taille sur l'IDF.
- **Super qualitatifs, pros, qui savent ce qu'ils font.** Chaque article, chaque contenu doit transpirer la maîtrise métier. Pas de contenu générique copié d'un blog immobilier lambda. Le lecteur doit sentir que les auteurs font ce métier tous les jours.
- **Respect des fournisseurs, partenaires et acquéreurs.** Le ton n'est jamais condescendant, jamais commercial agressif. On parle aux gens comme à des adultes intelligents. On respecte l'écosystème (artisans, notaires, courtiers, acquéreurs).
- **"Pas des clowns."** Zéro humour forcé, zéro ton startup/cool, zéro emoji, zéro exclamation. Sérieux sans être ennuyeux. Confiant sans être arrogant. Le contenu doit donner envie de travailler avec Versi, pas de liker un post.
- **Objectif éditorial = top-of-mind dans la zone de chalandise.** L'objectif ultime du contenu : que les gens pensent toujours à Versi en premier dans la zone (Hauts-de-France + IDF). Deux axes : (1) capter les acquéreurs qui veulent acheter des biens, (2) capter les vendeurs/apporteurs qui veulent proposer des biens à Versi. Le blog et le contenu doivent servir ces deux flux simultanément.

### Transparence financière
- **Références : prix de vente uniquement, JAMAIS les marges.** Thomas refuse catégoriquement d'exposer la structure financière des opérations (prix d'achat, montant travaux, marge brute/nette, rendement, ROI). Citation : "pour les références on affiche que les prix de vente. Je ne veux pas qu'on montre nos marges." Gate GR-5 BLOQUANT non négociable. Les champs `buy_price` et `works_amount` restent null dans les seeds.

### Données factuelles
- **Zéro donnée inventée dans les emplacements.** Thomas a demandé explicitement : "Assure toi surtout pour emplacement de bien vérifier les données de distance et de surtout rien inventer." Chaque lieu, distance, établissement dans nearby_transport et nearby_amenities doit être vérifié WebSearch avant commit.

### Process
- Ne pas changer de branche sans vérification. Le fondateur attend que le travail validé soit préservé.

### Email
- **Adresse unique : contact@versi.fr** pour TOUS les sites Versi (versi.fr, versi-immobilier.fr, futures entités). Jamais d'adresse spécifique par site (pas de contact@versi-immobilier.fr, pas de formulaire@versi.fr). FROM_EMAIL, CONTACT_EMAIL, CONTACT_EMAIL_VERSI = toujours contact@versi.fr. Insistance multiple du fondateur.

### SEO vs UX
- **Les H1 sont du copywriting, pas du SEO.** Ne JAMAIS modifier un H1 validé par @creative-strategy ou @copywriter pour des raisons SEO. Le SEO passe exclusivement par les meta tags (PageHead title/description), schema.org, robots.txt, sitemap, llms.txt. Le contenu visible est le territoire de @copywriter/@creative-strategy.
- **Titles SEO ≤ 60 chars.** Bing rejette au-delà. Vérifier avec `echo -n "title" | wc -c`.
- **FAQ en bas de page.** Jamais au milieu du parcours de conversion. Position classique : après le contenu principal, avant le dernier CTA.

### Versi Invest (nouvelle entité)
- **Aucun bien affiché publiquement.** Off-market uniquement. CTA = inscription liste d'attente ("s'inscrire pour être recontacté").
- **5% du prix d'acquisition** = seule rémunération. Zéro côté vendeur du bien.
- **Cas d'étude anonymisés** pour les témoignages. Jamais de noms fictifs.
- **Simulateur rendement/cashflow en V1.**
- **Blog séparé** de versi-immobilier, dédié investissement locatif.
- **Pas de back office V1.**

### Délégation aux agents (session s12)
- **Délégation = principe non négociable.** Thomas veut que les agents spécialisés fassent le travail, même si c'est plus lent. Il préfère relancer 3 fois un agent @ia plutôt que l'orchestrateur écrive le code lui-même. L'orchestrateur ne doit écrire du code que si 3+ tentatives d'agents ont échoué ET qu'un audit agent suit immédiatement. Citation : insistance 3 fois dans la même session.

### Session s10 — 2026-04-15
- **Bleu #1B3A5C rejeté** — palette unique pour l'écosystème Versi (charcoal + stone). Pas de couleur d'accent par entité.
- **Off-market pas systématique** — ne jamais présenter comme promesse principale.
- **Stats volatiles** — 7 immeubles, 3,2M€ (au 2026-04-15). Toujours utiliser les derniers chiffres fondateur.
- **Carte T obtenue** — ne plus écrire "en cours d'obtention".
- **"Thèse" rejeté** — mot trop académique. Préfère "Le regard Versi".
- **Autonomie = IA end-to-end** — automatisation IA qui génère, audite et publie seule.
- **Simulateur supprimé** du site V1.
- **Processus métier = vérité fondateur** — les 8 étapes dictées par Thomas.
- **Audits sévères exigés** — les notes complaisantes (8-9/10 premier jet) sont inacceptables.
- **H1 court** — pattern versi.fr "Quatre métiers. Un cycle maîtrisé." 2 lignes max.
- **Description versi.fr sacrée** — ne pas modifier sans demande explicite.
- **Délégation aux agents = principe non négociable** — Thomas veut que les agents spécialisés fassent le travail, même si c'est plus lent (3 relances plutôt qu'écriture manuelle par l'orchestrateur). La qualité de la délégation prime sur la vitesse. (versi-s12)
