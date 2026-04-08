# Checklist RGPD technique — versi.fr

> Agent : @legal | Date : 2026-04-08 | Version : 1.0
> Destinataire : @fullstack — implémentation technique avant mise en ligne
> Format : chaque item est binaire (fait / non fait) et directement actionnable

---

## Résumé exécutif — Risques en 5 points

| # | Point | Criticité |
|---|-------|-----------|
| R1 | Formulaire sans information RGPD = non-conformité immédiate | BLOQUANT avant mise en ligne |
| R2 | Absence de lien "Politique de confidentialité" dans le footer | BLOQUANT avant mise en ligne |
| R3 | Absence de lien "Mentions légales" dans le footer | BLOQUANT avant mise en ligne |
| R4 | Analytics sans vérification de la solution | MOYEN — résolu si Plausible retenu |
| R5 | HTTPS non activé | BLOQUANT — données formulaire transitent en clair sinon |

---

## Checklist par ordre de priorité

### PRIORITÉ 0 — Bloquants avant mise en ligne

Ces 6 items doivent être à FAIT avant toute mise en production de versi.fr.

---

**[ ] 1. HTTPS activé sur versi.fr**

- Vérifier que le certificat SSL/TLS est actif (HTTPS sur toutes les pages)
- Redirections HTTP → HTTPS activées (redirection 301)
- Le formulaire de contact ne doit JAMAIS transiter en clair sur HTTP
- Chez Vercel et Netlify : HTTPS automatique sur les domaines custom — vérifier après connexion du domaine versi.fr
- Critère done : `https://versi.fr` charge sans warning navigateur, `http://versi.fr` redirige vers HTTPS

---

**[ ] 2. Information RGPD sous le formulaire de contact**

Ajouter le texte suivant directement sous le bouton "Envoyer" du formulaire :

```
En soumettant ce formulaire, vous acceptez que Versi traite vos données 
personnelles (nom, email, téléphone, message) afin de répondre à votre 
demande. Ces données sont conservées 3 ans maximum et ne sont pas 
transmises à des tiers. Conformément au RGPD, vous pouvez exercer vos 
droits (accès, rectification, suppression, opposition) en écrivant à 
contact@versi.fr. Politique de confidentialité
```

- Le mot "Politique de confidentialité" doit être un lien cliquable vers `/politique-de-confidentialite`
- Style : texte petit (12-13px), couleur sobre (gris), non intrusif mais lisible
- Position : immédiatement sous le bouton d'envoi, avant tout autre élément
- Critère done : le texte est visible sans scroll sur desktop et mobile, le lien fonctionne

---

**[ ] 3. Page "Mentions légales" accessible**

- Créer la route `/mentions-legales` dans l'application React
- Contenu : le texte de `docs/legal/mentions-legales-draft.md` (après complétion des champs par Thomas)
- La page doit être accessible sans JavaScript (rendu statique)
- Critère done : `https://versi.fr/mentions-legales` charge avec le contenu complet, tous les champs [À COMPLÉTER] remplacés

---

**[ ] 4. Page "Politique de confidentialité" accessible**

- Créer la route `/politique-de-confidentialite` dans l'application React
- Contenu : le texte de `docs/legal/privacy-policy.md` (après complétion des champs par Thomas)
- Critère done : `https://versi.fr/politique-de-confidentialite` charge avec le contenu complet

---

**[ ] 5. Footer avec liens légaux obligatoires**

Le footer du site doit contenir a minima :

```
Mentions légales | Politique de confidentialité | © 2026 Versi
```

- "Mentions légales" → lien vers `/mentions-legales`
- "Politique de confidentialité" → lien vers `/politique-de-confidentialite`
- Ces liens doivent être visibles sur toutes les pages / sections du one-page
- Critère done : liens présents dans le footer, fonctionnels sur desktop et mobile

---

**[ ] 6. Champs Thomas complétés avant mise en ligne**

