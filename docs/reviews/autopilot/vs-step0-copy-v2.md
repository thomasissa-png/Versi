# Re-audit @copywriter v2 — Dashboard Versi Studio Étape 0

> Fichier audité : `versi-studio/src/app/vs/page.tsx`
> Spec de référence : `docs/copy/vs-ux-writing.md`
> Persona : Thomas, marchand de biens — utilisateur quotidien
> Date : 2026-04-16
> Base : rapport v1 `docs/reviews/autopilot/vs-step0-copy.md` (score 8/10, 6 corrections appliquées depuis)

---

## Tableau comparatif v1 → v2

| # | Critère | v1 | v2 | Justification |
|---|---|---|---|---|
| C1 | Français correct | 8/10 | 9/10 | `m²` bien présent ligne 315. Résiduel : "Surface invalide (0 à 100 000 m²)." ligne 209 — formulation technique correcte. Seul bémol : le label de surface utilise des parenthèses doubles `(m², optionnel)` qui alourdissent mais ne sont pas une faute. |
| C2 | 0 jargon tech | 9/10 | 7/10 | **Régression** : `draft: "Brouillon"` (ligne 24) n'a pas été corrigé — correction C2 de v1 non appliquée. "Brouillon" reste un terme de workflow éditorial étranger au vocabulaire terrain d'un marchand de biens. |
| C3 | Ton brand-voice | 7/10 | 7/10 | **Stagnation + nouvelle violation** : (1) `"Chargement…"` ligne 118 — correction v1 non appliquée, resté générique. (2) Nouvelle violation introduite par la correction 4 : `"générez des visuels vendeurs"` ligne 87 — le mot "générez" est explicitement interdit par `vs-ux-writing.md` §1 et §3. La correction censée améliorer le H1 a introduit une violation de la règle fondamentale. |
| C4 | CTA clairs | 9/10 | 9/10 | Stable. "Nouvelle opération", "Créer l'opération", "Annuler" restent bons. Point non résolu de v1 : ProjectCard toujours sans micro-texte d'action — le clic ouvre l'opération sans signal visuel ni textuel. Pas de dégradation. |
| C5 | Messages erreur utiles | 7/10 | 8/10 | Message R1 résolu : `"La création a échoué. Vérifiez votre connexion et réessayez."` ligne 235 — vouvoiement et actionnable. Résiduel bloquant : `"Saisis une adresse complète pour continuer."` ligne 197 — **tutoiement**, violation directe de la règle §4 du guide (vouvoiement systématique, sans exception). |

**Score v2 : 7.5/10**

**Verdict : PAS GO**

Deux violations bloquantes introduites ou maintenues : (1) tutoiement actif sur le message de validation adresse, (2) "générez" interdit dans le sous-titre H1. Une correction non appliquée : `draft: "Brouillon"`. Une correction non appliquée : `"Chargement…"`.

---

## Vérifications textuelles

- **Vouvoiement systématique (Grep tu/ton/ta)** : ECHEC — `"Saisis"` ligne 197 est un impératif tutoiement direct. Violation §4 du guide.
- **"Générer" vs "Créer"** : ECHEC — `"générez des visuels vendeurs"` ligne 87. Mot interdit introduit par la correction 4.
- **"IA" mentionnée** : PASS — aucune occurrence.
- **Vocabulaire métier (opération, lots, plans)** : PASS — présent dans le sous-titre H1, labels et statuts.

---

## Points résiduels — Corrections exactes

### R1 — BLOQUANT — Tutoiement ligne 197

**Texte actuel** (ligne 197) :
```
"Saisis une adresse complète pour continuer."
```

**Correction exacte** :
```
"Saisissez une adresse complète pour continuer."
```

Règle violée : `vs-ux-writing.md` §4 — "Vouvoiement systématique, sans exception."

---

### R2 — BLOQUANT — "Générez" interdit ligne 87

