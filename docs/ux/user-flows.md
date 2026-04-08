# User Flows — versi.fr

> Produit par @ux | Date : 2026-04-08
> Source : personas.md, functional-specs.md, project-context.md
> Site one-page scrolling. Zéro authentification. Conversion = formulaire de contact.

---

## Flow 1 — Laurent, l'investisseur (persona principal)

**Déclencheur :** un contact lui envoie le lien versi.fr. Il a 10 secondes pour décider de rester.

| Étape | Section | Question dans sa tête | Décision | Signal de continuation |
|---|---|---|---|---|
| 1 | Arrivée — Hero | "C'est quoi ce site ? Est-ce sérieux ?" | Reste si : design institutionnel, H1 clair, aucun signe d'amateurisme | H1 visible + fond architectural → PASS |
| 2 | Scan Hero (0-3s) | "Qui sont-ils ? Que font-ils exactement ?" | Cherche une phrase de positionnement claire et un CTA | Sous-titre "Acquisition. Transformation. Structuration." → PASS |
| 3 | Scroll → Mission | "C'est plus qu'un seul métier ?" | Vérifie si Versi est une vraie structure ou un opérateur mono-métier | Rôle de holding intégrée confirmé → continue |
| 4 | Scroll → Activités | "Les 4 entités — sont-elles distinctes ? Vraiment intégrées ?" | Lit les 4 cartes (Développement, Invest, Capital, Finance) | 4 entités avec liens vers sites propres → crédibilité structure |
| 5 | Scroll → Approche | "Comment travaillent-ils concrètement ?" | Vérifie la méthode : Sourcer → Analyser → Transformer → Opérer | 4 étapes séquencées → rassure sur le savoir-faire opérationnel |
| 6 | Scroll → Équipe | "Qui sont vraiment ces gens ? Puis-je les vérifier ?" | Cherche noms, photos, parcours LinkedIn vérifiable | 3 co-fondateurs identifiés avec profils réels → crédibilité fondateurs |
| 7 | Scroll → Contact OU nav | "Est-ce que ça vaut un message ?" | Si PASS sur équipe et activités → passe au formulaire | Formulaire visible, simple, 4 champs max |
| 8 | Formulaire | "Que vais-je écrire ?" | Rédige un message qualifié (dossier ou intérêt de co-investissement) | Envoi → confirmation "Nous vous répondons sous 48h" |

**Micro-décisions critiques :**
- Étape 1→2 : si le H1 est vague ou le design fait "template" → fermeture immédiate
- Étape 6 : si l'équipe n'est pas visible rapidement (photo + nom + parcours) → abandon
- Étape 8 : si le formulaire est long ou demande des infos prématurées → abandon

**KPI primaire (HEART — Task Success)** : taux de complétion du formulaire par les visiteurs ayant scrollé jusqu'à la section Équipe. Cible : >= 15% (contact qualifié, audience B2B restreinte).

---

## Flow 2 — Pierre, le prescripteur (canal d'acquisition principal)

**Déclencheur :** un confrère lui envoie le lien, ou il cherche des opérateurs actifs. Visite de vérification express — il décide en 2 minutes si Versi entre dans son carnet.

| Étape | Section | Question dans sa tête | Décision | Signal de continuation |
|---|---|---|---|---|
| 1 | Hero | "Institutionnel ou bricolage ?" | Élimine si le design n'est pas à la hauteur des opérateurs avec qui il travaille | Design pro → reste |
| 2 | Nav / scan global | "Quel spectre couvrent-ils ? Une entité ou plusieurs métiers ?" | Scan rapide de la navigation : Activités visible → clique ou scrolle directement | Ancres nav lisibles → scrolle vers Activités |
| 3 | Activités | "Marchand de biens, oui — mais ont-ils aussi la structuration ?" | Lit les 4 cartes pour valider la couverture du cycle complet | 4 entités = cycle complet → couvre ses besoins multi-dossiers |
| 4 | Approche | "Comment ils opèrent ? Sont-ils structurés ?" | Process en 4 étapes → cherche rigueur et organisation | Méthode explicite → PASS |
| 5 | Équipe | "Qui sont ces gens ? Sont-ils vérifiables LinkedIn ?" | Profils fondateurs → vérifie sur LinkedIn en parallèle | Noms + profils réels → validation externe possible |
| 6 | Implantation | "Interviennent-ils sur ma géographie ?" | Paris + Lille + métropoles → décide si ses dossiers correspondent | Zone validée → continue |
| 7 | Contact | "Comment les contacter pour un premier dossier de test ?" | Préfère un email direct (contact@versi.fr) ou le formulaire | Email visible en clair + formulaire → choisit son canal |
| 8 | Action | Premier dossier de test envoyé | Envoie une prise de contact rapide pour tester la réactivité | Confirmation "48h" → attend la réponse pour valider la relation |

