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

### Qualité — 10/10 strict, non négociable (consolidé s10/s13/s22/s23/s24)
- **Objectif toujours 10/10**, jamais 8/10 ni 9/10 "car plafond". Citation : "Inutile de me proposer 8/10 merci". Itérer jusqu'à atteinte OU documenter précisément le plafond technique avec recommandation de changement d'approche (passer à 2-pass, post-process OCR, etc.).
- **Unanimité 10/10** : chaque agent auditeur note 10/10 avant étape suivante. Pas de moyenne pondérée. Tant qu'au moins 1 agent < 10/10 → itérer.
- **Agents les plus sévères = `@moi` et testeurs-persona.** Leur verdict GO/NO-GO est bloquant. Un 8/10 chez `@moi` = NO-GO.
- **Pixel-parfait sur TOUS les critères listés**, pas "ça marche globalement". 3/4 critères OK ≠ succès. Itérer jusqu'à conformité stricte sur chaque critère.
- **Petits points cosmétiques** doivent être corrigés. Zéro dette technique tolérée.
- **Honnêteté > sur-promesse** : rapport post-session = résultats empiriques + limites connues + voies non explorées, pas claim 10/10 non prouvé.

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

### Délégation aux agents (consolidé s12/s24)
- **Délégation = principe non négociable.** Thomas préfère relancer 3 fois un agent spécialisé plutôt que l'orchestrateur écrive le code lui-même. L'orchestrateur ne doit écrire du code que si 3+ tentatives d'agents ont échoué ET qu'un audit agent suit immédiatement.
- **`@orchestrator` = interlocuteur principal de Thomas** pour toute demande, même technique. L'orchestrator décide ensuite qui déléguer (`@fullstack`, `@ia`, `@qa`...). Ne pas inviter Thomas à s'adresser directement à un sous-agent.
- **Face à un plafond technique** (prompt qui plafonne, algo qui rate), déléguer `@ia` plutôt qu'itérer seul. Cible privilégiée : prompts IA, algos géométriques (power diagram, convex hull), post-process, design API.

### Décisions identité & branding (s10)
- **Bleu #1B3A5C rejeté** — palette unique écosystème Versi (charcoal + stone). Pas de couleur d'accent par entité.
- **Off-market pas systématique** — ne jamais présenter comme promesse principale.
- **"Thèse" rejeté** — mot trop académique. Préfère "Le regard Versi".
- **Autonomie = IA end-to-end** — automatisation IA qui génère, audite et publie seule.
- **Processus métier = vérité fondateur** — les 8 étapes dictées par Thomas.
- **H1 court** — pattern versi.fr "Quatre métiers. Un cycle maîtrisé." 2 lignes max.
- **Description versi.fr sacrée** — ne pas modifier sans demande explicite.
- **Stats fondateur volatiles** — toujours utiliser les derniers chiffres communiqués (état s26 : 21 rénovations, 3,2M€).

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

### Reality check visuel BLOQUANT (consolidé s22/s23/s25/s26)
- **Tests PASS ≠ feature valide.** Validation "10/10" superficielle possible sans comparaison visuelle pixel-près. Exemple s25 : rectangles IA ne collaient pas aux murs malgré 125/125 tests PASS.
- **Reality check VISUEL exige** : (1) génération sur vraies données (pas mocks), (2) comparaison œil-à-œil avec référence attendue (vrais murs, vrais lots, proportions correctes), (3) screenshot Playwright preuve obligatoire pour tout fix UI, (4) comparaison pixel-par-pixel vs référence terrain ou snapshot validé.
- **Mocks OK pour pipeline, PAS pour GO PRODUCTION qualité IA.** Distinguer (3a) reality check E2E pipeline (mocks OK, valide flux données+UI) et (3b) reality check E2E qualité IA réelle (vraie API obligatoire). Score GO 4/4 exige (3a) + (3b) tous deux PASS.
- **Ressources fournies = utilisation IMMÉDIATE, pas spéculation.** Quand Thomas fournit clé OpenAI + plan PDF, l'utiliser maintenant, pas spéculer.
- **Pixel-parfait pré-commit** : longueurs paragraphes vs voisins, hero photo vs promesse marchand, ordre visuel des cartes, alignement chiffres. Voir `_base-agent-protocol.md` section "Règles s26" pour la règle BLOQUANTE.

