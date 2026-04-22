# Spec refonte pipeline étape 1 — canonicalisation plan

> Livrable @product-manager — session s25 Phase 0
> Date : 2026-04-22

---

## Problème

Le pipeline IA actuel reçoit des PDFs bruts hétérogènes (scan incliné, traits fins, légendes superposées, arrière-plans grisés) et produit des rooms mal positionnées, aux formes bizarres, avec des espaces vides. Les inputs non normalisés créent une variance non contrôlée qui plafonne la qualité des pièces détectées, quel que soit le soin apporté aux prompts d'extraction. Résultat : Thomas ne peut pas livrer des pièces fiables à ses clients, ce qui bloque l'adoption de l'outil en conditions réelles de transaction.

---

## Vision produit

Versi Studio canonicalise chaque plan à l'import pour offrir au marchand de biens la cartographie de pièces la plus précise du marché sur tout type de plan immobilier.

---

## Avis PM — Canonicalisation V1 ou V2 ?

**Verdict : V1, bloquant, sans négociation.**

Justification en trois points :
1. Le plafond actuel (~9.35/10 sur P00 propre, bien moins sur plans haussmanniens réels) n'est pas un plafond de prompt — c'est un plafond d'input. Aucune optimisation de passe-2 ou snap-to-label ne peut compenser un scan incliné à 3° ou un PDF avec calques superposés. La canonicalisation est le seul levier restant à fort effet.
2. Le coût marginal est maîtrisé ($0.05 max estimé) et le bénéfice direct est mesuré (Thomas a constaté le problème en conditions réelles "10 Rue des Muguets"). Le ratio Impact/Effort est exceptionnel.
3. Sans inputs prévisibles, les tests E2E multi-plans sont inutiles : chaque plan devient un cas particulier. La canonicalisation est le socle qui rend toute la suite reproductible.

Seul risque : la canonicalisation introduit un délai de traitement (~15-30s estimés). Acceptable si la pipeline totale reste ≤90s (contrainte Replit).

---

## User stories

### US-VS-R1 : Prévisualiser le plan canonicalisé avant extraction

**Persona** : Thomas, marchand de biens
**Epic** : Refonte pipeline étape 1
**Dépendances** : Aucune (première story du pipeline)
**Priorité** : Impact=5 Confiance=5 → Score=25

En tant que marchand de biens, je veux voir le plan reformaté côte à côte avec mon plan d'origine après dépôt du PDF, pour que je puisse valider visuellement que la canonicalisation n'a pas altéré la géométrie du bien avant de lancer l'extraction des pièces.

**Critères d'acceptance :**
- GIVEN un PDF déposé avec rotation ≤45° WHEN la canonicalisation est terminée THEN le plan canonicalisé s'affiche en ≤90s avec rotation corrigée à 0° (±1°) — PASS/FAIL
- GIVEN un PDF déposé WHEN le plan canonicalisé est affiché THEN un comparateur "Original / Canonicalisé" côte-à-côte est visible sans clic supplémentaire — PASS/FAIL
- GIVEN un plan canonicalisé WHEN Thomas clique "Valider et extraire les pièces" THEN le pipeline d'extraction consomme l'image canonicalisée et non le PDF brut — PASS/FAIL
- GIVEN la canonicalisation échoue (plan illisible, PDF corrompu) WHEN le système détecte l'échec THEN un message "Le plan n'a pas pu être reformaté. L'extraction sera tentée sur le plan d'origine." s'affiche avec possibilité de continuer — PASS/FAIL
- GIVEN un PDF multi-pages WHEN la canonicalisation est lancée THEN seule la page contenant le plan est traitée (détection auto ou sélection Thomas sur la première page) — PASS/FAIL

---

### US-VS-R2 : Corriger l'orientation du plan automatiquement

**Persona** : Thomas, marchand de biens
**Epic** : Refonte pipeline étape 1
**Dépendances** : US-VS-R1

