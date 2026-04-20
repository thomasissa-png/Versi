# Audit copy Étape 2 — v2 (recul métier)

> @copywriter | Session s23 | 2026-04-20
> Persona : Thomas, marchand de biens. Il achète et découpe des immeubles en lots.
> Framework : UX writing orienté métier — le test est "comprend-il en 2 secondes ?"
> Niveau de conscience : Product-Aware — Thomas est dans l'outil, il connaît son métier

---

## Ce que la v1 a raté

La v1 a remplacé "polygone" par "contour". Résultat : même registre géométrique, autre mot. Thomas n'utilise pas "contour" dans son métier. Il utilise "lot".

La règle n'était pas "éviter le jargon technique". Elle était : **parler comme un marchand de biens parle sur un chantier**.

---

## 1. Le bouton — décision tranchée

**Bouton actuel :** `Tracer un contour libre`
**Bouton recommandé :** `Dessiner un lot`

### Rationale

Le bouton sert à tracer manuellement la forme d'un lot que l'IA n'a pas détecté. L'action est : **ajouter un lot**. La modalité est : **en le dessinant à la main**.

"Dessiner un lot" dit les deux en trois mots. C'est le vocabulaire que Thomas utiliserait lui-même pour décrire l'action à un collègue : "j'ai dû dessiner le lot manuellement."

"Ajouter un lot" (le bouton juste au-dessus) couvre déjà l'action rapide — lot rectangulaire, placé automatiquement. "Dessiner un lot" marque la différence : forme libre, tracée à la main. La distinction est naturelle, pas technique.

### Cohérence du parcours

| Moment | Texte actuel | Texte recommandé |
|---|---|---|
| Bouton repos | `Tracer un contour libre` | `Dessiner un lot` |
| Bandeau actif (titre) | `Tracé libre en cours` | `Dessin du lot en cours` |
| Bandeau actif (instruction) | `Cliquez pour poser un point. Double-cliquez pour fermer le contour. Échap pour annuler.` | `Cliquez pour poser un point. Double-cliquez pour terminer le lot. Échap pour annuler.` |
| Bouton annulation dans le bandeau | `Annuler le tracé` | `Annuler` |

Un seul mot pivot : **lot**. Il traverse tout le parcours du bouton à la confirmation.

---

## 2. Audit global — ce qui reste à changer

### État actuel du code (post v1)

La v1 a déjà été intégrée pour la plupart des corrections. Voici ce qui est en place et ce qui ne l'est pas.

**Déjà corrigé (ne pas retoucher)**

| Texte | Statut |
|---|---|
| `estimation IA` (LotPanel.tsx ~128) | Correct |
| `Donnez l'échelle du plan pour afficher la surface` (LotPanel.tsx ~130) | Correct |
| `Les contours proposés par l'IA sont des estimations. Ajustez-les si nécessaire.` (LotPanel.tsx ~359) | Correct |
| `Aucun lot détecté sur ce plan. Tracez-les manuellement avec le bouton ci-dessous.` (~370) | Correct |
| `Aucun lot pour le moment. Lancez la détection IA ou tracez un lot manuellement.` (~376) | Acceptable — sera amélioré quand le bouton change |
| Messages d'erreur canvas (contour / points) | Corrigés v1 |
| Instructions pas à pas calibration | Corrigées v1 |
| Pluralisation `failedIds` | Corrigée v1 |

**À corriger maintenant**

| Fichier | Ligne approx. | Avant | Après |
|---|---|---|---|
| `LotPanel.tsx` | 500 | `Tracer un contour libre` | `Dessiner un lot` |
| `LotPanel.tsx` | 422 | `Tracé libre en cours` | `Dessin du lot en cours` |
| `LotPanel.tsx` | 424 | `Double-cliquez pour fermer le contour.` | `Double-cliquez pour terminer le lot.` |
| `LotPanel.tsx` | 431 | `Annuler le tracé` | `Annuler` |
| `page.tsx` | 867 | `Pour un lot en L ou avec des retraits, utilisez « Tracer un contour libre ».` | `Pour un lot en L ou avec des retraits, utilisez « Dessiner un lot ».` |

