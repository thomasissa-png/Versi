# Audit Copy — Upload US-VS-02
**Framework : FAB (Feature → Advantage → Benefit) pour évaluation du micro-copy**
**Conscience : Product-Aware** (l'utilisateur est un opérateur Versi qui connaît l'outil)
**Périmètre** : copy client-facing uniquement — page upload + composants DropZone, PlanThumbnail, Stepper, ConfirmModal
**Session** : versi-s16 Batch 6a — Re-audit post-Batch 4
**Date** : 2026-04-16

---

## Section 1 — Anglicismes (gate G33 BLOQUANT)

Grep exhaustif sur les 5 familles de la liste noire founder-preferences.md section Langue française.

| String | Fichier:ligne | Verdict | Correction obligatoire si FAIL |
|---|---|---|---|
| `upload\|uploader\|uploadé\|uploadez` (strings visibles utilisateur) | Grep périmètre copy client-facing | PASS partiel — voir ligne suivante | — |
| `"Upload annulé."` | page.tsx:134 | **FAIL** | `"Dépôt interrompu — réessayez."` |
| `"Plans uploadés"` | vs/page.tsx:26 (hors périmètre upload) | FAIL — hors scope ce livrable, signalé |  `"Plans déposés"` — à traiter en ticket séparé |
| `"Photo uploadée"` (aria-label) | RoomGrid.tsx:154, VisualRoom.tsx (hors périmètre upload) | FAIL — hors scope ce livrable, signalé | `"Photo déposée"` — à traiter en ticket séparé |
| `"Impossible d'uploader la photo."` | VisualRoom.tsx:242 (hors périmètre upload) | FAIL — hors scope ce livrable, signalé | `"Impossible de déposer la photo."` — à traiter en ticket séparé |
| `download\|downloader` | Grep tous fichiers tsx | PASS | — |
| `feedback` | Grep tous fichiers tsx | PASS | — |
| `meeting` | Grep tous fichiers tsx | PASS | — |
| `forwarder` | Grep tous fichiers tsx | PASS | — |

**Résultat gate G33 (périmètre upload US-VS-02) : FAIL**
Occurrence directe dans le périmètre : `page.tsx:134` — `"Upload annulé."`
Occurrences hors-périmètre détectées et signalées : 3 occurrences dans vs/page.tsx, RoomGrid.tsx, VisualRoom.tsx — à traiter en tickets séparés.

---

## Section 2 — Registre tu/vous uniforme

| String | Fichier:ligne | Registre | Cohérent ? |
|---|---|---|---|
| `"Déposez vos plans"` (H1) | page.tsx:399 | Vous — impératif pluriel | PASS |
| `"Vous avez atteint la limite de X plans par opération. Supprimez un plan existant pour en ajouter un nouveau."` | page.tsx:151-154 | Vous explicite + impératif | PASS |
| `"X fichier(s) ajouté(s) — limite de X plans par opération atteinte."` | page.tsx:159 | Neutre | PASS |
| `"Déposez vos plans ici"` | DropZone.tsx:169 | Vous — impératif | PASS |
| `"Relâchez pour déposer"` | DropZone.tsx:168 | Neutre (infinitif) | PASS |
| `"ou parcourir vos fichiers"` | DropZone.tsx:178 | Vous — possessif | PASS |
| `"Supprimer ce plan ?"` (titre modal) | page.tsx:574 | Neutre | PASS |
| `"Cette action est irréversible. Le fichier sera supprimé définitivement."` | page.tsx:575 | Neutre | PASS |
| `"Lancer l'analyse"` (CTA) | page.tsx:565 | Neutre — infinitif | PASS |
| `"Analyse en cours…"` (CTA loading) | page.tsx:565 | Neutre | PASS |
| `"Retour aux opérations"` (lien état erreur) | page.tsx:376 | Neutre | PASS |
| ARIA `"Zone de dépôt de fichiers. Cliquez ou glissez-déposez vos plans."` | DropZone.tsx:125 | Vous — impératif | PASS |
| ARIA `"Étapes du projet"` | Stepper.tsx:31 et 85 | Neutre | PASS |
| ARIA `"Étape X : [label] (complétée/en cours)"` | Stepper.tsx:43 | Neutre | PASS |
| ARIA `"Supprimer [filename]"` | PlanThumbnail.tsx:117 | Neutre — infinitif | PASS |
| `"Fermer le message d'erreur"` | page.tsx:433 | Neutre — infinitif | PASS |

**Résultat : registre "vous" cohérent sur l'ensemble du périmètre. 0 alternance non justifiée. PASS.**

---

## Section 3 — Micro-copy erreurs actionnables

Les 5 occurrences identifiées en P1 + 1 occurrence AbortError.

