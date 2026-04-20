# Audit UX — Étape 4 Visuels (US-VS-19/20/21/22) v1
**Session** : versi-s19 | **Date** : 2026-04-16 | **Persona** : Thomas marchand de biens (outil INTERNE)

---

## 1. Synthèse exécutive

**Note globale : 6,9/10**
**Verdict : NO-GO** — 3 findings P0 bloquants avant Batch 2

---

## 2. Cinq dimensions notées

### D1 — Parcours et frictions utilisateur : 7/10

Ce qui fonctionne : le séquencement upload → sélection style → génération → résultat est clair et linéaire. La machine d'états `RoomSubState` est propre (`upload | select-style | generating | result | chat`). Le bouton "Créer le visuel" n'apparaît qu'après sélection d'un style (disabled absent mais conditionnel correct — `{selectedStyleId && <button>}`). La persistance du chat en localStorage est un plus discret mais bienvenu.

Findings :

- **F01 (P0)** `VisualRoom.tsx:613-629` — Le bouton "Créer le visuel" n'a pas d'état `disabled` explicite avec `focus-visible` pendant le loading : il disparaît entièrement (conditionnel `{selectedStyleId && ...}`), ce qui prive Thomas du feedback "la génération est en cours" si l'état `generating` est atteint sans que le bouton soit encore retiré de l'écran. Surtout : si `isGenerating = true` mais `selectedStyleId` reste non null, le bouton réapparaît après un retour de polling. Le bouton devrait toujours être rendu mais `disabled={isGenerating}` en toutes circonstances, pas conditionnel à `selectedStyleId`.

- **F02 (P1)** `VisualRoom.tsx:604-610` — La miniature photo (état `select-style`) affiche la première photo (`photos[0]`) sans permettre de la changer. Les specs US-VS-19 (ligne 935-942) prévoient jusqu'à 3 photos par pièce avec sélection de celle à utiliser. Aucun lien "Changer la photo" ni liste multi-photos présent. Thomas qui a 2 angles différents ne peut pas en changer sans supprimer et re-uploader.

- **F03 (P1)** `VisualRoom.tsx:619` — Le label du bouton est "Créer le visuel" alors que le reste de l'interface utilise "visuel généré" / "Créez vos visuels" (page:344). Pas critique mais `h2` page.tsx:344 dit "Créez vos visuels", le bouton dit "Créer le visuel" — cohérent. En revanche, `VisualResult.tsx:239` dit "Modifier" (action du bouton Itérer) alors que spec ligne 898 dit "Itérer". Le bouton principal d'action dans l'état `generated` devrait s'appeler "Itérer" pour coller aux spec et à la nomenclature de l'agent architecte.

- **F04 (P1)** `VisualRoom.tsx:568` — L'état `upload`, le message dit "Déposez une photo ici" mais accepte aussi un clic. Les deux affordances ne sont pas mentionnées simultanément : "Déposez ou sélectionnez une photo" serait plus clair pour Thomas sur mobile qui n'utilise pas le drag-and-drop.

- **F05 (P1)** Rate limit 10 générations/heure : non géré côté UI. L'API retourne `RATE_LIMIT_EXCEEDED` (status 429, spec ligne 1025). Le handler `handleGenerate` (VisualRoom:292-323) propage `json.error` via `setError(json.error)` — donc la string brute d'erreur API s'affiche (probablement "RATE_LIMIT_EXCEEDED" en majuscules). Il manque un mapping d'erreur lisible : "Limite de génération atteinte — réessayez dans X minutes". La spec ligne 1044 le décrit explicitement comme toast orange avec durée résiduelle.

---

### D2 — 5 états UI par écran interactif (G21) : 6,5/10

**Mapping spec → code :**

| État spec | Composant | Implémenté | Qualité |
|---|---|---|---|
| Défaut (grille pièces, invitation) | `page.tsx:432-454` | Oui | Correct — icône + texte "Sélectionnez une pièce" |
| Loading initial | `page.tsx:245-261` | Oui (partiel) | Spinner global + texte OK. Le skeleton ne couvre pas le `RoomGrid` — le panneau apparaît vide pendant le chargement |
| Vide (aucune pièce) | `page.tsx:292-323` | Oui | Correct — message + bouton "Retour aux pièces" min-h-[44px] absent |
| Erreur globale | `page.tsx:348-381` | Oui | Banner d'erreur avec icône + fermeture. Manque bouton "Réessayer" |
| Succès global (tout validé) | `page.tsx:384-420` | Oui | Banner vert + "Finaliser le projet". KPI déclenché correctement |
| Loading upload photo | `VisualRoom.tsx:544-548` | Oui | Spinner inline + "Dépôt en cours…" |
| Loading génération (90s) | `VisualResult.tsx:97-115` | Oui | Barre de progression + timer. **Manque : skeleton/aperçu flou** de la future image (spec l.895) |
| Erreur génération (failed) | `VisualResult.tsx:117-155` | Oui | Icône + message + "Réessayer" |
| Succès génération | `VisualResult.tsx:157-279` | Oui | Image + badge style + actions |
| État vide upload (pièce sans photo) | `VisualRoom.tsx:519-583` | Oui | Zone drag-and-drop avec icône |
| Erreur upload (fichier rejeté) | `VisualRoom.tsx:234-246` | Oui (partiel) | setError propagé mais mapping erreurs API absent (FILE_TOO_LARGE, INVALID_FORMAT non traduits) |

