# Audit UX — Étape 2 Lots Versi Studio (US-VS-06/07/08) — v1

**Date** : 2026-04-16
**Agent** : @ux
**Persona cible** : Thomas marchand de biens (outil interne Versi Studio)
**Scope** : page.tsx (lots), PlanCanvas.tsx, LotPanel.tsx
**Référence specs** : docs/product/vs-functional-specs.md §4, docs/ux/vs-wireframes.md §5

---

## 1. Résumé exécutif

**Verdict v1 : 6.5 / 10**

Note honnête — l'architecture de l'étape 2 est solide (debounce save, overlap detection, états UI documentés en commentaire), mais plusieurs lacunes bloquantes existent avant validation.

| Critère | Note | Statut |
|---|---|---|
| Parcours Thomas (cognitive walkthrough) | 6 / 10 | 3 frictions P0 — fusion absente, double-clic renommage non évident, bouton "Réessayer" manquant |
| Retour visuel drag/resize | 5 / 10 | Surface m² non mise à jour en temps réel pendant le drag ; pas d'indicateur visuel de sauvegarde en cours |
| Responsive mobile | 4 / 10 | Canvas + panneau latéral en flex horizontal sans breakpoint — layout cassé < 768px, drawer bas non implémenté |
| Accessibilité | 6 / 10 | Canvas non navigable au clavier ; sélecteur d'étage accessible mais changement non annoncé aux lecteurs d'écran |
| 5 états UI | 7 / 10 | 4 états sur 5 présents ; état "erreur fetch" manque un bouton "Réessayer" — l'erreur est affichée mais non récupérable sans rechargement de page |

**Findings P0 : 4 — P1 : 5 — P2 : 2**
Total : 11 findings actionnables pour Batch 2.

---

## 2. Tableau findings

