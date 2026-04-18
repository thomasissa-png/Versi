# Review — Bannière IA Étape 2 (Lots)
> @creative-strategy | Session s22 | 2026-04-18
> Fichier concerné : `versi-studio/src/app/vs/projects/[id]/lots/page.tsx` lignes 806-819

---

## Verdict

**Supprimer la bannière. Elle nuit plus qu'elle n'aide.**

---

## Justification

**1. Thomas ne lit pas les bannières — il agit.**
Le persona Versi Studio est un marchand de biens qui traite 8-12 opérations par an. À l'Étape 2, il arrive avec un objectif unique : vérifier que les lots extraits sont corrects et valider. Toute bannière entre le header de page et la zone de travail est une couche d'attention qu'il consomme sans bénéfice. Il sait que l'IA a généré les lots — il vient de passer l'Étape 1.

**2. Le message est redondant avec ce qu'il voit.**
Les lots sont visibles dans le canvas et dans le panneau latéral. La bannière dit "l'IA a pré-créé N lots" — information que le visuel délivre déjà en 0 seconde. Expliquer ce qui est déjà visible = bruit.

**3. "Vérifiez chaque lot et validez en 1 clic ou globalement" est une instruction inutile.**
Thomas n'a pas besoin qu'on lui explique ce qu'il voit à l'écran. Les boutons de validation sont là, l'interface parle. Paraphraser l'interface avec des mots, c'est sous-estimer l'utilisateur — et c'est le registre des onboarding génériques qu'on a précisément décidé d'éviter.

**4. Le principe "no AI > bad AI" s'applique ici.**
La bannière ne valide pas la qualité de l'extraction — elle dit juste qu'elle a eu lieu. Si l'extraction est mauvaise, la bannière devient contre-productive (elle a mis en avant un résultat décevant). Si elle est bonne, le visuel le prouve seul. Dans les deux cas, la bannière n'apporte rien.

**5. Contraire au ton de marque Versi Studio.**
Brand voice : "direct, zéro blabla, pas de commentaire superflu". Une bannière d'information contextuelle qui répète ce que l'interface montre est exactement ce que "zéro blabla" interdit. Le texte actuel ("Vérifiez chaque lot et validez en 1 clic ou globalement") a la syntaxe d'une interface grand public, pas d'un outil pro.

---

## Ce qui devrait remplacer la bannière : rien

Pas de reformulation. Pas de toast. Pas de badge. Le passage de l'Étape 1 à l'Étape 2 signale déjà l'extraction IA. Les lots sont visibles. L'interface des boutons de validation est explicite. Le signal utilisateur utile est visuel et spatial, pas textuel.

**Exception acceptable : un indicateur d'état muet**
Si un signal technique est nécessaire (ex : distinguer "lots générés par IA" de "lots créés manuellement"), utiliser un badge discret sur chaque carte lot dans le panneau latéral — pas une bannière page. Exemple de microcopy acceptable sur badge : `IA` ou `Suggestion IA` — 2 mots, pas de phrase.

---

## Ce que la bannière aurait dû être si elle avait eu raison d'exister

La seule justification pour une bannière à cet endroit serait un message d'alerte métier — une information que Thomas ne peut pas inférer du visuel. Exemple hypothétique : "2 lots se chevauchent — à corriger avant validation." Là, la bannière est utile parce qu'elle signale un problème invisible au premier regard.

La bannière d'extraction IA ne remplit pas ce critère.

---

## Brief pour @fullstack

**Action requise : suppression**

- Fichier : `versi-studio/src/app/vs/projects/[id]/lots/page.tsx`
- Zone : lignes 806-819 (bloc `{/* U5 — Bannière feedback post-extraction IA (versi-s21 it2) */}`)
- Action : supprimer l'intégralité du bloc JSX conditionnel `{aiSuggestedLots.length > 0 && ( ... )}` et son commentaire
- Variables : la variable `aiSuggestedLots` reste présente dans le fichier si elle est utilisée ailleurs dans la logique (validation globale, comptage). Ne pas supprimer la variable — supprimer uniquement le rendu JSX de la bannière.
- Risque : zéro régression UX — aucun autre composant ne dépend de l'affichage de cette div. Le canvas et le panneau latéral fonctionnent indépendamment.
- Test à faire : vérifier qu'après suppression, l'Étape 2 s'affiche correctement avec le canvas en pleine zone disponible, sans saut visuel là où la bannière était.

---

**Handoff → @fullstack**
- Fichiers produits : `docs/copy/s22-review-banniere-ia-step2.md`
- Décision prise : suppression de la bannière IA Étape 2 — pas de reformulation, pas de remplacement
- Points d'attention : ne pas supprimer la variable `aiSuggestedLots` si elle est utilisée dans la logique de validation globale. Supprimer uniquement le bloc JSX de la bannière (lignes 806-819). Vérifier l'absence de saut visuel après suppression.
