# Audit valeur persona Thomas marchand versi-s21 — Itération 1

**Date** : 2026-04-17
**Persona** : Thomas, 35 ans, marchand de biens, 8-12 opérations/an
**Scope** : Clustering IA unit_id + lots pré-créés (US-VS-21/22)
**Agent** : @moi (proxy fondateur — Versi Studio = outil interne, gate finale @moi, cf. founder-preferences.md mapping s16)
**Fichiers audités** : `docs/product/clustering-ia-spec.md`, `lots/page.tsx`, `LotPanel.tsx`, `extract/route.ts`

---

## Note globale : 7.2 / 10

Solide sur la mécanique backend. Lacunes sur l'UX de confiance et la lisibilité de la zone lot sur le canvas. Pas un GO complet — 2 corrections P0 bloquantes avant de passer en prod.

---

## Tableau 5 critères (incarnation persona)

| # | Critère | Note /10 | Corrections EXACTES |
|---|---|---|---|
| 1 | Gain de temps ressenti | 7/10 | Voir détail ci-dessous |
| 2 | Confiance dans l'IA | 6/10 | Voir détail ci-dessous |
| 3 | Page blanche adressée | 8/10 | Voir détail ci-dessous |
| 4 | Cas dégradés gérés | 8/10 | Voir détail ci-dessous |
| 5 | Valeur vs prix 150€/mois | 7/10 | Voir détail ci-dessous |

---

## Détail par critère

### 1. Gain de temps ressenti — 7/10

**Thomas parle :**
Je fais un R+3, 4 appartements par étage. L'IA me pré-crée 12 lots d'un coup au lieu de m'en faire 0. OK, c'est bien. Mais concrètement combien de temps je gagne ?

Analyse honnête :
- Scénario idéal (clustering 80% confidence, 12 lots pré-créés, aucun ajustement) : j'arrive Étape 2, je clique "Tout valider", 1 clic. Je passe de 80 min à moins de 2 min sur la validation. Excellent.
- Scénario réaliste (3 lots sur 12 mal zonés, bounding box trop large qui déborde sur le couloir) : je dois ajuster 3 zones à la main. Resize + renommage éventuel. Estimation : 3 × 3 min = 9 min. Total : ~12 min au lieu de 80 min. Encore très bon.
- Problème détecté : la bbox englobante (Option A retenue en V1) produit des rectangles approximatifs. Sur un R+3 avec un couloir central, la bbox du T3 va systématiquement inclure une portion du couloir ou de la cage d'escalier. Je vois un rectangle trop grand sur le canvas. Je dois le réduire. Ça me prend 2-3 min par lot concerné. Gain réel = correct mais pas spectaculaire sur les plans complexes.

**Correction P1** : documenter dans la spec que la bbox V1 est intentionnellement approximative — et afficher une note dans l'UI ("Zones pré-calculées à affiner") pour gérer l'attente. Sans ça, Thomas pense que l'IA lui ment sur la précision.

**Correction P1 — fichier** : `LotPanel.tsx`, section en-tête du panneau, ajouter sous le compteur de lots une ligne :
```tsx
{lots.some(l => l.source === "ai") && (
  <p className="text-xs text-[var(--color-text-muted)] mt-2xs">
    Zones approximatives — ajustez si besoin.
  </p>
)}
```

---

### 2. Confiance dans l'IA — 6/10

**Thomas parle :**
Je vois le badge "IA" sur chaque lot. Bien. Je vois la bordure pointillée sur les lots suggérés. Bien. Mais je ne vois NULLE PART le score de confiance du clustering. Je sais juste "c'est de l'IA". Je ne sais pas si l'IA était sûre à 95% ou à 71%. Sur un plan ambigu, ça change tout. Si elle était à 71%, je vais vérifier chaque lot à la main. Si elle était à 93%, je valide tout d'un clic sans regarder.

Deuxième problème : si la cuisine de mon studio (lot A) a été rattachée par l'IA au T3 voisin (lot B), comment je le vois ? Je vois deux rectangles sur le canvas. Je n'ai aucune visualisation des pièces composant chaque lot. Je dois corriger en aveugle — resize la bbox sans savoir quelles pièces sont dedans.

