# Évaluation persona Laurent (substitution Thomas marchand) — Upload US-VS-02 v1

> Agent : @testeur-persona-laurent | Date : 2026-04-16
> Persona : Laurent en mode "Thomas marchand de biens" — achète, rénove, revend. Pressé, professionnel, zéro tolérance pour les outils qui mentent sur l'état de ses données.
> Livrable évalué : `versi-studio/src/app/vs/projects/[id]/upload/page.tsx` + composants DropZone, PlanThumbnail, Stepper
> Sources UX : `docs/ux/upload-us-vs-02-audit-v1.md` | Design : `docs/design/upload-us-vs-02-composition-audit-v1.md`

---

## 1. Résumé exécutif

La page upload est visuellement propre et la mécanique de base fonctionne : je dépose mes plans, ils s'affichent, je clique "Analyser". Mais trois problèmes P0 me bloquent avant même de passer à la suite. L'outil simule une sauvegarde de numéro d'étage sans la faire — c'est un mensonge de données que je ne pardonne pas dans un outil professionnel. Le bouton "Analyser les plans" ne donne aucun retour visuel après le clic — je ne sais pas si l'analyse a démarré. Et la confirmation de suppression est une fenêtre navigateur brute qui rompt toute ambiance pro. Résultat : 3 gates BLOQUANT en FAIL, 2 gates REQUIS en FAIL. NO-GO jusqu'à correction des P0.

---

## 2. Gates GP1-GP10 (tableau verdict)

| Gate | Verdict | Note /10 | Justification |
|---|---|---|---|
| GP1 Compréhension | PASS | 8/10 | En 5 secondes je sais quoi faire : "Uploadez vos plans", zone de dépôt centrale, instruction courte. L'adresse du projet est affichée en label au-dessus du titre — je sais sur quelle opération je travaille. Pas ambigu. |
| GP2 Valeur | FAIL | 5/10 | La page me dit d'uploader des plans. Elle ne me dit pas pourquoi. Ce qui se passe après l'upload — l'IA extrait automatiquement les lots et les pièces — n'est jamais mentionné. Pour Thomas marchand, c'est exactement ce qui justifie d'utiliser cet outil plutôt qu'un Excel. Si je ne vois pas la promesse de valeur dès l'empty state, je me demande pourquoi je perds du temps. |
| GP3 Crédibilité | FAIL | 5/10 | Deux problèmes qui cassent la confiance d'un professionnel. Premier : je modifie le numéro d'étage d'un plan, l'interface confirme visuellement la modification, je recharge la page et c'est perdu. L'outil m'a menti. Pour un marchand de biens qui gère des données de chantier, un outil qui simule une sauvegarde sans en faire une, c'est éliminatoire. Deuxième : la boîte de confirmation de suppression est une fenêtre navigateur brute — hors du design system. Ça fait application bricolée, pas outil pro. |
| GP4 Parcours | FAIL | 6/10 | Le chemin jusqu'au premier upload est clair. Le problème arrive après. Je clique sur "Analyser les plans" : rien ne se passe visuellement, la page change d'un coup. Je ne sais pas si mon clic a fonctionné, si l'analyse IA est en cours, si je dois attendre ou si quelque chose a planté. En plus, le Stepper latéral ne me montre pas que l'étape 1 est complétée — les 4 étapes ont l'air identiques visuellement, je ne sais pas où j'en suis dans le workflow. |
| GP5 Pricing | N/A | — | Pas de pricing à cette étape |
| GP6 Recommandation | FAIL | 5/10 | Non. Si un confrère découvre que ses modifications d'étages ne sont pas sauvegardées sans qu'on lui ait dit, il me rappelle pour me dire que l'outil est cassé. Ma crédibilité est engagée quand je recommande quelque chose. Trois bugs P0 non résolus sur une page aussi simple, c'est trop pour faire confiance à ce qui vient après. |
| GP7 Conviction | FAIL | 5/10 | J'appuie sur "Analyser les plans" et... rien. Le bouton ne réagit pas visuellement. La page bascule sans transition. Je ne sais pas si l'analyse IA a bien démarré. Dans ce métier, quand une action critique ne donne pas de retour clair, on clique deux fois pour être sûr — le double-submit est possible et l'outil ne le gère pas. |
| GP8 Look & feel | PASS | 7/10 | L'essentiel est sobre et lisible. Palette neutre, typographie claire, pas d'éléments décoratifs inutiles. Deux bémols : l'étape active du Stepper n'est pas visuellement distincte des autres — sur un Stepper à 4 étapes, savoir où on en est est le minimum. Et le dialog de suppression natif du navigateur casse l'ambiance pro instantanément. Sans ces deux points, ce serait un 8/10. |
| GP9 Outputs utiles | N/A | — | Pas de livrable visible à l'étape upload — évaluation reportée à l'étape suivante |
| GP10 Fidélisation | FAIL | 5/10 | Pour continuer à utiliser un workflow, j'ai besoin de lui faire confiance. Un outil qui modifie des données en silence sans les sauvegarder, ne me dit pas que l'analyse a bien démarré, et ne me montre pas ma progression dans le workflow — c'est un outil sur lequel je ne peux pas m'appuyer. Un marchand qui gère 8 à 12 opérations par an n'a pas de temps à passer à vérifier si ses données sont bien sauvegardées. |

