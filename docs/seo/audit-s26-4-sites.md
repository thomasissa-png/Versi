# Audit SEO technique — 4 sites Versi — S26 (24 avril 2026)

> Audit terrain sur repo local. Problèmes P0 signalés par Thomas : icônes Google absentes + Bing inaccessible.

---

## Résumé exécutif

| Problème P0 | Statut réel | Action |
|---|---|---|
| Favicons manquants | **FAUX** — tous les fichiers PNG existent dans les 4 public/ | Cause réelle ailleurs (voir section 2) |
| Bing "can't fetch" | **robots.txt OK** — cause probable : Replit WAF / DNS non encore propagé | Actions Thomas documentées |
| Crawl-delay | Absent dans tous les robots.txt | PASS |
| Sitemap déclaré | 3/4 OK (versi-studio : Disallow:/ = indexation désactivée volontairement) | OK |

---

## 1. Tableau 4 sites × critères

| Critère | versi.fr | versi-immobilier.fr | versi-invest.fr | versi-studio |
|---|---|---|---|---|
| **G31 Favicon — fichiers PNG** | PASS (15 fichiers) | PASS (14 fichiers) | PASS (14 fichiers) | PASS (12 fichiers)* |
| **G31 Favicon — balises HTML** | PASS (7 balises) | PASS (7 balises) | PASS (7 balises) | PASS (via Next.js metadata) |
| **og:image** | PASS (1200x630 déclaré) | PASS (1200x630 déclaré) | **FAIL** (absent) | **FAIL** (absent) |
| **twitter:card** | **FAIL** (absent) | **FAIL** (absent) | **FAIL** (absent) | **FAIL** (absent) |
| **robots.txt** | PASS | PASS | PASS | PASS (Disallow:/ voulu) |
| **Crawl-delay** | PASS (absent) | PASS (absent) | PASS (absent) | N/A |
| **Sitemap déclaré robots** | PASS | PASS | PASS | N/A (SaaS privé) |
| **lastmod sitemap** | PASS (2026-04-14) | PASS (2026-04-14) | PASS (2026-04-14) | N/A |
| **llms.txt** | PASS | PASS | PASS | **FAIL** (absent) |
| **Schema.org JSON-LD** | PASS (Org+WebSite+FAQ) | PASS (Org+WebSite) | PASS (Org+WebSite+FAQ) | **FAIL** (absent) |
| **Organization.logo format** | FAIL (SVG, pas ImageObject) | FAIL (SVG, pas ImageObject) | FAIL (SVG, pas ImageObject) | N/A |
| **Twitter card metadata** | FAIL | FAIL | FAIL | FAIL |

*versi-studio manque mstile-150x150.png dans public/ (existe dans les 3 autres) — mineur.

---

## 2. Diagnostic réel : pourquoi les icônes Google ne s'affichent pas

**Les fichiers favicon existent.** Le problème n'est pas l'absence de fichiers PNG.

Causes probables par ordre de probabilité :

### 2a. Sites non encore accessibles en prod (cause n°1)
Les sites sont sur Replit en dev. Si les domaines `versi.fr`, `versi-immobilier.fr`, `versi-invest.fr` ne sont pas encore déployés sur un hébergeur public avec DNS propagé, Google ne peut pas crawler les favicons. Google génère les favicons dans les SERPs **uniquement après crawl réussi** — jamais en preview local.

**Vérification Thomas** : `curl -I https://versi.fr` depuis un terminal externe (pas Replit). Si timeout ou 521 → le domaine n'est pas public.

### 2b. Cache Google (cause n°2 si site accessible)
Google met 1 à 4 semaines pour afficher un nouveau favicon dans les SERPs. Si le site vient d'être mis en ligne, c'est normal.

**Forcer le recrawl** : Google Search Console → Inspection d'URL → "Demander l'indexation" sur la homepage de chaque site.

### 2c. Erreur de taille ICO (cause n°3)
Le `favicon.ico` doit contenir au minimum une icône 48x48 (recommandation Google 2023+). Vérifier que les ICO générés contiennent bien ce format.

```bash
# Vérifier le contenu d'un favicon.ico
file versi-immobilier/public/favicon.ico
identify versi-immobilier/public/favicon.ico  # si ImageMagick installé
```

---

## 3. Diagnostic Bing "We were not able to fetch this page"

**robots.txt : clean sur les 3 sites publics.** Aucun blocage bingbot, aucun crawl-delay.

```
# Tous les 3 robots.txt publics :
User-agent: *
Allow: /
Disallow: /api/
[AI bots autorisés]
Sitemap: https://versi-xxx.fr/sitemap.xml
```

### Causes probables Bing :

| Cause | Probabilité | Vérification |
|---|---|---|
| Site non déployé / DNS non propagé | **Très haute** | `curl -A "Mozilla/5.0" https://versi.fr` |
| Replit WAF bloquant Bingbot par User-Agent | **Haute** | Test curl depuis VPS externe |
| Certificat SSL invalide ou auto-signé | Moyenne | `curl -v https://versi.fr` (check TLS handshake) |
| Redirect loop / 5xx au premier fetch | Moyenne | `curl -L -I https://versi.fr` |

