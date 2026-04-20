# Évaluation blog — Versi Immobilier
> Produit par @growth | Date : 2026-04-11
> Référence : docs/growth/growth-strategy.md, docs/seo/seo-strategy.md, project-context.md

---

## Note préliminaire — Périmètre

La mission vise "versi-immobilier.fr" avec des requêtes "acheter appartement Lille" et "marchand de biens Hauts-de-France". Le repo actuel couvre versi.fr (holding institutionnelle). Cette évaluation part du principe que versi-immobilier.fr est l'entité opérationnelle (Versi Développement ou Versi Invest) avec une audience mixte : Sophie (vendeuse, 42 ans) et prospects acquéreurs locaux. Si le blog est envisagé sur versi.fr, les conclusions changent — voir section Risques.

---

## 1. Verdict

**GO conditionnel.**

Le blog est pertinent pour versi-immobilier.fr uniquement si l'objectif est d'acquérir Sophie (vendeuse propriétaire) et les acquéreurs locaux via SEO longue traîne. Pour Laurent (investisseur), le blog n'est pas un canal — il arrive par le réseau, pas par Google. Le GO est conditionnel à une automatisation IA complète de la production : zéro blog sans pipeline automatisé, un fondateur solo ne peut pas alimenter manuellement un blog et opérer des chantiers simultanément.

---

## 2. Impact sur le funnel AARRR

Le blog nourrit principalement **Acquisition** et secondairement **Activation** :

- **Acquisition** : captation de trafic organique longue traîne (Sophie qui tape "vendre immeuble à rénover Lille", acquéreur qui tape "acheter bien rénové Hauts-de-France"). Ce trafic ne viendrait pas sinon — le réseau ne couvre pas cette cible.
- **Activation** : un prospect qui lit 2-3 articles opérationnels (rénovation, marchand de biens, structuration) arrive sur /vendre ou /nos-biens déjà convaincu de la compétence. Temps de décision réduit.
- **Retention / Referral** : faible impact direct. Le blog n'est pas conçu pour la rétention d'une audience fidèle — c'est un outil de captation, pas de communauté.

---

## 3. Impact sur le CAC

CAC actuel : 0€ (réseau, temps fondateurs). Le blog maintient ce modèle à condition que la production soit automatisée.

- **Scénario manuel** : 2h/article × 2 articles/mois = 4h fondateur. CAC temps = élevé pour un volume de leads faible à court terme (SEO prend 6-12 mois pour donner des résultats).
- **Scénario automatisé IA** : brief de 10 min → génération Claude → validation 20 min → publication. Coût réel : 30 min/article. CAC temps = acceptable.
- **Horizon de rentabilité** : les leads SEO blog arriveront au mieux à M+6. Les leads réseau arrivent dès J0. Conclusion : le blog ne remplace pas le réseau, il le complète à moyen terme.

---

## 4. Cannibalisation des pages transactionnelles

**Risque faible si l'architecture est correcte.** Règles à respecter :

- Les articles de blog ciblent des requêtes informationnelles ("comment vendre un immeuble à rénover", "qu'est-ce qu'un marchand de biens") — jamais les mêmes mots-clés que /vendre (transactionnel, "vendre votre bien à un marchand de biens Lille") ou /nos-biens (navigationnel).
- Chaque article doit avoir un CTA vers la page transactionnelle la plus proche. Le blog convertit vers /vendre, il ne remplace pas /vendre.
- Éviter les articles qui répondent exactement à l'intention de /vendre — ce serait se tirer une balle dans le pied (Google choisira l'un ou l'autre, et ce sera le blog moins optimisé pour la conversion).

---

## 5. Synergie LinkedIn

LinkedIn est le canal principal de Versi (growth-strategy.md). Le blog amplifie LinkedIn selon cette mécanique :

1. **Article blog → post LinkedIn** : chaque article devient 1 post LinkedIn (angle "leçon de terrain" plutôt que "lisez notre article"). Le post est autonome — il donne la valeur, le lien est en commentaire.
2. **Post LinkedIn → trafic blog** : les posts opérationnels qui performent (>500 impressions) sont développés en articles de fond. Repurposing dans les deux sens.
3. **E-E-A-T LinkedIn** : quand Laurent googlise un fondateur, trouver ses articles de blog en résultats Google renforce l'autorité perçue — effet cumulatif avec les posts LinkedIn.
4. **Batch production** : même session IA pour générer 4 posts LinkedIn + 2 articles blog par mois. Coût marginal quasi nul une fois le pipeline en place.

