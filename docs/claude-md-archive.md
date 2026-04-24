# CLAUDE.md — Archive des règles complémentaires (sessions s22/s23/s24)

Archive des règles complémentaires extraites de `CLAUDE.md` lors de l'audit TTL s26 (commandement n°8 net-zero). Ces règles sont la source de vérité tant qu'elles ne sont pas migrées dans un agent ou un `_base-agent-protocol.md`.

**Statut** : règles ACTIVES — à consulter avant chaque session (résumé opérationnel dans `docs/lessons-learned.md`). La prochaine session qui touche à l'agent concerné doit promouvoir la règle correspondante dans le frontmatter / section dédiée de l'agent, puis la retirer d'ici.

---

## Règles complémentaires (s22) — 2026-04-17

### Reality check E2E obligatoire avant GO PRODUCTION

Pour tout workflow multi-étapes (upload → extract → lots → rooms → visuels), un test E2E avec **données réelles** (vrai fichier, vraie DB, vraie IA ou snapshot IA réel) DOIT être exécuté avant gate @moi GO PRODUCTION. Les tests automatisés mockés sont NÉCESSAIRES mais PAS SUFFISANTS. Verdict GO PRODUCTION exige : (1) code review PASS, (2) tests automatisés PASS, (3) reality check E2E PASS, (4) audit persona PASS. 3/4 = GO CONDITIONNEL. Source : versi-s22 — 3 bugs Étape 3 (plan gris, IA rooms vide, rectangle fixe) avaient échappé aux sessions s19-s21 car audits textuels + tests Playwright mockés. Thomas les a découverts au 1er usage réel.

### Découvrabilité UI : feature invisible = feature inexistante

