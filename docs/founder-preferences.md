# Préférences Fondateur — Thomas Issa

> Source de vérité pour l'agent @moi.
> Mis à jour automatiquement depuis `docs/lessons-learned.md` (catégorie "préférence fondateur").
> Dernière mise à jour : 2026-05-07 (s33 — audit dédoublonnage 289 L → cible 150 L).

## Préférences durables (source de vérité)

### Qualité — 10/10 strict, non négociable
- **Objectif toujours 10/10**, jamais 8/10 ni 9/10 « car plafond ». Verbatim : *« Inutile de me proposer 8/10 merci »*. Itérer jusqu'à atteinte OU documenter le plafond technique avec recommandation de changement d'approche.
- **Unanimité 10/10** : chaque agent auditeur 10/10 avant étape suivante (pas de moyenne pondérée). 1 agent < 10/10 → itérer.
- **Agents les plus sévères = `@moi` et testeurs-persona** — verdict GO/NO-GO bloquant. Un 8/10 chez @moi = NO-GO.
- **Pixel-parfait sur TOUS les critères listés**, pas « ça marche globalement ». 3/4 OK ≠ succès.
- **Honnêteté > sur-promesse** : rapport post-session = résultats empiriques + limites + voies non explorées. Pas de claim 10/10 non prouvé.

### Communication & process
- **Réponses orientées résultat + preuve** (pas récit process). Thomas valide sur visuel/metrics, pas sur discours. *« Ne me détaille pas ce que tu as fait, teste plutôt ce que je demande et confirme le à 100% »* (s24).
- **Pas de clôture à 50% du budget Task**. *« Arrête de me proposer de clôturer une session à 50% »* (s23). Ne pas évoquer la clôture tant que Thomas ne l'a pas demandée OU budget ROUGE atteint.
- **Poser des questions plutôt que deviner** quand le contexte est incertain. Après 2 tentatives échouées sur le même bug : 3 questions ciblées.
- **Frustration directe + répétée** = signal d'alarme. Quand Thomas dit *« je répète »*, *« je te redis »*, *« 6 fois »*, l'agent DOIT changer d'approche immédiatement.
- **Délégation = principe non négociable**. Thomas préfère relancer 3 fois un agent spécialisé plutôt que l'orchestrateur écrive le code lui-même. `@orchestrator` = interlocuteur principal, décide ensuite qui déléguer.
- **Solution propre et durable JAMAIS quick fix** (s26). *« à l'équipe de travailler l'architecture, pas à moi. Solution propre et durable »*. Si quick fix nécessaire (incident prod), marquer explicitement « TEMPORAIRE — refactor durable au prochain sprint » + ticket de suivi.

### Reality check & livraison
- **Tests PASS ≠ feature valide** (consolidé s22/s23/s25/s26/s31/s32). Reality check VISUEL pixel-près sur vraies données obligatoire avant tout claim « livré ». Mocks OK pour pipeline, PAS pour GO PRODUCTION qualité IA.
- **Tests exécutés, pas juste écrits** (s21). GO PRODUCTION exige sortie console réelle (`tsc 0 erreur`, `vitest X/X PASS`, `playwright X/X PASS`), pas lecture de code.
- **Refus du « à moitié fait »** (s25). *« pourquoi crois-tu que je veux quelque chose à moitié fait ? »*. Si activation runtime externe nécessaire (key, KYC), MOCKER en local pour valider pipeline entier — pas demander à Thomas d'activer.
- **Test E2E scenario UTILISATEUR avant claim « prêt prod »** (s32). Le scenario complet de l'utilisateur (workflow, pas endpoint isolé), avec données représentatives (rows pre-migration incluses). Si non-testable en local : dire « non vérifiable hors smoke test prod » plutôt que claim faux.
- **« Je ne suis pas là pour débugger »** (s32). À la 2ème itération réactive sur même domaine, STOP patches symptomatiques → audit exhaustif (cf. `.claude/agents/orchestrator.md` Règles s32 + `_base-agent-protocol.md` Règles s32).
- **Clôture = milestone vs terminal** (s21). GO PRODUCTION sur P1 = milestone, pas terminal session. Grep « P[1-9] » dans le brief initial avant toute proposition de clôture.

### Découvrabilité UI & UX
- **Feature invisible = feature inexistante** (s22). Si Thomas dit « je ne vois pas X », vérifier la DÉCOUVRABILITÉ (boutons visibles permanents), pas seulement l'existence du code.
- **Feature invisible au persona = feature à supprimer** (s25). Étape UI qui ne permet ni décision ni action métier → SUPPRIMER, pas renommer. Préférer silence métier > message technique.
- **Suppression radicale > patch sur patch** (s25). Face à divergence agents, défaut = solution radicale. Exception : coût > 3× effort OU impact négatif non-mitigeable prouvé.
- **Minimum de clics par défaut** (s22). 2 actions séquentielles toujours faites ensemble → 1 bouton fusionné.
- **Canvas éditeur = undo/redo obligatoire** (s22). Ctrl+Z/Y + boutons UI ↶/↷ visibles, stack ≥ 50.
- **Comparateur avant/après** (s22) sur toute génération IA destinée à un tiers (client, prospect, architecte). Layout 2 colonnes desktop / stack mobile.
- **Pas de modification silencieuse du workflow** (s22). Stepper : étape complétée = cliquable indéfiniment. Retour en arrière = consultation, pas modification.
- **Pixel-parfait pré-commit** : longueurs paragraphes vs voisins, hero photo vs promesse marchand, ordre visuel des cartes, alignement chiffres.

