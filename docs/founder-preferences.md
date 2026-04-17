# Préférences Fondateur — Thomas Issa

> Source de vérité pour l'agent @moi.
> Mis à jour automatiquement depuis `docs/lessons-learned.md` (catégorie "préférence fondateur").
> Dernière mise à jour : 2026-04-16 (versi-s16 — ajout section Langue française depuis learning versi-s15)

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

### Autopilote qualité (session s13)
- **Unanimité 10/10 — pas de moyenne pondérée.** Thomas veut que CHAQUE agent auditeur note 10/10 avant de passer à l'étape suivante. Pas de "moyenne 8/10 acceptable". Citation : "Chaque agent doit noter chaque étape sur 10. Puis fais corriger et itère jusqu'a ce que chacun soit a 10/10. Une fois la cible atteinte, passe a l'étape suivante. Ne manque rien."
- **Agents les plus sévères = @moi et testeurs-persona.** Leur verdict GO/NO-GO est bloquant. Un 8/10 chez @moi = NO-GO.
- **Itérations tant qu'au moins 1 agent < 10/10.** Pas de "bon assez", pas de "on verra plus tard".

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

### Langue française (session s15)
- **Zéro anglicisme en copy client-facing = P0 bloquant.** Tout anglicisme visible en surface utilisateur est traité comme une typo majeure ou un contraste WCAG FAIL. Non négociable.
- **Liste noire (remplacement obligatoire)** :
  - `upload` / `uploader` / `uploadé` / `uploadez` → `déposer` / `déposé` / `déposez`
  - `download` / `downloader` / `downloadé` → `télécharger` / `téléchargé`
  - `feedback` → `retour` (utilisateur)
  - `meeting` → `réunion` / `rendez-vous`
  - `forwarder` → `transférer` / `transmettre`
- **Exceptions tolérées** (usage FR courant sans équivalent idiomatique) : `scroll` / `scroller`, `clic` / `cliquer`, `email`, `site`, `login` / `logout`, `cookie`.
- **Portée** : code frontend (`.tsx`, `.jsx`), specs user-facing, tests E2E (labels visuels `getByText`), micro-copy, ARIA labels, **messages d'erreur API retournés au client** (`NextResponse.json({ error: "..." })` affichés via `setError(json.error)` — enrichi versi-s16). N'affecte PAS les commentaires code, identifiants techniques, noms de variables/fonctions, noms d'endpoints API.
- **Gate associée** : G33 (BLOQUANT) dans CLAUDE.md. Contrôle par @copywriter, @ux, @seo, @fullstack à chaque livrable.

### Registre Versi Studio (sessions s16, s17)
- **Vous de politesse / impératif neutre.** Pour Versi Studio (outil pro INTERNE), le registre par défaut est "vous" de politesse. Validé par @moi GO absolu versi-s16 (Étape 1 Upload) et re-validé versi-s17 (Étape 2 Lots) malgré la recommandation @copywriter de passer au "tu" canonique. Le "vous" convient au ton pro sobre Versi et préserve la cohérence avec la plateforme B2B Versi Immobilier.
- **Forme privilégiée** : impératif neutre sans sujet explicite ("Vérifiez votre connexion", "Rechargez la page", "Réessayez"). Le "vous" apparaît uniquement dans les messages longs nécessitant une possession ("vos lots", "votre connexion").
- **Règle** : @copywriter ne doit PAS recommander le passage au "tu" sans validation @moi préalable. Le tu n'est pas automatiquement préférable en contexte pro B2B.
- **Scope** : s'applique à Versi Studio uniquement. Les autres entités (Versi Immobilier, Versi Invest) conservent leurs décisions de registre propres.

### Persona → gate finale (mapping session s16)
- **Versi Studio** (outil INTERNE Thomas marchand de biens) → **@moi** (proxy fondateur) — gate finale. Les testeurs-persona externes (Laurent/Sophie/Nicolas) NE S'APPLIQUENT PAS.
- **Versi Immobilier** (B2B2C vendeurs) → **@testeur-persona-sophie** (propriétaire vendeuse).
- **Versi Invest** (investisseurs family office) → **@testeur-persona-laurent** (family office).
- **Versi Invest VI2** (investisseurs particuliers) → **@testeur-persona-nicolas** (investisseur locatif).
- **Règle orchestrateur** : mapper explicitement persona → agent final AVANT le brief. Ne JAMAIS utiliser un testeur-persona externe sur un outil interne.

## Session versi-s21 — Tests exécutés et clôture de session (2026-04-17)

### Tests exécutés, pas juste écrits
- **Thomas refuse tout GO PRODUCTION sans preuve d'exécution des tests.** Quand Thomas dit "Fais bien tester ensuite pour valider" dans un brief, il attend la sortie console réelle (vitest PASS, playwright PASS, tsc OK), pas une lecture de code par les agents.
- **Évidence requise avant toute gate @moi** :
  - `npx tsc --noEmit` → sortie visible "0 erreur" OU liste exacte des erreurs
  - `npx vitest run` → sortie "X/X PASS" avec durée
  - `npx playwright test` → sortie "X/X PASS" avec durée
  - `npm run lint` → sortie 0 erreur prod (warnings tolérés, erreurs legacy `reference-existant/` tolérées mais documentées)
