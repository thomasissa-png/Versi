# Arbitrage PM US-VS-02 Upload — v1

**Date** : 2026-04-16
**Auteur** : @product-manager
**Source** : audit QA `docs/qa/upload-us-vs-02-audit-v1.md` + spec `docs/product/vs-functional-specs.md` L271-346
**Persona** : Thomas — marchand de biens B2B, priorités : rapidité, fiabilité, simplicité

---

## 1. Décisions en 1 tableau

| Écart | Décision | Justification | Action @fullstack |
|---|---|---|---|
| **AC08 — séquentiel vs parallèle** | **Aligner le code sur la spec : implémenter l'upload parallèle** | Thomas dépose jusqu'à 10 plans en une fois. L'upload séquentiel multiplie le temps d'attente par le nombre de fichiers (ex. 10 × 5s = 50s vs ~5s en parallèle). La rapidité est une priorité N°1 du persona. Le coût de refactoring est faible (`for` → `Promise.all`). | Remplacer la boucle `for...of` L102-126 par `Promise.allSettled(filesToUpload.map(...))`. Chaque fichier gère sa propre progression. Les erreurs restent par fichier. |
| **AC09 — retry par fichier** | **Implémenter le retry** | Réseau instable en 4G est un cas d'usage réel de Thomas sur site (chantiers, appartements visités). Un échec silencieux sans retry force à recommencer l'upload entier — friction critique sur un workflow P0. La spec est correcte, le code est incomplet. | Maintenir un état `failedFiles: {file: File, error: string}[]`. Afficher un bouton "Réessayer" par fichier échoué avec son nom et le message d'erreur. Le bouton relance uniquement ce fichier via la même logique d'upload. |
| **WEBP** | **Ajouter WEBP à la spec (aligner la spec sur le code)** | Les iPhones exportent en WEBP nativement (iOS 16+). Thomas scanne ses plans avec son iPhone — scénario persona concret L334. Rejeter WEBP crée une friction sans valeur. Les modèles d'extraction IA (Vision) supportent WEBP nativement. La liste de formats supportés doit être étendue dans la spec, le toast d'erreur AC04 mis à jour en conséquence. | Rien à changer dans le code. Mettre à jour la spec (voir section 2). |
| **floor_number hardcodé à "0"** | **Calculer côté client : `plans.length + index`** | L'auto-incrémentation doit être visible immédiatement dans l'UI (grille de miniatures "Étage 0 — RDC", "Étage 1", etc.). Si le calcul est uniquement serveur, un rechargement est nécessaire pour voir les numéros corrects — mauvaise UX. Le calcul `plans.length + index` est fiable si les plans existants sont chargés avant l'upload (ce qui est le cas via `fetchData()`). L'API PATCH floor_number doit aussi être implémentée pour persister les modifications manuelles (L170 est un stub actif). | (1) Remplacer L106 `formData.append("floor_number", "0")` par `formData.append("floor_number", String(plans.length + index))` en utilisant l'index dans `Promise.allSettled`. (2) Implémenter `PATCH /api/vs/plans/[id]` avec body `{ floor_number: number }` pour persister les modifications manuelles depuis `handleFloorChange`. |

---

## 2. Mise à jour specs requises dans vs-functional-specs.md

### Modification 1 — Formats acceptés (L290 et AC04)

**Ligne 290 — tableau Données et champs, colonne Validation :**