### Copywriting & langue
- **Taglines immédiatement compréhensibles**. Pas de formule abstraite. Test : si Thomas ne comprend pas, Laurent non plus.
- **Zéro anglicisme en copy client-facing = P0 bloquant** (s15). Liste noire : `upload`/`uploader` → `déposer`, `download` → `télécharger`, `feedback` → `retour`, `meeting` → `réunion`, `forwarder` → `transférer`. Exceptions tolérées : `scroll`, `clic`, `email`, `site`, `login/logout`, `cookie`. Gate G33 BLOQUANT.
- **Vous de politesse / impératif neutre** dans Versi Studio (registre pro INTERNE). @copywriter ne doit PAS recommander le « tu » sans validation @moi préalable.
- **Mot pivot métier obligatoire** (s23/s25). « Lot » (pas « polygone »/« contour »/« zone »), « Dessiner un lot » (pas « Tracer un contour »). Termes bannis dans l'UI : `polygone`, `zone`, `calque`, `contour`, `vectoriel`, `reformatage`, `canonicalisation`. Test : *« Un marchand de biens comprend-il ce mot en 2 secondes ? »*.
- **Compléter ≠ remplacer** (s26). « Ajouter X mots » = X SEULEMENT, phrase d'origine intacte. Pattern source à identifier puis « EN SUITE de ».
- **Pattern UI buttons unifiés** (s27). 2 boutons UI similaires → `Verbe + Objet (variant)`, pas adjectifs imagés. Ex : `Ajouter un lot (forme rectangulaire)` / `Ajouter un lot (forme libre)`. Pas de « rapide / sur mesure / express ».
- **Chiffres ronds en communication publique** (s26). 660 639 € → 660 000 €. Exception : chiffres officiels (acte notarié, contrat) → exact.
- **Anonymisation adresses fiches publiques** (s26). « Lille (59) » au lieu de « 46 rue d'Arras ». Grep adresse postale = 0 occurrence obligatoire avant push.

### Identité, branding, éditorial
- **Bleu #1B3A5C rejeté** (s10) — palette unique écosystème Versi (charcoal + stone). Pas de couleur d'accent par entité.
- **Off-market pas systématique** — ne jamais présenter comme promesse principale.
- **« Thèse » rejeté** — préfère « Le regard Versi ».
- **Autonomie = IA end-to-end** — automatisation IA qui génère, audite et publie seule.
- **H1 court** — pattern versi.fr « Quatre métiers. Un cycle maîtrisé. » 2 lignes max.
- **Description versi.fr sacrée** — ne pas modifier sans demande explicite.
- **Stats fondateur volatiles** — toujours utiliser les derniers chiffres (s26 : 21 rénovations, 3,2M€).
- **Hero photo = photo qui fait cliquer** (s26). Hiérarchie : (1) espace de vie meublé > (2) espace de vie vide propre > (3) cuisine équipée > (4) chambre meublée > (5) détail. Si photo médiocre dans pool : retirer même si on descend à 2 photos après (qualité > quantité).
- **Positionnement éditorial blog** : experts marchands de biens Hauts-de-France (présents IDF mais en montants modestes). Super qualitatifs, pas de jargon, respect fournisseurs/partenaires/acquéreurs. Zéro humour forcé/emoji/exclamation. Top-of-mind : capter acquéreurs ET vendeurs/apporteurs.
- **« Pas des clowns »** — sérieux sans être ennuyeux, confiant sans être arrogant.

### Transparence & données
- **Références : prix de vente uniquement, JAMAIS marges** (Gate GR-5 BLOQUANT). `buy_price` + `works_amount` restent null dans seeds.
- **Zéro donnée inventée dans les emplacements**. Distance, établissement, transport : vérifier WebSearch avant commit.
- **Versi Studio = meilleur outil du marché pour marchand de biens** (s27). *« ne décide rien qui va à l'encontre de ça »*. Précision > facilité. Pipeline doit être déterministe et précis sur TOUS les types de PDF (vectoriel ET bitmap).

