# Ré-audit Back Office Admin — versi-immobilier.fr

**Date** : 2026-04-11
**Auditeur** : @reviewer
**Type** : Ré-audit post-corrections (audit initial : 7.4/10 GO CONDITIONNEL)
**Scope** : API server.js + Frontend admin (src/admin/*) + Hooks publics (src/hooks/*) + BDD (db.js, scripts/*)
**Specs de référence** : docs/product/vi-backoffice-specs.md

---

## Note globale et verdict

**Note globale : 8.8 / 10** (delta : +1.4 vs audit initial 7.4/10)

**Verdict : GO CONDITIONNEL**

Les corrections de securite sont excellentes : token httpOnly cookie SameSite=Strict, comparaison timing-safe du mot de passe, validation server-side reelle de la taille des photos (calcul base64 au lieu de faire confiance au client). Le P0-1 (endpoints GET single-item manquants) est corrige et fonctionnel. Les corrections design/UX (focus-visible, toast succes, nav active, responsive mobile, bouton suppression photo accessible) sont toutes en place.

Cependant, 5 ecarts avec les specs empechent le 10/10 :
1. `price_num` non requis dans la validation (frontend + serveur) — ecart spec section 4.4
2. Pas de message succes apres creation/edition d'un bien/realisation — ecart spec section 4.8
3. Select statut biens affiche les valeurs brutes ("disponible") au lieu de labels humains ("Disponible")
4. Cookie sans flag `Secure` — necessaire en production HTTPS
5. `fileToBase64` dupliquee dans 2 fichiers — dette technique mineure

**Conditions pour 10/10** : corriger les 5 points ci-dessous (estimes a ~30 min de travail total).

---

## Vérification des corrections P0/P1 signalées dans l'audit initial

### P0-1 : Endpoints GET single-item manquants — CORRIGE

**Avant** : `GET /api/admin/properties/:id` et `GET /api/admin/projects/:id` n'existaient pas. L'edition etait cassee.
**Apres** : Les deux endpoints sont presents et fonctionnels (server.js L427 et L751). Retournent `{ ok: true, property/project: {...}, photos: [...] }` avec gestion 404 et 500. Routes placees apres GET liste et avant POST — ordre Express correct.

### P1-1 : price_num non requis frontend — NON CORRIGE

**Fichier** : `src/admin/AdminBienForm.jsx:173`
**Etat** : `required = ['title', 'city', 'location', 'type', 'surface', 'price', 'description']` — price_num toujours absent.
**Spec 4.4** : "Champs obligatoires (*) : title, city, location, type, surface, price, **price_num**, description"
**Impact** : Un bien peut etre cree sans prix numerique, cassant le tri/filtre public.

### P1-2 : price_num non valide serveur — NON CORRIGE

**Fichier** : `versi-immobilier/server.js:453`
**Etat** : La validation serveur verifie `!title || !city || !location || !type || !surface || !price || !description` — price_num absent. De plus, aucune validation que price_num est numerique cote serveur (seul le frontend fait `isNaN(Number(form.price_num))`).

### P1-3 : Pas de message succes apres creation/edition — NON CORRIGE

**Fichier** : `src/admin/AdminBienForm.jsx:234` et `src/admin/AdminRealisationForm.jsx:184`
**Etat** : Les deux font `navigate('/admin/biens')` ou `navigate('/admin/realisations')` sans passer de state. Le toast succes dans les listes est declenche uniquement par les actions locales (archiver, supprimer, restaurer), pas par un retour depuis le formulaire.
**Spec 4.8** : "Succes : Redirection vers /admin/biens + message 'Bien enregistre'"

### P1-4 : Log de notification email — AMELIORATION NON VERIFIEE (mineur V1)

Reste un fire-and-forget sans log recapitulatif, mais acceptable pour V1.

### P1-5 : DELETE subscribers hard delete — NON CORRIGE (mineur V1)

Ligne 1021 : toujours `DELETE FROM subscribers WHERE id = $1`. Le champ `active` reste inutilise. Coherent avec la spec section 7.5 qui dit "suppression manuelle" — dette technique mineure.

### Corrections de securite (4 P0 securite) — TOUTES CORRIGEES

| Correction | Statut | Detail |
|---|---|---|
| Token httpOnly cookie | CORRIGE | L275-276 : `Set-Cookie: vi_admin_token=...; HttpOnly; SameSite=Strict; Max-Age=28800; Path=/api/admin` |
| Comparaison timing-safe | CORRIGE | L258-261 : `crypto.timingSafeEqual(passwordBuffer, adminBuffer)` avec buffers de meme taille |
| Validation photo server-side reelle | CORRIGE | L659-664 et L927-932 : calcul `Math.ceil(base64Data.length * 3 / 4)` au lieu de faire confiance a `size_bytes` client |
| ProtectedRoute verifie serveur | CORRIGE | ProtectedRoute.jsx L17 : `fetch('/api/admin/me')` au lieu de verifier uniquement localStorage |

### Corrections design/UX (13 P0/P1 design) — TOUTES CORRIGEES

| Correction | Statut | Detail (fichier:ligne) |
|---|---|---|
| Focus-visible sur tous les interactifs | CORRIGE | admin.css L428-443 : `outline: 2px solid #111; outline-offset: 2px` |
| Toast succes (listes) | CORRIGE | admin.css L455-472 : `.admin-toast` avec animation fadeInOut |
| Nav active visible | CORRIGE | admin.css L475-480 : `font-weight: 600; border-bottom: 2px solid #111` |
| Responsive formulaires mobile | CORRIGE | admin.css L483-491 : `@media (max-width: 640px) { .form-row { flex-direction: column; } }` |
| Bouton suppression photo taille min | CORRIGE | admin.css L446-452 : 28x28px min au lieu de 20x20px |
| aria-label sur bouton suppression photo | CORRIGE | AdminBienForm.jsx et AdminRealisationForm.jsx : `aria-label="Supprimer cette photo"` |
| NavLink avec isActive | CORRIGE | AdminLayout.jsx L25-33 : NavLink de react-router-dom avec className dynamique |

---

## Re-notation des 8 critères

| # | Critère | Audit 1 | Ré-audit | Delta | Justification |
|---|---|---|---|---|---|
| 1 | Conformité aux specs | 7 | **9** | +2 | P0-1 corrigé (32/32 endpoints). Restent P1-1/P1-2 (price_num) et P1-3 (message succès). |
| 2 | Cohérence API / Frontend | 6 | **9.5** | +3.5 | 21/21 appels frontend - serveur corrects. Noms de champs cohérents. |
| 3 | Cohérence admin / public | 9 | **9.5** | +0.5 | Hooks publics parfaits. ProtectedRoute vérifie le serveur. |
| 4 | Sécurité | 8 | **9.5** | +1.5 | httpOnly cookie, timing-safe compare, validation photo server-side réelle. Manque uniquement flag `Secure` pour HTTPS. |
| 5 | Gestion d'erreurs | 8 | **8.5** | +0.5 | 5 états UI quasi-complets. Message succès formulaire toujours manquant (P1-3). |
| 6 | Complétude | 7 | **9** | +2 | 21/21 user stories PASS (édition fonctionne). Photo reorder API sans UI = V1 acceptable. |
| 7 | Qualité du code | 7 | **7.5** | +0.5 | Design CSS propre, patterns cohérents, ProtectedRoute amélioré. fileToBase64 toujours dupliquée. |
| 8 | Intégration projet global | 8 | **8.5** | +0.5 | Cookie sécurisé, fallback SPA inchangé. Hooks publics rétrocompatibles. |

**Note globale ré-audit : 8.8 / 10** (moyenne pondérée : critères 1/2/4/6 à poids supérieur car corrections majeures)

---

## Problèmes restants pour 10/10

### R1 (P1) : price_num non requis — frontend + serveur

**Impact** : Un bien peut être créé sans prix numérique, cassant le tri/filtre du site public.
**Correction précise** :

**Fichier 1** : `src/admin/AdminBienForm.jsx:173`
```javascript
// AVANT
const required = ['title', 'city', 'location', 'type', 'surface', 'price', 'description'];

// APRES
const required = ['title', 'city', 'location', 'type', 'surface', 'price', 'price_num', 'description'];
```

**Fichier 2** : `versi-immobilier/server.js:453`
```javascript
// AVANT
if (!title || !city || !location || !type || !surface || !price || !description) {

// APRES
if (!title || !city || !location || !type || !surface || !price || !description) {
    return res.status(400).json({ ok: false, error: 'Champs requis manquants (title, city, location, type, surface, price, description)' });
  }
  if (price_num == null || isNaN(Number(price_num))) {
    return res.status(400).json({ ok: false, error: 'price_num est requis et doit être un nombre' });
  }
```

---

### R2 (P1) : Message succès absent après création/édition

**Impact** : L'admin ne sait pas si l'enregistrement a fonctionné (la redirection seule est ambigue).
**Spec 4.8** : "Succès : Redirection vers /admin/biens + message 'Bien enregistré'"
**Correction précise** :

**Fichier 1** : `src/admin/AdminBienForm.jsx:234`
```javascript
// AVANT
navigate('/admin/biens');

// APRES
navigate('/admin/biens', { state: { success: isEdit ? 'Bien modifié.' : 'Bien créé.' } });
```

**Fichier 2** : `src/admin/AdminRealisationForm.jsx:184`
```javascript
// AVANT
navigate('/admin/realisations');

// APRES
navigate('/admin/realisations', { state: { success: isEdit ? 'Réalisation modifiée.' : 'Réalisation créée.' } });
```

**Fichier 3** : `src/admin/AdminBiens.jsx` — ajouter après ligne 2 :
```javascript
import { Link, useLocation } from 'react-router-dom';
```
Et dans le composant, ajouter :
```javascript
const location = useLocation();
useEffect(() => {
  if (location.state?.success) {
    showSuccess(location.state.success);
    window.history.replaceState({}, '');
  }
}, [location.state]);
```
Idem pour `AdminRealisations.jsx`.

---

### R3 (P2) : Select statut biens affiche les valeurs brutes

**Impact** : UX mineure — "disponible" au lieu de "Disponible".
**Correction précise** :

**Fichier** : `src/admin/AdminBienForm.jsx:369`
```javascript
// AVANT
{STATUS_VALUES.map((s) => <option key={s} value={s}>{s}</option>)}

// APRES — Ajouter en haut du fichier (après STATUS_VALUES) :
const STATUS_LABELS = { disponible: 'Disponible', archive: 'Archivé', vendu: 'Vendu' };

// Puis ligne 369 :
{STATUS_VALUES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
```

---

### R4 (P2) : Cookie sans flag Secure

**Impact** : En production HTTPS, le cookie peut être transmis en clair sur une connexion HTTP non sécurisée.
**Correction précise** :

**Fichier** : `versi-immobilier/server.js:276` et `server.js:292`
```javascript
// AVANT
`vi_admin_token=${sessionId}; HttpOnly; SameSite=Strict; Max-Age=${8 * 60 * 60}; Path=/api/admin`

// APRES
`vi_admin_token=${sessionId}; HttpOnly; SameSite=Strict; Max-Age=${8 * 60 * 60}; Path=/api/admin${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
```
Appliquer le meme changement aux 2 occurrences (login L276 et logout L292).

---

### R5 (P2) : fileToBase64 dupliquée

**Impact** : Dette technique — meme fonction dans AdminBienForm.jsx:37-44 et AdminRealisationForm.jsx:27-34.
**Correction précise** :

**Nouveau fichier** : `src/admin/utils.js`
```javascript
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```
Puis remplacer dans les deux formulaires :
```javascript
import { fileToBase64 } from './utils.js';
```
Et supprimer la fonction locale dans chaque fichier.

---

## Synthèse des corrections appliquées vs restantes

| Catégorie | Appliquées | Restantes |
|---|---|---|
| P0 fonctionnel (endpoints manquants) | 1/1 | 0 |
| P0 sécurité (4 corrections) | 4/4 | 0 |
| P1 design/UX (13 corrections) | 13/13 | 0 |
| P1 fonctionnel (specs) | 0/3 | 3 (R1, R2, R3) |
| P2 technique | 0/2 | 2 (R4, R5) |
| **Total** | **18/23** | **5** |

## Verdict final

**8.8 / 10 — GO CONDITIONNEL**

Le back office est passé de 7.4 a 8.8 (+1.4 points). Les corrections critiques (securite + P0 fonctionnel) sont toutes appliquées. Le système est opérationnel pour les 3 fondateurs.

**Pour atteindre 10/10** : corriger les 5 points restants (R1-R5). Estimation : ~30 minutes de travail. Aucun n'est bloquant pour un usage interne V1, mais R1 (price_num) et R2 (message succès) sont les plus impactants pour l'UX admin.

**Priorité de correction** :
1. **R1** (price_num) — conformité spec, impact tri/filtre public
2. **R2** (message succès) — conformité spec, feedback UX
3. **R3** (labels statut) — polish UX
4. **R4** (cookie Secure) — sécurité production
5. **R5** (fileToBase64) — dette technique