| Erreur (contexte) | String actuelle | Évaluation actionabilité |
|---|---|---|
| fetchData L89 — erreur réseau chargement initial | `"Impossible de charger les données du projet — vérifiez votre connexion et réessayez."` | **PASS** — cause probable identifiée (connexion), 2 verbes d'action ("vérifiez", "réessayez"), structure sujet-problème-action. 9/10 |
| uploadSingleFile L137 — erreur réseau dépôt fichier | `"[filename] n'a pas pu être déposé — vérifiez votre connexion et réessayez."` | **PASS** — fichier nommé explicitement, cause probable, action concrète. 9/10 |
| uploadSingleFile L134 — AbortError (dépôt annulé) | `"Upload annulé."` | **FAIL** — (1) anglicisme G33 bloquant. (2) Non actionnable : l'utilisateur ne sait pas si c'est une annulation volontaire ou un timeout. Correction : `"Dépôt interrompu — réessayez."` |
| confirmDelete L259 — erreur réseau suppression | `"Impossible de supprimer le plan — vérifiez votre connexion et réessayez."` | **PASS** — structure identique aux autres erreurs réseau. 9/10 |
| handleFloorChange L296 — erreur mise à jour étage | `"Impossible de mettre à jour l'étage — vérifiez votre connexion et réessayez."` | **PASS** — rollback silencieux déjà géré côté code, message actionnable. 9/10 |
| handleAnalyze L344 — erreur lancement analyse | `"Impossible de lancer l'analyse — vérifiez votre connexion et réessayez."` | **PASS** — actionnable, structure cohérente avec les autres messages réseau. 9/10 |

**Résultat : 1 message non actionnable et porteur d'un anglicisme (L134). Les 5 autres messages PASS.**

---

## Section 4 — Copy hiérarchique

| Élément | String | Force | Verdict |
|---|---|---|---|
| H1 page | `"Déposez vos plans"` | H1 | **PASS** — impératif direct, 3 mots, calibré marchand de biens. |
| Sous-titre flexibilité | `"Un plan par lot, ou un plan d'ensemble — les deux formats fonctionnent."` | subhead/body | **PASS** — rassure sur la flexibilité sans jargon. Ton direct, marque de confiance. |
| Body formats acceptés | `"Formats acceptés : PDF, PNG, JPG, WEBP — résolution minimum 150 dpi, 20 Mo max par fichier."` | body | **PASS** — informatif, exhaustif. Structure en tiret cadratin lisible. |
| Label emplacements restants | `"X emplacement(s) restant(s) sur Y"` | label | **PASS** — pluriel dynamique géré, sobre. |
| Compteur pluriel plans déposés | `"X plan(s) déposé(s)"` | label | **PASS** — accord pluriel correct avec ternaires. |
| CTA principal | `"Lancer l'analyse"` | CTA primaire | **PASS** — 2 mots, verbe d'action fort (infinitif), objet concret. Respecte règle < 8 mots. |
| CTA loading | `"Analyse en cours…"` | CTA désactivé | **PASS** — cohérent avec CTA actif, ellipse de progression. |
| Bouton Réessayer (tuile fichier échoué) | `"Réessayer"` | CTA secondaire | **PASS** — 1 mot, verbe d'action, univoque. |
| Bouton Supprimer (modal confirmation) | `"Supprimer"` | CTA danger | **PASS** — verbe d'action explicite. Évite "OK" ou "Confirmer" génériques. |
| Bouton Annuler (modal) | `"Annuler"` | CTA annulation | **PASS** — standard attendu, position correcte (gauche). |
| Lien Retour aux opérations | `"Retour aux opérations"` | CTA secondaire | **PASS** — clair, pas d'anglicisme "back". |
| Stepper label étape 1 | `"Plans"` | label | **PASS** — concis. |
| Stepper description étape 1 | `"Déposez vos plans"` | body | **PASS** — cohérent avec H1. |
| Stepper labels étapes 2-4 | `"Lots"`, `"Pièces"`, `"Visuels"` | labels | **PASS** — nomenclature métier claire pour un opérateur immobilier. |
| Dépôt en cours | `"Dépôt de [filename] en cours…"` | feedback inline | **PASS** — nom de fichier présent, temps de lecture attendu. |
| Fallback nom fichier | `"Plan sans nom"` | label fallback | **PASS** — honnête, évite "undefined" ou "N/A". |
| Message opération introuvable | `"Opération introuvable."` | état erreur | **PASS** — concis, terme métier correct ("opération" = projet Versi). |

**Résultat : hiérarchie copy cohérente. CTA canonique validé. PASS.**

---

## Section 5 — Findings P0/P1/P2

