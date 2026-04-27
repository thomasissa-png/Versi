# Stockage long terme `property_photos` — Évaluation stratégique

**Session** : s27 — diagnostic post-mémo erroné s26→s27 ("migrer même pattern que `project_photos`" = faux, car biens uploadés dynamiquement via admin, pas seedés en local).
**Auteur** : @fullstack — document de décision, AUCUNE implémentation.
**Statut** : à valider par Thomas avant exécution.

---

## 1. Diagnostic actuel

- **Schéma** : `property_photos.data TEXT NOT NULL` (base64 string, pas BYTEA — cf. `init-db.js` L46). Une photo JPEG admin ~500 kB → ~680 kB en base64 (overhead +33%).
- **Volume actuel** : < 10 biens estimés × ~5 photos × ~680 kB ≈ **30-40 MB DB total**. Négligeable aujourd'hui.
- **Perf observée** : `GET /api/public/properties/:id` retourne `data` inline dans la réponse JSON (server.js L478-481) → payload bien fiche = (nb photos × 680 kB). 5 photos = 3.4 MB de JSON, parsé côté client. Pas de `Cache-Control`, pas de CDN.
- **Replit Autoscale** : instances éphémères, pas de disque persistant — n'impacte pas le stockage DB lui-même mais interdit toute solution disque local.
- **Problèmes anticipés** :
  - **50 biens × 5 photos = 1.7 GB DB** — Postgres Neon (Replit) commence à ramer sur les `SELECT *` d'admin (`server.js` L592 fait `SELECT *` sur `properties`, OK, mais le risque est sur `property_photos` qui charge `data` à chaque GET fiche).
  - **100 biens = 3.4 GB** — backup, restore, migrations deviennent coûteux ; latence first-paint fiche bien dégradée (3-5s sur 4G).
  - **500 biens = 17 GB** — coût Neon explose (plan payant requis), pagination/lazy-load obligatoire, base64 devient un anti-pattern reconnu.

---

## 2. Trois stratégies évaluées

### A. Replit Object Storage (natif)

- **SDK** : `@replit/object-storage` (Node.js), API simple `client.uploadFromBytes(key, buffer)` / `downloadAsBytes(key)`. Buckets gérés depuis le dashboard Replit.
- **Coût** : inclus dans le plan Replit Core (~20 €/mois) jusqu'à 10 GB ; au-delà ~0.02 $/GB/mois (variable, à confirmer dashboard). Pas de coût egress séparé.
- **Migration** : `data TEXT` → `storage_key TEXT` + `public_url TEXT`. Migrer les ~30-40 MB existants en 1 script one-shot. Routes POST/DELETE/UPDATE à réécrire (~6 routes touchées, server.js L850-900).
- **Signed URLs** : supportées (durée TTL configurable). Pour V1 simple, photos publiques = URLs publiques directes, pas besoin de signed URLs.
- **Avantages** : zero vendor sprawl (déjà chez Replit), credentials auto-injectés, pas de config DNS.
- **Inconvénients** : lock-in Replit ; pas de CDN edge mondial (latence acheteurs hors Europe); produit moins mature que R2/S3.

### B. Cloudflare R2 + signed URLs

- **SDK** : `@aws-sdk/client-s3` (R2 = S3-compatible). Endpoint custom `https://<account>.r2.cloudflarestorage.com`. Signed URLs via `@aws-sdk/s3-request-presigner`.
- **Coût** : **0 € egress** (différenciateur clé R2), 0.015 $/GB/mois stockage, 4.50 $/M opérations classe A (writes). À 100 biens × 5 photos × 500 kB = 250 MB → ~**0 €/mois** (sous le free tier de 10 GB stockage gratuit).
- **Migration** : identique A — `storage_key` + `public_url`. Bucket public ou signed URLs (préférer public + cache-control long pour photos biens, signed seulement si futurs documents privés).
- **CDN bonus** : R2 sert via Cloudflare CDN edge (300+ POPs), TTFB < 50 ms global. First-paint fiche bien quasi instantané.
- **Avantages** : coût quasi-nul même à 500 biens, perf top-tier, portable (S3-compat), durable (Cloudflare 99.999% durability).
- **Inconvénients** : 1 vendor de plus à gérer (compte Cloudflare, tokens API à stocker en Replit Secrets), DNS custom optionnel mais recommandé (`cdn.versi-immobilier.fr`).

### C. Garder base64 en DB

- **Seuil de bascule** : ~50 biens (1.7 GB DB) avant que Neon Replit devienne lent ET que le plan free tier (3 GB) explose. À 100 biens = obligation passer plan payant Neon (~20 €/mois supplémentaires) sans aucun gain perf.
- **Pros V1** : zéro migration, zéro vendor ajouté, code actuel fonctionne.
- **Cons** : viole le learning P0 s26 "solution propre durable, JAMAIS quick fix" ; latence fiche bien dégradée linéairement avec le nombre de photos ; backups DB lourds ; impossibilité d'utiliser un CDN ; cauchemar à 100+ biens.
- **Verdict** : acceptable uniquement comme statu quo court terme si le projet stagne sous 20 biens, mais incompatible avec la croissance attendue (mémo session : "croissance attendue propriétaires + acheteurs").

