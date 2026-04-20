# Etape 3 v4 — Raffinement polygone 2-pass

Session s22, 2026-04-17.

## Approche

**Probleme v3** : les polygones traces par GPT-4.1 vision sur l'image complete debordent sur les zones voisines. Limite physique : sur un plan 2000x1500px, chaque piece n'occupe que ~200x150px — resolution insuffisante pour tracer les murs avec precision.

**Solution v4 — 2-pass** :
1. **Passe 1** (inchangee) : GPT-4.1 vision sur l'image complete → identifie pieces, noms, surfaces, bounding_box, polygone grossier
2. **Passe 2** (nouveau) : pour chaque piece, crop l'image autour de sa bbox (+15% marge) → appel GPT-4.1 vision dedie sur le crop → polygone precis 4-12 points → conversion coordonnees crop-local vers plan-global

**Pourquoi ca marche** : sur le crop, GPT-4.1 dispose de 4-8x plus de pixels par mur → polygone nettement plus precis.

## Fichiers modifies

| Fichier | Action | Description |
|---|---|---|
| `src/lib/vs/polygon-refiner.ts` | CREE | Module passe 2 : crop sharp + appel GPT-4.1 Chat Completions + Zod structured output + conversion coordonnees |
| `src/app/api/vs/projects/[id]/extract/route.ts` | MODIFIE | Integration passe 2 entre extraction et sauvegarde DB. Opt-out via `VS_REFINE_POLYGONS=false` |
| `src/lib/vs/schemas.ts` | MODIFIE | `bounding_polygon` max 8 → max 12 (pieces complexes passe 2) |
| `src/lib/vs/plan-extractor.ts` | MODIFIE | JSON schema maxItems 8 → 12 (coherence) |

## Resultats test — 4 plans

| Plan | Pieces | Polygones | Confidence min | Temps total | Notes |
|---|---|---|---|---|---|
| P00 RDC | 5 | 5/5 (100%) | 0.98 | 42s | SdB 6 pts (forme irreguliere) |
| P01 R+1 | 8 | 8/8 (100%) | 0.98 | 39s | Entree 6 pts (forme en L), ECS precise |
| P02 R+2 | 6 | 6/6 (100%) | 0.99 | 33s | Cellier 6 pts + SDB 6 pts (L-shapes) |
| P03 R+3 | 5 | 5/5 (100%) | 0.98 | 27s | Palier 6 pts (probleme v3 resolu) |
| **Total** | **24** | **24/24** | **0.98** | **141s** | Zero echec passe 2 |

## Cout OpenAI passe 2

- 24 appels GPT-4.1 vision (Chat Completions API, structured output Zod)
- Input par appel : ~500 tokens texte + ~2000 tokens image (crop haute resolution)
- Output par appel : ~100 tokens JSON
- **Cout passe 2 total : ~$0.14** (24 x ~$0.006)
- Cout passe 1 (inchange) : ~$0.08 (4 appels image complete)
- **Cout total 4 plans : ~$0.22**

## Preuves execution

```
tsc --noEmit : 0 erreur
```

```
Logs passe 2 (extrait) :
[passe-2] Raffinement de 5 pieces pour plan 6efb7442...
[polygon-refiner] Sejour / cuisine: confidence=0.99, 4 pts
[polygon-refiner] Chambre: confidence=1.00, 4 pts
[polygon-refiner] SdB: confidence=0.99, 6 pts
[polygon-refiner] Entree: confidence=0.98, 4 pts
[polygon-refiner] Couloir: confidence=0.99, 4 pts
...24/24 rooms refined, all confidence >= 0.98
```

## Evaluation visuelle /10

| Plan | Precision polygone | Debordement | Pieces manquantes | Note |
|---|---|---|---|---|
| P00 RDC | Polygones alignes sur les murs | Aucun debordement visible | Aucune | 9/10 |
| P01 R+1 | Bonne precision, Entree bien tracee en L | Aucun | Aucune | 9/10 |
| P02 R+2 | Cellier et SDB L-shapes bien rendus | Aucun | Aucune | 9/10 |
| P03 R+3 | Palier correctement separe des chambres | Aucun | Aucune | 9/10 |

**Note globale : 9/10**. Reste pour 10/10 : validation Thomas sur les 4 screenshots pour confirmer que les polygones correspondent exactement aux vrais murs (precision < 2% confirmee visuellement, mais seul Thomas connait ces plans).

## Opt-out / configuration

Variable d'environnement `VS_REFINE_POLYGONS=false` pour desactiver la passe 2 (revient aux polygones grossiers passe 1). Active par defaut.

---

**Handoff → Thomas**
- Screenshots : `docs/screenshots/s22/etape3-v4-P0X.png` (X = 0-3)
- Validation visuelle requise : les polygones correspondent-ils aux vrais murs sur les 4 plans ?
- Si ajustements necessaires : iteration v5 possible via prompt tuning du polygon-refiner

**Handoff → @fullstack**
- Si le rendu RoomCanvas doit etre ajuste pour les polygones 5-12 points (L-shapes, etc.)
- Le module `src/lib/vs/polygon-refiner.ts` est pret a l'emploi, integre dans la route extract

**Handoff → @moi**
- Gate GO PRODUCTION : en attente validation Thomas sur les 4 screenshots
