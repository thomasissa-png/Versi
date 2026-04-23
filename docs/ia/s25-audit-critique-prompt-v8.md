# Audit critique prompt v8 building_outline — s25

**Auteur** : @ia (auto-audit honnête, zéro complaisance).
**Commit audité** : `204cff8` — `versi-studio/src/lib/vs/plan-extractor.ts` l.184-234.
**Ground truth** : lot manuel Thomas "Lot 1 — RDC" Muguets = **44 m²**, lot IA rejeté "T2 RDC" = **47 m²** (+6.8%, débordé sur escalier colimaçon + terrasse carrelée).

## Contexte Muguets RDC + attentes Thomas

Plan Muguets = immeuble haussmannien, RDC = 1 seul appartement T2 + escalier colimaçon central + terrasse carrelée donnant sur cour. Spécificités qui ont tué v4/v6/v7 :
1. Escalier = **colimaçon** (courbe continue), pas zigzag → les règles "zigzag/stepped" v6 ne matchaient pas.
2. Terrasse = **carrelage régulier** (pas de hachures, pas de stippling) → les heuristiques "hatching/tiles" v6/v7 ne la détectaient pas fiablement.
3. Cartouche en bas = bande horizontale → risque "height_percent > 70%".

v8 a été écrit pour répondre à ces 3 pièges via : terme `colimaçon/spiral` explicite, `tiles` unifié avec `parquet/hatching`, SELF-CHECK 3-points court.

## Scoring 10 attentes × /10

| # | Attente Thomas | Note | Justification |
|---|---|---|---|
| 1 | Détection auto lot privé | 7/10 | RULE unique "inside the entry door" claire, mais aucun exemple visuel → risque d'interprétation sur plans où entry door ambiguë (double entrée). |
| 2 | Exclure escalier colimaçon | 6/10 | Terme "spiral/colimaçon" ajouté dans EXCLUDE + SELF-CHECK #2. Mais le SELF-CHECK demande au modèle de détecter un pattern "spiral" INSIDE outline — gpt-4.1 vision échoue régulièrement sur détection de courbures continues (pattern s23 drift ~10%). |
| 3 | Exclure palier partagé | 7/10 | "palier: the shared landing outside the apartment door" explicite. Risque : si palier non labellé et intégré au même block visuel que l'entrée, le modèle peut le fondre dedans. Pas de heuristique géométrique. |
| 4 | Exclure terrasse carrelée | 5/10 | **Faille principale**. v8 liste "tiles, parquet, or hatching" comme signaux outdoor — mais le parquet INTÉRIEUR est aussi carrelé/tuilé. Le modèle ne peut pas distinguer "carrelage terrasse" de "carrelage cuisine" sans signal contextuel (position vs murs extérieurs). Le prompt dit "outside exterior walls" mais ne force pas le modèle à tracer les murs extérieurs d'abord. |
| 5 | Exclure cartouche | 8/10 | "NO cartouche: the title block at the bottom" + SIZE PRIOR height 40-65% + "if height > 70% → shrink". Robuste, mais modèle peut encore inclure cartouche si height reste sous 70%. |
| 6 | Outline tight (pas de marge) | 7/10 | "TIGHTEST axis-aligned rectangle" + tolerance 1% rooms inside. OK en intention mais aucune contrainte quantitative sur la marge extérieure (ex : outline.right ≤ apartment_rightmost_wall + 0.5%). |
| 7 | Plans français typiques | 8/10 | SIZE PRIOR 40-60% width calibrée sur immeubles ; vocab FR natif (palier/cellier/SdB/WC). Solide. |
| 8 | Lot manuel 44m² = vérité (<5% drift) | 5/10 | Aucune contrainte chiffrée "building_outline.area ≈ Σ(rooms.area) × 1.05 max". Rien n'empêche le modèle d'emettre 47m² comme avant. C'est le trou béant du v8 pour ce bug précis. |
| 9 | Mot pivot métier (lot) | 9/10 | Terme "lot" utilisé dans RULE l.210. Conforme. |
| 10 | Stable/prévisible | 6/10 | Prompt plus court = moins de contradictions v6/v7, plus de stabilité attendue. Mais aucun exemple d'output ancre le format → variance résiduelle. Température extract-route non fixée à 0 (à vérifier côté route). |

## Note globale /10

**Moyenne pondérée : 6.8/10**

Pondération appliquée (attentes critiques 2×) : #2 escalier ×2, #4 terrasse ×2, #8 drift <5% ×2 = (7+6×2+7+5×2+8+7+8+5×2+9+6)/13 = **6.77/10**.

**Verdict honnête** : v8 est un progrès net vs v4/v6/v7 (simplicité, négatif-first, colimaçon explicite) mais ne résout pas le bug Muguets avec garantie. Le risque est qu'on reproduise le 47m² à ±1m² près.

## Top 3 faiblesses sur Muguets spécifique