---

## 3. Points de friction identifiés

**Friction #1 — Mensonge de données sur le numéro d'étage [BLOQUANT — GP3, GP10]**

Je change le numéro d'étage de mon plan du RDC. L'interface se met à jour instantanément — je crois que c'est sauvegardé. Je reviens sur la page : c'est perdu. L'API PATCH n'est pas implémentée (commentaire L170 dans le code) mais l'UI fait semblant que si. Pour un marchand de biens qui prépare une analyse de lots, des données d'étages fausses en entrée donnent une analyse fausse en sortie. C'est le scénario cauchemar.

**Friction #2 — "Analyser les plans" : le vide après le clic [BLOQUANT — GP4, GP7]**

Je clique sur "Analyser les plans". Le bouton ne réagit pas visuellement. Aucun spinner, aucun message de transition. La page bascule vers l'étape suivante sans que je comprenne ce qui s'est passé. Est-ce que l'analyse IA a bien démarré ? Est-ce que mon opération est bien enregistrée ? Je ne sais pas. Double-submit possible (le bouton ne se désactive pas pendant le PATCH).

**Friction #3 — Dialog de suppression : fenêtre navigateur brute [BLOQUANT — GP3, GP8]**

Je veux supprimer un plan uploadé par erreur. Une fenêtre grise système s'ouvre — boutons "OK / Annuler" du navigateur, hors du design system. Sur un outil qui se présente comme professionnel, ce genre de rupture visuelle me fait douter de la qualité du reste. Si la page de base est bâclée sur ce détail, qu'est-ce que ça donne sur les étapes critiques ?

**Friction #4 — La valeur de l'IA est invisible [GP2]**

La page me demande d'uploader des plans sans m'expliquer ce que ça va déclencher. Nulle part je ne vois que derrière ce bouton il y a une extraction automatique de lots et de pièces par IA. Si je ne sais pas pourquoi je fais cette action, je ne comprends pas la valeur du produit.

**Friction #5 — Stepper : je ne sais pas où j'en suis [GP4]**

Les 4 étapes du Stepper latéral ont visuellement le même poids. L'étape en cours n'est pas mise en évidence. Pour un workflow à 4 étapes, l'orientation visuelle doit être immédiate. L'audit design confirme : le DS spécifie fond noir + texte blanc pour l'étape active — l'implémentation utilise fond blanc + contour léger, indiscernable des autres étapes.

**Friction #6 — "Étage 0" au lieu de "RDC" [vocabulaire métier — GP3]**

Je suis marchand de biens. Je parle de RDC, pas d'Étage 0. Ce n'est pas bloquant seul mais c'est un signal que l'outil n'est pas calibré pour mon métier.

**Friction #7 — Progression d'upload opaque [GP4]**

Quand j'uploade 4 fichiers, je vois 4 spinners mais un seul upload est actif à la fois. L'upload est séquentiel, pas parallèle. Je ne sais pas combien de temps ça va prendre. Sur chantier en 4G avec des PDFs de 10 Mo, c'est un vrai sujet.

---

## 4. Ce qui marche bien

**Clarté du premier écran.** "Uploadez vos plans" avec l'adresse de l'opération en surtitre — je sais immédiatement sur quelle opération je travaille et ce qu'on attend de moi.

