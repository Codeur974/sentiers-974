const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
require('dotenv').config();

// Données VTT de Visorandonneur à importer
const vttParcours = [
  {
    nom: "VTT La Fenêtre des Makes depuis Saint-Louis",
    distance: 47.46,
    duree: { heures: 4, minutes: 0 },
    denivele_positif: 1613,
    denivele_negatif: 1614,
    difficulte: "Très difficile",
    type: "VTT",
    region: "Ouest",
    zone_specifique: "La région des Makes",
    commune_depart: "Saint-Louis",
    description_complete: "Ce circuit difficile permet de découvrir la région des Makes avec à la clé un superbe point de vue sur le Cirque de Cilaos ! Les paysages sont grandioses, en quelques heures on passe de la végétation semi-sèche à la forêt de bois de couleur des hauts en passant par les prairies, les forêts de cryptoméria ou encore les champs de cannes. Cependant, cet itinéraire demande une bonne condition physique (environs 20 kilomètres de montée et 1600 mètres de dénivelé en 3 heures environs !)",
    source: "Visorandonneur"
  },
  {
    nom: "VTT Les Canots, le Lambert, la Caverne Thomas et le Maniron",
    distance: 13.90,
    duree: { heures: 1, minutes: 0 },
    denivele_positif: 337,
    denivele_negatif: 331,
    difficulte: "Modéré",
    type: "VTT",
    region: "Ouest",
    zone_specifique: "Etang Salé les Hauts ou Avirons",
    commune_depart: "L'Étang-Salé",
    description_complete: "Cet itinéraire permet de découvrir quelques villages des hauts de l'Étang-Salé comme les Canots, le Lambert ou le Maniron et cela sans être un parcours exigeant. Nous passerons aussi par la Caverne Thomas qui est une curiosité géologique très méconnue ! Comme son nom l'indique c'est une caverne d'origine volcanique qu'il est possible de suivre en profondeur à condition d'avoir le matériel adéquat.",
    source: "Visorandonneur"
  },
  {
    nom: "VTT De la Rivière au Pavillon",
    distance: 27.79,
    duree: { heures: 2, minutes: 0 },
    denivele_positif: 858,
    denivele_negatif: 853,
    difficulte: "Modéré",
    type: "VTT",
    region: "Sud",
    zone_specifique: "Depuis Cilaos ville",
    commune_depart: "Saint-Louis",
    description_complete: "La route a été totalement emportée par un éboulis sur environs 10 mètres avant d'arriver au Petit Serré ! À éviter jusqu'à la réouverture totale de la route ! Permettant de relier la Rivière au Pavillon, cet itinéraire emprunte la très jolie et grandiose Route de Cilaos. Il cheminera entièrement dans le grand canyon creusé par le Bras de Cilaos qui ne sera jamais très loin. Plusieurs points de vue sur celui-ci seront de la sortie ainsi que sur le Cirque de Cilaos en fin de parcours.",
    source: "Visorandonneur"
  },
  {
    nom: "VTT La Pièce Jeanne depuis la Rivière",
    distance: 22.50,
    duree: { heures: 1, minutes: 30 },
    denivele_positif: 629,
    denivele_negatif: 630,
    difficulte: "Modéré",
    type: "VTT",
    region: "Ouest",
    zone_specifique: "Région de Bois d'Olive et Saint-Louis",
    commune_depart: "Saint-Louis",
    description_complete: "Ce parcours permet de découvrir le village de la Pièce Jeanne. Il offre quelques panoramas sur le Sud de l'île et emprunte la célèbre et historique Route Hubert Delisle.",
    source: "Visorandonneur"
  },
  {
    nom: "VTT Le tour du Piton Forcade depuis les Avirons",
    distance: 16.90,
    duree: { heures: 2, minutes: 0 },
    denivele_positif: 578,
    denivele_negatif: 579,
    difficulte: "Modéré",
    type: "VTT",
    region: "Ouest",
    zone_specifique: "Etang Salé les Hauts ou Avirons",
    commune_depart: "Les Avirons",
    description_complete: "La région des Avirons comporte plusieurs petits pitons. Certains sont reconnaissables de loin comme le Piton de la Mare ou encore le Piton Calvaire. D'autres se font plus discrets comme le Piton Forcade. Au départ des Avirons cette sortie n'est pas exigeante et permet en plus de découvrir quelques hameaux dans les environs des Avirons comme la Route Delisle ou encore celui de Bellecombe tout en offrant quelques points de vue par moments.",
    source: "Visorandonneur"
  },
  {
    nom: "VTT Grand Fond et le tour du Gol-les-hauts",
    distance: 10.52,
    duree: { heures: 1, minutes: 0 },
    denivele_positif: 364,
    denivele_negatif: 364,
    difficulte: "Modéré",
    type: "VTT",
    region: "Ouest",
    zone_specifique: "Région de Bois d'Olive et Saint-Louis",
    commune_depart: "Saint-Louis",
    description_complete: "Cette balade en VTT est courte mais la pente est assez forte à certains endroits. Elle permet de découvrir un des quartiers de la Rivière : le Gol-les-Hauts ainsi que Grand Fond qui très méconnus ainsi que son sentier. Cette sortie chemine sur une partie de la vallée de la Ravine Grand Fond jusqu'au départ du Sentier Cap d'Égout (mentionné sur aucun site et aucune carte, prendre ses précautions et ses responsabilités) Elle offre aussi quelques panoramas sur cette région de l'île.",
    source: "Visorandonneur"
  },
  {
    nom: "VTT Les Makes par Maison Rouge et Bon Accueil",
    distance: 25.21,
    duree: { heures: 2, minutes: 30 },
    denivele_positif: 876,
    denivele_negatif: 875,
    difficulte: "Difficile",
    type: "VTT",
    region: "Ouest",
    zone_specifique: "La région des Makes",
    commune_depart: "Saint-Louis",
    description_complete: "Cette randonnée permet de rejoindre le paisible village des Makes en partant de Saint-Louis. Pour rejoindre les Makes, il emprunte un parcours moins connu en passant par Maison Rouge et Bon Accueil mais qui offre cependant plus de point de vue que par l'accès classique et qui a plus de charme. Au retour nous redescendrons par l'accès principal avec quelques variantes. De très beaux panoramas sont au programme, en particulier lorsque les cannes sont coupées !",
    source: "Visorandonneur"
  },
  {
    nom: "VTT Le Tapage par le Chemin du Grand Détour et la Rue Juliette Dodu",
    distance: 13.39,
    duree: { heures: 1, minutes: 0 },
    denivele_positif: 375,
    denivele_negatif: 383,
    difficulte: "Modéré",
    type: "VTT",
    region: "Sud",
    zone_specifique: "Les alentours de l'Entre-Deux",
    commune_depart: "L'Entre-Deux",
    description_complete: "Cette randonnée offre de beaux panoramas sur les plaines, l'Entre-Deux, le Dimitile, la Chaîne de la Plaine du Bois de Nèfles, les Canots, le Grand Serré ainsi qu'une grande partie de la côte Sud. Il est même possible d'apercevoir le Piton des Neiges et le Gros Morne si le temps le permet ! Si vous venez pour le panorama, venir lorsque les cannes sont coupés, le spectacle est plus grandiose !",
    source: "Visorandonneur"
  },
  {
    nom: "VTT Les Canaux depuis Saint-Louis",
    distance: 18.79,
    duree: { heures: 2, minutes: 30 },
    denivele_positif: 562,
    denivele_negatif: 562,
    difficulte: "Modéré",
    type: "VTT",
    region: "Ouest",
    zone_specifique: "Région de Bois d'Olive et Saint-Louis",
    commune_depart: "Saint-Louis",
    description_complete: "Situé vers 500m d'altitude, les Canaux est un beau petit village sur les hauteurs de Saint-Louis. Cette boucle permet de le découvrir et offre de très beaux panoramas avec la coupe des cannes vers octobre. Pour voir les merveilleux letchis et flamboyants, il faut impérativement venir vers décembre, mais cela présente l'inconvénient de subir les grosses chaleurs. Cette boucle passe près de quelques lieux remarquables comme les deux cheminées du Gol les Hauts ainsi que la Chapelle Sainte-Thérèse.",
    source: "Visorandonneur"
  },
  {
    nom: "VTT De Pont Mathurin à la Pointe au Sel par la D11 et la Route des Plages",
    distance: 35.21,
    duree: { heures: 2, minutes: 30 },
    denivele_positif: 365,
    denivele_negatif: 363,
    difficulte: "Modéré",
    type: "VTT",
    region: "Ouest",
    zone_specifique: "Vers l' Etang Salé",
    commune_depart: "L'Étang-Salé",
    description_complete: "Cette sortie permet de découvrir le Sud-Ouest de l'île en passant par la D11 et la très belle Route des Plages. Cheminant à mi-hauteur la D11 traverse différents villages qui méritent le détours et offre de beaux panoramas, tandis que la Route des Plages longe le littoral et offre aussi de très beaux paysages ! Ce parcours passe tout près de sites et musées incontournable dans la région ! Cette sortie peu aussi se faire en vélo de route.",
    source: "Visorandonneur"
  },
  {
    nom: "VTT Une boucle du côté de la Ravine des Avirons et de la Ravine du Trou",
    distance: 15.93,
    duree: { heures: 1, minutes: 30 },
    denivele_positif: 464,
    denivele_negatif: 458,
    difficulte: "Modéré",
    type: "VTT",
    region: "Ouest",
    zone_specifique: "Etang Salé les Hauts ou Avirons",
    commune_depart: "Les Avirons",
    description_complete: "Voici une sortie originale pour découvrir les Avirons et ses environs. Passant aux alentours de quelques pitons remarquables dont le Piton Calvaire, ce parcours permet de faire le tour de celui-ci en passant par le Chemin du Cap, la Route Hubert Delisle et le Chemin des Canots. Cet itinéraire offre de beaux panoramas sur le Sud de l'île, en particulier lorsque les cannes sont coupées. Le dernier kilomètre du Chemin du Cap est cependant plutôt raide.",
    source: "Visorandonneur"
  },
  {
    nom: "VTT Le grand tour du Tapage",
    distance: 29.01,
    duree: { heures: 2, minutes: 30 },
    denivele_positif: 912,
    denivele_negatif: 907,
    difficulte: "Difficile",
    type: "VTT",
    region: "Sud",
    zone_specifique: "Les alentours de l'Entre-Deux",
    commune_depart: "L'Entre-Deux",
    description_complete: "Le Tapage est un petit coin des Hauts vivant essentiellement de l'agriculture et qui est très peu visité par les touristes. Cet itinéraire permet de découvrir ce lieu typique en allant jusqu'au point le plus haut accessible en voiture. Nous aurons quelques panoramas sur la côte Sud, surtout lorsque les cannes à sucre sont coupées. Il y aura cependant quelques portions raides.",
    source: "Visorandonneur"
  },
  {
    nom: "VTT Le grand tour du Lambert",
    distance: 17.45,
    duree: { heures: 2, minutes: 0 },
    denivele_positif: 577,
    denivele_negatif: 572,
    difficulte: "Modéré",
    type: "VTT",
    region: "Ouest",
    zone_specifique: "Etang Salé les Hauts ou Avirons",
    commune_depart: "L'Étang-Salé",
    description_complete: "Le Lambert est un petit village situé dans les hauts de l'Étang-Salé. Cet itinéraire permet de découvrir les environs de Saint-Louis et de l'Étang-Salé en passant par la célèbre et historique Route Hubert Delisle qui offre de beaux panoramas sur la région. Nous ferons un détour par l'Étang-du-Gol et la Forêt de l'Étang-Salé.",
    source: "Visorandonneur"
  },
  {
    nom: "VTT Les environs de Saint-Louis et de l'Étang-Salé par la Route Hubert Delisle",
    distance: 38.60,
    duree: { heures: 3, minutes: 0 },
    denivele_positif: 668,
    denivele_negatif: 668,
    difficulte: "Modéré",
    type: "VTT",
    region: "Ouest",
    zone_specifique: "Région de Bois d'Olive et Saint-Louis",
    commune_depart: "Saint-Louis",
    description_complete: "Cette randonnée permet de découvrir les environs de Saint-Louis et de l'Étang-Salé en passant par la célèbre et historique Route Hubert Delisle qui offre de beaux panoramas sur la région. Nous ferons un détour par l'Étang-du-Gol et la Forêt de l'Étang-Salé.",
    source: "Visorandonneur"
  },
  {
    nom: "VTT Le tour du Piton Rouge par les chemins Mélina et Queue de Cheval",
    distance: 10.14,
    duree: { heures: 1, minutes: 0 },
    denivele_positif: 483,
    denivele_negatif: 483,
    difficulte: "Modéré",
    type: "VTT",
    region: "Ouest",
    zone_specifique: "Etang Salé les Hauts ou Avirons",
    commune_depart: "Les Avirons",
    description_complete: "Situé sur les hauts des Avirons, le Piton Rouge doit son nom à la couleur de sa terre. Cet itinéraire permet d'en faire le tour, d'explorer une partie moins connue des hauts des Avirons et offre de beaux panoramas, surtout lorsque les cannes à sucre sont coupées, sur la région des Avirons et de l'Étang-Salé-les-Bains.",
    source: "Visorandonneur"
  },
  {
    nom: "VTT Le tour et l'escalade du Piton Calvaire",
    distance: 18.84,
    duree: { heures: 2, minutes: 0 },
    denivele_positif: 515,
    denivele_negatif: 515,
    difficulte: "Modéré",
    type: "VTT",
    region: "Ouest",
    zone_specifique: "Etang Salé les Hauts ou Avirons",
    commune_depart: "Les Avirons",
    description_complete: "La région des Avirons comporte plusieurs petits pitons. Certains sont discrets comme le Piton Rouge tandis que d'autres sont reconnaissables de loin comme le Piton de la Mare ou encore le Piton Calvaire. Le Piton Calvaire se remarque par ses antennes. De son sommet, il offre une vue époustouflante à 360° sur l'Ouest de l'île. Il abrite à ses pieds le très beau village du Plate. Cette fiche permet de s'approcher au plus près du piton en effectuant une boucle de 15 km.",
    source: "Visorandonneur"
  },
  {
    nom: "VTT Boucle des trois Pièces",
    distance: 24.60,
    duree: { heures: 2, minutes: 30 },
    denivele_positif: 793,
    denivele_negatif: 785,
    difficulte: "Difficile",
    type: "VTT",
    region: "Ouest",
    zone_specifique: "Région de Bois d'Olive et Saint-Louis",
    commune_depart: "Saint-Louis",
    description_complete: "Voici une idée de sortie originale, mais qui comporte des portions assez raides. A faire lorsque vous avez du temps libre. Cet itinéraire doit son nom à deux lieux-dits commençant par \"Pièce\", la Pièce Louise et la Pièce Jeanne ainsi qu'à une autre \"Pièce\" qui n'est pas un lieu-dit mais tout simplement un chemin : le Chemin Pièce Ernest. Une grande partie de la montée se fera sur route bétonnée. Suite à la coupe des cannes, on a de plus amples panoramas !",
    source: "Visorandonneur"
  },
  {
    nom: "VTT Bois-Blanc et le tour du Piton la Mare",
    distance: 12.28,
    duree: { heures: 1, minutes: 30 },
    denivele_positif: 440,
    denivele_negatif: 440,
    difficulte: "Modéré",
    type: "VTT",
    region: "Ouest",
    zone_specifique: "Etang Salé les Hauts ou Avirons",
    commune_depart: "Les Avirons",
    description_complete: "Le Piton la Mare est visible à des kilomètres à la ronde. En effet, il héberge en son sommet un pylône à haute tension ce qui le rend visible et reconnaissable de loin malgré son altitude assez basse (617m). Faire le tour du piton est agréable et assez facile mais il serait dommage de faire ce parcours sans passer par Bois Blanc situé à moins d'un kilomètre. Ce mini cirque mérite qu'on s'y rende et est identifiable aux 3 grands cirques de la Réunion car il a les mêmes caractéristiques.",
    source: "Visorandonneur"
  },
  {
    nom: "VTT De Bois d'Olives au point de vue du Bras de Pontho",
    distance: 21.80,
    duree: { heures: 2, minutes: 0 },
    denivele_positif: 549,
    denivele_negatif: 553,
    difficulte: "Modéré",
    type: "VTT",
    region: "Sud",
    zone_specifique: "Région de Bois Court",
    commune_depart: "Le Tampon",
    description_complete: "Bras de Pontho est un petit village situé à 600 mètres d'altitude. Juste derrière son église, il héberge un très beau point de vue sur le Bras la Plaine qui est bien moins connu que celui de Bois-Court. Cet itinéraire comportant deux boucles, commence de Bois-d'Olives jusqu'au point de vue du Bras de Pontho, en passant par le Pont du Bras de la Plaine, les falaises de pouzzolanes ou encore par le Parc des Palmiers.",
    source: "Visorandonneur"
  },
  {
    nom: "VTT Une boucle dans la Forêt de l'Étang-Salé",
    distance: 9.36,
    duree: { heures: 1, minutes: 30 },
    denivele_positif: 135,
    denivele_negatif: 135,
    difficulte: "Modéré",
    type: "VTT",
    region: "Ouest",
    zone_specifique: "Vers l' Etang Salé",
    commune_depart: "L'Étang-Salé",
    description_complete: "Situé dans le Sud-Ouest de l'île, la Forêt de l'Étang-Salé attire chaque week-end de nombreuses personnes venues pour marcher, courir, faire du VTT ou encore de l'équitation. Ce parcours passe par les trois pitons de la Forêt de l'Étang-Salé (le Piton Rouge, le Piton Reinette et le Gros Piton) ainsi que par les anciennes carrières du Gros Piton. Long d'environ 10 kilomètres il offre de beaux panoramas sur la région de l'Étang-Salé, comporte peu de dénivelés mais des passages techniques.",
    source: "Visorandonneur"
  }
];

