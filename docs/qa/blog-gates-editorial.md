# Gates éditoriales — Articles blog versi-immobilier.fr

> Produit par @copywriter | Date : 2026-04-13
> Références : `docs/seo/vi-blog-editorial-framework.md`, `docs/strategy/vi-blog-autonomous-pipeline.md` (sections 3 et 5), `docs/copy/brand-voice.md`, `project-context.md`
> Usage : ces gates s'appliquent APRÈS les checks V1-V22 (techniques). Un article qui passe V1-V22 mais échoue une gate GE-BLOQUANT n'est pas publié. Ces gates sont évaluées par IA (prompt de review) ou par un fondateur selon la méthode indiquée.

---

## 1. Tableau des gates éditoriales (GE-1 à GE-10)

| # | Nom | Classe | Méthode | PASS | FAIL |
|---|---|---|---|---|---|
| GE-1 | Accroche — entrée directe dans le sujet | BLOQUANT | IA review : lire le premier paragraphe | Premier paragraphe pose un fait, un chiffre ou une situation concrète propre au sujet | Premier paragraphe est une généralité, une question rhétorique ouverte, ou un constat valable pour n'importe quel blog immobilier |
| GE-2 | Brand voice Versi — ton confiant, zéro posture commerciale | BLOQUANT | IA review : analyse du registre sur 3 passages | Le texte parle de faits et de chiffres — les adjectifs sont absents ou remplacés par leur preuve | Présence de formulations auto-décernées : "notre équipe sérieuse", "nous vous accompagnons", "la confiance que vous nous accordez" |
| GE-3 | Spécificité Versi — contenu non reproductible par un concurrent | BLOQUANT | IA review + vérification fondateur si P2 | L'article contient au moins 1 donnée, adresse, chiffre ou récit propre aux opérations Versi, au marché lillois précis, ou au process Versi | L'article est une compilation de données publiques sans ancrage Versi — retirez le nom "Versi" et l'article s'applique à n'importe quel MDB de France |
| GE-4 | Rythme — paragraphes courts et lecture fluide | REQUIS | Automatisable (complément de V14) : détecter les transitions abruptes | Chaque paragraphe fait max 5 lignes, les transitions entre sections sont logiques, aucun bloc de texte dense ne bloque la lecture | Un ou plusieurs passages lisibles d'une seule traite dépassent 5 lignes ET la progression logique entre deux H2 successifs est absente |
| GE-5 | Données sourcées et crédibles — zéro chiffre en l'air | BLOQUANT | IA review : vérifier que chaque donnée chiffrée est accompagnée d'une source explicite entre parenthèses | Tout prix, délai, statistique est suivi de sa source : (DVF 2025), (source : notaires Nord, T3 2025), (données Versi, opération rue X) | Au moins 1 chiffre apparaît sans source, ou la source est vague : "selon les experts", "d'après les études" |
| GE-6 | CTA naturel — non saillant, non commercial | REQUIS | IA review : lire le CTA en contexte | Le CTA découle du contenu — il répond à une logique d'action évidente après la lecture. Il ne ressemble pas à un encart publicitaire | Le CTA est plaqué en fin d'article sans lien avec le contenu ("Pour en savoir plus sur nos biens, contactez-nous"), ou il utilise des mots de la liste interdite |
| GE-7 | Registre persona — ton calibré à Kévin, Sophie ou Pierre | REQUIS | IA review : cross-check entre persona déclaré dans le frontmatter et registre effectif | Le niveau de technicité, le vocabulaire et les exemples correspondent au persona déclaré dans le brief (P3-Kévin = accessible, P2-Pierre = dense, P1-Sophie = orienté process) | Le registre est trop technique pour Kévin (acronymes non définis) ou trop générique pour Pierre (explications qu'un notaire connaît depuis 20 ans) |
| GE-8 | Anti-filler — zéro phrase sans valeur informative | REQUIS | IA review : identifier les phrases dont la suppression ne change pas le sens | Chaque phrase ajoute une information, un fait, un exemple ou une nuance. Pas de remplissage | Présence de phrases-coussins : "Il est important de noter que...", "Comme nous l'avons vu précédemment...", "En conclusion, nous pouvons dire que..." |
| GE-9 | Ancrage géographique Hauts-de-France | REQUIS | Grep sur noms de communes (Lille, Roubaix, Tourcoing, Valenciennes, Fives, Wazemmes, Hellemmes, Faches-Thumesnil, métropole lilloise) | L'article mentionne au moins 1 commune ou quartier spécifique des HdF en lien avec les données citées | L'article parle du "marché local" ou de "notre zone" sans jamais nommer une commune ou un prix au m² lié à une adresse réelle |
| GE-10 | Voix active dominante | REQUIS | IA review : détecter les constructions passives évitables | > 90% des phrases sont à la voix active. Quand le passif est utilisé, c'est justifié (focus sur le receveur de l'action) | Présence de constructions passives systématiques évitables : "a été rénové", "sera pris en charge", "peut être constaté" là où la voix active est possible |

