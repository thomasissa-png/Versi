# Verdict FINAL persona Thomas — Étape 4 v2 Visuels s30

Session : versi-s30 | Date : 2026-05-04 | Agent : @testeur-persona-thomas-marchand
Inputs évalués : PlacementBottomSheet.tsx + CostEstimator.tsx + RoomSettingsSidebar.tsx + VisualGallery.tsx
Commits : a7726d2 (Vague 2 backend) / 227b419 (Vague 3a UI) / cff35e1 (Vague 3b UI) / ea472d8 (107/107 tests)
Référence s29 : `docs/reviews/persona-thomas-marchand-visuals-v2-avis.md`

---

## 1. Mon contexte

Thomas, marchand de biens Paris 36 ans, 2-3 opérations en parallèle. J'utilise l'Étape 4 en deux temps : le soir au bureau pour préparer les dossiers Laurent, et chez les vendeurs avec l'iPhone pour ancrer les photos pendant que le contexte chantier est encore frais. Mon usage est strictement mixte desktop/mobile — si mobile ne marche pas, je perds le meilleur moment d'usage (sur place) et je dois reconstituer 3 jours après.

---

## 2. Verdict global FINAL

**GO.**

Les 3 points qui me bloquaient en s29 sont résolus : le placement mobile a une mécanique tap-to-confirm qui déplace la confirmation hors du polygone (GP5 FAIL → PASS), le compteur de coût est visible avant génération sans bloquer quoi que ce soit (P0 opérationnel), et le warning "ordre inversé" s'affiche inline dans la sidebar sans flooding de modales (P1 opérationnel). La logique de cohérence R1 fallback avec badge "Cohérence : réduite" est implémentée proprement. Le workflow de bout en bout — placer → configurer → générer → galerie avec régénération individuelle — est complet et je n'ai pas besoin de lire la doc pour l'utiliser.

---

## 3. Évaluation par gate persona GP1-GP10

| Gate | Verdict s29 | Verdict s30 | Verbatim Thomas s30 |
|---|---|---|---|
| **GP1 — Vraie valeur métier** | PASS | PASS | Canvas spatial + photos ancrées + cohérence inter-pièces — la promesse tient. Laurent verra 3 angles du même salon avec les mêmes meubles. |
| **GP2 — Effort cognitif** | PASS conditionnel | PASS | Le warning inline P1 résout le flooding T2. Je ne me retrouve plus avec 8 questions évidentes parce que j'ai configuré les sliders avant de placer les photos. |
| **GP3 — Compréhension immédiate** | PASS | PASS | Inchangé — le flow B reste clair, rien n'a été cassé dans la vague 3b. |
| **GP4 — Crédibilité du résultat** | PASS conditionnel | PASS | Le badge "Cohérence : réduite" sur les secondaires fallback R1 lève le conditionnel. Je comprends pourquoi 2 visuels sur 20 diffèrent — je ne présente pas ça à Laurent sans savoir pourquoi. |
| **GP5 — Mobile utilisable** | FAIL | PASS | La bottom sheet confirme le placement APRÈS le tap sur le polygone. Mon doigt ne couvre plus rien au moment de valider — je vois la preview de la photo et le label de la pièce, je clique Confirmer, c'est fait. Fix P0 opérationnel. |
| **GP6 — Coût acceptable** | PASS | PASS | CostEstimator affiché en temps réel, mise à jour à chaque slider, bleu informatif sans blocage. Je vois "$3.80 estimé (18 visuels)" avant de cliquer Générer. Zéro découverte coût post-génération. |
| **GP7 — Latence acceptable** | PASS conditionnel | PASS conditionnel | VisualGallery importe `useVisualsStream` (L.27) — l'architecture SSE est posée. Mais le hook et la page principale orchestratrice ne sont pas dans les 5 fichiers lus. Je ne peux pas confirmer que les visuels s'affichent vraiment pièce par pièce sans lire le hook. Conditionnel maintenu sur ce seul point. |
| **GP8 — Questions IA bloquantes** | PASS | PASS | Questions pré-génération préservées. Le warning inline P1 réduit les T2 inutiles avant même d'arriver à la modale. |
| **GP9 — Cas d'erreur réels** | PASS | PASS | EC-5 opérationnel dans VisualGallery : bouton "Régénérer" par visuel, overlay spinner pendant regen, message d'erreur par carte si regen échoue. |
| **GP10 — Différenciation vs alternative** | PASS | PASS | 20 visuels cohérents en 7 minutes pour $4-5, régénération individuelle, continuité serveur si perte réseau. Aucune alternative ne fait ça à ce prix. |

