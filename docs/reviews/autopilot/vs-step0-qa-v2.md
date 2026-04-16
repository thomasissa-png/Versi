# Re-audit @qa v2 — Dashboard Versi Studio Etape 0

Fichier audite : `versi-studio/src/app/vs/page.tsx` (413 lignes)
Reference v1 : `docs/reviews/autopilot/vs-step0-qa.md` (score 7.6/10)

## Corrections appliquees depuis v1 (verification)

| Correction v1 | Localisation v2 | Statut | Commentaire |
|---|---|---|---|
| P1 — Empty state vouvoye | page.tsx:155 ("Creez votre premiere operation") | OK | Vouvoiement applique |
| P2 — h2 `vs-h3` + sous-titre | page.tsx:246-247 | OK | `<h2 className="vs-h3">` + "Renseignez les informations de base..." |
| P3 — STATUS_COLORS mapping + fallback | page.tsx:32-38 + 405 (`??`) | OK | 5 statuts mappes, fallback neutre |
| P4 — Sous-titre H1 differenciateur | page.tsx:87 | OK | "Decoupez vos plans, identifiez les lots..." |
| R1 — Message erreur POST vouvoye | page.tsx:235 ("Verifiez votre connexion...") | OK | Vouvoiement applique |
| C3 — Borne surface (partielle) | page.tsx:208-210 | AMELIORE | Borne 0-100000 cote JS + `Number.isFinite` (ligne 205) — mieux que v1 mais pas d'attributs HTML `max={100000}` `step={1}` ni `maxLength={200}` sur adresse |

## Tableau comparatif v1 vs v2

