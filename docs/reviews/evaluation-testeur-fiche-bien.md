# Évaluation testeur-persona Kévin — Fiche bien PropertyDetailPage

**Date** : 2026-04-10
**Livrable évalué** : `versi-immobilier/src/pages/PropertyDetailPage.jsx` + `versi-immobilier/src/config/properties.js`
**Bien de référence** : Appartement T3 rénové — Lille, 185 000 €

---

## Note globale : 5/10

---

### Verdicts

| # | Gate | Verdict | Justification Kévin |
|---|---|---|---|
| GP1 | Compréhension immédiate | PASS | "T3, 68 m², 185 000 €, Libre, 2e étage — je lis ça en 5 secondes. Le format est clair, les infos clés sont en haut de page. Pas de problème là-dessus." |
| GP2 | Infos complètes | FAIL | "La description dit 'séjour lumineux de 25 m²' mais rien sur les surfaces des chambres. Je sais que c'est Libre, mais rien sur les charges de copropriété, les charges mensuelles, la taxe foncière. Cave et parking c'est bien, mais c'est où ? Intérieur ou extérieur ? Et il manque les features dans la fiche — le tableau affiche Type, Surface, Pièces, DPE, Étage, État locatif, mais les features comme 'Double vitrage' ou 'Digicode' ne s'affichent nulle part dans la page. Elles sont dans les données mais pas rendues dans le JSX." |
| GP3 | Crédibilité | FAIL | "Les travaux réalisés sont listés — ça c'est bien, j'apprécie. Mais les diagnostics ? 'Disponible sur demande' — non. Je veux voir le DPE affiché (j'ai 'D' dans les données, mais aucune explication sur ce que ça implique pour mes futures charges). Et quand ont été réalisés ces travaux ? 2023 ? 2019 ? Ça change tout pour moi. Pas de date de rénovation = je me demande si c'est du bricolage récent ou une vraie réno." |
| GP4 | Parcours fluide | PASS | "Le bouton 'Demander une visite' est bien visible, en sticky à droite, sombre sur fond sombre — je le vois. Il y a aussi 'Nous écrire' en dessous. Je sais quoi faire. Le lien ← Nos biens est là si je veux comparer." |
| GP5 | Prix clair | FAIL | "185 000 € affiché clairement — OK. Mais c'est net vendeur ? Frais d'agence inclus ou en sus ? Je vois que Versi est marchand de biens, pas agence. Alors c'est FAI (frais d'achat inclus) ou pas ? Et les frais de notaire, c'est en sus ? Je connais la règle — environ 8% sur l'ancien — mais la page ne dit rien. Pour mon budget à 190-210k€, savoir si c'est 185k + 14 800 € de notaire = 199 800 € total, ça change ma décision. Zero mention de cette réalité." |
| GP6 | Emplacement | FAIL | "C'est le trou noir de cette page. 'Lille, Hauts-de-France' — c'est tout. Lille c'est une ville entière. Lille-centre ? Wazemmes ? Vieux-Lille ? Moulins ? Pour nous c'est crucial : on regarde les écoles pour notre enfant, le temps de trajet jusqu'à mon boulot, les commerces. Il n'y a pas de carte, pas de quartier, pas de rue, pas de code postal. Le fondateur avait raison : cette sous-section EMPLACEMENT est le manque le plus criant. Je peux pas demander une visite sur un bien dont je sais pas où il est vraiment." |
| GP7 | Conviction | FAIL | "Honnêtement ? Non. Je vois un bien qui me plaît sur le papier, les travaux sont listés, le prix est dans mon budget. Mais sans savoir le quartier exact, sans les charges, sans les frais totaux, sans les diagnostics disponibles — je vais d'abord envoyer un email pour poser 4 questions avant de me déplacer. La page ne convertit pas, elle crée des questions. Un acheteur sérieux veut TOUT sur la page, pas avoir à demander." |
| GP8 | Look & feel | PASS | "La mise en page est propre, la grille description + card CTA fonctionne bien, la typographie est lisible. La card prix en fond sombre fait sérieux. Ce n'est pas cheap. Pour un marchand de biens qui vend du rénové, ça donne une impression de travail soigné — cohérent avec le produit vendu." |

---

### Ce qui fonctionne

- **Les infos clés en haut** : type, surface, pièces, DPE, étage, état locatif — format lisible, pas besoin de chercher
- **La liste des travaux réalisés** : c'est ce qui me rassure le plus. Je vois qu'il y a eu une vraie rénovation (électricité, salle de bains, cuisine, parquet). C'est concret, lisible, en grille 2 colonnes
- **La card CTA sticky** : le bouton "Demander une visite" reste visible en scrollant, bien positionné, action claire
- **La description du bien** : "séjour lumineux de 25 m², cuisine équipée ouverte, deux chambres, salle de bains refaite à neuf, cave et place de stationnement" — c'est précis et donne une image mentale
- **La section biens similaires** : utile pour comparer sans repartir à zéro

---

### Ce qui manque pour 10/10

