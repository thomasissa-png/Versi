# Diagnostic Etape 3 Pieces -- Versi Studio s22

> Date : 2026-04-17
> Methode : analyse code statique + trace des donnees du workflow complet
> Statut : DIAGNOSTIC UNIQUEMENT -- aucune correction appliquee

---

## Section 1 : Environnement

| Element | Statut | Detail |
|---|---|---|
| node_modules | OK | Present dans versi-studio/ |
| Playwright chromium | OK | Installe (chromium_headless_shell-1217) |
| PostgreSQL | INDISPONIBLE | DATABASE_URL absente de l'env (Replit Secrets non injectes dans cette session) |
| Serveur dev | NON LANCE | DB absente = crash garanti au demarrage |
| Tests E2E | NON EXECUTABLES | Serveur dev requis comme prerequis |

**Consequence** : diagnostic realise en analyse code pure. Les 3 bugs sont neanmoins identifies avec certitude (cause racine = code, pas config runtime).

**Probleme de config supplementaire** : `playwright.config.ts` utilise `baseURL: "http://localhost:3000"` alors que `package.json` script dev utilise le port 5000 (`next dev -H 0.0.0.0 -p 5000`). Ce mismatch causera un timeout Playwright systematique en CI (learning versi-s21 CLAUDE.md).

---

## Section 2 : Bug 1 -- Image de fond GRISE (plan invisible)

