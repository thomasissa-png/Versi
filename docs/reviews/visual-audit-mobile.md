# Audit visuel mobile — Versi (375px / iPhone 13)
Date : 2026-04-08 | Auditeur : @design | Screenshots : tests/screenshots/mobile-*.png

---

## Note globale mobile : 7.5/10

Le site est propre, l'identité visuelle tient sur mobile : fond noir, typographie serif majuscule, espacement généreux dans les sections structurantes. Les bugs de l'itération précédente (sections vides, formulaire cassé) sont résolus. Il reste 5 problèmes de finition correctibles en une session. Laurent ne ferme pas l'onglet — mais les photos équipe hétérogènes et la carte illisible lui coûtent de la confiance au deuxième scroll.

---

## Section par section

### Navigation — 8/10
Logo VERSI lisible à gauche, hamburger (3 lignes) visible à droite, contraste excellent sur fond noir. Aucun débordement horizontal visible.
Point à corriger : vérifier que la navbar sticky n'overlap pas les ancres lors de la navigation interne (`scroll-margin-top` probablement manquant).

### Hero — 8.5/10
Titre display "QUATRE MÉTIERS. UN CYCLE MAÎTRISÉE." : grande taille, contraste blanc/noir excellent, accrocheur en 2 secondes. Sous-titre en corps lisible. CTA "NOTRE APPROCHE" pleine largeur, hauteur estimée ~52px — touch target conforme. Lien secondaire "NOUS CONTACTER →" visible sous le CTA. Le Hero occupe visuellement le viewport sans scroller — objectif atteint.
Bug mineur : surtitle "OPÉRATEUR IMMOBILIER INTÉGRÉ — FRANCE" estimé à ~11px uppercase — borderline WCAG AA. À vérifier sur fond #0a0a0a. La zone noire sous le CTA (avant le fold suivant) crée un léger vide — CTA peut remonter de 16px.

### Mission / Vision — 7.5/10
Titre "NOUS NE DÉLÉGUONS PAS. NOUS DÉCIDONS." impactant, taille correcte. Corps de texte dense mais lisible. Les 3 stats (35+, 5, 4) en grille 3 colonnes fonctionnent bien.
Bug modéré : les labels sous les chiffres ("ACTIFS GÉRÉS EN DIRECT", "IMMEUBLES EN PORTEFEUILLE", "MÉTIERS INTÉGRÉS") sont en très petits caractères uppercase (~10-11px) — illisibles sur écrans non-retina. Spacing entre les stats et le corps de texte précédent trop serré.

### Activités — 7/10
Titre "UNE HOLDING. QUATRE ENTITÉS." lisible. Les 4 entités empilées en 1 colonne avec surtitles, noms d'entités et descriptions — structure correcte.
Bug modéré : aucune séparation visuelle forte entre les 4 cards. Sur fond blanc uniforme, tout se confond dans un flux de texte. Laurent ne distingue pas immédiatement les 4 entités au scroll rapide. Un border-bottom ou un padding-bottom xxxl entre cards résoudrait cela.

### Approche — 8/10
Numéros 01-04 en grand sur fond sombre : hiérarchie visuelle efficace sur mobile. Titres des étapes (SOURCER, ANALYSER, TRANSFORMER, OPÉRER) lisibles et bien dimensionnés. Descriptions courtes — bonne densité pour le pouce.
Bug mineur : le spacing entre les 4 étapes est trop serré sur 375px — les blocs s'enchaînent sans respiration suffisante.

### Implantation — 5/10
Titre "PARIS. LILLE. ET LES MÉTROPOLES FRANÇAISES." lisible. Corps de texte correct.
Bugs : (1) La carte de France n'occupe qu'environ 50% de la largeur disponible — centrée sur fond clair, elle paraît minuscule. (2) Les labels "PARIS" et "LILLE" sur la carte sont illisibles sans zoom — environ 8-9px estimé. (3) La légende (point orange = présence active) a un indicateur visuel d'environ 10px — trop petit. (4) La section semble coupée — on ne voit pas distinctement le bas de la carte. Section la plus faible visuellement — fait cheap par rapport au reste.

### Équipe — 6.5/10
Titre "TROIS ASSOCIÉS. ZÉRO POSTURE." impactant. Les 3 fondateurs s'affichent en 1 colonne avec photo + nom + titre + biographie.
Bugs : (1) Cadrage photos hétérogène : Carl recadré au niveau du cou (tête coupée au sommet), Maxime en plan moyen décontracté, Thomas en plan large avec espace vide autour. Rendu non-institutionnel pour un site B2B immobilier premium. (2) Biographies denses (~5-6 lignes chacune) — bloc de texte compact difficile à lire sur mobile. (3) Icône LinkedIn sous chaque profil estimée à ~24px — touch target non conforme (< 44px).

### Contact — 8/10
Titre "UN PROJET. UN ACTIF. NOUS RÉPONDONS." efficace. Email contact@versi.fr visible. Formulaire 4 champs (NOM / EMAIL / TÉLÉPHONE OPTIONNEL / MESSAGE) + bouton TRANSMETTRE pleine largeur (~52px hauteur). Structure solide.
Bugs : (1) Labels de champs en uppercase très petit (~11px) — borderline lisibilité. (2) Les inputs : vérifier que `font-size: 16px` est appliqué pour éviter le zoom iOS Safari automatique au tap (bug UX majeur iOS si manquant). (3) Email contact@versi.fr non stylé comme lien cliquable — opportunité manquée. (4) Mention RGPD en bas en ~11px gris — limite de lisibilité légale.