### Pas de modification silencieuse du workflow métier
Thomas doit pouvoir naviguer librement entre étapes déjà complétées SANS revalidation. Un retour en arrière pour consulter ne doit pas casser l'avancée.

**Règle** : quand une étape est complétée (status en DB), le stepper doit la marquer cliquable indéfiniment. Le retour en arrière est consultation, pas modification. L'utilisateur peut avancer de nouveau sans re-cliquer sur "Valider".

## Session 2026-04-20 (versi-s23) — Nouvelles préférences observées

- [PRÉFÉRENCE FONDATEUR] **Thomas refuse toute proposition de clôture de session à 50% du budget Task**. "Arrête de me proposer de clôturer une session à 50% de tasks consommées, c'est pas ok". Règle : ne PAS évoquer la clôture tant que Thomas ne l'a pas demandée OU que budget ROUGE (18 Task) atteint.

- [PRÉFÉRENCE FONDATEUR] **Thomas veut qu'on lui POSE des questions quand le contexte est incertain**, pas qu'on devine. "Si quelque chose pas clair demande moi, mais stp ça fait 6 fois je remonte ce même souci". Règle : après 2 tentatives échouées sur le même bug, l'agent DOIT poser 3 questions ciblées avant de continuer.

- [PRÉFÉRENCE FONDATEUR] **Thomas exprime sa frustration de façon directe ET répétée**. Quand il remonte un bug 6 fois, c'est qu'il n'a pas été écouté/compris. Signal d'alarme : quand Thomas dit "je repete", "je te redis", "6 fois", l'agent DOIT immédiatement changer d'approche (test E2E réel, questions précises) plutôt que continuer sur la même piste.

- [PRÉFÉRENCE FONDATEUR] **Thomas valorise l'HONNÊTETÉ sur les limites plutôt que la sur-promesse**. Quand @ia a rendu 7/10 honnête avec plafond prompt-only documenté, Thomas a accepté la limite et demandé la solution code-level. Règle : rapport post-session = résultats empiriques + limites connues + voies non explorées, pas claim 10/10 non prouvé.


## Session s24 (2026-04-21) — nouvelles préférences capturées

- [PRÉFÉRENCE FONDATEUR] **Thomas refuse que l'orchestrator renvoie vers lui pour tester tant que le travail n'est pas fini**. "Arrête de me demander de tester tant que ce n'est pas fini". L'orchestrator teste lui-même (Postgres local + curl + Playwright) entre itérations, pas Thomas. Seule exception : quand Thomas a explicitement demandé une validation chez lui (ex : "redéploie et vérifie en prod").

- [PRÉFÉRENCE FONDATEUR] **Thomas ne veut PAS de détails sur ce que l'orchestrator a fait**. "Ne me détaille pas ce que tu as fait, teste plutôt ce que je demande et confirme le à 100%". Réponses orientées résultat + preuve empirique (screenshots, metrics DB, tests E2E). PAS de récit étape-par-étape du process. Thomas valide sur visuel/metrics, pas sur discours.


---

## Session s25 (2026-04-23) — nouvelles préférences capturées

### Refus "à moitié fait" — exigence cycle complet testé
Thomas répète 2× en session : "pourquoi crois-tu que je veux quelque chose à moitié fait ?". Anti-pattern : livrer du code + feature flag OFF + demander à Thomas d'activer/tester sans avoir validé la feature downstream complète.
**Règle** : si une feature nécessite activation runtime externe (OpenAI key, KYC), @orchestrator doit MOCKER cette activation en local pour valider pipeline entier, pas seulement code isolé. Pattern `VS_USE_MOCK_CANONICAL` + `VS_USE_MOCK_EXTRACTOR` validé s25.