| Sévérité | Description | Correction exacte |
|---|---|---|
| **P0 — gate G33 BLOQUANT** | `"Upload annulé."` — page.tsx L134 — anglicisme en string retournée à l'utilisateur dans la tuile fichier échoué | `"Dépôt interrompu — réessayez."` |
| **P1** | `"Upload annulé."` — non actionnable en plus de l'anglicisme : l'utilisateur ne distingue pas une annulation volontaire d'un timeout réseau | Idem P0 — correction unique couvre les deux |
| **P2** | `"format non supporté"` — DropZone.tsx L37 — calque de l'anglais "not supported", peu idiomatique en français courant | `"format non pris en charge"` |
| **P2 — hors périmètre, signalé** | `"Plans uploadés"` — vs/page.tsx L26 — anglicisme dans le statut projet visible dans la liste des opérations | `"Plans déposés"` — ticket séparé @fullstack |
| **P2 — hors périmètre, signalé** | `"Photo uploadée"` (aria-label) — RoomGrid.tsx:154 | `"Photo déposée"` — ticket séparé @fullstack |
| **P2 — hors périmètre, signalé** | `"Impossible d'uploader la photo."` — VisualRoom.tsx:242 | `"Impossible de déposer la photo."` — ticket séparé @fullstack |

---

## Section 6 — Verdict

### Score /10 : 8,5

Décomposition honnête :
- Copy structurellement solide : H1 direct et calibré secteur, erreurs actionnables (5/6), CTA canonique "Lancer l'analyse" conforme, registre "vous" cohérent sur tout le périmètre, hiérarchie H1/subhead/body/CTA propre.
- 1 anglicisme bloquant en string visible utilisateur (page.tsx L134) — gate G33 FAIL.
- 1 calque anglais P2 à corriger (DropZone.tsx L37 "non supporté").
- 3 anglicismes hors périmètre détectés et signalés (vs/page.tsx, RoomGrid.tsx, VisualRoom.tsx).

**Unanimité 9/10 : FAIL** — le seuil de 9 n'est pas atteint tant que L134 n'est pas corrigé.

**Gate G33 : FAIL — BLOQUANT**
Occurrence dans le périmètre : `page.tsx:134` — `"Upload annulé."`
Correction requise avant débloquage.

**Conditions pour atteindre 9/10 :**
1. P0 — `page.tsx:134` : `"Upload annulé."` → `"Dépôt interrompu — réessayez."`
2. P2 — `DropZone.tsx:37` : `"format non supporté"` → `"format non pris en charge"`

Après ces 2 corrections : score estimé **9,5/10**, unanimité 9/10 PASS attendue.

---

## Section 7 — Handoff

---
**Handoff → @fullstack**

Corrections requises dans le périmètre upload (2 fichiers, 2 lignes) :

**Correction 1 — P0 BLOQUANT (gate G33)**
- Fichier : `versi-studio/src/app/vs/projects/[id]/upload/page.tsx`
- Ligne 134 : `return { error: "Upload annulé." };`
- Remplacement : `return { error: "Dépôt interrompu — réessayez." };`

**Correction 2 — P2**
- Fichier : `versi-studio/src/components/vs/DropZone.tsx`
- Ligne 37 : `errors.push(\`${file.name} : format non supporté. Utilisez PDF, PNG, JPG ou WEBP.\`);`
- Remplacement : `` errors.push(`${file.name} : format non pris en charge. Utilisez PDF, PNG, JPG ou WEBP.`); ``

Corrections hors périmètre à traiter en tickets séparés (P2 — gate G33) :
- `versi-studio/src/app/vs/page.tsx:26` — `"Plans uploadés"` → `"Plans déposés"`
- `versi-studio/src/components/vs/RoomGrid.tsx:154` — aria-label `"Photo uploadée"` → `"Photo déposée"`
- `versi-studio/src/components/vs/VisualRoom.tsx:242` — `"Impossible d'uploader la photo."` → `"Impossible de déposer la photo."`

---
**Handoff → @orchestrator**

- Fichier produit : `docs/copy/upload-us-vs-02-copy-audit.md`
- Gate G33 : **FAIL — BLOQUANT** — 1 occurrence dans le périmètre (page.tsx:134)
- Score actuel : **8,5/10** — unanimité 9/10 non atteinte
- 2 corrections copy requises par @fullstack (P0 L134 + P2 DropZone L37)
- 3 corrections hors périmètre signalées (vs/page.tsx, RoomGrid.tsx, VisualRoom.tsx) — à planifier
- Registre "vous" : PASS sur tout le périmètre, aucune correction copy supplémentaire
- Hiérarchie copy et CTA canonique : PASS
- Après corrections P0+P2 : score estimé 9,5/10, unanimité 9/10 PASS
---