---

## Bugs bloquants MOBILE (par ordre de criticité)

| # | Sévérité | Section | Bug | Impact Laurent |
|---|---|---|---|---|
| B1 | BLOQUANT | Contact | Input `font-size` probablement < 16px → zoom iOS Safari automatique au tap | Friction immédiate, impression d'amateurisme |
| B2 | MAJEUR | Équipe | Cadrage photos hétérogène, non-institutionnel | "Ces gens ne se présentent pas sérieusement" |
| B3 | MAJEUR | Implantation | Carte trop petite (~50% largeur), labels villes illisibles | Section visuellement inutile |
| B4 | MAJEUR | Équipe | Touch target LinkedIn ~24px (< 44px requis) | Inaccessible au pouce |
| B5 | MODÉRÉ | Activités | Aucune séparation visuelle entre les 4 entités | Scannabilité nulle au scroll rapide |
| B6 | MODÉRÉ | Mission | Labels stats chiffres ~11px uppercase | Lisibilité dégradée sur écran standard |
| B7 | MINEUR | Navbar | `scroll-margin-top` absent probable sur ancres | Navigation interne décalée |

---

## Corrections CSS prioritaires

**B1 — iOS zoom inputs (P0 — corriger en priorité absolue)**
Fichier : composant ContactForm
```css
@media (max-width: 768px) {
  .form-input,
  .form-textarea,
  .form-select {
    font-size: 16px; /* obligatoire — iOS Safari zoome si < 16px */
    min-height: 44px;
  }
  .form-textarea {
    min-height: 120px;
  }
  .form-label {
    font-size: 13px;
    letter-spacing: 0.05em;
  }
}
```

**B3 — Carte implantation trop petite**
Fichier : composant Implantation / MapSection
```css
@media (max-width: 768px) {
  .map-container {
    width: 100%;
    max-width: 340px;
    margin: 0 auto;
  }
  .map-legend-item {
    font-size: 13px;
  }
}
```

**B4 — Touch target LinkedIn**
Fichier : composant TeamCard
```css
@media (max-width: 768px) {
  .team-linkedin-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    padding: 8px;
  }
}
```

**B5 — Séparation entités Activités**
Fichier : composant Activites / EntityCard
```css
@media (max-width: 768px) {
  .entity-card {
    border-bottom: 1px solid rgba(0,0,0,0.08);
    padding-bottom: 32px;
    margin-bottom: 32px;
  }
  .entity-card:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }
}
```

**B6 — Labels stats trop petits**
Fichier : composant Mission / StatsRow
```css
@media (max-width: 768px) {
  .stats-label {
    font-size: 12px; /* minimum absolu */
    line-height: 1.4;
  }
}
```

**B7 — scroll-margin-top ancres**
Fichier : CSS global
```css
section[id] {
  scroll-margin-top: 72px; /* hauteur navbar estimée */
}
```

**B2 — Photos équipe (correction éditoriale, pas CSS)**
Note : aucun CSS ne corrige un mauvais cadrage à la source. Les 3 photos doivent être recadrées en format portrait 3:4 centré sur le visage (tiers supérieur de la composition). En attendant, CSS palliatif :
```css
@media (max-width: 768px) {
  .team-photo {
    aspect-ratio: 3 / 4;
    object-fit: cover;
    object-position: top center;
    width: 100%;
  }
}
```

---

## Test des 5 secondes — Verdict Laurent

Scroll 1 (Hero) : comprend immédiatement — "opérateur immobilier intégré, 4 métiers, France". Confiance : haute. Scroll 2 (Mission + stats) : 35 actifs, chiffres crédibles. Confiance : haute. Scroll 3 (Activités) : 4 entités lisibles mais se confondent au scroll rapide. Confiance : correcte. Scroll 4 (Équipe) : photos hétérogènes — une bonne, deux hasardeuses. Confiance : chute. Scroll 5 (Contact) : remplit le formulaire si convaincu — mais le zoom iOS au tap lui confirme "site pas fini". **Corriger B1 (iOS zoom) + B2 (photos) + B3 (carte) = site qui passe de 7.5/10 à 9/10 et ne rougit plus face à Laurent.**

---

**Handoff → @fullstack**
- Fichier produit : `docs/reviews/visual-audit-mobile.md`
- Corrections dans l'ordre : B1 `font-size: 16px` inputs iOS (P0), B4 touch target LinkedIn, B3 carte pleine largeur, B5 séparation entités, B6 labels stats, B7 scroll-margin-top
- Correction éditoriale hors-CSS : recadrer les 3 photos fondateurs en portrait 3:4 centré visage — à traiter avec les fondateurs
- Point d'attention : B1 (iOS zoom) est un bug UX P0 — Laurent remplit le formulaire sur iPhone, le zoom automatique au tap = signal d'amateurisme immédiat
