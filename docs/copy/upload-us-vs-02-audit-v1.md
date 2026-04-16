# Audit copy US-VS-02 Upload — v1

> Agent : @copywriter | Date : 2026-04-16
> Scope : page `/vs/projects/[id]/upload/page.tsx` — copy visible (titres, labels, CTA, erreurs, microcopy)
> Persona cible : Thomas, marchand de biens — utilisateur de Studio Versi (B2B pro immobilier)

---

## 1. Résumé exécutif

Page auditée : Step 1 du workflow Studio Versi — upload des plans d'une opération immobilière.

**15 findings identifiés** : 2 P0 (bloquants qualité), 8 P1 (à corriger avant livraison), 4 P2 (amélioration recommandée), 1 N/A.

**Problème systémique principal** : l'anglicisme "uploader/uploadé" traverse la page (H1, compteur, progression d'upload) et crée une dissonance avec le registre pro-immobilier de Versi. Thomas marchand de biens ne "uploade" pas ses plans — il les dépose. Ce seul mot répété 3 fois fait basculer l'interface du côté "SaaS générique" plutôt que "outil professionnel immobilier".

**Second problème** : les messages d'erreur ne sont pas actionnables. Ils constatent mais ne guident pas. Le brand voice Versi exige "fait + solution immédiate" pour les erreurs — ce pattern n'est pas implémenté.

**Point critique P0** : faute d'orthographe "irreversible" au lieu de "irréversible" dans le confirm() de suppression. Visible par Thomas à chaque suppression de plan — casse la crédibilité de l'outil.

**Ce qui est correct** : structure sobre, phrases courtes, zéro exclamation, bonne utilisation du terme "opération" dans le registre Versi, CTA "Analyser les plans" compréhensible (amendable mais pas bloquant).

**Score : 6/10.** Pour un premier jet d'interface technique, c'est correct. Mais Versi ne se positionne pas comme un outil technique générique — il doit parler le langage des marchands de biens et des opérateurs immobiliers. Les corrections P0/P1 sont rapides (< 30 min @fullstack) et font passer le score à 8,5+.

---

## 2. Ton & vocabulaire (cohérence Thomas marchand)

**Contexte persona** : Thomas est un marchand de biens, utilisateur pro de Studio Versi. Il n'est pas Laurent (investisseur institutionnel) ni Sophie (propriétaire cédante). C'est un opérateur terrain qui jongle entre achat, découpage en lots, plans et revente. Il est à l'aise avec les outils numériques (il utilise Studio Versi), il est exigeant sur l'efficacité, et le jargon tech ne lui fait pas peur — mais un outil qui lui coûte du temps ou qui parle mal le métier immobilier le fera partir.

**Ce que le brand voice Versi dit pour les interfaces** : factuel, sans adjectif auto-décerné, phrases courtes, zéro exclamation, verbe d'action avant le substantif, CTA < 6 mots avec un verbe.

**Analyse du copy actuel** :

Le copy de la page upload est globalement sobre et économe — la structure est claire, les messages sont courts. Ce sont les bons instincts. Trois problèmes systémiques à corriger :

1. **L'anglicisme "uploader/uploadé"** apparaît 3 fois (H1, compteur, progression). Dans un SaaS grand public, c'est acceptable. Dans un outil B2B immobilier vendu sous la marque Versi — qui se positionne comme opérateur structuré, pas startup tech — cet anglicisme fait dissonance. Thomas dirait "déposer ses plans", pas "uploader". Versi dirait "déposez" pour rester dans le registre des opérateurs professionnels.

2. **Les messages d'erreur manquent d'actionnabilité** : 4 erreurs sur 5 se contentent de constater sans proposer d'action. Le brand voice Versi pour les erreurs est : "Fait + solution immédiate" (cf. brand-voice.md section 6 — exemple 5). Ce pattern n'est pas respecté ici.

3. **Un terme ambiguë** : "emplacement restant" (F8) emploie un mot du registre immobilier (emplacement = terrain, parking) dans un sens UI (slot disponible). C'est une collision de vocabulaires qui peut dérouter Thomas.

**Ce qui fonctionne bien** : le vouvoiement n'est pas applicable ici (interface, pas discours direct) — les formulations à l'infinitif et les labels neutres sont correctement impersonnels. "Opération" est bien utilisé comme terme métier (F3, F11). La concision générale est bonne — pas de remplissage, pas de langage SAV.

