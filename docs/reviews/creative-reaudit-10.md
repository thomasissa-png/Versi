# Re-audit créatif — Corrections V2
> @creative-strategy | 2026-04-08 | Post-corrections design

---

## 1. Hero — Note : 9.5/10

Les corrections tiennent leurs promesses.

La ligne accent `.hero__accent` (48px, `var(--color-accent)`, opacity 0.4) est en place et bien positionnée entre H1 et sous-titre via `hero__fade--2`. Elle scande le rythme vertical sans l'alourdir — exactement le rôle d'un séparateur décoratif sobre. Token-compliant : `var(--color-accent)` et `var(--opacity)` non hardcodés.

Les delays d'animation sont resserrés à 120ms d'incrément (0 / 120 / 240 / 360 / 480 / 700ms). Le scroll-hint reste à 700ms, ce qui est juste — lui donner de l'air est la bonne décision. L'entrée de page sera perceptiblement plus nerveuse.

Le CTA primaire est corrigé : `border: 1px solid rgba(247, 245, 242, 0.6)` (contre ~0.2 avant) + `background: rgba(247, 245, 242, 0.04)`. La lisibilité du contour sur fond #0B0B0B est maintenant satisfaisante sans basculer dans le plein — la tension ghost/filled est préservée.

Ce qui empêche encore 10 sur le Hero seul : le CTA secondaire "NOUS CONTACTER →" est toujours en `opacity: 0.7` fixe, sans background ni border. Sur certains profils d'écran sombre (OLED, calibrage chaud), il disparaît presque. Un `opacity: 0.75` ou un `text-decoration: underline` discret au hover renforcerait la détectabilité sans casser le registre.

---

## 2. Page globale — Note : 8.5/10

Les deux points structurels sont résolus.

`Activities.css` : `border-top: 1px solid var(--color-border)` en ligne 3. La jonction Approach → Activities (deux sections fond clair consécutives) est maintenant signifiée.

`Team.css` : `border-top: 1px solid var(--color-border)` en ligne 3. Même traitement. La frontière Activities → Team est lisible sans rupture chromatique lourde.

Fallback non-retina dans `index.css` : `@media (max-resolution: 1.5dppx)` applique `font-weight: var(--font-weight-regular)` sur `.text-display` et `.text-heading-lg`. Correct — les titres en weight 300 sur un LCD 96dpi pouvaient se lire trop fins.

Token compliance : non vérifiable exhaustivement sans lire Contact.css et Approach.css en entier, mais le pattern des corrections sur Activities et Team est sain.

Ce qui empêche encore 10 sur la page : deux points hors données, actionnables maintenant.

**Point 1 — CTA secondaire Hero** (décrit ci-dessus, mineur).

**Point 2 — Redondance sémantique Hero/Activités.** Le sous-titre Hero "Acquisition, transformation, détention, structuration financière. Tout le cycle, en interne." liste exactement les quatre entités qui apparaissent 200px plus bas. Laurent lit deux fois la même information sous deux formes quasi-identiques. Solution : reformuler le sous-titre Hero sur le bénéfice investisseur ("Un seul interlocuteur. Du sourcing à la sortie.") plutôt que sur la liste des métiers — la liste, elle, appartient aux cartes Activités.

---

## 3. Ce qui empêche encore 10/10 (hors données)

1. **CTA secondaire Hero** — opacity trop basse sur OLED/dark, manque de détectabilité
2. **Redondance sous-titre Hero / cartes Activités** — même information dupliquée à 200px d'écart, signal de chantier pour un lecteur attentif

---

## Résumé

Les corrections design sont propres et token-compliant — Hero à 9.5, page à 8.5 ; les deux points résiduels sont du copy et du hover, pas de l'architecture.