Findings :

- **F06 (P0)** `VisualResult.tsx:97-115` — État loading génération : la spec (ligne 895) prescrit un "aperçu flou/skeleton de la future image". L'implémentation n'a que la barre de progression + compteur — aucun skeleton visuel. Pour 90 secondes d'attente, l'absence de feedback spatial est une friction majeure pour Thomas. Correction : ajouter un bloc `div.w-full.h-64.bg-bg-card.animate-pulse.rounded-lg` au-dessus de la barre de progression pendant `isProcessing`.

- **F07 (P0)** `VisualRoom.tsx:234-246` — Erreurs upload non mappées : les codes API `FILE_TOO_LARGE`, `INVALID_FORMAT`, `ROOM_NOT_FOUND` s'affichent bruts en anglais si propagés tels quels. L'API route retourne un objet `{ error: "FILE_TOO_LARGE" }` — sans mapping côté composant, Thomas voit "FILE_TOO_LARGE" en texte rouge. Violation G33 (anglicismes client-facing) ET G21 (état erreur incomplet). Mapping obligatoire dans `handleUploadPhoto` avant `setError(json.error)`.

- **F08 (P1)** `page.tsx:348-381` — L'erreur globale n'a pas de bouton "Réessayer" (uniquement la croix de fermeture). Pattern identique à Étape 3 Pièces v1 (corrigé dans Batch 2 versi-s18). À aligner avec le pattern canonique Étape 2/3.

- **F09 (P1)** `VisualResult.tsx:140-143` — Le message d'erreur dans l'état `failed` affiche `activeVisual.error_message` brut, qui peut contenir une string technique OpenAI en anglais ("Content policy violation", "timeout exceeded"). Même problème que F07 — pas de mapping en français.

---

### D3 — Navigation et continuité Étapes 2/3 : 7,5/10

Ce qui fonctionne : le Stepper est présent avec `currentStep={4}` et `completedSteps={[1,2,3]}` (page:214-217). La navigation lot → pièce → visuel est persistée dans le state. Le retour aux pièces depuis l'état vide est direct (page:310-319). La sélection de lot est gérée par `handleSelectLot` avec reset du `selectedRoomId`.

Findings :

- **F10 (P1)** `page.tsx:331` — Sur mobile, le Stepper est masqué (`hidden sm:block`) mais sans alternative (pas de breadcrumb, pas d'indicateur d'étape). Thomas sur tablette perd son repère de navigation. À minima, un indicateur mobile minimal ("Étape 4/4 — Visuels") serait nécessaire. Pattern non documenté dans les specs mais cohérent avec le comportement Étape 3 identique (déjà relevé comme acceptable dans versi-s18).

- **F11 (P1)** `page.tsx:460-468` — Le `RoomGrid` reçoit uniquement `currentRooms` (pièces du lot sélectionné), pas `allRooms`. Thomas ne peut pas voir en un coup d'oeil la progression globale inter-lots sauf via les compteurs `totalRooms/validatedRooms`. L'historique scroll horizontal de `VisualResult` ne couvre que les visuels d'UNE pièce, pas la navigation inter-pièces dans un lot. Cohérent avec les specs (scope pièce par pièce) — P1 car Thomas devra naviguer manuellement entre pièces.

- **F12 (P2)** `VisualRoom.tsx:109-130` — Persistance chat localStorage : bonne initiative (non spécifiée dans les specs, mais pertinente). Le clé `vs-chat-${room.id}` est correcte. Point d'attention : si Thomas change de projet et revient sur une pièce d'un ancien projet avec le même `room.id` (UUID unique normalement), pas de collision — OK.

---

### D4 — Affordance et clavier : 6/10

