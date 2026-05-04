# Audit visuel Vague 3 — Session s30
> Audit code-only (@design). 7 fichiers lus. Pas de screenshots disponibles.
> Objectif : itération vers 9.5+/10 avant test prod Thomas Étape F.

---

## 1. Résumé exécutif

**Score global : 7.8/10**

### Top 3 forces

1. **Architecture d'états machine solide (HIÉRARCHIE)** : la machine à 4 phases (placement → questions → generating → gallery) est lisible dans le code et se traduit visuellement par des transitions claires. Thomas ne peut pas se retrouver dans un état ambigu.
2. **Tokens design respectés (MÊME IDENTITÉ)** : les 7 composants utilisent systématiquement les tokens sémantiques (`bg-bg-default`, `text-text-muted`, `border-border-default`, `interactive-primary`). Zéro couleur hardcodée sauf dans AngleController (voir P1).
3. **Accessibilité de base sérieuse (ACCESSIBLE)** : `role="dialog"`, `aria-modal`, `aria-labelledby`, focus auto sur premier champ, min-h-[44px] sur tous les boutons, `aria-live` sur les statuts dynamiques — c'est au-dessus de la moyenne des apps SaaS.

### Top 3 faiblesses

1. **CostEstimator positionné en concurrence avec AngleController (CONVERSION)** : les deux flottent `absolute` dans le coin top-right / bottom-right du canvas. Sur mobile (375px), le CostEstimator `top-md right-md` et l'AngleController `bottom-md right-md` se chevauchent visuellement dès qu'une photo est placée. Thomas voit son coût estimé masqué par le contrôleur d'angle — friction P0.
2. **AngleController : couleurs hardcodées hors tokens (BRAND-ALIGNED)** : `stroke="#141C28"`, `fill="#2E66DC"`, `fill="#7C8691"` sont des valeurs brutes qui ne correspondent pas aux tokens du design system. Sur un projet immobilier premium calcaire/minéral, le bleu `#2E66DC` de la pointe est une rupture de marque visible.
3. **QuestionsModal : absence de safe-area-inset sur mobile (ACCESSIBLE/PRO)** : la modale utilise `p-md` en padding inférieur sur le footer des boutons, sans `pb-safe` ni `env(safe-area-inset-bottom)`. Sur iPhone avec barre de navigation, le bouton "Confirmer" peut être partiellement masqué — bloquant sur terrain (Thomas utilise un iPhone en visite).

### Verdict

**Itération nécessaire — 2 défauts P0 à corriger avant GO Thomas Étape F.**
Score atteignable après corrections P0/P1 : 9.0/10. Le 9.5+ demande en plus les améliorations P2 polish.

## 2. Évaluation par composant (10 critères Thomas)

Légende : note /10 + justification. NON-VÉRIFIÉ = fichier non lu ou état non vérifiable statiquement.

### VisualPlacementView (orchestrateur)

| Critère | Note | Justification |
|---|---|---|
| PRO | 7 | Layout flex col→row correct, mais sidebar mobile à `max-h-[40vh]` risque de tronquer le contenu settings sans indicateur de scroll |
| BEAU | 7 | Structure fonctionnelle, aucun détail esthétique propre à cet orchestrateur (il délègue aux enfants) |
| BRAND-ALIGNED | 8 | Tokens Versi respectés sur tous les wrappers ; calcaire/minéral cohérent |
| MÊME IDENTITÉ | 8 | Même langage de layout que le reste du studio |
| PROPRE | 7 | Deux `absolute` flottants (CostEstimator top-right + AngleController bottom-right) créent un risque de surcharge visuelle canvas |
| ALIGNÉ | 7 | `bottom-md right-md` et `top-md right-md` = 16px de marge, cohérent — mais coexistence non gérée |
| AÉRÉ | 7 | Sidebar `p-md` cohérent ; canvas zone principale `flex-1` — correct |
| CONVERSION | 6 | Le bouton Generate est en bas de sidebar, non visible sans scroll sur mobile (`max-h-[40vh]`) — risque de feature invisible |
| HIÉRARCHIE | 7 | Machine à états claire mais Generate button non prioritaire visuellement sur mobile |
| ACCESSIBLE | 8 | `role="status"` sur toast, `aria-live="polite"`, FAB `aria-label` — bon niveau |

### PlacementBottomSheet

