# Re-audit Persona Thomas — Etape 0 v2

**Date** : 2026-04-16
**Livrable** : `versi-studio/src/app/vs/page.tsx`
**Persona** : Thomas, marchand de biens, 35 ans

---

| # | Critere | v1 | v2 | Ce que je vois maintenant (Thomas) |
|---|---|---|---|---|
| C1 | Comprehension immediate | 6 | 8 | Le sous-titre est là : "Découpe de plans, identification des lots et génération de visuels post-travaux." C'est concret, je lis ça et je sais exactement ce que l'outil fait. En v1 j'avais "Mes opérations" et rien d'autre — j'aurais pu croire que c'était un CRM générique. Maintenant non. Petit bémol : "génération de visuels post-travaux" est la partie la plus vendeuse et elle arrive en dernier. Je l'aurais mis en premier. Mais c'est du détail — la correction est validée. |
| C2 | Parcours fluide | 8 | 8 | Pas de regression ici. Header propre, bouton "Nouvelle opération" bien placé en haut à droite. Le formulaire s'ouvre inline sans rechargement — c'est correct pour un outil pro. Le bouton bascule entre "Nouvelle opération" et "Annuler" selon l'état — logique. Rien à redire sur le flow. Score stable. |
| C3 | Valeur percue | 5 | 7 | L'empty state est maintenant actionnable : icone bâtiment, texte d'invitation, bouton "+ Nouvelle opération" en bleu. En v1 c'était un message passif. Là, si j'arrive pour la première fois, je sais quoi faire sans réfléchir. Ce qui me manque encore pour aller à 9 : le formulaire de création ne me dit pas combien de temps ça prend ni ce qui se passe après. Je crée une opération, et ensuite ? Je vais où ? (Je sais que ça redirige vers /upload mais visuellement rien ne le dit.) |
| C4 | Confiance | 7 | 8 | Deux points positifs : (1) le type_bien s'affiche maintenant en français dans la carte — "Immeuble" au lieu de "immeuble" ou d'un slug technique, c'est du détail qui compte. (2) le m² est bien affiché avec le vrai caractère UTF-8 — pas de "m2" ou de "\u00B2". Les messages d'erreur sont clairs et humains ("Saisis une adresse complète pour continuer.", "La création a échoué. Vérifie ta connexion et réessaie."). La gestion AbortError pour le cleanup — ça ne se voit pas mais c'est solide. Je reste à 8 parce que le H1 "Mes opérations" est stylistiquement lisible mais je ne peux pas vérifier visuellement le rendu de `vs-h1` ici — si c'est bien hiérarchisé en vrai, c'est 9. |
| C5 | Conviction | 6 | 8 | En v1 j'hésitais à créer ma première opération parce que l'état vide était désert. Maintenant l'état vide m'invite directement avec un CTA visible. Le formulaire est court — 3 champs, adresse obligatoire, type de bien avec un select propre, surface optionnelle. Je peux créer une opération en 20 secondes. C'est le bon niveau de friction pour un outil de travail. Ce qui me ferait monter à 9-10 : un indice après la création du type "Vous serez redirigé vers l'upload de plans" — juste pour que je sache ce qui m'attend. |

---

**Score global v2** : 7.8/10 (arrondi à **8/10**)

**Delta v1 → v2** : +1.4 points

**Verdict Thomas** : GO

---

## Ce qui a été corrigé (confirmé)

- Sous-titre contextuel sous H1 : présent et précis — C1 validée
- Empty state avec CTA : présent et actionnable — C5 validée
- type_bien en français via `TYPE_BIEN_OPTIONS.find()` avec fallback — C4 validée
- m² en UTF-8 réel dans le JSX : ligne 390, caractère direct — C4 validée
- H1 stylé avec classe `vs-h1` : présent ligne 77

## Ce qui reste à faire pour atteindre 9/10

1. **Feedback post-création** : ajouter une ligne sous le bouton "Créer l'opération" du type "Vous serez redirigé vers l'upload de vos plans" — 1 ligne de texte, zéro dev
2. **Ordre du sous-titre** : mettre "génération de visuels post-travaux" en premier ou en évidence — c'est le bénéfice le plus concret pour un marchand de biens
3. **H1 visuel** : vérifier que `vs-h1` rend bien une hiérarchie visible à l'écran (taille, poids) — à confirmer screenshot
