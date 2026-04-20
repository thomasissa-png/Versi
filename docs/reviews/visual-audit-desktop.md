# Audit visuel desktop — versi.fr (1280px)
Date : 2026-04-08 | Agent : @design | Screenshots Playwright post-correction scroll

## Note globale : 8/10

Site visuellement cohérent, direction artistique tenue de bout en bout. Le rythme
alternance fonds noirs / fonds sable fonctionne. Les bugs restants sont mineurs et
corrigeables en moins d'une heure.

---

## Section par section

### Navigation — 9/10
Logo "VERSI" uppercase, nav équilibrée, CTA "NOUS CONTACTER" rectangle border. Indicateur
de page active (underline) visible et fonctionnel. Transition fond noir/fond clair selon
contexte section = propre. Aucun bug.

### Hero — 8/10
Fond #0B0B0B pur, tagline "QUATRE MÉTIERS. UN CYCLE MAÎTRISÉ." en 2 lignes majuscules,
espacement lettre généreux. Eyebrow "OPÉRATEUR IMMOBILIER INTÉGRÉ — FRANCE" bien
dimensionné. Séparateur horizontal court, discret, bien placé. 2 CTAs hiérarchisés
(bouton border blanc + lien texte secondaire "NOUS CONTACTER →").
Bug mineur : le corps de texte sous le titre (sous-titre) semble légèrement petit — la
hiérarchie titre/corps est correcte mais l'espace entre le H1 et les CTAs paraît comprimé.

### Mission — 8/10
Fond sable #F7F5F2. Layout 2 colonnes : H2 "NOUS NE DÉLÉGUONS PAS. NOUS DÉCIDONS."
à gauche (majuscules, bonne taille), corps de texte lisible. Colonne droite : 3 chiffres
clés (35+, 5, 4) avec labels uppercase espacés — hiérarchie chiffre/label très lisible.
Bug mineur : la séparation visuelle entre H2 et corps de texte est propre mais le saut
de ligne entre les 3 stats pourrait être plus aéré (actuellement les 3 stacks sont proches).

### Activités — 8/10
Fond blanc cassé. H2 "UNE HOLDING. QUATRE ENTITÉS." lisible. Grille 4 colonnes conforme :
VERSI IMMOBILIER / VERSI INVEST / VERSI CAPITAL / VERSI FINANCE — toutes les 4 cartes
rendues et lisibles. Eyebrow de catégorie en uppercase, titre en gras, corps de texte
complet. Gutters entre cartes correctement espacés.
Bug mineur : les cartes n'ont pas de hauteur uniforme — la carte VERSI INVEST est plus
courte visuellement que VERSI IMMOBILIER. Soit aligner les heights sur la carte la plus
haute (align-items: stretch), soit accepter le flush naturel. Choix intentionnel à confirmer.

### Approche — 9/10
Fond #0B0B0B. H2 "QUATRE ÉTAPES. AUCUNE DÉLÉGATION." — fort, contrasté, juste.
Sous-titre lisible. Grille 4 colonnes : 01 SOURCER / 02 ANALYSER / 03 TRANSFORMER /
04 OPÉRER — tous présents, numéros graphiques grands (64px estimé) en gris clair,
labels en blanc, corps de texte en gris clair. Hiérarchie numéro/label/corps solide.
Aucun bug bloquant. Section la plus réussie visuellement.

### Implantation — 7/10
Fond sable #F7F5F2. H2 "PARIS. LILLE. ET LES MÉTROPOLES FRANÇAISES." layout 2 colonnes :
texte gauche + SVG carte France droite. SVG rendu avec points ville (Lille, Paris).
Légende présente (Présence active / Zone d'extension). Corps de texte lisible.
Bug notable : la carte SVG paraît petite par rapport à l'espace disponible — elle occupe
environ 40% de la colonne droite alors qu'elle pourrait prendre 70-80%. Le blanc autour
du SVG crée une impression de "carte oubliée". Correction : augmenter la taille du SVG
ou réduire son padding conteneur. Le ratio texte/carte penche trop vers le texte.

### Équipe — 8/10
Fond sable. H2 "TROIS ASSOCIÉS. ZÉRO POSTURE." propre, sous-titre présent. 3 cartes
fondateurs en grille 3 colonnes, photos carrées grand format, nom en bold uppercase,
titre CO-FONDATEUR en uppercase petit, bio en 2 temps (lignes clés en bold + contexte
clients en corps), icône LinkedIn présente. Crédibilité OK pour Laurent.
Bug mineur : la photo de Carl (colonne 1) a un cadrage serré sur fond bleu vif qui tranche
avec la tonalité globale du site (noir/sable). La photo de Thomas (colonne 3) est en noir
et blanc contrasté — plus cohérente avec le reste. Recommander recadrage/retraitement de
la photo Carl pour harmoniser le registre photographique.
Bug secondaire : les hauteurs de cartes ne sont pas uniformes entre les 3 colonnes — la
bio de Carl est plus longue, sa carte déborde légèrement. Ajouter min-height ou normaliser
les bios à longueur équivalente.

### Contact — 8/10
Fond #0B0B0B. H2 "UN PROJET. UN ACTIF. NOUS RÉPONDONS." lisible, corps de texte +
email contact@versi.fr présents. Formulaire complet : NOM, EMAIL, TÉLÉPHONE, MESSAGE +
bouton TRANSMETTRE. Mention RGPD en bas (texte très petit mais présent).
Bug mineur : le bouton TRANSMETTRE est blanc sur fond sombre, taille correcte, mais il
manque de contraste visuel d'appel à l'action — il se fond presque dans la page. Envisager
une couleur d'accent ou un traitement plus affirmé. Texte RGPD illisible (~9px estimé,
contraste insuffisant sur fond sombre) — besoin de `font-size: 11px min` et `opacity: 0.6
→ 0.8`.

---

## Bugs récapitulatifs

| # | Section | Bug | Priorité | Correction |
|---|---------|-----|----------|-----------|
| B1 | Équipe | Photo Carl — tonalité couleur incohérente | Majeur | Retraitement photo (désaturation ou recadrage) |
| B2 | Implantation | SVG carte trop petite dans son conteneur | Majeur | `width: 70-80%` sur le conteneur SVG |
| B3 | Équipe | Hauteurs de cartes inégales | Mineur | `align-items: stretch` sur la grille |
| B4 | Activités | Hauteurs de cartes inégales (4 colonnes) | Mineur | `align-items: stretch` sur la grille |
| B5 | Contact | Texte RGPD trop petit/faible contraste | Mineur | `font-size: 11px`, `color: #9A9589` |
| B6 | Hero | Espacement H1/CTA un peu serré | Mineur | Ajouter `mt-8` ou `gap-8` entre bloc texte et CTAs |

---

## Résumé

Site à 8/10 — direction artistique tenue, rythme sombre/clair efficace, hiérarchie
typographique cohérente. Les seuls correctifs urgents sont visuels (photo Carl, carte SVG
sous-dimensionnée) — aucun bug de contenu masqué, aucun bloquant de crédibilité.

---

**Handoff → @fullstack**
- Fichier produit : `docs/reviews/visual-audit-desktop.md`
- Corrections prioritaires : B1 (photo Carl) et B2 (taille SVG carte) — impact visuel direct
- B3 à B6 : corrections CSS mineures, moins d'1h au total
- Après corrections : re-screenshot Équipe + Implantation pour validation