| Critère | Note | Justification |
|---|---|---|
| PRO | 9 | Pattern bottom sheet correct (`items-end sm:items-center`), drag handle visuel, `rounded-t-2xl sm:rounded-2xl` — pro |
| BEAU | 8 | Preview thumbnail `max-h-40 object-cover` bien cadré ; hiérarchie texte claire |
| BRAND-ALIGNED | 9 | Tokens exclusifs, `bg-bg-default`, `border-border-default` — Versi cohérent |
| MÊME IDENTITÉ | 9 | Même pattern que les autres modales du projet |
| PROPRE | 9 | Contenu minimal : titre + description + preview + 2 boutons. Aucun élément superflu |
| ALIGNÉ | 8 | `flex-col-reverse sm:flex-row` pour l'ordre mobile (Annuler dessous, Confirmer dessus) — correct convention mobile |
| AÉRÉ | 8 | `p-lg pb-xl` — espacement généreux, bonne respiration |
| CONVERSION | 8 | Bouton primaire bien différencié (`bg-interactive-primary`) ; Annuler en secondary — hiérarchie claire |
| HIÉRARCHIE | 8 | Titre → description → preview → actions — logique descendante |
| ACCESSIBLE | 9 | `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, Escape, `disabled` pendant commit, min-h-[44px] — complet. Manque uniquement `pb-safe` (voir P0) |

### RoomSettingsSidebar

| Critère | Note | Justification |
|---|---|---|
| PRO | 8 | Cards pièces avec border, spacing cohérent, label+compteur placées photos — présentation propre |
| BEAU | 7 | Slider natif `accent-interactive-primary` — fonctionnel mais basique ; pas de step indicator visuel |
| BRAND-ALIGNED | 8 | Tokens systématiques ; warning orange `bg-warning/10 border border-warning/30` dans la gamme |
| MÊME IDENTITÉ | 8 | Pattern card `rounded-md border border-border-default bg-bg-card` identique aux autres sections |
| PROPRE | 8 | Contenu dense mais organisé ; le compteur `{placed} photo(s) placée(s)` est utile sans être bruité |
| ALIGNÉ | 8 | `flex items-baseline justify-between` pour label/compteur — alignement typographique correct |
| AÉRÉ | 7 | `gap-sm` (8px) entre éléments d'une carte — un peu serré pour un formulaire de settings, `gap-md` serait plus aéré |
| CONVERSION | 7 | Warning "ordre inversé" bien visible en orange — mais placé APRÈS le slider, l'utilisateur le voit trop tard (après avoir agi) |
| HIÉRARCHIE | 7 | Label de la pièce en font-medium mais même taille que le corps — manque différenciation de niveau |
| ACCESSIBLE | 8 | `htmlFor` + `id` sur tous les inputs, `aria-describedby` sur warning, `aria-live` sur saving state — bon niveau |

### VisualGallery

| Critère | Note | Justification |
|---|---|---|
| PRO | 8 | Grid responsive 1→2→3 cols, `aspect-[4/3]` uniforme — présentation galerie professionnelle |
| BEAU | 8 | Cards avec `rounded-md overflow-hidden`, aspect ratio fixe — rendu homogène et net |
| BRAND-ALIGNED | 8 | Badge Ancre `bg-info/10 text-info` — NON-VÉRIFIÉ si `--color-info` est dans les tokens (absent de globals.css) |
| MÊME IDENTITÉ | 7 | Utilise `bg-bg-canvas` pour le placeholder image — token présent. Mais `bg-info/10` et `text-info` sont ambigus (token `info` absent de globals.css) |
| PROPRE | 8 | Footer carte minimal : badges + bouton Régénérer. Pas de surcharge |
| ALIGNÉ | 8 | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md` — grille standard sans artefact |
| AÉRÉ | 7 | `p-sm` (8px) dans le footer carte — un peu serré pour les badges. `p-md` serait plus aéré |
| CONVERSION | 7 | Bouton "Modifier les paramètres" en header — visible mais en secondary border, peu incitatif si Thomas veut une correction rapide |
| HIÉRARCHIE | 8 | Section par pièce avec `h3`, compteur visuels, grid — hiérarchie claire |
| ACCESSIBLE | 7 | `alt` sur images présent ; `aria-label` sur Régénérer OK. Mais le badge "Cohérence : réduite" n'a qu'un `title` (hover desktop) — invisible mobile. `aria-label` doublonnant présent mais le tooltip `title` ne s'affiche pas sur tactile |

### CostEstimator

