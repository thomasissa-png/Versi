# Avis design — Hero & page globale Versi
_@design — 2026-04-08_

---

## 1. Hero noir #0B0B0B + grain — Note : 8/10

C'est le bon choix. Pour une holding institutionnelle dont le persona élimine les sites en 10 secondes, le noir pur envoie immédiatement un signal de sérieux et de maîtrise. C'est cohérent avec les codes visuels du secteur premium (immobilier, private equity, family offices) où les acteurs qui se respectent n'utilisent pas un blanc éclatant de startup SaaS. Le grain à opacity 0.03 est bien dosé — il casse le flat sans faire "agence de pub 2019". La texture SVG inline est une bonne décision technique (pas de dépendance image, pas de flash au chargement).

Deux réserves qui coûtent les 2 points : le bouton CTA primaire en `border: 1px solid` blanc transparent sur fond noir est élégant mais peu percutant — Laurent a besoin que l'action soit claire, pas juste belle. Et le stagger d'animation (0ms → 800ms) étire l'entrée sur presque une seconde : c'est une seconde perdue sur les 5 secondes disponibles avant qu'il ferme l'onglet.

---

## 2. Page dans son ensemble — Note : 7/10

**Ce qui marche :**
L'alternance noir / calcaire (#F7F5F2) / noir foncé (#1A1A1A) crée un rythme visuel propre qui évite la monotonie d'une page monochrome. Le design system est solide — tokens cohérents, spacing scale respectée, zéro valeur hardcodée visible. Les grilles (4 colonnes Activités, 4 colonnes Approche, 3 colonnes Équipe) sont bien proportionnées. La hiérarchie typographique est lisible.

**Ce qui ne marche pas :**
La page n'a pas d'image. Zéro photo, zéro visuel de projet, zéro portrait d'équipe — juste du texte et des grilles. Pour Laurent qui évalue la crédibilité en 10 secondes, l'absence de preuves visuelles (photos de chantiers, immeubles transformés, portraits des fondateurs) est un problème de conversion, pas un choix éditorial. Un opérateur immobilier sans photo de ses actifs ressemble à un prestataire sans portfolio. La section Équipe avec cards mais sans photo est particulièrement problématique — "si je ne trouve pas qui est derrière en 2 clics, je passe" (verbatim Laurent). La typographie est trop légère sur certains poids (`--font-weight-light: 300`) : sur écran rétina ça passe, sur un Dell de bureau ça devient illisible. Enfin, deux sections sur fond `#0B0B0B` (Hero + Approach) se suivent dans la même teinte sans section claire intercalée : le rythme noir/clair/noir/clair se casse à cet endroit.

---

## Résumé

Le design system est bien construit et le noir est le bon choix — mais une page sans images pour un opérateur immobilier est un dossier sans photos de chantier : techniquement correct, visuellement vide, et insuffisant pour convaincre Laurent en 5 secondes.