**Conclusion** : le copy est à 70% correct dans son fond. Ce sont des finitions de registre (anglicismes, actionnabilité des erreurs) qui font la différence entre un outil "qui fait SaaS générique" et un outil "qui parle le bon métier".

---

## 3. Tableau findings

| # | Emplacement | Texte actuel | Problème | Correction proposée | Priorité |
|---|---|---|---|---|---|
| F1 | H1 page (L233) | `Uploadez vos plans` | Anglicisme "uploadez" — Thomas marchand de biens travaille dans un registre pro. "Uploader" est acceptable dans un SaaS mais "uploadez" comme H1 fait cheap dans un outil B2B immobilier. Niveau brand voice : Versi dit des choses "précises" sans jargon tech mal francisé. | `Ajoutez vos plans` ou `Déposez vos plans` | **P1** |
| F2 | Sous-titre (L234-237) | `Un plan par lot, ou un plan d'ensemble — les deux formats fonctionnent. PDF ou image, résolution minimum 150 dpi.` | (a) "les deux formats fonctionnent" — formulé en mode défensif/réassurance, le contraire du registre factuel Versi. (b) "résolution minimum 150 dpi" : la spec technique 150 dpi est trop abrupte sans contexte. Thomas sait ce qu'est un DPI mais s'il envoie un scan de 72 dpi il va échouer sans comprendre pourquoi. (c) Le sous-titre mélange deux informations distinctes (structure des plans + contraintes techniques) dans une même phrase. | Couper en deux : `Un plan par lot ou un plan d'ensemble — les deux fonctionnent.` + ligne technique séparée : `Formats acceptés : PDF, PNG, JPG. Résolution minimum 150 dpi.` | **P1** |
| F3 | Message limite atteinte (L84) | `Maximum ${MAX_FILES_PER_PROJECT} plans par opération.` | (a) "par opération" — le contexte est une opération immobilière (marchand de biens), pas juste un "projet". Cohérent avec le vocabulaire Versi. Mais si MAX_FILES_PER_PROJECT = 20, dire "Maximum 20 plans" est sec. Thomas peut se demander pourquoi. (b) Pas d'action proposée — que faire quand on est à la limite ? | `Limite atteinte — ${MAX_FILES_PER_PROJECT} plans par opération. Supprimez un plan pour en ajouter un nouveau.` | **P1** |
| F4 | Message dépassement partiel (L90-93) | `Seuls ${filesToUpload.length} fichiers seront uploadés (limite de ${MAX_FILES_PER_PROJECT} plans).` | (a) "uploadés" : même problème qu'en F1. (b) "Seuls" — connotation de frustration/restriction. (c) Formulation passive et technique, pas actionnable. Thomas comprend ce qui se passe mais ne sait pas ce qui a été ignoré. | `${filesToUpload.length} plan${filesToUpload.length > 1 ? 's' : ''} ajouté${filesToUpload.length > 1 ? 's' : ''} sur ${files.length} — limite de ${MAX_FILES_PER_PROJECT} plans atteinte.` | **P1** |
| F5 | Message erreur réseau (L122) | `${file.name} : erreur réseau.` | Très technique, pas actionnable. Thomas voit un nom de fichier + "erreur réseau" — il ne sait pas quoi faire. Pas de suggestion de retry. | `${file.name} n'a pas pu être déposé — vérifiez votre connexion et réessayez.` | **P0** |
| F6 | Confirmation suppression (L141) | `Supprimer ce plan ? Cette action est irreversible.` | (a) "irreversible" : faute d'orthographe — deux 'r' requis : "irréversible". (b) Le `confirm()` natif du navigateur est une pratique UX obsolète et non stylable — mais c'est un choix @fullstack, hors scope copy. Sur le texte seul : "Cette action est irréversible" est correct mais la formulation est froide. Dans le registre Versi : factuel et direct est bien, mais la faute casse la crédibilité. | `Supprimer ce plan ? Cette action est irréversible.` (correction orthographique uniquement — le fond est acceptable) | **P0** |
| F7 | Compteur plans uploadés (L305-308) | `{plans.length} plan{plans.length > 1 ? 's' : ''} uploadé{plans.length > 1 ? 's' : ''}` | "uploadé(s)" : anglicisme répété. Dans un contexte de grille de résultats, c'est le seul titre de section. Thomas voit "3 plans uploadés" — le mot fait cheap dans un outil immobilier pro. | `{plans.length} plan{plans.length > 1 ? 's' : ''} déposé{plans.length > 1 ? 's' : ''}` | **P1** |
| F8 | Compteur emplacements restants (L309-313) | `{MAX_FILES_PER_PROJECT - plans.length} emplacement{...} restant{...}` | "emplacement restant" est un terme vague — emplacement de quoi ? Pour Thomas, "emplacement" évoque le terrain immobilier. Plus clair : "plan restant" ou "ajout restant". | `{MAX_FILES_PER_PROJECT - plans.length} ajout{MAX_FILES_PER_PROJECT - plans.length > 1 ? 's' : ''} possible{MAX_FILES_PER_PROJECT - plans.length > 1 ? 's' : ''}` | **P2** |
| F9 | Progression d'upload (L294-296) | `Upload de {name}...` | "Upload de" : anglicisme pur + préposition incorrecte. "Dépôt de {name}..." ou plus dynamique : "Analyse de {name}..." si le fichier est traité à l'upload. | `Dépôt de {name} en cours…` (avec ellipse typographique "…" et non trois points "...") | **P1** |
| F10 | CTA principal (L341-343) | `Analyser les plans` | Correct fonctionnellement. Mais "Analyser les plans" ne dit pas CE QUI VA SE PASSER pour Thomas. L'IA va analyser ? Combien de temps ? Le CTA devrait projeter Thomas dans l'étape suivante. Aussi : le bouton est `disabled` tant que `plans.length === 0` — mais il est rendu même quand plans.length === 0 et qu'il n'y a aucun plan visible. Si Thomas arrive sur cette page pour la première fois et voit un bouton grisé sans plans déposés, il peut ne pas comprendre pourquoi il est inactif (pas de tooltip). | `Lancer l'analyse` (plus court, < 4 mots, verbe d'action en premier — conforme brand voice CTA < 6 mots) + ajouter `title="Déposez au moins un plan pour lancer l'analyse"` sur le bouton disabled | **P1** |
| F11 | Message "projet introuvable" (L208-219) | `Opération introuvable.` + `Retour aux opérations` | "Opération introuvable" est correct dans le registre Versi (on dit "opération" pas "projet"). Mais le lien "Retour aux opérations" est un lien texte souligné muted — peu visible, peu accessible. Ce n'est pas un message d'erreur actionnable au sens où Thomas ne comprend pas CE QUI S'EST PASSÉ. | `Cette opération n'existe pas ou n'est plus accessible.` + bouton (pas un lien texte) `Retour à mes opérations` | **P2** |
| F12 | Erreur chargement données projet (L68) | `Impossible de charger les données du projet.` | "du projet" : manque de cohérence — ailleurs on parle d'"opération". À harmoniser. Aussi : pas d'action proposée à Thomas. | `Impossible de charger l'opération. Actualisez la page ou contactez le support.` | **P1** |
| F13 | Erreur suppression plan (L155) | `Impossible de supprimer le plan.` | Court et factuel — correct. Mais pas d'action de retry explicite. | `Impossible de supprimer ce plan. Réessayez ou actualisez la page.` | **P2** |
| F14 | Erreur lancement analyse (L188) | `Impossible de lancer l'analyse.` | Même pattern — factuel mais sans action. | `L'analyse n'a pas pu démarrer. Réessayez ou actualisez la page.` | **P2** |
| F15 | aria-label bouton fermeture erreur (L261) | `Fermer le message d'erreur` | Fonctionnel pour l'accessibilité. Aucun problème copy. | — | N/A |

---

## 4. Points de vigilance

- **Règle n°17** (promesses non-systématiques H1) : PASS. Le H1 "Uploadez vos plans" (→ "Déposez vos plans" après correction F1) est une instruction, pas une promesse. Aucune caractéristique non-systématique revendiquée en position de titre.

- **Règle n°15** (mention concurrent) : PASS. Aucun nom de concurrent mentionné dans le copy de cette page.

- **Messages d'erreur actionnables** : FAIL sur 5 messages. Patterns constatés sans action proposée : F5 (erreur réseau fichier), F12 (impossible de charger), F13 (impossible de supprimer), F14 (impossible de lancer l'analyse), F3 (limite atteinte sans action). Tous amendés dans le tableau findings. Le brand voice Versi (section 6, exemple 5) est explicite : un message d'erreur = un fait + une solution. Ce pattern doit être appliqué systématiquement.