| Critère | Note | Justification |
|---|---|---|
| PRO | 8 | Badge inline compact avec icône info — lecture immédiate du coût |
| BEAU | 8 | `inline-flex items-center gap-sm` avec icône SVG bien proportionnée (w-4 h-4) |
| BRAND-ALIGNED | 7 | `bg-info/10 border border-info/30 text-info` — même problème token `info` non défini dans globals.css |
| MÊME IDENTITÉ | 7 | Même observation : token `info` ambigu — si Tailwind v4 résout en bleu par défaut, rupture possible avec la charte calcaire/minéral |
| PROPRE | 9 | Composant minimal, une seule responsabilité, aucun élément parasite |
| ALIGNÉ | 8 | Positionné `absolute top-md right-md` sur le canvas — 16px de marge, aligné sur les conventions des autres flottants |
| AÉRÉ | 8 | `px-md py-xs` — badge compact et bien proportionné |
| CONVERSION | 6 | Conflit de position avec AngleController sur mobile (voir P0). Sur desktop, coexistence possible mais non testée |
| HIÉRARCHIE | 8 | Information de coût bien visible sans dominer le canvas |
| ACCESSIBLE | 8 | `role="status"`, `aria-live="polite"`, `aria-label` configurable — excellent |

### QuestionsModal

| Critère | Note | Justification |
|---|---|---|
| PRO | 8 | Structure titre + sous-titre + liste questions + footer actions — pattern modal standard bien exécuté |
| BEAU | 8 | Cards questions `rounded-md border bg-bg-card`, badge "Enregistrée" en vert avec checkmark SVG — soigné |
| BRAND-ALIGNED | 8 | Tokens systématiques ; pas de couleur hors-palette |
| MÊME IDENTITÉ | 9 | Pattern identique à PlacementBottomSheet pour le footer boutons — cohérent |
| PROPRE | 8 | Chaque question dans sa propre card isolée — pas de bruit entre questions |
| ALIGNÉ | 8 | `flex items-baseline justify-between` pour label type + badge saved — correct |
| AÉRÉ | 8 | `p-lg` header et footer, `gap-md` liste — bonne respiration |
| CONVERSION | 7 | Bouton "Confirmer" disabled tant que non `allAnswered` — correct. Mais pas d'indicateur de progression (3/5 répondu) — Thomas ne sait pas combien il lui reste |
| HIÉRARCHIE | 8 | Titre modal → sous-titre compteur questions → items → footer. Logique descendante |
| ACCESSIBLE | 7 | Focus trap basique (focus premier input), Escape conditionnel (bloqué si dirty). Manque : focus trap complet (tabulation qui reste dans la modale). Manque : `pb-safe` footer iPhone (voir P0) |

### AngleController

| Critère | Note | Justification |
|---|---|---|
| PRO | 7 | Cercle SVG + slider = affordance duale pertinente. Mais le widget flotte sans contexte visuel de rattachement à la photo |
| BEAU | 6 | SVG avec `fill="#2E66DC"` (bleu vif) sur fond calcaire — rupture chromatique notable. La pointe bleue détonne dans la charte minérale/terreuse |
| BRAND-ALIGNED | 4 | 3 couleurs hardcodées hors tokens : `#141C28` (trait), `#2E66DC` (pointe), `#7C8691` (texte N, cercle). Non-conformes au design system Versi |
| MÊME IDENTITÉ | 5 | Sur une page majoritairement calcaire/noir-profond, ce widget bleu est un outlier visuel visible |
| PROPRE | 8 | Structure épurée : label + cercle + slider + valeur numérique — rien de superflu |
| ALIGNÉ | 8 | `flex flex-col items-center gap-sm` — centré, cohérent |
| AÉRÉ | 7 | `p-md` autour du widget — correct mais le label `text-xs uppercase tracking-widest` prend beaucoup d'espace pour une info secondaire |
| CONVERSION | 7 | Le slider `max-w-[180px]` est visible et fonctionnel. Mais l'absence de bouton "Réinitialiser à 0°" force Thomas à faire glisser depuis n'importe quel angle — effort sur terrain |
| HIÉRARCHIE | 7 | Label direction → cercle → slider → valeur numérique — logique, mais valeur numérique `{angle}°` en `text-sm font-medium` est plus visible que le cercle — inversion |
| ACCESSIBLE | 7 | Slider avec `aria-label`, `aria-valuenow/min/max` — bon. Cercle SVG avec `role="img"` et `aria-label` — correct. Pas de navigation clavier sur le cercle lui-même (seul le slider est clavier-accessible) — acceptable car le slider est le fallback |

## 3. Défauts critiques (P0/P1)

