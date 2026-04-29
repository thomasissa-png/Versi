# Audit visuel s27 — Extraction polygone lot appartement
**Date** : 2026-04-29 | **Agent** : @design | **Session** : s27

---

## Méthode

Lecture visuelle directe des 4 PNG (contour vert = polygone extrait, murs = orange #ff8000).
Évaluation par rapport à l'exigence fondateur : "suivre EXACTEMENT les contours de l'appartement, pas englober."

---

## Tableau par plan

| Critère | RDC (69 pts) | R+1 (277 pts) | R+2 (218 pts) | R+3 (268 pts) |
|---|---|---|---|---|
| **Précision murs externes** | 7/10 | 8/10 | 7/10 | 6/10 |
| **Exclusion escalier colimaçon** | OUI | OUI | OUI | OUI |
| **Exclusion terrasses/balcons/jardins** | NON — jardin inclus | PARTIEL — balcon droit inclus | PARTIEL — terrasse haut-droite incluse | NON — 2 loggias incluses |
| **Défauts spécifiques** | Voir détail | Voir détail | Voir détail | Voir détail |

---

## Détail par plan

### Plan RDC — T3 RDC (69 sommets)

**Précision murs externes : 7/10**

Le tracé colle bien aux murs oranges sur les 3/4 du périmètre (côtés nord, est, une grande partie du côté sud). La forme rectangulaire principale est correctement capturée avec le retrait en façade (renfoncement entrée côté sud bien pris en compte).

**Exclusion escalier colimaçon : OUI**
L'escalier circulaire à gauche est correctement exclu — le polygone s'arrête à la limite du mur orange, sans englober le puits d'escalier.

**Exclusion terrasses/balcons/jardins : NON**
Défaut bloquant : le polygone englobe le jardin/terrasse extérieur côté gauche (ouest). La zone verte dépasse clairement le mur orange de clôture du lot pour capturer une zone hachurée extérieure (jardin). Ce n'est pas de la surface habitable.

**Défauts spécifiques :**
- Dérive ouest : le contour est tiré vers la gauche, incluant ~1,5m de jardin non-habitable
- Le coin nord-ouest présente un angle droit propre mais positionné trop à l'extérieur par rapport au mur réel
- Les 69 sommets sont insuffisants pour la complexité de l'appartement — certains angles fins (retrait façade) sont approximés par des diagonales au lieu de right-angles

---

### Plan R+1 — T3+ R+1 (277 sommets)

**Précision murs externes : 8/10**

Meilleur plan de la série. Le tracé suit fidèlement la géométrie complexe (L inversé côté gauche, découpe Chambre 01, dent de scie côté droit pour le séjour/cuisine). Les 277 sommets permettent de capturer les détails fins.

**Exclusion escalier colimaçon : OUI**
L'escalier circulaire est exclu. Le polygone suit le mur intérieur du puits.

**Exclusion terrasses/balcons/jardins : PARTIEL**
Défaut notable : côté droit (est), la zone arrondie du séjour/cuisine — qui semble correspondre à un balcon ou espace extérieur avec mobilier décoratif (plante, chaise) — est incluse dans le polygone. Cette zone, si elle est une terrasse, ne devrait pas être comptabilisée.
Le polygone s'étend sur la partie haute-droite au-delà de ce qui semble être la limite du bâti.

**Défauts spécifiques :**
- Côté est/nord-est : débordement potentiel sur une zone non-habitable (forme organique à droite)
- Quelques micro-dents sur le bord nord (artefacts de pixelisation du snap-to-wall)
- Qualité globale nettement supérieure aux autres plans — le Moore boundary + snap-to-wall fonctionne bien ici

---

### Plan R+2 — R+2 (218 sommets)

**Précision murs externes : 7/10**

Tracé globalement correct sur les côtés est et sud. La géométrie complexe (en L irrégulier côté centre-nord) est partiellement capturée.

**Exclusion escalier colimaçon : OUI**
Escalier circulaire exclu.

**Exclusion terrasses/balcons/jardins : PARTIEL**
Défaut notable : côté nord, le polygone inclut une zone qui semble être une terrasse ouverte (zone sans murs fermés visible en haut du plan, à droite). La limite exacte entre espace couvert et terrasse est floue dans l'extraction.

**Défauts spécifiques :**
- Côté nord-est : le tracé englobe une zone avec cotation "11.81" visible au-dessus — cette zone pourrait être une terrasse/toit-terrasse non incluse dans la surface habitable du lot
- Zone escalier intérieur (bas-droite) : le tracé présente des micro-dents irrégulières — le snap-to-wall accroche les lignes de cotation au lieu des murs
- Le retrait central (décalage horizontal visible au centre-bas) est bien capturé

---

### Plan R+3 — T2 R+3 (268 sommets)

**Précision murs externes : 6/10**

Plan le plus problématique visuellement. Le polygone déborde significativement côté gauche (ouest).

**Exclusion escalier colimaçon : OUI**
L'escalier circulaire à gauche est exclu du polygone principal. Cependant, le polygone entoure la zone de loggias/balcons hachurées adjacentes.

**Exclusion terrasses/balcons/jardins : NON**
Défaut bloquant : deux loggias/balcons hachurés côté gauche (bandes horizontales caractéristiques d'un revêtement extérieur) sont inclus dans le polygone vert. Ces surfaces hachurées ne sont pas de la surface habitable.
Côté haut-gauche : le polygone monte jusqu'au bord de la feuille, englobant toute la zone extérieure supérieure.

**Défauts spécifiques :**
- Dérive nord-ouest massive : le contour monte trop haut, incluant la terrasse/loggia supérieure gauche
- Les bandes hachurées (loggias) sont clairement identifiables visuellement comme extérieur mais le pipeline les inclut
- La forme générale du lot (pentagone irrégulier) est capturée mais avec ~15% de surface extérieure incorrectement incluse
- 268 sommets mais précision inférieure à R+1 (277 pts) — indication que le snap-to-wall accroche des éléments graphiques parasites (hachures, cotations)

---

## Analyse transversale

### Ce qui fonctionne
- Exclusion de l'escalier colimaçon : **100% correct** sur les 4 plans. Le pipeline identifie correctement cette zone non-habitable.
- Géométrie intérieure (cloisons, pièces) : correctement ignorée — le tracé suit bien le périmètre externe.
- R+1 est le meilleur résultat : bon rapport sommets/précision, peu de dérives.

### Problème systémique identifié
Le pipeline confond les zones extérieures hachurées (loggias, jardins, terrasses) avec de la surface habitable. Les hachures architecturales de ces zones contiennent probablement du orange #ff8000 résiduel qui trompe l'algorithme d'isolation couleur.

Cause probable : les terrasses/loggias sur plans architecturaux utilisent parfois des lignes de délimitation orange identiques aux murs porteurs. Le pipeline ne distingue pas "mur de lot" de "limite de terrasse".

### Criticité des défauts (ordre décroissant)

| Priorité | Défaut | Plans concernés | Impact |
|---|---|---|---|
| P0 — Bloquant | Inclusion terrasses/loggias hachurées | RDC, R+3 | Surface lot incorrecte — erreur métrage légale |
| P0 — Bloquant | Inclusion jardin RDC | RDC | Même impact |
| P1 — Majeur | Inclusion zone ambiguë terrasse R+1 et R+2 | R+1, R+2 | À confirmer si terrasse ou espace couvert |
| P2 — Mineur | Micro-dents sur bords (artefacts cotations) | R+2, R+3 | Esthétique, pas d'impact métrage |
| P2 — Mineur | Angles approximés (diagonales au lieu de right-angles) | RDC | Précision ±2-3% |

---

## Verdict global

### NO-GO pour intégration UI s28

**Raison principale** : 2 plans sur 4 (RDC, R+3) incluent des surfaces extérieures non-habitables dans le polygone. Afficher ces polygones en UI induirait en erreur les utilisateurs et les notaires sur la surface réelle du lot.

### Fixes nécessaires (ordonnés par criticité)

**Fix 1 — P0 — Filtrage des zones hachurées (bloquant)**
Ajouter une étape de détection des patterns de hachures (lignes parallèles denses, angle 45°) dans la zone extraite. Les pixels appartenant à une zone hachurée sont exclus du polygone avant le boundary trace. Concerne RDC (jardin) et R+3 (loggias).

**Fix 2 — P0 — Distinction mur porteur vs limite terrasse (bloquant)**
Les terrasses sont délimitées par des lignes fines (pas des murs épais). Filtrer par épaisseur de trait orange : ne retenir que les traits > N pixels (murs porteurs) et ignorer les traits fins (contours de terrasse). Calibrer N sur les plans Muguets.

**Fix 3 — P1 — Validation R+1 et R+2 sur zones ambiguës (majeur)**
Confirmer avec Thomas si la zone arrondie droite en R+1 et la zone nord en R+2 sont des terrasses ou espaces couverts. Si terrasses → même fix que P0. Si espaces couverts → résultat actuel est correct.

**Fix 4 — P2 — Snap-to-wall ignorant les cotations (mineur)**
Le snap-to-wall accroche les lignes de cotation (traits fins avec chiffres). Filtrer les segments trop courts (< seuil) ou les lignes horizontales avec texte adjacent.

---

*Audit produit par @design — lecture visuelle directe des 4 PNG. Aucune hypothèse sur le code pipeline.*
