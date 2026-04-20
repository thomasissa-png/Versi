# Spec produit — Étape 4 : Transformations structurelles dans les visuels

Session : versi-s22 | Date : 2026-04-17 | Agent : @product-manager

---

## Section 1 : Scope V1 vs V2

| Transformation | V1 | V2 | Raison |
|---|---|---|---|
| Supprimer un mur (2 pièces → open-space) | V1 | — | gpt-image-1 via `images.edit` gère cette instruction fiablement. Cas le plus fréquent Thomas (chambre+salon → open-space). Valeur persona directe. |
| Ajouter une cloison (1 grande pièce → 2 chambres) | V1 | — | Instruction structurelle textuelle suffisante pour l'API. Cas numéro 2 en fréquence (division d'immeubles). |
| Percer une ouverture (nouvelle porte ou baie) | V1 | — | Instruction précise et localisable = résultat fiable. Critique pour présenter une connexion cuisine→séjour ou chambre→couloir. |
| Déplacer une cuisine (vers mur extérieur) | V1 | — | Instruction enrichissable : "cuisine déplacée sur le mur de droite avec hotte murale". Valeur pour le cas d'usage ventilation Thomas. |
| Fusionner cuisine + séjour en open-space cuisine | V1 | — | Variante de "supprimer mur" avec précision de configuration. Inclus dans V1 avec exemple cliquable dédié. |
| Agrandissement de fenêtre / baie vitrée | V1 | — | Instruction textuelle fonctionne. Valeur commerciale forte (luminosité = argument de vente). |
| Extension de surface (véranda, terrasse couverte) | V2 | V2 | Nécessite de générer de l'espace qui n'existe pas dans la photo — hors capacité fiable d'`images.edit`. Risque de rendu incohérent élevé. |
| Changement de niveau (abattre plancher, mezzanine) | V2 | V2 | Transformation 3D complexe, gpt-image-1 ne maîtrise pas la perspective de hauteur. |
| Modification de façade extérieure | V2 | V2 | Hors périmètre Étape 4 (photos d'intérieur). |

**Principe V1** : tout ce qui se décrit en une phrase "action + localisation + résultat" est V1. Ce qui nécessite de modifier la géométrie 3D ou la perspective est V2.

---

## Section 2 : Flow utilisateur cible

Thomas arrive sur l'Étape 4. Il a validé ses pièces en Étape 3.

**Étape 4.1 — Sélection de la pièce**
Thomas clique sur une pièce dans la grille (ex : "Salon – 28 m²"). La pièce s'ouvre dans le panneau principal.

**Étape 4.2 — Dépôt de la photo**
Thomas dépose une photo brute de l'état actuel. Validation format (JPG/PNG, max 10 Mo).

**Étape 4.3 — Description du projet [NOUVEAU]**
Juste avant de choisir le style, Thomas voit un champ textuel :
> "Quels travaux structurels prévoyez-vous sur cette pièce ? (optionnel)"

Un sous-texte guide : "Ex : supprimer le mur entre le salon et la cuisine, ajouter une cloison côté couloir..."

Des exemples cliquables sont proposés (voir Section 4). Thomas clique un exemple ou tape librement. Ce champ est **optionnel** — s'il n'y a pas de transformation structurelle (juste une rénovation décorative), il laisse vide.

**Étape 4.4 — Choix du style**
Thomas sélectionne un style (Scandinave, Industriel, Moderne, etc.). La description du projet est conservée.

**Étape 4.5 — Génération**
Thomas clique "Créer le visuel". Le prompt de génération intègre :
- Les instructions structurelles saisies (si présentes)
- Le style choisi
- Le type de pièce et la surface

Durée estimée : 45 à 90 secondes. Barre de progression visible.

**Étape 4.6 — Résultat : validation ou affinage**
Le visuel généré s'affiche. Thomas a 3 options :
- **Valider** → pièce terminée, passer à la suivante
- **Affiner le visuel** (ex-"Modifier") → ouvre le chat Agent Architecte avec suggestions
- **Autre style** → relance la génération avec un style différent (conserve la description projet)

**Étape 4.7 — Chat Agent Architecte (si affinement nécessaire)**
Thomas donne une instruction complémentaire dans le chat. Des suggestions cliquables sont proposées (voir Section 4). L'agent enrichit l'instruction et génère une nouvelle version en ~45 secondes.

**Fin de parcours** : quand toutes les pièces ont un visuel validé → message de complétion + option d'export ou partage du projet.

---

## Section 3 : UI proposée

### 3.1 Champ "Description du projet" (nouveau composant — entre upload et grille de styles)

```
┌─────────────────────────────────────────────────────────────────┐
│  Votre photo                        [Photo déposée ✓]          │
├─────────────────────────────────────────────────────────────────┤
│  Travaux structurels prévus (optionnel)                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Ex : supprimer le mur entre le salon et la cuisine,     │  │
│  │  ajouter une cloison côté couloir...                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Exemples rapides :                                             │
│  [Supprimer un mur]  [Ajouter une cloison]  [Percer une porte] │
│  [Cuisine ouverte]   [Agrandir une fenêtre]                     │
├─────────────────────────────────────────────────────────────────┤
│  Style de décoration                                            │
│  [Scandinave] [Industriel] [Moderne] [Contemporain] [Bohème]   │
├─────────────────────────────────────────────────────────────────┤
│                       [  Créer le visuel  ]                     │
└─────────────────────────────────────────────────────────────────┘
```

**Emplacement** : entre le composant `VisualRoom` état "photo déposée" et la `StyleGrid`.
**Fichier cible** : `VisualRoom.tsx` — nouvel état intermédiaire `select-style` enrichi.
**Taille textarea** : 3 lignes visibles, max 500 caractères, resize vertical autorisé.
**Comportement exemples** : clic sur un badge → texte inséré dans le textarea (concaténé si déjà rempli, séparé par une virgule).

### 3.2 Chat Agent Architecte enrichi (suggestions cliquables)

```
┌─────────────────────────────────────────────────────────────────┐
│  Agent Architecte              [Affiner le visuel — ouvrir]    │
├─────────────────────────────────────────────────────────────────┤
│  ┌─ Messages ──────────────────────────────────────────────┐   │
│  │  Agent : Voici votre visuel post-travaux. Vous pouvez   │   │
│  │  affiner la décoration ou modifier la structure.        │   │
│  └──────────────────────────────────────────────────────── ┘   │
│                                                                  │
│  Suggestions :                                                   │
│  [Plus de lumière naturelle]  [Changer le sol]                  │
│  [Supprimer la cloison]  [Ajouter une verrière]                 │
│  [Cuisine plus ouverte]  [Peinture murale blanche]              │
│                                                                  │
│  ┌───────────────────────────────────────── [Envoyer] ───┐     │
│  │  Décrivez votre modification...                       │     │
│  └───────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

**Bouton renommé** : "Modifier" → **"Affiner le visuel"**
**Fichier cible** : `VisualRoom.tsx` + `ChatAgent.tsx`

---

## Section 4 : Copy / guidance

### 4.1 Label et placeholder du champ description

**Label** : `Travaux structurels prévus (optionnel)`
**Placeholder** :
> Ex : supprimer le mur entre le salon et la cuisine, ajouter une cloison côté couloir...

**Sous-label (aide contextuelle)** :
> Décrivez comme à un architecte : mur à supprimer, cloison à ajouter, ouverture à percer. L'IA intègre ces modifications dans le visuel.

### 4.2 Exemples cliquables (badges — champ description)

| Badge affiché | Texte inséré dans le champ |
|---|---|
| Supprimer un mur | supprimer le mur entre [pièce A] et [pièce B] pour créer un espace ouvert |
| Ajouter une cloison | ajouter une cloison pour diviser la pièce en deux espaces distincts |
| Percer une porte | percer une ouverture de porte sur le mur de droite |
| Cuisine ouverte | ouvrir la cuisine sur le séjour en supprimant le mur séparatif |
| Agrandir une fenêtre | agrandir la fenêtre existante en baie vitrée sur le mur du fond |

**Note** : les crochets [pièce A] / [pièce B] dans le texte inséré sont conservés tels quels — Thomas les remplace manuellement. C'est intentionnel : cela lui signale qu'une précision de sa part est attendue.

### 4.3 Suggestions cliquables dans le chat Agent Architecte

| Badge chat | Instruction envoyée |
|---|---|
| Plus de lumière naturelle | Ajoutez plus de lumière naturelle — agrandissez ou ajoutez des fenêtres si possible |
| Changer le sol | Changez le revêtement de sol par du parquet chêne clair |
| Supprimer la cloison | Supprimez la cloison visible pour ouvrir l'espace |
| Ajouter une verrière | Ajoutez une verrière entre la cuisine et le séjour |
| Cuisine plus ouverte | Ouvrez la cuisine sur le séjour en supprimant le mur séparatif |
| Peinture murale blanche | Repeignez tous les murs en blanc mat |

### 4.4 Message d'introduction dans le chat (premier message Agent)

> Voici votre visuel post-travaux. Décrivez une modification structurelle (mur, cloison, ouverture) ou une retouche décorative — l'agent architecte met à jour le visuel.

### 4.5 Tooltip Étape 4 (sous le titre ou sous la grille de pièces)

> Déposez une photo, décrivez vos travaux, choisissez un style. Affinez ensuite le résultat avec l'Agent Architecte.

---

## Section 5 : Critères qualité

Un visuel est **utilisable pour un prospect** si :

| Critère | Seuil PASS | Seuil FAIL |
|---|---|---|
| Cohérence structurelle | La transformation demandée est visible et reconnaissable (mur absent, cloison présente, ouverture percée) | La structure est identique à la photo source malgré l'instruction |
| Réalisme photographique | On ne voit pas de distorsion, d'artefact de fusion ou de zone floue inexpliquée | Zone de jonction visible, pixelisation, incohérence de perspective |
| Style respecté | Les matériaux et meubles sont cohérents avec le style choisi | Mélange incohérent de styles ou meubles génériques sans style identifiable |
| Proportions de pièce | Les dimensions semblent réalistes par rapport à la surface renseignée | Meubles disproportionnés par rapport à l'espace visible |
| Utilisabilité commerciale | Thomas peut envoyer l'image à un prospect sans honte | Image trop générique, trop "IA", ou non représentative du projet |

**Règle "no AI > bad AI" (CLAUDE.md règle n°5)** : si le premier visuel généré avec transformation structurelle est incohérent (mur toujours présent, artefacts visibles), Thomas doit pouvoir l'itérer immédiatement via le chat sans être bloqué. Le flow doit rendre l'affinement naturel et rapide — pas une option cachée.

**Critère de suppression de la pré-transformation** : si Thomas doit supprimer ou refaire entièrement dans plus de 50 % des cas un visuel avec description structurelle → reconsidérer la position du champ (le déplacer en post-génération, dans le chat uniquement). A mesurer après 10-15 générations réelles.

---

## Section 6 : Handoff

### 6.1 Fichiers à modifier (liste exacte)

| Fichier | Modification |
|---|---|
| `versi-studio/src/components/vs/VisualRoom.tsx` | Ajouter champ textarea + badges exemples entre état "photo déposée" et `StyleGrid`. Stocker la valeur dans `projectDescription: string` state. Passer `projectDescription` à la fonction de génération. Renommer le bouton "Modifier" en "Affiner le visuel". |
| `versi-studio/src/lib/vs/visual-generator.ts` | Modifier `buildVisualPrompt()` pour accepter un paramètre `structuralInstructions: string | null`. Si non vide : remplacer `STRICT RULE 1` (conserve tous les éléments structurels) par `MODIFIED RULE 1` (applique les transformations décrites + liste explicite). |
| `versi-studio/src/lib/vs/architect-agent.ts` | Modifier `enrichPromptForIteration()` : le `systemPrompt` doit autoriser explicitement les modifications structurelles quand l'instruction les mentionne (supprimer la règle "Conserve TOUS les éléments structurels" et la remplacer par une règle conditionnelle). |
| `versi-studio/src/components/vs/ChatAgent.tsx` | Ajouter les badges de suggestions cliquables en haut du chat. Ajouter le message d'introduction de l'Agent (voir Section 4.4). |
| `versi-studio/src/app/api/vs/rooms/[id]/visuals/route.ts` | Accepter `structural_instructions` dans le body POST. Le passer à `generateVisual()`. |

### 6.2 Ordre d'implémentation recommandé (par dépendances)

1. **`visual-generator.ts`** — modifier `buildVisualPrompt()` pour accepter `structuralInstructions`. Pas de dépendance amont. Testable en isolation avec un appel API direct.
2. **`architect-agent.ts`** — modifier le `systemPrompt` de `enrichPromptForIteration()` pour lever la contrainte structurelle quand l'instruction le requiert. Testable en isolation.
3. **`route.ts` (POST visuals)** — accepter et transmettre le nouveau paramètre. Dépend de (1).
4. **`VisualRoom.tsx`** — ajouter le champ textarea + badges + renommage bouton. Dépend de (3).
5. **`ChatAgent.tsx`** — ajouter suggestions + message d'intro. Indépendant, peut être fait en parallèle de (4).

### 6.3 Agents à mobiliser

| Agent | Mission |
|---|---|
| @fullstack | Implémenter les 5 modifications fichiers dans l'ordre décrit. Pattern typiste — le code des nouveaux états `VisualRoom.tsx` est à écrire from scratch (environ 80 lignes). |
| @ia | Valider et affiner les prompts modifiés dans `buildVisualPrompt()` et `enrichPromptForIteration()`. Tester sur 3-5 instructions réelles (supprimer mur, ajouter cloison, cuisine ouverte). Ajuster la formulation anglaise des prompts image pour maximiser la fidélité de gpt-image-1. |
| @copywriter | Finaliser les textes exacts de la Section 4 (label, placeholder, sous-label, messages chat, tooltip). Vérifier conformité brand voice + zéro anglicisme surface utilisateur (règle n°19). |

### 6.4 Questions en suspens à valider par Thomas avant implémentation

1. **Injection structurelle en génération initiale vs chat uniquement** : la spec propose d'injecter les instructions structurelles dès la génération initiale (Étape 4.3). Confirmation souhaitée : Thomas préfère-t-il voir un premier visuel "sans transformation" puis affiner, ou préfère-t-il que le premier visuel intègre déjà ses travaux ? La spec choisit la 2e option (intégration dès la génération initiale) — à invalider si Thomas préfère l'approche progressive.
2. **Visibilité du champ** : le champ est affiché par défaut (pas caché dans un accordéon). Confirmation que c'est acceptable — si Thomas trouve ça "trop technique", on peut le masquer derrière un lien "Décrire les travaux prévus ▾".

---

**Handoff → @fullstack, @ia, @copywriter**
- Fichier produit : `docs/product/vs-s22-etape4-visuels-transformations-spec.md`
- Décisions clés : toutes les transformations structurelles principales sont V1 (valeur persona directe, pas de raison de couper) ; injection des instructions dans le prompt initial retenue (pas seulement dans le chat) ; chat renommé "Affiner le visuel" ; champ description optionnel (zéro friction si pas de travaux)
- Points d'attention : la règle n°1 du `buildVisualPrompt` (`KEEP all structural elements`) est en conflit direct avec l'objectif — elle doit devenir conditionnelle. C'est la modification la plus critique. Sans elle, toutes les instructions de transformation seront ignorées par gpt-image-1. Tester impérativement sur 3 cas réels avant livraison.