| Sévérité | Composant | Ligne | Symptôme | Classes actuelles | Recommandation |
|---|---|---|---|---|---|
| **P0** | VisualPlacementView | L.451-465 | `AngleController` (`absolute bottom-md right-md z-10`) et `CostEstimator` (`absolute top-md right-md z-10`) coexistent sans gestion de conflit. Sur mobile 375px avec une photo placée, les deux widgets sont simultanément visibles côté droit. Le coût estimé (info P0 persona) peut être partiellement masqué par le widget d'angle. | `absolute bottom-md right-md z-10` (angle) + `absolute top-md right-md z-10` (coût) | Déplacer le CostEstimator dans la sidebar (sticky top) : `<div className="sticky top-0 z-10 p-md border-b border-border-default bg-bg-card">`. L'AngleController reste sur le canvas. Supprime le chevauchement définitivement. |
| **P0** | PlacementBottomSheet | L.77 | Footer de la sheet sans `pb-safe` ni `env(safe-area-inset-bottom)`. Sur iPhone avec barre tactile, le bouton "Confirmer" peut être recouvert par la barre de navigation iOS — action principale de placement bloquée sur terrain. | `p-lg pb-xl` | Remplacer `pb-xl` par `pb-[calc(theme(spacing.xl)+env(safe-area-inset-bottom,0px))]`. Ou plus simple en Tailwind : ajouter `pb-safe` si le token est défini dans la config ; sinon `style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}`. |
| **P0** | QuestionsModal | L.169 | Footer de la modale sans safe-area. Même problème : bouton "Confirmer mes réponses" recouvert sur iPhone. | `p-lg border-t border-border-default flex ...` | Ajouter `pb-[calc(theme(spacing.lg)+env(safe-area-inset-bottom,0px))]` sur le div footer (l.309). |
| **P1** | AngleController | L.151-188 (SVG) | 3 couleurs hardcodées hors tokens : `stroke="rgba(124,134,145,0.60)"` (cercle), `stroke="#141C28"` (trait direction), `fill="#2E66DC"` (pointe bleue). En dark mode, `#141C28` sur fond sombre = trait invisible. Le bleu `#2E66DC` est hors charte calcaire/minéral. | Hex hardcodés dans le SVG inline | Remplacer par CSS vars du design system : `stroke="var(--color-border-default)"` (cercle), `stroke="var(--color-text-default)"` (trait), `fill="var(--color-interactive-primary)"` (pointe). Vérifier que ces vars sont exportées dans `globals.css`. |
| **P1** | VisualGallery | L.183 | `alt` des images = `"Visuel ancre"` ou `"Visuel secondaire"` — générique et non-descriptif. WCAG 2.2 AA 1.1.1 exige un texte alternatif décrivant le contenu. Pour un screen reader, impossible de distinguer 6 images d'une même pièce. | `alt={\`Visuel ${isAnchor ? "ancre" : "secondaire"}\`}` | Passer `roomLabel: string` en prop à `VisualCard`. Alt final : `alt={\`Visuel ${isAnchor ? "ancre" : "secondaire"} — ${roomLabel}\`}`. |
| **P1** | QuestionsModal | L.89-103 | Focus trap absent : `firstInputRef.current?.focus()` à l'ouverture est correct, mais Tab sort du dialog vers le canvas en arrière-plan. WCAG 2.2 AA 2.1.2 (No Keyboard Trap) requiert que la navigation reste confinée dans le dialog. | Aucune gestion de Tab | Ajouter dans le keydown handler (l.95) la gestion Tab/Shift+Tab : `const focusable = Array.from(dialogRef.current.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled])'))` + cycle sur premier/dernier (voir section 7 pour le diff complet). |

## 4. Défauts mineurs (P2)

| Sévérité | Composant | Ligne | Symptôme | Classes actuelles | Recommandation |
|---|---|---|---|---|---|
| **P2** | VisualPlacementView | L.468-479 | Toast erreur utilise `role="status" aria-live="polite"`. Pour une erreur, `aria-live="polite"` peut être ignoré si l'utilisateur est en train de naviguer. WCAG recommande `role="alert"` + `aria-live="assertive"` pour les erreurs. | `role="status" aria-live="polite"` (même quand `toast.kind === "error"`) | Conditionner : `role={toast.kind === "error" ? "alert" : "status"}` + `aria-live={toast.kind === "error" ? "assertive" : "polite"}`. |
| **P2** | VisualPlacementView | L.505-506 | Sidebar mobile `max-h-[40vh]` avec `overflow-y-auto` : le bouton Generate (`mt-auto`) est en bas de la sidebar. Sur mobile avec plusieurs pièces (RoomSettingsSidebar dense), le bouton peut être caché sans indicateur de scroll. Feature invisible = feature inexistante. | `max-h-[40vh] overflow-y-auto` | Extraire le GenerateButton hors du flux scrollable de la sidebar : `sticky bottom-0 bg-bg-card border-t border-border-default p-md` dans la sidebar mobile. Garantit la visibilité permanente du CTA. |
| **P2** | RoomSettingsSidebar | L.233-243 | Warning "ordre inversé" (`Slider à X mais aucune photo placée`) placé **après** le slider. Thomas voit le warning seulement après avoir interagi — feedback a posteriori. | Warning en dessous du slider | Placer le warning **avant** le slider (`<input>`) pour que l'avertissement soit visible avant l'action. Ou placer inline à côté du label du slider. |
| **P2** | RoomSettingsSidebar + QuestionsModal | L.257 (RS), L.224, L.295 (QM) | `focus-visible:outline-none focus-visible:border-interactive-primary` : supprime l'outline natif et remplace par une border colorée sans ring. WCAG 2.2 AA 2.4.11 (Focus Appearance) requiert une zone de focus d'au moins 2px sur au moins 1 côté avec contraste ≥ 3:1. Une border seule sans ring est limite. | `focus-visible:outline-none focus-visible:border-interactive-primary` | Remplacer par `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive-primary focus-visible:ring-offset-1` — plus visible et conforme 2.4.11. |
| **P2** | VisualGallery | L.222-228 | Badge "Cohérence : réduite" n'a qu'un attribut `title` pour le tooltip explicatif. Sur mobile et tactile, `title` ne s'affiche jamais. Le contexte de dégradation de cohérence est invisible pour Thomas en visite sur terrain. | `title="Le multi-image natif..."` | Ajouter une expansion inline au tap : petite section `<details><summary>...</summary>` ou, plus simple, afficher un texte condensé directement sous le badge : `<p className="text-xs text-text-muted mt-xs">Palette cohérente, pas de référence pixel-à-pixel.</p>` conditionné à `isFallback`. |
| **P2** | QuestionsModal | L.323-329 | Bouton "Confirmer mes réponses" `disabled={!allAnswered}` sans feedback explicatif pour Thomas. Si 4/5 questions répondues, il ne sait pas quelle question reste sans réponse — trial and error. | `disabled={!allAnswered \|\| submitting}` sans indicateur | Ajouter sous le bouton quand disabled : `{!allAnswered && !submitting && <p className="text-xs text-text-muted text-right mt-xs">Répondez à toutes les questions pour continuer.</p>}`. Bonus : ajouter un compteur `{answeredCount}/{questions.length}` dans le header de la modale. |
| **P2** | CostEstimator | L.56-68 | Affichage en USD (`$3.80`) peu naturel pour un marchand de biens francophone. Risque de friction psychologique ("c'est une appli américaine") et de confusion (taux de change). | `style: "currency", currency: "USD"` | Options : (A) garder USD mais ajouter `(indicatif)` en suffixe explicite, (B) convertir en EUR avec taux fixe inscrit dans une constante. Recommandé : option A plus simple et honnête. `{formatted} USD (indicatif)`. |
| **P2** | AngleController | L.136 | `role="img"` sur le div conteneur du SVG sans `aria-disabled` quand `disabled=true`. Un screen reader ne saura pas que le cercle est désactivé. | `role="img"` sans `aria-disabled` | Ajouter `aria-disabled={disabled \|\| isCommitting}` sur le div (l.129). |

## 5. Cohérence inter-composants

### Tokens : cohérence globale

**PASS** — Les 7 composants utilisent le même jeu de tokens sémantiques : `bg-bg-default`, `bg-bg-card`, `bg-bg-canvas`, `text-text-default`, `text-text-muted`, `text-text-inverse`, `border-border-default`, `bg-interactive-primary`, `hover:bg-interactive-hover`, `text-interactive-primary`. Aucune couleur arbitraire dans les composants non-SVG.

**FAIL partiel** — AngleController SVG (lignes 151-188) : 3 hex hardcodés (`#141C28`, `#2E66DC`, `rgba(124,134,145,0.10)`) qui cassent la cohérence. Ce sont des tokens visuellement "proches" mais non-conformes.

