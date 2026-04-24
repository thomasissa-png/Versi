# Versi-Invest — S26 : Simulation étape 3 + FAQ liste d'attente

> Rapport d'intervention copywriter — 2026-04-24
> [Framework : FAB] pour les métriques simulation — Feature (nom technique) → Advantage (ce que ça calcule) → Benefit (ce que ça signifie pour l'investisseur)
> [Framework : PAS inversé] pour la FAQ — Solution exposée d'abord, puis légitimation par le problème (rareté des bons biens)
> [Conscience : Solution-Aware] — le persona connaît l'investissement locatif, cherche un opérateur fiable, pas une initiation aux bases

---

## Fichiers modifiés

| Fichier | Nature de la modification |
|---|---|
| `versi-invest-site/src/pages/HomePage.jsx` | 3 métriques étape 03 (hints enrichis) + FAQ liste d'attente (réponse renforcée) |
| `versi-invest-site/src/pages/ProcessPage.jsx` | Définition Cashflow mensuel enrichie (étape 03, `definition`) |

---

## Chantier 1 — Simulation étape 3

### Constat préalable (analyse du code existant)

Les 3 métriques étaient DÉJÀ présentes dans le code — les deux composants avaient déjà la structure correcte et les classes CSS associées (`process__metrics`, `step__metrics`). Le travail portait sur la qualité des textes, pas sur l'ajout de structure.

**HomePage.jsx** (étape 03 dans `PROCESS_STEPS`) : les `hint` étaient trop courts et trop techniques. Le TRI s'appelait "TRI (10 ans)" sans développer le sigle. Le CoC n'expliquait pas la formule.

**ProcessPage.jsx** (étape 03 dans `STEPS`) : le TRI et le CoC avaient déjà des définitions complètes et satisfaisantes. Seule la définition du Cashflow était trop courte — elle listait les charges sans distinguer la nuance "rendement brut affiché vs liquidités nettes".

### Texte final — métriques homepage (HomePage.jsx)

```
Cashflow mensuel | ex. +1 750 €/mois
Ce qui atterrit sur le compte chaque mois — loyers encaissés moins crédit,
charges, assurances et vacance provisionnée.

TRI — Taux de Rendement Interne | ex. 12–15 % sur 10 ans
L'indicateur long terme : cashflow cumulé + plus-value à la revente
+ effet levier du crédit, ramenés à un taux annuel.

CoC — Cash-on-Cash Return | ex. 13 %/an sur l'apport
Ce que votre mise de départ rapporte chaque année.
Cashflow annuel ÷ apport initial — simple, direct, parlant.
```

### Texte final — définition Cashflow ProcessPage (ProcessPage.jsx)

```
Loyers encaissés moins toutes les charges : mensualité crédit, charges de
copropriété, taxe foncière, assurance PNO, et vacance locative provisionnée.
Ce qui atterrit réellement sur le compte chaque mois — pas le rendement brut
affiché, les liquidités nettes.
```

### Cohérence Nanterre vérifiée

Le Cashflow mensuel affiche "ex. +1 750 €/mois" sur la homepage et "ex. +1 750 €/mois sur un immeuble de 8 studios à Nanterre" sur ProcessPage — cohérent avec la page Références.

---

## Chantier 2 — FAQ liste d'attente

### Constat préalable

La Q/A "Pourquoi y a-t-il une liste d'attente ?" existait DÉJÀ en position 2 (index 1) dans `FAQ_ITEMS`. Elle n'était pas à créer mais à renforcer sur 2 axes manquants :
1. L'aspect "sélection par les fondateurs en personne, pas de flux automatique" était absent
2. Le mécanisme "on vous contacte quand un bien correspond à votre profil" n'était pas explicité

### Texte final Q+R (tel qu'intégré dans le code)

**Q : Pourquoi y a-t-il une liste d'attente ?**

R : Parce que les bons biens sont rares — et on ne présente que ceux-là. Chaque opportunité est analysée et visitée par un fondateur en personne : pas de flux automatique, pas de dossier sous-traité. La majorité des biens qu'on analyse ne passent pas nos filtres — rendement insuffisant, cashflow fragile, montage trop risqué, vendeur peu fiable. On refuse régulièrement des biens qui sembleraient "corrects" à un regard extérieur. Résultat : on présente peu de dossiers, mais chacun tient la route en scénario dégradé. La liste d'attente, c'est notre façon de ne pas accueillir plus d'investisseurs qu'on ne peut vraiment servir. Quand un bien correspondant à votre profil se présente, on vous contacte.

**Placement** : position 2 (inchangé) — la question sur les honoraires (position 1) est prioritaire pour les nouveaux visiteurs.

---

## Questions résiduelles pour Thomas

1. **Valeurs TRI sur la homepage** : actuellement "ex. 12–15 % sur 10 ans" — cohérent avec ProcessPage qui affiche "10–15 %". Quelle fourchette est la plus représentative de vos opérations réelles ? Recommandation : aligner les deux sur la même fourchette pour éviter toute incohérence de perception.

2. **Nom "CoC Return" vs "CoC — Cash-on-Cash Return"** : homepage utilise désormais le nom complet (cohérent avec ProcessPage). Valider que vous êtes à l'aise avec l'acronyme CoC visible — certains personas financiers le connaissent, d'autres non. L'alternative serait "Rendement sur apport" mais perd en précision.

3. **Aucun composant CSS à modifier** : les modifications portent uniquement sur les données (arrays JS) — le design existant affiche déjà les 3 champs `label / value / hint` et `label / example / definition`. Rien à coder côté @fullstack.

---

## Pre-commit syntax check

Les fichiers `.jsx` ne s'exécutent pas avec `node --check` (JSX n'est pas du JS natif). Vérification manuelle effectuée :

- `HomePage.jsx` : apostrophes échappées (`\'`) dans les strings JS — OK. Structure des objets dans les arrays — accolades fermantes et virgules — OK.
- `ProcessPage.jsx` : idem — OK.

Pour une vérification complète : `npx tsc --noEmit` dans `versi-invest-site/` avant commit (si tsconfig présent) ou build Vite/Webpack sans erreur.
