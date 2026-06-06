// Seed script — 3 properties at 10 rue des Muguets, Lille
// Idempotent: uses ON CONFLICT DO UPDATE
import pg from 'pg';
import {
  LOT1_PLAN,
  LOT1_AVANT,
  LOT2_PLAN,
  LOT2_AVANT,
} from './dossier-images.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const PROPERTIES = [
  {
    id: 'muguets-lot-1-rdc',
    title: 'T2 de 47 m² avec espace extérieur privatif, rez-de-chaussée',
    city: 'Lille',
    location: 'Lille',
    neighborhood: 'Lille-Sud',
    address: '10 rue des Muguets, Lille',
    nearby_transport: 'Métro Oscar Lambret (ligne 1) à 10 minutes à pied (3 minutes en vélo). Lille Flandres à environ 10 minutes en métro, ligne 1 directe. CHU de Lille à proximité immédiate.',
    nearby_amenities: 'Écoles maternelles Florian et La Briqueterie, école élémentaire Turgot (rue du Faubourg des Postes), collège Louise Michel. Crèches municipales Marie Curie et Les P\'tits Minouches. Parc du Grand Sud (4 hectares). Centre commercial Lillenium (rue du Faubourg des Postes, une centaine d\'enseignes). CHU de Lille — Hôpital Roger Salengro dans le quartier (urgences adultes et pédiatriques).',
    type: 'Appartement',
    surface: '47 m²',
    rooms: 2,
    price: '118 000 €',
    price_num: 118000,
    price_note: 'Prix brut (avant travaux), hors frais de notaire. Option prêt à habiter : 145 000 €.',
    status: 'disponible',
    dpe: 'B',
    dpe_note: 'Classe visée au DPE projeté : B (71–110 kWh/m²/an, énergie primaire). DPE définitif établi à la livraison.',
    floor: 'RDC',
    tenancy: 'Libre',
    renovation_year: null,
    charges: '~ 60 €/mois (estimation indicative)',
    description: `C'est le seul appartement de l'immeuble avec un espace extérieur privatif : 10 m² de plain-pied avec le séjour, sans vis-à-vis. Rez-de-chaussée, accès direct.

Le séjour-cuisine de 26 m² est lumineux et ouvre sur l'extérieur sans marche, sans seuil. L'été, on pose la table dehors et on mange à l'air libre. L'hiver, la lumière traverse le séjour toute la journée. La chambre de 10,2 m² donne côté cour, au calme. Chauffage individuel, pas de charge d'ascenseur. Place de parking extérieur sécurisé (accès par double porte) comprise dans le prix.

L'immeuble est un ancien bâtiment de bureaux que Versi transforme en 3 logements de qualité. Finitions soignées : parquet contrecollé chêne, menuiseries double vitrage, salle d'eau carrelée grand format, cuisine pré-équipée. Deux formules : à 118 000 € vous achetez avant travaux et vous choisissez vos finitions, à 145 000 € on vous livre prêt à habiter. Permis déposé, début des travaux septembre 2026, livraison décembre 2026. Dommages-ouvrage et garantie décennale incluses.

Pour visiter ou recevoir le dossier complet du bien, contactez-nous.`,
    works: JSON.stringify([]),
    features: JSON.stringify([
      'Espace extérieur privatif 10 m², de plain-pied',
      'Séjour-cuisine 26 m² lumineux, ouvert sur l\'extérieur',
      'Chambre 10,2 m² côté cour',
      'Parquet chêne, menuiseries double vitrage',
      'Parking extérieur sécurisé (double porte)',
      'Pas de charges d\'ascenseur',
    ]),
    dossier: JSON.stringify({
      tagline: 'Lille · Lille-Sud (quartier des fleurs)',
      hook: 'T2 au rez-de-chaussée — extérieur privatif. Un séjour traversant qui s’ouvre de plain-pied sur 10 m² d’extérieur privatif. Une chambre au calme, en cœur de plan. Une place de parking sécurisée.',
      intro: 'Au rez-de-chaussée du 10 rue des Muguets — un ancien immeuble de bureaux que Versi réhabilite entièrement. Livraison décembre 2026.',
      ficheTechnique: [
        { label: 'Type', value: 'T2' },
        { label: 'Surface', value: '47 m²' },
        { label: 'Pièces', value: '2' },
        { label: 'Extérieur', value: '10 m² privatif' },
        { label: 'Étage', value: 'Rez-de-chaussée' },
        { label: 'Disponibilité', value: 'Déc. 2026' },
      ],
      leBien: 'Le bâtiment du 10 rue des Muguets a longtemps servi de bureaux. Son écriture contemporaine et sa parcelle traversante appelaient une seconde vie résidentielle. Versi Immobilier l’a acquis pour en faire trois logements, dessinés par le cabinet Avantpropos Architectes (Lille). Cet appartement occupe le rez-de-chaussée de l’immeuble. Le séjour-cuisine de 26 m² traverse la profondeur du bâti et ouvre de plain-pied sur l’extérieur privatif. La chambre de 10,2 m² est positionnée en cœur de plan, à l’abri du bruit. Salle d’eau de 5,9 m², entrée et couloir distribuant l’ensemble. L’accès se fait depuis le hall commun, par l’escalier de l’immeuble.',
      pourQui: 'Primo-accédant urbain ou investisseur attentif à l’extérieur et à l’accès direct : ce lot a été pensé pour vous. Une place de stationnement extérieure sécurisée est comprise dans le prix.',
      accroche: 'Un rez-de-chaussée traversant qui s’ouvre de plain-pied sur l’extérieur. Une rareté dans le secteur, à deux pas du métro.',
      planImage: LOT1_PLAN,
      planCaption: 'Plan d’architecte — RDC, échelle indicative 1/50. Cabinet Avantpropos Architectes.',
      surfaces: [
        { piece: 'Entrée', aire: '2,0 m²' },
        { piece: 'Couloir', aire: '3,2 m²' },
        { piece: 'Salle d’eau', aire: '5,9 m²' },
        { piece: 'Chambre', aire: '10,2 m²' },
        { piece: 'Séjour-cuisine', aire: '26 m²' },
        { piece: 'Extérieur privatif', aire: '10 m²' },
      ],
      caracteristiques: [
        'Parquet',
        'Grande baie vitrée aluminium double vitrage',
        'Cuisine pré-équipée',
        'Salle d’eau carrelée grand format',
        'Chauffage individuel',
        'Stationnement sécurisé',
        'Extérieur privatif',
      ],
      travaux: {
        intro: 'Réhabilitation complète du bâti existant en trois phases.',
        phases: [
          {
            num: '01',
            titre: 'Le plan',
            texte: 'Démolition partielle des cloisons existantes et redessin complet du logement. Création d’une baie vitrée sur l’extérieur privatif. Distribution refaite autour d’un séjour traversant.',
          },
          {
            num: '02',
            titre: 'L’enveloppe',
            texte: 'Isolation thermique et acoustique renforcées. Menuiseries double vitrage neuves. Chauffage individuel neuf, ventilation maîtrisée.',
          },
          {
            num: '03',
            titre: 'Les finitions',
            texte: 'Livraison de l’appartement clé en main sur base des visuels 3D réalisés. Rénovation supervisée par une architecte, finitions soignées. Artisans sélectionnés.',
          },
        ],
      },
      etatActuel: {
        intro: 'Si vous l’achetez en brut, le bâtiment vous est livré en l’état au moment de la signature. Voici l’état actuel des lieux et le rendu projeté du logement fini.',
        avantImage: LOT1_AVANT,
        avantCaption: 'Avant — bureaux d’origine, structure existante conservée.',
        projetCaption: 'Projet livré — rendu 3D du logement fini, à venir.',
        apresLegende: 'Après — séjour traversant ouvert sur l’extérieur privatif, finitions Versi.',
      },
      dpeProjete: {
        classe: 'B',
        plage: '71 – 110 kWh/m²/an',
        unite: 'énergie primaire',
        intro: 'Le bâtiment est modernisé — isolation thermique renforcée, menuiseries double vitrage, ventilation maîtrisée. La classe sera figée au DPE définitif établi à la livraison.',
        note: 'DPE définitif établi à la livraison par un diagnostiqueur certifié — la classe peut évoluer en fonction de la consommation réelle constatée.',
      },
      formules: {
        intro: 'Vous achetez cet appartement selon deux logiques. Brut, vous entrez pendant le chantier et choisissez vous-même sols, murs, cuisine et salle d’eau : moins cher, plus impliqué. Prêt à habiter, vous emménagez dans un logement fini par Versi : plus tranquille, plus cher. Le bâti, les surfaces, les garanties — tout le reste est identique.',
        brut: {
          label: 'Brut',
          price: '118 000 €',
          livraison: 'Livraison octobre 2026',
          description: 'Versi vous livre l’appartement transformé : ouverture et pose de la baie vitrée sur l’extérieur privatif, création de la cour, création de l’entrée, mur latéral séparant l’appartement de la servitude de passage, isolation thermique et acoustique, menuiseries double vitrage, chauffage et ventilation. Vous prenez la main sur les sols, les murs, la cuisine et la salle d’eau.',
        },
        pretAHabiter: {
          label: 'Prêt à habiter',
          price: '145 000 €',
          livraison: 'Livraison décembre 2026',
          description: 'Cahier des charges arrêté en amont avec une architecte, validation des matériaux et finitions à chaque étape, suivi du chantier jusqu’à la remise des clés. Artisans sélectionnés et coordonnés par Versi — vous n’avez à toucher à aucun corps de métier.',
        },
        garanties: 'Livraison brut en octobre 2026, prêt à habiter en décembre 2026. Garanties dommages-ouvrage et décennale identiques dans les deux cas.',
      },
      reperesMarche: {
        intro: 'Livré clé en main à 145 000 €, l’appartement ressort à 3 085 €/m² hors parking — environ 12 % sous la médiane des T2 vendus à Lille-Sud en 2024-2025.',
        rows: [
          { ref: 'T2 existant — Lille-Sud', sousTitre: 'Médiane DVF · 2024-2025', prixM2: '~ 3 530 €' },
          { ref: 'Appartement existant — Vauban-Esquermes', sousTitre: 'Quartier limitrophe · annonces comparables 2026', prixM2: '~ 3 650 €' },
          { ref: 'Cet appartement — prêt à habiter', sousTitre: 'Versi · 2026', prixM2: '~ 3 085 €' },
        ],
      },
      aPrevoir: {
        intro: 'Estimations indicatives à valider sur les budgets définitifs.',
        sources: 'Sources : ma-nego.fr (charges) · calculmalin.fr + mairie de Lille (taxe foncière) · barème national (frais notaire).',
        items: [
          { label: 'Charges copro · mois', valeur: '~ 60 €' },
          { label: 'Taxe foncière · an', valeur: '~ 550 €' },
          { label: 'Frais de notaire (~ 7,5 %)', valeur: '~ 10 500 €' },
        ],
      },
      calendrier: [
        { label: 'Plans architecturaux et préparation des travaux', date: 'Été 2026', statut: 'En cours' },
        { label: 'Livraison brut', date: 'Octobre 2026', statut: 'Programmé' },
        { label: 'Livraison prêt à habiter', date: 'Décembre 2026', statut: 'Cible' },
      ],
      bandeauPrix: {
        prixVedette: '145 000 €',
        sousTitre: 'Prêt à habiter · place de parking incluse · livraison décembre 2026',
        formules: 'Deux formules au choix',
        brutLigne: 'Brut 118 000 € — Livraison octobre 2026',
        pretAHabiterLigne: 'Prêt à habiter 145 000 € — Livraison décembre 2026',
        statut: 'Disponible',
        modalite: 'Vente classique · Garanties Versi à la livraison',
        notaire: 'Frais de notaire ~ 7,5 %',
      },
      mentions: 'Document à valeur indicative. Les surfaces, plans et finitions sont susceptibles d’évoluer dans le respect des permis délivrés. Le DPE définitif sera établi à la livraison. Prix exprimés hors frais de notaire. Garanties dommages-ouvrage et décennale fournies à la livraison.',
    }),
    sort_order: 0,
  },
  {
    id: 'muguets-lot-2-t3',
    title: 'T3 de 86 m² avec séjour traversant de 40 m², 1er étage',
    city: 'Lille',
    location: 'Lille',
    neighborhood: 'Lille-Sud',
    address: '10 rue des Muguets, Lille',
    nearby_transport: 'Métro Oscar Lambret (ligne 1) à 10 minutes à pied (3 minutes en vélo). Lille Flandres à environ 10 minutes en métro, ligne 1 directe. CHU de Lille à proximité immédiate.',
    nearby_amenities: 'Écoles maternelles Florian et La Briqueterie, école élémentaire Turgot (rue du Faubourg des Postes), collège Louise Michel. Crèches municipales Marie Curie et Les P\'tits Minouches. Parc du Grand Sud (4 hectares). Centre commercial Lillenium (rue du Faubourg des Postes, une centaine d\'enseignes). CHU de Lille — Hôpital Roger Salengro dans le quartier (urgences adultes et pédiatriques).',
    type: 'Appartement',
    surface: '86 m²',
    rooms: 3,
    price: '176 300 €',
    price_num: 176300,
    price_note: 'Prix brut (avant travaux), hors frais de notaire. Option prêt à habiter : 232 200 €.',
    status: 'disponible',
    dpe: 'B',
    dpe_note: 'Classe visée au DPE projeté : B (71–110 kWh/m²/an, énergie primaire). DPE définitif établi à la livraison.',
    floor: '1er étage',
    tenancy: 'Libre',
    renovation_year: null,
    charges: '~ 107 €/mois (estimation indicative)',
    description: `86 m² d'un seul tenant, sans couloir qui mange la surface, sans mur porteur au milieu. C'est ce que donne un ancien plateau de bureaux quand on le transforme bien. Un séjour-cuisine de 40,5 m² sans cloisonnement, deux chambres (14 m² et 9 m²), une salle d'eau. Tout l'espace est utile.

Le séjour donne une vraie liberté d'aménagement. Table de 8, canapé d'angle, coin bureau, tout rentre sans compromis. Les deux chambres sont séparées du séjour. Chauffage collectif. Place de parking extérieur sécurisé (accès par double porte) comprise.

Ancien bâtiment de bureaux transformé en 3 logements de qualité par Versi. Sols en parquet contrecollé chêne, double vitrage sur toutes les menuiseries, salle d'eau grand format, cuisine pré-équipée. À 176 300 € avant travaux ou 232 200 € livré prêt à habiter. Début des travaux septembre 2026, livraison décembre 2026. Couvert par l'assurance dommages-ouvrage et la garantie décennale.

Pour visiter ou recevoir le dossier complet du bien, contactez-nous.`,
    works: JSON.stringify([]),
    features: JSON.stringify([
      'Séjour-cuisine de 40,5 m² sans cloisonnement',
      'Chambre principale 14 m²',
      'Chambre 9 m²',
      'Aucun mur porteur central',
      'Parquet chêne, menuiseries double vitrage',
      'Parking extérieur sécurisé (double porte)',
    ]),
    dossier: JSON.stringify({
      tagline: 'Lille · Lille-Sud (quartier des fleurs)',
      hook: 'T3 traversant — 86 m² au 1er étage. Un séjour-cuisine de 40,5 m² qui traverse l’étage. Deux chambres distribuées au calme. Une place de parking sécurisée.',
      intro: 'Au premier étage du 10 rue des Muguets — un ancien immeuble de bureaux que Versi réhabilite entièrement. Livraison décembre 2026.',
      ficheTechnique: [
        { label: 'Type', value: 'T3 traversant' },
        { label: 'Surface', value: '86 m²' },
        { label: 'Pièces', value: '3' },
        { label: 'Étage', value: '1er' },
        { label: 'Livraison', value: 'Déc. 2026' },
      ],
      leBien: 'Le bâtiment du 10 rue des Muguets a longtemps servi de bureaux. Son écriture contemporaine et sa parcelle traversante appelaient une seconde vie résidentielle. Versi l’a acquis pour en faire trois logements, dessinés par le cabinet Avantpropos. Cet appartement occupe le premier étage de l’immeuble. Le séjour-cuisine de 40,5 m² traverse toute la profondeur de l’étage : exposition sur la rue d’un côté, sur l’arrière de l’autre, lumière toute la journée. Les deux chambres, de 14,2 m² et 9 m², sont positionnées en cœur de plan, à l’abri du bruit. Salle de bains de 5,9 m², WC séparé, cellier, entrée de 7,3 m². L’étage est intégralement aménageable, sans aucun mur porteur central.',
      pourQui: 'Couple primo-accédant ou famille qui s’agrandit y trouveront un séjour-cuisine généreux et deux chambres distribuables en suite parentale, bureau ou chambre d’enfant selon le projet — aucun mur porteur central. Un acheteur attaché aux volumes y verra 86 m² polyvalents et l’exposition traversante propre au plateau. Une place de stationnement extérieure sécurisée est comprise dans le prix.',
      accroche: 'Un T3 traversant au premier étage, à deux pas du métro. Séjour-cuisine sur deux expositions, deux chambres en cœur de plan.',
      planImage: LOT2_PLAN,
      planCaption: 'Plan d’architecte — R+1, échelle indicative 1/50. Cabinet Avantpropos Architectes.',
      surfaces: [
        { piece: 'Entrée', aire: '7,3 m²' },
        { piece: 'Cellier', aire: '1,3 + 2,0 m²' },
        { piece: 'WC', aire: '1,3 m²' },
        { piece: 'Salle de bains', aire: '5,9 m²' },
        { piece: 'Chambre 02', aire: '9 m²' },
        { piece: 'Chambre 01', aire: '14,2 m²' },
        { piece: 'Séjour-cuisine traversant', aire: '40,5 m²' },
      ],
      caracteristiques: [
        'Parquet',
        'Grande baie vitrée aluminium double vitrage',
        'Cuisine pré-équipée',
        'Salle de bains carrelée grand format',
        'Chauffage individuel',
        'Stationnement sécurisé',
        'Exposition traversante double',
      ],
      travaux: {
        intro: 'Réhabilitation complète du bâti existant en trois phases.',
        phases: [
          {
            num: '01',
            titre: 'Le plan',
            texte: 'Démolition des cloisons existantes et redessin complet de l’étage, libéré de tout mur porteur central. Séjour-cuisine traversant ouvert sur les deux façades, deux chambres distribuées en cœur de plan, salle de bains, cellier et WC séparé.',
          },
          {
            num: '02',
            titre: 'L’enveloppe',
            texte: 'Isolation thermique et acoustique renforcées. Menuiseries double vitrage neuves. Chauffage individuel neuf, ventilation maîtrisée.',
          },
          {
            num: '03',
            titre: 'Les finitions',
            texte: 'Livraison de l’appartement clé en main sur base des visuels 3D réalisés. Rénovation supervisée par une architecte, finitions soignées. Artisans sélectionnés.',
          },
        ],
      },
      etatActuel: {
        intro: 'Si vous l’achetez en brut, le bâtiment vous est livré au stade structurel au moment de la signature. Voici l’état actuel du plateau au premier étage et la trajectoire de la réhabilitation.',
        avantImage: LOT2_AVANT,
        avantCaption: 'Avant — plateau de bureaux vidé, parquet stratifié et faux-plafond existants, cloisons à démolir.',
        projetCaption: 'Projet livré — rendu 3D du logement fini, à venir.',
        apresLegende: 'Après — séjour-cuisine traversant 40,5 m², deux chambres et finitions clé en main Versi.',
      },
      dpeProjete: {
        classe: 'B',
        plage: '71 – 110 kWh/m²/an',
        unite: 'énergie primaire',
        intro: 'Le bâtiment est modernisé — isolation thermique renforcée, menuiseries double vitrage, ventilation maîtrisée. La classe sera figée au DPE définitif établi à la livraison.',
        note: 'DPE définitif établi à la livraison par un diagnostiqueur certifié — la classe peut évoluer en fonction de la consommation réelle constatée.',
      },
      formules: {
        intro: 'Vous achetez cet appartement selon deux logiques. Brut, vous entrez pendant le chantier et choisissez vous-même sols, murs, cuisine et salle de bains : moins cher, plus impliqué. Prêt à habiter, vous emménagez dans un logement fini par Versi : plus tranquille, plus cher. Le bâti, les surfaces, les garanties — tout le reste est identique.',
        brut: {
          label: 'Brut',
          price: '176 300 €',
          livraison: 'Livraison octobre 2026',
          description: 'Versi vous livre l’appartement transformé : démolition des cloisons, redistribution, ouverture des baies, isolation thermique et acoustique, menuiseries double vitrage, chauffage et ventilation. Vous prenez la main sur les sols, les murs, la cuisine et la salle de bains.',
        },
        pretAHabiter: {
          label: 'Prêt à habiter',
          price: '232 200 €',
          livraison: 'Livraison décembre 2026',
          description: 'Cahier des charges arrêté en amont avec une architecte, validation des matériaux et finitions à chaque étape, suivi du chantier jusqu’à la remise des clés. Artisans sélectionnés et coordonnés par Versi — vous n’avez à toucher à aucun corps de métier.',
        },
        garanties: 'Livraison brut en octobre 2026, prêt à habiter en décembre 2026. Garanties dommages-ouvrage et décennale identiques dans les deux cas.',
      },
      reperesMarche: {
        intro: 'Livré clé en main à 232 200 €, l’appartement ressort à 2 700 €/m² hors parking — environ 31 % sous la médiane des T3 vendus à Lille-Sud en 2025.',
        rows: [
          { ref: 'T3 existant — Lille-Sud', sousTitre: 'Médiane DVF · 2025', prixM2: '~ 3 910 €' },
          { ref: 'Appartement existant — Vauban-Esquermes', sousTitre: 'Quartier limitrophe · annonces comparables 2026', prixM2: '~ 3 650 €' },
          { ref: 'Cet appartement — prêt à habiter', sousTitre: 'Versi · 2026', prixM2: '~ 2 700 €' },
        ],
      },
      aPrevoir: {
        intro: 'Estimations indicatives à valider sur les budgets définitifs.',
        sources: 'Sources : ma-nego.fr (charges) · calculmalin.fr + mairie de Lille (taxe foncière) · barème national (frais notaire).',
        items: [
          { label: 'Charges copro · mois', valeur: '~ 107 €' },
          { label: 'Taxe foncière · an', valeur: '~ 1 100 €' },
          { label: 'Frais de notaire (~ 7,5 %)', valeur: '~ 16 700 €' },
        ],
      },
      calendrier: [
        { label: 'Plans architecturaux et préparation des travaux', date: 'Été 2026', statut: 'En cours' },
        { label: 'Livraison brut', date: 'Octobre 2026', statut: 'Programmé' },
        { label: 'Livraison prêt à habiter', date: 'Décembre 2026', statut: 'Cible' },
      ],
      bandeauPrix: {
        prixVedette: '232 200 €',
        sousTitre: 'Prêt à habiter · place de parking incluse · livraison décembre 2026',
        formules: 'Deux formules au choix',
        brutLigne: 'Brut 176 300 € — Livraison octobre 2026',
        pretAHabiterLigne: 'Prêt à habiter 232 200 € — Livraison décembre 2026',
        statut: 'Disponible',
        modalite: 'Vente classique · Garanties Versi à la livraison',
        notaire: 'Frais de notaire ~ 7,5 %',
      },
      mentions: 'Document à valeur indicative. Les surfaces, plans et finitions sont susceptibles d’évoluer dans le respect des permis délivrés. Le DPE définitif sera établi à la livraison. Prix exprimés hors frais de notaire. Garanties dommages-ouvrage et décennale fournies à la livraison.',
    }),
    sort_order: 1,
  },
  {
    id: 'muguets-lot-3-duplex',
    title: 'Duplex 137 m² sur deux niveaux, terrasse et plafond cathédrale',
    city: 'Lille',
    location: 'Lille',
    neighborhood: 'Lille-Sud',
    address: '10 rue des Muguets, Lille',
    nearby_transport: 'Métro Oscar Lambret (ligne 1) à 10 minutes à pied (3 minutes en vélo). Lille Flandres à environ 10 minutes en métro, ligne 1 directe. CHU de Lille à proximité immédiate.',
    nearby_amenities: 'Écoles maternelles Florian et La Briqueterie, école élémentaire Turgot (rue du Faubourg des Postes), collège Louise Michel. Crèches municipales Marie Curie et Les P\'tits Minouches. Parc du Grand Sud (4 hectares). Centre commercial Lillenium (rue du Faubourg des Postes, une centaine d\'enseignes). CHU de Lille — Hôpital Roger Salengro dans le quartier (urgences adultes et pédiatriques).',
    type: 'Duplex',
    surface: '137 m²',
    rooms: 5,
    price: '274 000 €',
    price_num: 274000,
    price_note: 'Prix avant travaux, hors frais de notaire. Option prêt à habiter : 342 500 €.',
    status: 'disponible',
    dpe: null,
    dpe_note: 'DPE en cours',
    floor: '2e et 3e étages',
    tenancy: 'Libre',
    renovation_year: null,
    charges: null,
    description: `Terrasse de 12 m² donnant sur l'église du quartier. Vue sur pierre, pas sur fenêtres d'immeuble. En haut, un plafond cathédrale qui donne au séjour une hauteur qu'on ne retrouve nulle part ailleurs dans l'immeuble. Les deux derniers étages, pour un seul appartement : 137 m² sur deux niveaux.

En bas : trois chambres de 15 m² chacune, chaque chambre indépendante, chacun son espace, et une salle d'eau. En haut : un séjour-cuisine de 47 m² sous les toits, lumineux, avec accès direct à la terrasse. On prend le café dehors le matin avec vue sur le clocher, on reçoit des amis le soir dans un séjour où personne n'est à l'étroit. Chauffage collectif. Place de parking extérieur sécurisé (accès par double porte) comprise.

L'immeuble, ancien bâtiment de bureaux, est intégralement transformé par Versi en 3 logements de qualité. Chaque finition est choisie pour durer : parquet contrecollé chêne, menuiseries double vitrage, salle d'eau carrelée grand format, cuisine pré-équipée. À 274 000 € avant travaux ou 342 500 € livré prêt à habiter. Début des travaux septembre 2026, livraison décembre 2026. Couvert par l'assurance dommages-ouvrage et la garantie décennale.

Pour visiter le duplex ou recevoir la plaquette détaillée, contactez-nous.`,
    works: JSON.stringify([]),
    features: JSON.stringify([
      'Duplex 137 m² sur deux niveaux',
      'Terrasse 12 m² donnant sur l\'église',
      'Plafond cathédrale au dernier étage',
      'Séjour-cuisine 47 m² sous les toits',
      '3 chambres de 15 m² chacune',
      'Parquet chêne, menuiseries double vitrage',
      'Parking extérieur sécurisé (double porte)',
    ]),
    sort_order: 2,
  },
];