**Token ambigu : `info`, `warning`, `success`, `error`** — Ces 4 tokens sémantiques de feedback sont utilisés dans 5 des 7 composants (`bg-info/10 text-info`, `bg-warning/10 text-warning`, etc.). Leur présence dans `tailwind.config.ts` est nécessaire. Si absents, Tailwind silencieusement génère des classes vides en prod → badges invisibles. NON-VÉRIFIÉ : la présence de ces tokens dans `tailwind.config.ts` n'a pas été contrôlée (hors des 7 fichiers prioritaires). @fullstack doit confirmer.

### Hiérarchie typographique

**PASS complet** — Le pattern est cohérent sur les 7 composants :
- Sections headers : `text-sm uppercase tracking-wide font-semibold text-text-default`
- Titres modales/galerie : `text-base font-semibold text-text-default`
- Corps et labels : `text-sm text-text-default` ou `text-sm text-text-muted`
- Labels secondaires, compteurs : `text-xs text-text-muted`
- Badges, tags : `text-xs` avec couleur du token de feedback

### États visuels uniformes

| État | Cohérence | Observations |
|---|---|---|
| Loading spinner | PASS | `animate-spin border-2 border-[token]/40 border-t-[token] rounded-full` — identique dans QuestionsModal et VisualGallery |
| Error message | PASS partiel | `text-error role="alert"` dans VisualGallery/QuestionsModal/RoomSettings. Toast erreur dans VisualPlacementView utilise `role="status"` — incohérent (P2-1) |
| Success / Saved | PARTIEL | QuestionsModal a un badge "Enregistrée" (vert checkmark). RoomSettings a `Sauvegarde…` texte muted. Pas de standard visuel unique pour le feedback de sauvegarde |
| Disabled | FAIL partiel | `disabled:opacity-50 disabled:cursor-not-allowed` partout SAUF PlacementBottomSheet (L.130) qui utilise `disabled:cursor-wait` — incohérence mineure |
| Empty state | PASS | `text-sm text-text-muted` centré — cohérent dans VisualGallery et RoomSettingsSidebar |
| Focus visible | PASS partiel | Boutons primaires : `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary` — correct. Inputs/textareas : `focus-visible:outline-none focus-visible:border-interactive-primary` — insuffisant WCAG 2.4.11 (voir P2-4) |

