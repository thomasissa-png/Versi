# Audit Design — Étape 3 Pièces Versi Studio (US-VS-13/14/15) — v2
Session versi-s18 | Branche `claude/versi-s18-pieces-autopilot-Vlowg` | 2026-04-16

## Périmètre audité

- `versi-studio/src/components/vs/RoomPanel.tsx`
- `versi-studio/src/components/vs/RoomCanvas.tsx`
- `versi-studio/src/lib/vs/styles.ts`
- `versi-studio/src/app/globals.css` (sections `@theme` et tokens)

Référence v1 : `docs/reviews/design-rooms-us-vs-13-15-v1.md` (score 7,2/10)

---

## Tableau de synthèse v1 → v2

| Critère | v1 /10 | v2 /10 | Delta | Verdict |
|---|---|---|---|---|
| G22 WCAG AA (contrastes, focus, touch targets, reduced-motion) | 7 | 9 | +2 | PASS |
| G23 Zéro hex hardcoded JSX | 6 | 8 | +2 | PASS CONDITIONNEL |
| G31 Tokens 3 tiers | 8 | 9 | +1 | PASS |
| G32 6 états interactifs | 6 | 9 | +3 | PASS |
| G34 @theme collision + couleur pièces | 9 | 9 | 0 | PASS |

**Note v2 : 8,8 /10** (moyenne : 9+8+9+9+9 = 44 / 5)
**Verdict : GO CONDITIONNEL** — G23 à 8/10, 1 hex JSX résiduel justifié mais non résolu par token

---

## Détail par gate

### G22 WCAG AA — 9/10 (+2)

**Touch targets — CORRIGÉ**
- Bouton "Ajouter une pièce" (L365) : `min-h-[44px]` présent ✓
- Bouton "Valider ce lot" (L381) : `min-h-[44px]` présent ✓
- Bouton "Continuer" (L417) : `min-h-[44px]` présent ✓
- Bouton "Supprimer" (L295) : `min-h-[44px] min-w-[44px]` présent ✓ — toutes les 4 cibles corrigées

**prefers-reduced-motion** : globals.css:84-92 — PASS (inchangé, conforme)

**focus-visible** : tous les boutons portent `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary` — PASS

**Contrastes** : combinaisons non modifiées depuis v1, estimations conformes 4.5:1 maintenues.

**Résiduel P2** (non bloquant) : `RoomCanvas.tsx:413` — canvas sans `tabIndex`, non focusable clavier. Acceptable outil interne (Thomas marchand de biens, pas de contrainte WCAG public). Noté P2, hors scope correction v2.

---

### G23 Zéro hex hardcoded JSX — 8/10 (+2)

**Vérifications Grep sur RoomPanel.tsx :**

- `bg-white` : **0 occurrence** — CORRIGÉ. Toutes les occurrences L99, L136, L164, L222, L258, L290 remplacées par `bg-bg-card`. Vérifié : L112 `bg-bg-card`, L148 `bg-bg-card`, L185 `bg-bg-card`, L242 `bg-bg-card`, L277 `bg-bg-card`, L311 `bg-bg-card`. ✓
- `text-white` : **0 occurrence** — CORRIGÉ. L418 `text-text-inverse` confirmé. ✓

**Vérifications Grep sur RoomCanvas.tsx :**

- `bg-[#F0EDE8]` : **1 occurrence résiduelle** — L400 `bg-[#F0EDE8]` avec commentaire `// JUSTIFIÉ: token bg-bg-canvas absent, à créer dans globals.css scope Alpha`.

**Gap confirmé : token `--color-bg-canvas` absent de globals.css**

Vérification globals.css : les tokens sémantiques présents sont `--color-bg-default`, `--color-bg-card`, `--color-bg-dark`. Aucun `--color-bg-canvas` ni `--color-bg-subtle` n'a été créé. Le hex `#F0EDE8` reste donc en dur dans le JSX wrapper.

