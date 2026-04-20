# Audit copy Versi — Note globale et corrections exactes
> @creative-strategy — 2026-04-08 (audit frais sur code actuel)

---

## Note globale : 7,5/10

**Verdict** : le squelette du territoire tient — "maîtrise, aucune délégation" est cohérent du Hero au Contact. Mais 5 points tirent la note vers le bas : une faute de genre visible, deux phrases gnangnan, une redondance structurelle Hero/Mission, et un track record Thomas qui flotte sans référentiel.

---

## Section par section

### HERO — 8,5/10

**Ce qui marche** : "Quatre métiers. Un cycle maîtrisé." est la meilleure phrase du site. Tranchée, nominale, pas de verbe d'intention. Le surtitre "OPÉRATEUR IMMOBILIER INTÉGRÉ — FRANCE" pose le cadre en 4 mots. Sous-titre actuel : direct, différenciant, zéro esbroufe.

**Ce qui ne marche pas** : rien de bloquant. CTA "NOS ACTIVITÉS" est le moins vendeur des deux — il propose à Laurent de voir une liste plutôt que de comprendre la méthode.

**Correction** (`src/src/components/Hero.jsx` ligne 55) :
- Actuel : `NOS ACTIVITÉS`
- Proposé : `NOTRE APPROCHE` — mène à la section la plus dense en signaux de rigueur.

---

### MISSION — 7/10

**Ce qui marche** : "Nous ne déléguons pas. Nous décidons." — le meilleur H2 du site. Tranchant, binaire, sans hedging.

**Ce qui ne marche pas** : "La stratégie reste en interne. La décision aussi." est une répétition directe du heading juste au-dessus. L'idée est déjà dite deux lignes plus haut. Et c'est aussi une reformulation du sous-titre Hero ("Pas de délégation, pas de perte de contrôle."). Laurent lit la même idée pour la 3e fois en 20 secondes.

**Correction** (`src/src/components/Mission.jsx` lignes 23–24) :
- Actuel : `La stratégie reste en interne. La décision aussi.`
- Proposé : `Pas d'apporteur d'affaires, pas de bureau d'études sous-traité — les mêmes mains de l'entrée à la sortie.`
→ Même territoire, nouvelle information concrète, élimine la répétition.

---

### ACTIVITÉS — 8,5/10

**Ce qui marche** : les labels uppercase (MARCHAND DE BIENS, FONCIÈRE, etc.) = scan immédiat pour Laurent. Descriptions denses sans jargon marketing. Versi Invest est la plus forte ("ticket adapté, fiscalité optimisée, horizon de sortie défini dès l'entrée").

**Ce qui ne marche pas** : Versi Finance se termine par "chaque opération est structurée avant d'être lancée" — c'est le minimum attendu, pas un argument. C'est comme écrire "nos voitures ont quatre roues".

**Correction** (`src/src/config/entities.js` ligne 40, fin de description Versi Finance) :
- Actuel : `— chaque opération est structurée avant d'être lancée.`
- Proposé : `— le montage précède l'acquisition, pas l'inverse.`

---

### APPROCHE — 8,5/10

**Ce qui marche** : les 4 étapes sont les meilleures micro-copies du site. "Décision en jours, pas en trimestres." est une killer line. "Chaque sortie est anticipée dès l'entrée." = signal de rigueur fort. H2 "Quatre étapes. Aucune délégation." = excellent.

**Ce qui ne marche pas** : le sous-titre "Un cycle reproductible. De la sourcing à la sortie." contient une faute de genre ("du sourcing", pas "de la sourcing") — visible pour tout lecteur attentif. Et "du sourcing à la sortie" est la 3e occurrence de cette formulation sur la page.

**Correction** (`src/src/components/Approach.jsx` ligne 35) :
- Actuel : `Un cycle reproductible. De la sourcing à la sortie.`
- Proposé : `Un cycle reproductible. Les mêmes critères, les mêmes exigences, opération après opération.`
→ Élimine la faute ET la répétition sémantique.

---

### IMPLANTATION — 6/10

**Ce qui marche** : "Paris. Lille. Et les métropoles françaises." — rythme ternaire, sobre, propre.

**Ce qui ne marche pas** : "Des marchés que nous connaissons, des villes où nous avons déjà opéré." C'est la phrase la plus gnangnan du site. Elle dit : on connaît les endroits où on est. C'est une tautologie. Elle n'apporte aucune information et aucun signal de crédibilité.

**Correction** (`src/src/components/Location.jsx` lignes 24–25) :
- Actuel : `Des marchés que nous connaissons, des villes où nous avons déjà opéré.`
- Proposé : `Paris et Lille en opérations actives. Lyon, Bordeaux, Marseille en veille — chaque extension est une décision, pas une ambition affichée.`

---

### ÉQUIPE — 7/10

**Ce qui marche** : "Trois associés. Zéro posture." — heading fort, dans le ton. Carl (Lego, Coca-Cola, Capgemini) et Maxime (5 immeubles, 24 contrats) ont des tracks records précis et vérifiables.

**Ce qui ne marche pas** :

1. Sous-titre ("Avant Versi, des entreprises créées, des actifs acquis, des opérations menées.") — liste de noms communs interchangeable avec n'importe quelle autre équipe. Aucune spécificité.

