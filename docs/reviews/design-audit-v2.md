# Design Audit v2 — Versi.fr
Date : 2026-04-08 | Agent : @design

## Note globale : 8.5/10 (vs 7/10 en v1)

---

## Tableau de vérification — 6 corrections

| # | Problème signalé | Statut | Détail |
|---|---|---|---|
| 1 | Équipe mobile : 2 colonnes sur 480px+ | CORRIGÉ | `@media (min-width: 480px) and (max-width: 767px)` → `repeat(2, 1fr)`. `aspect-ratio: 4/3` sur `.team__photo-wrapper` en mobile. Parfait. |
| 2 | Cartes Activités : suppression box-shadow | CORRIGÉ | `.activities__card` n'a plus de `box-shadow`. Bordure seule. Cohérent avec le registre institutionnel du projet. |
| 3 | CTA "Bientôt disponible" : style distinct | PARTIELLEMENT | `.activities__card-cta--disabled` : `font-size: 0.6875rem` et `opacity: 0.6` sont présents, mais ces valeurs sont hardcodées — pas de token. Voir point 4. |
| 4 | Tokens CSS : remplacement par sémantiques | CORRIGÉ (sauf 2 résiduels) | `--font-size-body-sm/lg`, `--opacity-muted/subtle/soft/readable` bien définis et utilisés dans Approach.css et Hero.css. Résiduels : `.hero__surtitre` → `opacity: 0.6` hardcoded (devrait être `var(--opacity-soft)` ou `var(--opacity-muted)`). `.activities__card-cta--disabled` → `font-size: 0.6875rem` et `opacity: 0.6` hardcodés (devrait être `var(--font-size-body-sm)` et `var(--opacity-muted)`). |
| 5 | Fade-in staggeré | CORRIGÉ | `fadeInUp` avec `translateY(12px→0)`, délais `0/100/200/300ms` sur `nth-child`. Hero a son propre système `heroFadeIn` avec 5 délais. Propre et fonctionnel. |
| 6 | Carte SVG Implantation | NON CORRIGÉ (accepté) | Carte maison approximative documentée comme acceptable. Aucune régression visuelle. |

---

## Ce qui reste pour atteindre 10/10

**Deux tokens résiduels hardcodés (mineur) :**

1. `Hero.css` ligne 37 — `.hero__surtitre { opacity: 0.6 }` → remplacer par `var(--opacity-soft)` (0.7) ou créer `--opacity-subtle-text: 0.6`
2. `Activities.css` lignes 68-70 — `.activities__card-cta--disabled { font-size: 0.6875rem; opacity: 0.6 }` → remplacer par `var(--font-size-body-sm)` et `var(--opacity-muted)`

**Note :** `--font-size-body-sm` = 0.875rem, pas 0.6875rem. Si la valeur 0.6875rem est intentionnelle (taille inférieure pour désactiver visuellement davantage), créer un token `--font-size-caption: 0.6875rem` dans index.css. Sinon utiliser `--font-size-body-sm`.

**Ce qui est excellent et ne change pas :**
- Architecture tokens 3 tiers respectée partout
- Spacing 100% tokenisé, zéro valeur arbitraire
- Touch targets 44px respectés (`.team__linkedin`, `.hero__cta-primary`)
- Responsive mobile-first cohérent sur tous les composants
- Animations bien calibrées, `--duration-slow` (400ms) utilisé partout

---

## Verdict final

**GO** — Le site est prêt à livrer. Les 2 tokens résiduels sont des corrections de 5 minutes qui n'affectent pas le rendu visuel (les valeurs hardcodées correspondent à peu près aux tokens existants). Corriger avant merge si rigorisme token exigé, sinon livrable validé.

---

**Handoff → @fullstack**
- Fichiers lus : `index.css`, `Team.css`, `Activities.css`, `Approach.css`, `Mission.css`, `Hero.css`
- 2 corrections optionnelles : `.hero__surtitre opacity` et `.activities__card-cta--disabled font-size/opacity` → tokeniser
- Aucun blocage visuel ou fonctionnel identifié