### Zéro jargon technique dans l'UI persona — mot pivot métier (consolidé s23/s25)
- **Mot pivot métier obligatoire** : "lot" (pas "polygone", "contour", "zone"), "Dessiner un lot" (pas "Tracer un contour libre"). Le mot pivot est celui que le persona utilise dans une conversation métier quotidienne.
- **Termes bannis** : "polygone", "zone", "calque", "contour", "vectoriel", "reformatage", "canonicalisation". Aucun de ces mots ne doit apparaître dans l'UI client/persona.
- **Test obligatoire** : "Un marchand de biens (ou le persona cible) comprend-il ce mot en 2 secondes sans googler ?". Si NON → remplacer par mot métier OU supprimer la section. Verbatim Thomas : "quelqu'un a-t-il réfléchit à ce que voit et comprend nos personas ?".
- **Vérification** : `grep <jargon-technique>` sur HTML rendu = 0 occurrence obligatoire dans chaque PR UI.

### Préférence suppression radicale > patch sur patch
Face à une solution tiède (renommage/reformulation) vs solution radicale (suppression/refonte), Thomas pénalise le "à moitié réformé". Exemples s25 : étape "Reformatage" → SUPPRIMER (pas renommer "Préparation"), prompt v6+v7 empilé → v8 RADICAL (pas ajouter v6.5), bannières techniques → SUPPRIMER (pas reformuler).
**Règle orchestrator** : face à divergence agents, défaut = solution radicale. Exception : coût >3× effort OU impact négatif non-mitigeable prouvé.

### Feature invisible au persona = feature à supprimer
Contre-exemple du pattern découvrabilité s22 ("boutons permanents visibles") : si une étape UI ne permet PAS au persona de décider ou d'agir métier, elle doit être SUPPRIMÉE, pas renommée.
s25 : étape "Reformatage" ajoutée avec comparateur avant/après → Thomas ne pouvait pas juger/rejeter → source de confusion ("Reformatage indisponible"). Solution : suppression complète, canonicalisation devient invisible backend.
**Règle UX** : chaque étape UI doit permettre une DÉCISION ou ACTION métier du persona. Sinon SUPPRIMER. Préférer silence métier > message technique.


### Compléter ≠ remplacer (s26)
Quand Thomas dit "ajouter X mots", il veut X et SEULEMENT X — la phrase d'origine reste intacte. Toute amélioration "pour bien expliquer" est rejetée comme "bloc moche pas revu".
Exemples s26 : (a) homepage step 03 simulation, demandé "ajouter Cashflow/TRI/CoC", livré 80 mots de hints longs → REJETÉ, (b) ProcessPage step 03 idem, restauration version originale + 2 mots ajoutés UNIQUEMENT.
**Règle copywriter** : pour toute édition demandée avec mots précis, identifier le pattern source (ex. "Rendement brut, net, net-net") et compléter EN SUITE (ex. "Rendement brut, net, net-net, cashflow, TRI, CoC"), pas remplacer.

### Solution propre et durable JAMAIS quick fix (s26)
Quand on lui propose un patch cosmétique (lazy load + resize 1600px en bandage), Thomas répond textuellement : *"à l'équipe de travailler l'architecture, pas à moi. Solution propre et durable".*
Exemple s26 : pages versi-immobilier lentes (262 Mo base64 DB) → quick win refusé, vraie solution = pré-compilation locale + commit JPEG + drop sharp runtime + manifest source de vérité (cf. commits `bfd864b` à `ffec913`).
**Règle infrastructure + fullstack** : avant de proposer un quick fix, designer la vraie architecture cible. Si quick fix nécessaire (incident prod), le marquer explicitement "TEMPORAIRE — refactor durable au prochain sprint" + ticket de suivi.

### Chiffres ronds en communication publique (s26)
Thomas préfère les chiffres ronds pour la lisibilité commerciale : emprunt 660 639 € → 660 000 € sur fiche publique. Exception : chiffres exacts du PDF/acte notarié (frais notaire 60 639 € = chiffre officiel).
**Règle copywriter + creative-strategy** : pour toute valeur €/m²/% sur livrable client-facing, arrondir à la dizaine ou centaine selon ordre de grandeur, sauf si chiffre = donnée officielle traçable (acte notarié, contrat). Noter dans le commit message la source de la valeur.