### Stack technique imposé
- **Replit deploymentTarget = autoscale** toujours. Ne jamais modifier sans accord explicite. Configuration Replit = décision fondateur, pas technique.
- **Umami Analytics uniquement**. Jamais Plausible, jamais GA4. Cookieless, RGPD-exempt, EU.
- **Email unique : contact@versi.fr** pour TOUS les sites Versi. FROM_EMAIL, CONTACT_EMAIL = toujours contact@versi.fr.
- **gpt-image-2 obligatoire** (s27 — propagé `_base-agent-protocol.md` Règles s27). JAMAIS `gpt-image-1`. Investigation défaillance = niveau prompt/hyperparamètres/org KYC, jamais fallback.
- **Pas de fallback automatique sur tâches IA critiques** (s27 — propagé `_base-agent-protocol.md` Règles s27). Préfère échec visible + investigation que filet de sécurité qui masque le problème.
- **Pas de blocage technique sur dépense IA** (s29 — propagé `fullstack.md` + `product-manager.md` Règles s29). Affichage coût indicatif OK ; blocage technique → REJETÉ. Cap business = crédits utilisateur V3, pas niveau techno.

### SEO vs UX
- **H1 = copywriting, pas SEO**. Ne JAMAIS modifier un H1 validé par @creative-strategy/@copywriter pour SEO. SEO = meta tags, schema.org, robots.txt, sitemap, llms.txt.
- **Titles SEO ≤ 60 chars**. Bing rejette au-delà. Vérifier `echo -n "title" | wc -c`.
- **FAQ en bas de page**, jamais au milieu du parcours.

### Versi Invest
- **Aucun bien affiché publiquement**. Off-market uniquement. CTA = inscription liste d'attente.
- **5% du prix d'acquisition** = seule rémunération. Zéro côté vendeur.
- **Cas d'étude anonymisés**, jamais de noms fictifs.
- **Simulateur rendement/cashflow V1**, blog séparé, pas de back office V1.

### Persona → gate finale (mapping s16)
- **Versi Studio** (outil INTERNE) → **@moi** — gate finale. Testeurs-persona externes NE S'APPLIQUENT PAS.
- **Versi Immobilier** (B2B2C vendeurs) → **@testeur-persona-sophie**.
- **Versi Invest** (family office) → **@testeur-persona-laurent**.
- **Versi Invest VI2** (investisseurs particuliers) → **@testeur-persona-nicolas**.
- **Versi Studio** (marchands de biens) → **@testeur-persona-thomas-marchand**.
- **Règle orchestrateur** : mapper explicitement persona → agent final AVANT le brief.

### Back office & Admin
- **Nav + Footer du site public sur toutes les pages admin**. *« Garde le header et footer en permanence sur toutes les pages, pour qu'on ait l'impression d'être sur le site »*. Le back office fait partie du site, pas une app séparée.

## Préférences nouvelles s32 (en attente promotion / consolidation)

### Workflow architecte = pills + chat conversationnel COMPLÉMENT
*« Il faut que ce soit les 2 : toutes les infos standards champs ET puis questions si besoins de choses en plus »* (s32). Refus du tout-chat (lent) ET du tout-pills (rigide). Pattern hybride : (1) pills systématiques pour catégoriel (saisie 30s/pièce), (2) chat conversationnel COMPLÉMENT pour ambiguïtés non couvertes. Le chat ne doit JAMAIS re-poser une question dont la réponse est dans les pills (cf. `.claude/agents/ia.md` Règles s32 — known-fields-list strict).

### Saisie marchand > inférence IA (priorité absolue dealer-confirmed)
*« Si je dis "Sol à rénover" c'est parce que j'ai décidé de présenter la pièce en version rénovée. La photo source peut montrer un parquet correct mais je veux vendre la version après travaux. L'IA qui "corrige" ma saisie = outil inutilisable »* (s32). La saisie marchand a TOUJOURS priorité sur l'inférence Vision/LLM, sans exception. Le marchand vend une INTENTION (après travaux), pas un constat (état actuel).
**Implémentation requise** : (1) tag explicite source dans le prompt (`(dealer-confirmed)` vs `(visually identified)`), (2) guardrail backend interdit aux tools IA d'écraser un champ user-confirmed (return error tool si tentative), (3) UI distingue visuellement valeurs confirmées (couleur normale) vs valeurs détectées Vision en attente (couleur orange + badge « À confirmer »).

## Préférences propagées dans les agents (références)

Ces préférences sont nées comme « préférence fondateur » et ont été promues règle stable dans les agents — gardées ici en pointeur pour traçabilité.

| Préférence | Source | Vit dans |
|---|---|---|
| Iterate but pivot when plateau | s27.2 | `_base-agent-protocol.md` Règles s27.2 |
| « As-tu seulement vérifié ? » → auto-critique honnête pre-claim | s27.2 | `_base-agent-protocol.md` Règles s27.2 |
| Validation persona pre-implémentation refonte UX | s29 | `.claude/agents/orchestrator.md` Règles s29 |
| Audit exhaustif après 2 patches réactifs | s32 | `.claude/agents/orchestrator.md` + `_base-agent-protocol.md` Règles s32 |
| LLM agents conversationnels : known-fields-list strict | s32 | `.claude/agents/ia.md` Règles s32 |
