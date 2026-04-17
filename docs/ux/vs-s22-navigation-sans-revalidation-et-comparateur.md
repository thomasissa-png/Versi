# UX Versi Studio s22 — Navigation sans revalidation + Comparateur avant/après

---

## Section 1 : Navigation sans revalidation (Étapes 1→4)

### Diagnostic du problème réel

**Problème identifié — ligne 780 de `lots/page.tsx` + ligne 742 :**

```tsx
<Stepper currentStep={2} projectId={projectId} completedSteps={[1]} />
```

La valeur `completedSteps` est **codée en dur à `[1]`** sur la page `/lots`. Elle ne lit jamais le `project.status` pour déterminer si l'étape 2 (Lots) est déjà complétée. Conséquence : même si Thomas a déjà validé les lots et est passé en Étape 3, le stepper ne marque jamais l'étape 2 comme complétée quand il revient sur `/lots` — l'étape 3 (Pièces) reste donc grisée et non cliquable.

**Comparaison avec rooms/page.tsx (fonctionnel) :**
`rooms/page.tsx` lignes 250–268 calcule `completedSteps` dynamiquement depuis `project.status` :
- `step_2_complete` → push(2)
- `step_3_complete` → push(3)

C'est le pattern correct. `lots/page.tsx` ne l'a pas.

**Comportement actuel dans `Stepper.tsx` (correct) :**
La logique `isClickable` ligne 32 est correcte :
```tsx
const isClickable = (stepId: StepId) =>
  completedSteps.includes(stepId) && stepId !== currentStep;
```
Si `completedSteps` contient l'étape 3, le clic sur PIÈCES fonctionne. Le problème est uniquement que `lots/page.tsx` ne passe jamais l'étape 3 dans `completedSteps`.

### Fix précis

**Fichier : `versi-studio/src/app/vs/projects/[id]/lots/page.tsx`**

Remplacer les deux occurrences (lignes 742 et 780) du `completedSteps` statique :

```tsx
// AVANT (2 occurrences — loading state ligne 742 + rendu principal ligne 780)
<Stepper currentStep={2} projectId={projectId} completedSteps={[1]} />

// APRÈS — calculer completedSteps depuis project.status
// Ajouter CE bloc juste avant le `return` du rendu principal (vers ligne 774)
```

Insérer AVANT le `return` du rendu principal (après le guard `if (!project)`) :

```tsx
// ─── Étapes complétées pour le stepper ───────────────────────
const completedSteps: (1 | 2 | 3 | 4)[] = [1]; // étape 1 toujours complète ici
if (
  project.status === "step_2_complete" ||
  project.status === "step_3_complete" ||
  project.status === "completed"
) {
  completedSteps.push(2);
}
if (project.status === "step_3_complete" || project.status === "completed") {
  completedSteps.push(3);
}
```

Puis remplacer les deux appels Stepper :

```tsx
// loading state (ligne ~742) — project peut être null ici, garder [1] en fallback
<Stepper currentStep={2} projectId={projectId} completedSteps={[1]} />

// rendu principal (ligne ~780) — utiliser completedSteps dynamique
<Stepper currentStep={2} projectId={projectId} completedSteps={completedSteps} />
```

**Note :** Le loading state de `lots/page.tsx` est rendu AVANT que `project` soit chargé — laisser `[1]` en dur pour ce cas uniquement. Seul le rendu principal (après le guard `!project`) utilise `completedSteps` dynamique.

### Bouton "Revenir aux pièces" (complément UX)

Ajouter un bouton secondaire en haut à droite de l'en-tête sur `/lots`, visible uniquement si l'étape 3 est déjà complétée. Positionner à côté du titre, en `flex justify-between` :

```tsx
{completedSteps.includes(3) && (
  <button
    type="button"
    onClick={() => router.push(`/vs/projects/${projectId}/rooms`)}
    className="inline-flex items-center gap-xs text-sm text-text-muted hover:text-text-default transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary min-h-[44px]"
  >
    Pièces
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  </button>
)}
```

### Tests à exécuter

- Créer un projet, valider l'étape 1 (plans), valider l'étape 2 (lots), passer à l'étape 3.
- Revenir sur `/lots` via le stepper ou le bouton retour.
- Vérifier : l'étape 3 (PIÈCES) est cliquable dans le stepper (cercle non grisé).
- Cliquer sur PIÈCES dans le stepper → navigation directe sans revalidation.
- Si visuals déjà créés : vérifier que l'étape 4 (VISUELS) est également cliquable.

