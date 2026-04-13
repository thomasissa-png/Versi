# Gates emplacement — Versi Immobilier

> Produit par @orchestrator | Date : 2026-04-13, v2
> Références : `docs/qa/property-listing-gates.md` (gates annonces), `project-context.md` (données source biens)
> Usage : ces gates s'appliquent aux champs `nearby_transport` et `nearby_amenities` de TOUTE annonce de bien immobilier avant publication. Une gate BLOQUANT en FAIL interdit la publication.

---

## 1. Tableau des gates emplacement (GL-1 à GL-12)

### Gates BLOQUANT (publication interdite si FAIL)

| # | Nom | Méthode | PASS | FAIL |
|---|---|---|---|---|
| GL-1 | Zéro donnée inventée — chaque établissement/lieu existe | WebSearch + cross-check | Chaque école, parc, station de métro, hôpital, commerce nommé dans le texte est vérifiable via une source officielle (site ville, site de l'établissement, Moovit, OpenStreetMap) | Au moins 1 lieu nommé introuvable ou attribué au mauvais quartier |
| GL-2 | Zéro distance inventée | WebSearch / Moovit / Google Maps | Chaque distance ou temps de trajet mentionné est vérifiable via un outil de calcul d'itinéraire (Moovit, Google Maps, Mappy). Si la distance exacte n'est pas vérifiable, utiliser "à proximité" ou "dans le quartier" | Au moins 1 distance ou temps de trajet non vérifiable ou manifestement faux |
| GL-3 | Quartier correct — chaque lieu est bien dans le quartier du bien | Cross-check adresse | Chaque lieu nommé se situe effectivement dans le quartier du bien ou dans un quartier immédiatement adjacent. Pas de lieu à plus de 2 km présenté comme "à proximité" | Un lieu situé dans un autre quartier de la ville présenté comme proche (ex : Parc des Dondaines cité pour un bien à Lille-Sud alors que le parc est à Fives) |
| GL-4 | Ton factuel — zéro superlatif, zéro formulation agence | Grep blacklist GA-3/GA-4 | Aucun mot de la blacklist annonces (voir `property-listing-gates.md` section 2). Aucun jugement subjectif ("quartier agréable", "idéalement situé", "au calme") | Au moins 1 occurrence de mot interdit ou jugement subjectif sur le quartier |

### Gates REQUIS (corriger avant publication)

| # | Nom | Méthode | PASS | FAIL |
|---|---|---|---|---|
| GL-5 | Transport complet — transport principal + accès gare | Grep | Au minimum : 1 station du transport principal de la ville (métro, tramway, RER, bus structurant selon la ville) nommée avec ligne(s) + mention de l'accès aux gares principales. N/A pour la gare si aucune dans un rayon de 5 km — mentionner la liaison directe la plus proche | Aucune station de transport en commun nommée |
| GL-6 | Écoles — au moins maternelle + élémentaire | Grep | Au moins 1 école maternelle ET 1 école élémentaire nommées. Si collège ou lycée dans le quartier, le mentionner | Zéro école nommée |
| GL-7 | Commerces — accès quotidien documenté | Grep | Au moins 1 zone commerciale ou axe commerçant nommé | Aucune mention de commerces de proximité |
| GL-8 | Santé — établissement de santé identifié | Grep | Au moins 1 établissement de santé nommé (hôpital, clinique, CHU) avec sa spécificité si pertinent (urgences, pédiatrie) | Aucune mention de santé |
| GL-9 | Espaces verts — parc ou jardin identifié | Grep | Au moins 1 parc ou espace vert nommé, avec superficie si connue | Aucune mention d'espace vert |
| GL-10 | Crèches mentionnées si famille cible | Grep (conditionnel) | Si le bien a 3+ pièces (famille cible), au moins 1 crèche nommée. N/A pour T1/studios | Bien 3+ pièces sans mention de crèche |
| GL-11 | Pas de copier-coller brut entre biens de programmes différents | Diff | Le texte d'emplacement est adapté au quartier réel du bien. Deux biens dans des villes différentes ne peuvent pas avoir le même texte d'emplacement | Même texte d'emplacement copié entre deux biens dans des quartiers ou villes différents |
| GL-12 | Longueur maîtrisée | Compteur | `nearby_transport` : 30 à 80 mots. `nearby_amenities` : 60 à 120 mots. Un texte trop long déséquilibre la fiche bien | `nearby_transport` < 30 ou > 80 mots, OU `nearby_amenities` < 60 ou > 120 mots |

---

## 2. Catégories obligatoires par champ

### `nearby_transport` — doit couvrir :
1. Station(s) du transport principal (métro, tramway, RER, bus structurant) la/les plus proche(s) avec ligne(s) et temps de marche vérifié
2. Accès aux gares principales (direct ou correspondance). N/A si aucune gare dans un rayon de 5 km
3. Bus si arrêt vérifié à proximité (facultatif)

### `nearby_amenities` — doit couvrir :
1. Écoles (maternelle + élémentaire minimum, collège si présent)
2. Crèches (obligatoire si bien 3+ pièces)
3. Espaces verts (parc avec superficie)
4. Commerces (axe commerçant ou centre commercial)
5. Santé (hôpital/clinique/CHU)

---

## 3. Blacklist emplacement

En plus de la blacklist annonces (`property-listing-gates.md` section 2), les formulations suivantes sont interdites dans les champs emplacement :

```
quartier agréable, quartier recherché, quartier prisé, cadre de vie,
environnement privilégié, au coeur de, en plein coeur, à deux pas,
à quelques encablures, quartier calme, quartier résidentiel,
idéalement desservi, parfaitement desservi, toutes commodités,
à portée de main, environnement verdoyant
```

Formulations autorisées : "dans le quartier", "à proximité" (si distance non vérifiable), "à X minutes à pied" (si vérifié Moovit/Google Maps).

---

## 4. Règle de process — Sources obligatoires

Cette règle n'est pas une gate (non vérifiable par grep) mais est **obligatoire** pour tout agent rédigeant un texte d'emplacement : documenter les sources de chaque fait (école, parc, station, distance) dans le message de commit. Sources acceptées : site officiel de la ville, Moovit, Google Maps, Pages Jaunes, site de l'établissement.

---

## 5. Verdict

- **PUBLIER** : 0 gate BLOQUANT FAIL + 0 gate REQUIS FAIL
- **CORRIGER** : 0 gate BLOQUANT FAIL + 1+ gate REQUIS FAIL → corriger avant publication
- **REFAIRE** : 1+ gate BLOQUANT FAIL → réécriture nécessaire

---

## Handoff

**Destinataire** : @copywriter (rédaction emplacement), @fullstack (validation avant seed/publication), @qa (intégration dans pipeline de validation)
**Fichiers produits** : `docs/qa/location-gates.md`
**Action requise** : ces gates doivent être exécutées sur tout nouveau texte d'emplacement AVANT publication.
