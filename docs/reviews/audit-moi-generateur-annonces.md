# Audit @moi — Générateur d'annonces back office versi-immobilier.fr

> Produit par @moi | Date : 2026-04-12
> Fichiers audités : AdminBienForm.jsx, AdminBienForm.css, adminFetch.js, AdminPage.jsx, AdminLoginForm.jsx, server.js (endpoint generate-listing)

---

## Note globale : 7/10 — ITÉRER

---

## A. Parcours utilisateur : 7/10

**Ce qui marche :**
- Flow logique : remplir → cliquer "Générer" → éditer → publier. Un MDB entre 2 visites comprend.
- Bouton "Générer l'annonce" bien visible, centré, label clair.
- Spinner + "Génération en cours..." donne un feedback correct.
- Mention "Renseignez au minimum l'adresse. Plus vous remplissez de champs, meilleure sera l'annonce générée." — bon guidage.
- Champs générés (titre, description) restent éditables.
- Géocodage auto-remplit ville + CP — gain de temps.

**Ce qui cloche :**
- **Pas de Nav ni Footer.** Préférence fondateur documentée : "Nav + Footer du site public sur les pages admin". Manquement direct.
- **Le bouton "Enregistrer le bien" ne fait rien** — `alert()` JS natif. Amateur.
- **Seule l'adresse est obligatoire.** Type et surface devraient être marqués "recommandés" visuellement.
- **Pas de bouton "Régénérer".** Si le résultat ne plaît pas, pas de moyen évident de relancer.
- **Pas d'annulation** si on efface le titre par erreur.

## B. Qualité du prompt et de la réponse : 8/10

**Ce qui marche :**
- Prompt bien structuré : 5 sections (accroche, description, quartier, points forts, potentiel).
- Règles négatives bonnes : pas de "bel appartement", pas de "proche commodités", pas de superlatifs creux.
- Mise en forme (paragraphes sans titres) donne un texte directement publiable.
- Géocodage API Adresse gouv.fr fiable et gratuit.
- Claude claude-sonnet-4-6, max_tokens 1024 — adéquat.

**Ce qui cloche :**
- **Titre généré programmatiquement, pas par le LLM.** "Appartement — 68 m² — Lille" = générique.
- **Risque hallucination quartier.** Le LLM "déduit" les infos quartier sans données réelles. Peut inventer des stations de métro inexistantes.
- **Géocodage échoue silencieusement.** Pas de warning si adresse invalide.
- **Pas de format structuré (JSON).** Difficile de parser les sections individuellement.

## C. Intégration technique : 8/10

**Ce qui marche :**
- Variables CSS du design system bien utilisées.
- Convention BEM propre et maintenable.
- Responsive géré (2 cols → 1 col sous 600px).
- Auth cookie httpOnly (pas localStorage).
- `focus-visible` implémenté.

**Ce qui cloche :**
- **Bug : timeout 30s ne fonctionne pas.** `AbortController` créé mais `controller.signal` jamais passé à `anthropic.messages.create()`. L'appel peut tourner indéfiniment.
- **Bug : `adminFetch` crash sur réponse non-JSON.** Si le serveur renvoie du HTML (502), `res.json()` throw un SyntaxError incompréhensible.
- **Pas de protection double-clic** (partiellement couvert par `disabled` mais risque de race condition).
- **Sessions admin en mémoire** sans cleanup périodique.

## D. Ce que Thomas dirait : 7/10

1. "Le générateur marche bien, l'annonce est correcte, mais le titre généré est une blague. 'Appartement — 68 m² — Lille' c'est ce que je ferais en 2 secondes moi-même."
2. "L'alert() JavaScript sur 'Enregistrer le bien' c'est le truc le plus amateur qu'on puisse avoir."
3. "Où est la nav ? Où est le footer ? J'ai demandé ça explicitement."
4. "Le timeout de 30 secondes c'est du code mort — le signal n'est même pas passé à Anthropic."
5. "Le risque d'hallucination sur les infos quartier me gêne. Si on écrit 'métro ligne 1 à 200m' et que c'est faux, on passe pour des amateurs."

---

## Corrections classées

### P0 — Bloquant

1. **Bug timeout mort** — `controller.signal` jamais passé à `anthropic.messages.create()`. Timeout 30s ineffectif.
2. **Bug `adminFetch` crash sur réponse non-JSON** — `res.json()` avant vérification `res.ok`. Si 502 HTML → SyntaxError incompréhensible.

### P1 — Important

3. **Nav + Footer absents des pages admin** — Préférence fondateur documentée.
4. **Titre généré programmatiquement, pas par le LLM** — Le LLM doit générer un titre accrocheur.
5. **`alert()` sur "Enregistrer"** — Masquer ou désactiver le bouton.
6. **Risque hallucination quartier** — Avertissement après génération : "Infos quartier générées par IA — vérifiez avant publication."

### P2 — Cosmétique

7. **Pas de bouton "Régénérer"** après première génération.
8. **Géocodage échoue silencieusement** — Ajouter warning si adresse non reconnue.
9. **Champs recommandés non distingués** — Marquer surface et type comme "(recommandé)".
10. **Sessions admin sans cleanup** — Ajouter setInterval de purge.

---

## Verdict : 7/10 — ITÉRER

Les P0 sont des bugs techniques à fixer avant utilisation. Les P1 sont des points que Thomas remarquerait en 30 secondes. Après correction P0 + P1, le score monte à 9/10. La base est bonne, le prompt solide, l'architecture propre. Il manque la finition.