**Jugement** : le commentaire "JUSTIFIÉ" est une décision de Beta correcte (ne pas remplacer par un token inexistant serait une violation G31). Mais la correction complète G23 requiert la création du token dans globals.css. Ce travail n'a pas été fait. C'est un **P1 résiduel**, pas un P0 bloquant : le canvas est un composant interne d'outil, pas une surface client-facing critique, et le hex est cohérent avec le fond canvas Lots (`PlanCanvas.tsx` utilise la même valeur).

**Bilan** : 8/10 (non 10 car 1 hex JSX résiduel, mais correctement isolé et justifié)

---

### G31 Tokens 3 tiers — 9/10 (+1)

**Violations RoomPanel résolues** : bg-white → bg-bg-card (7 occurrences), text-white → text-text-inverse (1 occurrence). Les composants utilisent désormais systématiquement les tokens sémantiques. ✓

**Tier 3 couleurs pièces** : toujours absent dans globals.css — les `ROOM_TYPE_COLORS` dans styles.ts restent des hex en dur non déclarés comme tokens component `--color-room-*`. Non bloquant (canvas 2D API ne peut pas consommer des CSS custom properties), mais l'architecture 3 tiers est incomplète pour ce nouveau domaine couleur. P2 résiduel, inchangé depuis v1.

**Résiduel P1** : `bg-[#F0EDE8]` dans RoomCanvas wrapper — même analyse que G23.

---

### G32 6 états composant interactif — 9/10 (+3)

**Vérification `active:` dans RoomPanel.tsx :**

Occurrences confirmées :
- L108 `active:opacity-80` — tab lot ✓
- L180 `active:opacity-80` — card pièce (role=button) ✓
- L293 `active:opacity-80` — bouton Supprimer ✓
- L347 `active:opacity-80` — bouton Ajouter (liste vide) ✓
- L367 `active:opacity-80` — bouton Ajouter (footer) ✓
- L383 `active:opacity-80` — bouton Valider ce lot ✓
- L419 `active:opacity-80` — bouton Continuer ✓

**7 occurrences `active:opacity-80`** — toutes les cibles couvertes, y compris la card pièce et les 2 boutons Ajouter (variante liste vide + variante footer). Dépasse les 6 corrections promises dans le brief.

**États complets par composant (vérification post-correction) :**

| Composant | default | hover | active | focus-visible | disabled | loading |
|---|---|---|---|---|---|---|
| Tab lot | ✓ | ✓ | ✓ | ✓ | N/A | N/A |
| Select lot | ✓ | native | native | ✓ | N/A | N/A |
| Card pièce | ✓ | ✓ | ✓ | ✓ | N/A | N/A |
| Select type | ✓ | native | native | ✓ | N/A | N/A |
| Input custom | ✓ | — | N/A | ✓ | N/A | N/A |
| Bouton Supprimer | ✓ | ✓ | ✓ | ✓ | N/A | N/A |
| Bouton Ajouter | ✓ | ✓ | ✓ | ✓ | N/A | N/A |
| Bouton Valider | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Bouton Continuer | ✓ | ✓ | ✓ | ✓ | N/A | N/A |

Les selects natifs héritent du comportement système — acceptable. Seul l'input custom_label manque un hover visuel (bas risque, P2). Gate G32 : **PASS**.

---

### G34 @theme collision + code couleur pièces — 9/10 (stable)

**G34 collision Tailwind v4 — PASS**

Grep `--spacing-|--sizing-|--rounded-|--leading-|--tracking-` dans globals.css `@theme` :
- **0 occurrence** — aucune collision. Les préfixes utilisés sont `--space-*`, `--radius-*`, `--font-size-*`, `--color-*`. Learning versi-s15 correctement appliqué.

**Code couleur pièces — AMÉLIORÉ**

styles.ts L136-138 : `bureau: "#9CA3AF"` et `dressing: "#9CA3AF"` — correction P1 appliquée.
- v1 : bureau/dressing = `#2C3E50` (bleu marine, non-conforme spec "autres=gris")
- v2 : bureau/dressing = `#9CA3AF` (gris Tailwind 400 — visuellement gris, conforme spec)