---

## 6. KPIs blog (Umami)

**KPI 1 — Trafic organique blog** : sessions/mois sur les URLs /blog/* provenant du canal "organic search". Cible M+6 : 200 sessions/mois. Seuil d'alerte : < 50 sessions/mois à M+9 = revoir la stratégie mots-clés.

**KPI 2 — Taux de conversion article → page transactionnelle** : % de sessions blog qui visitent /vendre ou /nos-biens dans la même session. Cible : > 15%. Mesure Umami : funnel event "blog_cta_click". Seuil d'alerte : < 8% = CTA trop faibles ou mauvais matching intention/article.

**KPI 3 — Articles en position 1-10 Google** : nombre d'articles classés sur leurs mots-clés cibles (via Google Search Console, gratuit). Cible M+9 : 3 articles en top 10. Seuil d'alerte : 0 article en top 20 à M+9 = problème technique (SPA, indexation) ou concurrence trop forte sur les mots-clés choisis.

---

## 7. Risques et mitigations

**Risque 1 — Production abandonnée.** Le blog démarré manuellement et abandonné après 3 articles est pire qu'aucun blog (signal de négligence pour Laurent qui le lit). Mitigation : ne pas lancer sans pipeline IA validé et fonctionnel. Engagement minimum = 1 article/mois automatisé, pas 2 articles/semaine manuels.

**Risque 2 — Mots-clés trop concurrentiels.** "Acheter appartement Lille" = DA > 50 en concurrence, hors de portée sans autorité de domaine. Mitigation : cibler exclusivement la longue traîne géo-sectorielle ("marchand de biens immeuble rénover Nord", "vendre bien dégradé Hauts-de-France") — volume faible (50-200 req/mois) mais intention forte et concurrence faible.

**Risque 3 — Confusion de marque versi.fr vs versi-immobilier.fr.** Si le blog vit sur versi.fr (holding), les articles "acheter appartement Lille" créent un signal confus — Laurent arrive sur un article grand public et ne comprend plus si c'est une holding ou une agence. Mitigation : le blog opérationnel va sur versi-immobilier.fr (entité opérationnelle), versi.fr reste institutionnel sans blog.

---

## 8. Recommandation finale

**Fréquence** : 1 article/mois minimum, 2 maximum. La qualité prime sur le volume — 12 articles ciblés en 12 mois valent plus que 48 articles génériques.

**Format** : articles de 800-1200 mots, format "terrain + méthode" (ex : "Comment on a sourcé un immeuble dégradé à Roubaix — et pourquoi les chiffres tenaient"). Titre orienté longue traîne, contenu ancré dans l'opérationnel Versi. Pas de "guide ultime" générique copiable par un concurrent.

**Pipeline IA** :
1. Thomas brief en 10 lignes une opération réelle (anonymisée si nécessaire)
2. Claude génère l'article (template calibré brand-voice Versi — "confiant, direct, zéro bullshit")
3. Validation Carl ou Maxime (15 min) — vérification des chiffres et de la conformité opérationnelle
4. Publication sur versi-immobilier.fr (section /blog ou /terrain)
5. Repurposing automatique : 1 article → 1 post LinkedIn par fondateur (généré dans la même session)

**Distribution** : LinkedIn (post fondateur) + email aux prescripteurs actifs (Pierre) quand un article est particulièrement pertinent pour leur réseau. Pas de newsletter mensuelle en V1 — trop de maintenance pour trop peu d'abonnés au démarrage.

**Lancement** : ne pas lancer le blog avant que versi-immobilier.fr soit live et indexé. Lancer avec 3 articles déjà publiés (pas un blog vide) — le premier visiteur doit trouver de la substance.

---

**Handoff → @seo**
- Fichiers produits : `/home/user/Versi/docs/growth/vi-blog-growth-assessment.md`
- Décisions prises : GO conditionnel sur le blog pour versi-immobilier.fr (entité opérationnelle), pas versi.fr (holding). Fréquence 1-2 articles/mois. Pipeline IA obligatoire avant lancement. KPIs définis pour Umami + GSC.
- Points d'attention : valider la liste de mots-clés longue traîne géo-sectorielle (volume 50-200 req/mois, intention forte, concurrence faible) — la keyword map actuelle (docs/seo/keyword-map.md) est orientée versi.fr holding, elle devra être étendue pour versi-immobilier.fr. Architecture blog séparée de /vendre et /nos-biens obligatoire pour éviter la cannibalisation.
