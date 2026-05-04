# Specs Fonctionnelles — Étape 4 v2 : Visuels sur Plan

Session : versi-s29 | Date : 2026-05-04 | Agent : @product-manager

---

## 1. Résumé exécutif

**Pourquoi cette refonte.** L'Étape 4 actuelle traite chaque pièce de façon isolée : une photo → un style → un visuel. Cette approche ignore la réalité du travail de Thomas : un immeuble a un plan, les pièces ont des positions relatives, un photographe capture plusieurs angles, et un acquéreur doit comprendre l'espace global — pas une succession d'images déconnectées.

**Ce que ça résout.** La v2 transforme l'Étape 4 en canvas spatial : le plan extrait en Étape 3 devient la surface de travail. Thomas place les photos sur le plan (drag-drop), indique l'angle de vue du photographe par une flèche pivotable, choisit combien de visuels par pièce (1 à 5), ajoute un commentaire libre par pièce. L'IA génère des visuels cohérents entre eux — même style, même mobilier, même lumière — et pose des questions bloquantes si une ambiguïté risque de produire un rendu incohérent.

**Personas.** Thomas (utilisateur outil interne, pilote le flux de production) est l'acteur de l'Étape 4. Laurent (48 ans, investisseur immobilier, persona commercial principal de Versi) est le destinataire final : il évalue un dossier en 10 secondes et ferme l'onglet si les visuels ne transmettent pas la solidité de l'opérateur.

**Bénéfice Laurent.** Un dossier avec 3-5 visuels cohérents par pièce, ancrés dans un plan reconnaissable et annotés des angles de vue, communique la maîtrise opérationnelle de Versi et passe le filtre de crédibilité sans effort.

**Arbitrages Thomas déjà tranchés (non rediscutables).** Plan étape 4 = read-only. Cohérence inter-visuels d'une pièce = obligatoire. Questions IA = bloquantes avant génération.

---

## 2. Vision UX

[SQUELETTE]

---

## 3. User Stories

[SQUELETTE]

---

## 4. Data Model — Diff vs actuel

[SQUELETTE]

---

## 5. Règles Métier

[SQUELETTE]

---

## 6. États UI par écran

[SQUELETTE]

---

## 7. Edge Cases

[SQUELETTE]

---

## 8. Handoff

[SQUELETTE]

---

## Auto-évaluation gates

[SQUELETTE]