---

## 3. Matrice de décision

| Critère | Poids | A. Replit Object Storage | B. Cloudflare R2 | C. Base64 DB |
|---|---|---|---|---|
| Durabilité (P0 "propre durable") | 30% | 4/5 | **5/5** | 1/5 |
| Perf utilisateur final (TTFB photos) | 25% | 3/5 | **5/5** (CDN edge) | 1/5 |
| Coût mensuel à 100 biens | 15% | ~20 €/mois (inclus Core) | **~0 €/mois** (free tier) | ~20 €/mois (Neon payant forcé) |
| Complexité migration (@fullstack tasks) | 15% | **3 tasks** (~3-4h) | 4 tasks (~4-5h) | **0 task** |
| Dette technique générée | 15% | Faible (lock-in léger) | **Très faible** (S3-compat portable) | Élevée (à refaire dans 6 mois) |
| **Score pondéré** | | **3.6 / 5** | **4.7 / 5** | **1.4 / 5** |

---

## 4. Recommandation : **Stratégie B — Cloudflare R2 + URLs publiques**

**Raisons** :
1. Aligne parfaitement avec le P0 s26 "solution propre durable" — R2 est un standard industrie, portable S3, zéro lock-in.
2. Coût quasi-nul même à 500 biens (free tier 10 GB couvre largement).
3. Perf utilisateur supérieure (CDN edge mondial) — critère décisif pour fiches biens en vente où le first-paint vend.
4. Effort migration marginal vs A (4-5h vs 3-4h), bénéfice long terme >> effort.

**Plan d'implémentation (3 étapes, sans code)** :

1. **Étape 1 — Provisioning & schema** : créer compte Cloudflare + bucket R2 `versi-property-photos` (public read, cache-control 1 an), générer access keys, stocker en Replit Secrets (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`). Migration DB additive : nouvelles colonnes `storage_key TEXT` + `public_url TEXT` sur `property_photos` (garder `data` temporairement pour rollback safe).
2. **Étape 2 — Réécriture routes admin** : POST `/api/admin/properties/:id/photos` upload → R2 puis insert row avec `storage_key` + `public_url`. DELETE → suppression objet R2 + delete row. PATCH reorder inchangé. Routes GET public/admin retournent `public_url` au lieu de `data`. Front admin et public adaptés (1 ligne : `src={photo.public_url}` au lieu de `src={data:image/...;base64,${photo.data}}`).
3. **Étape 3 — Backfill & cleanup** : script one-shot qui itère les ~30-40 MB de `data` base64 existants, upload vers R2, remplit `storage_key` + `public_url`. Validation visuelle sur 3 biens. Drop colonne `data` après 1 semaine de stabilité (rollback window).

**Fallback** : si Thomas refuse un nouveau vendor (Cloudflare), retomber sur stratégie A (Replit Object Storage) — score 3.6 reste acceptable, P0 respecté, juste perf/coût moindres.

---

## 5. Hypothèses à valider par Thomas

Données manquantes — JAMAIS inventées (commandement n°2) :

- **Volume cible 12 mois** : combien de biens en vente simultanés visés fin 2026 ? (impacte choix free tier vs payant)
- **Volume cible 24 mois** : trajectoire de croissance acheteurs/propriétaires — 50, 200, 1000 biens ?
- **Budget mensuel infra acceptable** : seuil au-delà duquel on doit reconsidérer (10 €, 50 €, 100 €/mois) ?
- **Compte Cloudflare existant ?** : si oui (probable côté DNS versi-immobilier.fr), R2 ajout en 5 min ; sinon création compte requise.
- **Accès admin Replit pour Object Storage** : Thomas a-t-il le rôle requis pour activer le bucket Replit Object Storage si stratégie A retenue ?
- **Photos privées futures ?** : prévoit-on des documents confidentiels (mandats de vente, diagnostics signés) à terme ? Si oui, signed URLs deviennent obligatoires (R2 et Replit OS supportent).
- **Domaine CDN custom** : OK pour pointer `cdn.versi-immobilier.fr` vers R2 (recommandé branding + perf) ou URL `*.r2.dev` acceptable V1 ?
- **Fenêtre rollback** : 1 semaine de double-stockage (DB + R2) acceptable ou exigence rollback instantané plus longue ?

---

## Verdict

**Recommandation : Stratégie B — Cloudflare R2 + URLs publiques** (score 4.7/5).
Stratégie A en fallback si refus vendor (score 3.6/5).
Stratégie C rejetée (viole P0 s26, score 1.4/5).

Validation requise sur les 8 points de la section [Hypothèses à valider par Thomas](#5-hypothèses-à-valider-par-thomas) avant ouverture des tasks @fullstack.