En tant que marchand de biens, je veux que mon plan soit redressé automatiquement si le scan est incliné, pour que les pièces détectées collent aux murs réels sans déformation géométrique.

**Critères d'acceptance :**
- GIVEN un PDF scanné avec rotation 1°-45° WHEN la canonicalisation s'exécute THEN l'image de sortie a une rotation résiduelle ≤1° mesurée sur les murs porteurs horizontaux/verticaux — PASS/FAIL
- GIVEN un plan correctement orienté (rotation 0°) WHEN la canonicalisation s'exécute THEN aucune rotation n'est appliquée (drift ≤0.5°) — PASS/FAIL
- GIVEN un plan en format paysage (largeur > hauteur) WHEN la canonicalisation s'exécute THEN l'orientation paysage est préservée, pas transposée en portrait — PASS/FAIL

---

### US-VS-R3 : Supprimer les artefacts visuels parasites avant extraction

**Persona** : Thomas, marchand de biens
**Epic** : Refonte pipeline étape 1
**Dépendances** : US-VS-R2

En tant que marchand de biens, je veux que les fonds grisés, les calques de légende superposés et les traits de cotation soient neutralisés sur le plan canonicalisé, pour que l'IA ne confonde pas ces artefacts avec des murs ou des pièces.

**Critères d'acceptance :**
- GIVEN un plan avec fond grisé ≥10% de la surface WHEN la canonicalisation s'exécute THEN le fond de l'image de sortie est blanc pur (#FFFFFF ± 5 niveaux) sur ≥95% des pixels non-mur — PASS/FAIL
- GIVEN un plan avec traits de cotation (flèches, chiffres de dimensions) WHEN la canonicalisation s'exécute THEN les labels de cotation sont conservés mais les artefacts graphiques de cote (flèches, lignes fins) sont atténués sans supprimer les murs porteurs — PASS/FAIL
- GIVEN un plan canonicalisé WHEN l'extraction IA s'exécute dessus THEN le nombre de pièces fantômes (sans correspondance géométrique réelle) est ≤1 sur les plans de test P00-P03 — PASS/FAIL

---

### US-VS-R4 : Persister le plan canonicalisé et permettre la ré-extraction

**Persona** : Thomas, marchand de biens
**Epic** : Refonte pipeline étape 1
**Dépendances** : US-VS-R1, US-VS-R3

En tant que marchand de biens, je veux que le plan reformaté soit conservé en base et utilisé systématiquement pour toute ré-extraction, pour que je n'aie pas à revalider la canonicalisation à chaque tentative.

**Critères d'acceptance :**
- GIVEN un plan canonicalisé validé WHEN Thomas relance l'extraction (ré-extraction depuis l'étape 1) THEN la canonicalisation n'est PAS rejouée — le plan en base est réutilisé directement — PASS/FAIL
- GIVEN la colonne `canonicalized_image_path` est remplie en DB WHEN Thomas consulte l'étape 1 d'un plan existant THEN le comparateur affiche le plan canonicalisé stocké (pas une re-génération) en ≤2s — PASS/FAIL
- GIVEN Thomas dépose un nouveau PDF sur un plan existant (remplacement) WHEN le nouveau PDF est déposé THEN la canonicalisation est relancée et `canonicalized_image_path` est mis à jour — PASS/FAIL

---

### US-VS-R5 : Basculer en mode dégradé si la canonicalisation échoue

**Persona** : Thomas, marchand de biens
**Epic** : Refonte pipeline étape 1
**Dépendances** : US-VS-R1

En tant que marchand de biens, je veux pouvoir lancer l'extraction même si la canonicalisation a échoué, pour que je ne sois pas bloqué sur un plan difficile pendant une transaction urgente.