1. **Emplacement précis** (BLOQUANT) — quartier, proximité transports/écoles, idéalement une carte ou un lien Maps. "Lille, Hauts-de-France" ne suffit pas
2. **Frais de notaire + coût total** — afficher "soit environ X € frais de notaire inclus" ou "prix net vendeur, frais de notaire en sus (~8%)" pour que je calcule mon budget réel
3. **Clarification FAI ou net vendeur** — une ligne dans la card CTA : "Prix net vendeur — frais de notaire en sus"
4. **Date des travaux** — "Rénovation réalisée en 2024" rassure infiniment plus que "travaux réalisés" sans date
5. **Les diagnostics consultables en ligne** — pas "sur demande" : lien PDF ou bouton télécharger. Le DPE D doit être expliqué (estimation charges énergétiques annuelles)
6. **Les features du bien non rendues** — 'Parquet massif', 'Double vitrage', 'Cave', 'Cuisine équipée', 'Digicode' sont dans les données `properties.js` (champ `features`) mais le JSX ne les affiche pas. Une ligne "Équipements : ..." ou une liste iconographiée simple
7. **Charges copropriété** — même approximatives : "Charges mensuelles : ~120 €/mois" est une info décisive pour un acheteur
8. **Surfaces détaillées** — 68 m² c'est bien, mais séjour 25 m², chambre 1 : X m², chambre 2 : X m²
9. **Formulaire de visite contextualisé** — le lien renvoie vers `/contact?bien=...` mais ce serait mieux d'avoir un mini-formulaire inline ou une modale : "Vos disponibilités pour une visite" avec 2-3 créneaux. Sinon je tombe sur une page contact générique

---

### Recommandations

**1. Sous-section EMPLACEMENT — ajouter dans le JSX entre la description et les travaux**

```
## L'emplacement.
Quartier [Nom du quartier], à [X min] du centre de Lille.
À [X min à pied] du métro [Station]. Écoles primaires et collèges à [distance].
[Carte Google Maps embed ou lien "Voir sur Google Maps"]
```

Structure dans `properties.js` à ajouter : champ `neighborhood` (ex: "Wazemmes"), `nearbyTransport` (ex: "Métro Gambetta — 5 min à pied"), `nearbySchools` (ex: "École primaire Jules Ferry — 300 m").

**2. Card CTA — clarifier le prix**

Sous le prix 185 000 €, ajouter en texte muted :
```
Prix net vendeur — frais de notaire en sus (estimés ~14 800 €)
Soit un budget total estimé à 199 800 €
```

**3. Date des travaux — ajouter dans properties.js**

Ajouter un champ `renovationYear: 2024` et l'afficher dans la section travaux :
```
Les travaux réalisés. (Rénovation 2024)
```

**4. Features — rendre le champ `features` dans le JSX**

Après la liste des travaux, ajouter :
```jsx
{property.features && property.features.length > 0 && (
  <div>
    <h2>Équipements.</h2>
    <ul>
      {property.features.map(f => <li key={f}>{f}</li>)}
    </ul>
  </div>
)}
```

**5. Diagnostics — lien ou PDF**

Remplacer "Disponible sur demande" par :
```
DPE : D — Consommation estimée entre 230 et 280 kWh/m²/an, soit ~1 500-1 900 €/an de charges énergétiques.
[Télécharger le dossier de diagnostics complet (PDF)]
```
Si pas de PDF dispo, au minimum : "DPE D — Diagnostics transmis sur simple demande via le formulaire de visite."

**6. Charges copropriété — ajouter dans properties.js**

Champ `charges` (ex: `"~150 €/mois charges comprises"`). Afficher dans les infos clés avec les autres données (Type, Surface, etc.).

---

### Handoff → @orchestrator

- **Évaluation produite** : rapport GP1-GP8 sur `PropertyDetailPage.jsx` + `properties.js` (fiche bien T3 Lille 185k€)
- **Verdict** : NO-GO — 3 gates BLOQUANT FAIL (GP2, GP6, GP7) + 2 gates REQUIS FAIL (GP3, GP5)
- **Note globale** : 5/10
- **Gates FAIL** :
  - GP2 FAIL — Infos incomplètes : features non rendues dans le JSX, surfaces des pièces absentes, charges absentes
  - GP3 FAIL — Crédibilité insuffisante : diagnostics "sur demande" sans DPE expliqué, date de rénovation absente
  - GP5 FAIL — Prix ambigu : pas de mention frais de notaire, pas de clarification net vendeur / FAI
  - GP6 FAIL — Emplacement absent : "Lille, Hauts-de-France" insuffisant, pas de quartier, pas de carte, pas de transports
  - GP7 FAIL — La page crée des questions au lieu de convertir : sans emplacement et sans coût total, l'acheteur sérieux envoie un email de questions avant de demander une visite
- **Agents à relancer** :
  - @fullstack — rendre le champ `features`, ajouter la sous-section EMPLACEMENT dans le JSX, afficher les charges dans la grille infos
  - @copywriter — rédiger les textes EMPLACEMENT pour chaque bien, clarifier le message prix (net vendeur + frais notaire estimés)
  - @fullstack ou orchestrateur — enrichir `properties.js` avec les champs manquants : `neighborhood`, `nearbyTransport`, `nearbySchools`, `renovationYear`, `charges`, `roomSurfaces`
- **Points d'attention pour les agents correcteurs** :
  - Le champ `features` existe déjà dans `properties.js` mais n'est pas rendu dans `PropertyDetailPage.jsx` — correction rapide, pas de restructuration
  - L'emplacement est LE manque signalé par le fondateur et confirmé comme BLOQUANT par ce test — traiter en priorité 1
  - La clarification du prix (net vendeur vs FAI, frais de notaire) doit être résolue avec le fondateur avant implémentation — décision métier, pas seulement copy
  - Ne pas ajouter de données inventées pour `neighborhood` et `nearbyTransport` — demander les vraies données au fondateur ou marquer `[HYPOTHÈSE]`
