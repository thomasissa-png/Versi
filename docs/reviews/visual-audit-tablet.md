# Audit visuel tablette — Versi (768px)
Date : 2026-04-08 | Agent : @design

## Note globale tablette : 7.5/10

Le site est lisible et cohérent à 768px. Les grilles passent bien en 2 colonnes. Les principaux défauts : nav surchargée (tous les liens en horizontal + CTA, tension à 768px), équipe coupée (nom Carl tronqué), implantation sous-utilisée (carte très petite, légende sans couleur visible), et hero avec trop de vide bas.

---

## Par section

**Navigation — 7/10**
Tous les liens + CTA sur une seule ligne à 768px. Fonctionne mais serré. Le CTA "NOUS CONTACTER" avec border reste lisible. Touch target CTA OK (~44px hauteur). Risque de débordement sur 768px bas de gamme.
Correction : réduire `font-size` nav à 12px sur md, ou passer à hamburger dès 768px.

**Hero — 7.5/10**
Centrage correct, typographie hiérarchisée. Le titre "QUATRE MÉTIERS. UN CYCLE MAÎTRISÉ." est lisible (~40px estimé). Espace blanc sous les CTAs excessif — scrolling vide avant le contenu suivant. Les deux boutons CTA sont bien dimensionnés (touch target OK).
Correction : `padding-bottom` hero à réduire — `py-20` → `py-12` sur md.

**Mission / Vision — 8.5/10**
Layout propre, texte bien proportionné. Les 3 statistiques (35+, 5, 4) en 3 colonnes avec séparateurs verticaux : bon choix, lisible. Légère compression du label "ACTIFS GÉRÉS EN DIRECT" sur 2 lignes — acceptable.

**Activités — 8/10**
Grille 2x2 bien construite, cartes symétriques. Texte descriptif dense mais lisible (~14px). Le lien "DÉTAILS →" en bas de chaque carte en majuscules, taille correcte. Bonne progression vers le contenu.

**Approche — 8/10**
4 étapes en 2x2 sur fond sombre. Les numéros (01-04) en très grand et en gris : bonne hiérarchie. Espacement entre les blocs cohérent. Titres en majuscules bien contrastés.

**Implantation — 6/10**
Bug majeur : la carte SVG de France est petite et centrée dans la moitié droite de l'écran, laissant un grand vide à gauche. La légende (Présence active / Zone d'extension) affiche des pastilles sans couleur visible — les points colorés ne sont pas distinguables en situation réelle. Le titre tient bien sur 3 lignes.
Correction :
```css
@media (min-width: 768px) {
  .implantation-map { width: 100%; max-width: 500px; margin: 0 auto; }
  .implantation-layout { flex-direction: column; }
}
```

**Équipe — 6.5/10**
Bug critique : le nom "CARL STANDERTSKJOLD NORDENSTAM" déborde et est tronqué visuellement dans la première carte. Les 3 photos sont bien proportionnées en 3 colonnes, touch targets LinkedIn OK.
Correction :
```css
.team-member-name { word-break: break-word; font-size: 13px; line-height: 1.3; }
```

**Contact — 8.5/10**
Formulaire pleine largeur, champs bien dimensionnés (hauteur ~44px, touch target correct). Bouton "TRANSMETTRE" OK. Fond sombre avec bon contraste sur les inputs. Mention RGPD lisible en bas.

---

## Bugs visuels prioritaires

| # | Section | Criticité | Correction CSS |
|---|---|---|---|
| 1 | Équipe | Majeur | `word-break: break-word` + `font-size: 13px` sur `.team-member-name` |
| 2 | Implantation | Majeur | Carte en `max-width: 500px; margin: 0 auto; width: 100%` sur md |
| 3 | Hero | Mineur | Réduire `padding-bottom` hero : `py-20 md:py-12` |
| 4 | Navigation | Mineur | `font-size: 12px` sur liens nav à 768px ou hamburger dès md |

---

## Résumé

La tablette est solide dans l'ensemble — grilles 2 colonnes fonctionnelles, typographie lisible, hiérarchie visuelle respectée — mais deux bugs d'affichage (nom tronqué section Équipe, carte trop petite section Implantation) nuisent à la crédibilité perçue par Laurent.
