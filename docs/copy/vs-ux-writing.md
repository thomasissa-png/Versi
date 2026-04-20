# UX Writing — Versi Studio

> Usage interne — Guide de référence pour tout texte d'interface Versi Studio.
> Produit par @copywriter | Date : 2026-04-15
> À lire par : @fullstack (intégration), @ux (wireframes), @design (composants)
> Source : `docs/strategy/vs-brand-platform.md` §6, §7, §8 + `docs/copy/brand-voice.md`

---

## 1. Principes UX writing

Quatre règles non négociables. Chaque texte d'interface Versi Studio les respecte toutes.

**1 — Terrain avant technique**
Le marchand de biens travaille avec des plans, des lots, des pièces, des dossiers. Il ne "génère" rien, il ne "soumet" rien, il ne "traite" aucun "fichier". Il dépose un plan. Il découpe ses lots. Il crée un visuel. L'interface parle comme lui, pas comme le développeur qui l'a codée.

**2 — Une phrase, une action**
Chaque écran a un seul objectif. Chaque texte dit une seule chose. Pas de paragraphes d'explication. Si Thomas a besoin de lire deux fois, le texte est raté.

**3 — Zéro jargon tech dans l'interface visible**
Les mots "IA", "algorithme", "machine learning", "génération" n'apparaissent jamais à l'écran. L'outil fait le travail — il n'a pas besoin d'expliquer comment. "L'analyse est en cours" est préférable à "Notre IA traite votre image". "Créer le visuel" est préférable à "Générer le rendu".

**4 — Vouvoiement systématique, sans exception**
"Vous", "votre", "vos" — jamais "tu", "ton", "tes". Même dans les messages informels. Même dans l'agent architecte. La voix Versi ne connaît pas le "tu".

## 2. Labels de navigation

### Header

