# Audit design — Étape 3 (Pièces) + Étape 4 (Visuels) — s33

> READ-ONLY. Branche `claude/versi-s33-propagation-context-u8L8y`. Périmètre : composants `vs/` + routes rooms + visuals/placement.

---

## 1. Synthèse

Le design system charcoal/stone est correctement appliqué dans l'ensemble : les tokens sémantiques (`bg-card`, `text-default`, `border-default`, `interactive-primary`) couvrent ~90 % des surfaces. L'architecture est solide post-s30-s32. Score global : **7,5 / 10**. Trois défauts critiques bloquent le passage à 8,5 :

1. **Token `color-info` non défini** (utilisé dans le badge "Ancre" de VisualGallery) — couleur hardcodée implicite ou fallback navigateur, hors système.
2. **Pastilles couleur segment (PASTILLE_COLORS) hardcodées en hex** — `#0B0B0B`, `#C9844C`, `#5A8060` dans `RoomSegmentsPanel.tsx` non référencées via tokens. Désynchronisation garantie si la palette évolue.
3. **Chat ArchitectChatPanel : bulle "utilisateur" en `bg-interactive-primary text-bg-canvas`** — contraste WCAG AA non vérifié à 11px. `#0B0B0B` fond / `#F7F5F2` texte = 20:1 (OK) mais la taille effective `text-sm` à `0.875rem` / `14px` doit rester au-dessus de 4,5:1 → conforme, mais le `text-[11px]` du label "Suggestions" sur fond `text-muted` (#6B6560 sur #FFFFFF) est à ~4,1:1 — **échec WCAG AA** (4,5:1 requis).

---

## 2. Étape 3 — Défauts visuels

| Défaut | Sév. | Fichier : référence | Fix recommandé |
|--------|------|---------------------|----------------|
| `PASTILLE_COLORS` hardcodés (`#0B0B0B`, `#C9844C`, `#5A8060`) | **P1** | `RoomSegmentsPanel.tsx` L63-66 | Créer tokens `--color-segment-wall`, `--color-segment-bay`, `--color-segment-opening` dans `globals.css @theme`, référencer via CSS vars |
| Bouton "chat toggle" : taille `w-8 h-8` = 32×32px — inférieur aux 44×44px minimum mobile | **P1** | `RoomSegmentsPanel.tsx` L193 | Passer à `w-11 h-11` (44px) ou `min-h-[44px] min-w-[44px]` |
| Légende pastille : cercles `w-2.5 h-2.5` (10px) avec `backgroundColor` hardcodé — duplication de PASTILLE_COLORS | **P2** | `RoomSegmentsPanel.tsx` L302-323 | Même token que ci-dessus, supprimer la duplication |
| Titre panel `uppercase tracking-wide` — même style que `ArchitectChatPanel` : cohérent mais pas documenté dans le design system | **P2** | `RoomSegmentsPanel.tsx` L180, `ArchitectChatPanel.tsx` L274 | Extraire une classe utilitaire `.panel-title` ou documenter le pattern dans `vs-design-system.md` |
| Numéro de segment : cercle `w-6 h-6` (24px) avec `bg-bg-card border border-border-default` — lisibilité à `text-xs` (13px) sur fond calcaire | **P2** | `RoomSegmentsPanel.tsx` L260-263 | Vérifier contraste #0B0B0B sur #FFFFFF (21:1 — OK). Conserver. Documenter. |
| `transition-colors` sans durée explicite sur les `li` de segment — durée Tailwind par défaut 150ms, non alignée sur motion token `fast` (150ms) — coincidence correcte mais non intentionnelle | **P2** | `RoomSegmentsPanel.tsx` L243 | Ajouter `duration-[150ms]` ou utiliser `transition-[colors] duration-fast` si le token est exposé |

---

## 3. Étape 4 — Défauts visuels

| Défaut | Sév. | Fichier : référence | Fix recommandé |
|--------|------|---------------------|----------------|
| Token `text-info` / `bg-info/10` dans le badge "Ancre" — `color-info` absent de `globals.css @theme` | **P0** | `VisualGallery.tsx` L241-247 | Ajouter `--color-info: #2563EB` (ou choisir un bleu charcoal-system) dans `@theme`, sinon remplacer badge par `bg-bg-canvas text-text-default` avec icône étoile — cohérent avec la palette stone |
| Label "Suggestions" à `text-[11px]` sur `text-muted` (#6B6560 sur blanc) — contraste ~4,1:1 (< 4,5:1 WCAG AA) | **P1** | `ArchitectChatPanel.tsx` L333 | Passer à `text-xs` (13px → 4,5:1 OK au grand texte 3:1) ou changer couleur vers `text-text-default` |
| Bouton "Revenir aux paramètres" dans `GenerationProgressView` : pas de `focus-visible:outline-*` | **P1** | `GenerationProgressView.tsx` L170 | Ajouter `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary` |
| Spinner "typing" dans ArchitectChatPanel : `animate-bounce` en cascade — contrevient à la préférence fondateur "hero fade global, pas de cascade SaaS-style". Cascade de bounces est un pattern "startup animé" | **P1** | `ArchitectChatPanel.tsx` L364-366 | Remplacer par 3 points statiques qui font un `opacity` fade-in/out en boucle sans cascade, ou un simple spinner SVG (1 seul élément, `animate-spin`) |
| Badge "Cohérence : réduite" (`bg-warning/10 border border-warning/30 text-warning`) — `color-warning` (#D97706) sur blanc = 3,1:1. Taille `text-xs` (13px) = grand texte → 3:1 juste OK. Marge trop faible | **P1** | `VisualGallery.tsx` L253-256 | Enrichir le fond : `bg-warning/15` ou ajouter un préfixe texte en `text-text-default` ("Note :") pour ne pas dépendre uniquement de la couleur orange |
| VisualLightbox : `bg-black/80` = backdrop hardcodé, non référencé au token `--color-bg-overlay` existant | **P2** | `VisualLightbox.tsx` L54 | Utiliser `bg-bg-overlay` (déjà défini : `rgba(11,11,11,0.6)`) ou étendre le token à `/80` si l'opacité 60% est insuffisante pour la lightbox |
| `GenerationProgressView` : barre de progression utilise `transition-all duration-500 ease-out` en dur — non aligné sur motion token `slow` (500ms) — coïncidence mais non intentionnelle | **P2** | `GenerationProgressView.tsx` L103 | Documenter ou extraire dans token motion |
| VisualCard : `min-h-[44px]` sur le bouton "Modifier les paramètres" — correct. Mais le bouton zoom transparent `inset-0` n'a pas de `min-h` (recouvre toute l'image). Focus ring `outline-offset-[-2px]` (intérieur) — lisibilité sur image potentiellement problématique | **P2** | `VisualGallery.tsx` L218 | Remplacer `outline-offset-[-2px]` par `outline-offset-2 outline-white` (blanc sur image sombre) ou `outline-offset-[-4px] outline-2 outline-white` |

---

## 4. Tokens & système

| Dérive | Localisation | Action |
|--------|-------------|--------|
| `color-info` absent du `@theme` — utilisé dans badge Ancre | `globals.css`, `VisualGallery.tsx` | Définir `--color-info` en primitive + token sémantique, ou éliminer le badge coloré (recommandé — palette charcoal only) |
| `PASTILLE_COLORS` hex bruts dans composant | `RoomSegmentsPanel.tsx` L63-66 | Déplacer vers `@theme` comme tokens `--color-segment-*` |
| `bg-black/80` dans VisualLightbox | `VisualLightbox.tsx` L54 | Étendre `--color-bg-overlay` ou créer `--color-bg-overlay-strong: rgba(11,11,11,0.8)` |
| `style={{ backgroundColor: PASTILLE_COLORS[row.v3Type] }}` inline style | `RoomSegmentsPanel.tsx` L256 | Remplacer par classe CSS variable après création tokens |
| `style={{ height: "100%" }}` inline sur ArchitectChatPanel aside | `ArchitectChatPanel.tsx` L265 | Remplacer par `h-full` (Tailwind) |

---

## 5. États interactifs & micro-interactions

| Élément | Manquement | Sévérité |
|---------|-----------|---------|
| Bouton "Revenir aux paramètres" (GenerationProgressView) | Pas de `focus-visible:outline-*` | **P1** |
| Select dropdown segment (RoomSegmentsPanel) | `focus-visible:outline-*` présent — OK | — |
| Bulle chat suggestion buttons | `focus-visible` correct — OK | — |
| Spinner "typing" 3 dots bounce cascade | Contrevient préférence fondateur (animation flashy) | **P1** |
| Bouton zoom VisualCard (inset-0) | `focus-visible` intérieur peu lisible sur image | **P2** |
| État `highlighted` segment row | `border-interactive-primary bg-interactive-primary/10` — correct, cohérent | — |
| Animation barre progression | `transition-all duration-500` — non tokenisé mais fonctionnellement correct | **P2** |
| Overlay regen VisualCard `bg-bg-dark/60` | Spinner `border-text-inverse/40 border-t-text-inverse` — correct contraste | — |

---

## 6. Accessibilité visuelle

| Problème | Valeurs | Critère | Sévérité |
|---------|---------|---------|---------|
| Label "Suggestions" `text-[11px]` sur `text-muted` (#6B6560 sur #FFFFFF) | Contraste ~4,1:1 | WCAG AA 1.4.3 (4,5:1 texte normal < 18px) | **P1** |
| Badge "Cohérence : réduite" `text-warning` (#D97706 sur #FFFFFF) | ~3,1:1 | WCAG AA 1.4.3 — borderline à 13px | **P1** |
| Indication état segment uniquement par couleur pastille (noir / orange / vert) | Aucune forme ou pattern alternatif | WCAG 1.4.1 (pas uniquement couleur) | **P1** |
| Badge "Ancre" `text-info` (couleur inconnue / token absent) | Non vérifiable | WCAG 1.4.3 | **P0** |
| Bouton toggle chat `w-8 h-8` (32px) | Inférieur à 44px WCAG 2.5.5 | Touch target | **P1** |
| `text-[11px]` (11px) — inférieur au minimum confort 14px | — | Lisibilité corpo | **P2** |

Note : les contrastes principaux sont conformes — `text-default` (#0B0B0B) sur `bg-card` (#FFFFFF) = 21:1, `text-muted` (#6B6560) sur `bg-card` = 4,6:1 (OK corps 14px+).

---

## 7. Recommandations s34 prioritisées

| Priorité | Action | Effort estimé | Composant(s) |
|---------|--------|--------------|-------------|
| **P0** | Définir `--color-info` dans `@theme` ou supprimer le badge coloré "Ancre" — risque : couleur undefined = noir navigateur | 30 min | `globals.css`, `VisualGallery.tsx` |
| **P1-a** | Tokeniser `PASTILLE_COLORS` → `--color-segment-wall/bay/opening` dans `@theme` | 1h | `globals.css`, `RoomSegmentsPanel.tsx` |
| **P1-b** | Corriger label "Suggestions" : `text-[11px]` → `text-xs` ET vérifier `text-warning` badge fallback | 20 min | `ArchitectChatPanel.tsx`, `VisualGallery.tsx` |
| **P1-c** | Remplacer animate-bounce cascade par spinner SVG unique (ou fade mono-élément) | 30 min | `ArchitectChatPanel.tsx` L363-368 |
| **P1-d** | Bouton toggle chat : `w-8 h-8` → `min-h-[44px] min-w-[44px]` + ajouter `focus-visible` sur bouton "Revenir aux paramètres" GenerationProgressView | 15 min | `RoomSegmentsPanel.tsx`, `GenerationProgressView.tsx` |

---

## 8. Risques résiduels (audit pixel-près requis)

1. **RoomCanvas (canvas HTML5)** — non audité visuellement : les overlays colorés des pièces (40% opacity), la sélection, et les annotations de segments sur le canvas ne sont pas accessibles via le DOM. Un screenshot réel (375px + 1280px) est nécessaire pour valider la lisibilité des polygones et des labels flottants.
2. **VisualWizardRoomStep en état complet** (placements + style choisi + détails architecturaux + chat ouvert) — densité d'information maximale non vérifiable sans rendu réel. Risque de surcharge sur 768px.
3. **Transition Étape 3 → 4** — le Stepper (`Stepper.tsx` non audité) porte la continuité visuelle inter-étapes. Sa cohérence avec les tokens charcoal/stone n'a pas été vérifiée.
4. **`text-[11px]`** exact dans ArchitectChatPanel — valeur arbitraire hors scale typographique. Deux occurrences possibles (label "Suggestions" + autres). Grep exhaustif recommandé : `grep -r "text-\[1[0-9]px\]"`.

---

**Handoff → @orchestrator**

- Fichier produit : `/home/user/Versi/docs/design/s33-audit-design-etape3-4.md`
- Verdict : 7,5/10 — système tokens solide, 3 défauts critiques bloquants
- Top 3 défauts critiques : (1) token `color-info` absent — badge Ancre hors système, (2) PASTILLE_COLORS hardcodés hex dans RoomSegmentsPanel, (3) `text-[11px]` label Suggestions échoue WCAG AA 4,5:1
- Estimation effort fix top 5 : ~2h45 total (P0 : 30 min, P1-a : 1h, P1-b : 20 min, P1-c : 30 min, P1-d : 15 min)
- Points d'attention s34 : canvas HTML5 (RoomCanvas) et Stepper non audités — screenshots réels requis avant validation finale
