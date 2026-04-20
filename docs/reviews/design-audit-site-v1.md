# Audit visuel design — versi.fr
**Agent** : @design
**Date** : 2026-04-08
**Référence** : enclave.com
**Contexte** : Site one-page institutionnel React. Post-corrections créatives V2 (score @creative-strategy : 8,5/10). Premier audit design pur — typographie, spacing, cohérence tokens, responsive, accessibilité.

---

## 1. Note globale et verdict

**Note design : 7,5/10**

Le site est propre, les tokens sont correctement définis et partiellement bien utilisés. L'architecture visuelle fonctionne — l'alternance sections claires/sombres est efficace, la hiérarchie typographique est cohérente, le Hero post-refonte tient sa promesse. Le design system CSS est de bonne facture pour un premier site.

Ce qui empêche le 9/10 :

1. **La grille Équipe mobile est cassée** — les cartes 3/4 portrait s'empilent dans une colonne unique `max-width: 400px` centrée, mais aucun texte de la grille n'est aligné à gauche avec les photos : l'effet est une carte étroite et mal proportionnée sur téléphone
2. **Les cartes Activités et Équipe ont une ombre sur fond clair qui n'est pas dans le ton** — `box-shadow: 0 2px 8px rgba(0,0,0,0.06)` est trop "UI SaaS", pas "fonds immobilier institutionnel"
3. **L'animation fade-in est appliquée au conteneur entier des sections**, pas aux enfants individuellement — résultat : sections entières qui clignotent plutôt que les éléments qui entrent dans la page avec du character
4. **La section Implantation est visuellement faible** — la carte SVG maison est géographiquement approximative et la section manque d'un ancre visuelle forte côté texte
5. **Plusieurs valeurs hardcodées** dans les CSS de composants qui contournent les tokens (`font-size: 0.875rem`, `font-size: 4rem`, `font-size: 1.125rem`, `font-size: 2rem`, `opacity: 0.15`, `opacity: 0.5`)
6. **Les CTA "BIENTÔT DISPONIBLE"** dans Activités sont visuellement identiques aux CTAs actifs — seul `color: var(--color-text-muted)` les différencie, pas de traitement visuel distinct du statut désactivé

La distance entre 7,5 et 9 se joue sur 5 corrections CSS précises + 1 remplacement de SVG carte France. Le fondamental est solide, c'est la finition qui manque.

---

## 2. Audit section par section

### 2.1 Navigation
### 2.2 Hero
### 2.3 Mission
### 2.4 Activités
### 2.5 Approche
### 2.6 Implantation
### 2.7 Équipe
### 2.8 Contact
### 2.9 Footer

---

## 3. Cohérence du design system

[Section complète ci-dessous]

---

## 4. Responsive

[Section complète ci-dessous]

---

## 5. Typographie

[Section complète ci-dessous]

---

## 6. Espacement et rythme vertical

[Section complète ci-dessous]

---

## 7. Accessibilité visuelle

[Section complète ci-dessous]

---

## 8. Priorités d'action classées par impact

[Section complète ci-dessous]

---
