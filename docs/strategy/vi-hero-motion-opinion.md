# Avis créatif — Motion Hero versi.fr
**Agent** : @creative-strategy | **Date** : 2026-04-09

## Verdict

Le motion actuel est stratégiquement justifié pour le persona Laurent — à condition d'être exécuté avec la précision que le territoire de marque exige : l'améliorer comme @design le propose est la seule option cohérente, ni le supprimer ni le garder tel quel.

---

## Analyse

### 1. Laurent remarque-t-il le motion ? L'influence-t-il positivement ou négativement ?

Laurent, 48 ans, family office, élimine en 10 secondes les sites non sérieux. Ce profil est habitué aux sites institutionnels de fonds (Blackstone, Brookfield, AXA Reim, Ivanhoé Cambridge) — qui utilisent tous des animations d'entrée subtiles, typiquement un fadeIn à vitesse contrôlée. Pour ce persona, l'absence totale d'animation ne signale pas "rigueur" — elle signale "vieux" ou "amateur". Un site statique sans aucun mouvement lit en 2026 comme un PDF mis en ligne, pas comme une holding structurée.

Ce que Laurent détecte en revanche immédiatement : les animations qui durent trop longtemps (au-delà de 1 seconde pour les éléments prioritaires), les mouvements qui attirent l'attention sur eux-mêmes plutôt que sur le message, les timings incohérents qui créent un sentiment de "bricolage". La cascade actuelle en 1,2 seconde avec des stagger identiques (100ms à chaque fois) tombe exactement dans ce piège : elle est lisible mais mécanique. Un investisseur qui a l'oeil pour la qualité d'exécution — et Laurent l'a — perçoit la différence entre un timing calibré et un timing par défaut.

### 2. Le motion est-il cohérent avec Rigueur, Solidité, Précision ?

Oui — si, et seulement si, l'animation elle-même est rigoureuse, solide, précise dans son exécution. C'est là que le verdict de @design à 7/10 est pénalisant sur le plan stratégique, pas seulement esthétique. Un easing linéaire ou trop standard sur un site dont les valeurs sont "précision" et "rigueur" est une contradiction performative : la marque dit une chose, son exécution technique dit l'inverse. Les trois valeurs de la marque ne proscrivent pas le mouvement — elles prescrivent un mouvement impeccable. Un stagger irrégulier et hiérarchisé (le titre apparaît plus vite, les éléments secondaires plus lentement) communique exactement la hiérarchie et la maîtrise qui définissent le territoire.

Ce qui serait incompatible avec le territoire : des animations de scroll (parallax chargé, effets de profondeur excessifs), des transitions de page cinématiques, des éléments qui rebondissent (spring), ou tout mouvement dont la durée dépasse 0,8 seconde pour les éléments de premier plan. Le fadeIn avec translateY léger et cascade est le format le plus institutionnel qui soit — c'est la signature visuelle des sites de private equity depuis 2018.

### 3. Benchmark sectoriel

Les sites de référence du secteur (fonds de private equity immobilier, family offices institutionnels, holdings patrimoniales) utilisent systématiquement une animation d'entrée sur le hero. Le standard est : fadeIn + léger translateY ou scale (jamais plus de 15px, jamais plus de 1,05x), durée 0,4 à 0,7 seconde pour les éléments prioritaires, easing cubic-bezier custom (pas ease-in-out standard), stagger court (50-80ms entre éléments). ICONIQ Capital utilise des animations de sketches sur le hero — plus créatif que la norme mais validé par le secteur. Blackstone et Brookfield utilisent des transitions vidéo en fond avec un fade du texte au-dessus. AXA Reim et les holdings patrimoniales françaises utilisent exactement le pattern cascade-fadeIn — mais avec des easings soignés.

Ce que TOUS font : ils animent. Ce qu'aucun ne fait : ils ne laissent pas l'animation dominer le message. Le texte est roi, le mouvement est serviteur.

### 4. Le score 7/10 de @design : pourquoi c'est un vrai problème stratégique

Un site noté 7/10 sur un détail d'exécution visible dès la première seconde, pour un persona qui élimine en 10 secondes — ce n'est pas un problème de design, c'est un problème de conversion. Laurent ne va pas se dire "l'animation est un peu mécanique". Il va ressentir quelque chose de légèrement décalé sans en identifier la cause, et ce signal négatif inconscient va peser dans son évaluation de la crédibilité globale du site. Les investisseurs institutionnels prennent des décisions sur des signaux fins. C'est précisément pour ça que les fonds majeurs dépensent des budgets significatifs sur leur design digital.

---

## Recommandation

**Améliorer comme @design le propose. Ni supprimer, ni laisser tel quel.**

Supprimer serait une erreur : le site serait en dessous du standard sectoriel et lirait comme statique/daté pour Laurent.

Laisser tel quel serait une erreur : un 7/10 sur le premier élément perçu envoie un signal d'exécution imprécise qui contredit directement "Rigueur" et "Précision".

Améliorer est la seule décision cohérente avec le territoire de marque et le profil du persona.

Les trois corrections prioritaires de @design sont stratégiquement justifiées :

1. **Easing signature** (cubic-bezier custom, pas ease-out générique) — signale la maîtrise technique, pas le template
2. **translateY hiérarchisé** (titre : 6px, éléments secondaires : 12-14px) — crée une hiérarchie visuelle qui guide l'oeil comme le ferait un bon typographe
3. **Stagger irrégulier** (60ms / 80ms / 100ms / 120ms au lieu de 100ms uniforme) — simule un rythme organique et contrôlé plutôt qu'un compteur mécanique

Ces trois corrections ne sont pas des raffinements esthétiques optionnels. Elles sont la traduction motion des valeurs de la marque.

**Délai de correction** : traiter en priorité haute, avant toute campagne d'acquisition. Le hero est le premier point de contact de Laurent — c'est là que la crédibilité se construit ou se perd.