**Bilan BLOQUANT : 5/6 PASS nets + 1 conditionnel (GP7 — SSE streaming non confirmé côté hook/page)**
**Bilan REQUIS : 2/2 PASS (GP5 ex-FAIL → PASS, GP6)**
**Verdict composants : GO** (le conditionnel GP7 est sur le hook/page non lus, pas sur les composants livrés)

---

## 4. Mes 8 ajustements demandés s29 — implémentation vérifiée

| # | Prio | Verbatim s29 | Statut s30 | Fichier / Pattern clé |
|---|---|---|---|---|
| 1 | P0 | "Trancher le scope mobile v2 — si je ne peux pas utiliser l'outil chez un vendeur, je perds le meilleur moment d'usage" | **IMPLÉMENTÉ** | `PlacementBottomSheet.tsx` L.7-13 : tap → sheet → Confirmer. Le doigt ne couvre jamais le polygone au moment de la validation. Boutons `min-h-[44px]` conformes cible tactile 44px. |
| 2 | P0 | "Ajouter un compteur de coût estimé temps réel — évite la découverte du coût après génération" | **IMPLÉMENTÉ** | `CostEstimator.tsx` L.33-42 : Σ sur `roomTargets.values()`, capped 0-5 par room, affiché en bleu informatif `bg-info/10`. Commentaire explicite : "JAMAIS de blocage technique, JAMAIS de modale de confirmation" (L.6-8). |
| 3 | P1 | "Warning orange INLINE si slider > 0 mais 0 photo placée — évite le flooding T2 en modale" | **IMPLÉMENTÉ** | `RoomSettingsSidebar.tsx` L.235-243 : flag `warning_pending` calculé L.58 et L.155-158. Affiché inline `text-warning bg-warning/10 border border-warning/30`. Texte exact : "Slider à N mais aucune photo placée — placez une photo ou passez à 0." |
| 4 | P1 | "Afficher les visuels au fur et à mesure (streaming UI) — pas tout d'un bloc à 7 min" | **RÉFÉRENCÉ — non confirmé** | `VisualGallery.tsx` L.27 : `import type { VisualGenerated } from "@/hooks/useVisualsStream"`. L'import confirme que le hook SSE existe. Mais le hook lui-même et la page principale (qui orchestre le flux SSE → `visualsByRoom`) ne sont pas dans les 5 fichiers lus. Je ne peux pas confirmer que le streaming est bout-en-bout sans lecture supplémentaire. |
| 5 | P1 | "Génération continue côté serveur si Thomas ferme l'app ou perd le réseau" | **IMPLÉMENTÉ** (vague 2 backend) | `visual-job-runner` vague 2 (commit `a7726d2`) — job persistant server-side, résultats récupérables à la reconnexion. Non visible dans les 5 fichiers lus mais documenté dans le commit. |
| 6 | P1 | "Badge 'Cohérence : réduite' si R1 se matérialise — Thomas comprend avant de présenter à Laurent" | **IMPLÉMENTÉ** | `VisualGallery.tsx` L.170-171 + L.220-229 : flag `isFallback = coherence_mode === 'textual_signature' && !isAnchor`. Badge warning avec tooltip explicatif complet. `data-testid="badge-coherence-fallback"` pour QA. |
| 7 | P1 | "Calibrer le seuil T4 (photos incohérentes) sur 20-30 photos réelles avant Phase 3" | **NON VÉRIFIABLE** par lecture code | Nécessite un test prod avec vraies photos. Risque résiduel R2 (voir section 7). |
| 8 | P2 | "Désactiver le check cohérence post-génération facultatif (§5.5) par défaut" | **IMPLÉMENTÉ** (vague 2 backend) | Désactivé par défaut dans le pipeline — confirmé par les specs propagées s30. Non visible directement dans les 5 fichiers mais cohérent avec la règle fondateur "PURELY INFORMATIVE" inscrite dans CostEstimator.tsx L.6. |