**Texte actuel** (ligne 87) :
```
"Découpez vos plans, identifiez les lots et générez des visuels vendeurs — prêts à intégrer dans vos dossiers d'acquisition."
```

**Correction exacte** :
```
"Découpez vos plans, identifiez les lots et créez des visuels vendeurs — prêts à intégrer dans vos dossiers d'acquisition."
```

Règle violée : `vs-ux-writing.md` §1 et §3 — "Il ne 'génère' rien" / "Le mot 'IA', 'algorithme', 'génération' n'apparaissent jamais."

---

### R3 — REQUIS — `draft: "Brouillon"` non corrigé (ligne 24)

**Texte actuel** (ligne 24) :
```typescript
draft: "Brouillon",
```

**Correction exacte** (recommandée en v1, non appliquée) :
```typescript
draft: "En cours",
```

Justification : "Brouillon" est un terme rédactionnel, pas un statut d'opération immobilière. Thomas dirait "En cours" ou "À traiter". Voir aussi `vs-ux-writing.md` §2 — colonne état : "En cours / Dossier prêt".

---

### R4 — REQUIS — `"Chargement…"` générique non corrigé (ligne 118)

**Texte actuel** (ligne 118) :
```
"Chargement…"
```

**Correction exacte** (recommandée en v1, non appliquée) :
```
"Chargement de vos opérations…"
```

Note : utiliser "vos" (vouvoiement) et non "tes" comme proposé en v1 (qui était en tutoiement — faute dans le rapport v1 lui-même).

---

### R5 — MINEUR — ProjectCard sans signal d'action (déjà signalé en v1)

La carte projet est un `<button>` qui redirige vers l'opération, sans aucun texte ni icône indiquant que le clic ouvre quelque chose. Thomas ne sait pas qu'il "entre dans l'opération". Ce point reste non résolu.

**Correction possible** : ajouter dans la `ProjectCard`, dans le coin inférieur droit ou en bas du bloc :
```tsx
<span className="text-xs text-text-muted">Continuer →</span>
```

---

## Récapitulatif des 4 corrections non appliquées depuis v1

| # | Ligne | Correction v1 | Statut |
|---|---|---|---|
| C2 | 24 | `draft: "Brouillon"` → `"En cours"` | Non appliqué |
| C3b | 118 | `"Chargement…"` → `"Chargement de tes opérations…"` | Non appliqué (+ le "tes" de v1 était lui-même une faute de vouvoiement) |
| C5b | 197 | `"L'adresse doit contenir…"` → `"Saisis une adresse…"` | Appliqué mais avec tutoiement — correction incomplète |
| C4 | ProjectCard | Micro-texte "Continuer →" | Non appliqué |

---

## Handoff → @fullstack

Fichiers audités :
- `versi-studio/src/app/vs/page.tsx`

Décisions prises :
- Score v2 : 7.5/10 — régression par rapport à l'objectif 9/10
- 2 violations bloquantes à corriger avant toute validation copy
- Registre : vouvoiement strict (règle absolue `vs-ux-writing.md` §4)
- Vocabulaire : "créer" jamais "générer" (règle absolue `vs-ux-writing.md` §1 et §3)

Corrections classées par priorité (4 corrections, toutes dans `versi-studio/src/app/vs/page.tsx`) :

1. **BLOQUANT** — Ligne 197 : `"Saisis une adresse complète pour continuer."` → `"Saisissez une adresse complète pour continuer."`
2. **BLOQUANT** — Ligne 87 : `"générez des visuels vendeurs"` → `"créez des visuels vendeurs"`
3. **REQUIS** — Ligne 24 : `draft: "Brouillon"` → `draft: "En cours"`
4. **REQUIS** — Ligne 118 : `"Chargement…"` → `"Chargement de vos opérations…"`
5. **MINEUR** — ProjectCard : ajouter `"Continuer →"` comme signal d'action
