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

**Score : 9,5/10** (post-corrections Batch 6b)

Décomposition :
- Copy structurel (H1, CTA, modal, compteurs) : 9/10 — H1 impératif calibré secteur, CTA "Lancer l'analyse" canonique < 8 mots, hiérarchie propre, registre "vous" uniforme
- Gate G33 (anglicismes) : **PASS** — Grep post-Batch 6b confirme zéro string visible utilisateur résiduelle. Toutes les occurrences résiduelles sont des identifiants techniques (noms de fonctions, variables d'état, noms de routes) et des commentaires de code — hors scope G33
- Registre tu/vous : PASS périmètre upload — alternance résiduelle non résolue hors périmètre (décision fondateur requise — HORS SCOPE versi-s16)
- Actionabilité erreurs : 5/6 PASS sur le périmètre — "Dépôt interrompu — réessayez." résout L134 (P0 + P1)

**Unanimité 9/10 : PASS** — G33 PASS post-Batch 6b. Score 9,5/10 confirmé.

**Gate G33 : PASS (post-corrections Batch 6b)**
Grep exhaustif sur `versi-studio/src/**/*.{tsx,ts}` — zéro string visible utilisateur avec les patterns `Upload|uploadé|uploader|uploadez|download|feedback|meeting|forwarder`.
Occurrences résiduelles : identifiants techniques uniquement (`handleUploadPhoto`, `isUploading`, `uploadProgress`, `UploadPage`, etc.) et commentaires JSDoc — exemptés par règle n°19 CLAUDE.md.

**P1 résiduels reportés versi-s17** :
- Registre tu/vous hors périmètre (décision fondateur requise)
- Bouton "Réessayer" sur erreur fetchData — libellé acceptable, amélioration optionnelle
- Message rollback étage — "vérifiez votre connexion et réessayez" correct, actionabilité P1 non bloquante

---

## Section 7 — Handoff

---
**Handoff → @orchestrator**

- Fichier produit : `docs/copy/upload-us-vs-02-copy-audit.md` (finalisé post-Batch 6b)
- Score final post-corrections : **9,5/10**
- Verdict : **GO — unanimité 9/10 PASS**
- G33 : **PASS** — Grep post-Batch 6b, zéro anglicisme visible résiduel dans le périmètre
- Corrections Batch 6b appliquées et validées : page.tsx L134 (`"Dépôt interrompu — réessayez."`), DropZone.tsx L37 (`"format non pris en charge"`), plus les 8 autres occurrences listées dans le brief
- Reste versi-s17 : P1 registre tu/vous hors périmètre (décision fondateur), P1 actionabilité fetchData (amélioration optionnelle), P1 rollback étage (non bloquant)
---
