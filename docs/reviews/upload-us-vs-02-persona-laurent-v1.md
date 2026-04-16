# Évaluation persona Laurent (substitution Thomas marchand) — Upload US-VS-02 v1

> Agent : @testeur-persona-laurent | Date : 2026-04-16
> Persona : Laurent en mode "Thomas marchand de biens" — achète, rénove, revend. Pressé, professionnel, zéro tolérance pour les outils qui mentent sur l'état de ses données.
> Livrable évalué : `versi-studio/src/app/vs/projects/[id]/upload/page.tsx` + composants DropZone, PlanThumbnail, Stepper
> Sources UX : `docs/ux/upload-us-vs-02-audit-v1.md` | Design : `docs/design/upload-us-vs-02-composition-audit-v1.md`

---

## 1. Résumé exécutif

La page upload est visuellement propre et la mécanique de base fonctionne : je dépose mes plans, ils s'affichent, je clique "Analyser". Mais trois problèmes P0 me bloquent avant même de passer à la suite. L'outil simule une sauvegarde de numéro d'étage sans la faire — c'est un mensonge de données que je ne pardonne pas dans un outil professionnel. Le bouton "Analyser les plans" ne donne aucun retour visuel après le clic — je ne sais pas si l'analyse a démarré. Et la confirmation de suppression est une fenêtre navigateur brute qui rompt toute ambiance pro. Résultat : 3 gates BLOQUANT en FAIL, 2 gates REQUIS en FAIL. NO-GO jusqu'à correction des P0.

## 2. Gates GP1-GP10 (tableau verdict)

| Gate | Verdict | Note /10 | Justification |
|---|---|---|---|
| GP1 Compréhension | PASS | 8/10 | En 5 secondes je sais quoi faire : "Uploadez vos plans", zone de dépôt centrale, instruction courte. L'adresse du projet est affichée en label au-dessus du titre — je sais sur quelle opération je travaille. Pas ambigu. |
| GP2 Valeur | FAIL | 5/10 | La page me dit d'uploader des plans. Elle ne me dit pas pourquoi. Ce qui se passe après l'upload — l'IA extrait automatiquement les lots et les pièces — n'est jamais mentionné. Pour Thomas marchand, c'est exactement ce qui justifie d'utiliser cet outil plutôt qu'un Excel. Si je ne vois pas la promesse de valeur dès l'empty state, je me demande pourquoi je perds du temps. |
| GP3 Crédibilité | FAIL | 5/10 | Deux problèmes qui cassent la confiance d'un professionnel. Premier : je modifie le numéro d'étage d'un plan, l'interface confirme visuellement la modification, je recharge la page et c'est perdu. L'outil m'a menti. Pour un marchand de biens qui gère des données de chantier, un outil qui simule une sauvegarde sans en faire une, c'est éliminatoire. Deuxième : la boîte de confirmation de suppression est une fenêtre navigateur brute — style Windows 98, hors du design system. Ça fait application bricolée, pas outil pro. |
| GP4 Parcours | FAIL | 6/10 | Le chemin jusqu'au premier upload est clair. Le problème arrive après. Je clique sur "Analyser les plans" : rien ne se passe visuellement, la page change d'un coup. Je ne sais pas si mon clic a fonctionné, si l'analyse IA est en cours, si je dois attendre ou si quelque chose a planté. En plus, le Stepper latéral ne m'indique pas que l'étape 1 est complétée même après que je l'aie faite — les 4 étapes ont l'air identiques visuellement, je ne sais pas où j'en suis dans le workflow. |
| GP5 Pricing | N/A | — | Pas de pricing à cette étape |
| GP6 Recommandation | FAIL | 5/10 | Non, je ne recommanderais pas cet outil à un autre marchand dans l'état actuel. Si un confrère découvre que ses modifications d'étages ne sont pas sauvegardées sans qu'on lui ait dit, il me rappelle pour me dire que l'outil est cassé. Ma crédibilité est engagée quand je recommande quelque chose. Trois bugs P0 non résolus sur une page aussi simple, c'est trop pour faire confiance à ce qui vient après. |
| GP7 Conviction | FAIL | 5/10 | J'ai uploadé mes plans, j'appuie sur "Analyser les plans" et... rien. Le bouton ne change pas d'état, je ne vois pas de chargement, la page se met à jour sans transition. Je ne sais pas si l'analyse IA a bien démarré. Dans ce métier, quand une action critique — comme lancer une analyse — ne donne pas de retour clair, on clique deux fois pour être sûr. Double-submit possible, aucun retour de l'outil. Pas de quoi continuer avec confiance. |
| GP8 Look & feel | PASS | 7/10 | L'essentiel est sobre et lisible. Palette neutre, typographie claire, pas d'éléments décoratifs inutiles. C'est dans le bon registre pour un outil professionnel. Deux bémols : l'étape active du Stepper n'est pas visuellement distincte des autres étapes — sur un Stepper à 4 étapes, c'est le minimum syndical de savoir où on en est. Et le dialog de suppression natif du navigateur casse l'ambiance pro instantanément. Sans ces deux points, ce serait un 8/10. |
| GP9 Outputs utiles | N/A | — | Pas de livrable visible à l'étape upload |
| GP10 Fidélisation | FAIL | 5/10 | Pour continuer à utiliser un workflow, j'ai besoin de lui faire confiance. Aujourd'hui l'outil modifie des données en silence sans les sauvegarder, ne me dit pas que l'analyse a bien démarré, et ne me montre pas ma progression dans le workflow. Ce ne sont pas des détails cosmétiques — c'est la confiance dans l'outil. Un marchand qui gère 8 à 12 opérations par an n'a pas de temps à passer à vérifier si ses données sont bien sauvegardées. Il a besoin d'un outil sur lequel il peut s'appuyer. |