## 2. Détail de chaque gate

---

### GE-1 — Accroche : entrée directe dans le sujet

**Classe : BLOQUANT**

**Critère PASS/FAIL**
Le premier paragraphe (avant le premier H2) entre directement dans le sujet de l'article. Il pose un fait, un chiffre, une situation ou un constat spécifique. Il ne récapitule pas ce que l'article va dire. Il ne pose pas une question sans réponse. Il ne commence pas par une généralité valable pour n'importe quel blog.

**Comment vérifier**
Prompt IA : "Lis le premier paragraphe de cet article. Réponds uniquement PASS ou FAIL. PASS si le premier paragraphe pose un fait, un chiffre, un récit ou un constat spécifique directement lié au sujet de l'article. FAIL si le premier paragraphe est une généralité d'introduction, reformule le titre, annonce le plan de l'article, pose une question rhétorique ouverte, ou commence par 'Dans cet article', 'Vous vous demandez', 'Avez-vous déjà', ou toute formulation équivalente."

**Exemple PASS**
> "Un appartement acheté 85 000 € à Roubaix en mars 2024. Chantier fermé fin juillet. Revendu 138 000 € en octobre. Voilà ce que ressemble une opération de marchand de biens dans la métropole lilloise quand les chiffres sont bons."

**Exemple FAIL**
> "Vous vous demandez peut-être ce que fait exactement un marchand de biens. Dans cet article, nous allons vous expliquer comment fonctionne ce métier et pourquoi Versi Immobilier pourrait être le bon interlocuteur pour votre projet."

---

### GE-2 — Brand voice Versi : confiant, direct, zéro posture commerciale

**Classe : BLOQUANT**

**Critère PASS/FAIL**
L'article parle via des faits et des chiffres. Les adjectifs auto-décernés sont absents ou remplacés par leur preuve concrète. La voix est celle d'un opérateur qui explique son métier — pas d'un commercial qui cherche à convaincre. Les patterns Versi (fait nu, concession directe, question rhétorique résolue immédiatement, ancrage géographique concret) sont présents ou au moins non contredits.

**Comment vérifier**
Prompt IA : "Analyse le ton de cet article. PASS si : (1) aucun adjectif auto-décerné n'apparaît sans preuve chiffrée dans la même phrase ou la phrase suivante, (2) aucune formulation ne cherche à convaincre plutôt qu'à informer, (3) la voix est celle d'un expert terrain qui rend compte plutôt que d'un commercial qui vend. FAIL si l'article contient des formulations du type 'notre équipe vous accompagne', 'nous sommes à votre disposition', 'notre savoir-faire reconnu', ou toute construction qui met en avant Versi sans preuve concrète."

**Exemple PASS**
> "Versi a acheté cet immeuble en décembre 2023. Le budget travaux initial était de 180 000 €. Il a été tenu à 187 000 €, dépassement de 3,9% dû à un problème de charpente non visible en visite. Le délai prévu était 6 mois. Il a été tenu."

**Exemple FAIL**
> "Grâce à notre expertise reconnue et à notre accompagnement sur mesure, nous avons su transformer cet immeuble en un bien de qualité qui répond aux attentes des acquéreurs les plus exigeants."

---

### GE-3 — Spécificité Versi : contenu non reproductible par un concurrent

**Classe : BLOQUANT**