### Symptome
Le canvas affiche un fond gris uni (#F0EDE8) avec un quadrillage placeholder au lieu du plan architectural.

### Cause racine
**Fichier** : `src/app/vs/projects/[id]/rooms/page.tsx` **ligne 161**

```ts
const planImageUrl = firstPlan?.file_path ?? null;
```

`file_path` est un chemin filesystem absolu (`/tmp/vs-uploads/<project-id>/<uuid>.pdf`). Ce chemin est passe directement a `new Image()` dans `RoomCanvas.tsx` ligne 131 :

```ts
img.src = planImageUrl; // = "/tmp/vs-uploads/abc/def.pdf" -- INVALIDE
```

Le navigateur ne peut pas resoudre un chemin filesystem absolu comme URL. `img.onerror` est declenche, `imageLoaded` reste `false`, et le canvas dessine le fallback quadrillage gris (RoomCanvas.tsx ligne 209-225).

### Comparaison avec l'Etape 2 (qui fonctionne)
**Fichier** : `src/app/vs/projects/[id]/lots/page.tsx` **ligne 170-173**

```ts
const planImageUrl = useMemo(() => {
  if (!currentPlan) return null;
  return `/api/vs/files?path=${encodeURIComponent(currentPlan.file_path)}`;
}, [currentPlan]);
```

L'Etape 2 passe par la route API `/api/vs/files?path=...` qui sert le fichier avec le bon Content-Type et convertit les PDF en PNG a la volee (fichier `src/app/api/vs/files/route.ts` lignes 48-69).

### Correction recommandee (1 ligne)
Dans `src/app/vs/projects/[id]/rooms/page.tsx` ligne 161, remplacer :
```ts
const planImageUrl = firstPlan?.file_path ?? null;
```
par :
```ts
const planImageUrl = firstPlan
  ? `/api/vs/files?path=${encodeURIComponent(firstPlan.file_path)}`
  : null;
```

### Severite : P0 -- l'Etape 3 est totalement inutilisable sans le plan de fond.

---

## Section 3 : Bug 2 -- IA n'a pas detecte de pieces

### Symptome
Le panneau lateral affiche "L'IA n'a pas detecte de pieces -- ajoutez-en manuellement" (RoomPanel.tsx ligne 342).

### Cause racine
**Il n'y a aucune logique de detection/creation automatique de rooms dans `vs_rooms`.**

L'extraction IA (`POST /api/vs/projects/[id]/extract`, fichier `src/app/api/vs/projects/[id]/extract/route.ts`) :
1. Appelle `extractPlanData()` pour detecter les pieces du plan via GPT-4.1 vision (ligne 105)
2. Stocke les resultats dans `extraction_data` (colonne JSONB du plan, ligne 113)
3. Regroupe les pieces par `unit_id` via `clusterByUnit()` pour creer des **lots** dans `vs_lots` (ligne 211)
4. **Ne cree JAMAIS de rooms dans `vs_rooms`**

L'Etape 3 charge les rooms via `GET /api/vs/lots/[id]/rooms` (fichier `src/app/api/vs/lots/[id]/rooms/route.ts` ligne 51) qui fait :
```sql
SELECT * FROM vs_rooms WHERE lot_id = $1
```

Comme `vs_rooms` est vide (aucun INSERT n'a ete fait), le GET retourne `[]`, et le message "aucune piece" s'affiche.

### Donnees disponibles mais non exploitees
Les rooms detectees par l'IA sont stockees dans `vs_plans.extraction_data` (JSONB). Chaque room contient :
- `name_raw` (nom detecte par GPT)
- `room_type` (infere par `inferRoomTypeFromName`)
- `surface_m2`
- `bounding_box` (coordonnees % sur le plan)
- `unit_id` (clustering : quel lot)
- `confidence`

Ces donnees sont exactement ce qu'il faut pour pre-remplir `vs_rooms` -- mais le code qui fait le pont n'existe pas.

### Correction recommandee
Ajouter dans la route `POST /api/vs/projects/[id]/extract` (apres la creation des lots, vers ligne 225) une boucle qui :
1. Pour chaque lot cree, retrouve les rooms du meme `unit_id`
2. Insere dans `vs_rooms` avec `source = 'ai'`, `status = 'suggested'`
3. Mappe les `bounding_box` de l'extraction vers le format `position` attendu par l'Etape 3

Pattern :
```ts
for (const room of group.rooms) {
  await query(
    `INSERT INTO vs_rooms (lot_id, plan_id, name, room_type, surface_m2, position, source, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'ai', 'suggested')`,
    [
      lotId,
      planId,
      room.name_raw,
      inferRoomTypeFromName(room.name_raw),
      room.surface_m2,
      JSON.stringify(room.bounding_box),
    ]
  );
}
```

**Attention** : les `bounding_box` de l'extraction sont en coordonnees % **du plan global**. Les `position` des rooms dans l'Etape 3 sont en coordonnees % **relatives au lot** (cf. RoomCanvas.tsx ligne 162 commentaire). Il faudra donc convertir les coordonnees globales en coordonnees locales au lot.

### Severite : P0 -- fonctionnalite coeur de l'Etape 3 absente.

---

## Section 4 : Bug 3 -- Rectangles fixes (pas de redimensionnement)

### Symptome
Les pieces ajoutees manuellement sont des rectangles de taille fixe (25%x25%), deplacables (drag) mais pas redimensionnables. Pas de poignees de resize, pas de support polygone.

### Cause racine
**Fichier** : `src/components/vs/RoomCanvas.tsx`

Le composant RoomCanvas est une version simplifiee par rapport au PlanCanvas de l'Etape 2 :

| Fonctionnalite | PlanCanvas (Etape 2) | RoomCanvas (Etape 3) |
|---|---|---|
| Drag (deplacement) | Oui | Oui |
| Resize (8 poignees) | Oui (ligne 765-857) | NON |
| Polygone editable | Oui (vertices dragable, ligne 793-856) | NON |
| Ajout de vertex | Oui | NON |
| Suppression de vertex | Oui | NON |
| Double-clic pour convertir | Oui | NON |

Le `handleAddRoom` dans `rooms/page.tsx` (ligne 355-387) cree un rectangle fixe :
```ts
body: JSON.stringify({
  room_type: "chambre",
  position: {
    x_percent: 10,
    y_percent: 10,
    width_percent: 25,
    height_percent: 25,
  },
}),
```

Et `RoomCanvas.tsx` ne fournit aucune poignee de resize -- seul le drag (handleMouseDown/handleMouseMove/handleMouseUp lignes 324-399) est implemente.

### Comparaison avec PlanCanvas (Etape 2)
- PlanCanvas (`src/components/vs/PlanCanvas.tsx`) a 1300+ lignes avec resize complet (8 poignees directionnelles), support polygone, hit-test vertex, etc.
- RoomCanvas (`src/components/vs/RoomCanvas.tsx`) a ~460 lignes, uniquement drag.

### Correction recommandee
Deux options :
1. **Option A (rapide)** : Ajouter des poignees de resize rectangulaire dans RoomCanvas, meme pattern que PlanCanvas (hitTestHandle + computeResize). ~200 lignes de code supplementaire.
2. **Option B (ideale)** : Reutiliser PlanCanvas ou en extraire un composant `EditableZoneCanvas` partage qui supporte rect + polygon + resize, utilise a la fois par l'Etape 2 (lots) et l'Etape 3 (rooms). Evite la duplication et permet aux rooms d'etre des polygones.

### Severite : P1 -- Thomas ne peut pas ajuster les pieces a la geometrie reelle du plan.

---

## Section 5 : Plan d'execution (ne pas lancer)

### Ordre d'implementation
1. **Bug 1 (image grise)** -- @fullstack, 5 minutes, 1 ligne de code. Debloque visuellement toute l'Etape 3. A faire en premier car les bugs 2 et 3 sont invisibles sans le plan de fond.
2. **Bug 2 (pas de rooms IA)** -- @fullstack + @ia (pour valider la conversion de coordonnees). 1-2 heures. Pre-insertion des rooms extraites dans `vs_rooms` lors du clustering. Necessite une attention particuliere sur la conversion coordonnees plan-global vers coordonnees lot-local.
3. **Bug 3 (rectangles fixes)** -- @fullstack. 2-4 heures selon l'option choisie (A ou B). Peut etre parallelise avec le bug 2.

### Agents a lancer
- **@fullstack** : bugs 1 + 3 (et potentiellement bug 2 si la conversion de coordonnees est directe)
- **@ia** : bug 2, validation de la chaine extraction → rooms, coherence des bounding boxes avec les lot zones
- **@qa** : test de regression E2E apres corrections (upload plan P00 → Etape 1 → 2 → 3 → verification visuelle)

### Tests a ajouter (Playwright)
1. Test regression bug 1 : apres upload + navigation Etape 3, verifier que `planImageUrl` contient `/api/vs/files?path=` (pas un chemin filesystem)
2. Test regression bug 2 : apres extraction, verifier que `GET /api/vs/lots/[id]/rooms` retourne au moins 1 room pour un lot avec extraction reussie
3. Test regression bug 3 : apres ajout manuel d'une room, verifier la presence de poignees de resize (ou que la taille de la room peut etre modifiee)

---

## Section 6 : Probleme de config supplementaire

### Mismatch port Playwright
- `playwright.config.ts` : `baseURL: "http://localhost:3000"`, `webServer.url: "http://localhost:3000"`
- `package.json` : `"dev": "next dev -H 0.0.0.0 -p 5000"`

Le serveur dev ecoute sur le port 5000, Playwright attend le port 3000. Tout test E2E en CI echouera par timeout. Correction : aligner `playwright.config.ts` sur le port 5000.

---

## Section 7 : Learning a propager

### Learning L1 : Tests reels obligatoires avant GO PRODUCTION

| Champ | Valeur |
|---|---|
| Session | versi-s22 |
| Date | 2026-04-17 |
| Categorie | probleme |
| Severite | P0 |
| Description | Les audits cross-agents s19-s21 ont valide l'Etape 3 Pieces par code review + gates textuelles, mais n'ont jamais teste en conditions reelles avec un plan concret. Thomas a decouvert 3 bugs critiques au premier usage : (1) image grise (URL filesystem au lieu d'URL API), (2) IA ne detecte pas de pieces (rooms jamais inserees dans vs_rooms), (3) rectangles fixes (pas de resize/polygone). |
| Correction appliquee | Diagnostic sans correction. |
| Recommandation framework | OBLIGATION de test E2E Playwright avec upload d'un plan reel pour tout livrable workflow multi-etapes AVANT gate @moi GO PRODUCTION. Le test visuel G26 (boucle visuelle avec baselines) est NECESSAIRE mais PAS SUFFISANT car il teste des etats statiques mockees, pas le workflow utilisateur complet avec donnees reelles. |
| Cible propagation | regle-globale |
| Fichiers impactes | `.claude/agents/qa.md` (ajout gate E2E workflow reel), `.claude/agents/moi.md` (refuser GO PRODUCTION sans E2E workflow), `.claude/agents/orchestrator.md` (gate bloquante Phase test), `CLAUDE.md` (regle n23) |
| Statut correction | a-faire |
| Statut propagation | non-propage |

### Learning L2 : Coherence inter-etapes obligatoire

| Champ | Valeur |
|---|---|
| Session | versi-s22 |
| Date | 2026-04-17 |
| Categorie | probleme |
| Severite | P1 |
| Description | L'Etape 2 (lots) et l'Etape 3 (rooms) utilisent des patterns differents pour la meme fonctionnalite : l'Etape 2 utilise `/api/vs/files?path=...` pour servir le plan (correct), l'Etape 3 utilise le chemin filesystem brut (bug). L'Etape 2 a PlanCanvas avec resize+polygone, l'Etape 3 a RoomCanvas sans resize. Pas de composant partage. |
| Correction appliquee | Diagnostic sans correction. |
| Recommandation framework | Audit de coherence inter-etapes obligatoire pour tout workflow multi-etapes : memes patterns d'URL, meme composant canvas (ou composant partage), memes capacites d'interaction. Un @reviewer doit verifier que le code de l'Etape N+1 reutilise les patterns de l'Etape N. |
| Cible propagation | agent-specifique |
| Fichiers impactes | `.claude/agents/reviewer.md` (ajout verification coherence inter-etapes) |
| Statut correction | a-faire |
| Statut propagation | non-propage |

---

## Resume du diagnostic

Les 3 causes racines des bugs Etape 3 sont identifiees avec certitude par analyse de code :

1. **Image grise** (P0) : `rooms/page.tsx:161` -- `file_path` brut au lieu de `/api/vs/files?path=...`. Fix : 1 ligne.
2. **IA ne detecte pas** (P0) : `extract/route.ts` -- l'extraction cree des lots mais jamais de rooms dans `vs_rooms`. Les rooms detectees sont dans `extraction_data` (JSONB) mais pas propagees vers la table `vs_rooms`. Fix : ~30 lignes dans la route extract.
3. **Rectangles fixes** (P1) : `RoomCanvas.tsx` -- pas de poignees de resize ni support polygone, contrairement a PlanCanvas (Etape 2). Fix : ~200 lignes (option A) ou refactoring composant partage (option B).

**Bonus** : mismatch port playwright.config.ts (3000) vs package.json dev (5000).

Les 3 bugs sont des defauts de code, pas de configuration runtime. Aucun test E2E reel n'avait ete execute sur le workflow complet avec un plan reel avant cette session.

---

**Handoff -> @fullstack**
- Fichiers a corriger : `src/app/vs/projects/[id]/rooms/page.tsx` (bug 1), `src/app/api/vs/projects/[id]/extract/route.ts` (bug 2), `src/components/vs/RoomCanvas.tsx` (bug 3), `playwright.config.ts` (port mismatch)
- Decisions prises : diagnostic seul, aucune correction appliquee
- Points d'attention : bug 2 necessite une conversion de coordonnees (plan-global → lot-local) pour les positions des rooms