- **Action orchestrateur** : installer `node_modules` dès le début de session si absent (`npm install` en background Phase 0 — n'ajoute pas de Task producteur).
- **Action @qa** : lors de la création de `tests/unit/*.test.ts`, ajouter `vitest` + `@vitest/ui` comme `devDependency` dans `package.json` (pas seulement via `npx`).
- **Action @moi** : refuser tout verdict GO PRODUCTION sans sortie console visible dans la session. Les audits textuels sont nécessaires mais PAS suffisants.

### Clôture de session : milestone ≠ terminal
- **Thomas refuse la clôture après une seule priorité même si GO PRODUCTION.** Quand Thomas liste P1-P5 dans un brief initial, il attend que TOUT soit traité (ou explicitement reporté avec sa validation).
- **GO PRODUCTION sur P1 = milestone, pas terminal session.** Exemple s21 : P1 clustering IA livré 9.37/10 GO, mais P2/P3/P4/P5 du brief initial non traités → Thomas a dit "pourquoi clôture t on ? On vient de commencer ...".
- **Action orchestrateur avant toute proposition de clôture** : 
  1. Grep "P[1-9]" dans le brief initial de la session
  2. Checklist statut de chaque priorité : traitée / reportée explicitement avec validation Thomas / en cours
  3. Si au moins une priorité non couverte → continuer la session, NE PAS proposer clôture
- **Action @moi** : la gate finale valide le livrable PRINCIPAL (P1), pas la session. La clôture de session est une étape distincte qui suit le traitement de toutes les priorités du brief.

## Session versi-s22 (2026-04-17) — Nouvelles préférences fondateur

### Découvrabilité UI : une feature invisible n'existe pas
Thomas a demandé 3+ fois la même feature (zoom Étape 2 avec boutons +/-) avant qu'elle soit livrée visiblement. Le zoom wheel+pan+reset existait dans le code depuis s20 mais sans boutons UI permanents — résultat : Thomas ne la voyait pas et considérait qu'elle n'existait pas.

**Règle** : quand Thomas demande "je ne vois pas la feature X", vérifier la DÉCOUVRABILITÉ UI (boutons visibles en permanence, pas conditionnels), pas seulement l'existence du code. Une feature non-visible = feature inexistante pour l'utilisateur. Cible : toute fonctionnalité importante doit avoir un point d'entrée UI visible dès l'arrivée sur la page.

### Pas de négociation sur la note cible
Quand Thomas demande 10/10, c'est 10/10. Pas 8/10 "car c'est déjà bien", pas 9/10 "car on atteint le plafond technique". Refus explicite : "Inutile de me proposer 8/10 merci".

**Règle** : accepter 10/10 comme objectif absolu. Itérer jusqu'à atteinte (ex: prompt v1→v2→v3 sur transformations structurelles) OU documenter précisément le plafond technique avec recommandation de changement d'approche (ex: passer à 2-pass extraction pour dépasser le plafond 1-passe).

### Minimum de clics par défaut
Thomas a demandé 3 fois avant acceptation que le bouton "Valider tous les lots" et "Passer aux pièces" soient fusionnés en UN seul "Valider et passer aux pièces". Même si logiquement ce sont 2 actions distinctes.

**Règle** : quand 2 actions sont toujours faites séquentiellement par l'utilisateur dans le workflow principal, fusionner en 1 bouton contextuel. Préférer le raccourci au purisme logique. Exception : si les actions peuvent réellement être découplées dans l'usage (ex: "sauvegarder" vs "publier").

### Canvas éditeur = undo/redo obligatoire (Ctrl+Z + boutons UI)
Thomas demande Ctrl+Z + boutons undo/redo UI (pattern Figma/Miro) sur tout canvas où il peut éditer. Pas d'édition "non réversible" tolérée.

**Règle** : tout canvas éditeur (lots, rooms, futurs visuels si éditables) DOIT avoir :
- Hook `useHistory<T>` (ou équivalent) pour tracker les opérations
- Ctrl+Z / Cmd+Z pour undo
- Ctrl+Shift+Z (ou Ctrl+Y) pour redo
- Boutons UI ↶ / ↷ dans la toolbar (pas cachés)
- Stack minimum 50 opérations

### Comparateur avant/après obligatoire sur génération IA
Thomas veut comparer systématiquement la photo source au visuel généré. Pattern "avant/après" standard immobilier pour convaincre un acheteur.

**Règle** : pour toute feature "génération IA" où Thomas montrera le résultat à un tiers (client, prospect, architecte), afficher comparateur avant/après par défaut. Layout 2 colonnes desktop / stack mobile. Labels explicites "Avant" / "Après". Lightbox pour zoom + download par image.

### Reality check visuel ≠ canvas non-vide
Validation "10/10" superficielle possible si reality check n'inclut pas comparaison visuelle pixel-près avec référence attendue. Thomas a montré une capture où les rectangles IA ne collaient pas aux murs malgré une note 10/10 claudienne préalable (canvas affichait bien "quelque chose" mais pas "la bonne chose").

**Règle** : un vrai reality check VISUEL exige (1) génération sur vraies données (pas mocks), (2) comparaison œil-à-œil avec la référence attendue (vrais murs, vrais lots, proportions correctes), (3) mesure quantitative si possible (coverage %, confidence score, etc.). Le constat "le canvas affiche quelque chose" n'est PAS un reality check suffisant.

### Pas de modification silencieuse du workflow métier
Thomas doit pouvoir naviguer librement entre étapes déjà complétées SANS revalidation. Un retour en arrière pour consulter ne doit pas casser l'avancée.

**Règle** : quand une étape est complétée (status en DB), le stepper doit la marquer cliquable indéfiniment. Le retour en arrière est consultation, pas modification. L'utilisateur peut avancer de nouveau sans re-cliquer sur "Valider".
