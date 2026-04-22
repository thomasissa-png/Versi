# Audit UX tiles power diagram — s25

**Date** : 2026-04-22
**Agent** : @ux
**Contexte** : audit post-livraison s24 — power diagram room tiling, demandé explicitement par le mémo s24 (section "Limitations connues").

---

## Contexte

La session s24 a livré un algorithme de pavage (power diagram / Voronoï pondéré) garantissant mathématiquement 0 overlap et 0 gap entre pièces d'un lot. Reality check E2E : 23/23 tiles valides, coverage_err=0.00%.

Limitation explicite et documentée dans s24 : le power diagram produit **uniquement des cellules convexes**. Toute pièce réelle non-convexe (en L, en T, en U) est approximée par le polygone convexe le plus proche. Cet audit évalue si cette limitation est acceptable pour Thomas en V1.

---

## Diagnostic 4 axes

### Axe 1 — Fidélité métier (rooms non-convexes typiques)

**Question : dans la typologie de plans que Thomas traite, quelle proportion de pièces est naturellement non-convexe ?**

Typologies de plans traités (haussmannien Paris, duplex, R+3 immeuble) :

| Type de pièce | Non-convexe en pratique ? | Fréquence estimée |
|---|---|---|
| Séjour + cuisine ouverte contournant un poteau/mur porteur | Oui, souvent en L | Fréquent (haussmannien) |
| Couloir en L ou en T (dégagement central) | Oui systématiquement | Quasi-systématique |
| SDB avec WC dans un recoin séparé | Oui, en L ou U | Fréquent |
| Chambre traversante avec placard en rentrant | Parfois, selon plan | Occasionnel |
| Cuisine séparée rectangulaire | Non, convexe | Fréquent |
| Chambre rectangulaire standard | Non, convexe | Très fréquent |
| Entrée haussmannienne (couloir droit) | Convexe si droit | Variable |

[HYPOTHÈSE : estimation basée sur 20 ans de plans haussmanniens/immeubles R+3 français, pas sur dataset réel Versi.] Estimation réaliste : **30 à 50% des pièces d'un appartement type (T3-T4)** présentent une géométrie non-convexe notable. Les couloirs sont presque toujours non-convexes sur un appartement traversant. Le séjour+cuisine ouverte dans un haussmannien est très souvent en L.

Cas réels critiques par type de lot :
- **T2 haussmannien** : entrée (L), séjour+cuisine (L), SDB (L avec WC) = 3/5 pièces potentiellement non-convexes
- **T4 duplex** : couloir principal (L ou T), double séjour traversant, SDB-WC séparé = 2-3/8 pièces
- **Studio** : une seule pièce principale (convexe), cas favorable
- **Appartement R+3 immeuble** : dégagement commun + cage d'escalier intégrée au lot = enveloppe lot elle-même non-convexe

---

### Axe 2 — Impact édition downstream

**Qu'est-ce qui casse en aval si une pièce L-shaped est approximée convexe ?**

#### 2.1 Calcul surface m²

Le tile convexe d'une pièce en L aura une aire **supérieure à la vraie pièce** (le triangle "mangé" dans le creux du L est inclus dans le tile convexe). Ce triangle appartient en réalité à un couloir ou à une autre pièce adjacente.

Conséquence concrète : si Thomas exporte une surface m² calculée depuis le tile, elle sera **surestimée**. Pour un séjour en L classique (séjour 25m² + excroissance cuisine 8m²), le tile convexe peut absorber 3-5m² du couloir adjacent.

Problème critique pour Thomas : la surface est une donnée commerciale. Une erreur de 3-5m² sur un séjour = erreur de DPE, d'annonce acquéreur, voire de notaire. **Risque juridique faible si la surface reste calculée depuis la DB (surface_m2_target IA) et non depuis le tile.** Risque élevé si le tile devient la source de vérité des m².

Vérification code nécessaire : `surface_m2_target` dans `RoomInput` est l'input (fourni par l'IA passe-1/2), pas la sortie du tiling. Le tiling ne recalcule pas les m², il positionne visuellement. Si cette séparation est maintenue, l'impact surface est UX seulement (la tuile déborde visuellement) et non métier.

#### 2.2 Génération de visuels IA par pièce

