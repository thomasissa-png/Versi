# POC OCR Auto-calibration des plans -- Resultats finaux

**Date** : 2026-04-17
**Agent** : @ia
**Statut** : TERMINE -- 4/4 plans OK

---

## 1. Diagnostic -- Cause racine de l'echec initial

### Symptome

Les 4 plans de test echouaient systematiquement avec des erreurs Zod `invalid_type` / `received: "undefined"` sur les champs `scale_text`, `scale_ratio`, `reference_dimension`, `reasoning`.

### Cause racine

**GPT-4.1 renvoyait un JSON valide mais avec des noms de champs differents du schema Zod attendu.** La configuration `response_format: { type: "json_object" }` force un output JSON valide, mais ne contraint PAS la structure des champs. Sans le schema exact dans le prompt ou via Structured Outputs, le modele invente ses propres noms de champs a chaque appel (comportement non-deterministe).

Reponses brutes observees (DEBUG_OCR=1) :

| Plan | Champs renvoyes par GPT-4.1 | Champs attendus par Zod |
|---|---|---|
| P00 (RDC) | `scale_label`, `scale_type`, `explanation` | `scale_text`, `scale_ratio`, `reasoning` |
| P01 (R+1) | `scaleType`, `scaleText`, `scaleValue` (0.02), `explanation` | `scale_text`, `scale_ratio` (50), `reasoning` |
| P02 (R+2) | `scaleLabelFound`, `scaleLabel`, `scaleLabelPosition`, `dimensionExample` | `scale_text`, `scale_ratio`, `reference_dimension` |
| P03 (R+3) | `scaleLabel`, `scaleType`, `scaleValue` (50), `reason` | `scale_text`, `scale_ratio`, `reasoning` |

A noter : le modele detectait correctement l'echelle 1:50 sur les 4 plans (avec confidence 0.98-0.99). Le probleme etait purement un probleme de mapping schema, pas de capacite Vision.

### Correction appliquee

Remplacement de `response_format: { type: "json_object" }` + parsing Zod manuel par **OpenAI Structured Outputs** via `zodResponseFormat` du SDK OpenAI v5.

Diff sur `src/lib/vs/plan-scale-detector.ts` :

```diff
- import OpenAI from "openai";
+ import OpenAI from "openai";
+ import { zodResponseFormat } from "openai/helpers/zod";

  // Prompt simplifie (plus besoin de "Reponds STRICTEMENT au format JSON Zod")
- 5. Réponds STRICTEMENT au format JSON Zod. Pas de markdown, pas de commentaire avant/après.
+ 5. scale_ratio = le dénominateur de l'échelle (ex: 100 pour 1:100, 50 pour 1:50).

  // Appel API : parse() au lieu de create(), schema Zod transmis via zodResponseFormat
- response = await client.chat.completions.create({
-   model: "gpt-4.1",
-   response_format: { type: "json_object" },
+ response = await client.chat.completions.parse({
+   model: "gpt-4.1",
+   response_format: zodResponseFormat(PlanScaleResultSchema, "plan_scale_result"),

  // Parsing : le SDK valide automatiquement via Zod
- let parsed: unknown;
- try { parsed = JSON.parse(raw); } catch { ... }
- // + unwrapping objet parent + PlanScaleResultSchema.parse(candidate)
+ const parsed = response.choices[0]?.message?.parsed;
+ if (!parsed) { throw ... }
+ return parsed;
```

Le code de normalisation manuelle (extraction depuis sous-objet, JSON.parse, Zod.parse) a ete supprime car `zodResponseFormat` garantit structurellement que le modele renvoie les bons noms de champs.

---

## 2. Resultats finaux -- 4/4 plans

Execution : `DEBUG_OCR=1 npx tsx scripts/test-ocr-plans.ts`

| Plan | scale_text | scale_ratio | ref_dim | confidence | reasoning |
|---|---|---|---|---|---|
| P00 - RDC | ECH. 1 : 50 | 50 | null | 0.98 | L'echelle textuelle 'ECH. 1 : 50' est clairement indiquee en bas a droite du plan, ce qui rend la detection tres fiable. |
| P01 - R+1 | ECH. 1 : 50 | 50 | null | 0.98 | L'echelle textuelle 'ECH. 1 : 50' est clairement indiquee en bas a droite du plan, ce qui est tres fiable. |
| P02 - R+2 | ECH. 1 : 50 | 50 | null | 0.98 | L'echelle textuelle 'ECH. 1 : 50' est clairement indiquee en bas a droite du plan, ce qui rend la detection tres fiable. |
| P03 - R+3 | ECH. 1 : 50 | 50 | null | 0.98 | L'echelle textuelle 'ECH. 1 : 50' est clairement indiquee en bas a droite du plan, ce qui rend la detection tres fiable. |

**Sortie console reelle** :

```
┌─────────┬──────────────────────────────────┬───────────────┬───────┬──────┬─────┐
│ (index) │ plan                             │ scale         │ ratio │ conf │ err │
├─────────┼──────────────────────────────────┼───────────────┼───────┼──────┼─────┤
│ 0       │ 'P 00 - Pr2_plan RDC_ projet2.p' │ 'ECH. 1 : 50' │ 50    │ 0.98 │ '-' │
│ 1       │ 'P 01 - Pr2_plan R+1_ projet2.p' │ 'ECH. 1 : 50' │ 50    │ 0.98 │ '-' │
│ 2       │ 'P 02 - Pr2_plan R+2_ projet2.p' │ 'ECH. 1 : 50' │ 50    │ 0.98 │ '-' │
│ 3       │ 'P 03 - Pr02_plan R+3_ projet02' │ 'ECH. 1 : 50' │ 50    │ 0.98 │ '-' │
└─────────┴──────────────────────────────────┴───────────────┴───────┴──────┴─────┘
```