## 3. Points de friction identifiés

**Friction #1 — Mensonge de données sur le numéro d'étage [BLOQUANT]**
Je change le numéro d'étage de mon plan du RDC. L'interface se met à jour instantanément — je crois que c'est sauvegardé. Je reviens sur la page, c'est perdu. L'API PATCH n'est pas implémentée mais l'UI fait semblant que si. Pour un marchand de biens qui prépare une analyse de lots, des données d'étages fausses en entrée donnent une analyse fausse en sortie. C'est le scénario cauchemar.

**Friction #2 — "Analyser les plans" : le vide après le clic [BLOQUANT]**
Je clique sur "Analyser les plans". Le bouton ne réagit pas. Aucun spinner, aucun message, aucune transition. La page bascule vers l'étape suivante sans que je comprenne ce qui s'est passé. Est-ce que l'analyse IA a bien démarré ? Est-ce que mon opération est bien enregistrée ? Je ne sais pas. Dans ce métier, quand on n'est pas sûr, on clique deux fois — et là le double-submit est possible.

**Friction #3 — Dialog de suppression : fenêtre navigateur brute [BLOQUANT]**
Je veux supprimer un plan uploadé par erreur. Une fenêtre grise système s'ouvre — style Windows 98, boutons "OK / Annuler" du navigateur, hors du design system. Sur un outil qui se présente comme professionnel, ce genre de rupture visuelle me fait douter de la qualité du reste. Si la page de base est bâclée sur ce détail, qu'est-ce que ça donne sur les étapes critiques ?

**Friction #4 — L'IA est invisible [valeur perçue]**
La page me demande d'uploader des plans sans m'expliquer ce que ça va déclencher. Je ne vois nulle part que derrière ce bouton il y a une extraction automatique de lots et de pièces par IA. Si je ne sais pas pourquoi je fais cette action, je ne comprends pas la valeur du produit.

**Friction #5 — Stepper : je ne sais pas où j'en suis [parcours]**
Les 4 étapes du Stepper latéral ont visuellement le même poids. L'étape en cours n'est pas mise en évidence — pas de fond différent, pas de couleur distinctive. Pour un workflow à 4 étapes, la navigation doit être claire en un coup d'oeil.

**Friction #6 — "Étage 0" au lieu de "RDC" [vocabulaire]**
Je suis marchand de biens. Je parle de RDC, pas d'Étage 0. Ce n'est pas bloquant mais ça indique que l'outil n'est pas calibré pour mon métier.

**Friction #7 — Progression d'upload sans vraie information**
Quand j'uploade 4 fichiers, je vois 4 spinners en même temps mais un seul est actif. Je ne sais pas combien de temps ça va prendre. Sur chantier en 4G avec des PDFs de 10 Mo, c'est un vrai sujet.

## 4. Ce qui marche bien