**Critère PASS/FAIL**
L'article contient au moins une donnée, une adresse, un chiffre d'opération, un récit de chantier, un prix au m² localisé, ou une observation de marché tirée des opérations réelles Versi. Si le nom "Versi Immobilier" est remplacé par "un autre MDB lillois", au moins une phrase doit rendre l'article factuellement faux ou inapplicable.

**Comment vérifier**
Test d'inversion : remplacer mentalement "Versi" par "un concurrent". Si l'article reste valide à 100%, c'est un FAIL. En pratique, l'IA vérifie la présence d'au moins 1 des marqueurs suivants : adresse réelle d'opération Versi, chiffre d'achat/revente/budget travaux sourcé comme "données Versi", nom d'un fondateur associé à une décision terrain spécifique.

**Exemple PASS**
> "L'immeuble de la rue des Muguets, à Hellemmes, a été acheté 420 000 €. Budget travaux initial : 210 000 €. Surface totale : 6 lots de 35 à 68 m². Chantier confié à deux entreprises locales. Livraison prévue T2 2025."

**Exemple FAIL**
> "Dans la métropole lilloise, un marchand de biens achète des biens dégradés, les rénove et les revend ou les loue. Ce cycle d'achat-transformation-revente permet de créer de la valeur tout en répondant aux besoins en logement du territoire."

---

### GE-4 — Rythme : paragraphes courts, lecture fluide

**Classe : REQUIS**

**Critère PASS/FAIL**
Aucun paragraphe ne dépasse 5 lignes. La transition entre deux sections (H2) est logique — le lecteur comprend pourquoi on passe d'un sujet à l'autre. L'article n'a pas de "blocs denses" où plusieurs idées sont compressées sans respiration.

**Comment vérifier**
Complément de V14 (qui vérifie les 5 lignes par paragraphe). La gate GE-4 ajoute la vérification de la fluidité des transitions : prompt IA sur les 2-3 dernières phrases de chaque section pour vérifier qu'elles préparent logiquement la section suivante, et non qu'elles l'abandonnent brutalement.

**Exemple PASS**
> [Fin de section H2 "Ce que coûte vraiment une rénovation"] "Ces chiffres ne sont pas des moyennes. Ils viennent d'opérations réelles. Ce qui suit explique comment ils sont construits, poste par poste."
> [H2 suivant] "Budget travaux : les postes qui mangent la marge"

**Exemple FAIL**
> [Fin de section dense de 8 lignes compressées] "Bref, la rénovation est complexe et nécessite une bonne coordination entre tous les corps de métier pour respecter les délais et le budget tout en garantissant la qualité des finitions attendues par les acquéreurs du marché local."
> [H2 suivant] "Les garanties offertes à l'acheteur"

---

### GE-5 — Données sourcées : zéro chiffre en l'air

**Classe : BLOQUANT**

**Critère PASS/FAIL**
Tout prix, délai, statistique, ratio ou pourcentage est suivi, dans la même phrase ou la phrase immédiatement suivante, d'une source explicite entre parenthèses. Les sources acceptables : (DVF, date), (Notaires du Nord, trimestre + année), (données Versi, opération + lieu), (INSEE, date), (GSC, date). Une source vague ("selon les experts", "d'après une étude") est considérée comme absente.

**Comment vérifier**
Complément de V16 (regex automatique). GE-5 ajoute la vérification de la qualité de la source : prompt IA sur chaque occurrence de chiffre pour vérifier que la source est identifiable, datée et crédible. Ce check est semi-automatique — l'IA peut produire des faux positifs sur les nombres qui ne sont pas des statistiques (numéros d'adresse, numéros de lot).

**Exemple PASS**
> "Le prix médian au m² dans le secteur Fives-Hellemmes s'établissait à 1 850 €/m² au T4 2024 (source : DVF, transactions T4 2024, périmètre code postal 59000-59260)."

**Exemple FAIL**
> "Le marché lillois a progressé de 8% en deux ans, ce qui place Lille parmi les marchés les plus dynamiques du nord de la France."

---

### GE-6 — CTA naturel : intégration dans le flow, zéro plaquage commercial

**Classe : REQUIS**

