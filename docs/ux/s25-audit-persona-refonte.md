# Audit persona marchand — refonte UX s25

> Audit réalisé le 2026-04-22. Répondant à la demande Thomas : "quelqu'un a-t-il réfléchi à ce que voit et comprend nos personas ?"

---

## Diagnostic : ce que voit Thomas en prod actuelle

Thomas uploade un plan. Il clique "Lancer l'analyse". Il se retrouve sur une page "Reformatage" qui lui dit :

> "Reformatage indisponible pour ce plan. Le reformatage automatique du plan n'a pas pu aboutir. Les résultats peuvent être moins précis."

Et dans le comparateur côté droit :

> "Plan reformaté indisponible"

**Ce que Thomas comprend** : quelque chose a foiré. Il ne sait pas quoi. Il ne sait pas si ses lots vont être détectés correctement. Il hésite à continuer.

**Ce que Thomas veut en réalité** : que ses lots et ses pièces soient bien détectés. Point.

**Diagnostic UX brutal** :
- L'étape Reformatage expose un détail technique interne (canonicalisation d'image) à un persona qui ne s'en soucie pas
- Le mot "reformatage" ne fait pas partie du lexique d'un marchand de biens
- La bannière d'avertissement crée de l'anxiété sans donner d'action corrective utile — l'utilisateur ne peut RIEN faire de différent
- Le comparateur avant/après sur la page Upload (section conditionnelle ajoutée en s25) pollue l'écran principal avec des informations techniques
- Le stepper à 5 étapes expose l'architecture interne du traitement IA — le marchand voit "Reformatage" entre "Plans" et "Lots" et ne comprend pas ce que c'est
- L'état fallback (aucun plan canonicalisé) est le cas le plus courant en prod — l'UI est donc majoritairement en état dégradé du point de vue du persona

---

## Décisions radicales (D1–D5)

### D1 — Étape Reformatage : SUPPRIMER

**Verdict : SUPPRIMER. Retour à 4 étapes.**

Justification persona : le marchand ne décide rien sur cet écran — que le plan soit reformaté ou non, il clique toujours "Continuer". C'est une étape fantôme qui ajoute un clic sans valeur.