**Correction P0 BLOQUANTE** : afficher la confiance moyenne du clustering par lot.
- Fichier : `LotCard` dans `LotPanel.tsx`, dans le bloc `lot.source === "ai"`, après le badge "IA" :
```tsx
{lot.confidence_avg != null && (
  <span className="text-[10px] text-[var(--color-text-muted)] ml-xs">
    {Math.round(lot.confidence_avg * 100)}%
  </span>
)}
```
- Prérequis : ajouter `confidence_avg: number | null` au type `VsLot` dans `types.ts` et le persister en base (colonne `confidence_avg` dans `vs_lots` ou dans `zone_data` JSON — à décider @fullstack). La route `extract/route.ts` calcule déjà `group.confidence_avg` implicitement via `clusterByUnit` — il suffit de l'écrire en base et de le renvoyer via l'API lots.

**Correction P1** : tooltip ou section "Pièces incluses" par lot (liste des pièces IA qui composent ce lot), pour que Thomas identifie immédiatement le mauvais rattachement sans resize à l'aveugle.

---

### 3. Page blanche adressée — 8/10

**Thomas parle :**
J'arrive Étape 2. Je vois "Organisation des lots en cours…" avec un spinner. OK, ça charge. Puis les lots apparaissent avec leurs overlays. C'est exactement ce que je voulais — plus de page blanche. Je peux naviguer par étage via les boutons RDC / R+1 / R+2 / R+3.

Ce qui fonctionne bien :
- `loading` state avec message clair (page.tsx ligne 514)
- Overlays sur le canvas pour chaque lot pré-créé
- Bouton "Tout valider (N lots IA)" en bas du panneau — c'est le vrai gain en 1 clic

Manque mineur : le H1 dit "Découpez vos lots" (ligne 557). Avec les lots pré-créés, ce message est trompeur — je n'ai pas à "découper", j'ai à "valider". Sur les projets avec clustering réussi, le message devrait s'adapter.

**Correction P1** : rendre le H1 conditionnel.
- `lots/page.tsx`, ligne 558, remplacer :
```tsx
<h1 className="text-xl font-semibold text-[var(--color-text-default)]">
  Découpez vos lots
</h1>
```
Par :
```tsx
<h1 className="text-xl font-semibold text-[var(--color-text-default)]">
  {lots.some(l => l.source === "ai" && l.status === "suggested")
    ? "Vérifiez et validez vos lots"
    : "Découpez vos lots"}
</h1>
```

---

### 4. Cas dégradés gérés — 8/10

**Thomas parle :**
J'ai testé mentalement les cas limites contre la spec :

- Plan de maison individuelle : 1 seul lot "Maison" créé. OK.
- Plan scan illisible (confiance < 0.7) : 0 lot créé, message "L'IA n'a pas détecté de lots fiables — dessinez manuellement" + bouton "Dessiner un polygone". Excellent — c'est du fallback propre.
- Pièces non assignées (unit_id = null) : la spec dit qu'elles apparaissent dans un groupe "Pièces non assignées" dans le panneau latéral. MAIS dans `LotPanel.tsx`, je ne vois pas ce groupe implémenté. La spec l'a prévu (ligne 180 du spec), le frontend ne l'a pas.

