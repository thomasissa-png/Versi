# Procédure Bing Webmaster Tools — Soumission URLs et diagnostic

> Document opérationnel pour Thomas. Mis à jour : 2026-04-24.

---

## Étape 1 — Vérifier que les sites sont accessibles depuis l'extérieur

**Avant tout**, confirmer que Bing peut atteindre les sites. Depuis un terminal (pas Replit) :

```bash
# Test accessibilité basique
curl -I https://versi.fr
curl -I https://versi-immobilier.fr
curl -I https://versi-invest.fr

# Test spécifique bingbot User-Agent
curl -A "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)" \
  -I https://versi.fr
```

Réponse attendue : `HTTP/2 200` ou `HTTP/1.1 200 OK`

Si 521, 503, timeout → le problème est l'hébergement, pas le SEO. Déployer sur Vercel/Netlify avant de soumettre à Bing.

---

## Étape 2 — Bing Webmaster Tools : soumission sitemap

1. Aller sur https://www.bing.com/webmasters/
2. Se connecter avec le compte Microsoft de Thomas
3. Pour chaque site (versi.fr, versi-immobilier.fr, versi-invest.fr) :
   - Cliquer sur le site → **Sitemaps** → **Submit sitemap**
   - Entrer l'URL du sitemap :
     - `https://versi.fr/sitemap.xml`
     - `https://versi-immobilier.fr/sitemap.xml`
     - `https://versi-invest.fr/sitemap.xml`
4. Bing crawlera les URLs listées dans les 24-72h

---

## Étape 3 — URL Submission API (IndexNow — recommandé)

IndexNow est le protocole natif Bing pour notifier instantanément des nouvelles URLs. Plus efficace que la soumission manuelle.

### 3a. Générer une clé IndexNow

```bash
# Générer une clé aléatoire (32 caractères hex)
python3 -c "import secrets; print(secrets.token_hex(16))"
# Exemple de sortie : a3f8c2d1e4b7f9a6c8d3e2f1a4b7c9d2
```

### 3b. Créer le fichier de vérification

Le fichier doit être accessible à l'URL `https://[domaine]/[cle].txt` et contenir uniquement la clé.

```bash
# Pour versi.fr (remplacer par la clé générée)
echo "a3f8c2d1e4b7f9a6c8d3e2f1a4b7c9d2" > src/public/a3f8c2d1e4b7f9a6c8d3e2f1a4b7c9d2.txt

# Pour versi-immobilier.fr
echo "a3f8c2d1e4b7f9a6c8d3e2f1a4b7c9d2" > versi-immobilier/public/a3f8c2d1e4b7f9a6c8d3e2f1a4b7c9d2.txt

# Pour versi-invest.fr
echo "a3f8c2d1e4b7f9a6c8d3e2f1a4b7c9d2" > versi-invest-site/public/a3f8c2d1e4b7f9a6c8d3e2f1a4b7c9d2.txt
```

### 3c. Soumettre via l'API IndexNow

```bash
# Soumettre la homepage de versi.fr à Bing via IndexNow
curl -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{
    "host": "versi.fr",
    "key": "a3f8c2d1e4b7f9a6c8d3e2f1a4b7c9d2",
    "keyLocation": "https://versi.fr/a3f8c2d1e4b7f9a6c8d3e2f1a4b7c9d2.txt",
    "urlList": [
      "https://versi.fr/",
      "https://versi.fr/mentions-legales",
      "https://versi.fr/politique-confidentialite"
    ]
  }'

# versi-immobilier.fr
curl -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{
    "host": "versi-immobilier.fr",
    "key": "a3f8c2d1e4b7f9a6c8d3e2f1a4b7c9d2",
    "keyLocation": "https://versi-immobilier.fr/a3f8c2d1e4b7f9a6c8d3e2f1a4b7c9d2.txt",
    "urlList": [
      "https://versi-immobilier.fr/",
      "https://versi-immobilier.fr/nos-biens",
      "https://versi-immobilier.fr/vendre",
      "https://versi-immobilier.fr/realisations",
      "https://versi-immobilier.fr/notre-approche",
      "https://versi-immobilier.fr/blog",
      "https://versi-immobilier.fr/contact"
    ]
  }'

# versi-invest.fr
curl -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{
    "host": "versi-invest.fr",
    "key": "a3f8c2d1e4b7f9a6c8d3e2f1a4b7c9d2",
    "keyLocation": "https://versi-invest.fr/a3f8c2d1e4b7f9a6c8d3e2f1a4b7c9d2.txt",
    "urlList": [
      "https://versi-invest.fr/",
      "https://versi-invest.fr/comment-ca-marche",
      "https://versi-invest.fr/references",
      "https://versi-invest.fr/equipe",
      "https://versi-invest.fr/contact",
      "https://versi-invest.fr/blog"
    ]
  }'
```

Réponse attendue : `HTTP 200 OK` ou `HTTP 202 Accepted`

---

## Étape 4 — URL Submission manuelle dans Bing Webmaster Tools

Si IndexNow n'est pas encore implémenté, soumission manuelle :

1. Bing Webmaster Tools → site concerné → **URL Submission**
2. Coller les URLs critiques (homepage en priorité)
3. Cliquer **Submit**
4. Bing confirme la réception (pas le crawl immédiat)

**Quota** : Bing autorise 10 000 soumissions manuelles par jour et par site.

---

## Étape 5 — Diagnostic "URL discovered but not crawled"

Si Bing affiche ce statut :

1. **Vérifier que le site répond en moins de 2 secondes** — Bing abandonne les sites lents
2. **Vérifier les redirections** : `curl -L -I https://versi.fr` — pas plus d'une redirection
3. **Site Scan dans Bing Webmaster Tools** — révèle les erreurs de crawl par page
4. **Crawl Control** — vérifier qu'aucune restriction de crawl n'est configurée dans BWT

---

## Référence robots.txt actuel (déjà correct)

```
# versi.fr, versi-immobilier.fr, versi-invest.fr
User-agent: *
Allow: /
Disallow: /api/

User-agent: GPTBot
Allow: /
# [autres bots IA autorisés]

Sitemap: https://versi-xxx.fr/sitemap.xml
```

Aucune correction robots.txt nécessaire — Bing n'est pas bloqué.

---

## Checklist finale avant re-soumission Bing

- [ ] `curl -I https://versi.fr` retourne 200 depuis internet
- [ ] `curl -I https://versi-immobilier.fr` retourne 200
- [ ] `curl -I https://versi-invest.fr` retourne 200
- [ ] Sitemaps soumis dans Bing Webmaster Tools
- [ ] Clé IndexNow générée et fichier `.txt` déployé (optionnel mais recommandé)
- [ ] URL Submission lancée pour les pages critiques
- [ ] Attendre 48-72h pour le crawl Bing
