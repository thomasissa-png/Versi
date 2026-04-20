# Étape 2 — Rework message de statut post-détection IA

> Produit par @copywriter | Session s23 | 2026-04-19
> Framework : UX writing — message d'état + instruction
> Niveau de conscience : Thomas connaît le produit, il est dans l'outil — Message-Aware

---

## 1. Diagnostic du message actuel

"L'IA a pré-créé 1 lot depuis votre plan. Vérifiez chaque lot et validez en 1 clic ou globalement."

**Cinq problèmes identifiés :**

1. "A pré-créé" — passif + jargon. L'IA n'est pas un brouillon, c'est une analyse.
2. "1 lot" — pluralisation impossible dès qu'on passe à N lots. La phrase doit être paramétrée.
3. Deux instructions dans une phrase ("vérifiez" + "validez") — l'œil ne sait pas où aller.
4. "En 1 clic ou globalement" — l'adverbe ne remplace pas un label de bouton. Le bouton dit "Valider" : répéter le verbe suffit.
5. Aucune hiérarchie visuelle suggérée : statut et instruction sont traités à plat.

---

## 2. Trois variantes

### Variante A — Titre / sous-texte (hiérarchie en deux niveaux)

**Titre (statut) :** `{N} lot(s) détecté(s) par l'IA`
**Sous-texte (instruction) :** `Vérifiez les contours, puis validez.`

- Wording exact : 10 mots au total
- Hiérarchie : titre = fait / sous-texte = action
- Ton : factuel, direct

> Note : cette variante nécessite que le N soit dynamique côté code.

---

### Variante B — Phrase unique, active, paramétrée

**Message unique :**
- 1 lot : `L'IA a détecté 1 lot. Vérifiez les contours et validez.`
- N lots : `L'IA a détecté {N} lots. Vérifiez les contours et validez.`
- 0 lot : `Aucun lot détecté. Ajoutez-les manuellement.`

- Wording exact : 9-11 mots selon cas
- Hiérarchie : point + point (deux phrases courtes)
- Ton : factuel, sans atténuation

---

### Variante C — Orientée action, statut en secondaire

**Titre (action) :** `Vérifiez les lots détectés par l'IA`
**Sous-texte (statut + suite) :** `{N} lot(s) tracé(s) sur votre plan. Ajustez si besoin, puis validez.`

- Wording exact : 14 mots au total
- Hiérarchie : action principale en titre / statut + nuance en sous-texte
- Ton : actionable, guidant

---

## 3. Recommandation finale

**Variante A** — titre + sous-texte.

**Pourquoi :**
- Sépare clairement le statut (ce que l'IA a fait) de l'instruction (ce que Thomas doit faire).
- Le titre est scannable en 2 secondes — Thomas sait immédiatement combien de lots ont été trouvés.
- Le sous-texte est une instruction, pas une explication. Zéro redondance avec les boutons de l'interface.
- Respect du brand voice : factuel-élégant, zéro passif, une idée par phrase.
- Compatible avec le placement "au-dessus du plan, à côté des actions" sans surcharger la zone.

**Wording final recommandé :**

| Zone | Texte |
|---|---|
| Titre | `{N} lot détecté` / `{N} lots détectés` |
| Sous-texte | `Vérifiez les contours, puis validez.` |

---

## 4. Variantes par nombre de lots détectés

| Cas | Titre | Sous-texte |
|---|---|---|
| **0 lot** | `Aucun lot détecté` | `Tracez les lots manuellement, puis validez.` |
| **1 lot** | `1 lot détecté` | `Vérifiez les contours, puis validez.` |
| **N lots (N ≥ 2)** | `{N} lots détectés` | `Vérifiez les contours, puis validez.` |

**Règle pluriel :** "lot détecté" / "lots détectés" — jamais de parenthèses `(s)`, jamais de "1 lot(s)". Le N est injecté dynamiquement par @fullstack.

**Cas 0 lot — précision :** l'instruction change. On ne dit pas "vérifiez" car il n'y a rien à vérifier — on oriente vers l'action de création ("Ajouter un lot"). Le sous-texte pointe vers le bon bouton.

---

## 5. Coordination avec @ux

Le livrable `docs/ux/s23-etape2-layout-rework.md` définit le placement de cette zone.

**Contraintes à respecter côté @ux :**
- Le titre doit être hiérarchiquement supérieur au sous-texte (H3 ou équivalent visuel).
- Le sous-texte est informatif, pas un CTA — il ne porte pas de lien ni de bouton embarqué.
- Les actions ("Valider", "Ajouter un lot", "Calibrer") restent dans leur zone de boutons, séparées de ce message.
- Le message 0-lot doit visuellement différencier l'état "vide" (pas de couleur de succès — état neutre).

---

**Handoff → @fullstack**
- Fichier produit : `/home/user/Versi/docs/copy/s23-etape2-message-rework.md`
- Décisions prises : titre dynamique `{N} lot(s) détecté(s)` + sous-texte fixe / 3 cas gérés (0, 1, N)
- Points d'attention :
  - La variable `{N}` doit être injectée côté serveur — jamais hardcodé
  - Le cas 0 lot a un sous-texte différent des cas 1 et N : implémenter les 3 branches
  - Zéro parenthèses `(s)` dans le rendu final — pluralisation par condition if/else
  - Coordonner le placement avec `docs/ux/s23-etape2-layout-rework.md` (@ux)