### Espacements inter-composants

**PASS** — Scale 4px respectée : `gap-sm` (8px) intra-composant, `gap-md` (16px) entre éléments distincts, `p-md` (16px) pour les cards/conteneurs, `p-lg` (24px) pour les zones principales. Aucun espacement arbitraire détecté hors scale.

## 6. Accessibilité statiquement détectable

### Contrastes WCAG AA (estimation code-only)

> Note : sans valeurs hex des custom tokens, les ratios sont estimés sur la base des conventions sémantiques. Tout marqué NON-VÉRIFIÉ doit passer par axe-core (gate G20).

| Combinaison de couleurs | Usage | Ratio estimé | Statut |
|---|---|---|---|
| `text-text-default` sur `bg-bg-default` | Corps, titres | ≥ 7:1 (convention noir profond sur blanc) | PASS présumé |
| `text-text-muted` sur `bg-bg-default` | Labels secondaires | 4.5:1 si muted ≈ gray-500 → BORDERLINE | NON-VÉRIFIÉ |
| `text-text-inverse` sur `bg-interactive-primary` | CTA boutons | ≥ 4.5:1 si primary ≥ #1a4dcc | PASS présumé |
| `text-warning` sur `bg-warning/10` | Warning inline RoomSettings | RISQUE FAIL — texte amber saturé sur fond quasi-blanc | NON-VÉRIFIÉ — P1 transversal |
| `text-info` sur `bg-info/10` | Badge CostEstimator, Badge Ancre | RISQUE FAIL — même pattern fond dilué | NON-VÉRIFIÉ — P1 transversal |
| `text-error` sur `bg-error/10` | Messages erreur inline | RISQUE FAIL — même pattern | NON-VÉRIFIÉ — P1 transversal |
| `stroke="#141C28"` SVG (AngleController) | Trait direction | Bon light. Fail présumé dark mode | NON-VÉRIFIÉ dark |

**Alerte transversale P1** : le pattern `text-[color]` sur `bg-[color]/10` est utilisé dans 4 composants pour les badges de feedback. Le fond à 10% d'opacité est quasi-blanc sur light mode. La lisibilité WCAG AA (4.5:1 texte) n'est garantie que si le token de couleur texte est suffisamment sombre (amber-700+ pour warning, blue-700+ pour info, red-700+ pour error). À vérifier impérativement via axe-core avant Étape F.

### aria-labels et rôles — inventaire

