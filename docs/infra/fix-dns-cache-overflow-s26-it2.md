# Fix DNS cache overflow — Itération 2 (S26)

**Agent** : @infrastructure
**Date** : 2026-04-24
**Statut** : EN COURS — patch en cours d'application

## Contexte

Itération 1 (S26-it1) avait patché `versi-immobilier/server.js` et `versi-invest-site/server.js` avec un endpoint `/api/live` ultra-précoce. Diagnostic initial "Replit Autoscale intermittent" INVALIDÉ par reality check post-redeploy :

| Site | default | bingbot | googlebot | /api/live |
|---|---|---|---|---|
| versi-immobilier.fr | 10/10 | 10/10 | 10/10 | 200 JSON 62ms |
| versi.fr | 4/10 | 7/10 | 3/10 | 200 mais HTML (SPA fallback) |
| versi-invest.fr | 5/10 | 8/10 | 5/10 | 503 "DNS cache overflow" |

Conclusions :
- versi-immobilier.fr stable => patch it1 valide comme référence
- versi.fr n'a PAS reçu le patch (src/server.js non modifié)
- versi-invest.fr RÉGRESSION après patch it1 => quelque chose diffère

## Diagnostic root cause

(à compléter après audit)

## Fix appliqué

### src/server.js (versi.fr)
(à compléter)

### versi-invest-site/server.js (versi-invest.fr)
(à compléter)

### versi-immobilier/server.js (versi-immobilier.fr)
NON TOUCHÉ — référence qui marche.

## Validation

- `node --check src/server.js` : à exécuter
- `node --check versi-invest-site/server.js` : à exécuter

## Actions Thomas (redeploy Replit)

(à compléter)

## Handoff

(à compléter)