- **Empty states guidage** : PARTIEL. L'état vide de la page (aucun plan uploadé) est géré par la DropZone (composant non lu en détail — hors scope audit). La page en elle-même n'affiche pas de message d'état vide supplémentaire, ce qui est correct si la DropZone contient ses propres instructions. Point à vérifier par @fullstack : la DropZone a-t-elle un copy de guidage clair pour Thomas (ex : "Glissez vos plans ici ou cliquez pour parcourir") ? Ce n'est pas audité ici mais recommandé en suivi.

---

## 5. Recommandations globales

**1. Éliminer tous les anglicismes "upload/uploader"** (F1, F4, F7, F9) — remplacer par "déposer/dépôt". Ce changement est cosmétique en termes de code (chercher/remplacer) mais structurant pour la perception de l'outil. Déléguer à @fullstack avec la liste exacte des occurrences (tableau findings).

**2. Appliquer le pattern brand voice "fait + solution" à tous les messages d'erreur** (F3, F5, F12, F13, F14). Créer un pattern réutilisable dans le code plutôt que de corriger fichier par fichier — cela garantit la cohérence sur les prochaines pages du workflow.

**3. Corriger la faute d'orthographe P0** (F6 — "irréversible") immédiatement. Une faute dans un `confirm()` est vue par Thomas à chaque suppression. C'est la correction la plus rapide et la plus impactante sur la crédibilité.