| Composant | role | aria-modal | aria-labelledby | aria-live | Autres | Statut |
|---|---|---|---|---|---|---|
| PlacementBottomSheet | `dialog` | oui | oui | — | `tabIndex={-1}` backdrop, `aria-label` backdrop | PASS |
| QuestionsModal | `dialog` | oui | oui | — | `aria-busy` submit, `role="alert"` erreur globale | PASS structurel, focus trap manquant (P1) |
| CostEstimator | `status` | — | — | `polite` | `aria-label` configuré, `data-testid` | PASS |
| Toast (VPV) | `status` | — | — | `polite` | `role="status"` même pour erreur | PARTIEL (P2) |
| AngleController cercle | `img` | — | — | — | `aria-label` dynamique avec degrés | PASS |
| AngleController slider | — | — | — | — | `aria-label`, `aria-valuenow/min/max` | PASS |
| RoomSettings slider | — | — | — | — | `htmlFor+id`, `aria-describedby` warning | PASS |
| RoomSettings saving | — | — | — | `polite` | `aria-live` sur span saving | PASS |
| VisualGallery images | — | — | — | — | `alt` générique | PARTIEL (P1) |
| FAB mobile | — | — | — | — | `aria-label="Placer la photo sélectionnée"` | PASS |
| Bouton backdrop (PBS) | — | — | — | — | `aria-label="Annuler le placement"` | PASS |
| Spinner régénération | — | — | — | `polite` | Sur `div` englobant | PASS |

### Navigation clavier

- **PlacementBottomSheet** : Escape géré. Pas de focus trap déclaré — 2 boutons seulement, risque limité mais non conforme strict WCAG 2.1.2.
- **QuestionsModal** : Escape conditionnel (bloqué si dirty) — correct. Tab sort du dialog — non conforme WCAG 2.1.2 (P1).
- **AngleController** : slider accessible clavier nativement (flèches). Cercle SVG = `role="img"` sans interaction clavier — acceptable, le slider est le fallback déclaré et documenté.
- **RoomSettingsSidebar** : tous les inputs ont `id`/`for`, navigation Tab naturelle.
- **VisualGallery** : bouton Régénérer `min-h-[44px] px-xs` — touch target correct mais `px-xs` (4px) très serré horizontalement pour une zone cliquable.

## 7. Recommandations prioritaires — top 5 @fullstack

### Action 1 (P0) — Safe-area sur PlacementBottomSheet et QuestionsModal

**PlacementBottomSheet.tsx** ligne 77 :
```
// Avant
className="... p-lg pb-xl ..."
// Après
className="... p-lg ..."
style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
```

**QuestionsModal.tsx** ligne 309 (div footer) :
```
// Avant
className="p-lg border-t border-border-default flex ..."
// Après
className="p-lg border-t border-border-default flex ..."
style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
```

---

### Action 2 (P0) — Déplacer CostEstimator du canvas vers la sidebar sticky

**VisualPlacementView.tsx** :

Supprimer lignes 462-466 :
```tsx
{/* À SUPPRIMER du canvas */}
<div className="absolute top-md right-md z-10">
  <CostEstimator roomTargets={roomTargets} />
</div>
```

Ajouter dans la `<aside>` avant le StyleGrid (avant ligne 517) :
```tsx
<div className="sticky top-0 z-10 border-b border-border-default bg-bg-card px-md py-sm">
  <CostEstimator roomTargets={roomTargets} />
</div>
```

---

### Action 3 (P1) — Couleurs SVG AngleController via CSS vars

**AngleController.tsx** lignes 151-188 :
```tsx
// Avant
<circle ... fill="rgba(124,134,145,0.10)" stroke="rgba(124,134,145,0.6)" />
<line ... stroke="#141C28" />
<circle ... fill="#2E66DC" stroke="#FFFFFF" />

// Après
<circle ... fill="var(--color-bg-canvas, rgba(124,134,145,0.10))" stroke="var(--color-border-default, rgba(124,134,145,0.6))" />
<line ... stroke="var(--color-text-default, #141C28)" />
<circle ... fill="var(--color-interactive-primary, #2E66DC)" stroke="var(--color-bg-default, #FFFFFF)" />
```
Vérifier que `--color-bg-canvas`, `--color-border-default`, `--color-text-default`, `--color-interactive-primary`, `--color-bg-default` sont déclarés dans `globals.css` (probablement déjà le cas si les tokens Tailwind sont définis via CSS vars).

---

### Action 4 (P1) — Focus trap QuestionsModal

