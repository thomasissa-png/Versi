# Audit Copy — Étape 4 Visuels Versi Studio (US-VS-19/20/21/22) v1

**Session** : versi-s19
**Date** : 2026-04-16
**Auditeur** : @copywriter
**Périmètre** : `page.tsx` (474 L), `StyleGrid.tsx` (107 L), `VisualRoom.tsx` (662 L), `VisualResult.tsx` (344 L), `ChatAgent.tsx` (251 L) + routes API `photos/route.ts`, `generate/route.ts`, `iterate/route.ts`, `validate/route.ts`
**Référence canonique** : Étape 3 Pièces GO ABSOLU 9,3/10 (versi-s18)

---

## 1. Synthèse exécutive

**Note globale : 7,9 / 10**
**Verdict : GO CONDITIONNEL** — 2 P0 BLOQUANTS (G24 registre + Règle n°13 UTF-8) + 7 P1 à corriger. Aucun anglicisme (G33 PASS). Anti-bullshit solide. Microcopy majoritairement fonctionnelle avec 3 écarts aux specs.

Profil similaire à l'Étape 3 Pièces v1 (7,6/10) : base propre, DNA sobre respecté, mais écarts spec et deux P0 bloquent la production. Corrigeable en Batch 2 typist.

---

## 2. Cinq dimensions notées

---

### Dimension 1 — G24 : Registre "vous" impératif neutre : 6/10

**Note : 6/10**

Le registre global est cohérent avec l'Étape 3 — impératif neutre sans sujet dominant ("Réessayer", "Valider ce visuel", "Modifier"). Mais 3 écarts P0/P1 pénalisent la note.

**P0 — VisualRoom.tsx:627 (isGenerating state)**
```
"Création en cours..."
```
Trois points de suspension codés `...` (trois points ASCII) sur un état visible. Doublon avec la string identique en VisualResult.tsx:109.
Remplacement : `"Création en cours\u2026"` — NON. Règle n°13 : caractère direct obligatoire.
Correction : `"Création en cours…"` (ellipse UTF-8 U+2026 directe)

**P0 — ChatAgent.tsx:176**
```
"Modification en cours..."
```
Même problème : trois points ASCII en surface visible dans le composant processing.
Correction : `"Modification en cours…"`

**P1 — VisualResult.tsx:112**
```
"{elapsed}s écoulées"
```
Micro-copy technique visible. Le "s" comme unité de temps est ambigu pour un non-développeur. Cohérent avec le DNA sobre mais la spec indique "environ 90 secondes" — pas de compteur brut. Le compteur en secondes écoulées est un ajout non spécifié qui peut créer de l'anxiété.
Correction : supprimer cette ligne ou reformuler : `"Génération en cours — environ 90 secondes"` (spec §6 exacte, sans compteur brut).

**P1 — VisualRoom.tsx:522 (zone upload, état vide)**
```
"Ajoutez une photo de cette pièce"
```
L'impératif "Ajoutez" avec le "z" final est correct (vous impératif), mais le pattern spec US-VS-19 état vide est : "Uploadez une photo de cette pièce pour démarrer la génération" — terme `uploadez` interdit (G33), mais le remplacement canonique est "Déposez une photo de cette pièce pour démarrer la génération". La version actuelle "Ajoutez" perd le verbe d'action précis du geste (déposer = drag-and-drop).
Correction : `"Déposez une photo de cette pièce pour démarrer la génération"`

---

### Dimension 2 — G33 : Zéro anglicisme : 10/10

**Note : 10/10 — PASS**

Grep exhaustif sur les 5 composants + 4 routes API :

- `upload` / `uploader` / `uploadé` / `uploadez` : 0 occurrence en surface visible. Note : `handleUploadPhoto` (VisualRoom.tsx:219) est un identifiant technique hors périmètre G33.
- `download` : 0 occurrence
- `feedback` : 0 occurrence
- `meeting` : 0 occurrence
- `forwarder` : 0 occurrence