Le reformatage reste dans le pipeline technique (l'API `/extract` continue de le faire), mais il devient invisible pour l'utilisateur. Après "Lancer l'analyse", redirection directe vers `/lots`.

### D2 — Stepper : 4 étapes (Plans → Lots → Pièces → Visuels)

**Verdict : 4 étapes.**

```
Étape 1 : Plans
Étape 2 : Lots
Étape 3 : Pièces
Étape 4 : Visuels
```

Justification persona : ces 4 mots sont dans son lexique. "Reformatage" n'y est pas.

### D3 — Bannières techniques : SUPPRIMER dans leur forme actuelle

**Verdict : SUPPRIMER les deux formulations. Zéro mention du reformatage en UI.**

- Supprimer : "Reformatage indisponible pour ce plan"
- Supprimer : "Le reformatage automatique du plan n'a pas pu aboutir. Les résultats peuvent être moins précis."
- Supprimer : "Plan reformaté indisponible" (placeholder dans PlanComparator)
- Supprimer : "Plan non reformaté — résultats d'analyse moins précis." (bandeau amber PlanComparator)

Si la qualité de détection est objectivement dégradée sur un plan (cas `canonical_fallback_reason`), la seule information utile au persona est côté lots : afficher un message d'avertissement contextuel sur la page /lots si la précision de détection est inférieure à un seuil. Texte : "Certains lots ont été détectés avec une précision réduite — vérifiez et ajustez manuellement si nécessaire." Pas de mention technique.

### D4 — Comparateur avant/après sur page Upload : SUPPRIMER de l'UI principale

**Verdict : SUPPRIMER de la page /upload. Déplacer en mode admin/debug uniquement.**

Justification persona : le comparateur sur /upload (section conditionnelle lignes 619-662 de upload/page.tsx) s'affiche après upload si canonicalized_image_path est non-null. Pour Thomas, voir "Aperçu des plans reformatés" avec deux images du même plan encombre l'interface de dépôt. Il veut juste confirmer que son plan est là, puis cliquer "Lancer l'analyse".

Le composant PlanComparator reste dans le codebase (utile pour debug interne), mais il ne doit plus être rendu sur les pages accessibles au persona en production.

### D5 — Terme "reformatage" : BANNI de toute l'UI persona-facing

**Verdict : BANNI. Remplacé par rien — le concept disparaît de l'interface.**

Le terme "reformatage" ne se remplace pas par un autre mot — il disparaît. Le processus technique continue d'exister sous ce nom dans le code (variables, commentaires, champs DB), mais aucun texte visible par Thomas ne mentionne ni "reformatage", ni "canonicalisation", ni "reformaté", ni "plan épuré".

---

## Specs exactes pour @fullstack

### 1. `src/lib/vs/types.ts` — Supprimer Step 2 "Reformatage" du stepper

**Lignes 486–526 (STEPS + StepId)**

Remplacer :
```typescript
export type StepId = 1 | 2 | 3 | 4 | 5;
```
Par :
```typescript
export type StepId = 1 | 2 | 3 | 4;
```

Remplacer le tableau STEPS (supprimer l'entrée id=2 "Reformatage" et renuméroter) :
```typescript
export const STEPS: StepDefinition[] = [
  {
    id: 1,
    label: "Plans",
    description: "Déposez vos plans",
    path: (id) => `/vs/projects/${id}/upload`,
  },
  {
    id: 2,
    label: "Lots",
    description: "Découpez vos lots",
    path: (id) => `/vs/projects/${id}/lots`,
  },
  {
    id: 3,
    label: "Pièces",
    description: "Identifiez les pièces",
    path: (id) => `/vs/projects/${id}/rooms`,
  },
  {
    id: 4,
    label: "Visuels",
    description: "Créez vos visuels",
    path: (id) => `/vs/projects/${id}/visuals`,
  },
];
```

### 2. `src/app/vs/projects/[id]/upload/page.tsx` — 3 modifications

**2a. Modifier la redirection après analyse (ligne 383)**

Remplacer :
```typescript
router.push(`/vs/projects/${projectId}/reformatage`);
```
Par :
```typescript
router.push(`/vs/projects/${projectId}/lots`);
```

**2b. Supprimer l'import PlanComparator (ligne 30)**

Supprimer la ligne :
```typescript
import PlanComparator from "@/components/vs/PlanComparator";
```

**2c. Supprimer la section comparateur (lignes 615–662)**

Supprimer entièrement le bloc conditionnel :
```typescript
{/* US-VS-R1 (s25) — Comparateur Original / Reformaté.
    ...  */}
{plans.some(
  (p) =>
    p.canonicalized_image_path !== null ||
    p.canonical_fallback_reason !== null,
) && (
  <section className="mt-2xl">
    ...
  </section>
)}
```

### 3. `src/app/vs/projects/[id]/reformatage/page.tsx` — SUPPRIMER LE FICHIER

Supprimer le fichier entier `/home/user/Versi/versi-studio/src/app/vs/projects/[id]/reformatage/page.tsx`.

Si une URL `/vs/projects/[id]/reformatage` est appelée directement (bookmark, lien ancien), ajouter une redirection dans `next.config.js` ou via un `redirect()` dans un fichier page minimal :
```typescript
// src/app/vs/projects/[id]/reformatage/page.tsx (version minimale de remplacement)
import { redirect } from "next/navigation";
export default function ReformatagePage({ params }: { params: { id: string } }) {
  redirect(`/vs/projects/${params.id}/lots`);
}
```

### 4. `src/app/vs/projects/[id]/lots/page.tsx` — Mettre à jour currentStep

Chercher `currentStep={2}` ou `currentStep={3}` dans ce fichier.
Après renommage des steps : Lots devient step 2. Corriger tous les `currentStep` et `completedSteps` en conséquence.

- Lots page : `currentStep={2}`, `completedSteps={[1]}`
- Rooms page : `currentStep={3}`, `completedSteps={[1, 2]}`
- Visuals page : `currentStep={4}`, `completedSteps={[1, 2, 3]}`

### 5. `src/components/vs/PlanComparator.tsx` — Supprimer les textes persona-facing

Ce composant reste dans le codebase (usage debug potentiel), mais nettoyer les textes visibles :

**Ligne 52–58** — Supprimer le bloc bandeau amber :
```typescript
{!hasCanonical && (
  <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
    Plan non reformaté — résultats d&apos;analyse moins précis.
    ...
  </div>
)}
```

**Ligne 76–79** — Remplacer le placeholder "Plan reformaté indisponible" :
```typescript
<div className="flex aspect-[1.41/1] items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
  Plan reformaté indisponible
</div>
```
Par :
```typescript
<div className="flex aspect-[1.41/1] items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
  Version épurée non disponible
</div>
```
(Ce texte ne sera plus visible en prod puisque le composant n'est plus rendu côté persona — correction préventive pour debug interne uniquement.)

### 6. Vérification cascade — fichiers à inspecter après ces modifications

Ces fichiers utilisent probablement `currentStep` ou `StepId` — vérifier après les modifications ci-dessus :
- `src/components/vs/Stepper.tsx` — déjà compatible si StepId est bien mis à jour dans types.ts
- `src/app/vs/projects/[id]/rooms/page.tsx` — mettre à jour `currentStep` → 3
- `src/app/vs/projects/[id]/visuals/page.tsx` — mettre à jour `currentStep` → 4

---

## Mot pivot métier respecté

| Mot autorisé | Mot interdit (remplacé/supprimé) |
|---|---|
| plan | reformatage |
| lot | canonicalisation |
| pièce | polygone |
| étage | zone |
| surface, m² | calque, contour, vectoriel |
| RDC | snap-to-label |

Règle : si un texte UI contient un mot de la colonne droite → refus automatique.

---

## Tests UX post-implémentation

| Test | Critère | Attendu |
|---|---|---|
| Parcours complet upload → lots | Thomas ne voit aucun terme technique | 0 occurrence "reformatage" dans l'UI |
| Time-to-value | Plans → Lots en N clics | 1 clic ("Lancer l'analyse") |
| Stepper | 4 étapes visibles, labels compréhensibles | Plans / Lots / Pièces / Visuels |
| État fallback canonicalisation | Aucune bannière d'avertissement | Zéro bannière technique sur /upload et /lots |
| URL /reformatage directe | Redirection vers /lots | HTTP 307 ou redirect() React |

---

## Handoff

---
**Handoff → @fullstack**

Fichiers produits :
- `/home/user/Versi/docs/ux/s25-audit-persona-refonte.md` (ce fichier)

Décisions prises :
- Étape "Reformatage" supprimée du stepper et du parcours utilisateur
- Stepper réduit à 4 étapes : Plans (1) → Lots (2) → Pièces (3) → Visuels (4)
- Redirection post-analyse : /upload → /lots (plus /reformatage)
- Tous textes "reformatage/reformaté/canonicalisation" bannis de l'UI persona
- PlanComparator retiré de upload/page.tsx (reste dans codebase pour debug)

Points d'attention :
- Renumérotation cascade des `currentStep` dans lots/page.tsx, rooms/page.tsx, visuals/page.tsx
- Ajouter une redirection sur la route /reformatage (éviter 404 sur bookmarks existants)
- Vérifier que le build TypeScript passe avec `StepId = 1 | 2 | 3 | 4` (retrait du | 5)
- Aucune modification du pipeline API extract — le reformatage continue en backend, il disparaît uniquement côté UI

---
