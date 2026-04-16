# Audit @copywriter — Etape 0 Dashboard

> Fichier audité : `versi-studio/src/app/vs/page.tsx`
> Persona : Thomas, 35 ans, marchand de biens — utilisateur quotidien de l'outil
> Date : 2026-04-16

| # | Critere | Note /10 | Justification | Correction exacte (si < 10) |
|---|---|---|---|---|
| C1 | Francais correct | 8/10 | Le français est globalement correct. Un point de friction : "Surface totale (m2, optionnel)" — le "m2" devrait s'écrire "m²" (exposant). Mineur mais visible dans l'UI. Pas de faute d'accord ni de typo par ailleurs. | `Surface totale (m2, optionnel)` → `Surface totale (m², optionnel)` |
| C2 | 0 jargon tech | 9/10 | Aucun terme technique visible utilisateur (pas de "fetch", "API", "state", "render"). Seul bémol marginal : le label "Brouillon" pour le statut `draft` est un terme de workflow inhabituel pour un marchand de biens — il désigne plutôt un état non finalisé au sens rédactionnel. Thomas dirait "En cours" ou "À traiter". | `STATUS_LABELS.draft` : `"Brouillon"` → `"En cours"` |
| C3 | Ton brand-voice | 7/10 | Le ton est correct mais neutre — fonctionnel sans être incarné. Deux faiblesses : (1) L'état vide "Aucune opération. Créez-en une pour commencer." est plat, presque scolaire. La marque est directe et confiante, pas froide. (2) "Chargement..." est générique — le contexte mérite un micro-copy qui rassure sur ce qui se charge. Pas de faute de ton grave, mais le brand voice "direct avec du caractère" n'est pas là. | (1) `"Aucune opération. Créez-en une pour commencer."` → `"Aucune opération pour l'instant. Lance ta première opération."` (2) `"Chargement..."` → `"Chargement de tes opérations..."` |
| C4 | CTA clairs | 9/10 | Les CTAs sont bons dans l'ensemble. "Nouvelle opération" et "Créer l'opération" disent exactement ce qui va se passer. "Annuler" est limpide. Le toggle du bouton header (Nouvelle opération / Annuler) est propre. Seul point d'attention : le clic sur une carte ProjectCard navigue vers `/upload` sans que ce soit annoncé — le bouton n'a pas de label d'action ("Ouvrir" ou "Continuer"). Thomas clique sur la carte sans savoir qu'il entre dans l'opération. | `ProjectCard` : ajouter une indication visuelle ou micro-texte `"Continuer →"` dans la carte pour indiquer l'action au clic |
| C5 | Messages erreur utiles | 7/10 | Deux messages d'erreur en situation : (1) chargement échoué : "Impossible de charger les opérations." + bouton "Réessayer" — correct, actionnable. (2) création échouée : "Impossible de créer l'opération." — trop vague. Thomas ne sait pas si c'est un problème réseau, un doublon d'adresse, ou autre. (3) Validation adresse : "L'adresse doit contenir au moins 5 caractères." — message technique, pas utile. Thomas sait ce qu'est une adresse. | (2) `"Impossible de créer l'opération."` → `"La création a échoué. Vérifie ta connexion et réessaie."` (3) `"L'adresse doit contenir au moins 5 caractères."` → `"Saisis une adresse complète pour continuer."` |

**Score global** : 8/10

**Corrections @fullstack** (priorité décroissante) :

1. `versi-studio/src/app/vs/page.tsx:284` — `"Surface totale (m2, optionnel)"` → `"Surface totale (m², optionnel)"`
2. `versi-studio/src/app/vs/page.tsx:179` — `"L'adresse doit contenir au moins 5 caractères."` → `"Saisis une adresse complète pour continuer."`
3. `versi-studio/src/app/vs/page.tsx:205` — `"Impossible de créer l'opération."` → `"La création a échoué. Vérifie ta connexion et réessaie."`
4. `versi-studio/src/app/vs/page.tsx:24` — `draft: "Brouillon"` → `draft: "En cours"`
5. `versi-studio/src/app/vs/page.tsx:142` — `"Aucune opération. Créez-en une pour commencer."` → `"Aucune opération pour l'instant. Lance ta première opération."`
6. `versi-studio/src/app/vs/page.tsx:105` — `"Chargement..."` → `"Chargement de tes opérations..."`
7. `versi-studio/src/app/vs/page.tsx:348-381` (ProjectCard) — Ajouter un micro-texte ou flèche `"Continuer →"` pour signaler que la carte est cliquable et ouvre l'opération

---

**Handoff → @fullstack**
- Fichier audité : `versi-studio/src/app/vs/page.tsx`
- Score : 8/10 — bon niveau de base, 7 corrections mineures
- Top 3 corrections bloquantes : (1) message de validation adresse trop technique (ligne 179), (2) message erreur création trop vague (ligne 205), (3) état vide sans caractère brand-voice (ligne 142)
- Verdict : GO avec corrections — aucun problème bloquant, tout est corrigeable en < 15 min
