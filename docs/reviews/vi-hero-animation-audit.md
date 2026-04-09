# Audit animations Hero — versi.fr
**Agent** : @design | **Date** : 2026-04-09

## Verdict

PAS DE RÉGRESSION — Les animations sont correctement implémentées par élément individuel avec cascade de delays progressive.

---

## Analyse technique

### Architecture des animations

Chaque élément du Hero reçoit sa propre classe d'animation via une logique conditionnelle sur le state `loaded` :

| Élément | Classe appliquée | Delay |
|---|---|---|
| Surtitre (`hero__surtitre`) | `hero__fade hero__fade--0` | 0ms |
| Titre H1 (`hero__title`) | `hero__fade hero__fade--1` | 120ms |
| Accent bar (`hero__accent`) | `hero__fade hero__fade--2` | 240ms |
| Sous-titre (`hero__subtitle`) | `hero__fade hero__fade--3` | 360ms |
| CTAs (`hero__ctas`) | `hero__fade hero__fade--4` | 480ms |
| Scroll hint (`hero__scroll-hint`) | `hero__fade hero__fade--5` | 700ms |

6 éléments animés individuellement. Aucune animation sur `.hero__content`.

### Keyframe `heroFadeIn`

```css
@keyframes heroFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

- Durée : `var(--duration-slow)` = 500ms selon les tokens du projet
- Easing : `ease-out` — correct pour une entrée (accélération → décélération)
- Transform + opacity combinés — pas une opacité seule

### Déclenchement

Le state `loaded` est déclenché via `requestAnimationFrame(() => setLoaded(true))` dans le `useEffect` initial. Ce pattern est correct : il attend que le navigateur ait rendu une frame avant d'ajouter les classes d'animation, évitant le flash FOUC. La durée totale de la cascade : 700ms (dernier delay) + 500ms (durée animation) = 1 200ms. Dans la fenêtre acceptable.

### État `hero__hidden`

Quand `loaded = false`, les éléments ont `opacity: 0`. Correct — ils sont invisibles avant l'animation, sans effet de flash.

---

## Problèmes identifiés

### Mineur — `translateY` de 10px en limite basse

Le `translateY(10px)` est le minimum de perceptibilité selon le brief (10px minimum). Il passe, mais en basse résolution ou sur un écran très petit, le mouvement peut être quasi imperceptible. Le Hero de versi-immobilier utilise probablement la même valeur — à vérifier si le fondateur perçoit la différence entre les deux sites.

**Recommandation** : passer à `translateY(16px)` pour plus de présence sans excès. Facultatif.

### Mineur — `hero__scroll-hint` hors du flux conditionnel de fade

Le `hero__scroll-hint` est conditionné à `scrollHintVisible` (rendu conditionnel) ET à `loaded` (classe fade). Si `scrollHintVisible` est `false` au moment où `loaded` passe à `true` (scroll très rapide avant le premier rendu), l'élément n'est jamais rendu et n'entre jamais dans le DOM — comportement correct. Pas de bug, mais la logique est dépendante de deux states simultanés, ce qui peut être fragile si le comportement scroll change.

### Aucun bug critique détecté

- Le state `loaded` se déclenche bien
- Les classes CSS sont appliquées correctement par élément
- L'animation `heroFadeIn` est définie avec opacity ET transform
- La cascade de delays est progressive et logique

---

## Comparaison avec le standard attendu

L'audit précédent signalait : "Animation fade-in grossière — section entière qui apparaît d'un coup au lieu d'éléments individuels".

Ce problème est résolu dans le code actuel. Chaque élément possède sa propre classe `hero__fade--N` avec son propre delay. Le conteneur `.hero__content` n'a aucune animation appliquée.

**Hypothèse sur la régression signalée** : si le fondateur perçoit toujours une animation "d'un coup", le problème n'est pas dans le code JSX/CSS mais peut venir de :
1. Un cache navigateur qui charge une version antérieure du bundle
2. Un composant Hero différent chargé dans la route (vérifier que `/` charge bien ce `Hero.jsx` et non un `HeroSection.jsx` ou similar)
3. `var(--duration-slow)` mal résolu (token manquant → durée = 0ms → tout apparaît instantanément)

Vérifier que le token `--duration-slow` est bien défini dans les variables CSS globales.

---

## Recommandations

### P1 — Vérifier le token `--duration-slow` en production

Si `--duration-slow` n'est pas défini dans le `:root`, la durée de l'animation tombe à `0ms` (comportement CSS par défaut pour une valeur de variable non résolue sur `animation-duration`). Résultat : tous les éléments apparaissent instantanément, ce qui reproduit exactement le symptôme "apparaît d'un coup".

**Action pour @fullstack** : inspecter les CSS variables dans les DevTools du site en production, vérifier que `--duration-slow` retourne bien `500ms` (ou la valeur attendue).

### P2 — Passer `translateY` de 10px à 16px (optionnel)

Pour un mouvement plus perceptible et un rendu plus premium, porter la valeur à 16px dans `heroFadeIn`. Changement d'une ligne dans `Hero.css`.

### P3 — Ajouter `prefers-reduced-motion`

Actuellement absent. Standard WCAG 2.2 : les animations doivent être désactivées quand l'utilisateur a configuré ce préférence.

```css
@media (prefers-reduced-motion: reduce) {
  .hero__fade {
    animation-duration: 1ms;
    animation-delay: 0ms !important;
  }
}
```

---

## Handoff → @fullstack

**Fichiers concernés** :
- `/home/user/Versi/src/src/components/Hero.jsx` — aucune modification requise
- `/home/user/Versi/src/src/components/Hero.css` — 2 modifications optionnelles (P2 + P3)

**Actions requises** :
1. **P1 (prioritaire)** — Vérifier en production que `--duration-slow` est correctement défini dans le `:root` CSS global. Si absent ou non résolu → ajouter le token manquant dans le fichier de variables CSS
2. **P2 (optionnel)** — `translateY(10px)` → `translateY(16px)` dans `@keyframes heroFadeIn` si le fondateur trouve le mouvement trop subtil
3. **P3 (requis WCAG)** — Ajouter le block `prefers-reduced-motion` ci-dessus dans `Hero.css`

**Décision clé** : le code JSX et CSS des animations est correct. Si la régression est visible en navigation réelle, chercher en priorité côté tokens CSS non résolus, pas côté logique React.