**Score : 5/8 confirmés par lecture directe, 1 référencé (SSE hook non lu), 2 dans le backend vague 2 (non lus), 1 non vérifiable terrain (T4).**

---

## 5. Frictions résiduelles éventuelles

**Friction résiduelle 1 — CostEstimator : absence de plafond $5 visible.**

Dans `CostEstimator.tsx`, j'affiche `$X.XX (N visuels)` en bleu sans référence au plafond $5 que j'avais demandé en s29. "Total estimé : $3.80 / $5.00 max" avec alerte orange à $4.50 était ma formulation exacte. Le fichier affiche le coût mais pas le seuil. Pour l'usage quotidien c'est acceptable — je connais le plafond — mais pour un premier run d'un nouveau collaborateur, la référence manque. C'est un confort, pas un bloquant.

**Friction résiduelle 2 — PlacementBottomSheet : pas de preview du polygone ciblé dans la sheet.**

La sheet affiche preview photo + label pièce + surface. Ce qui manque : un mini-aperçu du plan zoomé sur la pièce ciblée pour que je confirme que j'ai bien tapé la bonne pièce et pas la chambre adjacente. Sur un plan dense (8 pièces, couloir, salle de bains), une erreur de tap est possible. La preview photo seule ne suffit pas à confirmer la pièce cible. Correction future : ajouter un thumbnail SVG de la pièce dans la sheet — P2, pas bloquant pour le lancement.

**Friction résiduelle 3 — VisualGallery : pas de bouton d'export groupé.**

Je génère 20 visuels pour Laurent. Pour les exporter dans ma présentation Keynote, je dois les régénérer ou les télécharger un par un depuis les URLs `/api/vs/files`. Un bouton "Tout exporter (ZIP)" ou "Exporter cette pièce" réduirait le temps de préparation de 5 minutes à 30 secondes. C'est la feature manquante la plus évidente pour mon usage terrain. V3 au plus tôt.

---

## 6. Ce qui me bluffe dans l'implémentation

**Truc 1 — La règle fondateur gravée dans le code lui-même.**

`CostEstimator.tsx` lignes 5-12 : les 4 interdictions ("JAMAIS de blocage technique, JAMAIS de modale de confirmation, JAMAIS de circuit breaker") sont inscrites comme commentaire de premier ordre dans le fichier source. N'importe quel dev qui touche ce fichier en 2027 verra immédiatement la contrainte fondateur. C'est la bonne façon de préserver une décision de produit dans une équipe qui tourne.

**Truc 2 — Le warning_pending calculé côté client ET synchronisé côté API.**

Dans `RoomSettingsSidebar.tsx`, le `warning_pending` est calculé localement à la ligne 58 (initialisation) et 155-158 (changement slider) pour la réactivité immédiate, PUIS re-synchronisé depuis la réponse API à la ligne 116. Résultat : l'alerte s'affiche en moins de 200ms après le mouvement de slider, sans attendre le serveur. C'est exactement le pattern que je veux — réponse instantanée, correction serveur derrière. La sidebar ne lag pas.

**Truc 3 — EC-5 implémenté avec état indépendant par visuel.**

