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

_A remplir_

---

## Problèmes restants pour 10/10

_A remplir_

---

## Verdict final

_A remplir_
