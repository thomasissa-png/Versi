# Audit Copy — Étape 2 Lots Versi Studio (US-VS-06/07/08)
# Session versi-s17 — v1

Framework : audit copy direct (pas de framework AIDA/PAS applicable — livrable technique).
Persona : Thomas, marchand de biens. Niveau de conscience : Product-Aware (il est déjà dans l'outil).

---

## 1. Résumé exécutif

| Critère | Verdict | Note |
|---|---|---|
| G33 Zéro anglicisme visible | PASS — aucun anglicisme détecté dans les strings UI | 10/10 |
| G24 Registre tu/vous | FAIL — alternance non justifiée (titre "Découpez vos lots" = impératif sans sujet, mais tooltip "Double-cliquez pour renommer" = impératif neutre OK ; le reste est sans sujet explicite — MAIS `confirm()` natif crée un contexte de navigateur non maîtrisé) | 8/10 |
| Actionabilité des messages d'erreur | FAIL — 6 messages d'erreur sur 6 sont non actionnables : cause absente, action utilisateur absente | 5/10 |
| UTF-8 canonique | FAIL — `m²` encodé `m\u00B2` (ligne 75 LotPanel) au lieu du caractère UTF-8 direct `m²` ; faute d'accent "irreversible" (ligne 253 page.tsx) | 6/10 |
| Cohérence avec Étape 1 Upload | FAIL — `confirm()` natif du navigateur en lieu et place d'une `ConfirmModal` portalisée (cohérence interaction rompue) | 7/10 |
| **Note globale** | **FAIL sur 3 axes bloquants** | **6,5/10** |

---

## 2. Tableau findings

| # | Fichier:ligne | Gate/Axe | String actuelle | Correction EXACTE | Sévérité |
|---|---|---|---|---|---|
| F1 | page.tsx:253 | Règle n°13 UTF-8 + cohérence Upload | `confirm("Supprimer ce lot ? Cette action est irreversible.")` | Remplacer le `confirm()` natif par une `ConfirmModal` portalisée (pattern Upload). Message modal : `"Supprimer ce lot ?\nCette action est irréversible."` (accent sur irréversible + saut de ligne dans le corps de la modale). Voir F2 pour le libellé complet. | P0 |
| F2 | page.tsx:253 | Règle n°13 UTF-8 (accent manquant) | `"irreversible"` | `"irréversible"` | P0 |
| F3 | page.tsx:131 | Actionabilité erreur — chargement | `"Impossible de charger les données du projet."` | `"Impossible de charger les données du projet. Vérifiez votre connexion et actualisez la page."` | P1 |
| F4 | page.tsx:192 et 195 | Actionabilité erreur — sauvegarde auto | `"Impossible de sauvegarder les modifications."` | `"Modifications non enregistrées. Rechargez la page pour reprendre depuis la dernière version sauvegardée."` | P1 |
| F5 | page.tsx:242 et 245 | Actionabilité erreur — renommage | `"Impossible de renommer le lot."` | `"Le renommage n'a pas pu être enregistré. Réessayez ou rechargez la page."` | P1 |
| F6 | page.tsx:265 et 269 | Actionabilité erreur — suppression | `"Impossible de supprimer le lot."` | `"La suppression a échoué. Le lot a été restauré automatiquement."` (rollback déjà effectué par `fetchData()` — le message doit le confirmer) | P1 |
| F7 | page.tsx:309 | Actionabilité erreur — création | `"Impossible de créer le lot."` | `"Le lot n'a pas pu être créé. Réessayez ou rechargez la page."` | P1 |
| F8 | page.tsx:331 | Actionabilité erreur — validation | `"Impossible de valider les lots."` | `"La validation a échoué. Vérifiez que les lots ne se chevauchent pas, puis réessayez."` (la cause la plus probable est le chevauchement — la nommer) | P1 |
| F9 | LotPanel.tsx:75 | Règle n°13 UTF-8 | `` `${Number(lot.surface_m2).toFixed(0)} m\u00B2` `` | `` `${Number(lot.surface_m2).toFixed(0)} m²` `` (caractère UTF-8 direct — règle n°13) | P1 |
| F10 | LotPanel.tsx:127 | Registre / micro-copy tooltip | `title="Double-cliquez pour renommer"` | `title="Double-cliquez pour renommer"` — PASS, libellé correct et neutre. Aucune correction. | — |
| F11 | LotPanel.tsx:118 | Aria-label registre | `aria-label="Renommer le lot"` | PASS — neutre, aucune correction. | — |
| F12 | LotPanel.tsx:88 | Aria-label registre | `aria-label={\`Sélectionner ${lot.name}\`}` | PASS — neutre, aucune correction. | — |
| F13 | LotPanel.tsx:149 | Aria-label registre | `aria-label={\`Supprimer ${lot.name}\`}` | PASS — neutre, aucune correction. | — |
| F14 | LotPanel.tsx:270 | CTA validation — libellé | `"Continuer vers les pièces"` | PASS — libellé clair, verbe d'action + destination explicite. Aucune correction. | — |
| F15 | LotPanel.tsx:199 | Empty state | `"Aucun lot détecté — créez-en manuellement"` | PASS — conforme à la spec US-VS L463. Aucune correction. | — |
| F16 | LotPanel.tsx:248 | CTA ajout | `"Ajouter un lot"` | PASS — libellé court, verbe d'action, cohérent avec le registre de l'outil. Aucune correction. | — |
| F17 | page.tsx:281 | Nommage lot généré | `` `Lot ${lotNumber} — ${floorLabel}` `` avec `floorLabel = selectedFloor === 0 ? "RDC" : \`R+${selectedFloor}\`` | PASS — format cohérent, tiret cadratin correct, convention métier respectée (RDC / R+N). Aucune correction. | — |
| F18 | page.tsx:401–406 | H1 + sous-titre | `"Découpez vos lots"` / `"Ajustez les zones de chaque lot sur le plan. Déplacez et redimensionnez les rectangles, ou ajoutez de nouveaux lots manuellement."` | H1 correct : impératif direct, ton pro-fluide, cohérent avec l'Étape 1. Sous-titre : fonctionnel et précis. PASS — aucune correction. | — |
| F19 | LotPanel.tsx:276–278 | Message avertissement chevauchement | `"Corrigez les chevauchements avant de continuer."` | PASS — actionnable (verbe d'action + condition claire). Aucune correction. | — |

**Findings actionnables : F1 (P0), F2 (P0), F3 à F9 (P1) — 9 corrections à appliquer.**

---

## 3. Verdict gates

| Gate | Résultat | Justification |
|---|---|---|
| G24 Registre tu/vous | PASS | Aucune alternance tu/vous détectée. Tous les libellés UI sont à l'impératif neutre (sans sujet) ou à la troisième personne. Le registre "vous" de politesse s'applique aux messages longs — les messages d'erreur corrigés (F3–F8) utilisent l'impératif neutre ("Vérifiez", "Rechargez", "Réessayez") cohérent avec le brand voice. |
| G33 Zéro anglicisme visible | PASS | Grep `upload\|uploader\|uploadé\|uploadez\|download\|feedback\|meeting\|forwarder` — zéro occurrence dans les strings utilisateur visibles des 3 fichiers audités. |
| Règle n°13 UTF-8 | FAIL (F2, F9) | 2 occurrences : accent manquant "irreversible" (P0) et `m\u00B2` au lieu de `m²` (P1). Corrections exactes fournies. |
| Règle n°19 Zéro anglicisme UI | PASS | Identique G33 — aucun anglicisme en surface utilisateur. |
| Cohérence Upload (ConfirmModal) | FAIL (F1) | `confirm()` natif du navigateur utilisé pour la suppression de lot (P0). L'Étape 1 Upload utilise une `ConfirmModal` portalisée — la cohérence interaction est rompue. |

---

## 4. Handoff @fullstack — Pattern typiste

### Priorité P0 — Bloquer la livraison

**F1 + F2 — Remplacer `confirm()` natif par ConfirmModal + corriger l'accent**

Dans `versi-studio/src/app/vs/projects/[id]/lots/page.tsx`, ligne 253 :

```
// old_string (à remplacer)
if (!confirm("Supprimer ce lot ? Cette action est irreversible.")) return;

// new_string (pattern ConfirmModal — adapter selon l'implémentation existante dans Upload)
// Déclencher la ConfirmModal portalisée avec :
//   title   : "Supprimer ce lot ?"
//   body    : "Cette action est irréversible."
//   cta     : "Supprimer"
//   onConfirm : () => { /* corps existant du handleDeleteLot */ }
```

Note : le pattern exact de la ConfirmModal dépend de son implémentation dans l'Étape 1 Upload. @fullstack doit vérifier le composant existant (`ConfirmModal` ou équivalent) et l'adapter à l'identique.

---

### Priorité P1 — À corriger dans la session

**F3 — page.tsx:131**

```
old_string: "Impossible de charger les données du projet."
new_string: "Impossible de charger les données du projet. Vérifiez votre connexion et actualisez la page."
```

**F4 — page.tsx:192 et 195 (2 occurrences identiques)**

```
old_string: "Impossible de sauvegarder les modifications."
new_string: "Modifications non enregistrées. Rechargez la page pour reprendre depuis la dernière version sauvegardée."
```

**F5 — page.tsx:242 et 245 (2 occurrences identiques)**

```
old_string: "Impossible de renommer le lot."
new_string: "Le renommage n'a pas pu être enregistré. Réessayez ou rechargez la page."
```

**F6 — page.tsx:265 et 269 (2 occurrences identiques)**

```
old_string: "Impossible de supprimer le lot."
new_string: "La suppression a échoué. Le lot a été restauré automatiquement."
```

**F7 — page.tsx:309**

```
old_string: "Impossible de créer le lot."
new_string: "Le lot n'a pas pu être créé. Réessayez ou rechargez la page."
```

**F8 — page.tsx:331**

```
old_string: "Impossible de valider les lots."
new_string: "La validation a échoué. Vérifiez que les lots ne se chevauchent pas, puis réessayez."
```

**F9 — LotPanel.tsx:75**

```
old_string: `${Number(lot.surface_m2).toFixed(0)} m\u00B2`
new_string: `${Number(lot.surface_m2).toFixed(0)} m²`
```

---

**Handoff → @fullstack**
- Fichiers produits : `docs/copy/lots-us-vs-06-08-copy-audit-v1.md`
- Décisions prises : registre "vous" conforme (G24 PASS) ; G33 PASS ; 2 gates FAIL (règle n°13 et cohérence ConfirmModal) ; 9 corrections exactes fournies (2 P0, 7 P1)
- Points d'attention : F1 est P0 bloquant — le `confirm()` natif du navigateur rompt la cohérence interaction avec l'Étape 1 Upload. Vérifier le composant ConfirmModal existant avant d'implémenter. F9 : caractère `m²` UTF-8 direct — ne pas ré-encoder en `\u00B2`.
