# Stratégie LinkedIn — Versi

> Produit par @social | Date : 2026-04-08
> Sources : project-context.md, docs/strategy/brand-platform.md, docs/copy/brand-voice.md
> Périmètre : LinkedIn uniquement — seul réseau pertinent pour une holding immobilière B2B (Laurent, Pierre)

---

## 1. Page entreprise vs profils personnels

**Décision : double levier, dans cet ordre.**

**Phase 1 (immédiat — avant site live)** : les 3 profils fondateurs sont l'actif principal. Thomas, Maxime et Carl publient individuellement. Raison : une page entreprise Versi sans abonnés ni site live est une coquille vide. Le reach organique des profils personnels est structurellement supérieur à celui des pages entreprise sur LinkedIn (ratio 5:1 en moyenne). Laurent googlesoit d'abord les fondateurs — les profils sont sa première source de validation.

**Phase 2 (dès le site live)** : créer la page entreprise Versi. Rôle : vitrine institutionnelle, pas canal de contenu. La page centralise les informations (site, entités, équipe), chaque fondateur la mentionne dans son profil. Les posts restent sur les profils personnels — on republie les posts les plus performants sur la page.

**Règle de base des profils** : section About = mini-site Versi (maîtrise du cycle complet, 4 entités, Paris + Lille). Featured = lien versi.fr dès le lancement. Chaque profil mentionne les 2 autres co-fondateurs.

---

## 2. Content Pillars — 4 types de posts (ratio cible)

| Pilier | Ratio | Fonction | Exemple d'angle |
|---|---|---|---|
| **Opérations & méthode** | 40% | Prouver la maîtrise du cycle | "Pourquoi on refuse les opérations qu'on ne peut pas structurer en interne" |
| **Marché & analyse** | 25% | Thought leadership, nourrir Laurent | "Ce que le marché 2026 dit aux marchands de biens qui n'ont qu'un métier" |
| **Preuves sociales & track record** | 25% | Crédibilité concrète | "35+ biens locatifs. Ce qu'on a appris sur la structuration." |
| **Coulisses équipe** | 10% | Humaniser sans perdre le ton | "3 fondateurs, 3 expertises — pourquoi on ne s'est pas divisé les rôles" |

**Règle anti-répétition** : tenir un registre des posts publiés (sujet + angle). Jamais deux posts sur le même sujet avec le même angle. Le registre est mis à jour après chaque publication.

**Framework des 3E** : chaque post Éduque (méthode, marché), Engage (question, opinion tranchée) ou suscite de l'Envie (track record, opération en cours). Zéro post sans valeur concrète pour Laurent ou Pierre.

---

## 3. Stratégie de lancement — Post d'annonce du site

**Timing** : publié le jour du go-live versi.fr, depuis les 3 profils fondateurs (version identique ou légèrement adaptée au ton de chacun).

**Structure du post d'annonce** :

```
Hook (ligne 1, tronquée avant "voir plus") :
"On a passé 6 mois à construire Versi. Voilà ce qu'on a compris."

Corps :
L'immobilier de qualité mérite des opérateurs qui maîtrisent l'ensemble du cycle.
Pas des intermédiaires qui passent la main à chaque étape.

Versi, c'est quatre métiers sous un même toit :
→ Marchand de biens (Versi Développement)
→ Structuration d'investissement (Versi Invest)
→ Foncière (Versi Capital)
→ Ingénierie financière (Versi Finance)

Aucun sous-traitant sur les points critiques. Tout en interne.

Le site est live : [lien versi.fr]

CTA (dernière ligne) :
Si vous cherchez un opérateur qui maîtrise le cycle complet — on est là.
```

**Règle LinkedIn** : lien dans le premier commentaire, pas dans le post (algo LinkedIn pénalise les posts avec lien externe dans le corps). Le post ne contient aucun lien — le lien est ajouté en commentaire épinglé immédiatement après publication.

**Engagement J+1** : les 3 fondateurs commentent mutuellement les posts des autres (amplification croisée sans paraître artificielle).

---

## 4. Workflow d'automatisation IA — Production de contenu récurrent

