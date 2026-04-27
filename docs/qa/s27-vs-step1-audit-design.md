# Audit Design — Étape 1 Upload Plans (Versi Studio)
Session s27 — 2026-04-27

---

## 1. Note globale

**4/10 — NO-GO**

Le système actuel est fonctionnel mais inadapté au cas d'usage réel. À 10–20 plans, la
grille 2–4 colonnes de grandes thumbnails crée une page impossible à gérer : scroll massif,
miniatures PDF non-informatives, aucun moyen de réordonner. Le persona (Thomas, marchand
de biens, 10–20 plans/immeuble) ne peut pas travailler confortablement.

---

## 2. Critères

### C1 — Layout actuel des blocs plans uploadés (proportions, density) : **4/10**

Grille `grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` avec cards `aspect-[4/3]`.
Chaque card occupe ~220px de largeur desktop → blocs visuellement lourds.
La partie informationnelle utile (nom fichier + input étage) est réduite à ~60px en bas.
Ratio signal/surface : faible. Pour 8 plans → 2 rangées qui remplissent la viewport.

### C2 — Scaling : que se passe-t-il à 10 plans ? 20 plans ? **3/10**

- 10 plans desktop (xl:grid-cols-4) → 3 rangées, ~900px de scroll en dessous de la dropzone
- 10 plans mobile (grid-cols-2) → 5 rangées, page qui s'étire sur ~1800px
- 20 plans desktop → 5 rangées, ~1500px scroll
- 20 plans mobile → 10 rangées, ~3500px scroll : inutilisable
- Aucune pagination, aucun scroll interne de la liste, aucun virtualisé
- MAX_FILES_PER_PROJECT visible uniquement dans le compteur discret ("X emplacements restants")

### C3 — Information density vs lisibilité (thumbnail + métadonnées) : **5/10**

Points positifs : nom tronqué avec `title` (tooltip), input étage accessible (`htmlFor`).
Problèmes :
- Les PDFs (format dominant pour les plans archi) affichent une icône générique — aucune
  distinction entre RDC / R+1 / façade visuellement
- Le nom de fichier est en `text-xs` dans un espace de 220px : lisibilité dégradée
- Aucun indicateur d'ordre (pas de numéro de séquence visible)
- L'input étage est une zone de saisie libre (`type="number"`) : Thomas doit saisir manuellement
  l'étage pour CHAQUE plan → friction élevée à 15 plans

### C4 — Actions par plan (supprimer, renommer, réordonner) : **3/10**

- Supprimer : présent, avec modal de confirmation — OK
- Renommer : absent. Le nom affiché est le nom de fichier brut (`IMG_001.pdf`). Aucune
  édition possible
- Réordonner : absent. Aucun drag-and-drop, aucune flèche haut/bas. L'ordre = ordre
  d'upload. Pour 15 plans, corriger l'ordre impose de tout supprimer et re-déposer
- Découvrabilité (règle s22) : l'action "réordonner" n'existe pas — feature inexistante
  pour le persona

### C5 — Cohérence avec design system (palette, tokens, espacements) : **7/10**

Tokens utilisés correctement : `bg-bg-card`, `border-border-default`, `text-text-muted`,
`text-text-default`, `interactive-primary`, spacing `p-md`, `mt-sm`, `gap-sm`.
Focus-visible present sur tous les interactifs. Touch targets 44×44 sur supprimer.
Point faible : `bg-bg-default` sur la zone preview (identique au fond de page) → les cards
PDF sans preview ne se distinguent pas bien du fond sur fond clair.

---

## 3. Top 3 BLOQUANTS P0

**P0-A — Scaling catastrophique à 10+ plans**
La grille grandes thumbnails rend la page ingérable pour le cas d'usage typique de Thomas
(8–15 plans). C'est le problème source cité verbatim : "ça fait énorme".

**P0-B — Aucune action de réordonnement**
Thomas livre des plans nommés `scan001.pdf` à `scan015.pdf` sans ordre garanti.
L'absence de drag-and-drop ou de boutons haut/bas force à tout re-déposer pour corriger
l'ordre. Découvrabilité s22 : feature inexistante = feature absente.