**Clarté du premier écran.** "Uploadez vos plans" avec l'adresse de l'opération en surtitre — je sais immédiatement sur quoi je travaille et ce qu'on attend de moi. Pas de texte inutile.

**L'instruction de format est concrète.** "Un plan par lot, ou un plan d'ensemble — les deux formats fonctionnent. PDF ou image, résolution minimum 150 dpi." C'est le genre d'information dont un marchand a besoin : il sait d'emblée que son scan iPhone suffit.

**La zone de dépôt est grande et claire.** Pas d'hésitation sur l'affordance — la zone est centrale, la bordure pointillée identifiable, le texte "Déposez vos plans ici" sans ambiguïté. Drag-and-drop fonctionnel.

**Le compteur de plans est utile.** "3 plans uploadés — 7 emplacements restants" : information concrète, je sais où j'en suis par rapport à la limite.

**La gestion des erreurs d'upload est lisible.** Toast rouge avec bouton de fermeture, message explicite. Pour les erreurs de format ou de taille, je comprends ce qui a raté.

**La palette est sobre et professionnelle.** Pas de couleurs criardes, pas d'éléments décoratifs. C'est dans le bon registre pour un outil de travail quotidien.

## 5. Verdict global

**Gates BLOQUANT : 2/5 PASS** (GP1, GP8)
Gates en FAIL : GP3 (crédibilité), GP4 (parcours), GP7 (conviction)

**Gates REQUIS : 0/2 PASS** (GP6, GP10 en FAIL)

**Gates N/A : GP5, GP9**

**Score persona : 5/10** — honnête pour un premier jet avec des P0 non corrigés. La mécanique fondamentale est là mais l'intégrité des données et le feedback des actions critiques sont absents.

**Décision : NO-GO**

Trois corrections P0 sont non négociables avant toute validation persona :
1. Désactiver le champ numéro d'étage OU implémenter l'API PATCH — ne pas laisser une UI qui ment sur l'état des données
2. Ajouter un état loading sur le bouton "Analyser les plans" + désactiver pendant le PATCH pour éviter les double-submits
3. Remplacer le `confirm()` navigateur par un modal design system pour la suppression

## 6. Handoff

---
**Handoff → @fullstack** (corrections P0 bloquantes) + **@orchestrator** (décision Batch 4)

**Évaluation produite :** rapport GP1-GP10 sur la page upload `versi-studio/src/app/vs/projects/[id]/upload/page.tsx`

**Verdict persona Laurent :** NO-GO — 3 gates BLOQUANT en FAIL, 2 gates REQUIS en FAIL

**Blockers persona (à corriger avant re-évaluation) :**
1. **Mensonge de données sur floor_number** — `page.tsx` L163-174 + `PlanThumbnail.tsx` : l'optimistic update sur `floor_number` n'est pas persisté (API PATCH absente). Solution immédiate : désactiver l'input avec tooltip "Modification d'étage disponible prochainement". Ne pas laisser l'UI simuler une sauvegarde qui n'a pas lieu.
2. **Bouton "Analyser les plans" sans feedback** — `page.tsx` L178-190 : ajouter un état `isAnalyzing` (boolean), désactiver le bouton + afficher "Analyse en cours..." + spinner pendant le PATCH, reset dans le catch. Sans ça : double-submit possible, Thomas ne sait pas si l'analyse a démarré.
3. **`confirm()` navigateur pour la suppression** — `page.tsx` L141 : remplacer par un modal design system. Titre "Supprimer ce plan ?", bouton "Supprimer" (destructeur) + "Annuler", focus trap, fermeture Escape. Corriger la faute "irreversible" → "irréversible".

**Quick wins persona (amélioration valeur perçue — GP2) :**
- Ajouter dans l'empty state un encadré : "Après l'upload, l'IA extrait automatiquement vos lots et pièces" — c'est la promesse de valeur du workflow, elle est invisible aujourd'hui
- Corriger l'état actif du Stepper (fond noir, texte blanc selon DS) pour que Thomas sache où il en est dans le workflow en un coup d'oeil
- Alimenter `completedSteps` depuis `project.status` dans le Stepper pour refléter la progression réelle

**Agents à relancer :** @fullstack pour les corrections P0, puis @testeur-persona-laurent en mode révision sur les gates GP3, GP4, GP7 uniquement après correction.
---