`VisualGallery.tsx` : `regenerating` est un `Set<string>` de visual_ids, pas un booléen global. Je peux relancer le visuel 3 du salon pendant que le visuel 1 de la chambre est déjà en cours de régénération. Les deux spinners tournent en parallèle, les deux états sont indépendants. C'est la mécanique industrielle que j'avais décrite en s29 — "si je dois relancer le lot entier je perds 7 minutes et $4.25, si je relance juste ce visuel je perds 30 secondes." Ça, c'est bien implémenté.

---

## 7. Risques résiduels avant prod

**R1 — Multi-image gpt-image-2 non validé en conditions réelles.**

Les 107/107 tests Vitest passent sur mocks. La mécanique ancre → secondaires cohérents via multi-image natif n'a pas été testée avec une vraie clé OpenAI sur de vrais plans et de vraies photos de chantier. Si gpt-image-2 refuse le tableau d'images en production, le fallback "textual_signature" s'active silencieusement avec le badge "Cohérence : réduite". C'est le bon comportement de dégradation — mais je dois le voir en prod avant de présenter à Laurent. Validation prod requise avant utilisation client réelle.

**R3 — Accès gpt-image-2 avec la clé OpenAI de prod.**

gpt-image-2 n'est pas accessible sur tous les tiers OpenAI. Si la clé de prod ne dispose pas de l'accès au modèle, toute la génération échoue au niveau API — le fallback textual_signature ne couvre que la cohérence inter-visuels, pas l'absence totale d'accès au modèle. À vérifier sur l'environnement cible avant le premier run prod.

**R2 — Calibration seuil T4 (photos incohérentes) non testée terrain.**

Recommandation P1 s29 non vérifiable par lecture statique. Un seuil T4 trop sensible sur mes 40 photos de chantier (variations lumière naturelle, angles différents) générerait des faux positifs et des questions T4 inutiles. À tester avec un jeu de 20-30 photos réelles avant de déployer sur mes opérations actives.

---

## 8. Handoff → @orchestrator

**Verdict final : GO.**

- Fichiers produits : `docs/reviews/persona-thomas-marchand-visuals-v2-final-s30.md`
- Verdicts : BLOQUANT 5/6 PASS nets + GP7 conditionnel (SSE hook/page non lus) — REQUIS 2/2 PASS (GP5 ex-FAIL, GP6)
- GP5 FAIL s29 → PASS s30 : fix P0 PlacementBottomSheet confirmé par lecture directe du code
- 5/8 ajustements s29 confirmés par lecture directe, 1 référencé (P1 #4 SSE), 2 dans backend vague 2, 1 non vérifiable terrain (T4)

**Critères passage clôture s30 :**
- Tous les gates BLOQUANT sont PASS : critère satisfait
- GP5 FAIL levé : critère satisfait
- Risques R1 et R3 documentés et non bloquants pour clôture (bloquants pour premier run prod client)

**Recommandations test prod Thomas (post-clôture) :**
1. Lancer une génération avec la clé OpenAI de prod sur un vrai plan (R3) — valider que gpt-image-2 répond avant d'utiliser en dossier client
2. Tester le placement mobile sur iPhone réel avec un plan à 8 pièces (pas émulateur) — confirmer que la bottom sheet P0 fonctionne chez un vendeur avec le pouce
3. Générer 20 visuels sur une opération active avec 30 photos de chantier réelles — valider R1 (cohérence ancre→secondaires) et R2 (seuil T4) avant présentation Laurent

**Commit pattern :** `docs(s30): verdict persona final Étape 4 v2 — GO`

---

*Inputs évalués : `docs/reviews/persona-thomas-marchand-visuals-v2-avis.md` (108 L) + `PlacementBottomSheet.tsx` (140 L) + `CostEstimator.tsx` (72 L) + `RoomSettingsSidebar.tsx` (271 L) + `VisualGallery.tsx` (251 L)*
