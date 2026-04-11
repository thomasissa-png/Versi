# Préférences Fondateur — Thomas Issa

> Source de vérité pour l'agent @moi.
> Mis à jour automatiquement depuis `docs/lessons-learned.md` (catégorie "préférence fondateur").
> Dernière mise à jour : 2026-04-11

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

### Analytics
- **Umami Analytics uniquement.** Jamais Plausible, jamais GA4. Umami est cookieless, RGPD-exempt, hébergé EU. Toute mention de Plausible dans le code ou les docs client-facing doit être remplacée par Umami.

### Qualité
- **Objectif toujours 10/10.** Thomas exige l'itération des audits jusqu'à 10/10. Pas de "suffisant" ni de "GO conditionnel accepté". Citation : "fais itérer jusque 10/10" puis "Fixe même les petits points". Les agents doivent viser l'excellence dès la première passe.
- Même les "petits points" cosmétiques doivent être corrigés. Pas de dette technique tolérée.

### Back office & Admin
- **Nav + Footer du site public sur toutes les pages admin.** Thomas veut que le back office fasse partie du site, pas une app séparée. Citation : "garde le header et footer en permanence sur toutes les pages, pour qu'on ait l'impression d'être sur le site".

### Contenu & Blog
- **Content marketing terrain = validé.** Thomas voit chaque réalisation comme une histoire à raconter. Citation : "On est des marchands, on peut avoir de jolies histoires à raconter sur l'acquisition, la rénovation etc." Le blog doit être factuel et narratif, pas du marketing générique.

### Process
- Ne pas changer de branche sans vérification. Le fondateur attend que le travail validé soit préservé.
