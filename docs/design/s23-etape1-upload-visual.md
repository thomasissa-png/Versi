# Étape 1 Upload — Refonte visuelle (s23)

> Feedback Thomas : "la box d'upload est très grande, les PDFs se retrouvent bas, on doit scroller"

---

## 1. Diagnostic visuel — état actuel

### Dimensions mesurées (DropZone.tsx)

| Propriété | Valeur actuelle | Impact |
|---|---|---|
| Padding intérieur | `p-4xl` = 96px de chaque côté | Gonfle massivement la hauteur |
| Min-height explicite | `min-h-[200px]` | Plancher, mais le padding fait monter à ~340px réel |
| Border | `border-2 border-dashed rounded-lg` | Bien, mais en grand format ça ressemble à un "vide" |
| Gap interne | `gap-md` = 16px entre icône/texte/lien | Correct |

**Hauteur réelle estimée** : icône 48px + gap 16px + 2 lignes texte ~36px + gap 16px + lien 16px + padding 96px×2 = **~324px**. Sur un viewport desktop 768-900px, la dropzone seule occupe ~35-40% de l'écran avant même que les plans apparaissent.

### Problème de proportion — état post-upload

Après le premier upload, la structure de la page est :
1. En-tête (titre + description) — ~100px
2. **DropZone pleine taille (~324px) — toujours là, inchangée**
3. Grille plans (`mt-2xl` = 48px de marge) — commence à ~472px
4. Bouton "Lancer l'analyse" (`mt-2xl`) — encore plus bas

**Résultat** : les plans se retrouvent à 500-600px du haut de page. Sur un viewport 768px, c'est du scroll obligatoire après le 1er upload. La box d'upload conserve le même poids visuel qu'avant d'avoir des fichiers — ce qui inverse la hiérarchie logique : l'action secondaire (ajouter d'autres fichiers) domine visuellement sur le contenu primaire (les plans déposés).

---

## 2. Propositions de refonte

### Variante A — Compact dynamique (recommandée)

**Principe** : la dropzone a deux états visuels distincts. En état vide elle est pédagogique et large. Dès qu'un plan est déposé, elle se contracte en une ligne compacte pour libérer la place aux plans.

**État vide** :
- Hauteur cible : `min-h-[160px]` au lieu de ~324px
- Padding : `p-2xl` (48px) au lieu de `p-4xl` (96px)
- Contenu inchangé (icône + texte + lien parcourir)

**État peuplé (plans.length > 0)** :
- La dropzone bascule sur un layout horizontal compact : icône 20px + texte "Ajouter d'autres plans" + lien "parcourir" — le tout sur une ligne
- Padding : `px-md py-sm` (16px / 8px) — hauteur ~48px
- Border : `border-dashed` maintenu mais couleur `border-border-default` plus discrète
- Transition : `transition-all duration-300 ease-out` sur le conteneur (height collapse)

**Grille plans** :
- Passe **avant** la dropzone compacte quand plans.length > 0 (réordonnancement DOM côté page.tsx)
- Garde `grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-md`

**Tokens utilisés** : `p-2xl`, `px-md`, `py-sm`, `gap-sm`, `rounded-lg`, `border-border-default`, `text-text-muted`, `transition-all duration-300`

---

### Variante B — Side-by-side desktop

**Principe** : layout 40/60 en desktop, dropzone à gauche, grille plans à droite.

**Desktop (md+)** :
- Wrapper : `flex flex-row gap-lg items-start`
- Dropzone : `w-2/5 flex-shrink-0` — hauteur `min-h-[200px]` — reste fixe
- Grille plans : `flex-1` — `grid grid-cols-2 gap-md`

**Mobile** :
- Stack vertical, dropzone en haut compacte (`min-h-[120px]`, `p-xl`)
- Plans en dessous

**Avantage** : aucun scroll, tout visible en un coup d'oeil. **Inconvénient** : la grille 2 colonnes dans 60% de largeur donne des cards très petites (surtout en 1280px). Fonctionne bien jusqu'à 3-4 plans, se dégrade après.

**Tokens utilisés** : `flex`, `gap-lg`, `w-2/5`, `flex-1`, `min-h-[200px]`, `p-xl`

---

### Variante C — Plans en priorité visuelle

**Principe** : les plans uploadés sont en haut de section (avant la dropzone), la dropzone compacte est en bas ou sticky.

**Structure page.tsx réordonnée** :
```
En-tête
→ Grille plans (si plans.length > 0)
→ Dropzone compacte (toujours visible, hauteur fixe 64px)
→ Bouton "Lancer l'analyse"
```

**Dropzone compacte fixe** :
- Hauteur : 64px, `px-lg py-md`
- Layout : `flex flex-row items-center gap-sm`
- Icône upload 16px + "Déposer d'autres plans" + `|` + "parcourir"
- Pas de min-height variable, pas d'animation