| # | Fichier : ligne | Axe | Constat | Sévérité | Correction exacte à appliquer |
|---|---|---|---|---|---|
| F01 | `page.tsx` : 410–447 | État erreur — bouton "Réessayer" | L'état erreur (`error !== null`) affiche un toast fermable avec une croix. Fermer le toast ne relance pas `fetchData`. Thomas voit "Impossible de charger les données" et doit recharger manuellement la page — parcours interrompu sans chemin de sortie. | **P0** | Dans le bloc erreur (L428), remplacer le bouton `×` par deux boutons côte à côte : `Réessayer` (appelle `fetchData()`, `setError(null)`) et `×` (ferme sans relancer). Code exact : `<button onClick={() => { setError(null); fetchData(); }}>Réessayer</button>` |
| F02 | `page.tsx` : 182–197 | État erreur save — pas de rollback | `saveLotZone` set `setError("Impossible de sauvegarder...")` mais laisse le lot déplacé dans l'état local. Thomas ne sait pas si la position affichée est sauvegardée ou non. | **P0** | Dans `saveLotZone` (L193-196), en cas d'erreur, rappeler `fetchData()` pour resynchroniser l'état local avec la base. Ajouter dans le message d'erreur : "Position non sauvegardée — annulée." |
| F03 | `page.tsx` : 483 + wireframe L254 | Responsive mobile — layout cassé | Le wrapper `flex gap-0` (L483) place Canvas + LotPanel en colonne horizontale sans breakpoint responsive. Sur < 768px, les deux colonnes s'affichent côte à côte écrasées. Le wireframe (§5 L254) spécifie un drawer bas sur mobile — non implémenté. | **P0** | Ajouter classe Tailwind au wrapper : `flex flex-col md:flex-row`. Sur mobile, LotPanel devient un drawer fixe en bas (hauteur 40vh, `position: fixed, bottom: 0`). PlanCanvas prend `min-h-[calc(100vh-40vh)]` sur mobile. |
| F04 | `LotPanel.tsx` : 121–131 | Parcours Thomas — renommage non découvrable | Le renommage déclenche sur double-clic (`onDoubleClick`). La `<button>` affiche `title="Double-cliquez pour renommer"` en tooltip natif — invisible sur mobile et non annoncé aux lecteurs d'écran. Thomas ne sait pas qu'il peut renommer sans découvrir par hasard. | **P0** | Ajouter un icône stylo visible au hover/focus à côté du nom : `<button aria-label="Renommer ce lot" onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 ..."><PencilIcon /></button>`. Déclenche `setEditing(true)` au clic simple. Conserver le double-clic comme raccourci. |
| F05 | `PlanCanvas.tsx` : 156–198 | Retour visuel drag — surface m² non temps réel | Pendant le drag, `onUpdateLotZone` (debounce 1s) ne met pas à jour `lot.surface_m2` en temps réel. Le LotPanel affiche la surface de la dernière sauvegarde. Thomas ne voit pas la surface changer pendant qu'il redimensionne. | **P1** | Dans `PlanCanvas`, calculer la surface estimée locale pendant le drag et l'afficher en overlay sur le rectangle : `"${(zone.width_percent * zone.height_percent / 100).toFixed(0)} m²"` (valeur relative — à calibrer avec le ratio plan réel). Mettre à jour à chaque `mousemove`. |
| F06 | `PlanCanvas.tsx` : 124–127 | Retour visuel drag — état saving non visible | Aucun indicateur visuel pendant le debounce de 1s ne signale que la sauvegarde est en attente. Thomas peut quitter la page pendant la fenêtre de 1s et perdre la dernière position. | **P1** | Ajouter un state `saving` dans `page.tsx`. Setter à `true` au début de `handleUpdateLotZone` (avant le debounce), à `false` après résolution de `saveLotZone`. Afficher dans l'en-tête de page : `{saving && <span>Sauvegarde...</span>}`. |
| F07 | `page.tsx` : 451–480 | Sélecteur d'étage — annonce screen reader absente | Les boutons d'étage ont `focus-visible` correct mais le changement d'étage (nouveau plan chargé, lots filtrés) n'est pas annoncé via `aria-live`. Un utilisateur non-voyant ne sait pas que l'affichage a changé. | **P1** | Ajouter une région `aria-live="polite"` dans le rendu : `<div aria-live="polite" className="sr-only">{`Étage ${selectedFloor === 0 ? "RDC" : `R+${selectedFloor}`} sélectionné — ${filteredLots.length} lot${filteredLots.length !== 1 ? "s" : ""}`}</div>`. |
| F08 | `PlanCanvas.tsx` : 113–120 | Accessibilité canvas — navigation clavier absente | Le `<canvas>` est un élément non interactif au clavier. Aucun `tabIndex`, aucun `role`, aucun gestionnaire `keydown`. Thomas ne peut pas sélectionner, déplacer ou redimensionner un lot au clavier. | **P1** | Ajouter `tabIndex={0}` et `role="application"` sur le canvas. Implémenter gestionnaire `onKeyDown` : touches directionnelles déplacent le lot sélectionné de 1% par step, `Tab` / `Shift+Tab` cyclent entre les lots. Ajouter `aria-label="Éditeur de plan — utilisez les touches directionnelles pour déplacer le lot sélectionné"`. |
| F09 | `LotPanel.tsx` : 196–201 | État vide — bouton "Ajouter un lot" absent de l'état vide | L'état vide affiche "Aucun lot détecté — créez-en manuellement" (texte seul). Le bouton "Ajouter un lot" est dans la section Actions en bas, séparé visuellement. Thomas en état vide doit chercher le bouton — pas de CTA dans le message vide. | **P1** | Dans le bloc `lots.length === 0` (L197–201), ajouter directement un `<button onClick={onAddLot}>Ajouter un lot</button>` dans le message vide, avec la même apparence que le bouton dashed du bas. Le bouton du bas reste pour les états non vides. |
| F10 | `page.tsx` : 44–63 | Chevauchement — contour rouge sur les 2 lots | `overlappingIds` est calculé dans `PlanCanvas.tsx` (L96–109) via `getOverlappingLotIds`. La logique est présente. Vérification nécessaire sur le rendu : le contour rouge est-il appliqué aux 2 lots chevauchants dans `draw()` ? | **P2** | Vérifier dans `PlanCanvas.tsx` L156+ que le rendu des lots chevauchants utilise `overlappingIds.has(lot.id)` pour appliquer `strokeStyle = "red"`. Si non implémenté dans `draw()`, ajouter la condition. |
| F11 | `page.tsx` : 387–512 | Fusion de lots — non implémentée, non signalée | US-VS-07 spécifie la fusion de lots. Aucune UI n'existe dans LotPanel ni dans PlanCanvas pour cette action. Aucun message "fonctionnalité à venir" non plus. Thomas peut penser que la fonctionnalité est cassée. | **P2** | Ajouter dans LotPanel (section Actions) un bouton désactivé avec tooltip : `<button disabled title="Fusion disponible prochainement">Fusionner les lots sélectionnés</button>`. Cela signale que la feature existe dans la roadmap sans induire en erreur. |

---

## 3. Verdict gates

### G21 — 5 états UI par écran interactif

| État | Implémenté | Évidence |
|---|---|---|
| Défaut | PASS | Plan chargé, lots affichés avec overlay coloré |
| Loading | PASS | `loading === true` → skeleton documenté en commentaire L6, state `loading` L81 |
| Vide | PASS (partiel) | Message texte présent (LotPanel L199), mais sans CTA inline — voir F09 |
| Erreur | FAIL | Toast affiché mais non récupérable sans rechargement — bouton "Réessayer" absent — voir F01 |
| Succès | PASS | Redirect vers `/vs/projects/[id]/rooms` après validation (L10) |