Messages d'erreur API (périmètre élargi versi-s16) — tous sans anglicisme :
- "Impossible de déposer la photo." (photos/route.ts:124) — PASS
- "Impossible de lancer la création du visuel." (generate/route.ts:111) — PASS
- "Impossible de lancer la modification du visuel." (iterate/route.ts:121) — PASS
- "Impossible de mettre à jour le statut du visuel." (validate/route.ts:88) — PASS

Gate G33 : **PASS**.

---

### Dimension 3 — Règle n°13 : Caractères UTF-8 : 7/10

**Note : 7/10**

**P0 — VisualRoom.tsx:547, VisualResult.tsx:109, ChatAgent.tsx:176**
Trois occurrences de `...` (trois points ASCII) en strings visibles. La règle n°13 impose les caractères UTF-8 canoniques. L'ellipse correcte est `…` (U+2026) directement dans la string, pas `\u2026`.

| Fichier | Ligne | String actuelle | Correction |
|---|---|---|---|
| VisualRoom.tsx | 627 | `"Création en cours..."` | `"Création en cours…"` |
| VisualResult.tsx | 109 | `"Création en cours — environ 90 secondes"` | PASS (pas de `...` ici) |
| ChatAgent.tsx | 176 | `"Modification en cours..."` | `"Modification en cours…"` |

Note : VisualResult.tsx:109 est déjà correct — "Création en cours — environ 90 secondes" sans ellipse ASCII. Le P0 concerne uniquement les deux occurrences dans VisualRoom et ChatAgent.

**Vérification m²** : VisualRoom.tsx:484 — `{Number(room.surface_m2)} m²` — PASS (UTF-8 direct ✓).

**Vérification escape sequences** : aucun `\u00E9`, `&apos;`, `&eacute;` trouvé dans les strings JSX visibles — PASS.

**Vérification placeholder "Mode simulation"** : VisualResult.tsx:209 — `"Mode simulation — configurez OPENAI_API_KEY pour la génération réelle"` — string visible en état placeholder. Contient une référence technique à `OPENAI_API_KEY`. Signalé P1 (voir Dimension 5).

---

### Dimension 4 — Anti-bullshit "pas des clowns" : 9/10

**Note : 9/10**

Solide. Le ton Versi Studio est maintenu sur l'ensemble des 5 composants :

- Zéro exclamation, zéro emoji dans les strings visibles
- Zéro adjectif marketing ("incroyable", "magique", "révolutionnaire")
- Labels ChatAgent sérieux : "Agent architecte", "Décrivez les modifications souhaitées" — sobre, professionnel
- Badge "Validé" sans fioritures : concis, factuel
- Message "Projet terminé — X lots traités, X visuels créés" : format sobre, données concrètes

**P1 (seul écart)** — VisualResult.tsx:207-210 :
```tsx
<p className="text-sm text-text-muted">Visuel de démonstration</p>
<p className="text-xs text-text-muted mt-2xs">
  Mode simulation — configurez OPENAI_API_KEY pour la génération réelle
</p>
```
Cette string est visible dans l'état placeholder (sans clé OpenAI réelle). La référence à `OPENAI_API_KEY` est une variable technique exposée à l'utilisateur. Thomas voit ce message sur son outil. Acceptable en dev mais insuffisant pour la production — doit être remplacé par un message opérationnel.
Correction : `"Visuel de démonstration — mode test"` (ligne 207) + supprimer la ligne 209 avec la référence à `OPENAI_API_KEY`, ou la remplacer par : `"La clé de génération n'est pas configurée."`.

---

### Dimension 5 — Microcopy fonctionnelle : 7/10

**Note : 7/10**

**PASS généraux :**
- État upload : "Déposez une photo ici" + "JPG, PNG — jusqu'à 10 Mo" — clair, actionnable
- État generating : barre de progression + "Création en cours — environ 90 secondes" — conforme spec §6
- État failed : "La création a échoué — réessayez" + bouton "Réessayer" — conforme spec §6 (message proche mais pas identique à la spec : "La génération a échoué — réessayez")
- Boutons actions : "Valider ce visuel", "Modifier", "Essayer un autre style" — labels clairs
- ChatAgent : placeholder "Décrivez les modifications souhaitées…" conforme, compteur de caractères présent