**Critère PASS/FAIL**
Le CTA (appel à l'action vers `/vendre`, `/nos-biens` ou le formulaire de contact) découle logiquement du contenu qui précède. Sa formulation ne répète pas un mot de la liste interdite. Il n'est pas formulé comme un encart publicitaire — il ressemble à une conclusion naturelle de l'article, ou à une invitation concrète fondée sur le contenu lu.

**Comment vérifier**
Prompt IA : "Lis le CTA de cet article en contexte. PASS si le CTA s'intègre naturellement comme suite logique du contenu (ex : après un article sur la vente à un MDB, le CTA propose de demander une estimation sans pression), n'utilise aucun des mots interdits, et ressemble à une invitation factuelle plutôt qu'à un appel commercial. FAIL si le CTA est générique, plaqué, utilise un mot interdit, ou rompt le ton du reste de l'article."

**Exemple PASS** (fin d'article sur le processus de vente à un MDB)
> "Si vous avez un bien à vendre dans la métropole lilloise, voici comment se passe une première prise de contact chez Versi : [lien /vendre]."

**Exemple FAIL**
> "N'hésitez pas à nous contacter pour bénéficier de notre expertise et de notre accompagnement sur mesure dans votre projet immobilier. Notre équipe est à votre écoute !"

---

### GE-7 — Registre persona : ton calibré au destinataire déclaré

**Classe : REQUIS**

**Critère PASS/FAIL**
Le niveau de technicité, le vocabulaire et les exemples correspondent au persona déclaré dans le frontmatter YAML. Kévin (P3) : termes métier définis à la première occurrence, exemples ancrés dans son budget et sa situation. Sophie (P1) : focus sur le process, les délais, la simplicité — pas de théorie. Pierre (prescripteur) : dense, d'égal à égal, sans définitions condescendantes.

**Comment vérifier**
Prompt IA : "Le persona déclaré est {{PERSONA}}. Analyse le registre de l'article. PASS si le niveau de technicité et les exemples correspondent à ce persona (Kévin = accessible et rassurant, Sophie = process et délais, Pierre = dense et professionnel). FAIL si l'article explique à un notaire ce qu'est un marchand de biens, ou si l'article utilise des acronymes non définis pour un primo-accédant."

**Exemple PASS** (Kévin, article P3 sur le PTZ)
> "Le PTZ (Prêt à Taux Zéro) est une aide de l'État qui vous permet d'emprunter une partie du prix de votre logement sans payer d'intérêts dessus. Pour un appartement à 160 000 € à Roubaix, le PTZ peut couvrir jusqu'à 40 000 € selon votre revenu fiscal."

**Exemple FAIL** (Kévin, même article)
> "L'éligibilité PTZ dépend de la zone géographique (A/Abis/B1/B2/C), du RNFR du foyer fiscal et du caractère HPE ou BBC-rénovation du logement visé. La quotité applicable est de 40% en zone B1 pour les primo-accédants en dessous du plafond."

---

### GE-8 — Anti-filler : zéro phrase sans valeur informative

**Classe : REQUIS**

**Critère PASS/FAIL**
Chaque phrase de l'article apporte une information, un fait, un exemple ou une nuance. Aucune phrase n'est là pour "remplir", pour faire la transition, ou pour reformuler ce qui vient d'être dit. La suppression de la phrase changerait le sens ou l'information disponible pour le lecteur.

**Comment vérifier**
Prompt IA : "Parcours cet article phrase par phrase. Identifie toute phrase dont la suppression ne change ni l'information disponible ni la logique de l'article. Liste les phrases candidates au filler. Si au moins 3 phrases sont du filler, réponse FAIL. Si moins de 3, PASS (tolérance pour les transitions nécessaires à la fluidité)."

**Exemple PASS**
> "Acheter un immeuble de rapport à Tourcoing coûte entre 600 et 1 100 €/m² selon l'état, l'emplacement et la situation locative. En dessous de 700 €, il y a presque toujours un problème de charpente ou de toiture — c'est systématique dans les années 1920-1950."

**Exemple FAIL (phrases filler en gras)**
> "**Comme vous pouvez le constater,** la rénovation immobilière est un processus complexe. **Il est donc important de bien s'entourer.** **C'est dans ce contexte que** Versi Immobilier intervient. Acheter un immeuble de rapport à Tourcoing coûte entre 600 et 1 100 €/m²."

---

### GE-9 — Ancrage géographique Hauts-de-France

**Classe : REQUIS**

**Critère PASS/FAIL**
L'article mentionne au moins 1 commune, quartier ou prix au m² localisé dans les Hauts-de-France. Les données génériques nationales sont autorisées si elles sont contextualisées localement (ex : "la moyenne nationale est X, à Lille le marché se situe à Y"). Un article sans ancrage HdF est un article générique — il rate l'objectif éditorial principal de Versi Immobilier.

**Comment vérifier**
Grep sur les noms de communes clés : Lille, Roubaix, Tourcoing, Valenciennes, Lens, Arras, Fives, Wazemmes, Hellemmes, Faches-Thumesnil, Mouvaux, Wasquehal, métropole lilloise, MEL, Hauts-de-France, Nord (59). PASS si au moins 1 occurrence est présente dans un contexte factuel (pas juste "nous opérons dans les Hauts-de-France").

**Exemple PASS**
> "À Fives, les prix d'achat dans l'ancien se situaient entre 1 400 et 1 800 €/m² au premier semestre 2025 (DVF, S1 2025). C'est l'un des marchés les plus actifs de la métropole pour les opérations de transformation."

**Exemple FAIL**
> "Le marché immobilier français offre de nombreuses opportunités pour les acheteurs qui savent où chercher. Dans notre zone d'activité, les prix varient en fonction de nombreux paramètres qu'il convient d'analyser."

---

### GE-10 — Voix active dominante

**Classe : REQUIS**

**Critère PASS/FAIL**
Plus de 90% des constructions verbales de l'article sont à la voix active. Le passif est toléré uniquement quand il est justifié (focus sur le receveur de l'action, ou quand l'auteur de l'action est inconnu). Les constructions passives évitables — "a été rénové" là où "Versi a rénové" est possible — sont un FAIL.

**Comment vérifier**
Prompt IA : "Identifie toutes les constructions passives de cet article. Pour chacune, indique si elle est justifiée (auteur inconnu, focus sur le receveur) ou évitable (l'auteur est connu et la voix active est possible). Si plus de 10% des constructions verbales sont des passifs évitables, FAIL."

**Exemple PASS**
> "Versi a ouvert le chantier en mars. L'architecte a livré les plans en deux semaines. Les artisans ont démarré les travaux de démolition dès la semaine suivante."

**Exemple FAIL**
> "Le chantier a été ouvert en mars. Les plans ont été livrés par l'architecte en deux semaines. Les travaux de démolition ont été démarrés dès la semaine suivante."

## 3. Processus de review

### 3.1 Qui évalue, quand, comment

Les gates GE s'exécutent APRÈS les checks V1-V22 (techniques), uniquement si V1-V22 = 22/22.

**Évaluation IA automatique (GE-1 à GE-10)**

Un prompt de review est appelé sur l'article complet. Ce prompt évalue chaque gate indépendamment et retourne un objet JSON :

```json
{
  "GE-1": { "verdict": "PASS" | "FAIL", "justification": "..." },
  "GE-2": { "verdict": "PASS" | "FAIL", "justification": "..." },
  ...
  "GE-10": { "verdict": "PASS" | "FAIL", "justification": "..." }
}
```

Ce JSON est enregistré dans le champ `editorial_review_report` de la table `articles` (voir `docs/strategy/vi-blog-autonomous-pipeline.md` section 6.1).

**Escalade humaine obligatoire**

Indépendamment du résultat des gates GE, une validation humaine (fondateur) est requise dans les cas suivants (conformément à la section 5.2 du pipeline) :
- Article P2 (réalisation terrain) : les données propriétaires doivent être vérifiées par Thomas, Maxime ou Carl
- FAIL sur GE-3 (spécificité Versi) après correction automatique : le problème vient du brief, pas de l'article

### 3.2 Seuils et boucle de correction

- **PASS éditorial** : 3/3 gates BLOQUANT PASS + 7/7 gates REQUIS PASS → article passe en statut `editorial_pass`
- **FAIL BLOQUANT** : au moins 1 gate BLOQUANT FAIL → lancer une passe de correction ciblée. Si FAIL après 2 passes → statut `pending_approval`, email fondateur avec les gates en échec
- **FAIL REQUIS** : au moins 1 gate REQUIS FAIL → correction ciblée. Si FAIL après 2 passes → statut `pending_approval` (même traitement)

### 3.3 Prompt de review éditorial

Ce prompt est injecté sur l'article complet. Il reçoit en contexte les règles éditoriales du framework (`vi-blog-editorial-framework.md` section 1.3 et section 3 du prompt système).

```
Tu es un relecteur éditorial pour le blog versi-immobilier.fr. Tu évalues la qualité éditoriale d'un article selon 10 gates binaires.

Pour chaque gate, réponds PASS ou FAIL avec une justification courte (max 2 phrases). Ne produis aucune autre sortie que le JSON demandé.

CONTEXTE VERSI :
- Persona de l'article : {{PERSONA}}
- Pilier éditorial : {{PILIER}}
- Voix de marque : confiant, direct, terrain, zéro posture commerciale
- Mots interdits (présence = FAIL automatique GE-2) : Expertise, Clé en main, Solutions, Découvrez, N'hésitez pas, Bienvenue, Professionnel qualifié, Accompagnement sur mesure, À votre écoute, De qualité, Passionné

GATES À ÉVALUER :
GE-1 : Le premier paragraphe entre-t-il directement dans le sujet sans introduction molle ?
GE-2 : Le ton est-il confiant et factuel — zéro adjectif auto-décerné sans preuve, zéro posture commerciale ?
GE-3 : L'article contient-il au moins 1 donnée ou récit propre aux opérations Versi, non reproductible par un concurrent ?
GE-4 : Les transitions entre sections sont-elles logiques et fluides ?
GE-5 : Toutes les données chiffrées ont-elles une source explicite et identifiable ?
GE-6 : Le CTA s'intègre-t-il naturellement dans le flow sans mots interdits ni ton commercial ?
GE-7 : Le registre de l'article correspond-il au persona déclaré (niveau de technicité, vocabulaire, exemples) ?
GE-8 : L'article est-il exempt de phrases filler dont la suppression ne changerait rien au sens ?
GE-9 : L'article ancre-t-il les données dans une commune ou un quartier des Hauts-de-France ?
GE-10 : La voix active est-elle dominante (> 90% des constructions verbales) ?

ARTICLE À ÉVALUER :
{{ARTICLE_MARKDOWN}}

RETOURNE UNIQUEMENT CE JSON :
{
  "GE-1": { "verdict": "PASS" | "FAIL", "justification": "..." },
  "GE-2": { "verdict": "PASS" | "FAIL", "justification": "..." },
  "GE-3": { "verdict": "PASS" | "FAIL", "justification": "..." },
  "GE-4": { "verdict": "PASS" | "FAIL", "justification": "..." },
  "GE-5": { "verdict": "PASS" | "FAIL", "justification": "..." },
  "GE-6": { "verdict": "PASS" | "FAIL", "justification": "..." },
  "GE-7": { "verdict": "PASS" | "FAIL", "justification": "..." },
  "GE-8": { "verdict": "PASS" | "FAIL", "justification": "..." },
  "GE-9": { "verdict": "PASS" | "FAIL", "justification": "..." },
  "GE-10": { "verdict": "PASS" | "FAIL", "justification": "..." }
}
```

## 4. Intégration avec le système V1-V22

### 4.1 Position dans la chaîne de validation

```
ARTICLE GÉNÉRÉ
      │
      ▼
[V1-V22] — Checks techniques (regex, comptage, parse YAML)
      │
      ├── < 22/22 → passe de correction → [V1-V22 bis] → < 22/22 → pending_approval
      │
      └── 22/22 ✓
            │
            ▼
      [GE-1 à GE-10] — Review éditoriale IA
            │
            ├── FAIL BLOQUANT (GE-1, GE-2, GE-3, GE-5) → correction ciblée → [GE bis]
            │       └── FAIL après 2 passes → pending_approval fondateur
            │
            ├── FAIL REQUIS (GE-4, GE-6, GE-7, GE-8, GE-9, GE-10) → correction ciblée → [GE bis]
            │       └── FAIL après 2 passes → pending_approval fondateur
            │
            └── 10/10 PASS ✓
                  │
                  ▼
            Article → statut scheduled → publication
```

### 4.2 Champs base de données à ajouter

En complément des champs listés dans `vi-blog-autonomous-pipeline.md` section 6.1, ajouter :

```sql
ALTER TABLE articles
  ADD COLUMN editorial_review_score INTEGER,      -- score GE-1 à GE-10 (0-10)
  ADD COLUMN editorial_review_report JSONB,       -- détail gate par gate
  ADD COLUMN editorial_review_passes INTEGER DEFAULT 0;
```

Mise à jour de la contrainte statut pour inclure les états éditoriaux :

```sql
-- Ajouter 'editorial_pass' et 'editorial_fail' à l'enum status existant
ALTER TABLE articles
  DROP CONSTRAINT articles_status_check;

ALTER TABLE articles
  ADD CONSTRAINT articles_status_check CHECK (
    status IN ('draft','briefed','generating','validation_pass',
               'validation_fail','correcting','editorial_pass',
               'editorial_fail','pending_approval',
               'scheduled','published','blocked')
  );
```

### 4.3 Matrice de complémentarité V vs GE

| Domaine | Check technique V | Gate éditoriale GE | Couverture |
|---|---|---|---|
| Premier paragraphe | V15 (regex formules interdites) | GE-1 (qualité éditoriale de l'accroche) | V15 bloque les formules connues. GE-1 bloque les accroches molles qui contournent V15 |
| Paragraphes courts | V14 (≤ 5 lignes) | GE-4 (fluidité des transitions) | V14 compte les lignes. GE-4 évalue la cohérence logique entre sections |
| Mots interdits | V1 (regex blacklist) | GE-2 (posture commerciale) | V1 bloque les mots listés. GE-2 bloque le ton commercial qui contourne la liste |
| Données chiffrées | V16 (regex chiffre sans parenthèse) | GE-5 (qualité de la source) | V16 détecte l'absence de source. GE-5 vérifie la crédibilité de la source |
| CTA | V9 (URL correcte) | GE-6 (ton et intégration) | V9 vérifie la mécanique. GE-6 vérifie la qualité éditoriale |
| Vouvoiement | V3 (regex tu/ton/ta) | GE-7 (calibration persona) | V3 vérifie la règle. GE-7 vérifie l'adaptation globale au persona |

---

**Handoff → @qa**

Fichiers produits :
- `/home/user/Versi/docs/qa/blog-gates-editorial.md`

Décisions prises :
- 3 gates BLOQUANT (GE-1, GE-2, GE-3, GE-5) — les 4 critères qui, si ratés, rendent l'article indigne de publication quelle que soit la qualité technique. GE-5 reclassée BLOQUANT (pas REQUIS) car un article avec des chiffres sans source contredit le pilier #1 de la crédibilité Versi
- 7 gates REQUIS (GE-4, GE-6, GE-7, GE-8, GE-9, GE-10)
- Toutes les gates sont évaluables par IA via un seul prompt de review (prompt fourni en section 3.3) — aucune ne nécessite une intervention humaine systématique, sauf escalade GE-3 après 2 passes
- Les gates GE sont conçues pour compléter V1-V22 sans les dupliquer — la matrice de complémentarité (section 4.3) documente les zones de couverture distinctes

Points d'attention pour @qa :
- Ajouter le prompt de review éditorial (section 3.3) comme nouvelle étape dans le pipeline après V22
- Ajouter les champs `editorial_review_score`, `editorial_review_report`, `editorial_review_passes` à la table `articles` (SQL en section 4.2)
- Ajouter les statuts `editorial_pass` et `editorial_fail` à l'enum status
- L'escalade humaine des articles P2 reste inchangée (définie dans `vi-blog-autonomous-pipeline.md` section 5.2) — les gates GE ne la remplacent pas, elles s'y ajoutent
- GE-3 (spécificité Versi) est la gate la plus subjective — surveiller les faux positifs IA lors des premières publications et affiner le prompt si nécessaire
