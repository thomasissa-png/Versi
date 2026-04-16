# Audit Copy — Étape 4 Visuels Versi Studio (US-VS-19/20/21/22) v1

**Session** : versi-s19
**Date** : 2026-04-16
**Auditeur** : @copywriter
**Périmètre** : `page.tsx` (474 L), `StyleGrid.tsx` (107 L), `VisualRoom.tsx` (662 L), `VisualResult.tsx` (343 L), `ChatAgent.tsx` (250 L) + routes API `visuals/iterate`, `visuals/status`, `visuals/validate`
**Référence canonique** : Étape 3 Pièces GO ABSOLU 9,3/10 (versi-s18) — RoomPanel.tsx

---

## 1. Synthèse exécutive

**Note globale : 7,9 / 10**
**Verdict : GO CONDITIONNEL**

Le DNA Versi Studio est respecté sur l'ensemble du périmètre : aucun emoji, aucune exclamation, aucun adjectif marketing creux. Le registre impératif neutre est cohérent avec les Étapes 2 et 3 validées. La G33 anglicismes est PASS total — les mots `upload`/`uploader` présents dans le code sont exclusivement des identifiants techniques (variables, états, commentaires), jamais exposés en surface visible.

Deux types de problèmes pénalisent la note :

1. **Règle n°13 UTF-8** : 2 occurrences de trois points ASCII (`...`) en strings JSX visibles — P0 bloquants.
2. **Microcopy spec §6** : 3 écarts de conformité par rapport aux messages spec US-VS-19/20/22 — P0/P1, corrigeables en typist.

Aucun P0 n'est de nature à bloquer l'usage fonctionnel de l'outil. Tous sont corrigeables en Batch 2 typist sans arbitrage architectural.

---

## 2. Cinq dimensions notées

### Dimension 1 — G24 : Registre "vous" impératif neutre

**Note : 8,5 / 10**

Le registre global est solide. Aucun "tu" détecté dans les strings visibles (Grep `\btu\b|\bton\b|\btes\b` : 0 résultat dans le périmètre Étape 4). Le pattern impératif neutre est tenu : "Réessayer", "Valider ce visuel", "Retour aux pièces", "Retour aux opérations", "Créer le visuel", "Déposez une photo ici".

**Finding P1 — VisualRoom.tsx:522** :
```
"Ajoutez une photo de cette pièce"
```
La spec US-VS-19 état vide exige un verbe d'action qui nomme le geste physique. `"Ajoutez"` est impératif correct mais générique — il ne nomme pas le geste drag-and-drop. La zone de dépôt en dessous dit déjà "Déposez une photo ici" (ligne 565). Les deux impératifs coexistent : l'un dit "Ajoutez", l'autre "Déposez". Incohérence interne mineure.
Correction : `"Déposez une photo de cette pièce pour démarrer la génération"` (alignement zone + spec sans `uploadez`).

**Finding P1 — page.tsx:450** :
```
"Sélectionnez une pièce pour créer son visuel"
```
Spec §6 état Défaut : `"Sélectionnez une pièce pour générer son visuel post-travaux"`. La version actuelle perd "post-travaux" — terme qui contextualise l'action et rappelle à Thomas pourquoi il est là.
Correction : `"Sélectionnez une pièce pour générer son visuel post-travaux"`

**PASS** — page.tsx:305 : `"Aucune pièce définie. Retournez à l'étape précédente pour identifier vos pièces."` — deux phrases sans tiret cadratin. Pattern des étapes précédentes utilise le tiret cadratin pour les messages composites ("La création a échoué — réessayez"). P2 cosmétique signalé.

---

### Dimension 2 — G33 : Zéro anglicisme client-facing

**Note : 10 / 10 — PASS**

Grep exhaustif sur les 5 composants + 3 routes API visuals :

- `upload` / `uploader` / `uploadé` / `uploadez` en surface visible (JSX rendu, ARIA, messages erreur) : **0 occurrence**
  - `handleUploadPhoto`, `isUploading`, `subState = "upload"` : identifiants techniques — hors périmètre G33
  - `/tmp/vs-uploads/visuals` (iterate/route.ts:198) : chemin système, identifiant technique — hors périmètre G33
  - Commentaires `"zone upload"`, `"Photo uploadée"` (VisualRoom.tsx:5-6) : commentaires code — hors périmètre G33