**Différence vs Laurent :** Pierre va directement à Activités via la nav — il ne lit pas le Hero en détail. Il vérifie en 2 minutes, pas 60 secondes. Sa conversion = email ou formulaire avec un dossier réel.

**KPI primaire (HEART — Adoption)** : ratio visites Pierre → prise de contact. Non mesurable directement (pas de segmentation par persona). Proxy : taux de clics sur "contact@versi.fr" (lien mailto).

---

## Micro-décisions transversales (valables pour les 3 personas)

| Section | Question binaire | Si OUI → continue | Si NON → risque d'abandon |
|---|---|---|---|
| Hero | "Ce site fait-il institutionnel en 3 secondes ?" | Scroll vers Mission | Fermeture onglet |
| Mission | "Comprends-je le rôle de Versi sans effort ?" | Scroll vers Activités | Scroll rapide, lecture superficielle |
| Activités | "Les 4 entités couvrent-elles ce dont j'ai besoin ?" | Scroll vers Approche | Skip vers Équipe ou Contact |
| Approche | "La méthode me rassure-t-elle sur l'exécution ?" | Scroll vers Implantation | Skip vers Équipe |
| Implantation | "Interviennent-ils dans ma zone ?" | Scroll vers Équipe | Potentiel abandon si hors zone |
| Équipe | "Ces gens sont-ils réels et vérifiables ?" | Scroll vers Contact | Abandon (critère éliminatoire) |
| Contact | "Puis-je les contacter facilement ?" | Envoi formulaire ou email | Abandon si formulaire trop complexe |

---

## Edge cases

| Cas | Comportement attendu |
|---|---|
| Laurent arrive sur mobile | Nav hamburger → menu overlay → scroll ancres fonctionnel. Section Équipe visible sans zoom. |
| Image Hero ne charge pas | Fond `#1A1A1A` en fallback, texte lisible, aucune régression |
| Formulaire vide soumis | Validation inline avant envoi — message d'erreur champ par champ, pas de page d'erreur |
| Envoi formulaire échoue (Formspree down) | Message d'erreur "Votre message n'a pas pu être envoyé — écrivez-nous directement à contact@versi.fr" |
| Laurent arrive via LinkedIn mobile | Même expérience que mobile web — pas de deep link ni de redirect |
| Pierre re-visite versi.fr 2 semaines plus tard | Page statique, pas de state conservé — il retrouve le même contenu, navigation identique |

---

## Tests UX — Flows critiques

| Test | Critère de succès | Statut |
|---|---|---|
| Laurent comprend Versi en 5s | H1 + sous-titre lisibles sans scroll | Dépend du copy implémenté |
| Équipe trouvable en < 2 clics depuis Hero | Ancre "ÉQUIPE" visible dans la nav sticky | Spécifié dans functional-specs.md |
| Formulaire completable sans aide | 4 champs max, labels clairs, validation inline | Spécifié — à vérifier post-implémentation |
| Edge case formulaire KO | Message de fallback avec email direct visible | À implémenter dans l'état erreur |
| Navigation clavier complète | Tab → chaque lien nav, chaque CTA, chaque champ formulaire | Critique WCAG 2.2 AA |

---

**Handoff → @design**

Fichiers produits :
- `/home/user/Versi/docs/ux/user-flows.md` (ce fichier)

Décisions prises :
- Deux flows principaux documentés : Laurent (investisseur, 8 étapes) et Pierre (prescripteur, 8 étapes)
- Sophie HORS V1 — confirmé par orchestrator (historique project-context.md)
- Section Équipe = point de conversion critique pour les 2 personas — doit être atteignable en < 2 scroll depuis le Hero
- Formulaire de contact = seul point de conversion — garder ≤ 4 champs (Nom, Email, Téléphone, Message)
- Email contact@versi.fr doit être visible en clair dans la section Contact (fallback si Formspree KO)

Points d'attention pour @design :
- Section Équipe : hiérarchie visuelle doit permettre l'identification immédiate des 3 co-fondateurs (photo + nom au premier regard)
- Section Activités : 4 cartes doivent être lisibles d'un coup d'oeil — pas de contenu caché sous un fold
- Nav sticky : l'item "ÉQUIPE" est le lien le plus utilisé par Laurent — doit être bien visible
