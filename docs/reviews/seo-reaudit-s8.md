# Re-audit SEO post-corrections s8 — Versi Immobilier

**Date** : 2026-04-14
**Auditeur** : @seo
**Référence** : suite de `docs/reviews/seo-audit-s8.md` (score initial : 5/10)

---

## Score global : 7,5/10

Progression significative depuis l'audit initial (5/10). Les corrections s8 ont résolu les problèmes critiques : unicité des balises SEO par page, structured data acquéreur, canonical propre, FAQ schema, sitemap enrichi, prerender Playwright. Le site est désormais crawlable et techniquement solide pour Google. Trois zones de friction persistent : (1) le prerender reste un workaround SPA — Bing rendra le JS moins bien que Google, (2) les pages de détail dynamiques (`/nos-biens/:id`, `/blog/:slug`, `/realisations/:id`) ne sont pas pré-rendues et n'ont pas de canonical absolu garanti côté serveur, (3) le sitemap ne couvre pas les URLs dynamiques et ses `lastModified` sont régénérés à la date du build (problème Bing).

---

## Scores par dimension /10

| Dimension | Score | Évolution vs s8 |
|---|---|---|
| SEO technique (crawl, canonical, sitemap, robots) | 7/10 | +3 (était 4/10) |
| On-page (title, description, H1, mots-clés) | 8/10 | +3 (était 5/10) |
| Contenu & intention (persona Kévin, FAQ, structured data) | 8/10 | +4 (était 4/10) |
| Blog & autorité thématique | 6/10 | +1 (était 5/10) |

**Score global calculé** : moyenne pondérée (technique ×1,5 + on-page ×1 + contenu ×1 + blog ×0,5) = **7,4/10 → arrondi 7,5/10**

## Audit page par page

[À compléter — section 3]

## Problèmes restants

[À compléter — section 4]

## Recommandations pour atteindre 10/10

[À compléter — section 5]