**Critères d'acceptance :**
- GIVEN la canonicalisation échoue (timeout >90s, erreur API, image illisible) WHEN l'échec est détecté THEN le feature flag `VS_PLAN_CANONICALIZE=false` est appliqué automatiquement pour ce plan uniquement et l'extraction reprend sur le PDF brut — PASS/FAIL
- GIVEN le mode dégradé est actif WHEN Thomas consulte l'étape 1 THEN une bannière "Plan non reformaté — résultats moins précis" est affichée de façon permanente (non masquable) — PASS/FAIL
- GIVEN le mode dégradé a été déclenché WHEN Thomas redépose un nouveau PDF THEN la canonicalisation est réessayée automatiquement (pas de blocage permanent) — PASS/FAIL

---

## Hors scope V1

1. **Canonicalisation 3D / maquette numérique** — hors périmètre marchand de biens 2D
2. **Détection automatique de l'échelle (pixels/cm)** — utile mais non bloquant pour la V1 ; les pièces n'ont pas besoin de surface réelle pour l'étape 1
3. **Interface de recadrage manuel** — si la canonicalisation échoue, le mode dégradé suffit en V1 ; l'éditeur de recadrage est V2
4. **Support de plans en format vectoriel (DWG, DXF, SVG)** — PDF uniquement en V1 ; formats vecto en V2 selon demande terrain
5. **Batch canonicalisation sur plusieurs plans simultanément** — Thomas travaille plan par plan en V1

---

## Critères GO PRODUCTION

- [ ] Reality check E2E PASS sur 5 plans variés : P00 (plan propre), P01 (scan incliné), P02 (fond grisé), P03 (haussmannien complexe), P04 (plan Thomas "Rue des Muguets" si fourni)
- [ ] Temps pipeline total (canonicalisation + extraction) ≤90s mesuré sur Replit prod (pas CLI local)
- [ ] Coût par plan ≤$0.10 mesuré sur 10 exécutions réelles (logs API billing)
- [ ] Audit visuel @interior-architect (Yann Duval) : chaque plan du panel noté ≥9/10 sur fidélité géométrique — 10/10 requis unanime
- [ ] Feature flag `VS_PLAN_CANONICALIZE` testé : désactivation n'affecte pas le pipeline de ré-extraction existant (zéro régression sur l'étape 2 et 3)
- [ ] `canonicalized_image_path` persiste en DB après validation et survit à un re-déploiement Replit
- [ ] Aucune pièce fantôme sur P00-P03 (0 lot sans correspondance géométrique réelle dans les rooms Étape 3)
- [ ] Screenshot Playwright preuve pour chaque critère ci-dessus (joint au rapport de gate @moi)

---

## Handoff

---
**Handoff → @orchestrator (Phase 1 — Décision approche)**

Fichiers produits :
- `/home/user/Versi/docs/product/s25-refonte-pipeline-spec.md`

Décisions prises :
- Canonicalisation = V1 bloquante (pas V2), justification PM documentée
- 5 user stories couvrent le flux complet : prévisualisation → correction orientation → nettoyage artefacts → persistence → mode dégradé
- Mode dégradé (US-VS-R5) est obligatoire pour éviter le blocage de Thomas en conditions de transaction réelle
- Feature flag `VS_PLAN_CANONICALIZE` requis pour rollback sans re-déploiement
- Jargon banni dans l'UI : "polygone", "zone", "calque", "contour" — mots autorisés : "plan", "pièce", "lot", "reformaté"

Points d'attention pour la Phase 1 (@moi arbitrage) :
- L'approche technique (pré-rendu IA / CV classique / hybride) est la variable non tranchée — ces specs sont agnostiques de l'approche
- Le critère ≤90s total est une contrainte dure Replit — l'approche POC @ia doit la valider empiriquement
- Le comparateur Original/Canonicalisé (US-VS-R1) est un critère de confiance Thomas fort — ne pas le sacrifier pour gagner des ms d'affichage
- Tester impérativement sur un plan haussmannien réel (P03 ou plan Thomas) avant gate @moi GO PRODUCTION

---
