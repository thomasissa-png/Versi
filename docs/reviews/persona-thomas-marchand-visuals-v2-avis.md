# Avis persona Thomas — Étape 4 v2 Visuels sur Plan

Session : versi-s29 | Date : 2026-05-04 | Agent : @testeur-persona-thomas-marchand

---

## 1. Mon contexte de marchand de biens

Je suis Thomas, marchand de biens à Paris, 36 ans. Je gère 2-3 opérations en parallèle — acquisition, division en lots, revente avec plus-value. L'Étape 4, c'est la dernière ligne droite avant de présenter le dossier à Laurent, mon investisseur. Je l'utilise depuis mon bureau le soir pour préparer une réunion du lendemain, parfois dans le métro entre deux visites, et ponctuellement chez un vendeur avec mon iPhone pendant que je fais les photos du chantier. Mon problème aujourd'hui : 40 photos de chantier en vrac, je les trie à la main, les visuels générés ne se ressemblent pas d'une pièce à l'autre, et Laurent le voit en 10 secondes. Ce que j'attends de la V2 : ancrer mes photos sur le plan, dire à l'IA ce que je veux, et récupérer des visuels cohérents entre eux — en moins de 20 minutes de mon temps actif, le reste l'IA le fait pendant que je passe au lot suivant.

---

## 2. Verdict global

**GO avec ajustements** — le concept est exactement ce dont j'ai besoin (plan spatial, photos ancrées, cohérence inter-visuels) mais 3 points risquent de me faire perdre confiance ou du temps avant d'atteindre la génération : le placement mobile en conditions tactiles réelles, le flooding potentiel de questions T2 si je configure les sliders avant de placer les photos, et le risque R1 silencieux si gpt-image-2 refuse le multi-image.

---

## 3. Évaluation par gate persona (GP1-GP10)

