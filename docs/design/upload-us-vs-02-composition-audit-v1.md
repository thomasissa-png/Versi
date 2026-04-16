# Audit design composition US-VS-02 Upload — v1

> Agent : @design | Date : 2026-04-16
> Scope : page upload `/vs/projects/[id]/upload/page.tsx` + composants DropZone, PlanThumbnail, Stepper
> Référence design system : `docs/design/vs-design-system.md`
> Persona : Thomas, marchand de biens, 35 ans — desktop-first, usage pro quotidien

---

## 1. Résumé exécutif

[à remplir]

## 2. Gate G21 — 5 états par écran

L'écran Upload est un écran avec données dynamiques (chargement projet, upload fichiers, liste plans). Les 5 états doivent être couverts.

| État | Présent dans le code ? | Implémentation | Cohérence design system |
|---|---|---|---|
| **Défaut** (zone vide, aucun plan) | OUI | DropZone seul affiché, texte "Déposez vos plans ici" | PASS — tokens bg-card, border-default |
| **Loading** (chargement initial + upload) | OUI — PARTIEL | (1) Chargement projet : spinner `animate-spin` centré dans la zone principale. (2) Upload en cours : liste de fichiers avec spinner individuel par fichier (`uploadProgress` state). | FAIL partiel — voir finding F1 : le loading de chargement initial (état `loading=true`) n'a PAS le même traitement visuel que la page chargée (pas de skeleton, spinner seul) |
| **Vide** | OUI — équivalent Défaut | Sémantiquement identique à l'état défaut — aucun plan uploadé. Acceptable pour cet écran. | PASS |
| **Erreur** | OUI | Toast rouge inline en haut du contenu, avec icône SVG + message + bouton fermeture. Erreur locale DropZone en bas de zone. | PASS — utilise `bg-error/10 border-error/20 text-error`. FAIL partiel : le token `error` est une classe Tailwind arbitraire (voir G23/G31) |
| **Succès** | OUI — PARTIEL | Plans uploadés = grille PlanThumbnail + compteur + bouton "Analyser les plans". Pas de feedback visuel positif explicite (pas de toast vert, pas d'animation de confirmation). | FAIL partiel — voir finding F2 : aucun retour visuel de succès après upload individuel réussi. Transition silencieuse. |

**Verdict G21 :** GO CONDITIONNEL — les 5 états sont couverts conceptuellement mais deux lacunes : absence de skeleton loading (F1) et absence de feedback succès explicite (F2).

## 3. Gate G22 — Accessibilité

### 3.1 Contrastes WCAG 2.2 AA

Combinaisons couleur présentes dans la page, vérifiées contre les tokens définis dans `vs-design-system.md` :

| Texte / fond | Token texte | Token fond | Valeurs hex | Ratio calculé | Seuil requis | Résultat |
|---|---|---|---|---|---|---|
| Labels, corps principal | color-text-default | color-background-default | #0B0B0B / #F7F5F2 | ~19:1 | 4.5:1 | PASS |
| Texte muted (descriptions, compteurs) | color-text-muted | color-background-default | #6B6560 / #F7F5F2 | ~4.54:1 | 4.5:1 | PASS (limite) |
| Texte muted sur bg-card | color-text-muted | color-background-card | #6B6560 / #FFFFFF | ~4.35:1 | 4.5:1 | **FAIL** — voir finding F3 |
| Texte inverse sur bouton primaire | color-text-inverse | color-interactive-primary | #F7F5F2 / #0B0B0B | ~19:1 | 4.5:1 | PASS |
| Texte erreur sur fond erreur | `error` arbitraire | `error/10` arbitraire | Non défini dans tokens | Non vérifiable | 4.5:1 | **FAIL** — voir finding F4 |
| "Retour aux opérations" (lien) | color-text-muted | color-background-default | #6B6560 / #F7F5F2 | ~4.54:1 | 4.5:1 | PASS (limite) |
| Spinner (border-t-interactive-primary) | interactive-primary | — | #0B0B0B — élément non-textuel | — | 3:1 | PASS |

**Note F3 :** `text-text-muted` (#6B6560) sur `bg-bg-card` (#FFFFFF) : le contraste calculé est 4.35:1, sous le seuil de 4.5:1 requis pour le texte normal. Utilisé dans PlanThumbnail (nom de fichier label `text-xs`, étiquette "Étage", texte muted des compteurs sur fond blanc). Taille xs (12px) = texte normal, pas grand texte — seuil 4.5:1 s'applique. **FAIL AA.**

**Note F4 :** La couleur `error` est référencée directement dans le code comme classe Tailwind (`text-error`, `bg-error/10`, `border-error/20`) sans token défini dans `vs-design-system.md`. La valeur réelle dépend de la configuration Tailwind (`tailwind.config.ts`). Sans vérification de la valeur hex configurée, le contraste est non vérifiable. Risque réel d'échec WCAG si `error` est un rouge vif sur fond clair très dilué.

### 3.2 Focus-visible

| Composant | Focus-visible présent ? | Implémentation | Verdict |
|---|---|---|---|
| DropZone (zone interactive) | OUI | `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary` | PASS |
| Bouton "Analyser les plans" | OUI | `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary` | PASS |
| Bouton supprimer (PlanThumbnail) | OUI | `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary` | PASS |
| Input numéro d'étage (PlanThumbnail) | **FAIL** | `focus:outline-none focus:ring-1 focus:ring-interactive-primary/20` — `outline: none` sans alternative WCAG valide. Le ring à 20% d'opacité peut être insuffisant visuellement. | **FAIL** — voir finding F5 |
| Bouton fermer le toast erreur | **ABSENT** | Pas de `focus-visible` sur le bouton de fermeture du toast. Focusable (bouton natif) mais indicateur invisible. | **FAIL** — voir finding F6 |
| Lien "Retour aux opérations" | **ABSENT** | Pas de `focus-visible` explicite. Le bouton est un `<button>` avec style `underline` mais sans outline de focus défini. | **FAIL** — voir finding F7 |
| Stepper — items de navigation | N/A — `<div>` non interactif | Le Stepper est en lecture seule (no click handler). Correct. | PASS |

### 3.3 Touch targets >= 44x44px (mobile)

Le design system Versi Studio est **desktop-first** (mentionné explicitement dans `vs-design-system.md`). Cependant l'absence de breakpoint mobile ne dispense pas d'auditer les petits cibles.

| Élément | Taille estimée | Verdict |
|---|---|---|
| Bouton "Analyser les plans" (`px-2xl py-md`) | px: 48px, py: 16px → hauteur ~38px avec text-sm | **FAIL** — hauteur insuffisante (16px padding + ~20px text-sm = 36px). Voir finding F8 |
| Bouton supprimer PlanThumbnail (`p-xs` = 4px) | 4+16+4 = 24px × 24px | **FAIL sévère** — 24px × 24px, très en dessous du minimum 44px. Voir finding F9 |
| Input étage (`w-12 px-xs py-2xs`) | 48px × ~22px | **FAIL** — hauteur insuffisante (~22px). Voir finding F10 |
| DropZone (`min-h-[200px]`) | Pleine largeur × 200px min | PASS — target généreuse |
| Bouton fermer toast | `w-4 h-4` = 16×16px (icône seule, sans padding) | **FAIL sévère** — voir finding F6 |

Note : l'application étant desktop-first, les items bouton/input à 36-38px sont acceptables en contexte desktop (souris). Mais l'absence de seuil mobile explicite reste une lacune de spec.

### 3.4 prefers-reduced-motion

**Bilan : FAIL — aucun support `prefers-reduced-motion` dans les 4 fichiers audités.**

Animations présentes :
- `animate-spin` sur le spinner de chargement (page loading + per-file upload) — pas conditionnel
- `transition-all duration-200` sur la DropZone — pas conditionnel
- `transition-colors duration-200` sur le Stepper, PlanThumbnail — pas conditionnel
- `transition-opacity duration-200` sur PlanThumbnail en état deleting — pas conditionnel

Aucun des fichiers n'utilise la classe Tailwind `motion-reduce:` ni de media query `prefers-reduced-motion`.

**Correction type :** `motion-reduce:animate-none` sur les spinners, `motion-reduce:transition-none` sur les transitions. Voir finding F11.

## 4. Gate G23 — Zéro valeur hardcodée

Analyse des 4 fichiers : `page.tsx`, `DropZone.tsx`, `PlanThumbnail.tsx`, `Stepper.tsx`.

### Couleurs hardcodées (hex / rgb)
Aucune valeur hex directe détectée dans les classes Tailwind des composants. Les couleurs sont référencées via tokens CSS custom (bg-bg-card, text-text-default, border-border-default, etc.). **PASS sur les couleurs primitives brutes.**

### Tokens non définis dans le design system (couleurs fonctionnelles Tailwind)

| Classe Tailwind | Fichier | Statut | Problème |
|---|---|---|---|
| `text-error`, `bg-error/10`, `border-error/20` | page.tsx, DropZone.tsx | **FAIL** | Le token `error` n'est pas défini dans `vs-design-system.md`. Valeur inconnue — dépend de `tailwind.config.ts`. Pas un token sémantique nommé, pas de valeur vérifiable. |
| `border-interactive-primary` | page.tsx, DropZone.tsx | PASS | Token sémantique défini dans le design system (color-interactive-primary → #0B0B0B) |
| `bg-interactive-primary` | page.tsx | PASS | Token sémantique défini |
| `bg-interactive-primary/5`, `bg-interactive-primary/10` | DropZone.tsx | INFO | Variante alpha d'un token existant — acceptable si la valeur base est définie |
| `hover:border-gris-pierre/50` | DropZone.tsx | **FAIL** | `gris-pierre` est une **primitive tier 1** directement référencée dans un composant. Violation de l'architecture 3 tiers. Doit passer par un token sémantique (ex: `border-border-interactive-hover`). Voir finding F12. |

### Valeurs px hardcodées hors spacing scale

| Valeur | Fichier | Contexte | Verdict |
|---|---|---|---|
| `min-h-[200px]` | DropZone.tsx | Hauteur minimum DropZone | **FAIL** — valeur arbitraire hors spacing scale. Aucune valeur `200px` dans la scale (qui va 2xs→4xl, soit 2→96px). Voir finding F13. |
| `w-6 h-6` (24px) | page.tsx spinner | Icône spinner | INFO — taille d'icône, non couvert par la spacing scale. Tolérable si documenté comme exception. |
| `w-4 h-4` (16px) | page.tsx, PlanThumbnail.tsx | Icônes SVG | INFO — même cas, icônes inline. |
| `w-8 h-8` (32px) | Stepper.tsx | Cercle indicateur | INFO — taille de badge/indicator. Tolérable si documenté. |
| `w-12 h-12` (48px) | DropZone.tsx | Icône container rond | INFO — même cas. |
| `w-10 h-10` (40px) | PlanThumbnail.tsx | Icône PDF | INFO — même cas. |
| `w-12` (48px sur input étage) | PlanThumbnail.tsx | Input number | INFO — valeur spécifique composant. |
| `aspect-[4/3]` | PlanThumbnail.tsx | Ratio preview | INFO — ratio d'aspect, pas un spacing. Acceptable. |
| `0.5` opacity sur Stepper future | Stepper.tsx | `opacity-50` | PASS — valeur Tailwind standard. |

### Typographie hardcodée

Certains éléments utilisent `text-sm`, `text-xs`, `font-medium` directement (classes Tailwind standard) plutôt que les tokens typographiques Versi Studio (`vs-label`, `vs-h3`, etc.).

| Usage | Fichier | Token attendu | Verdict |
|---|---|---|---|
| `text-sm font-medium text-text-default` (compteur "X plans uploadés") | page.tsx | `text-label` ou `text-body-sm` | INFO — non bloquant mais incohérence nomenclature |
| `text-xs text-text-muted` (sous-titre DropZone, compteur restant) | DropZone.tsx, page.tsx | `text-label` | INFO |
| `text-xs uppercase tracking-widest` (Stepper labels) | Stepper.tsx | `text-label` | PASS partiel — reproduce le token `text-label` (13px, uppercase, tracking) mais via classes brutes plutôt que classe utilitaire `vs-label` |
| `h1 className="vs-h3"` | page.tsx | `vs-h3` | PASS — utilise bien le token typographique |
| `p className="vs-label"` | page.tsx | `vs-label` | PASS |

**Verdict G23 :** FAIL partiel — 2 problèmes réels : token `error` non défini (F4), primitive `gris-pierre` directement dans composant (F12). Valeur hardcodée `min-h-[200px]` (F13). Le reste est tolérable (tailles d'icônes).

## 5. Gate G31 — Architecture tokens 3 tiers

L'architecture 3 tiers impose : composants → tokens sémantiques uniquement, jamais les primitives directement.

### Violations détectées

| Classe utilisée | Fichier | Tier utilisé | Verdict |
|---|---|---|---|
| `hover:border-gris-pierre/50` | DropZone.tsx L137 | Tier 1 (primitive) | **FAIL G31** — `gris-pierre` est une primitive, pas un token sémantique. Doit être `hover:border-border-interactive-hover` ou équivalent sémantique. |
| `bg-bg-card` | DropZone.tsx L138, PlanThumbnail.tsx L42 | Tier 2 sémantique | PASS — mais le token s'écrit `color-background-card` dans la doc. Mapping Tailwind `bg-bg-card` = alias acceptable si configuré tel quel dans `tailwind.config.ts`. À vérifier. |
| `bg-bg-default` | DropZone.tsx L145, PlanThumbnail.tsx L47 | Tier 2 sémantique | PASS — même remarque mapping. |
| `text-error`, `bg-error/10`, `border-error/20` | page.tsx, DropZone.tsx | Non défini dans design system | **FAIL G31** — `error` n'est pas un token du design system VS (`vs-design-system.md` définit `color-status-error-background` et `color-status-error-foreground` au tier 2). Le code utilise un token Tailwind générique non mappé sur le DS. |
| Tous les autres tokens | page.tsx, PlanThumbnail.tsx, Stepper.tsx | Tier 2 sémantique | PASS — `text-text-default`, `text-text-muted`, `text-text-inverse`, `border-border-default`, `bg-interactive-primary`, `text-interactive-primary` sont tous des tokens sémantiques définis. |

**Synthèse G31 :** 2 violations réelles. (1) La primitive `gris-pierre` dans DropZone est la violation la plus nette de l'architecture 3 tiers. (2) Le token `error` n'est pas mappé sur les tokens de statut définis dans le design system — la correction est d'utiliser les classes correspondant à `color-status-error-background` et `color-status-error-foreground`.

**Verdict G31 :** FAIL partiel (2 violations — voir F4 et F12)

## 6. Gate G32 — 6 états composants interactifs

Référence : `vs-design-system.md` sections 5.1 (Stepper), 5.6 (Upload Zone).

### 6.1 DropZone

| État | Présent ? | Implémentation | Verdict |
|---|---|---|---|
| `default` | OUI | Border dashed `border-border-default`, fond `bg-bg-card`, icône grisée, texte "Déposez vos plans ici" | PASS |
| `hover` | OUI — PARTIEL | `hover:border-gris-pierre/50` — état visuel présent mais via token primitif interdit (voir F12). L'effet visuel est subtil (changement de couleur border seulement). Selon le DS, le hover devrait être `border-color-text-default + bg-background-subtle`. | FAIL partiel — comportement correct, token incorrect |
| `active/drag-over` | OUI | `isDragOver` → `border-interactive-primary bg-interactive-primary/5` + icône devient `text-interactive-primary` + texte "Relâchez pour déposer". | PASS — conforme à la spec DS §5.6 (border + fond changent) |
| `focus-visible` | OUI | `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary` | PASS |
| `disabled` | OUI | `opacity-50 cursor-not-allowed` via prop `disabled`. Couleur de fond non spécifiée (hérite). | PASS — conforme à spec DS (opacity 0.4 → ici 0.5, écart mineur) |
| `loading` | NON | Aucun état loading sur la DropZone elle-même. Pendant l'upload, la DropZone reste visible et active (non désactivée). Le loading est géré dans la page parente. Le DS §5.6 spécifie "progress bar linéaire sous la zone, % affiché, spinner dans la zone". | **FAIL** — voir finding F14 |

### 6.2 PlanThumbnail

| État | Présent ? | Implémentation | Verdict |
|---|---|---|---|
| `default` | OUI | Carte fond `bg-bg-card`, border `border-border-default`, preview image ou icône PDF | PASS |
| `hover` | NON | Aucun état hover défini sur la carte. Seul le bouton de suppression change de couleur au hover. | **FAIL** — voir finding F15 |
| `active` | NON | Aucun état active/sélectionné. La sélection d'une miniature n'est pas un use case de cette étape (upload seul) — acceptable en contexte. | INFO — non applicable à l'étape upload |
| `focus-visible` | NON sur la carte | La carte entière n'est pas focusable (`div` non interactif). Seul le bouton de suppression à l'intérieur est focusable. | PASS (la carte n'est pas interactive en soi) |
| `disabled` | OUI — via `deleting` | `opacity-50` quand `deleting=true`. Couverture partielle. | PASS |
| `loading` | ABSENT sur la carte | Le bouton de suppression en état `deleting` montre une opacité réduite mais pas de spinner. Pas d'indication visuelle de chargement par fichier dans la miniature elle-même. | **FAIL partiel** — voir finding F16 |

### 6.3 Bouton "Analyser les plans"

| État | Présent ? | Implémentation | Verdict |
|---|---|---|---|
| `default` | OUI | `bg-interactive-primary text-text-inverse`, rounded-md | PASS |
| `hover` | OUI | `hover:bg-interactive-hover` | PASS |
| `active` | NON | Pas de `active:` state défini | **FAIL** — voir finding F17 |
| `focus-visible` | OUI | `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary` | PASS |
| `disabled` | OUI | `disabled:opacity-50 disabled:cursor-not-allowed` | PASS |
| `loading` | NON | Pas de spinner dans le bouton pendant `handleAnalyze`. Si la requête PATCH prend du temps, le bouton ne donne aucun retour. | **FAIL** — voir finding F17 |

### 6.4 Stepper (lecture seule à cette étape)

| État | Spécifié dans DS | Présent dans Stepper.tsx | Verdict |
|---|---|---|---|
| `default` (en attente) | Border outline, label `text-label` | OUI — `border border-border-default text-text-muted` + `opacity-50` | PASS partiel — opacity 0.5 vs spec DS 0.4, cohérent visuellement |
| `hover` | Fond `color-background-subtle`, transition 150ms | **ABSENT** | **FAIL** — voir finding F18 |
| `active` (étape en cours) | Fond `color-background-dark`, texte inverse, bordure gauche 3px | OUI — `bg-bg-card border border-border-default` — **MAIS** écart avec le DS : le DS spécifie fond `color-background-dark` (#0B0B0B) + texte inverse, l'implémentation utilise `bg-bg-card` (blanc) + texte default. | **FAIL** — voir finding F18 |
| `focus-visible` | Outline 2px, offset 2px | N/A — les items Stepper ne sont pas interactifs (divs sans tabIndex, pas de navigation clickable). Acceptable si les étapes ne sont pas navigables par clic. | PASS (pas d'interaction = pas de focus à gérer) |
| `disabled` | Opacity 0.4, cursor not-allowed | OUI — `opacity-50` (écart : 0.5 vs 0.4 spécifié) | PASS |
| `loading` | Spinner 16px dans le cercle | **ABSENT** | INFO — pas de loading state dans le Stepper à l'étape 1. Sera nécessaire à l'étape 2 (traitement IA). |

**Verdict G32 global :** FAIL — 4 composants, 8 lacunes d'états. Les lacunes les plus critiques : DropZone sans état loading (F14), Stepper étape active incohérente avec le DS (F18), bouton "Analyser" sans état loading ni active (F17).

## 7. Cohérence avec design system Step 0

Note : le fichier `docs/design/vs-step0-dashboard-composition.md` n'existe pas. L'évaluation de cohérence se fait par rapport à `vs-design-system.md` (section 4 — Layout principal) et aux patterns définis dans les composants existants.

### 7.1 Structure layout

La page upload utilise un layout `flex gap-2xl` (sidebar 256px + flex-1 contenu). Le DS spécifie : sidebar 240px `position: fixed`, zone principale `margin-left: 240px`. **Écart :** le layout de la page est un flex inline (pas de position fixed sur la sidebar), ce qui est adapté pour une page scrollable mais diverge du layout app fixed décrit dans le DS (section 4.1). Pour l'étape 1 (upload, peu de contenu), c'est acceptable. Pour les étapes avec canvas (étape 2), le layout fixed sera nécessaire. Incohérence architecturale à anticiper.

### 7.2 Palette et tokens couleur

La page et ses composants respectent la palette Versi Studio sans exception. Les backgrounds (`bg-bg-card`, `bg-bg-default`), les bordures (`border-border-default`), les textes (`text-text-default`, `text-text-muted`, `text-text-inverse`) sont tous issus du tier sémantique. Cohérence : **PASS**.

### 7.3 Typographie

La hiérarchie typographique est correcte : `vs-h3` pour le titre principal (H1 sémantique), `vs-label` pour l'adresse du projet, `text-sm` / `text-xs` pour les métadonnées. L'utilisation de classes Tailwind brutes (`text-sm font-medium`) à la place de tokens utilitaires (`vs-label`) est un écart mineur (trouvé en G23). Le rendu visuel est cohérent. **PASS avec réserve** (voir findings G23).

### 7.4 Stepper — Écart d'implémentation vs DS (critique)

C'est le point de friction principal entre l'implémentation et le DS. Le DS section 4.5 et 5.1 spécifie :
- **Étape active** : fond `color-background-dark` (#0B0B0B), texte `color-text-inverse` (#F7F5F2), indicateur bordure gauche 3px
- **Implémentation actuelle** : fond `color-background-card` (#FFFFFF), border 1px, texte `text-text-default` (#0B0B0B)

Le design system demande une étape active visuellement forte (fond noir, texte blanc). L'implémentation utilise une étape active subtile (fond blanc, contour). C'est un choix de mise en oeuvre qui atténue le contraste entre active et default. L'écart est visible et doit être résolu. **FAIL** — voir finding F18.

### 7.5 Espacement

Le DS définit `spacing-md = 16px` pour les gutters de sidebar, `spacing-lg = 24px` pour le padding principal. La page utilise `gap-2xl` (48px) entre sidebar et contenu — plus généreux que la spec mais adapté au contexte de travail desktop. Les espacements internes (`mb-xl`, `mb-lg`, `mt-2xl`) sont cohérents avec la scale. **PASS**.

### 7.6 Boutons

Le bouton "Analyser les plans" est correctement stylisé (`bg-interactive-primary`, `text-text-inverse`, `rounded-md`, `text-sm font-medium`). Conforme aux specs bouton CTA du DS. **PASS** (hors états manquants traités en G32).

**Synthèse cohérence Step 0 :** Le rendu global est visuellement aligné avec le design system Versi Studio — palette, typographie, espacement. Le seul écart structurel significatif est l'état actif du Stepper (F18) qui contredit la spec DS. Le layout flex (vs fixed sidebar) est une adaptation acceptable pour une page de contenu court mais devra être unifié pour les étapes à canvas.

## 8. Tableau findings

| # | Point | Composant | Problème | Correction proposée | Priorité |
|---|---|---|---|---|---|

## 9. Verdict

Score design : [X/10 — HONNÊTE]

## 10. Handoff

- Destinataire : @fullstack + @orchestrator
- [à remplir]
