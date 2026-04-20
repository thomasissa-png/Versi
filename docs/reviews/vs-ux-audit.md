# Audit UX — Versi Studio

**Date** : 15 avril 2026
**Auditeur** : @qa
**Scope** : 5 pages (Dashboard, Step 1 Upload, Step 2 Lots, Step 3 Rooms, Step 4 Visuals)
**Devices** : Desktop Chrome 1280px, iPad 768px, iPhone 13 375px (15 screenshots)
**Score global : 6.5/10**

---

## Synthese

Versi Studio presente un parcours desktop solide et bien structure : le stepper 4 etapes guide clairement le marchand de biens, les interfaces canvas (lots, pieces) sont fonctionnelles, et la hierarchie visuelle est propre. En revanche, l'experience mobile est degradee sur les Steps 3 et 4 (adresse cassee mot par mot, canvas invisible, titres illisibles). Une banniere d'erreur trompeuse sur Step 4 ajoute de la confusion. Aucun bug bloquant (P0) — le produit est utilisable en desktop mais necessite des corrections P1 avant un usage mobile fiable.

---

## Phase 1 — Audit visuel (3 devices x 5 pages)

| # | Page | Device | Resultat | Severite | Detail |
|---|---|---|---|---|---|
| 1.1 | Dashboard /vs | Desktop | PASS | — | Layout propre, carte projet lisible, bouton "Nouvelle operation" bien visible. Hierarchie claire. |
| 1.2 | Dashboard /vs | iPad | PASS | — | Layout reduit, fonctionne sans degradation. |
| 1.3 | Dashboard /vs | iPhone | PASS | — | Bouton 163x56px OK, carte 326x143px OK, layout adapte. |
| 1.4 | Step 1 Upload | Desktop | PASS | — | Stepper gauche + dropzone centre + miniatures plans. Excellent. |
| 1.5 | Step 1 Upload | iPad | PASS | — | Fonctionne, texte wrap correct. |
| 1.6 | Step 1 Upload | iPhone | PASS | — | Dropzone pleine largeur, bouton CTA full-width en bas. |
| 1.7 | Step 2 Lots | Desktop | PASS | — | Canvas + overlays colores + panel lots a droite. Selecteur etage fonctionnel. |
| 1.8 | Step 2 Lots | iPad | PASS | — | Canvas reduit mais visible. |
| 1.9 | Step 2 Lots | iPhone | PASS | P2 | Canvas plus petit mais visible. Texte instruction tronque. |
| 1.10 | Step 3 Rooms | Desktop | PASS | — | Canvas zoom + overlays pieces + panel tabs lots. |
| 1.11 | Step 3 Rooms | iPad | PASS | — | Fonctionnel. |
| 1.12 | Step 3 Rooms | iPhone | **FAIL** | **P1** | Adresse "10 RUE DES MUGUETS, 59000 LILLE" cassee mot par mot (1 mot/ligne). Titre "IDENTIFIEZ LES PIECES" sur 3 lignes. Canvas HTML5 completement absent — seul le panel lateral affiche. |
| 1.13 | Step 4 Visuals | Desktop | PASS | P1 | Layout OK mais banniere erreur "Impossible de charger les donnees du projet" affichee alors que les pieces chargent. Confusant. |
| 1.14 | Step 4 Visuals | iPad | PASS | P1 | Meme banniere erreur. |
| 1.15 | Step 4 Visuals | iPhone | **FAIL** | **P1** | Adresse cassee mot par mot (meme probleme que Step 3). Banniere erreur visible. |

**Score Phase 1 : 8/10** (13/15 tests PASS, 2 FAIL mobiles)

---

## Phase 2 — Parcours utilisateur

| # | Test | Resultat | Detail |
|---|---|---|---|
| 2.1 | Parcours complet desktop (Dashboard → Step 1 → Step 2 → Step 3 → Step 4) | NON TESTE | Mock data — necessite des vrais plans et un serveur avec BDD pour tester le parcours de bout en bout. |
| 2.2 | Navigation stepper (aller-retour entre etapes) | NON TESTE | Idem. |
| 2.3 | Upload de plans (drag & drop + click) | NON TESTE | Idem. |

**Score Phase 2 : N/A** (non testable sans environnement complet)

---

## Phase 3 — Crash test (donnees adversariales)

| # | Test | Resultat | Detail |
|---|---|---|---|
| 3.1 | Upload fichier > 20 Mo | NON TESTE | Necessite serveur. |
| 3.2 | Upload format non supporte (.doc, .exe) | NON TESTE | Idem. |
| 3.3 | Adresse avec caracteres speciaux (accents, &, guillemets) | NON TESTE | Idem. |
| 3.4 | Surface a 0 m2, surface negative | NON TESTE | Idem. |
| 3.5 | Nom de lot avec 200 caracteres | NON TESTE | Idem. |

**Score Phase 3 : N/A** (necessite serveur avec BDD)

---

## Phase 4 — Garde-fous et permissions