| Gate | Verdict | Verbatim de marchand |
|---|---|---|
| **GP1 — Vraie valeur métier** | PASS | Le passage du mode "1 photo → 1 rendu isolé" à un canvas spatial avec ancrage sur le plan — c'est le vrai problème résolu. Quand Laurent voit 3 angles du même salon avec les mêmes meubles, il comprend l'espace. Avec V1, j'avais 3 images qui ne se ressemblaient pas. La valeur est réelle et immédiate. |
| **GP2 — Effort cognitif** | PASS conditionnel | Upload → placer sur plan → angle → slider → commentaire → Générer. 6 actions par pièce. Sur 8 pièces : 48 actions + questions IA potentielles. Faisable si chaque action prend 30 secondes. Si le placement sur plan mobile est galère, le compte est mauvais et je bascule sur desktop systématiquement — ce qui réduit l'usage mobile à zéro. |
| **GP3 — Compréhension immédiate** | PASS | Le flow Écran B en 5 sous-étapes (sélection → placement → angle → confirmation) est clair. L'instruction "Cliquez où vous étiez quand vous avez pris la photo" est compréhensible en 3 secondes. Je comprends quoi faire sans lire de doc. |
| **GP4 — Crédibilité du résultat** | PASS conditionnel | La mécanique ancre → signature visuelle → secondaires cohérents est la bonne architecture. Si ça marche comme spécifié (même palette hex, mêmes meubles, mêmes finitions), Laurent ne voit pas 3 salons différents. Le risque R1 (gpt-image-2 peut refuser le tableau d'images en input) est un VRAI risque de crédibilité — si la cohérence repose uniquement sur la description textuelle, les visuels vont dériver sans que je comprenne pourquoi. |
| **GP5 — Mobile utilisable** | FAIL | Le tap précis sur un polygone de 8 m² sur un iPhone en conditions de terrain, c'est impossible. La spec UX gère le sujet (FAB, bottom sheet, zoom auto sur la pièce) mais un doigt couvre la moitié du polygone d'une petite chambre. Si le placement est approximatif, l'angle est approximatif, le résultat IA est décalé. La décision "mobile in scope v2 ou non" doit être tranchée P0 avant Phase 3 — elle n'est pas tranchée dans les documents livrés. |
| **GP6 — Coût acceptable** | PASS | $5/projet pour un dossier qui me rapporte 30k-150k€ de marge, c'est zéro comme frein. Ce qui compte c'est la fiabilité, pas le coût. Je valide $5 plafond. Ce que je ne veux pas, c'est découvrir après génération que j'ai dépensé $12 parce que j'avais mis 5 visuels sur 12 pièces sans voir venir le total. Le plafond doit être visible avant que je clique Générer. |
| **GP7 — Latence acceptable** | PASS conditionnel | 7 minutes pour 20 visuels sur 10 pièces, je peux gérer — je fais autre chose pendant. Condition : (1) la barre de progression par pièce est honnête et visible, (2) je peux quitter l'écran sans tuer la génération, (3) les visuels s'affichent au fur et à mesure (pas tout d'un bloc à 7 min). Si ces 3 conditions ne sont pas remplies, 7 minutes perçues sur l'écran de progression, c'est insupportable. |
| **GP8 — Questions IA bloquantes** | PASS | Poser les questions AVANT de générer plutôt qu'en cours de génération — c'est le choix le plus intelligent de la spec. Je préfère répondre à 2-3 questions en amont que relancer 3 fois une génération ratée à $4.25 le run. La modale C avec toutes les questions agrégées en une fois est la bonne UX. Ce que je ne veux pas : 8 questions T2 évidentes parce que j'ai configuré mes sliders avant de placer les photos (voir Friction 2). |
| **GP9 — Cas d'erreur réels** | PASS | EC-5 (1 visuel sur N échoue → les autres conservés + "Régénérer ce visuel") est exactement la bonne mécanique. Perte réseau avec autosave optimiste + queue de replay — documenté. Expiration questions 24h avec message clair — bien. Ce qui manque : si je ferme l'app mobile pendant la génération, est-ce que le job continue côté serveur ? Ça doit être précisé dans le brief @fullstack. |
| **GP10 — Différenciation vs alternative** | PASS | Un photographe à 800€ me donne des photos réelles, pas des projections post-réno. Photoshop me prend 2h par image. Ici j'ai 20 visuels projetés cohérents en 7 minutes pour $5. Si la qualité tient, il n'y a pas de concurrence. La vraie question c'est "si la qualité" — R1 est le risque principal sur cette gate. |

---

## 4. Top 3 frictions identifiées

**Friction 1 — Le placement sur plan mobile en conditions réelles**

"Quand je suis chez un vendeur à 18h, je viens de faire 20 photos avec mon iPhone. J'ouvre l'Étape 4 pour placer les photos pendant que le contexte est encore frais. Le plan s'affiche. La chambre 2 fait 3 cm sur mon écran. Je tape dessus. Mon doigt est trop gros, la photo rebondit vers la zone de dépôt. Je réessaie en zoomant. Je rate encore parce que le polygone est petit. Au 3ème essai je ferme l'appli et je fais ça demain sur desktop. Sauf que demain je ne me souviens plus quelle photo correspond à quelle pièce et je perds 20 minutes à reconstituer le contexte."

**Friction 2 — Le flooding T2 si je configure les sliders avant de placer les photos**

"Mon réflexe naturel : j'arrive sur l'Étape 4, je configure d'abord mes paramètres (3 visuels pour le salon, 2 pour les chambres, commentaires par pièce), PUIS je place les photos. Je clique Générer. L'IA me sort 8 questions T2 'aucune photo placée pour cette pièce' — une par pièce. Je dois répondre question par question à des trucs évidents. Ça me casse les pieds parce que l'interface ne m'a pas guidé dans le bon ordre et me punit maintenant pour ça."

**Friction 3 — Visuels incohérents sans explication si R1 se matérialise**

"Je génère 3 visuels pour le salon. Le premier est parfait — canapé gris anthracite, parquet chêne clair. Le deuxième a un canapé beige. Le troisième un parquet sombre. Je présente ça à Laurent, il me demande si c'est le même appartement. Je n'ai pas la moindre idée que c'est un problème technique (R1 matérialisé côté API), pas un problème de mes photos ou de ma configuration. Je perds confiance dans l'outil sans savoir pourquoi."

---

## 5. Top 3 trucs qui me bluffent

**Truc 1 — Les questions bloquantes AVANT génération, pas pendant.**

C'est la décision de design la plus importante de la spec. V1 générait et ratait. V2 vérifie d'abord. 2 minutes de réponse en amont m'évitent de relancer 3 fois à $4.25 le run. Je veux que ça reste comme ça — ne pas céder à la tentation de virer les questions "parce que ça ralentit l'UX". Le coût de la frustration d'une génération ratée est bien supérieur au coût de 2 minutes de questions.

**Truc 2 — EC-5 : 1 visuel raté sur N, les autres conservés + régénération individuelle.**

Dans mon usage actuel, quand un appel IA plante c'est tout ou rien. Ici je conserve ce qui marche et je relance uniquement ce qui a planté. Sur une génération de 20 visuels il est statistiquement normal d'en avoir 1-2 qui ratent. Si je dois relancer le lot entier, je perds 7 minutes et $4.25. Si je relance juste le visuel raté, je perds 30 secondes. C'est la bonne mécanique industrielle — à préserver absolument.

**Truc 3 — L'autosave optimiste + queue de replay sur perte réseau.**

Dans le métro ou en itinérance, je perds le réseau toutes les 3 minutes. Si je dois resaisir mes commentaires à chaque coupure, je ferme l'appli définitivement. L'autosave optimiste avec synchronisation au retour réseau rend l'outil utilisable dans mes conditions réelles de terrain. C'est la feature d'infrastructure qui détermine si l'outil est vraiment mobile ou seulement "mobile responsive sur papier".

---

## 6. Décision quasi-finale — Recommandations Phase 3

- `Trancher le scope mobile v2 (OUI avec test tactile / NON avec message desktop-only) → C'est une décision business avant une décision technique — si je ne peux pas utiliser l'outil chez un vendeur, je le perds comme moment d'usage et je me retrouve à faire le placement le lendemain sans contexte → P0`

- `Ajouter un compteur de coût estimé temps réel dans la sidebar, mis à jour à chaque changement de slider → "Total estimé : $3.80 / $5.00 max" — avec alerte orange à $4.50 et blocage rouge à $5.00 → Évite la découverte du coût après génération → P0`

- `Détecter l'ordre de configuration inversé (slider > 0 mais 0 photo placée) et afficher un warning orange INLINE dans la sidebar avant le clic Générer → "⚠ Chambre 2 : slider à 2 mais aucune photo placée — placez une photo ou passez le slider à 0" → Évite le flooding T2 en modale → P1`

- `Afficher les visuels au fur et à mesure (streaming UI) — dès qu'une pièce est terminée, ses visuels apparaissent dans la sidebar, les autres sont encore en cours → Perception de vitesse radicalement différente vs attendre 7 minutes un bloc → P1`

- `Préciser dans le brief @fullstack que la génération doit continuer côté serveur si Thomas ferme l'app ou perd le réseau → Job server-side persistant, résultats disponibles à la reconnexion → P1`

- `Si R1 se matérialise (cohérence ancre→secondaires uniquement textuelle) : afficher un badge discret "Cohérence : bonne / réduite" sur chaque visuel secondaire avec tooltip explicatif → Thomas comprend le problème avant de présenter à Laurent, pas pendant → P1`

- `Calibrer le seuil T4 (photos incohérentes) sur 20-30 photos de chantier réelles avant Phase 3 → Un T4 trop sensible (faux positifs sur légères variations lumière naturelle) crée des questions inutiles et use la tolérance de Thomas aux interruptions → P1`

- `Désactiver le check cohérence post-génération facultatif (§5.5 pipeline) par défaut → $0.005/visuel × 20 visuels = $0.10 supplémentaire que je ne veux pas payer pour une validation que je fais visuellement en 30 secondes — option avancée uniquement → P2`

---

## 7. Handoff

**Handoff → @orchestrator**

- Fichiers produits : `/home/user/Versi/docs/reviews/persona-thomas-marchand-visuals-v2-avis.md`
- Verdicts : GP1 PASS, GP2 PASS conditionnel, GP3 PASS, GP4 PASS conditionnel, GP5 FAIL, GP6 PASS, GP7 PASS conditionnel, GP8 PASS, GP9 PASS, GP10 PASS
- Verdict global : **GO avec ajustements — 7/10 PASS nets, 2 conditionnels, 1 FAIL (GP5)**
- Points d'attention :
  - **GP5 FAIL** : placement photo sur polygone en conditions mobile tactiles réelles — décision scope mobile doit être tranchée P0 avant Phase 3 (cf. Friction 1)
  - **GP4 conditionnel** : risque R1 cohérence ancre→secondaires uniquement textuelle si gpt-image-2 refuse multi-image — badge UI "cohérence réduite" requis P1
  - **GP7 conditionnel** : streaming UI visuels par pièce + continuité génération côté serveur requis pour que 7 minutes soit acceptable
  - **Friction critique** : flooding T2 si sliders configurés avant photos — warning inline sidebar P1
- Suivants recommandés :
  - `@fullstack` : intègre les ajustements P0 et P1 de §6 dans son brief Phase 3. Inputs requis : ce doc + `docs/product/visuals-step-v2-specs.md` + `docs/ux/visuals-step-v2-wireframes.md` + `docs/ia/visuals-step-v2-pipeline.md`
  - Thomas (fondateur) : arbitre sur 2 points P0 — (1) scope mobile v2 : "upload only mobile + placement desktop" acceptable ou investissement tactile spécifique requis ? (2) R1 : si gpt-image-2 multi-image non disponible à l'implémentation, accepte-t-il la dégradation cohérence avec badge UI ou veut-il bloquer le lancement V2 jusqu'à confirmation API ?
  - Critères de passage Phase 3 : Thomas valide les 2 points P0 → @fullstack commence l'implémentation

---

*Inputs évalués : `docs/product/visuals-step-v2-specs.md` (296 L) + `docs/ux/visuals-step-v2-wireframes.md` (497 L) + `docs/ia/visuals-step-v2-pipeline.md` (684 L)*