**QuestionsModal.tsx** — modifier le keydown handler existant (l.95-103) :
```tsx
useEffect(() => {
  const onKeyDown = (e: KeyboardEvent) => {
    // Escape existant
    if (e.key === "Escape") {
      const hasInput = Array.from(fields.values()).some((f) => f.value.trim().length > 0);
      if (!hasInput) onCancel();
      return;
    }
    // Focus trap Tab/Shift+Tab
    if (e.key === "Tab" && dialogRef.current) {
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]),input:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}, [fields, onCancel]);
```

---

### Action 5 (P1+P2 groupé) — Alt images VisualGallery + cursor + focus ring

**VisualGallery.tsx** — passer `roomLabel` à VisualCard :
```tsx
// Interface VisualCardProps — ajouter
roomLabel: string;

// Appel VisualCard (l.136) — ajouter prop
roomLabel={label}

// Dans VisualCard, l.183
alt={`Visuel ${isAnchor ? "ancre" : "secondaire"} — ${roomLabel}`}
```

**PlacementBottomSheet.tsx** ligne 130 — unifier cursor :
```
// Avant : disabled:cursor-wait
// Après : disabled:cursor-not-allowed
```

**RoomSettingsSidebar.tsx** l.257, **QuestionsModal.tsx** l.224 et l.295 — focus ring :
```
// Avant : focus-visible:outline-none focus-visible:border-interactive-primary
// Après : focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive-primary focus-visible:ring-offset-1
```

## 8. Handoff → @orchestrator + @fullstack

---

**Handoff → @orchestrator + @fullstack**

**Fichier produit** : `docs/design/s30-visual-audit-vague3.md`

**Score global s30** : 7.8/10 — Itération round 2 nécessaire avant test prod Thomas Étape F.

**Verdict ligne unique** : 3 défauts P0 (chevauchement CostEstimator/AngleController canvas, safe-area absente sur 2 modales mobiles) + 3 défauts P1 (SVG hors-tokens dark mode cassé, focus trap QuestionsModal absent, alt VisualGallery non-descriptif) + 8 défauts P2 polish. Score atteignable après round 2 : 9.0-9.5/10.

**Actions @fullstack — 5 tickets prioritaires** :

| Priorité | Fichier | Action |
|---|---|---|
| P0 | VisualPlacementView.tsx | Déplacer CostEstimator du canvas vers sidebar sticky |
| P0 | PlacementBottomSheet.tsx + QuestionsModal.tsx | Ajouter safe-area-inset-bottom sur les footers mobiles |
| P1 | AngleController.tsx | Remplacer hex SVG hardcodés par CSS vars design system |
| P1 | QuestionsModal.tsx | Ajouter focus trap Tab/Shift+Tab |
| P1+P2 | VisualGallery.tsx + PlacementBottomSheet.tsx + RoomSettingsSidebar.tsx | Alt descriptif + cursor unification + focus ring inputs |

**Critères passage 9.5+/10** :
- Actions P0 complètes (chevauchement éliminé, safe-area OK)
- Actions P1 complètes et gate G20 axe-core PASS
- Contrastes `text-[color]` sur `bg-[color]/10` vérifiés via axe-core (warning/info/error tokens)
- P2 : warning RoomSettings déplacé avant slider, compteur progress QuestionsModal ajouté, CostEstimator avec "(indicatif)" suffixe

**Estimation rounds** : 1 round @fullstack (actions 1-5 parallélisables) + 1 run axe-core = GO Thomas Étape F.

---

**1 LEARNING DÉTECTÉ — pattern réutilisable cross-projets**

> **LEARNING s30-L1 (P1, TTL 5 sessions)** : Le pattern `text-[semantic-color]` sur `bg-[semantic-color]/10` (badges warning/info/error inline) est WCAG-risqué sur tous les projets utilisant ce pattern. Le fond à 10% opacity est quasi-blanc → le contraste s'évalue `text-color` sur blanc effectif, pas sur la couleur saturée. Si le token warning est amber-500 (#F59E0B), le ratio sur blanc = 2.0:1 — FAIL WCAG 4.5:1. Règle d'or : pour les badges feedback colorés, soit (A) utiliser `text-text-default` avec `border-[color]` colorée (fond neutre), soit (B) utiliser un fond suffisamment saturé (≥ 10% saturation effective, ex: `bg-warning/20` + `text-warning-800` équivalent). Vérifier systématiquement via axe-core avant tout déploiement.

---

**Mise à jour project-context.md — historique interventions** : @orchestrator à mettre à jour avec `s30 | @design | Audit visuel Vague 3 (7 composants) — 7.8/10, 3 P0 + 3 P1 identifiés, round 2 nécessaire`.