**Avantage** : hiérarchie maximalement claire. **Inconvénient** : en état vide, la dropzone compacte est moins pédagogique — un primo-utilisateur peut ne pas comprendre qu'il doit cliquer.

---

## 3. Thumbnails PDFs — preview vs icône

`pdf-to-img` est dans les dépendances. Cependant **recommandation** : rester sur icône PDF + nom de fichier pour l'instant.

Raisons :
- La génération de preview 1ère page requiert un job serveur asynchrone (~1-3s par PDF) — complexité non justifiée pour l'étape 1 qui est juste un staging
- Les PlanThumbnail pour images (`isImage = true`) affichent déjà le vrai preview — cohérence suffisante
- La taille des cards actuelles (aspect 4/3) convient à l'icône PDF centrée

Si souhaité plus tard : ajouter un endpoint `/api/vs/plans/[id]/preview` qui génère et cache la miniature PNG. Décision à prendre en s24+.

---

## 4. Animation de transition (Variante A)

```
État vide → état peuplé (au 1er upload réussi) :
- Wrapper dropzone : height de ~160px → ~48px
- transition: height 300ms ease-out, padding 300ms ease-out
- opacity icône large + texte large : 1 → 0 (150ms)
- fade-in layout compact : opacity 0 → 1 (150ms, démarrage à 150ms)
- motion-reduce: transition-none (déjà dans la base de code)
```

Implémentation suggérée : prop `compact={plans.length > 0}` sur DropZone, deux layouts JSX distincts avec `hidden`/`block` + classe Tailwind `transition-all duration-300`.

---

## 5. État d'erreur — cohérence maintenue

L'erreur de validation (`validationError`) dans DropZone.tsx s'affiche sous la zone (`mt-md`). En mode compact, elle reste sous la barre compacte — cohérent. Aucune modification nécessaire sur la logique d'erreur.

---

## 6. Mobile

| Breakpoint | Variante A |
|---|---|
| Mobile (< 640px) | Dropzone `min-h-[140px]`, `p-xl` (32px). En état peuplé : barre compacte 48px pleine largeur. Plans : grid 1 colonne (`grid-cols-1`) |
| Tablette (640-1024px) | Dropzone `min-h-[160px]`, `p-2xl`. Plans : `grid-cols-2` |
| Desktop (> 1024px) | Plans : `grid-cols-3 xl:grid-cols-4` |

---

## 7. Recommandation finale

**Variante A — Compact dynamique.**

Justification :
1. Zero scroll post-upload : la dropzone libère 250px dès le 1er fichier
2. Expérience pédagogique préservée à l'état vide (les primo-utilisateurs comprennent l'action)
3. Plans visuellement dominants après upload = hiérarchie inversée correctement
4. Implémentation minimale : 2 classes Tailwind conditionnelles + prop `compact` sur DropZone
5. Cohérent avec le design system existant — zéro nouveau token

---

## 8. Tokens exacts à appliquer (DropZone.tsx)

```diff
// État vide
- className="... p-4xl ... min-h-[200px] ..."
+ className="... p-2xl ... min-h-[160px] ..."

// Prop compact (état peuplé) — layout alternatif
className="... px-md py-sm flex-row gap-sm min-h-[48px] ..."
```

```diff
// page.tsx — réordonner le rendu quand plans.length > 0
// AVANT :  DropZone → grille plans → bouton
// APRÈS :  grille plans → DropZone compacte → bouton
```

---

**Handoff → @fullstack**

Fichiers produits :
- `/home/user/Versi/docs/design/s23-etape1-upload-visual.md`

Fichiers à modifier (implémentation) :
- `versi-studio/src/components/vs/DropZone.tsx` — ajouter prop `compact?: boolean`, remplacer `p-4xl min-h-[200px]` par `p-2xl min-h-[160px]` en état normal, layout compact `px-md py-sm flex-row` quand `compact=true`
- `versi-studio/src/app/vs/projects/[id]/upload/page.tsx` — passer `compact={plans.length > 0}` à `<DropZone>`, déplacer le bloc `{plans.length > 0 && <div className="mt-2xl">...}` **au-dessus** du `<DropZone>` (et supprimer le `mt-2xl` en faveur d'un `mb-md` entre grille et dropzone compacte)

Points d'attention :
- Transition CSS sur height : utiliser `transition-all duration-300 motion-reduce:transition-none` — déjà dans la codebase
- Mobile : `grid-cols-1` sur plans quand `< sm`, déjà partiellement en place (`grid-cols-2 lg:grid-cols-3`)
- L'état `disabled` (upload en cours ou limite atteinte) s'applique aux deux états de la dropzone sans modification supplémentaire
- Pas de nouveau token — utiliser uniquement les tokens `--space-*` et couleurs existants de globals.css
