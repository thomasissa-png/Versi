# Re-audit persona Thomas versi-s21 — Itération 3 (ciblé P1-1 + P1-2)

**Date** : 2026-04-17
**Persona** : Thomas, 35 ans, marchand de biens, 8-12 opérations/an
**Scope** : Vérification ciblée des 2 P1 résiduels de it2

---

## Note globale : 9.5 / 10 (vs 8.8 en it2)

Les 2 irritants que je signalais en it2 sont corrigés. Je n'ai plus de friction cognitive à l'entrée de la page.

---

## P1-1 (note bbox approximative)

**Statut : RÉSOLU**

Je vois bien la note dans `LotPanel.tsx` (lignes 295-299). Elle apparaît directement sous le compteur de lots dès qu'au moins un lot est d'origine IA (`lots.some(l => l.source === "ai")`). Le texte "Les zones sont une approximation rectangulaire de l'union des pièces détectées." est lisible, en italique discret — ni intrusif ni caché. Quand je vois le rectangle du T3 déborder de 15 cm sur le couloir, je lis cette note et je comprends : c'est voulu, c'est à moi d'affiner si besoin. Je ne pense plus que l'IA se trompe. Friction éliminée.

---

## P1-2 (H1 conditionnel)

**Statut : RÉSOLU**

Dans `lots/page.tsx` (lignes 622-625), le H1 est conditionnel : si `hasAiExtracted && aiSuggestedLots.length > 0`, il affiche "N lot(s) à valider". Sinon, "Découpez vos lots". Sur mon R+3 avec 12 lots pré-créés, j'arrive et je lis "12 lots à valider" — c'est exactement ça. Je valide, je ne découpe pas. Le mot correspond à mon geste. La friction cognitive est nulle.

---

## Tableau 5 critères

| Critère | Note it2 → it3 |
|---|---|
| 1. Gain de temps ressenti | 8.5 → 9.5 — H1 "N lots à valider" me met dans le bon état d'esprit dès l'entrée. Je ne perds plus 5 secondes à me demander pourquoi on me dit de découper ce qui est déjà découpé. |
| 2. Confiance dans l'IA | 9 → 9.5 — La note bbox confirme que les débordements sont normaux. Je fais confiance au système plutôt que de le corriger par réflexe. |
| 3. Page blanche adressée | 9 → 9.5 — Les 5 états sont couverts, les messages sont cohérents avec la réalité du workflow. |
| 4. Cas dégradés gérés | 9.5 → 9.5 — Inchangé, déjà solide. |
| 5. Valeur vs prix 150€/mois | 8.5 → 9.5 — Le workflow complet (bannière → badge → H1 conditionnel → note bbox → undo) est maintenant cohérent de bout en bout. Sur mon R+3, 5-8 min de vérification au lieu de 80 min. Le calcul est évident. |

---

## Verdict persona final : GO

Les 2 P1 sont corrigés. Pas de nouveau irritant détecté dans les lignes auditées. La feature lots IA est production-ready pour mon usage.

**Thomas renouvelle l'abonnement 150€/mois : OUI.**

Sans hésitation. Le workflow est cohérent, les messages correspondent à ce que je fais réellement, et je sais exactement où concentrer mon attention sur chaque plan. C'est ce que j'attendais depuis it1.

---

## Handoff → @orchestrator

**Fichiers produits** : `docs/reviews/vs-s21-audit-marchand-it3.md`

**Décisions** :
- P1-1 (note bbox approximative) : RÉSOLU — `LotPanel.tsx` lignes 295-299, condition `lots.some(l => l.source === "ai")`, texte lisible et positionné correctement
- P1-2 (H1 conditionnel) : RÉSOLU — `lots/page.tsx` lignes 622-625, condition `hasAiExtracted && aiSuggestedLots.length > 0`, wording "N lot(s) à valider" conforme au workflow réel
- Note globale it3 : 9.5/10 — cible atteinte
- Verdict persona Thomas : GO — renouvellement OUI sans condition

**Points d'attention** :
- P1-3 (tooltip pièces incluses par lot) reste en backlog futur — non bloquant, confirmé it2
- Aucune régression détectée sur les corrections it2 validées (U4, U5, I7, badge confiance)