**Test définitif Thomas** (depuis un terminal externe, pas Replit) :
```bash
curl -v -A "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)" https://versi.fr
```
Si 200 → Bing finira par crawler. Si 403/timeout → WAF ou Replit qui bloque.

---

## 4. Problèmes P1 (non-bloquants mais à corriger)

### 4a. og:image manquant — versi-invest.fr (FAIL)
Le fichier `versi-invest-site/index.html` ne déclare pas `og:image`. Partage LinkedIn/Facebook = pas de visuel.

**Fix** : ajouter 3 lignes dans `versi-invest-site/index.html` (fait ci-dessous).

### 4b. Twitter/X Card absente — 4 sites (FAIL)
Aucun des 4 sites n'a `twitter:card` ni `twitter:image`. Partage Twitter = title texte brut sans aperçu visuel.

**Fix** : ajouter dans chaque index.html / layout.tsx (fait ci-dessous).

### 4c. llms.txt absent — versi-studio (FAIL)
versi-studio est un SaaS, robots.txt bloque l'indexation. Le llms.txt n'a pas de raison d'être public.
**Décision** : laisser sans llms.txt. C'est volontaire pour un outil interne.

### 4d. Organization.logo — format SVG au lieu d'ImageObject (P2)
Google Rich Results Test préfère un `ImageObject` avec dimensions explicites pour générer le Knowledge Panel. Les 3 sites publics utilisent `"logo": "url-svg"` (string simple). Acceptable mais non optimal.

**Fix recommandé** (P2, pas urgent) :
```json
"logo": {
  "@type": "ImageObject",
  "url": "https://versi.fr/android-chrome-512x512.png",
  "width": "512",
  "height": "512"
}
```

### 4e. Canonical non déclaré en static HTML (P2)
Les 3 sites React déclarent "canonical géré par react-helmet-async" dans les commentaires. Si react-helmet-async n'est pas correctement implémenté par page, Bing (moins tolérant que Google sur les canonicals manquants) peut ignorer des pages. À vérifier dans les composants React.

### 4f. Sitemap lastmod = 2026-04-14 sur tous les sites (P2)
Dates figées — pas un problème car le contenu n'a pas changé. À mettre à jour à chaque modification réelle de contenu. **Ne pas automatiser** avec la date du build (signal spam pour Bing).

---

## 5. État G31 Favicon Coverage — verdict par site

| Site | ico | svg | 16px | 32px | 48px | apple-180 | chrome-192 | chrome-512 | manifest | browserconfig | balises HTML | G31 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| versi.fr | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK | 7/7 | **PASS** |
| versi-immobilier.fr | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK | 7/7 | **PASS** |
| versi-invest.fr | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK | 7/7 | **PASS** |
| versi-studio | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK | 7/7 (Next.js) | **PASS** |

---

## 6. Plan d'action priorisé

### P0 — Actions Thomas (ne peuvent pas être faites en repo)

1. **Confirmer que les 3 sites sont bien déployés** en production avec DNS propagé. C'est la cause la plus probable du "favicon absent dans Google" et du "Bing can't fetch".
   - Si Replit : vérifier que le mode "Always On" est activé et que le domaine custom est configuré
   - Si non déployé → déployer sur Vercel/Netlify (recommandé — voir handoff @fullstack)

2. **Google Search Console** : vérifier les 3 propriétés, lancer "Inspection d'URL" + "Demander l'indexation" sur chaque homepage

3. **Bing Webmaster Tools** : soumettre les sitemaps manuellement (voir `docs/seo/bing-submission-procedure.md`)

4. **Test curl depuis terminal externe** :
   ```bash
   curl -I https://versi.fr
   curl -I https://versi-immobilier.fr
   curl -I https://versi-invest.fr
   ```
   Réponse attendue : `HTTP/2 200`. Si 521/timeout → problème d'hébergement.

### P1 — Corrections repo (faites dans cet audit)

- [x] og:image + og:image:width/height ajoutés dans versi-invest-site/index.html
- [x] og-image.png 1200x630 généré dans versi-invest-site/public/
- [x] Twitter cards (summary_large_image) ajoutées dans versi.fr, versi-immobilier.fr, versi-invest.fr (index.html)
- [x] Twitter card ajoutée dans versi-studio layout.tsx (metadata.twitter)
- [x] docs/checklists/favicon-checklist.md créé
- [x] docs/seo/bing-submission-procedure.md créé

### P2 — Backlog technique

- [ ] Organization.logo → ImageObject avec dimensions (3 sites)
- [ ] Vérifier implémentation react-helmet-async (canonical par page)
- [ ] versi-studio : og:image + sitemap si ouverture publique future
- [ ] Sitemap versi-studio si pages publiques ajoutées

---

## 7. versi-invest/ vs versi-invest-site/ — verdict

`versi-invest-site/` est en production (sitemap.xml, llms.txt, références complètes, dist/ présent).
`versi-invest/` (racine) contient uniquement `project-context.md` — c'est un dossier de notes, pas un site.

**Recommandation** : pas de cleanup urgent, mais `versi-invest/` est confusant. Renommer en `versi-invest-notes/` ou supprimer si vide.

---

*Audit réalisé par @seo — S26 — 2026-04-24*
