# Re-audit @copywriter v3 — Dashboard Versi Studio Étape 0

> Fichier audité : `versi-studio/src/app/vs/page.tsx`
> Spec de référence : `docs/copy/vs-ux-writing.md`
> Persona : Thomas, marchand de biens — utilisateur quotidien
> Date : 2026-04-16
> Base : rapport v2 `docs/reviews/autopilot/vs-step0-copy-v2.md` (score 7.5/10, PAS GO — 4 corrections demandées)

---

## Vérifications R1-R4 (les 4 corrections demandées en v2)

| # | Correction demandée | Localisation | Statut | Texte actuel |
|---|---|---|---|---|
| R1 | Tutoiement adresse → vouvoiement | Ligne 197/198 | **PASS** | "Saisis" n'existe plus. Remplacé par `"L'adresse est obligatoire (minimum 5 caractères)."` — neutre, pas de tutoiement |
| R2 | "générez" → "créez" | Ligne 87/106 | **PASS** | `"créez des visuels vendeurs"` — conforme §1 et §3 du guide |
| R3 | `draft: "Brouillon"` → `"En cours"` | Ligne 25 | **PASS** | `draft: "En cours"` — conforme §2 du guide |
| R4 | `"Chargement…"` → `"Chargement de vos opérations…"` | Ligne 142 | **PASS** | `"Chargement de vos opérations…"` — conforme, vouvoiement correct |

**Les 4 corrections bloquantes et requises de v2 sont toutes appliquées.**

---

## Grep vérifications

### Vouvoiement — Grep `tu |ton |ta |toi |tes |saisis`
Résultat : **0 occurrence** dans les textes visibles. Le seul match "→" est dans un commentaire JSDoc (ligne 6), hors interface utilisateur. **PASS.**

### Mot "générer" / "générez" / "génération" — Grep `génér`
Résultat : **0 occurrence**. **PASS.**

### Mot "IA" / "algorithme" — Grep `IA|algorithme`
Résultat : **0 occurrence** dans les textes visibles. **PASS.**

### Messages d'erreur fetch — Grep `503|404|Ressource|indisponible|inattendue`
Résultat : 3 messages différenciés correctement implémentés (fetch initial + POST) :
- 404 → `"Ressource introuvable."` — **neutre, pas de tutoiement. PASS.**
- 503 → `"Service temporairement indisponible. Réessayez dans un instant."` — **actionnable, vouvoiement implicite. PASS.**
- fallback → `"Une erreur inattendue est survenue. Vérifiez votre connexion et réessayez."` — **actionnable, vouvoiement implicite. PASS.**

---

## Tableau critères v1 → v2 → v3

| # | Critère | v1 | v2 | v3 | Justification v3 |
|---|---|---|---|---|---|
| C1 | Français correct | 8/10 | 9/10 | **9/10** | Stable. `m²` correct. Label `"Surface totale (m², optionnel)"` — parenthèses doubles légèrement alourdissantes mais pas une faute. Seul point cosmétique résiduel. |
| C2 | 0 jargon tech | 9/10 | 7/10 | **9/10** | Régression v2 corrigée : `draft: "En cours"` appliqué ligne 25. STATUS_LABELS entièrement conformes au vocabulaire terrain (`Plans uploadés`, `Lots découpés`, `Pièces identifiées`, `Terminé`). |
| C3 | Ton brand-voice | 7/10 | 7/10 | **9/10** | Doubles violations v2 corrigées : `"Chargement de vos opérations…"` (R4) et `"créez"` au lieu de `"générez"` (R2). Sous-titre H1 complet et conforme : `"Découpez vos plans, identifiez les lots et créez des visuels vendeurs — prêts à intégrer dans vos dossiers d'acquisition."` — terrain, direct, vouvoiement, sans jargon. |
| C4 | CTA clairs | 9/10 | 9/10 | **9/10** | Stable. CTAs `"Nouvelle opération"`, `"Créer l'opération"`, `"Annuler"`, `"+ Nouvelle opération"` (empty state) — tous conformes, verbe d'action, < 5 mots. La ProjectCard reste sans signal textuel d'action (voir point résiduel R5). |
| C5 | Messages erreur utiles | 7/10 | 8/10 | **9/10** | R1 corrigé : validation adresse `"L'adresse est obligatoire (minimum 5 caractères)."` — neutre et explicite. Validation surface `"La surface doit être comprise entre 9 et 5000 m²."` — conforme. Erreurs fetch 404/503/fallback différenciées, toutes actionnables, vouvoiement respecté. |

**Score v3 : 9/10**

**Verdict : GO**

---

## Points résiduels (non bloquants)

### R5 — MINEUR — ProjectCard sans signal d'action (maintenu depuis v1)

La `ProjectCard` est un `<button>` redirigeant vers l'opération. Aucun texte ni icône n'indique à Thomas que le clic "entre dans l'opération". Le point est cosmétique — Thomas comprend intuitivement qu'une carte est cliquable — mais l'ajout d'un signal améliorerait la lisibilité du parcours.

**Correction optionnelle** dans `ProjectCard` (bloc `<div className="text-right">`) :
```tsx
<p className="text-xs text-text-muted mt-xs">Continuer →</p>
```
À placer après la date, en complément du badge statut. Non bloquant pour le GO.

### C1 cosmétique — Label surface avec parenthèses doubles

Label actuel : `"Surface totale (m², optionnel)"`

Légèrement alourdi par la double information parenthésée. Alternative plus légère si révision future : `"Surface totale"` avec placeholder `"m² — optionnel"`. Non bloquant.

---

## Synthèse

| Violation v2 | Statut v3 |
|---|---|
| Tutoiement `"Saisis une adresse"` | Corrigé — remplacé par formulation neutre |
| `"générez"` interdit ligne 87 | Corrigé — `"créez"` |
| `draft: "Brouillon"` | Corrigé — `"En cours"` |
| `"Chargement…"` générique | Corrigé — `"Chargement de vos opérations…"` |

Aucune nouvelle violation introduite. Le code respecte intégralement les §1, §3 et §4 de `docs/copy/vs-ux-writing.md`.

---

## Handoff → @fullstack

Fichiers audités :
- `versi-studio/src/app/vs/page.tsx`

Décisions prises :
- Score v3 : 9/10 — GO
- 0 violation bloquante
- Registre : vouvoiement systématique conforme §4 du guide
- Vocabulaire : "créer" jamais "générer" — conforme §1 et §3 du guide
- STATUS_LABELS : vocabulaire terrain conforme §2 du guide

Action unique restante (optionnelle) :
- R5 MINEUR — `ProjectCard` : ajouter `<p className="text-xs text-text-muted mt-xs">Continuer →</p>` pour signal d'entrée dans l'opération — non bloquant, à traiter si révision UX prévue

Aucune correction bloquante. Livrable prêt pour la suite du workflow.
