# Dossiers sources — HTML = modèle

Ce dossier contient les **fichiers HTML autonomes** soignés par Thomas
(fondateur) pour chaque bien Muguets. Ils sont servis tels quels sur
`/dossier/:id` et téléchargeables en PDF via `/dossier/:id/pdf`.

## Règle d'or

**Le HTML est LA source de vérité du contenu.**
L'annonce `/nos-biens/:id` (composant React `PropertyDetailPage` +
données dans `scripts/seed-properties-muguets.js`) **s'aligne** sur le
HTML — jamais l'inverse.

Décision fondateur (verbatim) : « ce HTML te sert de modèle pour les
prochains […] on garde le design du site, mais on s'assure que le
contenu est 100% pareil et dans le même ordre ».

## Périmètre

Aujourd'hui :

- `muguets-lot-1-rdc.html` — Lot 1, T2 RDC
- `muguets-lot-2-t3.html` — Lot 2, T3 1er étage

Le Lot 3 (duplex) n'a pas (encore) de HTML — l'annonce reste sur le
gabarit standard. Quand un HTML duplex existera, suivre la procédure
d'ajout ci-dessous.

## Ordre canonique des sections

L'annonce et le HTML rendent ces sections **dans cet ordre exact** :

1. Emplacement
2. Le bien
3. Plan
4. Caractéristiques
5. Travaux
6. État actuel et projet
7. Performances énergétiques
8. Acheter — les deux formules
9. Repères marché
10. À prévoir
11. Calendrier

## Mapping HTML → champ `dossier` JSON

| Section HTML            | Champ `dossier` JSON (seed)                            |
| ----------------------- | ------------------------------------------------------ |
| Tagline hero            | `tagline`                                              |
| Lede hero               | `hook` + `intro`                                       |
| Emplacement (prose)     | `emplacement.prose[]`                                  |
| Emplacement (3 blocs)   | `emplacement.adresse / .transports / .proximite`       |
| Le bien (P1, P2)        | `leBien[]` (tableau de paragraphes)                    |
| Le bien (P3)            | `pourQui`                                              |
| Pullquote               | `accroche`                                             |
| Plan + surfaces         | `planImage`, `planCaption`, `surfaces[]`               |
| Caractéristiques        | `caracteristiques[]`                                   |
| Travaux                 | `travaux.intro`, `travaux.phases[]`                    |
| État actuel             | `etatActuel.*`                                         |
| Performances DPE        | `dpeProjete.*`                                         |
| Les deux formules       | `formules.*`                                           |
| Repères marché          | `reperesMarche.intro`, `reperesMarche.rows[]`          |
| À prévoir               | `aPrevoir.intro`, `aPrevoir.items[]`, `aPrevoir.sources` |
| Calendrier              | `calendrier[]`                                         |

## Garde-fou automatique

Le test `tests/unit/muguets-fidelite-html.test.js` vérifie que **chaque
chaîne canonique du JSON dossier est présente dans le HTML source**. Si
le JSON contient une phrase absente du HTML → le test échoue (dérive
détectée).

Sens unique : **HTML → JSON**. Le test rappelle de resynchroniser quand
le HTML évolue.

Run local : `npm run test` (depuis `versi-immobilier/`).

## Procédure pour ajouter un futur bien

1. Thomas livre le HTML autonome dans `docs/dossiers-sources/<id>.html`.
2. Dans `scripts/seed-properties-muguets.js`, créer/aligner l'objet
   `dossier` du bien sur le contenu du HTML (chaque phrase, chaque
   tableau, chaque ligne).
3. Étendre `tests/unit/muguets-fidelite-html.test.js` pour couvrir le
   nouveau lot (ajouter un `before` qui lit le HTML + un `describe`
   appelant `assertDossierFidele`).
4. Lancer `npm run build && npm run test` — les deux doivent PASS.
5. Vérifier l'annonce `/nos-biens/<id>` en dev : ordre des sections,
   prose, blocs structurés, prix.

## Pourquoi cette mécanique ?

Sans garde-fou, le JSON dérive du HTML au fil des éditions (deux
sources de texte qui divergent silencieusement). Le test transforme le
HTML en **contrat exécutable** : c'est lui qui pilote l'annonce.

## PDF servis au téléchargement

Depuis s35, `muguets-lot-1-rdc.pdf` et `muguets-lot-2-t3.pdf` sont les
**V7 fournies par le fondateur** (et non plus des PDF régénérés depuis le
HTML). Ne pas relancer `scripts/generate-dossier-pdf.mjs` sans son accord :
cela écraserait ses fichiers.