Obtenir de Thomas les informations suivantes et les intégrer dans les fichiers légaux :

| Champ | Où l'intégrer | Statut |
|-------|---------------|--------|
| Forme juridique (SAS/SARL/SA...) | Mentions légales + Politique de confidentialité | [ ] |
| Capital social | Mentions légales | [ ] |
| Adresse du siège social | Mentions légales + Politique de confidentialité | [ ] |
| Numéro SIREN/RCS | Mentions légales + Politique de confidentialité | [ ] |
| Numéro TVA intracommunautaire | Mentions légales | [ ] |
| Nom du directeur de publication | Mentions légales | [ ] |
| Numéro de téléphone non surtaxé | Mentions légales | [ ] |
| Hébergeur retenu (Vercel/Netlify/autre) | Mentions légales + Politique de confidentialité | [ ] |
| Service formulaire retenu (Formspree/EmailJS/autre) | Politique de confidentialité | [ ] |

Critère done : zéro occurrence de "[À COMPLÉTER" dans les pages légales en production.

---

### PRIORITÉ 1 — À mettre en place au lancement

---

**[ ] 7. Choix et intégration de Plausible Analytics**

Recommandation : intégrer Plausible Analytics (solution cookieless, conforme RGPD, exempt de bandeau consentement).

Intégration technique :

```html
<!-- Dans le <head> du fichier public/index.html ou dans le composant App -->
<script
  defer
  data-domain="versi.fr"
  src="https://plausible.io/js/plausible.js"
></script>
```

- Créer un compte sur plausible.io
- Ajouter le domaine `versi.fr`
- Coller le script dans le `<head>`
- Aucun bandeau cookies requis
- Aucune configuration RGPD supplémentaire requise
- Critère done : les pages vues apparaissent dans le tableau de bord Plausible après 24h

**Si GA4 est retenu à la place (non recommandé) :** contacter @legal pour générer un bandeau cookies conforme CNIL avant intégration. GA4 ne peut PAS être intégré sans consentement préalable.

---

**[ ] 8. Attribut autocomplete sur les champs du formulaire**

Ajouter les attributs `autocomplete` appropriés sur les champs du formulaire pour faciliter la complétion sans stockage additionnel :

```html
<input type="text" name="name" autocomplete="name" />
<input type="email" name="email" autocomplete="email" />
<input type="tel" name="phone" autocomplete="tel" />
<textarea name="message" autocomplete="off" />
```

Critère done : attributs présents sur tous les champs du formulaire.

---

**[ ] 9. Absence de traceurs tiers non déclarés**

Vérifier qu'aucun script tiers non listé dans la politique de confidentialité n'est chargé :

- Ouvrir les DevTools → onglet Network → filtrer par "third-party"
- Aucune requête vers Google, Facebook, LinkedIn, Hotjar ou autre domaine tiers ne doit apparaître sans consentement
- Exception autorisée : Plausible (si retenu), polices Google Fonts (recommandation : héberger les polices en local pour éviter les transferts vers Google)
- Critère done : 0 requête tiers non déclarée dans la politique de confidentialité

---

**[ ] 10. Headers de sécurité HTTP (délégué à @infrastructure)**

Ces headers réduisent les risques de collecte non autorisée de données et renforcent la sécurité :