**À corriger — cohérence secondaire (P2)**

| Fichier | Ligne approx. | Avant | Après | Motif |
|---|---|---|---|---|
| `LotPanel.tsx` | ~376 | `tracez un lot manuellement` | `dessinez-le manuellement` | Alignement sur le nouveau label du bouton |
| `LotPanel.tsx` | ~371 | `Tracez-les manuellement avec le bouton ci-dessous.` | `Dessinez-les manuellement avec le bouton ci-dessous.` | Idem |

---

## 3. Glossaire métier — table définitive

| Terme à bannir | Terme recommandé | Règle |
|---|---|---|
| Polygone | Lot | Toujours — c'est l'objet métier |
| Contour libre | Dessiner un lot | Dans le bouton et le bandeau |
| Tracer un contour | Dessiner un lot | Dans toute instruction liée à ce bouton |
| Sommet(s) | Point(s) | Instructions de tracé |
| Fermer le contour | Terminer le lot | Instruction de fin de tracé |
| Tracé libre | Dessin du lot | Bandeau d'état actif |
| Extraction IA | Détection IA | Déjà corrigé — maintenir |
| Avant calibration | Estimation IA | Déjà corrigé — maintenir |
| Approximation rectangulaire | Estimations | Déjà corrigé — maintenir |

Règle d'or : si le mot existe dans un manuel de géométrie mais pas dans un acte de vente en copropriété, il est interdit dans l'UI.

---

## 4. Liste de corrections pour @fullstack

Corrections P0 — avant la prochaine démo.

**LotPanel.tsx**

```
Ligne ~500
AVANT : Tracer un contour libre
APRÈS  : Dessiner un lot

Ligne ~422
AVANT : Tracé libre en cours
APRÈS  : Dessin du lot en cours

Ligne ~424
AVANT : Double-cliquez pour fermer le contour.
APRÈS  : Double-cliquez pour terminer le lot.

Ligne ~431
AVANT : Annuler le tracé
APRÈS  : Annuler
```

**page.tsx**

```
Ligne ~867
AVANT : Pour un lot en L ou avec des retraits, utilisez « Tracer un contour libre ».
APRÈS  : Pour un lot en L ou avec des retraits, utilisez « Dessiner un lot ».
```

Corrections P2 — pass polish.

**LotPanel.tsx**

```
Ligne ~371
AVANT : Tracez-les manuellement avec le bouton ci-dessous.
APRÈS  : Dessinez-les manuellement avec le bouton ci-dessous.

Ligne ~376
AVANT : Lancez la détection IA ou tracez un lot manuellement.
APRÈS  : Lancez la détection IA ou dessinez un lot manuellement.
```

---

## 5. Ce qui ne change pas

- "Ajouter un lot" (bouton rectangulaire rapide) — correct, ne pas toucher
- "Valider et passer aux pièces" — correct
- "Vérifiez les contours, puis validez." (LotPanel ~343) — "contours" ici désigne les formes des lots à l'écran, pas le tracé libre. Acceptable dans ce contexte.
- Toutes les corrections v1 déjà intégrées — ne pas régresser

---

**Handoff → @fullstack**
- Fichier produit : `/home/user/Versi/docs/copy/s23-etape2-audit-copy-v2.md`
- Fichiers à modifier :
  - `versi-studio/src/components/vs/LotPanel.tsx` — lignes ~422, ~424, ~431, ~500
  - `versi-studio/src/app/vs/projects/[id]/lots/page.tsx` — ligne ~867
- Décision non négociable : "Dessiner un lot" remplace "Tracer un contour libre" partout. Le mot pivot est "lot", pas "contour".
- Points d'attention : utiliser Grep sur "contour libre" et "Tracer un contour" pour s'assurer qu'aucune occurrence ne subsiste. La recherche est sensible à la casse.