- `download` : 0 occurrence
- `feedback` : 0 occurrence
- `meeting` : 0 occurrence
- `forwarder` : 0 occurrence

Messages d'erreur API (périmètre élargi versi-s16) vérifiés dans les 3 routes :
- iterate/route.ts — `"L'instruction de modification est requise."`, `"Impossible de lancer la modification du visuel."` : PASS
- status/route.ts — `"Impossible de vérifier le statut du visuel."` : PASS
- validate/route.ts — `"Impossible de mettre à jour le statut du visuel."` : PASS

ARIA labels vérifiés : "Zone de dépôt de photo", "Fermer le message d'erreur", "Instructions de modification", "Envoyer", "Fermer le chat" — tous en français correct.

**Gate G33 : PASS**

---

### Dimension 3 — Règle n°13 : Caractères UTF-8

**Note : 7 / 10**

**P0 — VisualRoom.tsx:626** :
```tsx
{isGenerating ? "Création en cours..." : "Créer le visuel"}
```
Trois points ASCII (U+002E × 3) en string JSX visible. La règle n°13 impose le caractère UTF-8 direct `…` (U+2026).
Correction EXACTE : `"Création en cours…"` (ellipse UTF-8 directe dans la string)

**P0 — ChatAgent.tsx:176** :
```tsx
<span className="text-xs text-text-muted">Modification en cours...</span>
```
Même problème : trois points ASCII en surface JSX visible.
Correction EXACTE : `"Modification en cours…"`

