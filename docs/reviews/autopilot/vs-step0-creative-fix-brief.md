# Brief correction ciblée — @creative-strategy → @fullstack (Étape 0 Dashboard)

> Document à produire par @creative-strategy pour passer le Dashboard de 7/10 à 10/10.
> Destinataire final : @fullstack (qui appliquera les fixes).

*(fichier squelette initialisé par l'orchestrateur — @creative-strategy remplit les 4 sections)*

## P1 — Tutoyement cohérent (empty state, ligne 147)

### Analyse du registre actuel

La page ne s'adresse pas directement à l'utilisateur dans ses éléments principaux : "Mes opérations" (titre possessif neutre), "Nouvelle opération" (bouton sans adresse directe), labels de formulaire ("Adresse", "Type de bien") tous en formulation impersonnelle. Un seul endroit brise cette neutralité : l'empty state ligne 147 avec "Lance ta première opération" — tutoiement isolé, non assumé.

### Décision de registre

**Option A — Vouvoiement explicite (recommandé pour Laurent)**

Laurent : 48 ans, marchand de biens institutionnel, reçoit des dizaines de dossiers par mois, juge la crédibilité en 10 secondes. Le tutoiement dans une interface SaaS B2B immobilier premium envoie un signal de légèreté — le registre LinkedIn professionnel de Versi est le vouvoiement. Cohérence avec le ton "Rigueur, Solidité, Précision" défini dans project-context.md.

**Option B — Tutoiement assumé partout (déconseillé)**

Impliquerait de revoir tous les messages d'état, validations de formulaire, et futurs écrans — scope hors périmètre de cette correction ciblée. Risque de rupture de registre avec les autres entités Versi qui s'adressent à des profils encore plus formels (investisseurs family office, acheteurs publics).

### Phrase de remplacement (option A retenue)

**Ligne 147 — avant :**
```
Aucune opération pour l&apos;instant. Lance ta première opération.
```

**Ligne 147 — après :**
```
Aucune opération pour l&apos;instant. Créez votre première opération pour commencer.
```

**Justification copy :** "Créez" (vouvoiement d'action) + "votre première opération" (possessif aligné sur "Mes opérations") + "pour commencer" (signal d'entrée dans le workflow, sans surplus d'enthousiasme). Registre professionnel sans être froid. Le CTA bouton existant "+ Nouvelle opération" reste inchangé — il n'interpelle pas directement.

## P2 — Token typo h2 formulaire (ligne 238)

### Analyse du problème

Ligne 238 actuelle :
```jsx
<h2 className="text-lg font-medium mb-lg">Nouvelle opération</h2>
```

`text-lg font-medium` sont des classes utilitaires Tailwind brutes. La classe `vs-h3` existe dans globals.css (ligne 135) : `font-size: xl (20px)`, `text-transform: uppercase`, `letter-spacing: 0.04em`, `font-weight: 500`. Elle correspond exactement au niveau hiérarchique d'un titre de formulaire imbriqué sous le H1 principal "Mes opérations".

### Décision : vs-h3 + sous-titre contextuel

Remplacer la classe ET ajouter un sous-titre court pour signaler le contexte de l'action — ce que le rapport C3 notait comme "pas de hint contextuel". Le formulaire s'ouvre dans la page principale sans transition — le sous-titre ancre l'utilisateur dans l'action en cours.

### JSX exact de remplacement (lignes 238-239)

**Avant :**
```jsx
<h2 className="text-lg font-medium mb-lg">Nouvelle opération</h2>
```

**Après :**
```jsx
<h2 className="vs-h3 mb-xs">Nouvelle opération</h2>
<p className="vs-body-sm text-text-muted mb-lg">Renseignez les informations de base pour initialiser l'opération.</p>
```

**Justification :**
- `vs-h3` : alignement avec le design system, cohérence typographique avec le reste de l'interface
- `mb-xs` sur le h2 (au lieu de `mb-lg`) : l'espacement est reporté sur le paragraphe `mb-lg` pour que le sous-titre soit visuellement lié au titre
- Le sous-titre utilise le vouvoiement (cohérence P1) et reste factuel — pas de promesse marketing dans un formulaire technique
- "Renseignez les informations de base pour initialiser l'opération" : vocabulaire métier (initialiser / opération) conforme au registre Versi Studio

## P3 — Couleurs sémantiques badges statut (ligne 396)

### Tokens disponibles dans globals.css (vérifiés)

Le design system Versi Studio ne définit PAS de tokens `bg-info-subtle` ou `bg-success-subtle`. Voici les tokens couleur utilisables pour les badges :

**Couleurs sémantiques déclarées dans @theme :**
- `bg-bg-default` → `#F7F5F2` (calcaire — neutre chaud)
- `bg-bg-card` → `#FFFFFF` (blanc — fond carte)
- `text-text-muted` → `#6B6560` (gris pierre)
- `text-text-default` → `#0B0B0B`
- `color-success` → `#15803D` (vert — utilisé pour `text-success`)
- `color-warning` → `#D97706` (ambre)
- `color-error` → `#B91C1C`

**Couleurs primitives utilisables pour les fonds de badge (opacité via slash syntax Tailwind v4) :**
- `color-vert-mineral` → `#1E2A23` (vert foncé premium — dérivé de la marque)
- `color-gris-chaud` → `#D9D4CE`
- `color-gris-pierre` → `#6B6560`

**Contrainte identifiée :** Tailwind v4 via `@theme` expose les variables CSS mais la syntax `bg-success/10` (opacité sur une couleur utilitaire) fonctionne si le token est déclaré avec `--color-success`. C'est le cas ici. Vérification : `bg-error/10` est déjà utilisé ligne 116 — preuve que la syntaxe fonctionne dans ce projet.

### Mapping statut → couleur

| Statut (clé) | Label FR | Signification | Couleur badge |
|---|---|---|---|
| `draft` | Brouillon | Initialisation | Neutre gris |
| `step_1_complete` | Plans uploadés | En progression | Ambre |
| `step_2_complete` | Lots découpés | En progression | Ambre |
| `step_3_complete` | Pièces identifiées | En progression — quasi terminé | Ambre (ou vert si on veut graduer) |
| `completed` | Terminé | Succès | Vert |

**Choix de gradation :** 3 niveaux (neutre / progression / succès) — pas 5 couleurs différentes. Les étapes step_1, step_2, step_3 partagent la même couleur ambre pour signaler "en cours" sans créer de confusion visuelle.

### Code exact — fonction getStatusColor + badge mis à jour

**À insérer après la constante STATUS_LABELS (ligne 30, après la fermeture de l'objet) :**

```tsx
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-bg-default text-text-muted border border-border-default",
  step_1_complete: "bg-warning/10 text-warning",
  step_2_complete: "bg-warning/10 text-warning",
  step_3_complete: "bg-warning/10 text-warning",
  completed: "bg-success/10 text-success",
};
```

**Ligne 396 — avant :**
```jsx
<span className="inline-block px-sm py-2xs rounded text-xs bg-bg-default text-text-muted">
```

**Ligne 396 — après :**
```jsx
<span className={`inline-block px-sm py-2xs rounded text-xs ${STATUS_COLORS[project.status] ?? "bg-bg-default text-text-muted border border-border-default"}`}>
```

**Justification :**
- `bg-warning/10` et `bg-success/10` : opacité 10% sur les tokens warning/success — même pattern que `bg-error/10` déjà utilisé ligne 116, pas d'invention
- Le statut `draft` (Brouillon) conserve un fond neutre avec border explicite — signal visuel "rien de fait encore" sans être invisible
- Fallback (`??`) en cas de statut inconnu : neutre avec border, safe
- Pas de tokens inventés — tous vérifiés dans globals.css

## P4 — Signal valeur business (sous-titre H1, ligne 79)

### Analyse du défaut

Sous-titre actuel (ligne 79) :
> "Découpe de plans, identification des lots et génération de visuels post-travaux."

C'est une liste de fonctionnalités, pas une promesse. Pour Laurent (marchand de biens) ou pour un opérateur qui ouvre Versi Studio, le "pourquoi ça lui fait gagner quelque chose" est absent. Le texte répond à "qu'est-ce que c'est ?" mais pas à "qu'est-ce que ça change pour moi ?".

### Règle n°2 — Chiffres

Aucun chiffre de performance (durée, volume) n'est disponible dans project-context.md ni dans les livrables existants. Les variantes ci-dessous qui mentionnent des durées ou volumes sont marquées `[HYPOTHÈSE]` et doivent être validées par Thomas avant intégration.

### Variantes de sous-titre (3 directions)

**Variante A — Signal de professionnalisation du dossier (recommandé, sans chiffre)**
> "Découpez vos plans, identifiez les lots et générez des visuels vendeurs — prêts à intégrer dans vos dossiers d'acquisition."

Valeur : le sous-titre dit que l'output (visuel vendeur, dossier d'acquisition) est utilisable directement. Pour Laurent comme pour un opérateur, la promesse "prêt à intégrer" signifie zéro retraitement manuel. Pas de chiffre inventé.

**Variante B — Signal de durée `[HYPOTHÈSE à valider par Thomas]`**
> "De l'upload du plan à la livraison des visuels de lots — en moins d'une heure par opération."

Valeur : durée concrète. À n'utiliser QUE si Thomas confirme que la durée de traitement est effectivement < 1h sur une opération standard. Si non validé, interdit (règle n°2).

**Variante C — Signal de volume de livrables `[HYPOTHÈSE à valider par Thomas]`**
> "Un plan uploadé, des dizaines de documents générés : visuels, fiches lots, plans annotés."

Valeur : le multiplicateur (1 input → N outputs) est un signal de ROI clair. À n'utiliser QUE si Thomas confirme que Versi Studio génère effectivement plusieurs types de documents par opération. Si le produit en est au stade MVP avec un seul type de livrable → interdit.

### Recommandation

**Retenir la Variante A.** Elle est vraie dès la V1 (pas de chiffre dépendant de la performance réelle), elle ancre le bénéfice business ("dossiers d'acquisition"), et elle utilise le vouvoiement cohérent avec P1.

**Ligne 79 — avant :**
```jsx
Découpe de plans, identification des lots et génération de visuels post-travaux.
```

**Ligne 79 — après (Variante A) :**
```jsx
Découpez vos plans, identifiez les lots et générez des visuels vendeurs — prêts à intégrer dans vos dossiers d&apos;acquisition.
```

Note technique : `&apos;` pour l'apostrophe dans JSX (cohérent avec le pattern ligne 147 existant dans le fichier).

## Récap pour @fullstack

Fichier unique à modifier : `versi-studio/src/app/vs/page.tsx`

| Fix | Ligne(s) | Avant | Après |
|---|---|---|---|
| P1 — Registre empty state | 147 | `Aucune opération pour l&apos;instant. Lance ta première opération.` | `Aucune opération pour l&apos;instant. Créez votre première opération pour commencer.` |
| P2 — Token typo h2 + sous-titre | 238 | `<h2 className="text-lg font-medium mb-lg">Nouvelle opération</h2>` | `<h2 className="vs-h3 mb-xs">Nouvelle opération</h2>` + ajouter la ligne suivante : `<p className="vs-body-sm text-text-muted mb-lg">Renseignez les informations de base pour initialiser l&apos;opération.</p>` |
| P3 — Déclaration STATUS_COLORS | Après ligne 30 (après la fermeture de STATUS_LABELS) | *(absent)* | `const STATUS_COLORS: Record<string, string> = { draft: "bg-bg-default text-text-muted border border-border-default", step_1_complete: "bg-warning/10 text-warning", step_2_complete: "bg-warning/10 text-warning", step_3_complete: "bg-warning/10 text-warning", completed: "bg-success/10 text-success", };` |
| P3 — Utilisation du badge | 396 | `<span className="inline-block px-sm py-2xs rounded text-xs bg-bg-default text-text-muted">` | `<span className={\`inline-block px-sm py-2xs rounded text-xs ${STATUS_COLORS[project.status] ?? "bg-bg-default text-text-muted border border-border-default"}\`}>` |
| P4 — Sous-titre H1 | 79 | `Découpe de plans, identification des lots et génération de visuels post-travaux.` | `Découpez vos plans, identifiez les lots et générez des visuels vendeurs — prêts à intégrer dans vos dossiers d&apos;acquisition.` |

**Notes d'implémentation pour @fullstack :**
- P2 : `mb-xs` sur le h2 + `mb-lg` sur le paragraphe — ne pas inverser l'espacement
- P3 : insérer `STATUS_COLORS` immédiatement après la fermeture de `STATUS_LABELS` (ligne 30 actuelle), avant le commentaire `// ─── Composant principal ───`
- P3 : la syntaxe `bg-warning/10` et `bg-success/10` est déjà validée dans ce projet via `bg-error/10` ligne 116 — aucun risque de régression Tailwind v4
- P4 : `&apos;` pour l'apostrophe dans "d&apos;acquisition" — cohérent avec le pattern ligne 147 existant
- Aucun autre fichier à modifier — tous les tokens référencés existent dans `globals.css`

---

**Handoff → @fullstack**

- Fichier produit : `docs/reviews/autopilot/vs-step0-creative-fix-brief.md`
- Input : ce brief (5 sections — P1 à P4 + Récap)
- Output attendu : 4 fixes appliqués sur `versi-studio/src/app/vs/page.tsx`, couvrant lignes 79, 147, 238, et 396 (+ insertion de `STATUS_COLORS` après ligne 30)
- Critère de done : le Dashboard passe de 7/10 à 9-10/10 sur les critères C3 (ton), C2 (hiérarchie typo), C1 (badges statut), C5 (différenciateur valeur business)
- Aucune invention de token CSS — tous vérifiés dans `globals.css`
- Les variantes B et C du sous-titre H1 (P4) contiennent des chiffres marqués `[HYPOTHÈSE à valider par Thomas]` — ne pas les intégrer sans validation fondateur