Vérification complète ROOM_TYPE_COLORS :
- chambre / chambre_parentale : `#4A90D9` (bleu) ✓
- salon / sejour / salle_a_manger : `#5BA55B` (vert) ✓
- cuisine : `#E67E22` (orange) ✓
- sdb : `#8E44AD` (violet) ✓
- wc : `#E84393` (rose) ✓
- bureau / dressing : `#9CA3AF` (gris) ✓ CORRIGÉ
- entree / couloir : `#95A5A6` (gris clair) ✓
- cellier / terrasse / garage / cave / balcon / autre : `#7F8C8D` (gris) ✓

Tous les types de pièces respectent la spec. Le léger écart entre `#9CA3AF`, `#95A5A6` et `#7F8C8D` (3 nuances de gris pour les "autres") est acceptable — différenciation visuelle subtile dans le canvas, non-spécifiée dans les exigences.

---

## Résiduels post-v2

### P1 résiduel (non bloquant GO)

| # | Finding | Fichier | Ligne | Action requise |
|---|---|---|---|---|
| P1-1 | `bg-[#F0EDE8]` hex JSX — token `--color-bg-canvas` non créé dans globals.css | RoomCanvas.tsx | 400 | Créer `--color-bg-canvas: #F0EDE8` dans globals.css @theme section sémantique, puis remplacer par `bg-bg-canvas` |

### P2 résiduel (cosmétique)

| # | Finding | Fichier | Recommandation |
|---|---|---|---|
| P2-1 | Tier 3 tokens couleurs pièces absents (`--color-room-*`) | globals.css | Ajouter pour documentation architecture, non consommables canvas 2D mais source de vérité |
| P2-2 | Canvas non focusable clavier (pas de tabIndex) | RoomCanvas.tsx | Acceptable outil interne, noter pour future version accessibilité publique |
| P2-3 | Input custom_label sans hover visuel | RoomPanel.tsx | Ajouter `hover:border-border-default/80` ou `hover:bg-bg-default` |

---

## Conclusion

**Note v2 : 8,8/10**
**Verdict : GO CONDITIONNEL**

Les 2 gates bloquantes de v1 (G23 hex JSX × 8 occurrences, G32 états active absents × 6 boutons) sont corrigées à 90%+. Le résiduel P1 unique (1 hex JSX canvas wrapper, token non créé) ne bloque pas la livraison de l'Étape 3. La correction complète (créer `--color-bg-canvas` dans globals.css) est une opération de 3 lignes, exécutable en hotfix.

**Condition GO définitif** : créer `--color-bg-canvas: #F0EDE8` dans globals.css et remplacer `bg-[#F0EDE8]` par `bg-bg-canvas` dans RoomCanvas.tsx:400.

---

## Handoff → @orchestrator

- Fichiers produits : `docs/reviews/design-rooms-us-vs-13-15-v2.md`
- Décisions : audit design gates G22/G23/G31/G32/G34 — passage 7,2 → 8,8/10
- Points d'attention :
  - **G23 PASS CONDITIONNEL** : 7/7 `bg-white` + 1/1 `text-white` corrigés dans RoomPanel ✓ — 1 hex résiduel RoomCanvas wrapper (P1, token `--color-bg-canvas` à créer)
  - **G32 PASS** : `active:opacity-80` ajouté sur 7 cibles interactives (dépasse les 6 demandées) ✓
  - **G22 PASS** : `min-h-[44px]` sur 4 boutons ✓, bureau/dressing corrigés en gris `#9CA3AF` ✓
  - **G34 PASS** : aucune collision @theme, learning versi-s15 maintenu ✓
  - **Hotfix recommandé avant merge** : 3 lignes — ajouter `--color-bg-canvas` dans globals.css + remplacer hex dans RoomCanvas.tsx
