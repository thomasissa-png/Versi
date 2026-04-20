# Audit Copy — Étape 4 Visuels Versi Studio (US-VS-19/20/21/22) v2

**Session** : versi-s19
**Date** : 2026-04-16
**Auditeur** : @copywriter
**Périmètre** : `visuals/page.tsx`, `VisualRoom.tsx`, `VisualResult.tsx`, `ChatAgent.tsx`
**Référence** : audit v1 `docs/reviews/copy-visuals-us-vs-19-22-v1.md` (7,9/10 GO CONDITIONNEL)

---

## 1. Synthèse v2

**Note globale : 9,2 / 10**
**Verdict : GO ABSOLU**
**Delta vs v1 : +1,3 point**

Les 3 P0 et 4 P1 actionnables sans arbitrage sont tous corrigés. Règle n°13 PASS. G24 renforcé. Le seul résiduel ouvert est F08 ("Modifier" vs "Itérer") — en attente d'arbitrage Thomas, non bloquant pour le verdict GO.

---

## 2. Tableau de vérification F01-F10

| # | Sévérité v1 | Statut v2 | Ligne actuelle | Note |
|---|---|---|---|---|
| F01 | P0 | **CORRIGÉ** | VisualRoom.tsx:634 | `"Création en cours…"` — ellipse UTF-8 U+2026 confirmée |
| F02 | P0 | **CORRIGÉ** | ChatAgent.tsx:176 | `"Modification en cours…"` — ellipse UTF-8 U+2026 confirmée |
| F03 | P0 | **CORRIGÉ** | VisualRoom.tsx:529 | `"Déposez une photo de cette pièce pour démarrer la génération"` — verbe aligné, cohérence zone dépôt restaurée |
| F04 | P1 | **CORRIGÉ** | visuals/page.tsx:457 | `"Sélectionnez une pièce pour générer son visuel post-travaux"` — "post-travaux" présent, spec §6 défaut conforme |
| F05 | P1 | **CORRIGÉ** | VisualResult.tsx:108–113 | Bloc `{elapsed}s écoulées` absent — supprimé, seul "Création en cours — environ 90 secondes" affiché |
| F06 | P1 | **CORRIGÉ** | VisualResult.tsx:207–209 | `"La clé de génération n'est pas configurée."` — référence OPENAI_API_KEY supprimée de l'UI |
| F07 | P1 | **CORRIGÉ** | visuals/page.tsx:305 | `"Aucune pièce définie — retournez à l'étape précédente pour identifier vos pièces."` — tiret cadratin appliqué, pattern Versi Studio conforme |
| F08 | P1 | **EN ATTENTE arbitrage Thomas** | VisualResult.tsx:241,266 | `"Modifier"` maintenu (×2, états isGenerated + isValidated). Non bloquant v2. |
| F09 | P2 | **OUVERT — non bloquant** | ChatAgent.tsx:83,125,196 | Triple occurrence "Décrivez les modifications souhaitées" conservée. Tolérable outil interne. |
| F10 | P2 | **CORRIGÉ** (via F07) | visuals/page.tsx:305 | Résolu par correction F07 |

**Bilan : 8 corrigés / 1 en attente arbitrage / 1 ouvert non bloquant**

---

## 3. Résiduels v2

### R01 — EN ATTENTE — P1 — VisualResult.tsx:241,266 — "Modifier" vs "Itérer"

Deux occurrences de `"Modifier"` subsistent (état isGenerated ligne 241, état isValidated ligne 266). La spec US-VS-21 préconise `"Itérer"`.

"Modifier" est plus accessible pour Thomas — il évite le vocabulaire IA-générative. Pas un blocant.

**Arbitrage Thomas requis** : conserver "Modifier" (clarté opérationnelle) ou aligner sur "Itérer" (spec) ?
Correction si Thomas choisit spec : remplacer `Modifier` par `Itérer` aux deux lignes.

### R02 — P2 — ChatAgent.tsx:83,125,196 — Redondance triple

Tolérable en outil interne. Hors scope Batch 4.

---

## 4. Cinq dimensions re-notées

| Dimension | Note v1 | Note v2 | Delta | Statut |
|---|---|---|---|---|
| G24 Registre "vous" impératif | 8,5/10 | 9,5/10 | +1,0 | F03 et F04 corrigés — cohérence totale impératif neutre + spec §6 |
| G33 Zéro anglicisme | 10/10 | 10/10 | = | PASS maintenu, aucun nouveau cas |
| Règle n°13 Caractères UTF-8 | 7/10 | 10/10 | +3,0 | F01 + F02 corrigés — 0 occurrence `...` ASCII en JSX visible |
| Anti-bullshit "pas des clowns" | 9/10 | 9,5/10 | +0,5 | F06 corrigé — OPENAI_API_KEY retiré de l'UI |
| Microcopy fonctionnelle | 7/10 | 8,0/10 | +1,0 | F05 supprimé (compteur anxiogène), F07 corrigé. R01 maintenu sans pénalité (arbitrage en cours) |

**Note globale recalculée : (9,5 + 10 + 10 + 9,5 + 8,0) / 5 = 9,4 → arrondi conservateur 9,2/10**

---

## 5. Gates

| Gate | Verdict v1 | Verdict v2 | Détail |
|---|---|---|---|
| **G13** — Zéro donnée inventée | PASS | **PASS** | Aucun chiffre sans source. "environ 90 secondes" = spec documentée. |
| **G15** — Zéro placeholder résiduel | PASS | **PASS** | Aucune occurrence `[TODO]`, `[À REMPLIR]`, `[XX]` dans le périmètre. |
| **G24** — Registre "vous" uniforme | PASS | **PASS** | Impératif neutre maintenu sur l'ensemble. F03/F04 corrigés renforcent la cohérence interne. |
| **G33** — Zéro anglicisme client-facing | PASS | **PASS** | 0 occurrence liste noire en JSX rendu, ARIA, messages erreur. |
| **Règle n°13** — Caractères UTF-8 | **FAIL (P0)** | **PASS** | F01 + F02 corrigés. 0 occurrence `...` ASCII visible restante. |

**Verdict gates : 5/5 PASS**

---

## 6. Handoff

**Recommandation** : GO ABSOLU. Les corrections P0+P1 actionnables sont toutes appliquées. Les gates passent à 5/5. Un seul point ouvert (R01 "Modifier" vs "Itérer") nécessite un arbitrage Thomas avant d'être considéré Batch 4 ou classé définitif.

**Batch 4 scope suggéré** : uniquement R01 si Thomas choisit "Itérer" (2 lignes, VisualResult.tsx:241 et 266). R02 (redondance triple ChatAgent) classé hors scope — outil interne, impact nul.

---

**Handoff → @moi**
- Fichiers produits : `docs/reviews/copy-visuals-us-vs-19-22-v2.md`
- Décisions confirmées : Règle n°13 PASS (ellipses UTF-8 appliquées), G24 renforcé (verbe "Déposer" unifié), G33 PASS maintenu, OPENAI_API_KEY retiré de l'UI, "post-travaux" restauré en state défaut
- Point d'arbitrage ouvert : F08 / R01 — "Modifier" (ligne 241 et 266 VisualResult.tsx) → Thomas décide : conserver ou aligner sur spec "Itérer" ?
- Aucune correction Batch 5 requise hors arbitrage R01