```
Content-Security-Policy: default-src 'self'; script-src 'self' plausible.io; img-src 'self' data:
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

- Ces headers sont à configurer au niveau de l'hébergeur (Vercel/Netlify) via les fichiers de configuration
- Sur Vercel : ajouter dans `vercel.json` sous la clé `headers`
- Sur Netlify : ajouter dans `_headers`
- Critère done : headers présents et vérifiables via securityheaders.com

Note : cette implémentation est du ressort de @infrastructure. Ce point est documenté ici pour information RGPD.

---

### PRIORITÉ 2 — Dans les 3 mois post-lancement

---

**[ ] 11. Registre des traitements RGPD**

Créer et maintenir un registre des traitements (art. 30 RGPD). Document interne — non publié sur le site.

Format minimal pour Versi :

| Traitement | Finalité | Base légale | Données collectées | Durée conservation | Destinataires |
|------------|----------|-------------|---------------------|-------------------|---------------|
| Formulaire de contact | Répondre aux demandes | Intérêt légitime | Nom, email, téléphone, message | 3 ans | Co-fondateurs Versi |
| Analytics Plausible | Mesure d'audience | Pas requis (données anonymes) | Pages vues, pays, appareil (agrégés) | Indéfini (non personnel) | Versi |

Critère done : document existant, daté, signé par le responsable de traitement (Thomas ou désigné).

---

**[ ] 12. Procédure de gestion des demandes de droits**

Documenter en interne la procédure à suivre si un utilisateur envoie une demande d'exercice de droits RGPD à contact@versi.fr :

1. Accuser réception sous 48h
2. Identifier le demandeur (demander une pièce d'identité si doute)
3. Traiter la demande dans un délai d'un mois maximum
4. Documenter la demande et la réponse (pour preuve de conformité)

Critère done : procédure écrite, partagée avec les 3 co-fondateurs.

---

**[ ] 13. Audit des données stockées par le service de formulaire**

Si Formspree ou EmailJS est utilisé pour le formulaire :

- Vérifier les conditions de conservation des données côté prestataire
- Supprimer régulièrement les soumissions de formulaire stockées sur la plateforme (ne pas laisser s'accumuler)
- Vérifier que le prestataire est conforme RGPD (DPA disponible, hébergement UE ou garanties adéquates)
- Critère done : politique de conservation du prestataire documentée, nettoyage manuel des données tous les 6 mois minimum

---

## Récapitulatif par criticité

### Bloquant avant mise en ligne (6 items)

| # | Item | Responsable |
|---|------|-------------|
| 1 | HTTPS activé | @fullstack + hébergeur |
| 2 | Information RGPD sous le formulaire | @fullstack |
| 3 | Page /mentions-legales accessible | @fullstack |
| 4 | Page /politique-de-confidentialite accessible | @fullstack |
| 5 | Footer avec liens légaux | @fullstack |
| 6 | Champs Thomas complétés | Thomas → @fullstack |

### Au lancement (4 items)

| # | Item | Responsable |
|---|------|-------------|
| 7 | Plausible Analytics intégré | @fullstack |
| 8 | Attributs autocomplete formulaire | @fullstack |
| 9 | Absence de traceurs tiers non déclarés | @fullstack |
| 10 | Headers de sécurité HTTP | @infrastructure |

### Dans les 3 mois (3 items)

| # | Item | Responsable |
|---|------|-------------|
| 11 | Registre des traitements RGPD | Thomas |
| 12 | Procédure de gestion des droits RGPD | Thomas |
| 13 | Audit données service formulaire | Thomas + @fullstack |

---

**Handoff → @fullstack**

- Fichiers produits : `/docs/legal/rgpd-checklist.md`
- Décisions prises : 6 items bloquants identifiés pour mise en ligne. Plausible Analytics recommandé (exempt de bandeau). Aucun bandeau cookies requis avec cette stack.
- Points d'attention :
  - Items 1 à 5 sont de la responsabilité directe de @fullstack — ne pas mettre en production sans ces 5 items à FAIT
  - L'item 6 (champs Thomas) bloque les items 3 et 4 — relancer Thomas pour obtenir les infos SIRET/forme/hébergeur
  - Le texte RGPD du formulaire (item 2) est fourni mot pour mot dans cette checklist — copier-coller direct
  - Headers de sécurité (item 10) : transmettre à @infrastructure avec le fichier de configuration cible (vercel.json ou _headers Netlify)
  - Si un analytics autre que Plausible est retenu, contacter @legal pour réévaluer la nécessité d'un bandeau cookies
