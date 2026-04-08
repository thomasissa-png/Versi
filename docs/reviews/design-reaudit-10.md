# Re-audit design — Hero & page globale Versi
_@design — 2026-04-08 — après corrections_

---

## 1. Hero — Nouvelle note : 8.5/10 (delta : +0.5)

L'accent line 48px est bien exécuté : `height: 1px`, `background: var(--color-accent)`, `opacity: 0.4`. Le geste est correct — il rompt la verticale texte/sous-texte sans faire décoratif kitch. Le stagger resserré (0/120/240/360/480/700ms) est une vraie amélioration : l'entrée est plus sèche, plus affirmée, moins "démo d'agence". Le CTA primaire avec `border: rgba(247, 245, 242, 0.6)` et `background: rgba(247, 245, 242, 0.04)` gagne en lisibilité perçue sans sacrifier l'élégance.

Pourquoi pas 9 : l'accent line à `opacity: 0.4` est encore discrète — sur un écran légèrement surexposé elle disparaît. Une valeur de `0.5` à `0.6` tiendrait mieux sans casser le registre minimaliste. Et le CTA primaire reste dans un registre "ghost button" : pour Laurent qui doit comprendre l'action en 3 secondes, un fill légèrement plus affirmé (`rgba(247, 245, 242, 0.08`) serait le bon compromis sans basculer dans le plein.

---

## 2. Page — Nouvelle note : 7.5/10 (delta : +0.5)

**Corrections confirmées et efficaces :**
- `border-top: 1px solid var(--color-border)` sur Activities et Team : le rythme de séparation est propre, sans over-engineering.
- Approach.css : `var(--color-border-dark)` en place, plus de rgba hardcodé. Token compliance 100% sur ce fichier.
- Contact.css : tokens pour opacity et font-size vérifiés — la quasi-totalité est tokenisée. Deux résidus mineurs : `font-size: 0.75rem` en dur lignes 117 et 150 (`.contact__error` et `.contact__rgpd`) et `font-size: 1rem` ligne 159 (`.contact__success`). Pas bloquant, mais hors-système.
- Non-retina fallback (`max-resolution: 1.5dppx → font-weight: regular`) : correction structurelle propre.
- `--color-border-dark` ajouté dans les tokens : correct.

**Ce qui tire encore vers le bas :**
La page n'a toujours pas d'images (problème data-dépendant — photos d'actifs, portraits équipe). C'est le frein principal à 8+. Ce n'est pas un problème de code CSS, c'est un problème de contenu — hors scope de ces corrections.

---

## 3. Points non data-dépendants restants pour 10/10

1. **Hero accent line opacity** : passer de `0.4` à `0.55` pour tenir sur écrans mal calibrés.
2. **Hero CTA primaire fill** : `rgba(247, 245, 242, 0.04)` → `0.07` pour renforcer la distinction visuelle bouton/fond sans casser l'élégance.
3. **Contact.css — 3 valeurs hardcodées résiduelles** : `.contact__error` (0.75rem), `.contact__rgpd` (0.75rem), `.contact__success` (1rem) → remplacer par `var(--font-size-caption)` et `var(--font-size-body-md)`.
4. **Hero fade-up manquant** : les éléments fadent en opacité (opacity 0→1) sans translateY. Ajouter `transform: translateY(12px) → translateY(0)` dans `heroFadeIn` donnerait un mouvement d'entrée plus ancré, plus premium — une ligne de code.
5. **`--color-border-dark` défini en rgba hardcodée dans les tokens** : `rgba(255, 255, 255, 0.12)`. Fonctionnel mais sémantiquement fragile — si le fond dark change, ce token ne suit pas automatiquement. À documenter comme limitation consciente.

---

## Résumé

Les corrections sont propres, bien appliquées, et améliorent réellement le résultat — mais elles étaient toutes des corrections de finesse (stagger, border-top, token compliance) sur un code déjà solide ; le plafond de la page reste celui du contenu absent, pas du code.