**4. Auditer les composants enfants** : DropZone et PlanThumbnail n'ont pas été lus dans cet audit (hors scope du brief). Ils contiennent probablement du copy supplémentaire (labels, placeholders, tooltips, états loading/error). Un audit complémentaire sur ces composants est recommandé avant la livraison de l'étape 1.

**5. Ajouter un tooltip sur le CTA disabled** (F10) : quand Thomas arrive sur la page sans plans déposés, le bouton "Lancer l'analyse" est grisé. Sans feedback, il ne comprend pas pourquoi. Un `title` ou un `aria-describedby` suffit — correction 5 minutes.

**6. Harmoniser "projet" vs "opération"** : le message L68 utilise "projet" (`données du projet`) alors que le reste de la page dit "opération". Terme à aligner sur "opération" partout dans ce fichier — puis propager la règle à tous les fichiers du workflow Studio Versi.

---

## 6. Verdict

**Score copy : 6/10**

Honnête pour un premier jet d'interface. La structure est sobre, les phrases courtes, zéro exclamation — les bons réflexes brand voice sont là. Ce qui pénalise : une faute d'orthographe P0, 4 anglicismes qui font basculer le registre du côté SaaS générique, et 5 messages d'erreur qui constatent sans guider. Ces corrections sont rapides (< 45 min @fullstack) et font passer le score à 8,5/10.

**Après corrections P0/P1 : score cible 8,5/10.**
**Pour atteindre 9/10** : audit DropZone + PlanThumbnail (copy non audité dans cette passe).

---

## 7. Handoff

**Handoff → @fullstack + @orchestrator**

- **Fichiers produits** : `/home/user/Versi/docs/copy/upload-us-vs-02-audit-v1.md`
- **Décisions prises** :
  - Remplacement systématique "uploader/uploadé" → "déposer/déposé" dans toute la page (F1, F4, F7, F9)
  - Pattern message d'erreur Versi : "Fait + solution immédiate" — à appliquer sur les 5 erreurs concernées (F3, F5, F12, F13, F14)
  - Harmonisation vocabulaire : "opération" partout, éliminer "projet" (F12, et propagation à recommander sur l'ensemble du workflow)
  - CTA reformulé : "Lancer l'analyse" (< 4 mots, verbe en premier)
- **Corrections P0 à traiter en priorité absolue** :
  1. `F6` — "irreversible" → "irréversible" (L141, `confirm()`)
  2. `F5` — message erreur réseau non actionnable → ajouter "vérifiez votre connexion et réessayez"
- **Corrections P1** (avant livraison step 1) : F1, F2, F3, F4, F7, F9, F10, F12
- **Corrections P2** (amélioration recommandée) : F8, F11, F13, F14
- **Suivi recommandé** : audit copy DropZone et PlanThumbnail non effectué dans cette passe — à planifier avant la livraison finale de l'étape Upload.
