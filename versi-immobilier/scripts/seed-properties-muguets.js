// Seed script - 3 properties at 10 rue des Muguets, Lille
// Idempotent: uses ON CONFLICT DO UPDATE
import pg from 'pg';
import {
  LOT1_PLAN,
  LOT1_AVANT,
  LOT2_PLAN,
  LOT2_AVANT,
  LOT3_PLAN,
  LOT3_AVANT,
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
    nearby_amenities: 'Écoles maternelles Florian et La Briqueterie, école élémentaire Turgot (rue du Faubourg des Postes), collège Louise Michel. Crèches municipales Marie Curie et Les P\'tits Minouches. Parc du Grand Sud (4 hectares). Centre commercial Lillenium (rue du Faubourg des Postes, une centaine d\'enseignes). CHU de Lille - Hôpital Roger Salengro dans le quartier (urgences adultes et pédiatriques).',
    type: 'Appartement',
    surface: '47 m²',
    rooms: 2,
    price: '118 000 €',
    price_num: 118000,
    price_note: 'Prix brut (avant travaux), hors frais de notaire. Option prêt à habiter : 145 000 €.',
    status: 'disponible',
    dpe: 'B',
    dpe_note: 'Classe visée au DPE projeté : B (71-110 kWh/m²/an, énergie primaire). DPE définitif établi à la livraison.',
    floor: 'RDC',
    tenancy: 'Libre',
    renovation_year: null,
    charges: '~ 60 €/mois (estimation indicative)',
    description: `C'est le seul appartement de l'immeuble avec un espace extérieur privatif : 15 m² de plain-pied avec le séjour, sans vis-à-vis. Rez-de-chaussée, accès direct.

Le séjour-cuisine de 26 m² est lumineux et ouvre sur l'extérieur sans marche, sans seuil. L'été, on pose la table dehors et on mange à l'air libre. L'hiver, la lumière traverse le séjour toute la journée. La chambre de 10,2 m² donne côté cour, au calme. Chauffage individuel, pas de charge d'ascenseur. Place de parking extérieur sécurisé (accès par double porte) comprise dans le prix.

L'immeuble est un ancien bâtiment de bureaux que Versi transforme en 3 logements de qualité. Finitions soignées : parquet contrecollé chêne, menuiseries double vitrage, salle d'eau carrelée grand format, cuisine pré-équipée. Deux formules : à 118 000 € vous achetez avant travaux et vous choisissez vos finitions, à 145 000 € on vous livre prêt à habiter. Permis déposé, début des travaux septembre 2026, livraison décembre 2026. Dommages-ouvrage et garantie décennale incluses.

Pour visiter ou recevoir le dossier complet du bien, contactez-nous.`,
    works: JSON.stringify([]),
    features: JSON.stringify([
      'Espace extérieur privatif 15 m², de plain-pied',
      'Séjour-cuisine 26 m² lumineux, ouvert sur l\'extérieur',
      'Chambre 10,2 m² côté cour',
      'Parquet chêne, menuiseries double vitrage',
      'Parking extérieur sécurisé (double porte)',
      'Pas de charges d\'ascenseur',
    ]),
    dossier: JSON.stringify({
      tagline: 'Lille · Lille-Sud (quartier des fleurs)',
      hook: "Un séjour traversant qui s'ouvre de plain-pied sur 15 m² d'extérieur privatif. Une chambre au calme, en cœur de plan. Une place de parking sécurisée. Au rez-de-chaussée d'un ancien immeuble de bureaux que Versi réhabilite entièrement.",
      intro: "Au rez-de-chaussée du 10 rue des Muguets - un ancien immeuble de bureaux que Versi réhabilite entièrement. Livraison octobre 2026.",
      ficheTechnique: [
        { label: 'Type', value: 'T2' },
        { label: 'Surface', value: '47 m²' },
        { label: 'Pièces', value: '2' },
        { label: 'Extérieur', value: '15 m² privatif' },
        { label: 'Étage', value: 'RDC' },
        { label: 'Disponibilité', value: 'Oct. 2026' },
      ],
      emplacement: {
        prose: [
          "Le 10 rue des Muguets se situe entre le quartier des fleurs - résidentiel et paisible - et le CHU de Lille, dans un secteur en mutation depuis l'ouverture de Lillenium en 2020.",
          "Zone résidentielle calme, en pleine mutation depuis l'ouverture de Lillenium en 2020. Le centre commercial est à 7 minutes à pied ; le métro Porte des Postes - lignes 1 et 2, direct vers Lille-Flandres et le centre - à 12 minutes.",
        ],
        pois: [
          { n: 1, nom: 'Métro Porte des Postes', detail: 'lignes 1 & 2 · 12 min à pied' },
          { n: 2, nom: 'Métro Oscar Lambret', detail: 'M1 · 14 min à pied' },
          { n: 3, nom: 'CHU de Lille', detail: 'centre hospitalier' },
          { n: 4, nom: 'Lillenium', detail: 'centre commercial · 7 min' },
          { n: 5, nom: 'Les Halles du Sud', detail: 'marché de quartier' },
          { n: 6, nom: 'Parc du Grand Sud', detail: 'espace vert · 4 ha' },
          { n: 7, nom: 'Écoles & crèches', detail: 'maternelle → collège' },
        ],
        adresse: {
          label: 'Adresse',
          value: '10 rue des Muguets, 59000 Lille',
          note: 'Quartier des fleurs / CHU',
        },
        transports: {
          label: 'Transports',
          value: 'Métro Porte des Postes · 12 min à pied',
          note: 'Lille-Flandres en métro direct, lignes 1 & 2',
        },
        proximite: {
          label: 'À proximité',
          value: 'Lillenium · 7 min à pied',
          note: 'CHU · écoles · Parc du Grand Sud',
        },
      },
      leBien: [
        "Le bâtiment du 10 rue des Muguets a longtemps servi de bureaux. Son écriture contemporaine et sa parcelle traversante appelaient une seconde vie résidentielle. Versi l'a acquis pour en faire trois logements, dessinés par le cabinet Avantpropos.",
        "Cet appartement occupe le rez-de-chaussée. Le séjour-cuisine de 26 m² traverse la profondeur du bâti et ouvre de plain-pied sur l'extérieur privatif. La chambre de 10,2 m² est en cœur de plan, au calme.",
      ],
      pourQui: "Pour un premier achat avec un vrai extérieur, au calme et à deux pas du métro : ce T2 a été pensé pour vous. Une place de stationnement sécurisée est comprise dans le prix.",
      accroche: "Un rez-de-chaussée traversant qui s'ouvre de plain-pied sur l'extérieur. Une rareté dans le secteur, à deux pas du métro.",
      planImage: LOT1_PLAN,
      planCaption: '47 m² au rez-de-chaussée - plan cabinet Avantpropos.',
      surfaces: [
        { piece: 'Entrée', aire: '2,0 m²' },
        { piece: 'Couloir', aire: '3,2 m²' },
        { piece: 'Salle d’eau', aire: '5,9 m²' },
        { piece: 'Chambre', aire: '10,2 m²' },
        { piece: 'Séjour-cuisine', aire: '26 m²' },
        { piece: 'Extérieur privatif', aire: '15 m²' },
      ],
      caracteristiques: [
        'Parquet',
        'Baie vitrée aluminium double vitrage',
        'Cuisine pré-équipée',
        "Salle d'eau carrelée grand format",
        'Chauffage individuel',
        'Stationnement extérieur sécurisé',
        'Extérieur privatif 15 m²',
        'Garanties dommages-ouvrage & décennale',
      ],
      travaux: {
        phases: [
          {
            num: '01',
            titre: 'Le plan',
            texte: "Démolition partielle des cloisons et redessin complet du logement. Création d'une baie vitrée sur l'extérieur privatif. Distribution refaite autour d'un séjour traversant.",
          },
          {
            num: '02',
            titre: "L'enveloppe",
            texte: 'Isolation thermique et acoustique renforcées. Menuiseries double vitrage neuves. Chauffage individuel neuf, ventilation maîtrisée.',
          },
          {
            num: '03',
            titre: 'Les finitions',
            texte: 'Livraison clé en main sur base des visuels 3D réalisés. Rénovation supervisée par une architecte, finitions soignées. Artisans sélectionnés.',
          },
        ],
      },
      etatActuel: {
        avantImage: LOT1_AVANT,
        avantCaption: 'Séjour-cuisine',
        projetImage: '/properties/muguets-lot-1-rdc/photo-01.jpeg',
        projetCaption: "Projet livré - séjour-cuisine ouvert sur l'extérieur privatif.",
      },
      dpeProjete: {
        classe: 'B',
        plage: '71 à 110 kWh/m²/an',
        unite: 'énergie primaire',
        intro: 'Classe visée au DPE projeté - 71 à 110 kWh/m²/an (énergie primaire).',
        note: 'DPE définitif établi à la livraison par un diagnostiqueur certifié.',
      },
      formules: {
        intro: "Vous achetez selon deux logiques. Brut, vous entrez pendant le chantier et choisissez vous-même les sols, les murs, la cuisine et les salles d'eau : le logement se façonne entièrement à votre image. Prêt à habiter, Versi vous le livre fini, dessiné avec une architecte qui vous accompagne jusqu'à la remise des clés. Le bâti, les surfaces et les garanties restent identiques - vous choisissez seulement votre degré d'implication.",
        brut: {
          label: 'Brut',
          price: '118 000 €',
          livraison: 'Livraison octobre 2026',
          description: "Versi vous livre l'appartement transformé : ouverture et pose de la baie vitrée sur l'extérieur privatif, création de la cour et de l'entrée, mur latéral séparant l'appartement de la servitude. Vous prenez la main sur sols, murs, cuisine et salle d'eau.",
        },
        pretAHabiter: {
          label: 'Prêt à habiter',
          price: '145 000 €',
          livraison: 'Livraison décembre 2026',
          description: "Cahier des charges arrêté avec une architecte, validation des matériaux à chaque étape, suivi du chantier jusqu'à la remise des clés. Artisans sélectionnés et coordonnés par Versi. Mobilier et aménagements sur mesure proposés et chiffrables en option.",
        },
        garanties: 'Livraison brut en octobre 2026, prêt à habiter en décembre 2026. Garanties dommages-ouvrage et décennale identiques dans les deux cas.',
      },
      architecte: {
        titre: 'Une architecte sur tout le projet',
        texte: "Le projet livré est entièrement customisable : achetable brut ou totalement fini, selon vos envies. Il est dessiné par Louise Holleman, architecte d'intérieur et fondatrice de HOLLEMAN INTERIORS, qui signe des intérieurs résidentiels et des lieux de caractère dans les Hauts-de-France et à Paris (République à La Madeleine, Unité à Paris, Salomé à Lille). Elle choisit les matériaux avec vous et suit le chantier jusqu'à la remise des clés - sa prestation est comprise dans l'offre Versi.",
      },
      aPrevoir: {
        intro: 'Estimations indicatives, à valider sur les budgets définitifs.',
        sources: 'Sources : ma-nego.fr (charges) · calculmalin.fr + mairie de Lille (taxe foncière) · barème national (frais notaire).',
        items: [
          { label: 'Charges copro · mois', valeur: '~ 60 €' },
          { label: 'Taxe foncière · an', valeur: '~ 550 €' },
          { label: 'Frais de notaire', valeur: '~ 10 500 €' },
        ],
      },
      calendrier: [
        { label: 'Préparation des travaux', date: 'Été 2026', statut: 'En cours' },
        { label: 'Livraison brut', date: 'Octobre 2026', statut: 'Programmé' },
        { label: 'Vous prenez possession', date: 'Décembre 2026', statut: 'Prêt à habiter' },
      ],
      bandeauPrix: {
        prixVedette: '145 000 €',
        sousTitre: 'Prêt à habiter · place de parking incluse · livraison décembre 2026',
        formules: 'Deux formules au choix',
        brutLigne: 'Brut 118 000 € - Livraison octobre 2026',
        pretAHabiterLigne: 'Prêt à habiter 145 000 € - Livraison décembre 2026',
        statut: 'Disponible',
        modalite: 'Vente classique · Garanties Versi à la livraison',
        notaire: 'Frais de notaire ~ 7,5 %',
      },
      mentions: "Document non contractuel établi à titre indicatif. Surfaces, prix et calendrier susceptibles d'évolution jusqu'à la signature de l'acte. Visuels et plans non contractuels.",
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
    nearby_amenities: 'Écoles maternelles Florian et La Briqueterie, école élémentaire Turgot (rue du Faubourg des Postes), collège Louise Michel. Crèches municipales Marie Curie et Les P\'tits Minouches. Parc du Grand Sud (4 hectares). Centre commercial Lillenium (rue du Faubourg des Postes, une centaine d\'enseignes). CHU de Lille - Hôpital Roger Salengro dans le quartier (urgences adultes et pédiatriques).',
    type: 'Appartement',
    surface: '86 m²',
    rooms: 3,
    price: '176 300 €',
    price_num: 176300,
    price_note: 'Prix brut (avant travaux), hors frais de notaire. Option prêt à habiter : 232 200 €.',
    status: 'disponible',
    dpe: 'B',
    dpe_note: 'Classe visée au DPE projeté : B (71-110 kWh/m²/an, énergie primaire). DPE définitif établi à la livraison.',
    floor: '1er étage',
    tenancy: 'Libre',
    renovation_year: null,
    charges: '~ 107 €/mois (estimation indicative)',
    description: `86 m² d'un seul tenant, sans couloir qui mange la surface, sans mur porteur au milieu. C'est ce que donne un ancien plateau de bureaux quand on le transforme bien. Un séjour-cuisine de 40,5 m² sans cloisonnement, deux chambres (14 m² et 9 m²), une salle d'eau. Tout l'espace est utile.

Le séjour donne une vraie liberté d'aménagement. Table de 8, canapé d'angle, coin bureau, tout rentre sans compromis. Les deux chambres sont séparées du séjour. Chauffage individuel. Place de parking extérieur sécurisé (accès par double porte) comprise.

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
      hook: "Un séjour-cuisine de 40,5 m² qui traverse l'étage. Deux chambres distribuées au calme. Une place de parking sécurisée. Au premier étage d'un ancien immeuble de bureaux que Versi réhabilite entièrement.",
      intro: "Au premier étage du 10 rue des Muguets - un ancien immeuble de bureaux que Versi réhabilite entièrement. Livraison octobre 2026.",
      ficheTechnique: [
        { label: 'Type', value: 'T3 traversant' },
        { label: 'Surface', value: '86 m²' },
        { label: 'Pièces', value: '3' },
        { label: 'Exposition', value: 'Traversante' },
        { label: 'Étage', value: '1er' },
        { label: 'Disponibilité', value: 'Oct. 2026' },
      ],
      emplacement: {
        prose: [
          "Le 10 rue des Muguets se situe entre le quartier des fleurs - résidentiel et paisible - et le CHU de Lille, dans un secteur en mutation depuis l'ouverture de Lillenium en 2020.",
          "Zone résidentielle calme, en pleine mutation depuis l'ouverture de Lillenium en 2020. Le centre commercial est à 7 minutes à pied ; le métro Porte des Postes - lignes 1 et 2, direct vers Lille-Flandres et le centre - à 12 minutes.",
        ],
        pois: [
          { n: 1, nom: 'Métro Porte des Postes', detail: 'lignes 1 & 2 · 12 min à pied' },
          { n: 2, nom: 'Métro Oscar Lambret', detail: 'M1 · 14 min à pied' },
          { n: 3, nom: 'CHU de Lille', detail: 'centre hospitalier' },
          { n: 4, nom: 'Lillenium', detail: 'centre commercial · 7 min' },
          { n: 5, nom: 'Les Halles du Sud', detail: 'marché de quartier' },
          { n: 6, nom: 'Parc du Grand Sud', detail: 'espace vert · 4 ha' },
          { n: 7, nom: 'Écoles & crèches', detail: 'maternelle → collège' },
        ],
        adresse: {
          label: 'Adresse',
          value: '10 rue des Muguets, 59000 Lille',
          note: 'Quartier des fleurs / CHU',
        },
        transports: {
          label: 'Transports',
          value: 'Métro Porte des Postes · 12 min à pied',
          note: 'Lille-Flandres en métro direct, lignes 1 & 2',
        },
        proximite: {
          label: 'À proximité',
          value: 'Lillenium · 7 min à pied',
          note: 'CHU · écoles · Parc du Grand Sud',
        },
      },
      leBien: [
        "Le bâtiment du 10 rue des Muguets a longtemps servi de bureaux. Son écriture contemporaine et sa parcelle traversante appelaient une seconde vie résidentielle. Versi l'a acquis pour en faire trois logements, dessinés par le cabinet Avantpropos.",
        "Ce T3 occupe le premier étage. Le séjour-cuisine de 40,5 m² traverse toute la profondeur de l'étage : exposition sur la rue d'un côté, sur l'arrière de l'autre, lumière toute la journée. Les deux chambres, de 14,2 m² et 9 m², sont en cœur de plan, à l'abri du bruit. L'étage est intégralement aménageable, sans aucun mur porteur central.",
      ],
      pourQui: "Couple primo-accédant ou famille qui s'agrandit : ce T3 a été pensé pour vous. Une place de stationnement sécurisée est comprise dans le prix.",
      accroche: "Un T3 traversant au premier étage, à deux pas du métro. Séjour-cuisine sur deux expositions, deux chambres en cœur de plan.",
      planImage: LOT2_PLAN,
      planCaption: '86 m² au premier étage - plan cabinet Avantpropos.',
      surfaces: [
        { piece: 'Entrée', aire: '7,3 m²' },
        { piece: 'Cellier', aire: '1,3+2,0 m²' },
        { piece: 'WC', aire: '1,3 m²' },
        { piece: 'Salle de bains', aire: '5,9 m²' },
        { piece: 'Chambre', aire: '9 m²' },
        { piece: 'Chambre', aire: '14,2 m²' },
        { piece: 'Séjour traversant', aire: '40,5 m²' },
      ],
      caracteristiques: [
        'Parquet',
        'Baie vitrée aluminium double vitrage',
        'Cuisine pré-équipée',
        'Salle de bains carrelée grand format',
        'Chauffage individuel',
        'Stationnement extérieur sécurisé',
        'Exposition traversante double',
        'Aucun mur porteur central',
      ],
      travaux: {
        phases: [
          {
            num: '01',
            titre: 'Le plan',
            texte: "Démolition des cloisons et redessin complet de l'étage, libéré de tout mur porteur central. Séjour-cuisine traversant ouvert sur les deux façades, deux chambres en cœur de plan, salle de bains, cellier et WC séparé.",
          },
          {
            num: '02',
            titre: "L'enveloppe",
            texte: 'Isolation thermique et acoustique renforcées. Menuiseries double vitrage neuves. Chauffage individuel neuf, ventilation maîtrisée.',
          },
          {
            num: '03',
            titre: 'Les finitions',
            texte: 'Livraison clé en main sur base des visuels 3D réalisés. Rénovation supervisée par une architecte, finitions soignées. Artisans sélectionnés.',
          },
        ],
      },
      etatActuel: {
        avantImage: LOT2_AVANT,
        avantCaption: 'Séjour-cuisine',
        projetImage: '/properties/muguets-lot-2-t3/photo-01.jpeg',
        projetCaption: 'Projet livré - séjour-cuisine traversant 40,5 m².',
      },
      dpeProjete: {
        classe: 'B',
        plage: '71 à 110 kWh/m²/an',
        unite: 'énergie primaire',
        intro: 'Classe visée au DPE projeté - 71 à 110 kWh/m²/an (énergie primaire).',
        note: 'DPE définitif établi à la livraison par un diagnostiqueur certifié.',
      },
      formules: {
        intro: "Vous achetez selon deux logiques. Brut, vous entrez pendant le chantier et choisissez vous-même les sols, les murs, la cuisine et les salles d'eau : le logement se façonne entièrement à votre image. Prêt à habiter, Versi vous le livre fini, dessiné avec une architecte qui vous accompagne jusqu'à la remise des clés. Le bâti, les surfaces et les garanties restent identiques - vous choisissez seulement votre degré d'implication.",
        brut: {
          label: 'Brut',
          price: '176 300 €',
          livraison: 'Livraison octobre 2026',
          description: "Versi vous livre l'appartement transformé : démolition des cloisons, redistribution, ouverture des baies, isolation thermique et acoustique, menuiseries double vitrage, chauffage et ventilation. Vous prenez la main sur sols, murs, cuisine et salle de bains.",
        },
        pretAHabiter: {
          label: 'Prêt à habiter',
          price: '232 200 €',
          livraison: 'Livraison décembre 2026',
          description: "Cahier des charges arrêté avec une architecte, validation des matériaux à chaque étape, suivi du chantier jusqu'à la remise des clés. Artisans sélectionnés et coordonnés par Versi. Mobilier et aménagements sur mesure proposés et chiffrables en option.",
        },
        garanties: 'Livraison brut en octobre 2026, prêt à habiter en décembre 2026. Garanties dommages-ouvrage et décennale identiques dans les deux cas.',
      },
      architecte: {
        titre: 'Une architecte sur tout le projet',
        texte: "Le projet livré est entièrement customisable : achetable brut ou totalement fini, selon vos envies. Il est dessiné par Louise Holleman, architecte d'intérieur et fondatrice de HOLLEMAN INTERIORS, qui signe des intérieurs résidentiels et des lieux de caractère dans les Hauts-de-France et à Paris (République à La Madeleine, Unité à Paris, Salomé à Lille). Elle choisit les matériaux avec vous et suit le chantier jusqu'à la remise des clés - sa prestation est comprise dans l'offre Versi.",
      },
      reperesMarche: {
        intro: "Livré clé en main à 232 200 €, ce T3 ressort à 2 700 €/m² hors parking - environ 31 % sous la médiane des T3 vendus à Lille-Sud en 2025.",
        rows: [
          { ref: 'T3 existant - Lille-Sud', sousTitre: 'Médiane DVF · 2025', prixM2: '~ 3 910 €' },
          { ref: 'Appartement existant - Vauban-Esquermes', sousTitre: 'Quartier limitrophe · efficity 2026', prixM2: '~ 3 650 €' },
          { ref: 'Ce T3 - prêt à habiter', sousTitre: 'Versi · 2026', prixM2: '~ 2 700 €' },
        ],
      },
      aPrevoir: {
        intro: 'Estimations indicatives, à valider sur les budgets définitifs.',
        sources: 'Sources : ma-nego.fr (charges) · calculmalin.fr + mairie de Lille (taxe foncière) · barème national (frais notaire).',
        items: [
          { label: 'Charges copro · mois', valeur: '~ 107 €' },
          { label: 'Taxe foncière · an', valeur: '~ 1 100 €' },
          { label: 'Frais de notaire', valeur: '~ 16 700 €' },
        ],
      },
      calendrier: [
        { label: 'Préparation des travaux', date: 'Été 2026', statut: 'En cours' },
        { label: 'Livraison brut', date: 'Octobre 2026', statut: 'Programmé' },
        { label: 'Vous prenez possession', date: 'Décembre 2026', statut: 'Prêt à habiter' },
      ],
      bandeauPrix: {
        prixVedette: '232 200 €',
        sousTitre: 'Prêt à habiter · place de parking incluse · livraison décembre 2026',
        formules: 'Deux formules au choix',
        brutLigne: 'Brut 176 300 € - Livraison octobre 2026',
        pretAHabiterLigne: 'Prêt à habiter 232 200 € - Livraison décembre 2026',
        statut: 'Disponible',
        modalite: 'Vente classique · Garanties Versi à la livraison',
        notaire: 'Frais de notaire ~ 7,5 %',
      },
      mentions: "Document non contractuel établi à titre indicatif. Surfaces, prix et calendrier susceptibles d'évolution jusqu'à la signature de l'acte. Visuels et plans non contractuels.",
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
    nearby_amenities: 'Écoles maternelles Florian et La Briqueterie, école élémentaire Turgot (rue du Faubourg des Postes), collège Louise Michel. Crèches municipales Marie Curie et Les P\'tits Minouches. Parc du Grand Sud (4 hectares). Centre commercial Lillenium (rue du Faubourg des Postes, une centaine d\'enseignes). CHU de Lille - Hôpital Roger Salengro dans le quartier (urgences adultes et pédiatriques).',
    type: 'Duplex',
    surface: '137 m²',
    rooms: 5,
    price: '274 000 €',
    price_num: 274000,
    price_note: 'Prix avant travaux, hors frais de notaire. Option prêt à habiter : 342 500 €.',
    status: 'disponible',
    dpe: 'B',
    dpe_note: 'Classe visée au DPE projeté : B (71-110 kWh/m²/an, énergie primaire). DPE définitif établi à la livraison.',
    floor: '2e - 3e',
    tenancy: 'Libre',
    renovation_year: null,
    charges: '~ 170 €/mois (estimation indicative)',
    description: `Cinq pièces sur deux niveaux. Un séjour-cuisine de 42 m² qui s'élève sous un plafond cathédrale, trois chambres dont deux à l'étage, et une terrasse privative ouverte sur les toits et le clocher du quartier. Une place de parking sécurisée. Aux deux derniers étages d'un ancien immeuble de bureaux que Versi réhabilite entièrement.

Au 2e, l'entrée ouvre sur un séjour-cuisine de 42 m² qui prend toute sa hauteur sous un plafond cathédrale ; une première chambre de 17 m², une salle de bains et un cellier complètent le niveau. Un escalier mène au 3e : deux chambres de 15 m², une salle d'eau et, surtout, une terrasse privative. Plein ciel, ouverte sur les toits de Lille-Sud et le clocher voisin. Chauffage individuel. Place de parking extérieur sécurisé comprise.

L'immeuble, ancien bâtiment de bureaux, est intégralement transformé par Versi en 3 logements de qualité - dessinés par le cabinet Avantpropos. Finitions choisies pour durer : parquet, menuiseries double vitrage, salle de bains et salle d'eau carrelées grand format, cuisine pré-équipée. À 274 000 € avant travaux ou 342 500 € livré prêt à habiter. Livraison brut octobre 2026, prêt à habiter décembre 2026. Couvert par l'assurance dommages-ouvrage et la garantie décennale.

Pour visiter le duplex ou recevoir le dossier complet, contactez-nous.`,
    works: JSON.stringify([]),
    features: JSON.stringify([
      'Duplex 137 m² sur deux niveaux',
      'Séjour-cuisine 42 m² sous plafond cathédrale',
      'Terrasse privative 12 m² plein ciel sur les toits',
      'Trois chambres (17 m² au 2e, 15 m² × 2 au 3e)',
      'Parquet, baie vitrée aluminium double vitrage',
      'Chauffage individuel, ventilation maîtrisée',
      'Stationnement extérieur sécurisé inclus',
    ]),
    dossier: JSON.stringify({
      tagline: 'Lille-Sud · Lille (59)',
      hook: "Cinq pièces sur deux niveaux. Un séjour-cuisine de 42 m² qui s'élève sous un plafond cathédrale, trois chambres dont deux à l'étage, et une terrasse privative ouverte sur les toits et le clocher du quartier. Une place de parking sécurisée. Aux deux derniers étages d'un ancien immeuble de bureaux que Versi réhabilite entièrement.",
      intro: "Aux deux derniers étages du 10 rue des Muguets - un ancien immeuble de bureaux que Versi réhabilite entièrement. Livraison octobre 2026.",
      ficheTechnique: [
        { label: 'Type', value: 'Duplex' },
        { label: 'Surface', value: '137 m²' },
        { label: 'Pièces', value: '5' },
        { label: 'Extérieur', value: 'Terrasse 12 m²' },
        { label: 'Étage', value: '2e - 3e' },
        { label: 'Disponibilité', value: 'Oct. 2026' },
      ],
      emplacement: {
        prose: [
          "Le 10 rue des Muguets se situe entre le quartier des fleurs - résidentiel et paisible - et le CHU de Lille, dans un secteur en mutation depuis l'ouverture de Lillenium en 2020.",
          "Zone résidentielle calme, en pleine mutation depuis l'ouverture de Lillenium en 2020. Le centre commercial est à 7 minutes à pied ; le métro Porte des Postes - lignes 1 et 2, direct vers Lille-Flandres et le centre - à 12 minutes.",
        ],
        pois: [
          { n: 1, nom: 'Métro Porte des Postes', detail: 'lignes 1 & 2 · 12 min à pied' },
          { n: 2, nom: 'Métro Oscar Lambret', detail: 'M1 · 14 min à pied' },
          { n: 3, nom: 'CHU de Lille', detail: 'centre hospitalier' },
          { n: 4, nom: 'Lillenium', detail: 'centre commercial · 7 min' },
          { n: 5, nom: 'Les Halles du Sud', detail: 'marché de quartier' },
          { n: 6, nom: 'Parc du Grand Sud', detail: 'espace vert · 4 ha' },
          { n: 7, nom: 'Écoles & crèches', detail: 'maternelle → collège' },
        ],
        adresse: {
          label: 'Adresse',
          value: '10 rue des Muguets, 59000 Lille',
          note: 'Quartier des fleurs · Lille-Sud',
        },
        transports: {
          label: 'Transports',
          value: 'Métro Porte des Postes · 12 min à pied',
          note: 'Lille-Flandres en métro direct, lignes 1 & 2',
        },
        proximite: {
          label: 'À proximité',
          value: 'Lillenium · 7 min à pied',
          note: 'CHU · écoles · Parc du Grand Sud',
        },
      },
      leBien: [
        "Le bâtiment du 10 rue des Muguets a longtemps servi de bureaux. Son écriture contemporaine et sa parcelle traversante appelaient une seconde vie résidentielle. Versi l'a acquis pour en faire trois logements, dessinés par le cabinet Avantpropos.",
        "Ce duplex occupe les deux derniers étages. Au 2e, l'entrée ouvre sur un séjour-cuisine de 42 m² qui prend toute sa hauteur sous un plafond cathédrale ; une première chambre de 17 m², une salle de bains et un cellier complètent le niveau. Un escalier mène au 3e : deux chambres de 15 m², une salle d'eau et, surtout, une terrasse privative. Plein ciel, ouverte sur les toits de Lille-Sud et le clocher voisin, c'est l'endroit où l'on déjeune au soleil et où l'on reçoit l'été.",
      ],
      pourQui: "Famille qui cherche du volume, de la lumière et un vrai extérieur : ce duplex a été pensé pour vous. Une place de stationnement sécurisée est comprise dans le prix.",
      accroche: "Un séjour sous plafond cathédrale, une terrasse plein ciel sur les toits de Lille. Cinq pièces sur deux niveaux, à deux pas du métro.",
      planImage: LOT3_PLAN,
      planCaption: "137 m² sur deux niveaux - plan cabinet Avantpropos.",
      surfaces: [
        { piece: 'Entrée', aire: '10,4 m²' },
        { piece: 'Cellier', aire: '2,0 m²' },
        { piece: 'WC', aire: '1,3 m²' },
        { piece: 'Salle de bains', aire: '4,1 m²' },
        { piece: 'Chambre', aire: '17,0 m²' },
        { piece: 'Séjour-cuisine', aire: '42,2 m²' },
        { piece: 'Palier', aire: '12,4 m²' },
        { piece: 'Chambre', aire: '15,1 m²' },
        { piece: 'Chambre', aire: '15,4 m²' },
        { piece: 'Salle d\'eau', aire: '4,4 m²' },
      ],
      caracteristiques: [
        'Parquet',
        'Baie vitrée aluminium double vitrage',
        'Cuisine pré-équipée',
        'Séjour sous plafond cathédrale',
        'Salle de bains & salle d\'eau carrelées grand format',
        'Chauffage individuel',
        'Terrasse privative plein ciel',
        'Stationnement extérieur sécurisé',
      ],
      travaux: {
        phases: [
          {
            num: '01',
            titre: 'Le plan',
            texte: 'Démolition des cloisons et redessin complet des deux niveaux. Séjour-cuisine ouvert sous plafond cathédrale au 2e, trois chambres réparties sur les deux niveaux, salle de bains et salle d\'eau, création de l\'accès à la terrasse au 3e.',
          },
          {
            num: '02',
            titre: 'L\'enveloppe',
            texte: 'Isolation thermique et acoustique renforcées. Menuiseries double vitrage neuves. Chauffage individuel neuf, ventilation maîtrisée.',
          },
          {
            num: '03',
            titre: 'Les finitions',
            texte: 'Livraison clé en main sur base des visuels 3D réalisés. Rénovation supervisée par une architecte, finitions soignées. Artisans sélectionnés.',
          },
        ],
      },
      etatActuel: {
        avantImage: LOT3_AVANT,
        avantCaption: 'Séjour-cuisine',
        projetImage: '/properties/muguets-lot-3-duplex/photo-01.jpeg',
        projetCaption: 'Projet livré - séjour sous plafond cathédrale.',
      },
      dpeProjete: {
        classe: 'B',
        plage: '71 à 110 kWh/m²/an',
        unite: 'énergie primaire',
        intro: 'Classe visée au DPE projeté - 71 à 110 kWh/m²/an (énergie primaire).',
        note: 'DPE définitif établi à la livraison par un diagnostiqueur certifié.',
      },
      formules: {
        intro: "Vous achetez selon deux logiques. Brut, vous entrez pendant le chantier et choisissez vous-même les sols, les murs, la cuisine et les salles d'eau : le logement se façonne entièrement à votre image. Prêt à habiter, Versi vous le livre fini, dessiné avec une architecte qui vous accompagne jusqu'à la remise des clés. Le bâti, les surfaces et les garanties restent identiques - vous choisissez seulement votre degré d'implication.",
        brut: {
          label: 'Brut',
          price: '274 000 €',
          livraison: 'Livraison octobre 2026',
          description: "Versi vous livre l'appartement transformé : démolition des cloisons sur les deux niveaux, redistribution, ouverture des baies, création de l'accès à la terrasse, isolation thermique et acoustique, menuiseries double vitrage, chauffage et ventilation. Vous prenez la main sur sols, murs, cuisine, salle de bains et salle d'eau.",
        },
        pretAHabiter: {
          label: 'Prêt à habiter',
          price: '342 500 €',
          livraison: 'Livraison décembre 2026',
          description: "Cahier des charges arrêté avec une architecte, validation des matériaux à chaque étape, suivi du chantier jusqu'à la remise des clés. Artisans sélectionnés et coordonnés par Versi. Mobilier et aménagements sur mesure proposés et chiffrables en option.",
        },
        garanties: 'Livraison brut en octobre 2026, prêt à habiter en décembre 2026. Garanties dommages-ouvrage et décennale identiques dans les deux cas.',
      },
      architecte: {
        titre: 'Une architecte sur tout le projet',
        texte: "Le projet livré est entièrement customisable : achetable brut ou totalement fini, selon vos envies. Il est dessiné par Louise Holleman, architecte d'intérieur et fondatrice de HOLLEMAN INTERIORS, qui signe des intérieurs résidentiels et des lieux de caractère dans les Hauts-de-France et à Paris (République à La Madeleine, Unité à Paris, Salomé à Lille). Elle choisit les matériaux avec vous et suit le chantier jusqu'à la remise des clés - sa prestation est comprise dans l'offre Versi.",
      },
      reperesMarche: {
        intro: "Livré clé en main à 342 500 €, ce duplex ressort à 2 500 €/m² hors parking - sous la médiane des grandes surfaces vendues à Lille-Sud en 2024-2025.",
        rows: [
          { ref: 'Grand appartement existant - Lille-Sud', sousTitre: 'Médiane DVF · 2024-2025', prixM2: '~ 3 200 €' },
          { ref: 'Appartement existant - Vauban-Esquermes', sousTitre: 'Quartier limitrophe · efficity 2026', prixM2: '~ 3 650 €' },
          { ref: 'Ce duplex - prêt à habiter', sousTitre: 'Versi · 2026', prixM2: '~ 2 500 €' },
        ],
      },
      aPrevoir: {
        intro: 'Estimations indicatives, à valider sur les budgets définitifs.',
        sources: 'Sources : ma-nego.fr (charges) · calculmalin.fr + mairie de Lille (taxe foncière) · barème national (frais notaire).',
        items: [
          { label: 'Charges copro · mois', valeur: '~ 170 €' },
          { label: 'Taxe foncière · an', valeur: '~ 1 750 €' },
          { label: 'Frais de notaire', valeur: '~ 25 000 €' },
        ],
      },
      calendrier: [
        { label: 'Préparation des travaux', date: 'Été 2026', statut: 'En cours' },
        { label: 'Livraison brut', date: 'Octobre 2026', statut: 'Programmé' },
        { label: 'Vous prenez possession', date: 'Décembre 2026', statut: 'Prêt à habiter' },
      ],
      bandeauPrix: {
        prixVedette: '342 500 €',
        sousTitre: 'Prêt à habiter · place de parking incluse · livraison décembre 2026',
        formules: 'Deux formules au choix',
        brutLigne: 'Brut 274 000 € - Livraison octobre 2026',
        pretAHabiterLigne: 'Prêt à habiter 342 500 € - Livraison décembre 2026',
        statut: 'Disponible',
        modalite: 'Vente classique · Garanties Versi à la livraison',
        notaire: 'Frais de notaire ~ 7,5 %',
      },
      mentions: "Document non contractuel établi à titre indicatif. Surfaces, prix et calendrier susceptibles d'évolution jusqu'à la signature de l'acte. Visuels et plans non contractuels.",
    }),
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
      console.log(`[seed-muguets] Upserted: ${prop.id} - ${prop.title}`);
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