**P0-C — Saisie manuelle de l'étage par plan**
Input `type="number"` libre sur chaque card. Pour 12 plans = 12 saisies manuelles.
Le cas "immeuble R+5 avec RDC + caves + greniers" représente exactement le persona réel.
Ce flux est actuellement un formulaire à 12 champs — friction inadmissible.

---

## 4. Recommandation refonte : alternatives et choix

### Alternative A — Grid compact 4-col (thumbnails réduites) [REJETÉ]

Réduire les cards à `aspect-[1/1]` 80px, 4–6 colonnes.
- **Pros** : peu de code, preview encore visible
- **Cons** : PDFs toujours non-discriminants visuellement, réordonnement toujours absent,
  input étage toujours illisible à cette taille. Résout uniquement C2 partiellement.
  Scaling à 20 plans reste problématique (4 rangées × 80px = encore ~400px scroll).
  Ne répond pas aux vrais besoins persona.

### Alternative B — Liste compacte avec drag-and-drop [RECOMMANDÉE]

Chaque plan = une ligne horizontale : `[drag-handle] [icône type] [nom fichier éditable]
[badge étage auto-incrémenté] [bouton supprimer]` — hauteur fixe 48px par ligne.
12 plans = 576px de liste. Scrollable dans un conteneur fixe `max-h-[400px] overflow-y-auto`
si > 8 plans.

- **Pros** :
  - 20 plans = liste de 960px maximum, scrollable dans un conteneur de 400px
  - Drag-and-drop (react-beautiful-dnd ou @hello-pangea/dnd) pour réordonner visuellement
  - Étage auto-calculé par position dans la liste (index 0 = RDC, 1 = R+1, etc.) avec
    possibilité d'override manuel par click sur le badge
  - Nom de fichier éditable inline (click → input)
  - Preview accessible en click (modal lightbox) — pas dans la liste principale
  - Cohérence avec les listes de l'Étape 2 (lots) : même langage visuel
  - Conforme règle "minimum de clics" (s22) : étages calculés automatiquement
- **Cons** :
  - Drag-and-drop mobile (touch) complexe à implémenter — prévoir fallback
    boutons ↑/↓ sur mobile (touch targets 44px)
  - Suppression du preview inline — Thomas doit cliquer pour voir l'image

### Alternative C — Mosaic thumbnail + sidebar actions [ÉCARTÉ]

2 colonnes : thumbnails à gauche, liste d'actions à droite (sélection multiple + actions groupées).
- **Pros** : preview visible
- **Cons** : complexité UI élevée, responsive problématique, over-engineering pour un workflow
  linéaire. Hors scope V1.

### Recommandation finale : Alternative B — Liste compacte drag-and-drop

Le cas d'usage de Thomas est séquentiel (déposer → ordonner → analyser), pas exploratoire.
Il n'a pas besoin de voir 12 thumbnails en même temps — il a besoin de nommer et ordonner
12 plans rapidement. La liste compacte avec drag-and-drop + auto-étage réduit la friction
de ~12 actions manuelles à 0 (ordre drag = étage calculé automatiquement).

**Spécifications minimales pour implémentation :**
- Hauteur ligne : 48px, gap 2px entre items
- Drag handle : 6 points verticaux (grip icon), 44×44px hit target
- Badge étage : calculé = `index - 1` (0 = RDC, -1 = Cave, -2 = Sous-sol), modifiable
  par double-click → select dropdown (Cave / RDC / R+1 … R+10 / Grenier)
- Nom fichier : tronqué avec `title`, clic → `contentEditable` inline
- Preview : icône type à gauche (PDF rouge, IMAGE bleu), clic → modal lightbox
- Scroll container : `max-h-96 overflow-y-auto` si plans.length > 8
- Mobile : boutons ↑/↓ remplacent drag-and-drop

---

*Audit produit par @design — s27. Handoff → @fullstack pour implémentation.*
