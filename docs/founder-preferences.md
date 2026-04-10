# Préférences Fondateur — Thomas Issa

> Source de vérité pour l'agent @moi.
> Mis à jour automatiquement depuis `docs/lessons-learned.md` (catégorie "préférence fondateur").
> Dernière mise à jour : 2026-04-10

## Préférences validées

### Animation & Motion
- **Hero = fade global 300ms ease-out** sur TOUS les sites Versi. Pas de cascade, pas de scroll hint, pas d'animations séquentielles décalées. Le mouvement doit être invisible, pas démonstratif. Pattern canonique : `src/src/components/Hero.jsx`.
- Animation institutionnelle/premium : un seul fade global, pas de SaaS-style stagger.

### Copywriting
- **Taglines immédiatement compréhensibles.** Pas de formule abstraite ("Zéro posture") même si elle est dans le ton de marque. Test : si Thomas ne comprend pas, Laurent non plus.
- "Trois fondateurs. Quarante ans de terrain." validé — concret, factuel, crédible.
- "Trois associés. Zéro posture." rejeté — "je comprends pas trop cette phrase".

### Infrastructure & Déploiement
- **Replit deploymentTarget = "autoscale"** toujours. Ne jamais modifier sans accord explicite.
- Configuration Replit = décision fondateur, pas décision technique.

### Navigation
- Menu versi.fr : VISION, ACTIVITÉS, APPROCHE, ÉQUIPE, CONTACT. IMPLANTATION supprimé (trop vide pour l'instant).
- APPROCHE toujours présent dans le menu.

### Process
- Ne pas changer de branche sans vérification. Le fondateur attend que le travail validé soit préservé.