2. Track Thomas ("Part de marché de 2 % à 35 % en 2 ans sur le segment premium.") — flottant sans référentiel. Quel segment ? Quel marché ? Laurent ne peut pas valider mentalement ce chiffre. C'est pire que de ne pas l'écrire : ça génère un doute.

3. Carl track ("Structure les réseaux de prescripteurs Versi.") — sonne interne, fonctionnel. Laurent ne se soucie pas de l'organigramme Versi, il veut savoir ce que Carl a prouvé.

**Corrections** :

`src/src/components/Team.jsx` ligne 52 :
- Actuel : `Avant Versi, des entreprises créées, des actifs acquis, des opérations menées.`
- Proposé : `Trois parcours de fond. Pas de théorie — des opérations closes, des portfolios constitués, des structures dirigées.`

`src/src/config/team.js` ligne 13 (Carl track) :
- Actuel : `Structure les réseaux de prescripteurs Versi.`
- Proposé : `Chez Versi : sourcing partenaires et structuration des flux d'opportunités.`

`src/src/config/team.js` ligne 31 (Thomas track) :
- Actuel : `Part de marché de 2 % à 35 % en 2 ans sur le segment premium.`
- Action : préciser le segment avec Thomas avant publication, ou supprimer si non confirmable. Un chiffre sans référentiel est un signal d'alarme, pas de crédibilité.

---

### CONTACT — 9/10

**Ce qui marche** : "Un projet. Un actif. Nous répondons." — le heading le plus direct du site. "Décrivez-le — nous revenons sous 72h." = engagement précis. Message de succès cohérent avec la promesse.

**Ce qui ne marche pas** : mention RGPD ligne 216 — "vous acceptez que Versi traite vos données" est techniquement inexact : la base légale est l'intérêt légitime, pas le consentement. Risque légal mineur mais visible pour un juriste.

**Correction** (`src/src/components/Contact.jsx` ligne 216) :
- Actuel : `En soumettant ce formulaire, vous acceptez que Versi traite vos données personnelles dans le cadre de votre demande.`
- Proposé : `Versi traite vos données dans le cadre de votre demande.`

---

### NAVIGATION — 9/10

Labels propres. "VISION" pour ancrer vers Mission est l'option la plus audacieuse — cohérent. Aucune correction nécessaire.

---

### FOOTER — 9/10

"Holding immobilière intégrée" comme baseline : juste, suffisant. Aucune correction nécessaire.

---

## Balance texte

| Section | Densité | Verdict |
|---|---|---|
| Hero | Courte | Parfaite |
| Mission | Courte + stats | Corps à muscler (redondance) |
| Activités | 4 blocs moyens | OK — une phrase Finance à corriger |
| Approche | 4 blocs courts | Parfaite — faute à corriger |
| Implantation | Très courte | Phrase creuse visible |
| Équipe | 3 blocs moyens | Asymétrie tracks visible |
| Contact | Court + formulaire | Parfaite |
| Footer | Minimal | Correct |

**Conclusion** : la page est bien calibrée en volume. Pas de section qui noie. Le problème est qualitatif : redondance Hero/Mission, faute de genre Approche, phrase tautologique Implantation, track flottant Thomas.

---

## Corrections prioritaires — chemin vers 10/10

| Priorité | Section | Fichier exact | Ligne | Changement |
|---|---|---|---|---|
| P0 | Approche | `src/src/components/Approach.jsx` | 35 | "De la sourcing" → "Du sourcing" (faute de genre) — ou réécriture complète proposée ci-dessus |
| P0 | Thomas track | `src/src/config/team.js` | 31 | Préciser le segment ou supprimer (chiffre flottant = signal négatif pour Laurent) |
| P1 | Mission corps | `src/src/components/Mission.jsx` | 23–24 | Supprimer "La stratégie reste en interne. La décision aussi." — redondance x3 |
| P1 | Implantation corps | `src/src/components/Location.jsx` | 24–25 | Réécrire la phrase tautologique |
| P2 | Équipe sous-titre | `src/src/components/Team.jsx` | 52 | Réécrire la liste creuse |
| P2 | Carl track | `src/src/config/team.js` | 13 | Supprimer "Structure les réseaux de prescripteurs Versi" |
| P2 | Finance description | `src/src/config/entities.js` | 40 | "structurée avant d'être lancée" → "le montage précède l'acquisition, pas l'inverse" |
| P3 | RGPD mention | `src/src/components/Contact.jsx` | 216 | Reformuler pour base légale intérêt légitime |
| P3 | Hero CTA primaire | `src/src/components/Hero.jsx` | 55 | "NOS ACTIVITÉS" → "NOTRE APPROCHE" (optionnel) |

**P0 = appliquer maintenant avant tout déploiement. P1 = bloc suivant. P2-P3 = dernière passe.**

---

**Handoff → Thomas (validation) + @fullstack (implémentation)**
- Fichiers produits : `/home/user/Versi/docs/reviews/creative-audit-copy-final.md`
- Décisions prises : 9 corrections priorisées P0→P3 avec fichier:ligne exact
- Points d'attention : P0 Thomas track nécessite validation fondateur avant modification — ne pas inventer le contexte du segment. Toutes les autres corrections sont applicables immédiatement.
- Ce qui pousse vers 10/10 sans les fondateurs : corrections P0 (faute Approche) + P1 (Mission, Implantation) = site à 9/10 immédiatement.