---

## Section 2 : Comparateur avant/après Étape 4

### Wireframe ASCII — Layout 2 colonnes

```
┌────────────────────────────────────────────────────────────┐
│  [badge style] [badge Validé?]                             │
│                                                            │
│  ┌─────────────────────┐  ┌─────────────────────┐         │
│  │                     │  │                     │         │
│  │    PHOTO SOURCE     │  │    VISUEL IA        │         │
│  │   (image actuelle)  │  │   (généré)          │         │
│  │                     │  │                     │         │
│  │   [⤢ agrandir]     │  │   [⤢ agrandir]     │         │
│  └─────────────────────┘  └─────────────────────┘         │
│  Avant — photo actuelle    Après — visuel IA               │
│  [↓ Télécharger]           [↓ Télécharger]                 │
│                                                            │
│  [Valider ce visuel]  [Affiner]  [Autre style]             │
│                                                            │
│  ── Autres versions ──────────────────────────────────── │
│  [thumb1▪] [thumb2] [thumb3]  ←── carousel horizontal     │
└────────────────────────────────────────────────────────────┘

Mobile (<768px) : stack vertical
┌──────────────────────┐
│  Avant — photo       │
│  [image source]      │
│  [↓ Télécharger]     │
│  Après — visuel IA   │
│  [image générée]     │
│  [↓ Télécharger]     │
│  [Valider] [Affiner] │
└──────────────────────┘
```

### Code TSX quasi-complet — Section comparateur dans `VisualResult.tsx`

Remplacer le bloc `{/* Image du visuel */}` (lignes 205–237) par :

```tsx
{/* ─── Comparateur avant/après ───────────────────────── */}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
  {/* Colonne Avant */}
  <div className="flex flex-col gap-xs">
    <div
      className="relative rounded-lg overflow-hidden bg-bg-canvas border border-border-default cursor-zoom-in"
      onClick={() => setLightboxSrc(sourceImageUrl)}
      role="button"
      aria-label="Agrandir la photo actuelle"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && setLightboxSrc(sourceImageUrl)}
    >
      {sourceImageUrl ? (
        <img
          src={sourceImageUrl}
          alt="Photo actuelle de la pièce"
          className="w-full h-48 sm:h-64 object-cover"
        />
      ) : (
        <div className="w-full h-48 sm:h-64 flex items-center justify-center">
          <p className="text-xs text-text-muted text-center px-md">Photo source non disponible</p>
        </div>
      )}
      <div className="absolute top-sm right-sm">
        <span className="bg-bg-dark/70 text-text-inverse text-xs px-xs py-2xs rounded">
          <svg className="w-3 h-3 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </span>
      </div>
    </div>
    <div className="flex items-center justify-between">
      <span className="text-xs text-text-muted">Avant — photo actuelle</span>
      {sourceImageUrl && (
        <a
          href={sourceImageUrl}
          download
          className="inline-flex items-center gap-2xs text-xs text-text-muted hover:text-text-default transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary min-h-[44px]"
          aria-label="Télécharger la photo actuelle"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Télécharger
        </a>
      )}
    </div>
  </div>

  {/* Colonne Après */}
  <div className="flex flex-col gap-xs">
    <div
      className="relative rounded-lg overflow-hidden bg-bg-canvas border border-border-default cursor-zoom-in"
      onClick={() => generatedImageUrl && setLightboxSrc(generatedImageUrl)}
      role="button"
      aria-label="Agrandir le visuel IA"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && generatedImageUrl && setLightboxSrc(generatedImageUrl)}
    >
      {generatedImageUrl ? (
        <img
          src={generatedImageUrl}
          alt={`Visuel IA — ${styleName}`}
          className="w-full h-48 sm:h-64 object-cover"
        />
      ) : (
        <div className="w-full h-48 sm:h-64 flex items-center justify-center">
          <p className="text-xs text-text-muted">Visuel non disponible</p>
        </div>
      )}
      <div className="absolute top-sm right-sm">
        <span className="bg-bg-dark/70 text-text-inverse text-xs px-xs py-2xs rounded">
          <svg className="w-3 h-3 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </span>
      </div>
    </div>
    <div className="flex items-center justify-between">
      <span className="text-xs text-text-muted">Après — visuel IA</span>
      {generatedImageUrl && (
        <a
          href={generatedImageUrl}
          download
          className="inline-flex items-center gap-2xs text-xs text-text-muted hover:text-text-default transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary min-h-[44px]"
          aria-label="Télécharger le visuel IA"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Télécharger
        </a>
      )}
    </div>
  </div>
</div>

{/* ─── Modale plein écran ──────────────────────────────── */}
{lightboxSrc && (
  <div
    className="fixed inset-0 z-50 bg-bg-dark/90 flex items-center justify-center p-md"
    onClick={() => setLightboxSrc(null)}
    role="dialog"
    aria-modal="true"
    aria-label="Image agrandie"
  >
    <button
      className="absolute top-md right-md text-text-inverse hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary min-h-[44px] min-w-[44px]"
      onClick={() => setLightboxSrc(null)}
      aria-label="Fermer"
    >
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
    <img
      src={lightboxSrc}
      alt="Vue agrandie"
      className="max-w-full max-h-full object-contain rounded-lg"
      onClick={(e) => e.stopPropagation()}
    />
  </div>
)}
```