| Élément | Texte |
|---|---|
| Logo | VERSI STUDIO |
| Nom du projet en cours | [Nom de l'opération — ex : "Immeuble Rue Faidherbe, Lille"] |
| Lien retour liste | ← Mes opérations |
| Bouton compte | [Initiales ou email] |

### Stepper — Labels des 4 étapes

| # | Label affiché | Sous-label (optionnel, si espace) |
|---|---|---|
| 1 | Plans | Déposez vos plans |
| 2 | Lots | Découpez vos lots |
| 3 | Pièces | Identifiez les pièces |
| 4 | Visuels | Créez vos visuels |

Le stepper est visible à chaque étape. L'étape active est mise en valeur. Les étapes complètes sont cochées. Les étapes à venir sont grisées mais visibles.

### Navigation secondaire — Liste des opérations

| Élément | Texte |
|---|---|
| Titre de page | Mes opérations |
| Bouton création | Nouvelle opération |
| État vide | Aucune opération. Créez-en une pour commencer. |
| Colonne état | En cours / Dossier prêt |

## 3. Étape 1 — Dépôt des plans

**Titre de page**
> Déposez vos plans

**Instruction principale** (sous le titre)
> Un plan par lot, ou un plan d'ensemble — les deux formats fonctionnent. PDF ou image, résolution minimum 150 dpi.

**Zone de dépôt — état vide**
> Déposez vos plans ici
> PDF, JPG, PNG — jusqu'à 50 Mo par fichier

**Zone de dépôt — survol actif**
> Relâchez pour déposer

**Labels des champs du formulaire**

| Champ | Label | Placeholder |
|---|---|---|
| Nom de l'opération | Nom de l'opération | Ex : Immeuble Rue Faidherbe, Lille |
| Adresse | Adresse du bien | Ex : 12 rue Faidherbe, 59000 Lille |
| Type de bien | Type de bien | — (liste déroulante) |
| Surface totale | Surface totale (m²) | Ex : 450 |

**Options liste déroulante — Type de bien**
Immeuble de rapport / Maison divisée en lots / Local commercial à transformer / Autre

**CTA principal**
> Analyser les plans

**États et messages — Étape 1**

| État | Texte |
|---|---|
| Analyse en cours (< 30s) | Analyse du plan en cours… Quelques secondes. |
| Dépôt réussi (avant analyse) | Plan déposé. Lancer l'analyse quand vous êtes prêt. |
| Analyse réussie | Plan analysé. Passez à la découpe des lots. |
| Bouton passage étape suivante | Découper les lots → |

**Messages d'erreur**

| Erreur | Message affiché |
|---|---|
| Format non supporté | Ce format n'est pas pris en charge. Déposez un PDF, JPG ou PNG. |
| Fichier trop lourd | Ce fichier dépasse 50 Mo. Compressez-le et réessayez. |
| Résolution insuffisante | Ce plan est trop basse résolution. Utilisez la version PDF originale ou exportez à 300 dpi minimum. |
| Extraction impossible | L'analyse n'a pas pu lire ce plan. Vérifiez que le fichier n'est pas protégé par un mot de passe. Si le problème persiste, contactez le support avec ce plan. |
| Champ obligatoire vide | Ce champ est requis pour continuer. |

## 4. Étape 2 — Découpe des lots

**Titre de page**
> Découpez vos lots

**Instruction principale**
> Les délimitations proposées sont un point de départ. Ajustez les contours directement sur le plan. Renommez chaque lot selon votre nomenclature.

**Panel latéral — Labels**

| Élément | Texte |
|---|---|
| Titre panel | Lots de l'opération |
| Compteur | [N] lots identifiés |
| Bouton ajouter | + Ajouter un lot |
| Label nom lot | Nom du lot |
| Label surface | Surface (m²) |
| Label étage | Étage |
| Bouton supprimer lot | Supprimer ce lot |

**Tooltips sur le plan (interactions)**

| Action | Tooltip |
|---|---|
| Survol d'un contour proposé | Cliquez pour sélectionner ce lot |
| Poignée de redimensionnement | Glissez pour ajuster le contour |
| Clic sur zone non délimitée | Tracez un nouveau lot |
| Double-clic sur un lot | Renommer ce lot |

**Messages pendant l'analyse**

| État | Texte |
|---|---|
| Analyse en cours | Découpe en cours… L'outil lit le plan et propose les délimitations. |
| Résultat — succès | [N] lots identifiés sur ce plan. Vérifiez et ajustez avant de continuer. |
| Résultat — aucun lot détecté | Aucun lot détecté automatiquement sur ce plan. Tracez vos lots manuellement. |
| Lot renommé | Nom enregistré. |
| Lot supprimé | Lot supprimé. |

**CTA principal**
> Valider les lots → (N lots)

**Message de validation**
> Vous avez validé [N] lots. Passez à l'identification des pièces.

## 5. Étape 3 — Identification des pièces

**Titre de page**
> Identifiez les pièces

**Instruction principale**
> Pour chaque lot, vérifiez les pièces proposées. Repositionnez les étiquettes si elles sont mal placées. Corrigez le type de pièce si nécessaire.

**Labels des types de pièces (français courant — aucun terme technique)**

| Type affiché | Notes |
|---|---|
| Salon | — |
| Séjour | — |
| Salon-séjour | Pièce de vie combinée |
| Cuisine | — |
| Cuisine ouverte | Cuisine ouverte sur le séjour |
| Chambre | — |
| Chambre principale | — |
| Salle de bain | — |
| Salle d'eau | Douche sans baignoire |
| WC | — |
| Couloir | — |
| Entrée | — |
| Dressing | — |
| Buanderie | — |
| Cellier | — |
| Terrasse | — |
| Balcon | — |
| Cave | — |
| Autre | Pièce non listée |

**Tooltips sur le plan**

| Action | Tooltip |
|---|---|
| Survol d'une étiquette proposée | Cliquez pour modifier ce type de pièce |
| Glisser une étiquette | Repositionnez l'étiquette sur cette pièce |
| Clic sur zone sans étiquette | Ajouter une pièce ici |

**Messages**

| État | Texte |
|---|---|
| Analyse en cours | Identification des pièces en cours… |
| Résultat — succès | [N] pièces identifiées dans ce lot. Vérifiez et corrigez si nécessaire. |
| Résultat — aucune pièce | Aucune pièce détectée dans ce lot. Ajoutez-les manuellement. |
| Type modifié | Type de pièce mis à jour. |
| Pièce supprimée | Pièce supprimée de ce lot. |

**Panel lot — Navigation inter-lots**

| Élément | Texte |
|---|---|
| Titre | Lot [N] — [Nom du lot] |
| Compteur pièces | [N] pièces |
| Navigation | ← Lot précédent / Lot suivant → |

**CTA principal**
> Valider les pièces → ([N] lots · [N] pièces)

**Message de validation**
> [N] pièces validées sur [N] lots. Passez à la création des visuels.

## 6. Étape 4 — Visuels post-travaux

**Titre de page**
> Créez vos visuels post-travaux

**Instruction principale**
> Pour chaque pièce, déposez une photo du chantier. Choisissez un style de finition. Le visuel est prêt en moins de 90 secondes.

**Navigation inter-pièces**

| Élément | Texte |
|---|---|
| Sélecteur | Lot [N] — [Nom du lot] / Pièce : [Nom de la pièce] |
| Navigation | ← Pièce précédente / Pièce suivante → |
| Compteur avancement | [N] visuels créés sur [N] pièces |

**Dépôt de la photo chantier**

| Élément | Texte |
|---|---|
| Label | Photo du chantier — état actuel |
| Instruction | Prenez la photo depuis un angle droit, en paysage. La qualité du visuel dépend de la qualité de la photo. |
| Zone dépôt | Déposez la photo ici ou cliquez pour choisir un fichier |
| Format accepté | JPG, PNG — jusqu'à 20 Mo |

**Labels — Angle de prise de vue**

| Option | Texte |
|---|---|
| Face à la fenêtre | Face fenêtre |
| De dos à la fenêtre | Dos fenêtre |
| Angle gauche | Angle gauche |
| Angle droit | Angle droit |

**Labels — Style de finition**

| Option | Texte affiché |
|---|---|
| Contemporain clair | Contemporain — clair |
| Contemporain sombre | Contemporain — sombre |
| Scandinave | Scandinave |
| Industriel | Industriel |
| Classique | Classique |
| Haussmannien | Haussmannien |

**CTA principal**
> Créer le visuel

**Message "en cours" (~90 secondes)**
> Création du visuel en cours…
> Environ 60 secondes.

(Barre de progression visible. Pas de spinner générique. Le temps restant s'affiche et décroît.)

**Message résultat — succès**
> Visuel créé. Itérez avec l'agent architecte ou passez à la pièce suivante.

**Labels du chat agent architecte**

| Élément | Texte |
|---|---|
| Titre du panneau | Agent architecte |
| Placeholder saisie | Décrivez votre ajustement… |
| Bouton envoi | Envoyer |
| Bouton réinitialiser | Repartir de zéro |

**CTA itération**
> Appliquer les modifications (le visuel est recréé — environ 60 secondes)

**CTA validation pièce**
> Valider ce visuel → Pièce suivante

**CTA validation dossier complet**
> Dossier complet. Télécharger.

**Messages d'erreur — Étape 4**

| Erreur | Message affiché |
|---|---|
| Photo trop sombre | Cette photo est trop sombre pour produire un visuel de qualité. Reprenez la photo avec plus de lumière naturelle ou artificielle. |
| Photo floue | Cette photo est floue. Le visuel sera de faible qualité. Nous vous recommandons de reprendre la photo. Vous pouvez néanmoins continuer. |
| Création échouée | La création du visuel a échoué. Vérifiez votre connexion et réessayez. Si le problème persiste, contactez le support. |
| Délai dépassé | La création prend plus de temps que prévu. Restez sur la page — le visuel arrive. |

## 7. Messages d'état globaux

| État | Texte affiché | Position |
|---|---|---|
| Analyse en cours (générique) | Analyse en cours… | Centre de l'écran actif, avec indicateur de progression |
| Sauvegarde automatique | Modifications enregistrées. | Coin supérieur droit, discret, 3 secondes |
| Sauvegarde manuelle réussie | Opération sauvegardée. | Notification toast, 3 secondes |
| Erreur réseau | Connexion perdue. Vos modifications sont sauvegardées localement — elles seront synchronisées dès la reconnexion. | Bannière en haut de page, persistante |
| Reconnexion | Connexion rétablie. Synchronisation en cours… | Bannière en haut de page, remplace l'erreur réseau |
| Erreur générique (non identifiée) | Une erreur est survenue. Actualisez la page. Si le problème persiste, contactez le support en précisant l'étape où vous étiez. | Modale centrée |
| Session expirée | Votre session a expiré. Reconnectez-vous — votre travail est sauvegardé. | Modale centrée, bouton "Se reconnecter" |
| Chargement initial | Chargement de l'opération… | Spinner centré, fond neutre |

## 8. Microcopies modales

### Confirmation — Suppression d'un lot

> **Supprimer ce lot ?**
> Le lot "[Nom du lot]" et toutes ses pièces seront supprimés. Cette action est irréversible.
>
> [Annuler] [Supprimer le lot]

Note : le bouton de suppression est en rouge. Le bouton d'annulation est prioritaire visuellement (à gauche, style secondaire).

### Confirmation — Suppression d'une pièce

> **Supprimer cette pièce ?**
> La pièce "[Nom de la pièce]" et son visuel associé seront supprimés.
>
> [Annuler] [Supprimer la pièce]

### Confirmation — Réinitialisation d'une étape

> **Recommencer cette étape ?**
> Les modifications de l'étape "[Nom de l'étape]" seront perdues. Les étapes suivantes ne seront pas affectées.
>
> [Annuler] [Recommencer]

### Confirmation — Suppression d'un visuel

> **Supprimer ce visuel ?**
> Vous devrez recréer un visuel pour cette pièce.
>
> [Annuler] [Supprimer]

### Info-bulles d'aide (tooltips statiques)

| Élément | Info-bulle |
|---|---|
| Icône aide — résolution plan | Un plan exporté depuis un logiciel d'architecte (PDF natif) donne les meilleurs résultats. Les scans papier fonctionnent à partir de 300 dpi. |
| Icône aide — surface Carrez | La surface affichée est calculée automatiquement à partir du contour tracé. Vérifiez-la par rapport à votre mesurage Carrez officiel avant de l'inclure dans le dossier. |
| Icône aide — style de finition | Le style détermine les matériaux, les couleurs et le mobilier utilisés dans le visuel. Vous pouvez en demander plusieurs et choisir le meilleur. |
| Icône aide — angle de prise de vue | L'angle que vous sélectionnez indique d'où la photo a été prise. Il permet à l'outil d'aligner les perspectives du visuel avec celles de la photo. |

## 9. Messages vides (empty states)

Chaque empty state a trois éléments : une phrase d'état, une instruction, un bouton d'action. Pas d'illustration obligatoire — si illustration, sobre et fonctionnelle.

### Aucune opération (liste des opérations)

> Aucune opération en cours.
> Créez votre première opération pour commencer.
>
> [Nouvelle opération]

### Aucun plan déposé (Étape 1)

> Aucun plan déposé.
> Déposez vos plans PDF ou images pour commencer l'analyse.
>
> [Déposer un plan]

### Aucun lot créé (Étape 2 — après analyse sans résultat)

> Aucun lot détecté sur ce plan.
> Tracez vos lots directement sur le plan pour continuer.
>
> [Tracer un lot manuellement]

### Aucune pièce identifiée dans un lot (Étape 3)

> Aucune pièce identifiée dans ce lot.
> Ajoutez les pièces manuellement pour pouvoir créer les visuels.
>
> [Ajouter une pièce]

### Aucune photo déposée pour une pièce (Étape 4)

> Aucune photo pour cette pièce.
> Déposez une photo du chantier pour créer le visuel post-travaux.
>
> [Déposer une photo]

### Aucun visuel créé pour une pièce (Étape 4 — après dépôt photo, avant création)

> Photo déposée. Choisissez un style et lancez la création.
>
> [Créer le visuel]

### Dossier incomplet (vue récapitulative)

> [N] pièces n'ont pas encore de visuel.
> Complétez les pièces manquantes pour finaliser le dossier.
>
> [Voir les pièces incomplètes]

## 10. Agent architecte — Ton du chat

L'agent architecte n'est pas un chatbot de support. C'est un architecte d'intérieur professionnel qui connaît le métier des marchands de biens. Il parle avec précision, sans condescendance, et sans sur-explication. Il ne se présente pas comme une IA. Il ne dit jamais "Bien sûr !" ni "Avec plaisir !". Il répond à ce qu'on lui demande et propose une option quand c'est utile.

### Règles de ton — Agent architecte

- Vouvoiement strict. Sans exception.
- Pas de formule de politesse d'ouverture ("Bonjour", "Bien sûr", "Avec plaisir"). La réponse commence par la substance.
- Pas d'excuse ("Je suis désolé"). Si quelque chose ne fonctionne pas, l'agent dit ce qu'il peut faire.
- Maximum 3 phrases par réponse. L'agent est concis, pas expansif.
- L'agent reformule la demande uniquement si elle est ambiguë. Si la demande est claire, il applique directement.
- Le mot "IA" n'apparaît jamais dans les réponses de l'agent.

### Exemples de messages de l'agent architecte

**Message d'ouverture (quand le visuel est affiché pour la première fois)**
> Visuel prêt. Décrivez ce que vous souhaitez ajuster — style, mobilier, luminosité ou disposition — et j'applique les modifications.

**Réponse à "Je veux plus de lumière"**
> Je vais éclaircir l'ensemble — fenêtres agrandies visuellement, teintes plus claires sur les murs. Un style en particulier à conserver, ou vous me laissez la main ?

**Réponse à "Je veux un autre style de canapé"**
> Style de canapé modifié. Si vous avez une référence — cuir, tissu, couleur — précisez-la pour un résultat plus proche de ce que vous avez en tête.

**Réponse à "Ce n'est pas ce que je voulais"**
> Compris. Décrivez ce que vous souhaitez différemment — je recrée le visuel à partir de là.

**Réponse à une demande ambiguë ("Améliorez le visuel")**
> Quelle partie du visuel souhaitez-vous modifier en priorité — les couleurs, le mobilier, la luminosité ou autre chose ?

**Réponse à une demande hors champ (ex : "Ajoutez une fenêtre là où il n'y en a pas")**
> Je peux améliorer l'impression de luminosité sans modifier la structure du bien. Ajouter une vraie fenêtre modifierait le plan — ce n'est pas dans mes possibilités ici.

**Confirmation avant nouvelle création**
> Je vais recréer le visuel avec ces modifications. Environ 60 secondes.

**Réponse après plusieurs itérations sans satisfaction**
> Si le résultat ne convient pas après plusieurs essais, essayez avec une photo différente — un angle plus dégagé améliore souvent le rendu.

### Ce que l'agent ne dit jamais

| INTERDIT | Raison |
|---|---|
| "Bien sûr !" / "Avec plaisir !" | Registre SAV, pas architecte |
| "Je suis une IA" / "En tant qu'IA…" | Le mot IA est proscrit de l'interface |
| "Je vais faire de mon mieux" | Sous-entend une possible insuffisance — éviter |
| "N'hésitez pas à me poser d'autres questions" | Registre support. L'agent répond, il n'invite pas |
| Réponses de plus de 4 phrases | Trop long. Couper. |

## 11. Calibration plan / Overlay m² (F05)

Feature livrée s19 : surface m² temps réel sur le plan après calibration manuelle (ou auto-calibration via POC OCR).

### Copy exacts

| Contexte UI | Copy |
|---|---|
| Titre modale calibration | `Calibrez ce plan pour afficher les surfaces m²` |
| Sous-titre modale | `Tracez une ligne de référence sur le plan, puis entrez sa longueur réelle.` |
| Label input longueur | `Cette ligne mesure X mètres` |
| Bouton valider calibration | `Valider la calibration` |
| Bouton annuler | `Annuler` |
| Overlay m² (plan calibré) | `X,X m²` (format 1 décimale, ex : `12,5 m²`) |
| Overlay m² (plan non calibré) | `— m²` (placeholder) |
| Bannière suggestion OCR (confidence ≥ 0.9) | `Une échelle a été détectée automatiquement : X mètres. Validez ou ajustez.` |
| Bannière fallback OCR (confidence < 0.9) | `Calibrez manuellement ce plan pour afficher les surfaces.` |
| Bannière loading OCR | `Détection de l'échelle en cours…` |
| Tooltip survol ligne calibration | `Ligne de référence : X mètres` |

### Règles

- **Unité** : toujours `m²` (pas `m2` ni `mètres carrés`)
- **Séparateur décimal** : virgule française (ex: `12,5` pas `12.5`)
- **Placeholder non calibré** : `— m²` (tiret cadratin `—` U+2014, pas `-`)
- **Arrondi** : 1 décimale max (ex: `12,5 m²` pas `12,55 m²`)
- **Registre** : vouvoiement systématique (`Calibrez`, `Validez`, pas `Calibre`)
- **Anglicismes interdits** (règle n°19 G33 BLOQUANT) : `upload`, `download`, `feedback`, `meeting`, `forwarder`

---

## Handoff

---
**Handoff → @fullstack**

Fichiers produits :
- `/home/user/Versi/docs/copy/vs-ux-writing.md`

Décisions prises :
- Vouvoiement systématique dans 100% des textes, y compris l'agent architecte
- Mot "IA" interdit dans toute l'interface visible — remplacé par des formulations actives ("L'analyse est en cours", "le visuel est créé")
- Mot "générer" remplacé par "créer" dans tous les CTA et messages
- Types de pièces nommés en français courant (Salon, Chambre, WC) — aucun terme architectural (séjour-dégagement, patio, loggia non listé sauf si usage courant confirmé)
- Empty states : toujours 3 éléments — état / instruction / bouton. Pas d'illustration imposée.
- Agent architecte : 3 phrases maximum par réponse, sans formule de politesse, sans mention IA, sans excuse
- Indicateurs de progression (étape 4) : durée explicite (~60 secondes) + barre de progression — pas de spinner générique seul
- Messages d'erreur : vocabulaire terrain (plan, lot, pièce, résolution, PDF), jamais jargon technique (timeout, HTTP error, exception)

Points d'attention pour l'intégration :
- Le compteur de l'étape 2 "[N] lots identifiés" et de l'étape 3 "[N] pièces sur [N] lots" doivent être dynamiques — interpolation de la valeur réelle
- L'info-bulle surface Carrez (§8) est importante juridiquement — ne pas supprimer lors de la simplification de l'UI
- L'agent architecte est un composant de chat distinct — ses règles de ton (§10) doivent être propagées dans le prompt système de l'agent, pas seulement dans l'UI
- Le message d'erreur "photo trop sombre" (§6) doit être déclenché par un seuil de luminosité automatique, pas affiché systématiquement

Mots-clés SEO : aucun keyword-map disponible au moment de la production — les sections H2 utilisent le vocabulaire terrain prescrit (lot, découpe, visuel post-travaux, plan, pièce, opération) qui correspond aux termes naturels du secteur. À intégrer dans le keyword-map @seo si ce fichier est produit.
---