**Principe** : un fondateur solo ne peut pas produire 3-4 posts/semaine manuellement. Le workflow IA réduit le temps de production à 15 min/post.

**Fréquence cible** : 2 posts/semaine par fondateur actif (Thomas en priorité) = 8 posts/mois minimum. Réaliste avec le workflow ci-dessous.

**Workflow en 4 étapes** :

1. **Input** : Thomas fournit un sujet (1 phrase) ou un événement terrain (opération, réunion, décision)
2. **Génération batch** : prompt calibré (voir ci-dessous) → 3 variations du post (angles différents)
3. **Sélection + retouche** : Thomas choisit la variation, ajuste 2-3 phrases en ton personnel (5 min)
4. **Scheduling** : publication via Buffer (gratuit jusqu'à 3 canaux) ou publication directe

**Prompt de génération LinkedIn (à utiliser dans Claude ou ChatGPT)** :

```
Tu es Social Media Strategist pour Versi, holding immobilière intégrée (Paris, Lille).
Ton : confiant, direct, zéro bullshit, zéro jargon marketing. Du caractère.
Registre : vouvoiement interdit dans les posts (tutoiement ou formulation neutre).
Persona cible : Laurent (investisseur privé / family office, 48 ans, lit entre les lignes).
Pilier : [OPÉRATIONS / MARCHÉ / TRACK RECORD / COULISSES]
Sujet : [SUJET EN 1 PHRASE]

Produis 3 variations de posts LinkedIn :
- Variation A : hook "pattern interrupt" (contre-pied d'une idée reçue)
- Variation B : hook "statistique ou fait concret" (chiffre ou observation terrain)
- Variation C : hook "storytelling open loop" (situation, tension, résolution)

Format : 150-250 mots, alinéas courts, pas d'emojis, pas de hashtags génériques.
Dernier paragraphe = CTA discret (pas "likez et partagez").
```

**Repurposing automatique** : tout post LinkedIn performant (>50 impressions organiques, >5 commentaires) est transformé en :
- 1 bloc de contenu pour la section "Approche" du site (texte déjà écrit, validé par l'engagement)
- 1 passage LLM-ready pour docs/geo/geo-strategy.md (handoff @geo)

**Registre des posts** : fichier `docs/social/posts-log.md` — une ligne par post publié (date, fondateur, pilier, sujet, angle, métriques J+7). Mis à jour manuellement après chaque publication. Permet de détecter les angles déjà traités avant de générer un nouveau post.

**Scheduling** : Buffer (plan gratuit, 3 canaux, 10 posts en file). Planifier les posts le dimanche soir pour la semaine suivante. Meilleurs créneaux LinkedIn B2B : mardi-jeudi, 8h-9h ou 12h-13h.

---

## Métriques de performance

| Métrique | Seuil cible (M+3) | Seuil alerte |
|---|---|---|
| Taux d'engagement (likes+commentaires/impressions) | > 3% | < 1.5% |
| Croissance followers profils fondateurs | +50/mois | < 20/mois |
| Impressions organiques par post | > 500 | < 150 |
| Prises de contact LinkedIn attribuées | 1-2/mois | 0 |

Revue mensuelle des métriques par Thomas. Ajustement du pilier sous-performant (réduire sa fréquence, changer les angles).

---

**Handoff → @copywriter**
- Fichiers produits : `docs/social/social-strategy.md`
- Décisions prises : LinkedIn uniquement (B2B, persona Laurent + Pierre). Double levier profils personnels (prioritaires) + page entreprise (vitrine, phase 2). 4 content pillars définis (40/25/25/10). Lien post d'annonce en commentaire épinglé (règle algo LinkedIn). Workflow IA = prompt batch + Buffer gratuit. Fréquence : 2 posts/semaine par fondateur actif.
- Points d'attention : le post d'annonce ci-dessus est une structure — @copywriter doit produire les versions finales adaptées au ton de chaque fondateur (Thomas, Maxime, Carl) dans leur registre propre. Le brand-voice.md est la référence. Vouvoiement hors site (sur LinkedIn, ton plus direct). Signaler à @legal si Versi lance un concours ou un challenge LinkedIn (implications juridiques).
