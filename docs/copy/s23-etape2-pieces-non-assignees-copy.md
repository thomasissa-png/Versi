# Étape 2 — Copy "Pièces non assignées"

> Produit par @copywriter | Session s23 | 2026-04-20
> Framework : UX writing — état informatif + instruction contextuelle
> Niveau de conscience : Thomas est dans l'outil, il connaît le produit — Product-Aware
> Objections traitées : "est-ce un bug ?" / "dois-je m'en occuper ?" — méthode : label rassurant + explication de contexte

---

## 1. Diagnostic du wording actuel

**Texte actuel :**
> "Pièces non assignées (1)"
> "ECS · surface inconnue · étage 0"
> "Ces pièces n'ont pas été rattachées à un lot (parties communes, couloirs, locaux techniques)."

**Cinq problèmes identifiés :**

1. "Pièces non assignées" — jargon de base de données, pas du vocabulaire marchand. Thomas pense en "local", "cage d'escalier", "ballon". Pas en "pièce assignée".
2. "Surface inconnue" — information négative sans valeur. Si la surface n'est pas détectée, ne rien afficher est préférable à signaler une absence.
3. "ECS" — sigle technique opaque pour qui n'a pas lu un carnet d'entretien récemment. Un non-initié ne sait pas ce que c'est.
4. La phrase explicative commence par "n'ont pas été" — construction passive, ton défensif. Sous-entendu : quelque chose a manqué. Or c'est le comportement attendu, pas une erreur.
5. Les exemples mélangent trois cas sans hiérarchie ("parties communes, couloirs, locaux techniques") — la liste est informative pour le développeur, pas pour Thomas.

---

## 2. Trois variantes de wording

### Variante A — Neutre et factuel (recommandée)

**Label de section**
> Hors lots

**Ligne par pièce — surface connue**
> [Nom pièce] · [X] m² · étage [N]

**Ligne par pièce — surface inconnue**
> [Nom pièce] · étage [N]

*Règle : si surface inconnue, ne pas afficher le champ. Zéro mention de l'absence.*

**Phrase explicative**
> Parties communes et locaux techniques détectés sur le plan.

---

### Variante B — Contextuel et rassurant

**Label de section**
> Zones hors vente

**Ligne par pièce — surface connue**
> [Nom pièce] · [X] m² · étage [N]

**Ligne par pièce — surface inconnue**
> [Nom pièce] · étage [N]

**Phrase explicative**
> Ces zones ne font pas partie de vos lots. Aucune action requise.

---

### Variante C — Orienté action (si le bloc devient actionnable)

**Label de section**
> Zones non affectées

**Ligne par pièce — surface connue**
> [Nom pièce] · [X] m² · étage [N]

**Ligne par pièce — surface inconnue**
> [Nom pièce] · étage [N]

**CTA par ligne**
> Rattacher à un lot

**Phrase explicative**
> Ces zones peuvent être rattachées à un lot existant ou laissées de côté.

---

## 3. Variantes par contexte d'affichage

| Contexte | Label | Texte secondaire | Action |
|---|---|---|---|
| **Supprimé** | — | — | — |
| **Collapsé** | Hors lots · [N] zone / [N] zones | — | Clic pour développer |
| **Actionnable** | Hors lots | Ces zones peuvent être rattachées à un lot existant. | Rattacher à un lot |
| **Déplacé Étape 3** | Zones non habitables | Ces zones n'apparaissent pas dans les fiches pièces. | — |

**Règle pluriel collapsé :** "1 zone" / "3 zones" — jamais de parenthèses. Pluralisation par condition if/else côté code.

---

## 4. Cas ECS — libellé humain

ECS = Eau Chaude Sanitaire. Pour Thomas (et pour tout acheteur qui lira le dossier), "ECS" est opaque.

**Options de libellé :**

| Libellé technique | Libellé recommandé | Variante courte |
|---|---|---|
| ECS | Chaufferie / local chaudière | Local technique |
| WC communs | Sanitaires communs | Sanitaires |
| Cage d'escalier | Cage d'escalier | — (déjà lisible) |
| Palier | Palier | — (déjà lisible) |
| Gaine technique | Gaine technique | Local technique |

**Règle :** si le nom de pièce extrait est un sigle ou un code (ECS, GTC, VE…), le remplacer par un libellé humain via table de correspondance. Si aucune correspondance n'existe, afficher "Local technique" par défaut.

**Implémentation @fullstack :** ajouter une table de mapping `technical_label → human_label` dans les constantes. Priorité : ECS en premier (cas le plus fréquent en immeuble).

---

## 5. Recommandation finale

**Variante A avec label "Hors lots".**

**Pourquoi :**

"Hors lots" dit exactement ce que c'est sans jugement de valeur. Thomas comprend immédiatement — c'est ce qui ne se vend pas. Pas un oubli, pas une erreur. Un fait de plan.

La phrase explicative "Parties communes et locaux techniques détectés sur le plan" informe sans alarmer. Elle confirme que l'outil a bien lu le plan, y compris les zones non vendables.

L'absence de surface quand elle est inconnue évite l'effet "champ vide" qui crée l'impression d'un bug. Si on n'a pas l'info, on ne la montre pas.

**Wording final recommandé — état collapsé (option @ux) :**

| Zone | Texte |
|---|---|
| Label de section | `Hors lots` |
| Compteur | `[N] zone` / `[N] zones` |
| Phrase sous le label (développé) | `Parties communes et locaux techniques détectés sur le plan.` |
| Ligne pièce avec surface | `[Libellé humain] · [X] m² · étage [N]` |
| Ligne pièce sans surface | `[Libellé humain] · étage [N]` |

---

**Handoff → @fullstack**
- Fichier produit : `/home/user/Versi/docs/copy/s23-etape2-pieces-non-assignees-copy.md`
- Décisions prises : label "Hors lots", suppression de "surface inconnue", table de mapping sigle → libellé humain (ECS en priorité), pluralisation sans parenthèses
- Points d'attention :
  - Ne jamais afficher "surface inconnue" — si surface null, ne pas afficher le champ
  - Implémenter la table de mapping `technical_label → human_label` pour ECS et les cas courants
  - Le compteur "N zones" est pluralisé par condition if/else — jamais de `(s)`
  - Si @ux choisit l'option "collapsé", le label collapsé = `Hors lots · [N] zone` (1) ou `Hors lots · [N] zones` (N > 1), sans la phrase explicative
  - Si @ux choisit l'option "actionnable", ajouter le CTA "Rattacher à un lot" par ligne