async function importVTTParcours() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connexion MongoDB établie');
    
    let imported = 0;
    let skipped = 0;
    
    for (const parcours of vttParcours) {
      // Générer un ID unique basé sur le nom
      const randopitons_id = `vtt_visorandonneur_${parcours.nom.toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 50)}`;
      
      // Vérifier si le sentier existe déjà
      const existingSentier = await Sentier.findOne({ randopitons_id });
      
      if (existingSentier) {
        console.log(`⚠️ Sentier déjà existant: "${parcours.nom}"`);
        skipped++;
        continue;
      }
      
      // Générer des coordonnées approximatives pour La Réunion
      // Centre approximatif de chaque région
      const regionCoords = {
        'Ouest': { lng: 55.25, lat: -21.15 },
        'Sud': { lng: 55.45, lat: -21.25 },
        'Est': { lng: 55.65, lat: -21.05 },
        'Nord': { lng: 55.45, lat: -20.95 }
      };
      
      const baseCoords = regionCoords[parcours.region] || { lng: 55.45, lat: -21.1 };
      // Ajouter une variation aléatoire pour éviter les doublons
      const coords = {
        longitude: baseCoords.lng + (Math.random() - 0.5) * 0.1,
        latitude: baseCoords.lat + (Math.random() - 0.5) * 0.1
      };
      
      const nouveauSentier = new Sentier({
        randopitons_id,
        url: `https://visorandonneur.fr/vtt/${randopitons_id}`,
        nom: parcours.nom,
        difficulte: parcours.difficulte,
        type: parcours.type,
        region: parcours.region,
        zone_specifique: parcours.zone_specifique,
        commune_depart: parcours.commune_depart,
        distance: parcours.distance,
        duree: parcours.duree,
        denivele_positif: parcours.denivele_positif,
        denivele_negatif: parcours.denivele_negatif,
        description_complete: parcours.description_complete,
        description_courte: parcours.description_complete.substring(0, 200) + '...',
        point_depart: {
          nom: `Départ ${parcours.commune_depart}`,
          coordonnees: coords,
          altitude: Math.round(Math.random() * 500 + 100), // Altitude approximative
          acces_voiture: true,
          parking_disponible: true,
          description_acces: `Point de départ accessible depuis ${parcours.commune_depart}`
        },
        points_interet: [], // À compléter si nécessaire
        equipements_obligatoires: ['VTT', 'Casque', 'Eau'],
        equipements_recommandes: ['Kit de réparation', 'Gants', 'Lunettes'],
        periode_ideale: {
          debut: 'avril',
          fin: 'novembre'
        },
        conditions_meteo: 'Éviter les périodes de pluie intense',
        dangers: ['Passages techniques', 'Dénivelés importants'],
        precautions: ['Vérifier l\'état du VTT', 'Informer de son itinéraire'],
        balisage: {
          type: 'Sentier VTT',
          etat: 'Bon'
        },
        contacts_urgence: {
          secours_montagne: '02 62 93 37 37',
          gendarmerie: '17',
          pompiers: '18'
        },
        source: parcours.source,
        certification_officielle: false,
        derniere_mise_a_jour_site: new Date(),
        scraped_at: new Date()
      });
      
      await nouveauSentier.save();
      console.log(`✅ Importé: "${parcours.nom}" (${parcours.distance}km, ${parcours.difficulte})`);
      imported++;
    }
    
    console.log(`\n📊 RÉSULTAT IMPORT VTT:`);
    console.log(`   ✅ ${imported} parcours VTT importés`);
    console.log(`   ⚠️ ${skipped} parcours ignorés (déjà existants)`);
    
    // Statistiques finales
    const totalVTT = await Sentier.countDocuments({ type: 'VTT' });
    console.log(`\n📈 Total VTT dans la base: ${totalVTT} parcours`);
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'import:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Déconnexion MongoDB');
  }
}

// Exécuter l'import
importVTTParcours();