**Taux de succes** : 4/4 (100%)
**Confidence moyenne** : 0.98
**Tous les plans >= 0.9** : OUI (4/4)

---

## 3. Verdict

### Metrique Thomas

| Critere | Seuil | Resultat | Verdict |
|---|---|---|---|
| >= 3/4 plans avec confidence >= 0.9 | GO seuil actuel | 4/4 a 0.98 | **GO** |
| >= 3/4 plans avec confidence >= 0.7 | GO seuil ajuste | 4/4 a 0.98 | **GO** |
| < 2/4 plans avec confidence >= 0.7 | NO-GO POC | N/A | N/A |

**Verdict : GO -- seuil actuel (0.9) valide.**

Les 4 plans affichent un score de confiance de 0.98, bien au-dessus du seuil de pre-remplissage automatique (0.9). Le comportement "assistant" fonctionne : Thomas verra la calibration pre-remplie avec echelle 1:50 et validera d'1 clic.

### Limites du POC

- Les 4 plans testent le **meme projet** (projet 2, etages RDC a R+3). L'echelle est identique (1:50) et clairement notee "ECH. 1 : 50" en bas a droite.
- Le POC ne teste pas encore : plans sans echelle textuelle, echelles non-standard (1:75, 1:125), barres d'echelle graphiques (segment gradue sans texte), plans scannes avec bruit/rotation, plans a echelles multiples (1:100 en general + 1:50 en detail).
- Recommandation : tester sur 2-3 plans de projets differents (echelles variees) avant GO PRODUCTION definitif.

---

## 4. Cout OpenAI reel

### Tokens par plan

| Plan | Tokens input | Tokens output | Tokens total |
|---|---|---|---|
| P00 - RDC | 1 779 | 66 | 1 845 |
| P01 - R+1 | 1 779 | 63 | 1 842 |
| P02 - R+2 | 1 779 | 66 | 1 845 |
| P03 - R+3 | 1 779 | 66 | 1 845 |
| **Total** | **7 116** | **261** | **7 377** |

### Cout unitaire (tarifs GPT-4.1 avril 2026)

Source : [OpenAI API Pricing](https://openai.com/api/pricing/)

- Input : $2.00 / 1M tokens
- Output : $8.00 / 1M tokens

### Calcul pour ce POC (4 plans)

- Input : 7 116 tokens x $2.00/1M = **$0.014**
- Output : 261 tokens x $8.00/1M = **$0.002**
- **Total POC : $0.016** (1.6 centimes USD)

### Projection mensuelle

Thomas traite 1-3 plans/semaine. Hypothese haute : 12 plans/mois.

- 12 plans x 1 845 tokens/plan = 22 140 tokens/mois
- Cout : (22 140 x $2.00 + 792 x $8.00) / 1 000 000 = **$0.05/mois** (5 centimes)

Cout negligeable. Aucun risque d'explosion budgetaire meme a 100 plans/mois ($0.40).

### ROI

```
ROI = (Temps humain economise x cout horaire) / Cout tokens mensuel
    = (12 plans x 30s economises x 50EUR/h) / 0.05EUR
    = (0.17h x 50EUR) / 0.05EUR
    = 8.33EUR / 0.05EUR
    = 167
```

ROI = **167** (>> seuil de 3). Feature IA largement justifiee.

---

## 5. Recommandations

### Court terme (avant GO PRODUCTION)

1. **Tester sur 2-3 plans de projets differents** avec des echelles variees (1:100, 1:200) pour valider la robustesse. Le POC actuel ne teste qu'une seule echelle (1:50) d'un seul projet.
2. **Le seuil de confiance 0.9 est valide** comme seuil de pre-remplissage automatique. A 0.98 sur les 4 plans, la marge est confortable.
3. **`detail: "high"` est deja utilise** dans l'appel Vision. Pas d'ajustement necessaire.

### Moyen terme

4. **Prompt caching** : le system prompt (identique pour chaque appel) peut beneficier du prompt caching OpenAI pour reduire les tokens input de ~50%. Gain marginal en cout (le cout est deja negligeable) mais utile si le volume augmente.
5. **Fallback `reference_dimension`** : sur les 4 plans, le modele renvoie `reference_dimension: null` car l'echelle textuelle est trouvee. Verifier que le fallback dimension cotee fonctionne sur des plans sans echelle textuelle.
6. **Monitoring** : ajouter un log des tokens consommes par appel dans le dashboard admin (Langfuse ou simple compteur DB) pour suivre l'evolution du cout.

---

## 6. Fichiers modifies/produits

| Fichier | Action |
|---|---|
| `src/lib/vs/plan-scale-detector.ts` | Corrige : zodResponseFormat + client.chat.completions.parse() |
| `scripts/test-ocr-plans.result.json` | Resultats finaux (4/4 OK) |
| `scripts/test-ocr-plans.console.log` | Log console de l'execution reussie |
| `docs/ia/poc-ocr-resultats.md` | Ce livrable |

---

**Handoff -> @moi**
- Fichiers produits : `docs/ia/poc-ocr-resultats.md`, `src/lib/vs/plan-scale-detector.ts` (corrige), `scripts/test-ocr-plans.result.json`
- Decisions prises : remplacement `json_object` par `zodResponseFormat` (Structured Outputs OpenAI), seuil 0.9 valide, modele GPT-4.1 confirme
- Points d'attention : tester sur plans d'autres projets (echelles variees) avant GO PRODUCTION definitif. Si seuil ou prompt a ajuster dans `PlanCalibration.tsx` -> handoff @fullstack. Cout mensuel negligeable ($0.05/mois a 12 plans/mois).
---