**L'instruction de format est concrète.** "Un plan par lot, ou un plan d'ensemble — les deux formats fonctionnent. PDF ou image, résolution minimum 150 dpi." Un marchand sait d'emblée que son scan iPhone suffit. Pas de langage technique inutile.

**La zone de dépôt est grande et claire.** Affordance non ambiguë, drag-and-drop fonctionnel, feedback drag-over (bordure colorée + texte "Relâchez pour déposer"). Pas d'hésitation.

**Le compteur de plans est utile.** "3 plans uploadés — 7 emplacements restants" : information concrète, je sais où j'en suis par rapport à la limite.

**La gestion des erreurs d'upload est lisible.** Toast rouge avec bouton de fermeture, message explicite sur le format ou la taille refusés.

**La palette est sobre et professionnelle.** Pas de couleurs criardes, pas d'éléments décoratifs. Registre outil de travail, pas SaaS grand public.

---

## 5. Verdict global

**Gates BLOQUANT : 2/5 PASS**
- PASS : GP1 (compréhension), GP8 (look & feel)
- FAIL : GP3 (crédibilité), GP4 (parcours), GP7 (conviction)

**Gates REQUIS : 0/2 PASS**
- FAIL : GP6 (recommandation), GP10 (fidélisation)

**Gates N/A : GP5, GP9**

**Score persona : 5.5/10** — honnête pour un premier jet avec des P0 non corrigés. La mécanique fondamentale est là, l'UX de base est correcte, mais l'intégrité des données et le feedback des actions critiques sont absents.

**Décision : NO-GO**

Trois corrections P0 non négociables avant toute validation persona :
1. Désactiver le champ numéro d'étage OU implémenter l'API PATCH — ne pas laisser une UI qui ment sur l'état des données
2. Ajouter un état loading sur le bouton "Analyser les plans" + désactiver pendant le PATCH pour éviter les double-submits
3. Remplacer le `confirm()` navigateur par un modal design system pour la suppression

---

## 6. Handoff

---
**Handoff → @fullstack** (corrections P0 bloquantes) + **@orchestrator** (décision Batch 4)

**Évaluation produite :** rapport GP1-GP10 sur la page upload `versi-studio/src/app/vs/projects/[id]/upload/page.tsx`

**Verdict persona Laurent :** NO-GO — 3 gates BLOQUANT en FAIL (GP3, GP4, GP7), 2 gates REQUIS en FAIL (GP6, GP10)

**Blockers persona (à corriger avant re-évaluation) :**

1. **Mensonge de données sur floor_number** — `page.tsx` L163-174 + `PlanThumbnail.tsx` : l'optimistic update sur `floor_number` n'est pas persisté (API PATCH absente, commentaire L170). Solution immédiate : désactiver l'input avec tooltip "Modification d'étage disponible prochainement". Ne jamais laisser l'UI simuler une sauvegarde qui n'a pas lieu. C'est la correction la plus urgente — elle impacte GP3 et GP10.

2. **Bouton "Analyser les plans" sans feedback** — `page.tsx` L178-190 : ajouter un état `isAnalyzing` (boolean), désactiver le bouton + afficher "Analyse en cours..." + spinner pendant le PATCH, reset dans le catch. Sans ça : double-submit possible, Thomas ne sait pas si l'analyse a démarré. Impacte GP4 et GP7.

3. **`confirm()` navigateur pour la suppression** — `page.tsx` L141 : remplacer par un modal design system. Titre "Supprimer ce plan ?", bouton "Supprimer" (destructeur) + "Annuler", focus trap, fermeture Escape. Corriger la faute typographique "irreversible" → "irréversible". Impacte GP3 et GP8.

**Quick wins persona (améliorations valeur perçue — GP2, à faire dans la même passe) :**
- Ajouter dans l'empty state : "Après l'upload, l'IA extrait automatiquement vos lots et pièces" — la promesse de valeur du workflow est invisible aujourd'hui
- Corriger l'état actif du Stepper (fond noir `bg-bg-dark`, texte blanc selon DS §5.1) pour que Thomas sache où il en est d'un coup d'oeil
- Alimenter `completedSteps` depuis `project.status` dans `page.tsx` L225 pour refléter la progression réelle

**Agents à relancer :** @fullstack pour les corrections P0 + quick wins, puis @testeur-persona-laurent en mode révision sur GP3, GP4, GP7 uniquement après correction.

---
