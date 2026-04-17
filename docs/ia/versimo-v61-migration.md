# Migration Versimo v61 vers Versi Studio

**Auteur** : @ia
**Date** : 2026-04-17
**Source** : `/tmp/versimo-ref/` (branche `claude/session-recovery-analysis-SoNoa`)
**Cible** : `/home/user/Versi/versi-studio/src/lib/vs/`

---

## 1. Tableau comparatif

| Feature | Versi Studio (actuel) | Versimo v61 | Adoption ? |
|---|---|---|---|
| **Pipeline** | 1 passe unique (gpt-image-1 via images.edit) | 2 passes (surfaces puis meubles) via Responses API (gpt-4.1 + gpt-image-1.5 tool) | NON — architecture incompatible (API différente) |
| **Builders par type de pièce** | 1 seul `buildVisualPrompt` générique | 8 builders Pass 1 + 9 builders Pass 2 dédiés | PARTIEL — intégrer les directives métier par type dans le prompt unique |
| **Style data** | `styles.ts` : 12 styles avec `prompt_hint` 1 ligne | `style-resolver.ts` : 12 styles avec `surfacePrompt` + `furniturePrompt` détaillés (~200 mots chacun) | OUI — fort gain qualitatif |
| **Style variants** | Aucun | `style-variants.ts` : 3 compositions x 3 palettes par style + sélection déterministe par hash | OUI — variété entre générations |
| **resolveChooseOne** | Aucun | Résolution aléatoire des alternatives "(choose one: ...)" | OUI — variété intra-génération |
| **Preservation structurelle** | Règle STRICT RULE 1 conditionnelle (s22) | PASS1_PREAMBLE (STRUCTURE LOCK), PRESERVATION constante | PARTIEL — enrichir STRICT RULE 1 avec les clauses Versimo |
| **Equipment preservation** | Basique ("KEEP structural elements") | PASS2_EQUIPMENT détaillé (radiateurs, panneaux électriques, thermostats, etc.) + exception conditionnelle pour retrait explicite | OUI — critique pour pièces brutes |
| **Cleanup temporaires** | Non | CLEANUP_V53 (debris, échelles, personnes, outils, seaux, bâches) + split TEMPORARY vs PERMANENT | OUI — essentiel pour photos brutes Thomas |
| **Anti wall-art hallucination** | Non | Clause positive "art stays freestanding or leans against baseboard" au lieu de "no wall art" | OUI — learning P0 Versimo |
| **Bathroom hierarchy** | Non | STEP 0 (raw shell) / STEP 1 (étroit <1.5m) / STEP 2 (standard) / STEP 3 (preserve) | OUI — via room-type enrichment |
| **Kitchen preservation-first** | Non | Step 0 (raw shell) puis preservation-first des built-ins existants | OUI — via room-type enrichment |
| **extractRoomInventory** | Non | Vision pre-pass (gpt-4.1-mini) pour décrire la géométrie permanente | HORS SCOPE V1 — ajout futur |
| **Best-of-2** | Non | Scoring comparatif pour pièces complexes | HORS SCOPE V1 |
| **Transformations structurelles** | STRICT RULE 1 conditionnelle (10/10 s22) | Non documenté dans Versimo | CONSERVER tel quel — validé 10/10 |
| **Styles communs** | scandinave, industriel, moderne, bohème, classique, minimaliste, art-deco, tropical, wabi-sabi, mid-century, cottagecore, japandi | scandinavian, industrial, contemporary, bohemian, haussmannian, japandi, art-deco, mid-century, mediterranean, cosy, wabi-sabi, maximalist | FUSION — voir section 4 |

---

## 2. Scope V1 de la migration

### Must-have
1. **Style resolver enrichi** : créer `prompt-styles.ts` avec surfacePrompt + furniturePrompt détaillés par style (migrés de Versimo)
2. **Style variants** : créer `style-variants.ts` avec les 3 compositions + sélection déterministe
3. **Enrichissement buildVisualPrompt** : intégrer les directives PRESERVATION, CLEANUP, EQUIPMENT dans le prompt unique
4. **resolveChooseOne** : variété entre générations
5. **Room-type directives** : enrichir le prompt selon le type de pièce (bathroom STEP 0-3, kitchen preservation-first)

### Nice-to-have (V2)
- extractRoomInventory (vision pre-pass)
- Best-of-2 scoring
- 2 passes séparées (si migration API vers Responses)

### Hors scope
- Migration d'API (rester sur images.edit + gpt-image-1)
- Tests de non-régression Versimo (1524 tests spécifiques au pipeline 2 passes)
- Outdoor styles et builders

---

## 3. Fichiers migrés

[A COMPLETER après implémentation]

---

## 4. Mapping des styles

[A COMPLETER]

---

## 5. Tests non-régression

[A COMPLETER]

---

## 6. Recommandations V2

[A COMPLETER]

---

## 7. Handoff

[A COMPLETER]