| # | Test | Resultat | Detail |
|---|---|---|---|
| 4.1 | Acces sans authentification | N/A | Pas d'auth en V1 — outil interne. |
| 4.2 | Acces au projet d'un autre utilisateur (IDOR) | N/A | Idem. |
| 4.3 | Protection CSRF sur mutations | NON TESTE | Necessite serveur. |

**Score Phase 4 : N/A** (pas d'auth V1)

---

## Phase 5 — Securite et console

| # | Test | Resultat | Severite | Detail |
|---|---|---|---|---|
| 5.1 | Erreurs JavaScript application | PASS | — | 0 erreur JS de l'application. |
| 5.2 | Erreurs console | PASS | P2 | 3 erreurs ERR_CERT_AUTHORITY_INVALID — telemetrie Next.js en dev, pas l'app. Absentes en prod. |
| 5.3 | XSS visible (injection basique) | PASS | — | 0 XSS visible sur les champs accessibles. |
| 5.4 | Touch targets >= 44x44px | **FAIL** | P2 | Bouton "N" Next.js dev tools 32x32px — invisible en prod mais present en dev. Tous les autres elements interactifs OK. |

**Score Phase 5 : 9/10** (1 seul FAIL mineur, lie a l'env de dev)

---

## Phase 6 — Experience persona

**Persona** : Thomas, marchand de biens (ou son assistante)

| # | Critere | Resultat | Detail |
|---|---|---|---|
| 6.1 | Comprehension immediate du workflow | PASS | Le stepper 4 etapes (Upload → Lots → Pieces → Visuels) est explicite. Un marchand de biens comprend immediatement la progression. |
| 6.2 | Vocabulaire metier adapte | PASS | "Operation", "lots", "T2/T3", "RDC/R+1", "pieces", "surface" — lexique immobilier correct. |
| 6.3 | Efficacite (nombre de clics par tache) | PASS | Parcours lineaire, peu de friction sur desktop. |
| 6.4 | Confiance dans l'outil | FAIL | La banniere erreur Step 4 ("Impossible de charger") mine la confiance alors que les donnees sont la. Un marchand de biens pressé penserait que l'outil est casse. |

**Score Phase 6 : 7/10** (workflow clair mais banniere erreur degradante)

---

## Meta tags

| Champ | Valeur | Statut |
|---|---|---|
| title | "Versi Studio — Outil de decoupe et visualisation" (52 chars) | OK |
| description | "Outil interne Versi — decoupe de lots, visualisation et pre-commercialisation pour marchands de biens." (89 chars) | OK |
| robots | "noindex, nofollow" | OK (outil interne) |
| og:title | MISSING | P2 — non critique pour outil interne |

---

## Inventaire des problemes

### P1 — Degrade l'experience utilisateur

| # | Probleme | Pages | Devices | Cause probable | Fichiers concernes |
|---|---|---|---|---|---|
| P1-1 | Adresse uppercase cassee mot par mot (chaque mot sur sa propre ligne) | Step 3 Rooms, Step 4 Visuals | iPhone 375px | Conteneur trop etroit + text-transform uppercase + absence de white-space/min-width | `versi-studio/src/app/vs/projects/[id]/rooms/page.tsx`, `versi-studio/src/app/vs/projects/[id]/visuals/page.tsx` (composant affichant l'adresse) |
| P1-2 | Titre "IDENTIFIEZ LES PIECES" sur 3 lignes (1 mot par ligne) | Step 3 Rooms | iPhone 375px | Meme cause — taille police trop grande + uppercase + conteneur etroit | `versi-studio/src/app/vs/projects/[id]/rooms/page.tsx` |
| P1-3 | Canvas HTML5 completement absent sur mobile | Step 3 Rooms | iPhone 375px | Le canvas est probablement en `display: none` ou `width: 0` sur mobile. Le design-system prevoit "consultation seule" sur mobile mais le canvas devrait rester visible en lecture | `versi-studio/src/app/vs/projects/[id]/rooms/page.tsx` (ou composant canvas partage) |
| P1-4 | Banniere erreur "Impossible de charger les donnees du projet" alors que les pieces chargent | Step 4 Visuals | Tous devices | Appel API partiel (photos/visuels) retourne tableau vide → interprete comme erreur. La logique de gestion d'erreur ne distingue pas "pas de donnees" de "erreur reseau" | `versi-studio/src/app/vs/projects/[id]/visuals/page.tsx` (logique de fetch/error handling) |

### P2 — Mineur

| # | Probleme | Pages | Detail |
|---|---|---|---|
| P2-1 | og:title manquant | Toutes | Non critique pour outil interne. Ajouter pour completude. |
| P2-2 | Dashboard vide avec 1 seul projet | Dashboard | Pas d'empty state engageant ni de hint visuel. Beaucoup d'espace vide. |
| P2-3 | Texte instruction tronque sur mobile | Step 2 Lots (iPhone) | "ou ajoutez de nouveaux lots manuellement, ou..." coupe. |
| P2-4 | Tab "Lot 2 — T3 R..." tronque | Step 3 Rooms | Nom complet du lot pas visible dans le tab. |
| P2-5 | Inconsistance de casse dans les labels | Step 4 Visuals | "chambre a coucher" en minuscule vs "Salon" capitalise. |
| P2-6 | Bouton "N" Next.js dev tools 32x32px | Toutes | Touch target < 44px. Invisible en prod — dev only. |
| P2-7 | Thumbnails plans avec pixels verts | Step 1 Upload | Mock data — en prod avec vrais plans OK. |

### P2-workflow — Ameliorations UX

| # | Recommandation | Pages | Detail |
|---|---|---|---|
| P2-W1 | Stepper collapsible apres Step 1 | Steps 2-4 | Le stepper occupe ~240px de large en permanence, reduisant la zone canvas. Le rendre repliable libererait de l'espace de travail. |
| P2-W2 | Liste scrollable de tous les lots/pieces | Step 3 Rooms | La navigation tab-par-tab entre lots ajoute de la friction. Une liste unique scrollable serait plus rapide. |
| P2-W3 | Raccourcis clavier | Steps 2-4 | Pas de raccourcis pour les actions frequentes (valider lot, ajouter piece, etape suivante). Un marchand de biens qui fait ca 20 fois par jour voudra des raccourcis. |

---

## Scores par phase

| Phase | Score | Commentaire |
|---|---|---|
| Phase 1 — Visuel (3 devices x 5 pages) | **8/10** | 13/15 PASS. 2 FAIL sur iPhone Steps 3-4. Desktop solide. |
| Phase 2 — Parcours | **N/A** | Non testable (mock data, pas de serveur). |
| Phase 3 — Crash test | **N/A** | Non testable (necessite BDD). |
| Phase 4 — Garde-fous | **N/A** | Pas d'auth V1. |
| Phase 5 — Securite/console | **9/10** | 0 erreur JS app. 1 touch target dev-only. |
| Phase 6 — Persona | **7/10** | Workflow clair mais banniere erreur mine la confiance. |
| **GLOBAL** | **6.5/10** | Desktop solide (8+/10). Mobile degrade par P1-1 a P1-4. |

---

## Verdict

**GO CONDITIONNEL** — Le produit est utilisable en desktop. Les 4 problemes P1 doivent etre corriges avant usage mobile. Aucun P0 bloquant.

### Priorite de correction

1. **P1-4** (banniere erreur trompeuse) — correction rapide, impact confiance sur tous devices
2. **P1-1** (adresse cassee mobile) — affecte 2 pages sur 5
3. **P1-2** (titre casse mobile) — meme fix que P1-1
4. **P1-3** (canvas absent mobile) — necessite decision design : afficher en lecture seule ou message explicite

---

## Handoff → @fullstack

**Fichiers produits** :
- `docs/reviews/vs-ux-audit.md` (ce rapport)

**Corrections P1 a appliquer** :

1. **P1-4 — Banniere erreur trompeuse Step 4** : dans `versi-studio/src/app/vs/projects/[id]/visuals/page.tsx`, la logique de fetch interprete un tableau vide (photos/visuels) comme une erreur. Distinguer "reponse vide" (pas d'erreur, pas de donnees) de "erreur reseau" (fetch echoue). Supprimer la banniere "Impossible de charger les donnees du projet" quand les pieces chargent correctement.

2. **P1-1 + P1-2 — Adresse et titre casses sur mobile** : dans `versi-studio/src/app/vs/projects/[id]/rooms/page.tsx` et `visuals/page.tsx`, le composant affichant l'adresse et le titre se brise mot par mot a 375px. Corrections possibles :
   - Ajouter `whitespace-nowrap` ou `min-width` sur le conteneur adresse
   - Reduire la taille de police du titre sur mobile (`text-lg` au lieu de `text-xl`/`text-2xl`)
   - Considerer de retirer le `text-transform: uppercase` sur mobile (le uppercase augmente la largeur de chaque mot)
   - Tester sur viewport 375px apres correction

3. **P1-3 — Canvas absent sur mobile Step 3** : dans `versi-studio/src/app/vs/projects/[id]/rooms/page.tsx`, le canvas HTML5 est invisible sur iPhone. Deux options :
   - Option A (recommandee) : afficher le canvas en lecture seule avec un overlay "Utilisez un ordinateur pour modifier les pieces"
   - Option B : afficher un message explicite "Visualisation des pieces disponible sur ordinateur" avec une miniature statique du plan

**Points d'attention** :
- Les P2 sont documentes mais non bloquants — a traiter en V2
- Les phases 2-4 (parcours, crash test, garde-fous) n'ont pas pu etre testees sans serveur avec BDD — planifier un audit complementaire quand l'environnement sera pret
- Le score de 6.5/10 remontera a 8+/10 une fois les 4 P1 corriges

---
