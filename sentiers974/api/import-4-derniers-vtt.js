const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
require('dotenv').config();

// 4 derniers parcours VTT à importer
const derniersVttParcours = [
  {
    nom: "VTT Du Ouaki à Pierrefond par le Canal Saint-Étienne et la Pointe du Diable",
    distance: 26.03,
    duree: { heures: 2, minutes: 0 },
    denivele_positif: 230,
    denivele_negatif: 232,
    difficulte: "Modéré",
    type: "VTT",
    region: "Sud",
    zone_specifique: "Autour de Petite Ile ou St Pierre",
    commune_depart: "Saint-Pierre",
    description_complete: "Voici une balade originale et assez facile dans le Sud de l'île. Ce circuit permet de découvrir quelques sites plus ou moins connus dans cette région de l'île et qui méritent le détour : le Canal des Aloès, le Canal Saint-Étienne, la Pointe du Diable, le déversoir de la Centrale Électrique du Bras de la Plaine ou encore les falaises de pouzzolanes à Bois-d'Olive. Cet itinéraire passe aussi à proximité de quelques musées tel que : la Saga du Rhum ou encore le Domaine de la Vallée !",
    source: "Visorandonneur"
  },
  {
    nom: "VTT La Route Forestière 11 des Makes",
    distance: 14.41,
    duree: { heures: 1, minutes: 30 },
    denivele_positif: 432,
    denivele_negatif: 432,
    difficulte: "Modéré",
    type: "VTT",
    region: "Ouest",
    zone_specifique: "La région des Makes",
    commune_depart: "Saint-Louis",
    description_complete: "Cette sortie emprunte sur toute sa longueur la Route Forestière 11 des Makes. Elle permet de beaux panoramas sur la région des Makes et le Cirque de Cilaos en fin de parcours. On croisera quelques aires de pique-nique ainsi que des départs de sentiers de randonnées. Ce parcours est assez facile et comporte une pente faible mais il faudra quand même gravir 477m de dénivelé pour 14km. Je conseille de commencer cette sortie avant 9 heures pour profiter des meilleurs panoramas.",
    source: "Visorandonneur"
  },
  {
    nom: "VTT La Route Forestière des Goyaves",
    distance: 4.26,
    duree: { heures: 0, minutes: 30 },
    denivele_positif: 191,
    denivele_negatif: 182,
    difficulte: "Facile",
    type: "VTT",
    region: "Ouest",
    zone_specifique: "La région des Makes",
    commune_depart: "Saint-Louis",
    description_complete: "Cette courte balade familiale permet d'explorer une partie très peu connue des Makes. Il n'y a aucune difficulté si ce n'est quelques gros galets qui peuvent être glissants. La progression est agréable et les paysages sont magnifiques !",
    source: "Visorandonneur"
  },
  {
    nom: "VTT Les trois Camps",
    distance: 20.51,
    duree: { heures: 3, minutes: 0 },
    denivele_positif: 713,
    denivele_negatif: 713,
    difficulte: "Modéré",
    type: "VTT",
    region: "Ouest",
    zone_specifique: "La région des Makes",
    commune_depart: "Saint-Louis",
    description_complete: "Cette balade dans les hauts des Makes, chemine sur la RF58 et permet de relier en une seule sortie les Camps de Montplaisir, de la Scierie et celui des Deux Mille. C'est aussi l'occasion de découvrir dans la partie haute du parcours la belle Forêt Départemento-Domaniale des Makes, la Scierie et le Plateau Goyave. Passant près de deux aires de décollage des parapentes, c'est l'occasion aussi de s'offrir des panoramas splendides sur les environs.",
    source: "Visorandonneur"
  }
];

async function importDerniersVTTParcours() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connexion MongoDB établie');
    
    let imported = 0;
    let skipped = 0;
    
    for (const parcours of derniersVttParcours) {
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
          altitude: Math.round(Math.random() * 600 + 100),
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
    
    console.log(`\n📊 RÉSULTAT IMPORT DERNIERS VTT:`);
    console.log(`   ✅ ${imported} derniers parcours VTT importés`);
    console.log(`   ⚠️ ${skipped} parcours ignorés (déjà existants)`);
    
    // Statistiques finales
    const totalVTT = await Sentier.countDocuments({ type: 'VTT' });
    console.log(`\n📈 Total VTT dans la base: ${totalVTT} parcours`);
    
    // Répartition par difficulté
    console.log('\n🏔️ Répartition par difficulté:');
    const stats = await Sentier.aggregate([
      { $match: { type: 'VTT' } },
      { $group: { _id: '$difficulte', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    stats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} parcours`);
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'import:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Déconnexion MongoDB');
  }
}

// Exécuter l'import
importDerniersVTTParcours();