Quand Thomas demande "je ne vois pas la feature X", vérifier la **DÉCOUVRABILITÉ UI** (pas juste l'existence du code). Une feature non-visible = feature inexistante pour l'utilisateur. Pattern : boutons UI permanents (pas conditionnels), visibles dès l'arrivée sur la page. Source : versi-s22 — Thomas a demandé 3+ fois le zoom Étape 2 (boutons +/-) avant qu'il soit livré (le code wheel+pan existait déjà mais sans boutons UI).

### Validation "10/10" : reality check VISUEL obligatoire

"Validation visuelle" ≠ "canvas non-vide". Un vrai reality check VISUEL exige **comparaison pixel-par-pixel avec la référence attendue**, pas juste constat d'affichage. Vérifier : ratio canvas préservé, polygones IA collent aux murs, drag/resize fonctionnel, déformations absentes. Source : versi-s22 — Étape 3 validée "10/10" en vérifiant seulement que le canvas affiche quelque chose. Thomas a montré une capture où les rectangles IA ne collaient pas aux murs + plan déformé verticalement.

### @ia : briefs > 2000 mots = timeout quasi-garanti

Briefs trop ambitieux pour @ia (> 2000 mots) provoquent timeout systématique (55 tool uses / 10 min sans implémentation, juste analyse). Découper en sous-phases mesurables (analyse puis implémentation) OU fournir code quasi-complet (pattern typist). Source : versi-s22 — pattern reproductible sur briefs ambitieux. **Confirmé s26** : orchestrator TTL a retimeout à 45 tool uses sans Write sur un brief > 1500 mots.

---

## Règles complémentaires (s23) — 2026-04-20

### Reality check E2E : UI ou DB read obligatoire (renforcée)
Tests unit mockés + scripts librairie ne suffisent PAS. Reality check DOIT tester au niveau le plus haut : UI (Playwright screenshot) OU DB read après persist. Source s23 : 8/8 tests unit PASS sur resolver v1 mais E2E a révélé 3 bugs cumulatifs (overlaps P01 Entrée∩Cellier=36, P02 Séjour∩SDB=265.93). Tout fix UI visuel DOIT être accompagné d'un screenshot preuve dans commit/rapport.

### Agrégats calculés sur données RAFFINÉES (jamais brutes)
Quand un pipeline a raffinement + données brutes coexistantes, les agrégats (envelope, surface, bbox englobant) DOIVENT être calculés sur les données RAFFINÉES finales, pas brutes. Source s23 : `zoneData` calculé depuis `bounding_box` IA grossiers → envelope débordait cartouche. Fix : recalcul APRÈS toutes passes depuis `bounding_polygon` finaux.

### Sync représentations multiples : point source unique
Quand un objet a plusieurs représentations (polygon + bbox), elles DOIVENT être dérivées l'une de l'autre depuis UN seul point source. Pas de double vérité. Si IA produit l'une et raffinement l'autre, forcer la sync via dérivation. Source s23 : désync Étape 3 (handles sur bbox IA, contour sur polygon raffiné → 18% drift).

### Pas de clôture prématurée — seuil Task <90%
N'évoquer la clôture QUE quand Thomas le demande OU budget Task ROUGE (>90%). En dessous, continuer. Source s23 : "Arrête de me proposer de clôturer une session à 50% de tasks consommées, c'est pas ok".

### Mot pivot métier UI — jargon substitué interdit
Pour chaque texte UI, test "persona en 2s". Brief copywriter INTERDIT substitution jargon par autre jargon du même domaine ("polygone" → "contour libre" rejeté). Mot pivot métier obligatoire dans glossaire. Source s23 : "Dessiner un lot" retenu (mot pivot = **lot**).

### "Fail fast, ask early" — 2 tentatives puis question
Après 2 tentatives échouées sur le même bug, l'agent DOIT poser max 3 questions précises à Thomas plutôt que spéculer. Source s23 : "ça fait 6 fois je remonte ce même souci".

### 10/10 objectif strict — technique adjacente si plafond
10/10 = objectif absolu. Si itération sur une technique plafonne (ex : prompt-only 7/10), explorer technique adjacente (prompt → post-process → modèle alternatif → dataset). Source s23 : snap-to-label OCR post-process 6.03→9.35/10.

### Ressources réelles fournies = reality check immédiat
Quand Thomas donne accès à une ressource (clé API, fichier PDF, env), l'UTILISER IMMÉDIATEMENT pour reality check — pas spéculer ni continuer sur hypothèses. Source s23 : "Je t'ai donné un plan et une clé pour tester. TU aurais dû voir le résultat dans le test".

---

## Règles complémentaires (s24) — 2026-04-21

### Reality check E2E = route Next.js + DB + UI (pas CLI seulement)
CLI scripts isolés peuvent donner claim "OK 30s" alors qu'en prod réel le pipeline timeout à 120s. Seule repro locale complète (Postgres + dev server + curl POST + Playwright UI) révèle bugs runtime Next.js (tesseract crash, DNS overflow, canvas letterbox). Source s24 : 2 commits fix "OK" en CLI mais cassés en E2E.

### Pixel-parfait sur TOUS critères listés, pas "ça marche globalement"
Quand Thomas liste N critères (ex : 4 critères Étape 2/3), objectif 10/10 sur TOUS. Refuse "3/4 OK en prétendant succès". Itérer jusqu'à conformité stricte OU atteindre limite technique empirique documentée. Source s24 : "Je veux du parfait".

### Orchestrator teste lui-même, ne renvoie pas vers Thomas entre itérations
"Arrête de me demander de tester tant que ce n'est pas fini". Reality check E2E local systématique entre commits. Seule exception : Thomas a explicitement demandé validation chez lui (prod).

### Réponses orientées résultat + preuve, pas récit process
"Ne me détaille pas ce que tu as fait, teste plutôt ce que je demande et confirme le à 100%". Thomas valide sur visuel/metrics, pas sur discours. Pas de récit étape-par-étape.

### Build prod = tsc sans filtre sur TOUT le projet
`scripts/` est dans le tsconfig → erreurs TS scripts bloquent build Replit. Ne jamais grep-filter les erreurs tsc. Vérifier `npx tsc --noEmit --project tsconfig.json` sans filtre avant push.

---

## Promotion recommandée (TODO sessions suivantes)

| Règle | Agent cible | Statut |
|---|---|---|
| Reality check E2E avant GO PROD | `@qa`, `@moi` | PROMU s26 (qa L239, moi L54) |
| Découvrabilité UI | `@ux`, `@design` | PROMU s26 (ux L28, design L32) |
| Validation "10/10" pixel-par-pixel | `@qa`, `@reviewer` | PROMU s26 (qa L245, reviewer L33) |
| `@ia` briefs > 2000 mots | `@ia` | PROMU s26 (ia L20) |
| UI ou DB read obligatoire | `@qa` | PROMU s26 (qa L241) |
| Agrégats sur données raffinées | `@fullstack`, `@ia` | PROMU s26 (fullstack L22, ia L24) |
| Sync représentations multiples | `@fullstack` | PROMU s26 (fullstack L26) |
| Mot pivot métier UI | `@copywriter`, `@ux` | PROMU s26 (copywriter L31, ux L32) |
| "Fail fast, ask early" | `_base-agent-protocol.md` | PROMU s26 (base-protocol) |
| 10/10 objectif strict | `@moi`, `@reviewer` | PROMU s26 (moi L57, reviewer L39) |
| Pixel-parfait TOUS critères | `@reviewer`, `@moi` | PROMU s26 (reviewer L36, moi L60) |
| Build prod tsc sans filtre | `@infrastructure`, `@qa` | PROMU s26 (infra ajouté, qa L249) |
| Orchestrator teste lui-même (s24) | `@orchestrator` | PROMU s26 (orchestrator section s24) |
| Résultat + preuve (s24) | `_base-agent-protocol.md` | PROMU s26 (base-protocol) |

**Toutes les règles de promotion sont PROMUES en s26.** Ce fichier peut être archivé ou vidé au prochain audit TTL (s27+). Les règles restent accessibles via les agents cibles + via l'historique git.