**PASS** — VisualRoom.tsx:547 : `"Dépôt en cours…"` — ellipse UTF-8 correcte, cohérent.
**PASS** — VisualRoom.tsx:484 : `{Number(room.surface_m2)} m²` — m² UTF-8 direct.
**PASS** — Grep `\u00[A-Fa-f0-9]{2}`, `&apos;`, `&eacute;`, `&egrave;` dans les 5 TSX du périmètre Étape 4 : 0 occurrence. (Les `&apos;` détectés par Grep générique sont dans `vs/page.tsx` — page d'accueil VS, hors périmètre Étape 4.)
**PASS** — ChatAgent.tsx:129 : `« Ajoutez un tapis beige et des rideaux en lin »` — guillemets typographiques UTF-8 corrects.

---

### Dimension 4 — Anti-bullshit "pas des clowns"

**Note : 9 / 10**

Solide. Le ton Versi Studio est maintenu :

- Zéro exclamation dans les strings visibles
- Zéro emoji
- Zéro adjectif marketing ("incroyable", "magique", "révolutionnaire") — Grep : 0 résultat
- ChatAgent header : "Agent architecte" — sobre, professionnel, sans fioritures
- Badge "Validé" : concis, factuel
- Message projet terminé (page.tsx:403) : `"Projet terminé — {lots.length} lot{s} traité{s}, {validatedRooms} visuel{s} créé{s}"` — données concrètes, ton direct

**P1 — VisualResult.tsx:207-209** :
```tsx
<p className="text-sm text-text-muted">Visuel de démonstration</p>
<p className="text-xs text-text-muted mt-2xs">
  Mode simulation — configurez OPENAI_API_KEY pour la génération réelle
</p>
```
Ce message s'affiche quand la clé OpenAI n'est pas configurée. La référence à la variable d'environnement `OPENAI_API_KEY` est un détail technique visible par Thomas dans son outil de production. Fonctionnel en développement, mais insuffisant pour un outil qu'on "finalise" (Thomas valide les étapes). Le ton est informationnel mais expose un détail d'implémentation qui ne devrait pas être dans l'UI.
Correction : conserver "Visuel de démonstration" (ligne 207) + remplacer la ligne 209 par : `"La clé de génération n'est pas configurée."`

---

### Dimension 5 — Microcopy fonctionnelle

**Note : 7 / 10**

**PASS généraux :**
- État upload — zone dépôt : "Déposez une photo ici" + "JPG, PNG — jusqu'à 10 Mo" — clair, actionnable, format spec
- État generating — VisualResult.tsx:108-113 : barre de progression + "Création en cours — environ 90 secondes" — conforme spec §6
- État failed — VisualResult.tsx:136-152 : "La création a échoué — réessayez" + bouton "Réessayer" — proche spec (spec : "La génération a échoué"), tonus correct
- Boutons principaux : "Valider ce visuel", "Essayer un autre style", "Réessayer" — labels clairs
- ChatAgent placeholder : "Décrivez les modifications souhaitées..." — fonctionnel, conforme
- Compteur caractères ChatAgent : `{charsRemaining}` — informatif, sobre

**P0 — Écart message état vide (spec US-VS-19) :**
VisualRoom.tsx:522 : `"Ajoutez une photo de cette pièce"`. La spec nomme le geste exact ("déposer"), et la zone de dépôt en-dessous dit déjà "Déposez". Double registre dans le même état. Correction documentée en Dimension 1.

**P1 — VisualResult.tsx:112** — `{elapsed}s écoulées` :
Ce compteur en secondes brutes n'est pas prévu dans la spec §6. La spec indique uniquement "environ 90 secondes" comme message de progression. Le compteur brut `{elapsed}s` peut générer de l'anxiété inutile si la génération dépasse 90s. Pattern opérationnel : supprimer le compteur, garder uniquement "Génération en cours — environ 90 secondes".
Correction : supprimer `<p className="text-xs text-text-muted mt-xs">{elapsed}s écoulées</p>` (VisualResult.tsx:111-113)

**P1 — VisualResult.tsx:240,263 — "Modifier" vs spec "Itérer" :**
Spec US-VS-21 + tableau §6 état Succès : bouton CTA `"Itérer"`. Implémenté : `"Modifier"`. "Modifier" est plus accessible pour Thomas — il évite le vocabulaire IA. Mais c'est un écart de spec documentée. Signaler à Thomas pour arbitrage avant correction. Ne pas modifier sans validation fondateur.

**P1 — page.tsx:305 — Typographie message aucune pièce :**
```
"Aucune pièce définie. Retournez à l'étape précédente pour identifier vos pièces."
```
Deux phrases sans tiret cadratin. Le pattern Versi Studio pour les messages composites est `"X — y"` (tiret cadratin). Correction : `"Aucune pièce définie — retournez à l'étape précédente pour identifier vos pièces."`

**P2 — ChatAgent.tsx:83,125,196 — Redondance "Décrivez les modifications souhaitées" :**
Cette formulation apparaît trois fois dans le même composant : sous-titre header (ligne 83), empty state (ligne 125), placeholder textarea (ligne 196). Fonctionnel mais redondant. En l'état : tolérable pour un outil interne. Non bloquant.

---

## 3. Findings consolidés

| # | Sévérité | Fichier | Ligne | String source | Correction EXACTE | Gate |
|---|---|---|---|---|---|---|
| F01 | **P0** | VisualRoom.tsx | 626 | `"Création en cours..."` | `"Création en cours…"` | Règle n°13 |
| F02 | **P0** | ChatAgent.tsx | 176 | `"Modification en cours..."` | `"Modification en cours…"` | Règle n°13 |
| F03 | **P0** | VisualRoom.tsx | 522 | `"Ajoutez une photo de cette pièce"` | `"Déposez une photo de cette pièce pour démarrer la génération"` | G24 / spec US-VS-19 |
| F04 | P1 | page.tsx | 450 | `"Sélectionnez une pièce pour créer son visuel"` | `"Sélectionnez une pièce pour générer son visuel post-travaux"` | Spec §6 défaut |
| F05 | P1 | VisualResult.tsx | 111–113 | `<p ...>{elapsed}s écoulées</p>` | Supprimer ce bloc entier | Spec §6 loading |
| F06 | P1 | VisualResult.tsx | 207–209 | `"Mode simulation — configurez OPENAI_API_KEY pour la génération réelle"` | `"La clé de génération n'est pas configurée."` (ligne 209) | Anti-bullshit |
| F07 | P1 | page.tsx | 305 | `"Aucune pièce définie. Retournez…"` | `"Aucune pièce définie — retournez à l'étape précédente pour identifier vos pièces."` | Cohérence typographique |
| F08 | P1 | VisualResult.tsx | 240,263 | `"Modifier"` | **Arbitrage Thomas requis** : "Modifier" (clair) vs "Itérer" (spec US-VS-21) | Spec US-VS-21 |
| F09 | P2 | ChatAgent.tsx | 83,125,196 | `"Décrivez les modifications souhaitées"` × 3 | Différencier empty state vs placeholder — non bloquant | Redondance |
| F10 | P2 | page.tsx | 305 | format `.` vs `—` | Voir F07 | Typographie |

---

## 4. Gates ciblées

| Gate | Verdict | Détail |
|---|---|---|
| **G13** — Zéro donnée inventée | **PASS** | "environ 90 secondes" = spec §6 documentée. Aucun chiffre, prix ou métrique sans source dans le périmètre. |
| **G15** — Zéro placeholder résiduel | **PASS** | Grep `[À REMPLIR`, `[TODO`, `[NOM`, `[EXEMPLE`, `[XX` : 0 occurrence dans les 5 TSX + 3 routes API du périmètre. |
| **G24** — Registre "vous" uniforme | **PASS** | Aucun "tu" en copy visible. 2 P1 de cohérence (F03, F04) documentés. Impératif neutre maintenu sur l'ensemble. |
| **G33** — Zéro anglicisme client-facing | **PASS** | 0 occurrence liste noire en JSX rendu, ARIA, messages erreur API. `upload` = identifiants techniques exclusivement. |
| **Règle n°13** — Caractères UTF-8 | **FAIL (P0)** | 2 occurrences `...` ASCII dans strings visibles : VisualRoom.tsx:626 (F01) et ChatAgent.tsx:176 (F02). |

**Verdict global gates : 4/5 PASS, 1 FAIL P0 (Règle n°13)**

La Règle n°13 est FAIL mais les 2 corrections sont triviales (remplacement d'un caractère par caractère). Elles ne justifient pas un NO-GO — GO CONDITIONNEL avec corrections P0 en Batch 2 typist.

---

## 5. Handoff

**Note résiduelle attendue post-corrections P0+P1** : 9,0–9,2 / 10

**Recommandation Batch 2** : 3 P0 sans arbitrage + 4 P1 (dont 1 avec arbitrage Thomas) + 2 P2 optionnels. Scope concentré sur VisualRoom.tsx, VisualResult.tsx, ChatAgent.tsx, page.tsx — aucune dépendance inter-fichiers.

**Arbitrage fondateur requis avant merge** : "Modifier" → "Itérer" ou conserver "Modifier" ? (F08 — impacte VisualResult.tsx:240 et 263 uniquement)

---

**Handoff → @orchestrator**
- Fichiers produits : `docs/reviews/copy-visuals-us-vs-19-22-v1.md`
- Décisions prises : G33 PASS (identifiants techniques `upload` hors périmètre confirmé), DNA sobre maintenu, registre "vous" impératif neutre cohérent Étapes 2-3
- Corrections P0 actionnables sans arbitrage (3) : F01 VisualRoom.tsx:626, F02 ChatAgent.tsx:176, F03 VisualRoom.tsx:522
- Corrections P1 actionnables sans arbitrage (3) : F04 page.tsx:450, F05 VisualResult.tsx:111-113, F07 page.tsx:305
- Correction P1 nécessitant arbitrage Thomas (1) : F08 VisualResult.tsx:240/263 "Modifier" vs "Itérer"
- Correction P1 technique exposée (1) : F06 VisualResult.tsx:209 (message clé API)
- Points d'attention : ne pas modifier les ARIA labels ("Zone de dépôt de photo", "Instructions de modification", "Fermer le chat") — conformes. Ne pas modifier "Valider ce visuel", "Essayer un autre style", "Réessayer" — conformes spec.