Le pipeline de génération IA utilise le tile polygon pour définir la zone à générer (masque ou crop). Un tile convexe pour un séjour en L produit une zone de génération qui inclut le coin de couloir — le visuel généré montrera un espace qui ne ressemble pas au plan réel.

Impact : la photo "Après" générée par l'IA pour un acquéreur montrera un espace légèrement différent de la réalité. Pour un séjour en L marqué (angle net de 90°+), l'artefact sera visible.

Gravité : **moyenne à haute** — Thomas montre ces visuels à des acquéreurs. Un comparateur avant/après (pattern obligatoire s22) exposera l'écart si le séjour réel est fortement en L.

#### 2.3 Export PDF acquéreur

Si le PDF inclut le plan annoté avec les tiles colorés par pièce, un tile convexe qui "mord" dans un couloir adjacent sera visible par l'acquéreur. C'est un artefact visible à l'oeil nu sur tout plan haussmannien standard.

Un architecte ou un acquéreur averti pourra questionner la cohérence plan/réalité.

---

### Axe 3 — Expérience persona Thomas marchand

**Comment Thomas va-t-il réagir concrètement ?**

Les signaux accumulés depuis s16 convergent vers une réaction prévisible :

**Réaction probable au premier plan haussmannien avec couloir en L :**
Thomas verra la tuile du couloir qui est un rectangle convexe "gonflé" qui empiète sur le séjour. Il verra la tuile du séjour dont le bord inférieur gauche "mange" un coin qui appartient visuellement au couloir. Il dira : "Ce couloir n'a pas la bonne forme" ou "Le séjour déborde sur le couloir, c'est pas correct."

Référence directe aux patterns observés :
- s22 : "Je veux du parfait" — Thomas ne distingue pas "acceptable techniquement" de "correct visuellement"
- s23 : "Dessiner un lot" — le mot pivot est le concept métier, pas la géométrie. Thomas pense en "pièce réelle", pas en "polygone convexe"
- s24 : "pixel-parfait sur TOUS les critères listés" — une pièce mal formée = critère raté même si les 3 autres sont OK
- s22 : "une feature invisible n'existe pas" — une pièce visible mais mal découpée = pièce mal livrée

**Le risque spécifique du power diagram convexe :**
Le couloir en L haussmannien est l'artefact le plus visible et le plus fréquent. Thomas connaît parfaitement ces plans (il en traite plusieurs par semaine). Il va repérer instantanément qu'un couloir en L est rendu comme un rectangle qui empiète sur le séjour.

**Tolérance potentielle (nuance) :**
Si Thomas comprend que c'est une approximation de départ corrigeable manuellement (override sur canvas), il peut l'accepter comme V1. La préférence "minimum de clics" (s22) et "undo/redo obligatoire" (s22) suggèrent qu'il est familier avec l'édition manuelle post-génération. La question est : l'override est-il disponible, visible, et rapide ?

---

### Axe 4 — Verdict recommandé

**GO CONDITIONNEL**

Justification :

La contrainte de convexité est réelle et documentée. Mais deux facteurs permettent un GO conditionnel en V1 :

1. **Le pipeline IA passe-1/2/3 (bounding_polygon) était déjà quasi-convexe** — le mémo s24 le note explicitement ("Acceptable vu que la référence (bounding_polygon IA) était déjà quasi-convexe"). Le power diagram ne dégrade pas énormément la forme perçue par rapport à ce qu'il y avait avant.

2. **L'impact surface m² est nul si surface_m2_target reste la source de vérité des m²** — le tiling est une représentation visuelle, pas un recalcul des surfaces. Ce point doit être vérifié et documenté explicitement dans le code.

Condition bloquante GO : **un override manuel de la forme de pièce doit être disponible sur le canvas Étape 3, visible et accessible en 1 clic.** Sans override, Thomas sera bloqué dès le premier plan haussmannien avec couloir en L et le pipeline sera perçu comme "cassé".

---

## Recommandations actionnables (GO CONDITIONNEL)

### R1 — Override manuel pièce : priorité haute

Implémenter sur le canvas Étape 3 un mode "redessiner la pièce" qui permet à Thomas de corriger manuellement la forme d'une pièce si la tuile convexe est inexacte.

