# Audit baseline Yann Duval -- 4 plans avant canonicalisation

Date : 2026-04-22 | Projet : Versi Studio s25 Phase 2 step 3c
Plans : A885 MUGUETS / LILLE -- AVP ESQ -- Avantpropos Architectes -- Ech. 1:50

## Methodologie

Chaque plan PDF evalue sur 10 criteres (0-10) du point de vue GPT-4.1 vision.
Score = moyenne arithmetique des 10 criteres. Plus haut = plus facile pour l'IA.

---

## P00 -- RDC : score baseline 5.4/10

| # | Critere | Note | Observation |
|---|---------|------|-------------|
| 1 | Murs porteurs | 6 | Trait orange epais identifiable mais meme couleur que cloisons -- pas de differenciation nette porteur/non-porteur |
| 2 | Cloisons | 5 | Cloisons orange + tirets orange pour le mobilier = confusion visuelle, l'IA confond cloison et meuble |
| 3 | Orientation | 8 | Plan droit, pas de rotation parasite |
| 4 | Cotations parasites | 4 | Cotation "4.52" au milieu, labels "ECS", "TGBT", "LV", "D" -- bruit textuel modere |
| 5 | Mobilier/hachures | 3 | Mobilier abondant : canape, table, chaises, lit, baignoire, plan cuisine, terrasse hachuree -- tout en orange comme les murs |
| 6 | Labels pieces | 7 | "SdB 5.9m2", "Chambre 10.2m2", "Sejour/cuisine 25.8m2" -- lisibles mais superposes au mobilier |
| 7 | Homogeneite trait | 4 | 3 epaisseurs (murs, cloisons, mobilier) toutes en orange + tirets rouges limites parcelle + gris escalier = 5 calques melanges |
| 8 | Contraste fond | 5 | Fond blanc correct mais orange moyen (pas noir) reduit le contraste figure/fond |
| 9 | Rectilinearite | 8 | Murs orthogonaux, pas d'oblique significatif |
| 10 | Elements inutiles | 4 | Cartouche complet en bas, logo Avantpropos en haut-gauche, limites parcelle en tirets rouges, escalier commun detaille |

**Score P00 : 5.4/10**

---

## P01 -- R+1 : score baseline 5.2/10

| # | Critere | Note | Observation |
|---|---------|------|-------------|
| 1 | Murs porteurs | 6 | Meme trait orange epais, distinction porteur/cloison incertaine |
| 2 | Cloisons | 5 | Cloisons fines orange + portes en arc de cercle tirete = bruit supplementaire |
| 3 | Orientation | 8 | Droit, pas de rotation |
| 4 | Cotations parasites | 3 | Plus de cotations que P00 : "3.23", "0.07", "2.69", "4.36", "3.49", "7.28", "0.8" -- bruit dense |
| 5 | Mobilier/hachures | 3 | Table+chaises, canape, lit x2, SDB equipee, cuisine complete -- tout en orange |
| 6 | Labels pieces | 7 | "Chambre 01 14.2m2", "Chambre 02 9.0m2", "Sejour/cuisine 40.5m2" -- lisibles |
| 7 | Homogeneite trait | 4 | Meme melange multi-calques orange/gris/rouge que P00 |
| 8 | Contraste fond | 5 | Orange sur blanc, contraste moyen |
| 9 | Rectilinearite | 8 | Orthogonal strict |
| 10 | Elements inutiles | 3 | Cartouche, logo, hachures facade sud, escalier commun, limites parcelle rouges -- plus charge que P00 |

**Score P01 : 5.2/10**

---

## P02 -- R+2 : score baseline 5.6/10

| # | Critere | Note | Observation |
|---|---------|------|-------------|
| 1 | Murs porteurs | 6 | Meme convention, pas de distinction claire |
| 2 | Cloisons | 5 | Cloisons lisibles mais meme code couleur que tout le reste |
| 3 | Orientation | 8 | Droit |
| 4 | Cotations parasites | 5 | Moins de cotes que P01 -- une seule cotation "11.61" visible en haut |
| 5 | Mobilier/hachures | 3 | Mobilier complet sejour/cuisine (table, chaises, canape, meubles) en orange |
| 6 | Labels pieces | 7 | "Chambre 01 17.0m2", "SDB 4.1m2", "Sejour cuisine 42.2m2" -- clairs |
| 7 | Homogeneite trait | 4 | Identique aux autres -- multi-calques non separes |
| 8 | Contraste fond | 6 | Legerement plus aere que P00/P01, meilleur rapport signal/bruit |
| 9 | Rectilinearite | 8 | Orthogonal |
| 10 | Elements inutiles | 4 | Cartouche, logo, limites parcelle, escalier -- standard |