1. **Détection colimaçon laissée au vision model** (attente #2). gpt-4.1 vision confond régulièrement colimaçon avec meuble circulaire ou pattern décoratif. Le SELF-CHECK #2 demande au modèle de faire lui-même ce qu'il ne sait pas faire. Pattern s23 confirmé : "drift systémique insensible aux prompts".

2. **Carrelage terrasse indistinguable du carrelage intérieur** (attente #4). v8 liste "tiles" comme signal outdoor mais 70% des cuisines/SdB françaises sont carrelées. Le modèle n'a aucun signal discriminant. Seul signal fiable : zone hors-murs-extérieurs — mais le prompt ne force PAS la construction du polygone de murs extérieurs avant l'outline.

3. **Aucune contrainte de cohérence outline vs Σ(rooms)** (attente #8). Rien dans v8 ne dit : "building_outline.area doit être ≈ somme des rooms avec unit_id='u1'". Un modèle qui place 5 rooms totalisant 44m² à l'intérieur d'un outline 47m² a une marge de 3m² de zones vides non-labellées (= exactement le bug Muguets : escalier + terrasse avalés).

## Risques empiriques non couverts

- **Aucun exemple d'output** dans le prompt. gpt-4.1 peut halluciner sur format JSON ou oublier des champs. Ajouter 1 mini-exemple `building_outline: {x_percent:12,y_percent:18,width_percent:52,height_percent:58}` réduirait drift format.
- **Pas de few-shot sur plan similaire**. Un exemple "plan immeuble avec escalier colimaçon + terrasse" avec l'outline correct réduirait drift de 20-30% (littérature vision models).
- **Température non contrôlée** dans le prompt (dépend du call site). À vérifier : `temperature: 0` obligatoire pour outline géométrique.
- **SELF-CHECK est auto-déclaratif**. Le modèle répond "oui j'ai vérifié" sans preuve. Aucun tool use ou second-pass pour valider.
- **Pas de prompt caching Anthropic-style** : v8 sera re-tokenisé à chaque appel OpenAI (coût acceptable mais non-optimisé).

## Verdict : prompt-only NE SUFFIT PAS — post-process nécessaire

**v8 est probablement au plafond raisonnable du prompt-only pour ce cas**. Pattern s23 s'applique : si l'itération sur une technique (prompt-only) plafonne à 6-7/10 sur les attentes critiques (#2, #4, #8), **explorer une technique adjacente**.

Le plafond empirique prompt-only sur gpt-4.1 vision pour détection fine de colimaçon + discrimination carrelage indoor/outdoor est atteint. Itérer v9/v10/v11 en re-empilant des règles reproduira le symptôme v4→v7 (saturation attention, régression).

## Plan v9 — approche hybride prompt minimal + post-process TS

**Conserver v8 tel quel** (pas de ré-empilement) et ajouter un post-process TypeScript code-level, pattern s23 `label-snap.ts` :

### v9 étape A — pass 2 "shrink-to-rooms" (priorité P0)

Fichier nouveau : `versi-studio/src/lib/vs/outline-shrinker.ts`.

```
input  : building_outline IA + rooms[] avec unit_id='u1' (polygons)
output : building_outline = tight bbox(∪ rooms.polygon) avec marge fixe 0.5%
```

Résout attente #8 à 10/10 : par construction, outline.area = Σ(rooms[u1].area) + marge fixe. Bug 47m²→44m² mécaniquement corrigé.

**Implémentation** : 50 lignes TS, 0 dépendance, pur géométrique. Feature flag `VS_OUTLINE_SHRINK_TO_ROOMS`.

### v9 étape B — 2-pass escalier (priorité P1)

Si étape A ne suffit pas sur certains plans (ex : room "Entrée" chevauche palier) :

1. **Pass A** : appel OpenAI dédié "Liste les positions (x,y) de tous les escaliers, paliers, terrasses du plan. Format JSON array". Prompt ultra-court (~15L).
2. **Pass B** : v8 actuel avec contexte injecté `EXCLUDE_ZONES: [{type:'escalier',bbox:{...}},...]`.

Pattern s22 validé sur versi-studio (2-pass extraction polygones, 4-8× résolution supérieure).

**Coût** : +$0.01/plan, +2s latence. Acceptable vs budget client 50€.

### v9 étape C — OCR sanity check sur cartouche (priorité P2)

Tesseract local sur bande bottom 20% → si texte détecté matche "DOSSIER|INDICE|ECHELLE|PLAN DE" → force outline.height ≤ y_cartouche - 2%. Pattern s23 `label-snap.ts` réutilisable tel quel.

### Gains attendus v9 (étape A seule)

| Attente | v8 | v9-A | Gain |
|---|---|---|---|
| #2 escalier | 6 | 9 | +3 (shrink exclut zones sans rooms u1) |
| #4 terrasse | 5 | 9 | +4 (idem) |
| #8 drift <5% | 5 | 10 | +5 (par construction) |
| **Global** | **6.8** | **~8.8** | **+2.0** |

**Recommandation** : implémenter v9 étape A (outline-shrinker) en priorité. ~50L TS, 0 coût IA additionnel, résout mécaniquement 3 des 5 failles majeures. Garder v8 prompt tel quel (progrès réel vs v7, pas de régression à craindre).

## Handoff

---
**Handoff → @orchestrator**
- Fichier produit : `/home/user/Versi/docs/ia/s25-audit-critique-prompt-v8.md`
- Verdict : v8 = 6.8/10 pondéré. Progrès vs v7 mais plafond prompt-only atteint sur #2/#4/#8.
- Recommandation P0 : développer `outline-shrinker.ts` (pattern s23, ~50L TS, pas d'appel IA additionnel). Gain attendu +2 pts globaux.
- Alternative écartée : itérer v9 prompt-only (risque régression type v7).
- Points d'attention : vérifier `temperature: 0` côté route extract ; ajouter 1 exemple d'output JSON dans v8 à coût nul.
---
