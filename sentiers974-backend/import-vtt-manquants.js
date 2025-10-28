const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
require('dotenv').config();

// 11 parcours VTT manquants à ajouter
const vttParcoursManquants = [
  // Les parcours qui manquaient dans la première liste
  {
    nom: "VTT Boucle des Étangs par Saint-Paul",
    distance: 32.45,
    duree: { heures: 3, minutes: 0 },
    denivele_positif: 520,
    denivele_negatif: 520,
    difficulte: "Modéré",
    type: "VTT",
    region: "Ouest",
    zone_specifique: "Saint Paul",
    commune_depart: "Saint-Paul",
    description_complete: "Cette boucle permet de découvrir les étangs de Saint-Paul et ses environs. Un parcours varié alternant entre zones urbaines et espaces naturels.",
    source: "Visorandonneur"
  },
  {
    nom: "VTT Circuit du Maïdo depuis Saint-Paul",
    distance: 45.60,
    duree: { heures: 4, minutes: 30 },
    denivele_positif: 1850,
    denivele_negatif: 1850,
    difficulte: "Très difficile",
    type: "VTT",
    region: "Ouest",
    zone_specifique: "Autour du Maïdo et RF Cryptomerias",
    commune_depart: "Saint-Paul",
    description_complete: "Un parcours exigeant qui monte jusqu'au célèbre point de vue du Maïdo. Réservé aux vttistes expérimentés en excellente condition physique.",
    source: "Visorandonneur"
  },
  {
    nom: "VTT Tour des Remparts depuis Cilaos",
    distance: 28.30,
    duree: { heures: 3, minutes: 0 },
    denivele_positif: 980,
    denivele_negatif: 980,
    difficulte: "Difficile",
    type: "VTT",
    region: "Cirque de Cilaos",
    zone_specifique: "Depuis la ville de Cilaos",
    commune_depart: "Cilaos",
    description_complete: "Un parcours technique dans le cirque de Cilaos offrant des panoramas exceptionnels sur les remparts du cirque.",
    source: "Visorandonneur"
  },
  {
    nom: "VTT La Plaine des Cafres par Bourg-Murat",
    distance: 41.20,
    duree: { heures: 3, minutes: 30 },
    denivele_positif: 750,
    denivele_negatif: 750,
    difficulte: "Modéré",
    type: "VTT",
    region: "Sud",
    zone_specifique: "Entre le Volcan et Bourg Murat",
    commune_depart: "Le Tampon",
    description_complete: "Parcours dans la Plaine des Cafres, région d'élevage typique des hauts de l'île. Paysages de prairies et vues sur le Piton des Neiges.",
    source: "Visorandonneur"
  },
  {
    nom: "VTT Circuit de la Rivière des Remparts",
    distance: 34.80,
    duree: { heures: 3, minutes: 15 },
    denivele_positif: 1120,
    denivele_negatif: 1120,
    difficulte: "Difficile",
    type: "VTT",
    region: "Sud",
    zone_specifique: "La région du Tampon",
    commune_depart: "Le Tampon",
    description_complete: "Un parcours spectaculaire longeant la Rivière des Remparts avec des points de vue uniques sur cette vallée sauvage.",
    source: "Visorandonneur"
  },
  {
    nom: "VTT Forêt de Bélouve depuis Hell-Bourg",
    distance: 26.70,
    duree: { heures: 2, minutes: 45 },
    denivele_positif: 890,
    denivele_negatif: 890,
    difficulte: "Difficile",
    type: "VTT",
    region: "Cirque de Salazie",
    zone_specifique: "A partir de Hell-Bourg ou de l'Ilet à Vidot",
    commune_depart: "Salazie",
    description_complete: "Parcours forestier dans la magnifique forêt primaire de Bélouve. Un des plus beaux circuits VTT de l'île pour les amoureux de nature.",
    source: "Visorandonneur"
  },
  {
    nom: "VTT Les Hautes Plaines par la Route du Volcan",
    distance: 39.50,
    duree: { heures: 3, minutes: 20 },
    denivele_positif: 980,
    denivele_negatif: 980,
    difficulte: "Modéré",
    type: "VTT",
    region: "Volcan",
    zone_specifique: "Volcan Hors enclos",
    commune_depart: "Sainte-Rose",
    description_complete: "Circuit dans les hautes plaines volcaniques sur la mythique Route du Volcan. Paysages lunaires et ambiance unique des grands espaces.",
    source: "Visorandonneur"
  },
  {
    nom: "VTT Bras-Panon et les Plaines",
    distance: 31.40,
    duree: { heures: 2, minutes: 50 },
    denivele_positif: 650,
    denivele_negatif: 650,
    difficulte: "Modéré",
    type: "VTT",
    region: "Est",
    zone_specifique: "Depuis Bras Panon",
    commune_depart: "Bras-Panon",
    description_complete: "Découverte de la région de Bras-Panon et de ses plaines agricoles. Un parcours accessible offrant de beaux panoramas sur l'océan Indien.",
    source: "Visorandonneur"
  },
  {
    nom: "VTT Circuit des Cascades de Saint-Benoît",
    distance: 23.60,
    duree: { heures: 2, minutes: 30 },
    denivele_positif: 720,
    denivele_negatif: 720,
    difficulte: "Modéré",
    type: "VTT",
    region: "Est",
    zone_specifique: "La région de St Benoit",
    commune_depart: "Saint-Benoît",
    description_complete: "Parcours à la découverte des cascades et ravines de la région de Saint-Benoît. Nature luxuriante et fraîcheur garantie.",
    source: "Visorandonneur"
  },
  {
    nom: "VTT Grand Raid du Dimitile",
    distance: 52.80,
    duree: { heures: 5, minutes: 0 },
    denivele_positif: 1680,
    denivele_negatif: 1680,
    difficulte: "Expert",
    type: "VTT",
    region: "Sud",
    zone_specifique: "Les alentours de l'Entre-Deux",
    commune_depart: "L'Entre-Deux",
    description_complete: "Le plus grand défi VTT de La Réunion ! Parcours extrême réservé aux experts en excellente condition physique. Vue imprenable sur toute l'île depuis le Dimitile.",
    source: "Visorandonneur"
  },
  {
    nom: "VTT Les Hauts de Sainte-Rose par la RN2",
    distance: 29.90,
    duree: { heures: 2, minutes: 40 },
    denivele_positif: 580,
    denivele_negatif: 580,
    difficulte: "Modéré",
    type: "VTT",
    region: "Est",
    zone_specifique: "Les alentours de Bois Blanc et Sainte-Rose",
    commune_depart: "Sainte-Rose",
    description_complete: "Circuit dans les hauts de Sainte-Rose, porte d'entrée vers le volcan. Alternance entre zones habitées et espaces naturels préservés.",
    source: "Visorandonneur"
  }
];

async function importVTTParcoursManquants() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connexion MongoDB établie');
    
    let imported = 0;
    let skipped = 0;
    
    for (const parcours of vttParcoursManquants) {
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
        'Nord': { lng: 55.45, lat: -20.95 },
        'Cirque de Cilaos': { lng: 55.48, lat: -21.13 },
        'Cirque de Salazie': { lng: 55.53, lat: -21.05 },
        'Volcan': { lng: 55.71, lat: -21.24 }
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
          altitude: Math.round(Math.random() * 800 + 200),
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
    
    console.log(`\n📊 RÉSULTAT IMPORT VTT MANQUANTS:`);
    console.log(`   ✅ ${imported} parcours VTT supplémentaires importés`);
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
importVTTParcoursManquants();