**Score P02 : 5.6/10**

---

## P03 -- R+3 : score baseline 5.7/10

| # | Critere | Note | Observation |
|---|---------|------|-------------|
| 1 | Murs porteurs | 6 | Meme convention orange |
| 2 | Cloisons | 6 | Moins de cloisons, plan plus simple -- moins d'ambiguite |
| 3 | Orientation | 8 | Droit |
| 4 | Cotations parasites | 4 | Cotations presentes : "3.66", "0.9", "1.77", "3.17", "7.28" + "H - 2m" annotation hauteur |
| 5 | Mobilier/hachures | 5 | Moins de mobilier (pas de sejour/cuisine meuble) mais hachures toiture imposantes a droite |
| 6 | Labels pieces | 7 | "Chambre 03 15.4m2", "Chambre 02 15.1m2", "Palier 12.4m2", "SDE 4.4m2" -- lisibles |
| 7 | Homogeneite trait | 5 | Hachures toiture ajoutent un calque visuel mais globalement plus lisible |
| 8 | Contraste fond | 6 | Plan plus aere, meilleur contraste |
| 9 | Rectilinearite | 7 | Globalement orthogonal mais murs biais en partie haute (sous rampant) |
| 10 | Elements inutiles | 3 | Cartouche, logo, hachures toiture massives (2 grandes zones croisillons), limites parcelle |

**Score P03 : 5.7/10**

---

## Synthese : 3 defauts communs

### Defaut 1 -- Monochromie orange : murs = cloisons = mobilier (CRITIQUE)

Les 4 plans utilisent la meme couleur orange pour TOUT : murs porteurs, cloisons, mobilier, equipements sanitaires, cuisine. L'IA vision ne peut pas distinguer ce qui est structure de ce qui est decoration. C'est le defaut n.1 absolu. Un mur porteur et une chaise sont visuellement identiques.

### Defaut 2 -- Mobilier dessine dans le plan (MAJEUR)

Canapes, tables, lits, baignoires, eviers, plans de travail sont traces en detail dans le meme calque que les murs. L'IA va interpreter ces formes comme des cloisons, des ilots structurels, ou des ouvertures. Le mobilier represente 30-40% du bruit visuel total.

### Defaut 3 -- Calques superposes non separes : parcelle + escalier commun + cartouche (MODERE)

Tirets rouges (limites parcelle), escalier commun en gris, cartouche complet en bas, logo agence en haut -- ces elements n'appartiennent pas au lot mais sont superposes au plan. L'IA doit "filtrer" mentalement 3-4 calques pour isoler l'appartement.

---

## Prediction apport canonicalisation

Une canonicalisation bien executee transformerait ces plans de 5.5/10 a 8.5-9/10 :

| Transformation | Avant | Apres attendu |
|---|---|---|
| Murs porteurs | Orange epais indifferencie | Noir 3px, rempli |
| Cloisons | Orange fin = meme que mobilier | Noir 1.5px, non rempli |
| Mobilier | Present, meme couleur | SUPPRIME integralement |
| Fond | Blanc avec parasites | Blanc pur |
| Cotations | Presentes | SUPPRIMEES |
| Cartouche/logo | Present | SUPPRIME |
| Limites parcelle | Tirets rouges | SUPPRIMEES |
| Escalier commun | Dessine en gris | Supprime ou grise attenue |
| Labels pieces | Orange, superposes | Noir, centres, propres |
| Portes/fenetres | Arcs de cercle orange | Symboles standardises noir |

Gain attendu : +3 a +3.5 points sur la grille -- principalement sur criteres 1, 2, 5, 7, 8, 10.

---

## Verdict : GO canonicalisation

**OUI -- GO sans reserve.**

Moyenne baseline actuelle : **5.5/10** (P00=5.4, P01=5.2, P02=5.6, P03=5.7).

Ces plans sont des AVP/ESQ classiques d'agence d'architecture francaise (Avantpropos, Lille). Ils sont parfaitement lisibles pour un humain forme mais hostiles pour une IA vision, principalement a cause de la monochromie orange et du mobilier integre au meme calque que la structure.

La canonicalisation -- redessin vectoriel epure, noir sur blanc, sans mobilier, sans cotations, sans cartouche -- est exactement ce dont le pipeline a besoin. Le ratio effort/gain est excellent : ces 4 plans partagent les memes 3 defauts, donc un seul process de canonicalisation les corrige tous.

Objectif post-canonicalisation : 8.5/10 minimum sur la meme grille. Si les outputs canonicalises descendent en dessous de 8/10, c'est que le process de redessin a des faiblesses a corriger.

---

*Yann Duval -- Audit baseline s25 -- 2026-04-22*