Pattern minimal acceptable :
- Clic sur une tuile → affiche ses sommets éditables (handles drag)
- Thomas peut déplacer un sommet ou ajouter un point sur un côté (clic sur arête)
- Undo/redo obligatoire (déjà requis s22 — vérifier que ce stack couvre les ops pièce)
- La tuile éditée remplace la tuile power diagram dans la DB (persist)

Discoverabilité (règle s22) : le mode édition doit être accessible via un bouton UI permanent dans la toolbar de l'Étape 3, pas seulement via un double-clic ou un raccourci invisible.

### R2 — Séparation explicite surface_m2 vs aire tile

Vérifier que nulle part dans le pipeline la surface affichée à Thomas (ou exportée) n'est calculée depuis `tile_polygon`. La surface métier = `surface_m2_target` (IA). Le tile est uniquement la représentation visuelle. Ajouter un commentaire code explicite + un test unit qui vérifie que la surface stockée en DB n'est pas l'aire du tile.

### R3 — Audit visuel sur plan haussmannien réel (reality check)

Avant GO PRODUCTION Étape 3, exécuter un reality check E2E sur un plan haussmannien réel avec au moins un couloir en L et un séjour+cuisine en L. Capturer des screenshots Playwright des tiles générés et vérifier à l'oeil que les artefacts convexes sont tolérables (ou que l'override est nécessaire en amont).

### R4 — CVT + Lloyd's relaxation : reporter à V2

Lloyd's relaxation (itératif, coûteux) n'est pas nécessaire en V1 si R1 est implémenté. Le post-process non-convexe est une optimisation V2, pas un blocant V1. Documenter cette limite dans `docs/ia/s24-room-tiling.md` section "Roadmap".

### R5 — Masque génération IA : polygone IA passe-2, pas tile power diagram

Pour la génération de visuels par pièce (pipeline visuel IA), utiliser le `bounding_polygon` IA passe-2 comme masque de génération, PAS le tile power diagram. Le tile est la représentation plan (no-overlap), le bounding_polygon est la forme réelle de la pièce. Ces deux usages doivent rester indépendants.

---

## Tests UX — tiles power diagram

| Test | Critère de succès | Statut |
|---|---|---|
| Thomas peut corriger une pièce en L via override canvas | Override visible en 1 clic, undo disponible | ❌ Non implémenté — R1 requise |
| Surface m² affichée = surface_m2_target IA, pas aire tile | Vérification code pipeline | ⚠️ À confirmer |
| Reality check plan haussmannien réel | Screenshots Playwright avant GO PRODUCTION | ❌ Non fait en s24 |
| Masque génération IA = bounding_polygon (pas tile) | Vérification code pipeline visuel | ⚠️ À confirmer |
| Découvrabilité édition pièce : bouton permanent visible | Bouton toolbar visible dès arrivée Étape 3 | ❌ Non implémenté |

---

## Handoff à @orchestrator

**Verdict : GO CONDITIONNEL**

Le power diagram en V1 est acceptable si et seulement si R1 (override manuel pièce) est implémenté avant GO PRODUCTION Étape 3. Sans override, Thomas sera bloqué dès le premier couloir en L d'un haussmannien.

**Fichiers produits :**
- `/home/user/Versi/docs/reviews/s25-ux-tiles-power-diagram-audit.md` (ce fichier)

**Décisions prises :**
- CVT + Lloyd's relaxation reporté à V2 (pas bloquant V1 si R1 livré)
- Override manuel pièce = prérequis GO PRODUCTION Étape 3
- Surface m² = source IA passe-2, jamais l'aire du tile (à vérifier code)
- Masque génération IA = bounding_polygon passe-2, pas tile power diagram (à vérifier)

**Points d'attention critiques :**
- R1 (override pièce) : déléguer @fullstack — implémenter handles drag sur sommets tile + bouton toolbar visible
- R2 (séparation surface) : déléguer @fullstack — vérification et commentaire code + test unit
- R3 (reality check haussmannien) : à exécuter AVANT gate @moi GO PRODUCTION Étape 3
- R5 (masque génération) : à vérifier lors de l'implémentation du pipeline visuel IA (session future)

**Blockers :**
- Aucun bloquant en dehors du GO PRODUCTION — les tiles actuels sont exploitables en V1
- Le bloquant conditionnel est R1 : si l'override n'est pas livré, le verdict passe NO-GO
