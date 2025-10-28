const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
require('dotenv').config();

// 5 nouveaux parcours VTT à importer (non-doublons)
const nouveauxVttParcours = [
  {
    nom: "VTT Le Kiosque Jean Lauret depuis Bois d'Olives",
    distance: 24.45,
    duree: { heures: 2, minutes: 0 },
    denivele_positif: 644,
    denivele_negatif: 640,
    difficulte: "Modéré",
    type: "VTT",
    region: "Sud",
    zone_specifique: "Région de Bois Court",
    commune_depart: "Saint-Pierre",
    description_complete: "Parcours vers le Kiosque Jean Lauret, un point de vue remarquable dans les hauts de Saint-Pierre. Cet itinéraire offre de beaux panoramas sur la région sud de l'île et permet de découvrir des sites moins connus mais tout aussi spectaculaires.",
    source: "Visorandonneur"
  },
  {
    nom: "VTT À la découverte des hauts de la Rivière",
    distance: 21.28,
    duree: { heures: 2, minutes: 0 },
    denivele_positif: 746,
    denivele_negatif: 743,
    difficulte: "Difficile",
    type: "VTT",
    region: "Ouest",
    zone_specifique: "Région de Bois d'Olive et Saint-Louis",
    commune_depart: "Saint-Louis",
    description_complete: "Cette sortie VTT permet de découvrir les hauts de la Rivière. Elle offre de beaux panoramas sur les plaines, la chaîne de la Plaine du Bois de Nèfles, le littoral Sud, sur certains quartiers de l'Entre-Deux et le Dimitile. On peut même apercevoir le Gros Morne et le Piton des Neiges lorsque le temps le permet. Si vous voulez bénéficier du panorama, venez lorsque les cannes sont coupées, le spectacle est plus grandiose !",
    source: "Visorandonneur"
  },
  {
    nom: "VTT Les Canaux et le tour du Gol les Hauts",
    distance: 11.66,
    duree: { heures: 1, minutes: 0 },
    denivele_positif: 343,
    denivele_negatif: 348,
    difficulte: "Modéré",
    type: "VTT",
    region: "Ouest",
    zone_specifique: "Région de Bois d'Olive et Saint-Louis",
    commune_depart: "Saint-Louis",
    description_complete: "Cette balade permet de découvrir les Canaux, un petit village dans les hauts de Saint-Louis, et le Gol les hauts qui est un quartier de la Rivière. Elle offre quelques panoramas sur cette région de l'île. Cet itinéraire peut se poursuivre par une randonnée (sportive ou familiale, il y en a pour tout les niveaux) car nous croiserons plusieurs départ de sentier.",
    source: "Visorandonneur"
  },
  {
    nom: "VTT De l'Étang-Salé-les-Hauts aux Avirons",
    distance: 13.84,
    duree: { heures: 1, minutes: 0 },
    denivele_positif: 342,
    denivele_negatif: 342,
    difficulte: "Modéré",
    type: "VTT",
    region: "Ouest",
    zone_specifique: "Etang Salé les Hauts ou Avirons",
    commune_depart: "L'Étang-Salé",
    description_complete: "Cet itinéraire, court et avec peu de difficulté permet de découvrir le quartier de la Ravine Sèche ! Très peu emprunté par les touristes, la D18 offre pourtant de beaux panoramas sur le Sud de l'île tout en serpentant dans les mi-hauteurs entre l'Étang-Salé-les-Hauts et les Avirons. Cet itinéraire peu aussi ce faire en vélo de route.",
    source: "Visorandonneur"
  },
  {
    nom: "VTT Le Chemin de l'Entre-Deux",
    distance: 11.93,
    duree: { heures: 1, minutes: 30 },
    denivele_positif: 579,
    denivele_negatif: 574,
    difficulte: "Difficile",
    type: "VTT",
    region: "Ouest",
    zone_specifique: "Etang Salé les Hauts ou Avirons",
    commune_depart: "L'Étang-Salé",
    description_complete: "Très peu connu, c'est le seul chemin qui permet d'accéder à l'Entre-Deux-des-Canots. En lacets, il offre de beaux panoramas sur le Sud de l'île ! C'est aussi le seul point d'accès pour aller au Piton de la Croix, piton qui nous accompagnera du début à la fin. Le chemin, long de 6 kilomètres se termine au pied du Piton de la Croix au lieu-dit \"La Fenêtre\" ou quelques personnes y vivent, éloignés de tout. Cette sortie est cependant difficile a cause de certaines parties qui sont raides.",
    source: "Visorandonneur"
  }
];

async function importNouveauxVTTParcours() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connexion MongoDB établie');
    
    let imported = 0;
    let skipped = 0;
    
    for (const parcours of nouveauxVttParcours) {
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
      const regionCoords = {
        'Ouest': { lng: 55.25, lat: -21.15 },
        'Sud': { lng: 55.45, lat: -21.25 },
        'Est': { lng: 55.65, lat: -21.05 },
        'Nord': { lng: 55.45, lat: -20.95 }
      };
      
      const baseCoords = regionCoords[parcours.region] || { lng: 55.45, lat: -21.1 };
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
          altitude: Math.round(Math.random() * 600 + 200),
          acces_voiture: true,
          parking_disponible: true,
          description_acces: `Point de départ accessible depuis ${parcours.commune_depart}`
        },
        points_interet: [],
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
    
    console.log(`\n📊 RÉSULTAT IMPORT NOUVEAUX VTT:`);
    console.log(`   ✅ ${imported} nouveaux parcours VTT importés`);
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
importNouveauxVTTParcours();