Ce qui fonctionne : `StyleGrid.tsx` utilise des `<button>` natifs (donc Tab + Enter natifs). `aria-pressed` sur les cartes style (StyleGrid:38). `aria-label` sur la zone upload (VisualRoom:537). `onKeyDown` Enter/Space sur la zone upload (VisualRoom:536-542). ChatAgent : `Enter` envoie, `Escape` ferme (ChatAgent:62-69). Auto-focus à l'ouverture du chat (ChatAgent:51-53).

Findings :

- **F13 (P0)** `StyleGrid.tsx:38-103` — Les cartes style ont `focus-visible` absent. La classe `className` utilise un pattern conditionnel `border-2 border-interactive-primary` pour la sélection mais aucun `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary` sur les boutons. Thomas naviguant au clavier ne voit pas quel style est focusé. Correction : ajouter `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary` à la className de chaque bouton StyleGrid.

- **F14 (P1)** `VisualResult.tsx:220-253` — Les trois boutons d'action ("Valider ce visuel", "Modifier", "Essayer un autre style") utilisent `py-sm` ≈ 8px + texte 14px ≈ 30px total. Inférieur à 44px minimum mobile. Correction : ajouter `min-h-[44px]` sur les trois boutons.

- **F15 (P1)** `VisualResult.tsx:295-335` — Les vignettes historique utilisent `w-24` (96px) mais pas de `min-h-[44px]` explicite. La hauteur est `h-16` (64px) pour l'image + padding — total ~72px, donc OK pour le touch. En revanche, pas de `focus-visible` sur ces boutons d'historique.

- **F16 (P1)** `ChatAgent.tsx:183-246` — Le textarea et le bouton d'envoi n'ont pas de `focus-visible` explicite. Le textarea utilise `focus:border-interactive-primary` mais pas `focus-visible:outline-2` — le focus s'affiche différemment de la convention du design system.

- **F17 (P2)** `ChatAgent.tsx:86-100` — Le bouton "Fermer le chat" utilise `p-xs rounded-md` ≈ hauteur ~28px (icône 20px + padding 4px×2). Inférieur à 44px. Correction : `p-sm min-h-[44px] min-w-[44px]` ou passer à `p-md`.

---

### D5 — Cohérence DNA Étape 2/3 : 7,5/10

Ce qui fonctionne : tokens sémantiques cohérents (`bg-interactive-primary`, `text-text-inverse`, `border-border-default`, `focus-visible:outline-interactive-primary` quand présent). Le pattern "bannière erreur avec icône SVG + croix" est identique à Étape 3. Le stepper est partagé. L'en-tête avec `vs-label` (adresse) + `h1` uppercase est le même pattern. Registre "vous" absent des messages de l'interface (les textes sont en impératif neutre ou descriptif — conforme).

Findings :

- **F18 (P1)** `VisualResult.tsx:239` — Le bouton s'appelle "Modifier" (action secondaire pour lancer le chat) alors que la spec (l.898) et le pattern de l'Étape 3 ("Valider ce lot") utilisent des libellés alignés sur l'action réelle. "Modifier" est ambigu — modifier le style ? la photo ? l'instruction ? Le label spec est "Itérer" (l.898, l.1081). Correction : renommer en "Affiner le visuel" (plus explicite que "Itérer" tout en restant UX-friendly).

- **F19 (P1)** `VisualRoom.tsx:524` — Le texte "Ajoutez une photo de cette pièce" est en impératif — conforme au DNA ("vous" impératif neutre). Mais le placeholder du chat (ChatAgent:201) dit "Décrivez les modifications souhaitées..." — l'ellipse `...` à la fin n'est pas alignée avec le style éditorial (pas d'ellipses dans les autres placeholders du projet).

- **F20 (P2)** `VisualResult.tsx:191-212` — L'état `file_path === "placeholder"` (mode simulation sans OPENAI_API_KEY) affiche "Mode simulation — configurez OPENAI_API_KEY pour la génération réelle". Ce message est un message de debug développeur, pas un message utilisateur Thomas. En prod c'est invisible, mais si jamais la clé API n'est pas configurée en staging, Thomas verra ce message. Le message devrait être "Visuel non disponible — contactez le support." pour un outil interne.

- **F21 (P2)** `VisualRoom.tsx:569` — L'icône upload utilise une flèche vers le haut (`M3 16.5v2.25A2.25... M12 3v13.5`) — conventionnellement un upload. Mais "Déposez une photo ici" suggère un glisser-déposer, pas un upload depuis l'ordinateur. L'icône n'est pas confuse mais légèrement trompeuse. À considérer pour le Batch 2.5 si le temps le permet.

---

## 3. Findings consolidés

---

## 4. Gates

---

## 5. Handoff