### Anonymisation adresses fiches publiques (s26)
Thomas exige que les fiches refs publiques NE JAMAIS afficher l'adresse complète. "Immeuble situé au 46 rue d'Arras à Lille" → "Immeuble situé à Lille (59)". Le nom de la SCI propriétaire (MMM/MMO/MLV) est acceptable car déjà sur le PDF descriptif partagé.
Sécurité fondateur : protection du portfolio + éviter les visites non sollicitées.
**Règle copywriter + reviewer** : grep adresse postale (numéro + rue) sur tout livrable client-facing avant push. 0 occurrence obligatoire pour fiches refs immobilières.

### Hero photo = photo qui fait cliquer (s26)
Pour Thomas, le hero d'une fiche immobilière publique doit donner envie au prospect. Hiérarchie qualité : (1) espace de vie meublé > (2) espace de vie vide propre > (3) cuisine équipée > (4) chambre meublée > (5) détail (SDB/cuisine vide). À éviter en hero : chambre vide parquet brut, fenêtre stores baissés, recoin avec foyer brut, vue technique.
Verbatim s26 sur friedland-2eme-droite : *"regarde celle de friedland, c'est une catastrophe. On doit prendre la plus belle photo apres."*
**Règle creative-strategy + design** : pour toute fiche refs avec galerie photos, sélectionner manuellement le hero = LA meilleure photo "après". Si une photo est médiocre dans le pool, la retirer même si on descend à 2 photos après (qualité > quantité). Pattern audit @moi via Read multimodal direct (copie /tmp/<slug>.jpg ASCII-only) validé s26.

### Versi Studio = meilleur outil du marché pour marchand de biens (s27)
Verbatim Thomas s27 : *"on veut être le meilleur outil du marché pour marchand de biens. C'est super important garde en mémoire. Alors ne décide rien qui va à l'encontre de ça."* + *"L'outil doit pouvoir s'adapter à tous les PDF qu'on reçoit : vectoriel, bitmap, image."*
**Règle ia + fullstack + orchestrator** : pour toute décision technique pipeline plan-extractor, **précision > facilité**. JAMAIS de pivot vers solution moins précise pour contourner un bug d'environnement (ex : skip pdfjs vector pour utiliser bitmap-only = drift 1-3px → REJETÉ). Le pipeline doit être déterministe et précis sur TOUS les types de PDF (vectoriel ET bitmap), pas l'un OU l'autre. Si un module est cassé en SSR Next.js Turbopack → fixer la cause root (polyfills, externals, subprocess Node natif), pas dégrader le résultat.

### Modèles OpenAI imagés — gpt-image-2 obligatoire, JAMAIS gpt-image-1 (s27)
Verbatim Thomas s27 : *"Merci d'utiliser gpt-image-2 et pas 1 !! J'ai déjà dit ça."* Cette préférence est apparue dès le mémo s26→s27 (`OPENAI_API_KEY images.edit autorisée sur gpt-image-2`) et a été ratée 2 fois (par @ia en s25 puis @orchestrator en s27).
**Règle ia + fullstack + orchestrator** : sur tout appel `openai.images.*` de Versi Studio (et tout site Versi futur), utiliser `gpt-image-2` exclusivement. Avant tout commit qui touche un module canonicalizer/visual-generator/image-IA → grep `gpt-image-1` dans le diff = STOP. Si gpt-image-2 échoue empiriquement, l'investigation se fait au niveau prompt/hyperparamètres/org KYC, **PAS** par fallback sur gpt-image-1.

### Pas de fallback automatique sur tâches IA critiques (s27)
Verbatim Thomas s27 : *"Je ne veux pas de fallback. Je veux que ça marche bien c'est tout."* Refus explicite de la stratégie "si X échoue → bascule auto sur Y dégradé". Préfère un échec visible + investigation que une chaîne de fallbacks qui masque le vrai problème.
**Règle ia + fullstack + orchestrator** : pour toute fonctionnalité où Thomas attend une qualité prod, NE PAS implémenter de fallback automatique vers une approche dégradée (ex: sharp à la place de gpt-image-2). Si l'IA primaire échoue → log explicite + fallback original (renvoie le buffer brut + `fallback: true` + raison) pour que Thomas voie le problème et le résolve à la source. Le pattern `Reality check VISUEL BLOQUANT` (cf. section dédiée) s'applique : Thomas doit pouvoir constater empiriquement que ÇA MARCHE, pas qu'on a un filet de sécurité.