Avant :
```
MIME : application/pdf, image/png, image/jpeg, image/webp
```
(déjà présent en spec L290 — WEBP est déjà dans le tableau "Données et champs". Vérification faite : la spec L290 liste déjà `image/webp`. La divergence est dans le critère d'erreur AC04 L304 qui dit "utilisez PDF, PNG ou JPG" en omettant WEBP.)

**Ligne 304 — critère AC04, message toast :**

Remplacer :
```
toast rouge "Format non supporté — utilisez PDF, PNG ou JPG"
```
Par :
```
toast rouge "Format non supporté — utilisez PDF, PNG, JPG ou WEBP"
```

**Ligne 290 — tableau Données et champs, colonne Exemple :**

Ajouter `plan_rdc.webp` comme exemple secondaire (optionnel, pour cohérence).

### Modification 2 — AC08, critère cas limites (L310)

Remplacer :
```
GIVEN Thomas dépose simultanément 5 fichiers WHEN les uploads partent en parallèle THEN chaque fichier a sa propre barre de progression, les erreurs sont par fichier (pas globales)
```
(Aucun changement de formulation nécessaire — la spec dit déjà "uploads partent en parallèle". C'est le code qui doit s'aligner.)

### Modification 3 — AC09, critère cas limites (L311)

Remplacer :
```
GIVEN un timeout réseau pendant l'upload WHEN la connexion est rétablie THEN le fichier incomplètement uploadé est marqué "Échec — réessayer" avec un bouton de retry par fichier
```
(Aucun changement — la spec est correcte. C'est le code qui doit implémenter ce comportement.)

### Modification 4 — floor_number, payload API (L323)

Remplacer :
```
Request body : FormData — `file: File`, `floor_number?: number`
```
Par :
```
Request body : FormData — `file: File`, `floor_number: number` (calculé côté client : `plans.length + index`, envoi obligatoire)
```

Ajouter un endpoint PATCH dans la section Payload API :
```
**Endpoint PATCH** : `PATCH /api/vs/plans/[id]`
**Authentification** : publique
**Request body** : `{ "floor_number": number }`
**Response succès** : `{ "plan_id": uuid, "floor_number": number }` — status 200
**Response erreur** : `{ "error": "PLAN_NOT_FOUND"|"INVALID_FLOOR_NUMBER", "message": string }` — status 400/404
```

---

## 3. Décisions fondateur requises

Aucune décision fondateur nécessaire sur les 4 écarts. Les 4 arbitrages sont tranchés sur la base :
- des priorités persona documentées (rapidité, fiabilité)
- du comportement technique vérifiable (iOS WEBP natif, calcul plans.length déterministe)
- de la règle du moindre effort (WEBP déjà dans le code, aligner la spec coûte moins que modifier la validation)

**Note** : si Thomas a une contrainte métier spécifique sur les formats (ex : certains archivistes ou notaires n'acceptent que PDF), remonter à @product-manager pour revalider le choix WEBP. En l'absence de cette contrainte, la décision tient.

---

## 4. Handoff

**Destinataires** : @fullstack (Batch 4) + @orchestrator

**Fichiers produits** :
- `/home/user/Versi/docs/product/upload-us-vs-02-arbitrage-v1.md` (ce fichier)

**Corrections P0 attendues en code** (par @fullstack) :
1. `versi-studio/src/app/vs/projects/[id]/upload/page.tsx` L102-126 : boucle `for` → `Promise.allSettled` (upload parallèle, AC08)
2. `versi-studio/src/app/vs/projects/[id]/upload/page.tsx` L106 : `floor_number: "0"` → `floor_number: String(plans.length + index)` (floor_number auto-incrémenté)
3. `versi-studio/src/app/vs/projects/[id]/upload/page.tsx` : ajouter état `failedFiles[]` + bouton retry par fichier (AC09)
4. Nouveau endpoint : `versi-studio/src/app/api/vs/plans/[id]/route.ts` — ajouter handler PATCH pour `floor_number`

**Specs à mettre à jour** (par @product-manager — auto-application) :
- `docs/product/vs-functional-specs.md` L304 : message AC04 ajouter "ou WEBP"
- `docs/product/vs-functional-specs.md` L323 : `floor_number` obligatoire (pas optionnel) + ajout endpoint PATCH

**Dépendances d'exécution** :
- @fullstack corrige les 4 points P0 EN PARALLÈLE avec @qa qui prépare les fichiers fixtures adversariaux
- @qa écrit les 7 tests P0 APRÈS que @fullstack a livré les corrections (sinon les tests valident le comportement buggé)
- L'arbitrage WEBP ne nécessite aucune action @fullstack (le code accepte déjà WEBP, seule la spec est mise à jour)