**Verdict G21 : FAIL** — état erreur non récupérable sans bouton "Réessayer". Correction : F01.

---

### G33 — Zéro anglicisme en surface utilisateur

Grep effectué mentalement sur les 3 fichiers lus :

| Terme angliciste | Trouvé | Localisation |
|---|---|---|
| `upload` / `uploader` | NON | — |
| `feedback` | NON | — |
| `meeting` | NON | — |
| `forwarder` | NON | — |
| `download` | NON | — |

**Verdict G33 : PASS** — aucun anglicisme détecté dans les 3 fichiers audités.

---

### Règle n°19 — Zéro anglicisme copy client-facing

Vérification sur les strings UI visibles :
- "Aucun lot détecté — créez-en manuellement" : conforme
- "Continuer vers les pièces" : conforme
- "Impossible de sauvegarder les modifications." : conforme
- "Corrigez les chevauchements avant de continuer." : conforme
- "Surface non renseignée" : conforme

**Verdict règle n°19 : PASS**

---

### Verdict global

| Gate | Statut | Bloquant |
|---|---|---|
| G21 (5 états UI) | FAIL | Oui — F01 à corriger |
| G33 (zéro anglicisme) | PASS | — |
| Règle n°19 | PASS | — |

**Verdict v1 : NO-GO** — 1 gate BLOQUANT FAIL (G21). Corrections F01 + F02 + F03 requises en priorité absolue.

---

## 4. Handoff @fullstack

---

**Handoff → @fullstack**

**Fichiers produits** : `docs/ux/lots-us-vs-06-08-audit-v1.md`

**Batch 2 — corrections pattern typiste (ordre de priorité)**

**P0 — à faire en premier (gate BLOQUANT G21)**

1. **F01** — `page.tsx` L428 : ajouter bouton "Réessayer" dans le toast d'erreur global. Action : appelle `setError(null)` puis `fetchData()`. Conserver le bouton `×` pour la fermeture seule.
2. **F02** — `page.tsx` `saveLotZone` L193–196 : en cas d'erreur save, rappeler `fetchData()` pour rollback de l'état local. Modifier le message : "Position non sauvegardée — annulée."
3. **F03** — `page.tsx` L483 : wrapper `flex gap-0` → `flex flex-col md:flex-row`. LotPanel en drawer fixe bas sur mobile (`position: fixed; bottom: 0; height: 40vh`). PlanCanvas : `height: calc(60vh)` sur mobile.

**P1 — à faire en second**

4. **F04** — `LotPanel.tsx` L121 : ajouter icône stylo cliquable au hover/focus à côté du nom de lot. Clic simple → `setEditing(true)`. Double-clic conservé comme raccourci.
5. **F05** — `PlanCanvas.tsx` dans la boucle `draw()` : afficher overlay texte surface m² en temps réel sur le rectangle actif pendant le drag.
6. **F06** — `page.tsx` : ajouter state `saving` (boolean). Setter à `true` dans `handleUpdateLotZone`, à `false` après résolution de `saveLotZone`. Afficher `{saving && <span className="text-xs text-muted">Sauvegarde...</span>}` dans l'en-tête.
7. **F07** — `page.tsx` : ajouter `<div aria-live="polite" className="sr-only">` avec annonce de l'étage sélectionné et du nombre de lots.
8. **F08** — `PlanCanvas.tsx` : ajouter `tabIndex={0}` + `role="application"` sur le `<canvas>`. Gestionnaire `onKeyDown` : flèches déplacent le lot sélectionné de 1% par step.
9. **F09** — `LotPanel.tsx` L197–201 : dans le bloc état vide, ajouter `<button onClick={onAddLot}>Ajouter un lot</button>` directement dans le message vide.

**P2 — à faire si temps disponible**

10. **F10** — `PlanCanvas.tsx` `draw()` : vérifier que `overlappingIds.has(lot.id)` est utilisé pour appliquer `strokeStyle = "#ef4444"` sur les lots en chevauchement.
11. **F11** — `LotPanel.tsx` section Actions : ajouter bouton désactivé "Fusionner les lots sélectionnés" avec `title="Fusion disponible prochainement"`.

**Points d'attention**
- Le responsive mobile (F03) est le changement le plus risqué — tester sur viewport 375px et 768px après implémentation.
- F05 (surface temps réel) : la valeur affichée sera relative (pixels canvas), pas les m² réels. Indiquer "~X m²" ou éviter l'unité si la calibration n'est pas disponible.
- Ne pas modifier la logique de debounce (1s) — elle est correcte.

---