**Correction P0 BLOQUANTE** : implémenter la section "Pièces non assignées" dans `LotPanel.tsx`. Sans ça, les pièces orphelines (couloirs, caves, parties communes) disparaissent silencieusement. Thomas ne sait pas qu'il manque des pièces dans ses lots.
- Dans `LotPanel.tsx`, props à ajouter : `unassignedRooms?: ExtractedRoom[]`
- Dans la liste des lots (entre les lots et les boutons d'action), ajouter :
```tsx
{unassignedRooms && unassignedRooms.length > 0 && (
  <div className="mt-sm border-t border-[var(--color-border-default)] pt-sm">
    <p className="text-xs font-medium text-[var(--color-text-muted)] px-md mb-xs">
      Pièces non assignées ({unassignedRooms.length})
    </p>
    {unassignedRooms.map((room, i) => (
      <div key={i} className="px-md py-xs text-xs text-[var(--color-text-muted)]">
        {room.room_type} {room.floor != null ? `— Étage ${room.floor}` : ""}
      </div>
    ))}
  </div>
)}
```
- La route `extract/route.ts` doit retourner les rooms non assignées, ou elles sont lisibles via `plans[i].extraction_data` côté frontend.

---

### 5. Valeur vs prix 150€/mois — 7/10

**Thomas parle :**
Mon calcul honnête :
8 opérations/an × 10 lots moyens/opé = 80 lots/an.
Avant : 80 lots × 5 min = 400 min = 6,7h de dessin manuel.
Après (clustering 80% fiable, ajustements 1 min/lot) : 80 × 1 min = 80 min.
Gain net : ~5,5h/an.
À 50€/h de valeur temps consultant : 275€/an de valeur récupérée rien que sur l'Étape 2.
L'abonnement est à 1 800€/an (150€/mois).

Donc sur ce seul critère, le ratio est de 275/1 800 = 15% de ROI direct. Insuffisant pour justifier l'abonnement à lui seul — mais Versi Studio n'est pas vendu sur ce seul critère. L'Étape 3 (pièces automatisées) et la génération de docs en Étape 4 portent le reste de la valeur.

Ce que je dis en tant que Thomas : si le clustering fonctionne à 80% et que les corrections prennent vraiment 1 min/lot (et non 5 min à cause d'une bbox trop approximative), je renouvelle. Si je passe encore 3 min/lot à corriger des zones inexactes, le gain est marginal et la frustration monte.

**Levier non activé** : la surface m² est calculée et sauvegardée (`surfaceM2` dans `extract/route.ts` ligne 173). Elle est affichée dans `LotCard` (`surfaceLabel`). C'est un vrai plus — je vois immédiatement "T3 — 72 m²" vs "T2 — 48 m²". Ça m'aide à valider visuellement sans mesurer. Point positif concret.

---

## P0 bloquants (Thomas refuse de renouveler si pas corrigé)

**P0-1 : Score de confiance absent du panneau.**
Je valide en aveugle. Un lot à 71% de confiance et un lot à 94% se ressemblent identiquement dans l'UI. Je ne sais pas où concentrer mon attention de vérification.
→ Ajouter `confidence_avg` dans le type `VsLot`, le persister en base dans `extract/route.ts`, l'afficher dans `LotCard` (détail critère 2 ci-dessus).

**P0-2 : Section "Pièces non assignées" absente.**
La spec l'a prévu. Le frontend ne l'a pas. Des pièces (couloirs, caves, locaux communs) disparaissent silencieusement. Sur un immeuble avec des parties communes, je rate des éléments qui impactent la surface habitable.
→ Implémenter dans `LotPanel.tsx` (détail critère 4 ci-dessus).

---

## P1 recommandés (Thomas râle mais renouvelle)

**P1-1 : Note "Zones approximatives" absente.**
La bbox englobante V1 va parfois inclure le couloir ou la cage d'escalier. Sans prévenir Thomas, il pensera que l'IA se trompe. Un simple message préventif dans le panneau évite la frustration.
→ `LotPanel.tsx`, sous le compteur de lots si `lots.some(l => l.source === "ai")`.

**P1-2 : H1 non adapté aux lots pré-créés.**
"Découpez vos lots" quand les lots sont déjà là = friction cognitive mineure.
→ `lots/page.tsx` ligne 558, H1 conditionnel (détail critère 3 ci-dessus).

**P1-3 : Tooltip "pièces incluses" par lot absent.**
Pour identifier un mauvais rattachement de pièce sans resize à l'aveugle.
→ Futur ticket — pas bloquant pour la V1 si P0-1 (confiance %) est en place.

---

## Verdict persona : ITÉRATION 2

**Raison** : 2 gates P0 FAIL.
- P0-1 (confiance %) : l'absence rend la validation aveugle, contraire au principe "je valide ce que je comprends".
- P0-2 (pièces non assignées) : perte silencieuse de données qui impacte la complétude de l'Étape 3.

Sur les P1 : corrections légères, pas de re-conception. Le gain de temps fondamental est validé. La mécanique backend (clustering, nommage T{n}, bbox, "no AI > bad AI") est solide.

**Estimation itération 2** : corrections P0 = 2-3h @fullstack, re-audit = GO immédiat si corrections conformes au détail ci-dessus.

---

## Handoff

→ @orchestrator

**Fichiers produits** : `docs/reviews/vs-s21-audit-marchand-it1.md`

**Décisions prises** :
- Verdict ITÉRATION 2 (2 P0 bloquants)
- P0-1 : ajouter `confidence_avg` dans `VsLot`, persister en base, afficher dans `LotCard`
- P0-2 : implémenter section "Pièces non assignées" dans `LotPanel.tsx`
- P1 à traiter en parallèle : note bbox approximative + H1 conditionnel

**Points d'attention pour la suite** :
- La route `extract/route.ts` calcule implicitement la confiance via `clusterByUnit` — vérifier que `confidence_avg` est bien exposé par `clusterByUnit` avant le PATCH @fullstack
- La section "Pièces non assignées" nécessite de passer les rooms non assignées du backend au frontend — soit via un champ enrichi de l'API lots, soit en lisant `extraction_data` côté client
- Ne pas toucher à la mécanique "no AI > bad AI" (seuil 0.7) — elle est validée
- Registre "vous" / impératif neutre à respecter sur tous les nouveaux micro-copy (founder-preferences.md s16)
