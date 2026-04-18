# Bugfix P1 — Étape 1 suppression plan ne persiste pas après reload (versi-s22)

**Date** : 2026-04-18
**Session** : versi-s22
**Rapporteur** : Thomas (test Replit, version live)
**Symptôme** : « À l'Étape 1, supprimer un plan ne fonctionne plus une fois qu'on relance la session. »

Comportement observé : DELETE d'un plan semble réussir (le plan disparaît de la grille immédiatement), mais réapparaît après un F5 / réouverture du projet.

## Fichiers impactés

- `versi-studio/src/app/api/vs/projects/[id]/plans/route.ts` (GET liste plans)
- `versi-studio/src/app/api/vs/plans/[id]/route.ts` (DELETE / PATCH plan)
- `versi-studio/src/app/vs/projects/[id]/upload/page.tsx` (fetch initial Étape 1)

## Cause racine — H2 (principal) + H1 (défense en profondeur)

**Chaîne du bug** :

1. **Page Étape 1 charge la liste des plans** via `fetch('/api/vs/projects/.../plans')` — sans option `cache`. Le navigateur applique ses heuristiques HTTP par défaut et **met la réponse en cache**.
2. **Utilisateur supprime un plan** : `DELETE /api/vs/plans/[id]` part bien jusqu'en base, le plan est physiquement supprimé. Le state React filtre l'élément localement → il disparaît de la grille.
3. **Reload (F5)** : le `useEffect` rejoue le `fetch` GET. Le navigateur **réutilise la réponse cachée précédente** (qui contenait encore le plan), bypassant le serveur.
4. **Le plan réapparaît**. Aucun appel n'est arrivé jusqu'au handler GET.

Hypothèse H3 (DELETE non exécuté côté serveur) écartée : la suppression DB est bien réalisée, c'est uniquement le rafraîchissement de la liste qui sert une donnée périmée.

## Fix appliqué — 2 corrections ciblées

### Fix 1 — `cache: 'no-store'` sur les fetch initiaux (page upload)

`versi-studio/src/app/vs/projects/[id]/upload/page.tsx` (lignes 71-76) :

```tsx
// cache: 'no-store' obligatoire — sans ça, le HTTP cache du navigateur
// peut servir une liste de plans périmée après une suppression (bug s22).
const [projectRes, plansRes] = await Promise.all([
  fetch(`/api/vs/projects/${projectId}`, { cache: "no-store" }),
  fetch(`/api/vs/projects/${projectId}/plans`, { cache: "no-store" }),
]);
```

### Fix 2 — `force-dynamic` sur les Route Handlers plans (défense en profondeur)

`versi-studio/src/app/api/vs/projects/[id]/plans/route.ts` et `versi-studio/src/app/api/vs/plans/[id]/route.ts` :

```ts
export const dynamic = "force-dynamic";
export const revalidate = 0;
```

Garantit que Next.js 16 ne pré-rend ni ne cache jamais ces handlers, même en cas de configuration ISR future ou de proxy intermédiaire (Replit, CDN).

## Test manuel à exécuter par Thomas

1. Ouvrir une opération existante avec au moins 1 plan déposé.
2. Cliquer sur la croix d'un plan, confirmer la suppression dans la modale.
3. Vérifier que le plan disparaît de la grille (état immédiat).
4. **Faire F5 / recharger la page** (ou fermer/rouvrir le projet via la liste).
5. **Le plan supprimé NE doit PAS réapparaître**.
6. Refaire l'expérience en uploadant 3 plans, en supprimant le plan du milieu, puis en rechargeant : seuls les 2 autres doivent rester.

## Brief @qa — test E2E

Ajouter un test Playwright dans `versi-studio/tests/e2e/` couvrant le flow upload → delete → reload :

```ts
test("plan supprimé ne réapparaît pas après reload (régression s22)", async ({ page }) => {
  // 1. Créer un projet, naviguer sur /vs/projects/[id]/upload
  // 2. Uploader un plan (fixture PDF/PNG)
  // 3. Attendre la grille avec 1 plan
  // 4. Cliquer "Supprimer", confirmer la modale
  // 5. Attendre la grille vide
  // 6. await page.reload()
  // 7. await expect(page.getByTestId("plan-thumbnail")).toHaveCount(0)
});
```

Critère de PASS : le test échoue avant le fix (plan réapparaît au reload), passe après.

## Périmètre signalé hors-scope (PR séparé recommandé)

D'autres pages effectuent des `fetch` GET sans `cache: 'no-store'` sur des ressources qui changent au cours de la session :

- `versi-studio/src/app/vs/projects/[id]/lots/page.tsx` (lignes 94-96)
- `versi-studio/src/app/vs/projects/[id]/rooms/page.tsx` (lignes 79-81, 109)
- `versi-studio/src/app/vs/projects/[id]/visuals/page.tsx` (lignes 70-71, 94, 143)

Risque équivalent (mutation suivie d'un reload affichant un état périmé). À traiter dans un PR dédié — non corrigé ici pour rester focus sur le bug remonté par Thomas.

## Validation build

```
npx tsc --noEmit  → OK
npm run build     → OK (toutes les routes API plans listées en ƒ Dynamic)
npm run lint      → 2 erreurs pré-existantes dans reference-existant/ (hors scope)
```
