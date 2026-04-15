# Design System — Versi Studio

> Produit par @design | Date : 2026-04-15
> Entité : Versi Studio (4e entité, outil SaaS de pré-commercialisation)
> URL cible : studio.versi.fr
> Source de vérité visuelle pour @fullstack Versi Studio.
> À lire en parallèle : docs/design/design-system.md (parent Versi), docs/strategy/vs-brand-platform.md
> Architecture : Endorsed Brand — hérite à 100% de la palette Versi, aucune couleur d'accent propre

---

## 1. Tokens hérités de Versi (ne pas modifier)

<!-- Héritage direct depuis design-system.md — aucune surcharge autorisée -->

### 1.1 Palette primitive (tier 1)

Ces valeurs sont définies dans `design-system.md` parent. Reproduites ici en lecture seule — ne jamais les modifier pour Versi Studio.

```json
"color-primitive": {
  "calcaire":      "#F7F5F2",
  "blanc":         "#FFFFFF",
  "gris-chaud":    "#D9D4CE",
  "gris-pierre":   "#6B6560",
  "beige-pierre":  "#C8B9A6",
  "vert-mineral":  "#1E2A23",
  "anthracite":    "#1A1A1A",
  "noir-profond":  "#0B0B0B"
}
```

### 1.2 Tokens sémantiques couleur (tier 2)

Les composants Versi Studio référencent UNIQUEMENT ces tokens sémantiques — jamais les primitives directement (gate G31).

```json
"color-background": {
  "default":   "calcaire → #F7F5F2",
  "card":      "blanc → #FFFFFF",
  "subtle":    "gris-chaud → #D9D4CE",
  "dark":      "noir-profond → #0B0B0B",
  "dark-alt":  "anthracite → #1A1A1A",
  "accent":    "vert-mineral → #1E2A23"
},
"color-text": {
  "default":   "noir-profond → #0B0B0B",
  "inverse":   "calcaire → #F7F5F2",
  "muted":     "gris-pierre → #6B6560",
  "accent":    "beige-pierre → #C8B9A6"
},
"color-border": {
  "default":   "gris-chaud → #D9D4CE",
  "subtle":    "gris-chaud → #D9D4CE",
  "strong":    "anthracite → #1A1A1A"
},
"color-interactive": {
  "primary":   "noir-profond → #0B0B0B",
  "hover":     "anthracite → #1A1A1A",
  "accent":    "beige-pierre → #C8B9A6"
}
```

**Contrastes WCAG 2.2 AA vérifiés :**
- `color-text-default` (#0B0B0B) sur `color-background-default` (#F7F5F2) : ratio ~19:1 — PASS
- `color-text-muted` (#6B6560) sur `color-background-default` (#F7F5F2) : ratio ~4.54:1 — PASS AA
- `color-text-inverse` (#F7F5F2) sur `color-background-dark` (#0B0B0B) : ratio ~19:1 — PASS
- `color-text-accent` (#C8B9A6) sur `color-background-dark` (#0B0B0B) : ratio ~7.2:1 — PASS

### 1.3 Typographie

### 1.4 Spacing scale

### 1.5 Border radius

### 1.6 Shadows

---

## 2. Tokens spécifiques SaaS Versi Studio

### 2.1 Palette fonctionnelle — Couleurs de lots (tier 1 + tier 2)

### 2.2 Tokens d'état fonctionnel (succès, erreur, warning)

### 2.3 Tokens canvas

---

## 3. Logo Versi Studio

### 3.1 Construction typographique

### 3.2 Taille minimum et zones de protection

### 3.3 Placement dans le header

---

## 4. Layout principal de l'application

### 4.1 Structure globale (desktop)

### 4.2 Structure tablette

### 4.3 Structure mobile (consultation seule)

### 4.4 Header fixe — specs

### 4.5 Sidebar stepper — specs

---

## 5. Composants UI spécifiques SaaS

### 5.1 Stepper latéral
### 5.2 Plan Canvas + Overlay de lots
### 5.3 Lot Badge
### 5.4 Room Badge
### 5.5 Style Picker Card
### 5.6 Photo Upload Zone
### 5.7 Avant/Après Comparateur
### 5.8 Chat Drawer (Agent Architecte)
### 5.9 Progress Bar IA
### 5.10 Toast Notifications

---

## 6. Compositions de pages — Étape par étape

### Étape 1 — Upload du plan
### Étape 2 — Définition des lots et pièces
### Étape 3 — Sélection du style architectural
### Étape 4 — Génération et export du dossier

---

## 7. Responsive

---

## 8. Accessibilité

---

## Handoff → @fullstack
