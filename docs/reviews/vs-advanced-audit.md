# Audit avance — Versi Studio

**Date** : 2026-04-15
**Auditeur** : @qa
**Complete** : docs/reviews/vs-ux-audit.md (audit rapide 6.5/10)
**Serveur** : localhost:3030
**Methode** : Playwright Chromium headless + lecture de code source

---

## Tests fonctionnels (Priorite 1)

| # | Test | Resultat | Severite | Detail |
|---|---|---|---|---|
| 1 | Deep linking `/vs/projects/FAKE-ID/upload` | **WARN** | P2 | UI affiche "Operation introuvable" + lien retour — bon. MAIS : HTTP 200 au lieu de 404, et 2 requetes API retournent 500 (au lieu de 400 car `ensureDbReady()` echoue avant `isValidUUID`). Erreurs console visibles. |
| 2a | URL traversal `/../admin` | PASS | — | Redirige vers `/vs/admin` → 404 Next.js. Pas de crash, pas de fuite. |
| 2b | URL `/projects/null/lots` | PASS | — | Affiche "Operation introuvable" proprement. 0 erreur JS. |
| 3 | Double-clic "Nouvelle operation" | PASS | — | Le bouton toggle `showForm` (pas un POST direct). Le form a `disabled={submitting}` sur le bouton Creer. Race condition theorique (fenetre entre clic et re-render React) mais risque faible. |
| 4 | Refresh mid-flow `/vs` | **FAIL** | **P1** | Le dashboard affiche "Impossible de charger les operations. Reessayer" — API `/api/vs/projects` retourne 500. La page est consistante apres refresh (meme erreur). Le probleme est que la DB est indisponible et l'erreur est generique — pas de distinction "DB down" vs "pas de donnees". |
| 5 | Back button dashboard → projet → back | PASS | — | `goBack()` revient bien sur `/vs`. Navigation coherente. |
| 6 | Empty state dashboard 0 projets | **FAIL** | **P1** | Jamais affiche en conditions reelles car l'erreur DB (500) masque l'etat vide. Quand DB est up, le code affiche "Aucune operation. Creez-en une pour commencer." — texte fonctionnel mais pas engageant (pas de CTA visuel, pas d'illustration, pas de "Creez votre premiere operation en 2 minutes"). |
| 7 | Console errors | **FAIL** | **P1** | Dashboard : 1 erreur (`Failed to load resource: 500`). Page projet inexistant : 2 erreurs (500 sur `/api/vs/projects/ID` et `/api/vs/projects/ID/plans`). Cause : toutes les API crashent sur `ensureDbReady()` quand la DB est indisponible au lieu de retourner un 503 propre. |

---

## Tests techniques (Priorite 2 — lecture de code)

| # | Test | Resultat | Severite | Detail |
|---|---|---|---|---|
| 8 | Sauvegarde localStorage/sessionStorage | **FAIL** | **P1** | 0 occurrence de `localStorage` ou `sessionStorage` dans `versi-studio/src/`. Aucune persistance client-side. Si le navigateur crash ou l'onglet est ferme, tout travail non sauvegarde en DB est perdu. Le chat agent est aussi uniquement en memoire React (perdu au refresh). |
| 9 | Idempotence POST | **WARN** | P2 | `POST /api/vs/projects` fait un INSERT a chaque appel — pas de deduplication par adresse/timestamp. Le bouton est `disabled` pendant la soumission mais pas de verrou cote serveur. Double POST rapide = 2 projets identiques en DB. Meme risque pour `POST /lots`, `POST /rooms`. |
| 10 | Race conditions (AbortController) | **FAIL** | **P1** | 0 occurrence d'`AbortController` dans le code. Les fetches ne sont pas annules lors des changements de composant. Le polling 5s de `VisualRoom` (setInterval) est cleanup via `clearInterval` dans useEffect return — OK. Mais les fetches one-shot (`fetchRoomData`, `fetchProjects`) ne sont pas annulables. Si la page change pendant un fetch, la reponse met a jour un composant demonte → warning React. |
| 11 | Actions irreversibles — confirmation | **FAIL** | **P1** | 0 occurrence de `confirm()` ou `window.confirm` dans le code. Les routes DELETE existent pour plans, lots et pieces (`DELETE /api/vs/plans/[id]`, `DELETE /api/vs/lots/[id]`, `DELETE /api/vs/rooms/[id]`). Aucune confirmation avant suppression. Un clic = suppression immediate et irreversible. |
| 12 | Memory leaks setInterval/setTimeout | PASS | — | Tous les timers sont correctement cleanup : `VisualRoom.tsx` clear dans useEffect return + `stopPolling()`. `VisualResult.tsx` clear dans le useEffect. `rooms/page.tsx` et `lots/page.tsx` clear les debounce timers. Pas de fuite detectee. |
| 13 | Drop hors zone (DropZone) | **FAIL** | P2 | `DropZone.tsx` ne gere le drop que sur sa propre div. Aucun `document.addEventListener('dragover/drop', preventDefault)` global. Si l'utilisateur drop un PDF en dehors de la zone, le navigateur ouvre le fichier dans l'onglet — perte du contexte de travail. |
| 14 | Styles @media print | **FAIL** | P2 | 0 occurrence de `@media print` dans le code. Aucune feuille d'impression. Si Thomas imprime un plan avec ses lots, il obtiendra le stepper, la sidebar et tout le chrome applicatif. Non critique en V1 (le PDF brande est prevu en V2). |

---

## Persona Thomas

| # | Scenario | Resultat | Detail |
|---|---|---|---|
| 15 | Cross-device (persistance) | **FAIL** | Pas de localStorage, pas de compte utilisateur (V1). Thomas ne peut pas commencer sur son PC de chantier et finir sur son bureau. Toutes les donnees sont en DB (si DB up) mais sans auth, pas d'identification cross-device. |
| 16 | Interruption / brouillon auto | **PASS partiel** | Les lots et pieces sont sauvegardes en DB via debounce 1s (optimistic UI). Si Thomas ferme l'onglet pendant l'etape 2 ou 3, ses modifications recentes sont conservees. MAIS : le chat agent (etape 4) est perdu au refresh (useState uniquement). Et si la DB est down, rien n'est sauvegarde. |
| 17 | Charge cognitive (stepper) | **PASS** | Le stepper affiche les 4 etapes avec l'etape courante surlignable. Les etapes precedentes restent accessibles par clic. La progression est claire. |
| 18 | First-time user (empty state) | **FAIL** | Le message "Aucune operation. Creez-en une pour commencer." est plat. Pas d'illustration, pas de proposition de valeur, pas de "Importez votre premier plan en 2 minutes". Thomas presse comprend ce qu'il faut faire mais n'est pas inspire. Pire : avec DB down, il voit "Impossible de charger les operations" — premier contact avec l'outil = message d'erreur. |
| 19 | Aha moment | **Step 2** | Thomas voit son plan avec les lots decoupes automatiquement et les couleurs. C'est la premiere fois que l'outil montre sa valeur. Step 4 (visuels) est le second aha moment mais requiert plus de travail (upload photo, choix style, attente generation). |

---

## Synthese des problemes

### P1 — Degrade l'experience utilisateur (corrections avant usage reel)

| # | Probleme | Impact | Fichiers concernes |
|---|---|---|---|
| P1-5 | DB indisponible → 500 generique partout, aucun 503 | Thomas voit "Impossible de charger" sans comprendre pourquoi. Pas de distinction DB down vs pas de donnees | Tous les fichiers dans `src/app/api/vs/` — le `ensureDbReady()` crash avant les guards |
| P1-6 | 0 localStorage — aucune persistance client | Chat agent perdu au refresh. Pas de brouillon local si DB down | `src/components/vs/ChatAgent.tsx`, `src/app/vs/page.tsx` |
| P1-7 | 0 AbortController — fetches non annulables | Warnings React sur composants demontes. Risque de mise a jour d'etat stale | Tous les composants avec fetch : `VisualRoom.tsx`, `page.tsx` (lots, rooms, visuals, dashboard) |
| P1-8 | 0 confirmation avant suppression (plan, lot, piece) | Un clic = suppression irreversible. Thomas supprime un lot par erreur → pas de recours | `src/app/vs/projects/[id]/lots/page.tsx`, `rooms/page.tsx`, `upload/page.tsx` (s'il y a un bouton supprimer) |

### P2 — Mineur / V2

| # | Probleme | Impact |
|---|---|---|
| P2-8 | POST non idempotent — doublons possibles | Risque faible (bouton disabled) mais pas de protection serveur |
| P2-9 | Drop hors zone → navigateur ouvre le fichier | Perte du contexte de travail si drop rate |
| P2-10 | 0 styles @media print | Impression inutilisable |
| P2-11 | Deep link HTTP 200 au lieu de 404 | SEO (non-applicable ici car noindex) mais incoherent |
| P2-12 | Empty state non engageant | Premiere impression fade |
| P2-13 | `isValidUUID` copie-colle dans 12 fichiers API | Risque de divergence. Extraire dans un utilitaire partage |

---

## Score

| Categorie | Score | Justification |
|---|---|---|
| Robustesse (T1-T7) | 5/10 | 3 FAIL sur 7. Tous lies a la DB (500 au lieu de 503, erreurs console, empty state masque). |
| Code defensif (T8-T14) | 4/10 | 4 FAIL sur 7. 0 localStorage, 0 AbortController, 0 confirm, 0 drop global. Seul le cleanup timers est correct. |
| Persona Thomas (T15-T19) | 5/10 | 2 FAIL, 1 PASS partiel. Cross-device impossible, empty state plat, mais stepper clair et debounce save OK. |

- **Audit rapide** : 6.5/10 (UI/visuel — desktop solide, mobile degrade)
- **Audit avance** : 4.5/10 (robustesse, code defensif, resilience)
- **Score combine** : 5.5/10 (le code fonctionne en conditions ideales mais manque de garde-fous pour les conditions reelles)

---

## Handoff → @fullstack

**Fichiers produits** :
- `docs/reviews/vs-advanced-audit.md` (ce rapport)

**Corrections P1 a appliquer (par ordre de priorite)** :

1. **P1-5 — Resilience DB** : dans `src/lib/vs/db.ts`, `ensureDbReady()` doit retourner un status clair. Chaque route API doit catch l'erreur DB et retourner HTTP 503 `{ success: false, error: "Service temporairement indisponible." }` au lieu de 500 generique. Le frontend doit afficher un message adapte ("Reconnexion en cours...") avec retry automatique.

2. **P1-8 — Confirmation suppression** : dans les pages lots et rooms, ajouter `if (!confirm('Supprimer ce lot ? Cette action est irreversible.')) return;` avant chaque appel DELETE. Alternative : soft delete (marquer `deleted_at` au lieu de supprimer) pour permettre un undo.

3. **P1-7 — AbortController** : dans chaque composant qui fait un fetch dans un useEffect, ajouter un `AbortController` et passer `{ signal }` au fetch. Cleanup dans le return du useEffect. Priorite : `VisualRoom.tsx`, dashboard `page.tsx`, lots `page.tsx`, rooms `page.tsx`.

4. **P1-6 — localStorage pour le chat** : dans `ChatAgent.tsx`, sauvegarder `chatMessages` dans `localStorage` avec la cle `vs-chat-{roomId}` et recharger au montage. Permet de ne pas perdre la conversation agent au refresh.

5. **P2-9 — Drop global** : dans `src/app/vs/layout.tsx`, ajouter un `useEffect` global :
   ```ts
   useEffect(() => {
     const prevent = (e: DragEvent) => { e.preventDefault(); };
     document.addEventListener('dragover', prevent);
     document.addEventListener('drop', prevent);
     return () => {
       document.removeEventListener('dragover', prevent);
       document.removeEventListener('drop', prevent);
     };
   }, []);
   ```

6. **P2-13 — Extraire isValidUUID** : creer `src/lib/vs/utils.ts` avec la fonction, importer partout au lieu de copier-coller.

**Points d'attention** :
- Le score combine 5.5/10 n'est pas alarmant pour une V1 en dev — les bugs sont tous lies a des garde-fous manquants, pas a de la logique metier cassee
- La DB doit etre up pour tester le parcours complet (phases 2-4 de l'audit rapide restent NON TESTEES)
- Le chat agent perdu au refresh est un irritant majeur pour Thomas qui itere sur des visuels (il perd tout son historique de conversation)