// Export des données pour autoSeed dans server.js
export { PROPERTIES as MUGUETS_PROPERTIES };

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error('[seed-muguets] DATABASE_URL non définie.');
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    for (const prop of PROPERTIES) {
      await client.query(
        `INSERT INTO properties (
          id, title, city, location, neighborhood, address,
          nearby_transport, nearby_amenities, type, surface, rooms,
          price, price_num, price_note, status, dpe, dpe_note,
          floor, tenancy, renovation_year, charges, description,
          works, features, dossier, sort_order
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          city = EXCLUDED.city,
          location = EXCLUDED.location,
          neighborhood = EXCLUDED.neighborhood,
          address = EXCLUDED.address,
          nearby_transport = EXCLUDED.nearby_transport,
          nearby_amenities = EXCLUDED.nearby_amenities,
          type = EXCLUDED.type,
          surface = EXCLUDED.surface,
          rooms = EXCLUDED.rooms,
          price = EXCLUDED.price,
          price_num = EXCLUDED.price_num,
          price_note = EXCLUDED.price_note,
          status = EXCLUDED.status,
          dpe = EXCLUDED.dpe,
          dpe_note = EXCLUDED.dpe_note,
          floor = EXCLUDED.floor,
          tenancy = EXCLUDED.tenancy,
          renovation_year = EXCLUDED.renovation_year,
          charges = EXCLUDED.charges,
          description = EXCLUDED.description,
          works = EXCLUDED.works,
          features = EXCLUDED.features,
          dossier = EXCLUDED.dossier,
          sort_order = EXCLUDED.sort_order`,
        [
          prop.id, prop.title, prop.city, prop.location, prop.neighborhood, prop.address,
          prop.nearby_transport, prop.nearby_amenities, prop.type, prop.surface, prop.rooms,
          prop.price, prop.price_num, prop.price_note, prop.status, prop.dpe, prop.dpe_note,
          prop.floor, prop.tenancy, prop.renovation_year, prop.charges, prop.description,
          prop.works, prop.features, prop.dossier ?? null, prop.sort_order,
        ]
      );
      console.log(`[seed-muguets] Upserted: ${prop.id} — ${prop.title}`);
    }
    console.log('[seed-muguets] 3 biens Muguets insérés/mis à jour.');
  } catch (err) {
    console.error('[seed-muguets] Erreur :', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Ne s'exécute que si lancé directement (pas à l'import)
import { fileURLToPath } from 'url';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  seed();
}