**P0 — Écart message état vide (spec US-VS-19) :**
Spec : `"Uploadez une photo de cette pièce pour démarrer la génération"` → G33 interdit `uploadez` → la version canonique est `"Déposez une photo de cette pièce pour démarrer la génération"`. Actuel : `"Ajoutez une photo de cette pièce"` — perd l'indication du geste (déposer) et l'appel à l'action "pour démarrer la génération". P0 conformité spec.

**P1 — Bouton "Modifier" vs spec "Itérer" :**
Spec US-VS-21 et tableau §6 : bouton `"Itérer"`. Implémenté : `"Modifier"` (VisualResult.tsx:240 et 263). "Modifier" est plus clair pour Thomas (il ne sait peut-être pas ce qu'est "itérer" dans ce contexte). Cependant c'est un écart de spec documentée. Signaler au fondateur pour arbitrage — si "Modifier" est validé, mettre à jour la spec. Pour l'audit : P1 (écart spec, mais justifiable UX).

**P1 — Message état vide RoomGrid (sélection pièce) :**
page.tsx:450 : `"Sélectionnez une pièce pour créer son visuel"`. Spec §6 état "Défaut" : `"Sélectionnez une pièce pour générer son visuel post-travaux"`. Actuel perd "post-travaux" qui contextualise l'action pour Thomas. Correction : `"Sélectionnez une pièce pour générer son visuel post-travaux"`.

**P1 — Message état "Aucune pièce" :**
page.tsx:305 : `"Aucune pièce définie. Retournez à l'étape précédente pour identifier vos pièces."`. Deux phrases sans tiret — cohérence typographique avec le reste (pattern tiret cadratin). Correction : `"Aucune pièce définie — retournez à l'étape précédente pour identifier vos pièces."`.

**P1 — Libellé bouton génération (isGenerating) :**
VisualRoom.tsx:626 : `{isGenerating ? "Création en cours..." : "Créer le visuel"}`. L'état chargé devrait être `"Création en cours…"` (ellipse UTF-8 — déjà identifié en Dimension 3). Le libellé `"Créer le visuel"` est correct.

**P2 — Libellé section historique :**
VisualResult.tsx:286 : `"Historique"` seul, en uppercase tracking. Acceptable mais légèrement pauvre. Pattern canonique Étape 3 utilise des libellés de section explicites. P2 — non bloquant.

---

## 3. Findings consolidés

| # | Sévérité | Fichier | Ligne | String source | Correction EXACTE | Gate |
|---|---|---|---|---|---|---|
| F01 | P0 | VisualRoom.tsx | 547 | `"Dépôt en cours…"` | PASS — déjà `…` | — |
| F02 | P0 | VisualRoom.tsx | 627 | `"Création en cours..."` | `"Création en cours…"` | Règle n°13 |
| F03 | P0 | ChatAgent.tsx | 176 | `"Modification en cours..."` | `"Modification en cours…"` | Règle n°13 |
| F04 | P0 | VisualRoom.tsx | 522 | `"Ajoutez une photo de cette pièce"` | `"Déposez une photo de cette pièce pour démarrer la génération"` | G24 / spec |
| F05 | P1 | VisualResult.tsx | 112 | `"{elapsed}s écoulées"` | Supprimer cette ligne (non prévu spec §6) | Spec |
| F06 | P1 | VisualResult.tsx | 207–210 | `"Mode simulation — configurez OPENAI_API_KEY pour la génération réelle"` | `"La clé de génération n'est pas configurée."` | Anti-bullshit |
| F07 | P1 | page.tsx | 450 | `"Sélectionnez une pièce pour créer son visuel"` | `"Sélectionnez une pièce pour générer son visuel post-travaux"` | Spec §6 |
| F08 | P1 | page.tsx | 305 | `"Aucune pièce définie. Retournez à l'étape précédente pour identifier vos pièces."` | `"Aucune pièce définie — retournez à l'étape précédente pour identifier vos pièces."` | Cohérence typographique |
| F09 | P1 | VisualResult.tsx | 240,263 | `"Modifier"` | Arbitrage fondateur : "Modifier" (plus clair) vs "Itérer" (spec) — signaler avant correction | Spec US-VS-21 |
| F10 | P2 | VisualResult.tsx | 286 | `"Historique"` | Acceptable — non bloquant | — |

**Note sur F01** : VisualRoom.tsx:547 affiche `"Dépôt en cours…"` avec l'ellipse UTF-8 correcte — PASS.

---

## 4. Gates ciblées

| Gate | Verdict | Détail |
|---|---|---|
| **G13** — Zéro donnée inventée | PASS | Aucun chiffre, prix ou métrique sans fondement. "environ 90 secondes" = spec documentée §6. |
| **G15** — Zéro placeholder résiduel | PASS | Aucun `[À REMPLIR]`, `[TODO]`, `[NOM]`, `[EXEMPLE]` trouvé en surface visible. |
| **G24** — Registre "vous" uniforme | **FAIL (P0)** | 2 occurrences `...` ASCII (F02, F03) — écart règle n°13 classé ici aussi comme rupture de cohérence typographique. 1 verbe d'action sous-optimal (F04 "Ajoutez" → "Déposez"). |
| **G33** — Zéro anglicisme client-facing | PASS | 0 occurrence liste noire sur JSX + ARIA + messages erreur API. |
| **Règle n°13** — Caractères UTF-8 | **FAIL (P0)** | 2 occurrences `...` ASCII en strings visibles : VisualRoom.tsx:627, ChatAgent.tsx:176. |

---

## 5. Handoff

**Handoff → @fullstack (Batch 2 typist)**

- Fichiers produits : `docs/reviews/copy-visuals-us-vs-19-22-v1.md`

- Corrections P0 à appliquer en priorité (bloquantes, 4 corrections) :
  - `VisualRoom.tsx:627` — `"Création en cours..."` → `"Création en cours…"` (ellipse UTF-8 directe)
  - `ChatAgent.tsx:176` — `"Modification en cours..."` → `"Modification en cours…"`
  - `VisualRoom.tsx:522` — `"Ajoutez une photo de cette pièce"` → `"Déposez une photo de cette pièce pour démarrer la génération"`
  - `VisualResult.tsx:207–210` — remplacer `"Mode simulation — configurez OPENAI_API_KEY pour la génération réelle"` par `"La clé de génération n'est pas configurée."`

- Corrections P1 à appliquer (5 corrections) :
  - `VisualResult.tsx:112` — supprimer `<p className="text-xs text-text-muted mt-xs">{elapsed}s écoulées</p>`
  - `page.tsx:450` — `"Sélectionnez une pièce pour créer son visuel"` → `"Sélectionnez une pièce pour générer son visuel post-travaux"`
  - `page.tsx:305` — remplacer `. Retournez` par ` — retournez` (tiret cadratin, minuscule)
  - `VisualResult.tsx:240 et 263` — arbitrage fondateur requis sur "Modifier" vs "Itérer" AVANT correction (signaler à Thomas)

- Décisions prises :
  - Registre "vous" impératif neutre : PASS sur l'ensemble — seuls écarts typographiques (`...` → `…`) et un verbe d'action
  - G33 anglicismes : PASS total — aucune correction nécessaire sur ce point
  - DNA sobre anti-bullshit : maintenu — aucune dérive marketing

- Points d'attention :
  - Ne pas modifier les libellés ARIA ("Zone de dépôt de photo", "Instructions de modification", "Fermer le chat") — conformes
  - Ne pas modifier les noms des boutons principaux ("Valider ce visuel", "Réessayer", "Essayer un autre style") — conformes spec
  - Le bouton "Modifier" vs "Itérer" est un arbitrage fondateur — ne pas choisir sans validation Thomas

- Note résiduelle attendue post-corrections : **9,0–9,2/10** (profil identique Étape 3 Pièces : 7,6 v1 → 9,3 post-Batch 2.5 @moi)