### Ajouts nécessaires dans `VisualResult.tsx`

**Props supplémentaire à ajouter :**

```tsx
interface VisualResultProps {
  // ... props existantes ...
  /** URL de la photo source (photo de la pièce avant génération) */
  sourceImageUrl?: string | null;
}
```

**State à ajouter dans le composant :**

```tsx
const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
```

**Variable dérivée :**

```tsx
const generatedImageUrl = (activeVisual?.file_path && activeVisual.file_path !== "placeholder")
  ? `/api/vs/files?path=${encodeURIComponent(activeVisual.file_path)}`
  : null;
```

**Gestion Escape pour la modale :**

```tsx
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.key === "Escape") setLightboxSrc(null);
  };
  if (lightboxSrc) window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, [lightboxSrc]);
```

### Sélecteur multi-itérations

Le carousel existant (historyVisuals, lignes 319–377) reste inchangé et couvre déjà ce besoin. Le label à ajouter : remplacer `Historique` par `Autres versions` pour le rendre plus explicite :

```tsx
// ligne 323 — remplacer
<p className="text-xs uppercase tracking-widest text-text-muted mb-sm">
  Autres versions
</p>
```

### Transmission de `sourceImageUrl` depuis la page parente

Dans `versi-studio/src/app/vs/projects/[id]/visuals/page.tsx`, passer la photo source de la pièce au composant `VisualResult`. La photo source est typiquement `room.photo_path` ou le premier plan du projet. À vérifier dans le composant parent lors de l'implémentation — si le champ n'existe pas sur `VsRoom`, ajouter `sourceImageUrl={null}` et documenter en TODO.

---

## Section 3 : Handoff

### Fichiers à modifier

1. `versi-studio/src/app/vs/projects/[id]/lots/page.tsx` — calcul `completedSteps` dynamique + bouton "Revenir aux pièces"
2. `versi-studio/src/components/vs/VisualResult.tsx` — layout comparateur + modale lightbox + prop `sourceImageUrl`
3. `versi-studio/src/app/vs/projects/[id]/visuals/page.tsx` — passer `sourceImageUrl` au composant `VisualResult`

### Ordre d'implémentation recommandé

1. **Point 1 d'abord** (lots/page.tsx) — fix ciblé, 3 lignes + 1 bloc, risque zéro de régression. Tester immédiatement après.
2. **Point 2 ensuite** (VisualResult.tsx + visuals/page.tsx) — modification plus large, tester le comparateur + la modale + le sélecteur.

### Agents

- **@fullstack** : implémentation des deux points
- **@qa** : tester les edge cases — retour en arrière multiple, modale Escape + clic extérieur, comportement mobile, `sourceImageUrl` null

---

**Handoff → @fullstack**
- Fichiers produits : `/home/user/Versi/docs/ux/vs-s22-navigation-sans-revalidation-et-comparateur.md`
- Décisions prises : fix `completedSteps` par lecture `project.status` (même pattern que rooms/page.tsx) ; comparateur 2 colonnes 50/50 ; modale lightbox native sans dépendance externe ; `sourceImageUrl` prop optionnelle (nullable)
- Points d'attention : `sourceImageUrl` à connecter au bon champ dans visuals/page.tsx — si `room.photo_path` n'existe pas sur le type `VsRoom`, ajouter le champ ou passer `null` en V1. Le carousel "Autres versions" réutilise l'existant sans modification de logique.
