# Audit UX — Contour polygone appartement (s27)
Date : 2026-04-29 | Agent : @ux

---

## 1. Crédibilité du tracé — notes par plan

### RDC (plan_RDC_projet2)
**Note : 8/10**

Le contour vert suit fidèlement les murs extérieurs de l'appartement. La forme en L est respectée, les angles droits sont nets, les décrochés sur la facade sont capturés. Deux réserves mineures : la zone arrondie côté escalier (gauche) est légèrement débordante sur l'espace commun de la cage d'escalier — pas dramatique mais visible à l'oeil. L'utilisateur dira "oui, c'est mon appartement" dans 8 cas sur 10.

### R+1 (plan_R+1_projet2)
**Note : 6/10**

Le tracé est globalement correct mais présente des irrégularités notables sur le bord droit (séjour/cuisine) : le contour grignoote des micro-saillies qui ne correspondent à aucun mur réel — le bord côté façade droite est dentelé alors qu'il devrait être droit. La découpe à gauche (Chambre 01 coupée hors polygone) est problématique : l'utilisateur voit une pièce entière partiellement exclue du contour. Réaction probable : "pourquoi ma chambre est à moitié dehors ?"

### R+2 (plan_R+2_projet2)
**Note : 5/10**

C'est le plan le plus fragile. Le bord supérieur est propre, mais le bord inférieur droit (séjour/cuisine 42 m²) présente un décrochement en escalier qui ne correspond à aucune géométrie réelle du plan — visible comme une erreur. Le bord gauche (cellier/entrée) a un trou de couverture au niveau de l'escalier commun. L'utilisateur dira "ce n'est pas exactement ça" et perdra confiance dans le système.

### R+3 (plan_R+3_projet2)
**Note : 7/10**

Le tracé est plutôt convaincant sur ce niveau malgré une géométrie complexe (pans coupés, terrasse). Le polygone capture bien les angles obliques côté façade droite. La réserve principale : la zone gauche inclut ce qui semble être un balcon/terrasse avec bardage (hachures vertes) — l'utilisateur peut légitimement se demander si la terrasse fait partie du "lot". Ce n'est pas une erreur de tracé mais une ambiguïté métier à clarifier.

---

## 2. Friction utilisateur — modes de récupération

### Friction principale identifiée
L'utilisateur ne sait pas si les imperfections sont des erreurs de l'IA ou des spécificités du plan. Il n'a pas d'affordance pour agir.

### Recommandations par niveau de confiance tracé

**Note >= 8 (RDC) :** Affichage direct avec bouton "Confirmer ce contour". Friction minimale.

**Note 6-7 (R+1, R+3) :** Affichage + message contextuel "Vérifiez que toutes vos pièces sont incluses" + bouton "Ajuster manuellement". Sans ce message, l'utilisateur ne sait pas que l'ajustement est possible.

**Note <= 5 (R+2) :** Ce niveau NE DOIT PAS être présenté en V1 sans retry automatique d'abord. Si le tracé dépasse un seuil d'erreur, proposer "Recalculer le contour" avant de montrer à l'utilisateur.

### Fonctionnalités requises (par priorité)
1. **Retry button** (P0) : "Recalculer le contour" — relancer l'extraction avec paramètres différents. Sans ça, l'utilisateur est bloqué.
2. **Mode édition manuelle** (P1) : drag des points du polygone pour corriger les micro-erreurs. Ne peut pas être absent en V1 — les plans R+1 et R+2 en ont besoin.
3. **Fallback rectangle** (P2) : si l'extraction échoue complètement, proposer un rectangle que l'utilisateur redimensionne. Dernier recours, pas le flux principal.

---

## 3. Risque d'abandon utilisateur

| Plan | Note tracé | Risque abandon | Motif |
|---|---|---|---|
| RDC | 8/10 | Faible | Tracé convaincant, formes simples |
| R+1 | 6/10 | Moyen | Chambre partiellement exclue visible |
| R+2 | 5/10 | Elevé | Bord dentelé non justifié, décalage géométrique |
| R+3 | 7/10 | Moyen | Ambiguïté terrasse, sinon acceptable |

**Seuil critique** : dès qu'une pièce nommée (Chambre 01, Séjour) est partiellement hors contour, le risque d'abandon monte à Elevé quel que soit le score global. L'utilisateur n'accepte pas qu'une pièce soit "à moitié dans son appartement".

---

## 4. Recommandation onboarding — mode d'affichage

**Recommandation : calque comparatif, pas contour seul.**

Afficher le plan original en fond (gris neutre) + contour vert en surimpression. C'est ce que font les 4 screenshots — c'est le bon choix. Ne jamais afficher le contour seul sur fond blanc : l'utilisateur perd la référence spatiale.

**Texte d'accompagnement obligatoire :** "Voici le contour détecté de votre appartement. Vérifiez que toutes les pièces sont bien incluses." — sans cette instruction, l'utilisateur regarde sans savoir ce qu'on lui demande de valider.

**Indicateur de confiance** (optionnel V1, recommandé V2) : score de confiance de l'IA ("Détection : bonne / à vérifier / incertaine") pour préparer l'utilisateur à devoir corriger.

---

## 5. VERDICT V1 publique

**GO conditionnel — 2 prérequis bloquants avant lancement.**

| Condition | Statut |
|---|---|
| RDC : acceptable tel quel | OK |
| R+3 : acceptable avec texte d'aide terrasse | OK avec copy |
| R+1 : nécessite mode édition manuelle | BLOQUANT |
| R+2 : nécessite retry automatique + seuil de qualité | BLOQUANT |
| Retry button absent | BLOQUANT |
| Mode édition polygone absent | BLOQUANT |

**Ce qui doit être fixé avant V1 publique :**
1. Implémenter le bouton "Recalculer" (retry extraction) — sans lui, l'utilisateur est bloqué sur R+2
2. Implémenter l'édition manuelle du polygone (drag des points) — sans elle, R+1 génère de l'abandon
3. Ajouter le texte d'instruction de validation sur l'écran de confirmation du contour

**Ce qui peut attendre V2 :**
- Score de confiance IA affiché à l'utilisateur
- Fallback rectangle automatique
- Historique des tentatives d'extraction

---

## Tests UX — Flow confirmation de contour

| Test | Critère de succès | Statut |
|---|---|---|
| Persona peut identifier son appartement | Contour couvre toutes les pièces nommées | RDC/R+3 : OK — R+1/R+2 : KO |
| Charge cognitive : action principale claire | 1 seule décision demandée (valider ou non) | OK si texte d'instruction présent |
| Edge case : tracé partiel d'une pièce | Mode édition disponible | KO — non implémenté |
| Edge case : tracé incohérent | Retry disponible | KO — non implémenté |
| Accessibilité WCAG 2.2 AA | Contour vert sur blanc = ratio >= 3:1 | A vérifier sur fond plan |

---

*Handoff → @fullstack : implémenter retry button et mode édition polygone (drag points) avant toute V1 publique.*
*Handoff → @copywriter : rédiger le texte d'instruction de validation et le message d'ambiguïté terrasse (R+3).*