| # | Critere | v1 | v2 | Justification v2 |
|---|---|---|---|---|
| C1 | 0 bug visible | 8/10 | 8/10 | Aucun changement sur le `finally` (ligne 64-66). L'etat intermediaire "erreur + spinner" reste possible si abort simultane a une erreur. AbortController propre, keys correctes, cleanup OK. Le bug initial reste mineur — pas bloquant en production mais pas corrige. |
| C2 | Etats UI 5/5 | 9/10 | 9/10 | Default/loading/vide/erreur OK. Succes : toujours implicite via redirection (ligne 77 `router.push`) — aucun toast, aucun `?created=1`. Thomas ne voit pas de confirmation "operation creee" avant la redirection. Ameliore en sous-critere : l'empty state est maintenant parfaitement vouvoye (P1). |
| C3 | Validation inputs | 6/10 | 7.5/10 | Progres reels : `Number.isFinite(parsed)` (ligne 205) protege contre NaN/Infinity, borne `< 0 \|\| > 100000` explicite (ligne 208) cote JS avec message d'erreur clair (ligne 209). MAIS toujours absents : `maxLength={200}` sur adresse (ligne 264-279), `max={100000}` et `step={1}` sur input surface (ligne 317-331). Un utilisateur peut toujours coller une adresse de 100 KB. Le `type="number"` HTML accepte les decimaux sur certains navigateurs. La dedup espaces multiples n'est pas faite. |
| C4 | Feedback actions | 8/10 | 8/10 | Submit disabled OK, retry OK, Annuler OK. Pas de changement sur le focus management : `showForm` (ligne 105) n'entraine pas de focus automatique sur le premier champ `adresse` (ligne 264). Probleme a11y clavier persistant — l'utilisateur doit Tab manuellement. |
| C5 | Erreurs gerees | 7/10 | 7/10 | Aucun changement structurel. `res.ok` n'est toujours pas verifie (ligne 53 GET, ligne 221 POST). Pas de timeout fetch sur GET (ligne 53) — spinner infini possible si le serveur hang 60s. Pas de retry auto 503. Pas de messages contextuels par status code (503 vs 404 vs 500 → tous le meme message generique). Le message d'erreur POST est maintenant vouvoye (R1) — ameliore le ton mais pas la robustesse. |
| C6 | Accessibilite clavier | (implicite dans C4) | 7.5/10 | **Nouveau critere explicite**. focus-visible present sur les boutons (ligne 97, 346, 385) OK. `aria-hidden="true"` sur svg (ligne 145) OK. Labels `htmlFor` correctement associes (ligne 259, 285, 312) OK. MANQUANT : pas de `aria-busy` pendant le loading (ligne 115-120) pour screen readers, pas de `role="alert"` ni `aria-live="assertive"` sur le bandeau d'erreur (ligne 123-133, 249-253) — un utilisateur screen reader ne saura pas qu'une erreur s'est affichee. Pas de `aria-label` sur le bouton retry (ligne 126-131) — "Reessayer" seul sans contexte. Touch targets boutons OK (px-lg py-sm > 44px). |
| C7 | Sortie tsc/lint | (non mesuree v1) | 10/10 | `npx eslint src/app/vs/page.tsx` → 0 erreur, 0 warning. `npx tsc --noEmit` sur le projet → aucune erreur dans ce fichier (les 4 erreurs tsc du projet sont dans `architect-agent.ts`, `plan-extractor.ts`, `visual-generator.ts` — modules `openai`/`pdf-to-img` absents — hors perimetre d'audit). Le dashboard est clean. |

## Score global v2 : **8.1/10**

Calcul : (8 + 9 + 7.5 + 8 + 7 + 7.5 + 10) / 7 = 57 / 7 = **8.14/10**

Progression v1 → v2 : 7.6 → 8.1 (+0.5). Les 6 corrections ont ete appliquees proprement, mais 3 des 5 critiques v1 (C1 finally, C2 succes, C4 focus, C5 robustesse) ne sont pas couvertes.

## Verdict : **PAS GO 10/10 — GO conditionnel pour Etape 1**

- GO 10/10 : non — 4 points residuels (C2 succes, C3 validation HTML5, C4 focus, C5 robustesse HTTP) restent a < 9.
- GO 9/10 : non — score global 8.1 reste en dessous du seuil 9.
- GO pour Etape 1 : **conditionnel**. Le code est fonctionnel, sans bug bloquant, TS/lint clean. Mais 4 chantiers QA restent ouverts pour atteindre le standard 9/10.

## Verifications TypeScript/Lint

- `cd versi-studio && npx tsc --noEmit` sur le fichier audite → **0 erreur** dans `page.tsx`. Les 4 erreurs globales du projet sont dans `architect-agent.ts:11`, `plan-extractor.ts:8-9`, `visual-generator.ts:7` (modules `openai` et `pdf-to-img` absents du `package.json`) — **hors perimetre**.
- `cd versi-studio && npx eslint src/app/vs/page.tsx` → **0 erreur, 0 warning**.
- Lint projet global : 15 errors + 38 warnings dans d'autres fichiers (`VisualResult.tsx`, `VisualRoom.tsx`, tests e2e). A traiter separement.

## Points residuels (score < 9)

| Priorite | Critere | Point | Correction exacte |
|---|---|---|---|
| **P1** | C5 | `res.ok` non verifie sur GET et POST, messages d'erreur generiques identiques pour 404/500/503, pas de timeout fetch (spinner infini possible), pas de retry auto sur 503 | page.tsx:49-67 — ajouter : `const timeoutId = setTimeout(() => controller.abort(), 10000); if (!res.ok) { if (res.status === 503) { setError("Service temporairement indisponible, reessayez dans quelques secondes."); return; } if (res.status === 404) { setError("Endpoint introuvable — contactez le support."); return; } setError(\`Erreur serveur (\${res.status}). Reessayez ou contactez le support.\`); return; }` + clearTimeout dans finally. Meme traitement ligne 221-226 pour POST. Retry auto 1x apres 2s sur 503. |
| **P1** | C3 | Pas de `maxLength={200}` sur input adresse (DoS possible avec 100 KB colles), pas de `max={100000}` ni `step={1}` sur input surface (HTML n'applique pas la borne cote client, decimaux acceptes sur certains navigateurs) | page.tsx:264-279 — ajouter `maxLength={200}` sur input adresse. page.tsx:317-331 — ajouter `max={100000}` et `step={1}` sur input surface. Optionnel : `inputMode="numeric"` pour mobile. |
| **P2** | C4 | Pas de focus automatique sur `adresse` a l'ouverture du formulaire — l'utilisateur clavier doit Tab 3-4 fois pour arriver au champ | page.tsx:187-240 — dans `CreateProjectForm`, ajouter `const adresseRef = useRef<HTMLInputElement>(null);` et `useEffect(() => { adresseRef.current?.focus(); }, []);` (le composant est monte uniquement quand showForm=true, donc le focus s'applique a chaque ouverture). Ajouter `ref={adresseRef}` sur l'input ligne 264. |
| **P2** | C2 | Pas de feedback visuel de succes post-creation — Thomas voit juste une redirection silencieuse | page.tsx:75-78 — Option A (toast) : integrer un toaster (ex: sonner ou react-hot-toast) et appeler `toast.success('Operation creee avec succes')` avant `router.push`. Option B (URL param) : `router.push(\`/vs/projects/\${project.id}/upload?created=1\`)` + lire ce parametre sur la page destination pour afficher un bandeau de confirmation. |
| **P2** | C6 | Accessibilite screen readers : bandeau d'erreur non annonce, etat loading non signale | page.tsx:115-120 — ajouter `role="status"` et `aria-live="polite"` sur le bloc loading. page.tsx:123-133 — ajouter `role="alert"` et `aria-live="assertive"` sur le bandeau d'erreur. page.tsx:249-253 — idem sur le bandeau d'erreur du formulaire. page.tsx:126 — ajouter `aria-label="Reessayer le chargement des operations"` sur le bouton retry. |
| **P3** | C1 | `finally` de `fetchProjects` garde un etat ambigu — si abort ET erreur simultanes, setLoading peut ne pas etre appele correctement | page.tsx:64-66 — restructurer : `finally { if (signal?.aborted) return; setLoading(false); }` (deja fait de facon equivalente, mais placer la verification abort en debut de finally clarifie la logique). |

## Matrice de tracabilite (Gate G27)

Aucun test E2E ou integration n'a ete ecrit pour ce Dashboard. Les user stories implicites (creer une operation, lister les operations, gerer les erreurs serveur) n'ont pas de test correspondant dans `tests/e2e/` ni `tests/integration/`. A traiter dans une session dediee @qa avant deploiement Etape 1.

## Handoff

---
**Handoff → @orchestrator**

- Fichiers produits : `/home/user/Versi/docs/reviews/autopilot/vs-step0-qa-v2.md`
- Score v2 : **8.1/10** (progression +0.5 vs v1)
- Verdict : **PAS GO 9/10** — 4 chantiers residuels (C5 robustesse HTTP, C3 validation HTML5, C4 focus, C2 feedback succes) empechent d'atteindre 9/10
- TypeScript/Lint sur le fichier audite : **0 erreur** — le code est propre
- Decisions prises : les 6 corrections appliquees sont validees ; les points C1/C2succes/C4/C5 du v1 ne sont PAS couverts par ces 6 corrections et restent ouverts
- Points d'attention :
  - P1 — C5 (gestion erreurs HTTP + timeout + retry 503) bloque un GO 9/10
  - P1 — C3 (`maxLength`/`max`/`step` HTML5) bloque un GO 9/10
  - Les 4 erreurs tsc globales du projet (modules `openai`, `pdf-to-img` absents) sont **hors perimetre** de cet audit mais doivent etre traitees avant tout deploiement (Gate G28)
  - Aucun test E2E n'existe pour le Dashboard (Gate G27 FAIL)
- Prochaine action recommandee : relancer @fullstack avec les 4 corrections P1/P2 ci-dessus, puis re-audit v3 pour viser 9.5/10
---
