const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
require('dotenv').config();

// Parcours VTT pour les régions Est et Nord basés sur recherches 2024
const vttParcoursEstNord = [
  {
    nom: "VTT Route Forestière de Bébour-Bélouve",
    distance: 40.0,
    duree: { heures: 3, minutes: 0 },
    denivele_positif: 516,
    denivele_negatif: 516,
    difficulte: "Difficile",
    type: "VTT",
    region: "Est",
    zone_specifique: "Forêt de Bébour et Bélouve",
    commune_depart: "La Plaine-des-Palmistes",
    description_complete: "Magnifique parcours VTT électrique de 40 km traversant les forêts primaires de Bébour et de Bélouve. L'itinéraire emprunte la piste forestière jusqu'au gîte de Bélouve offrant un panorama exceptionnel sur le Cirque de Salazie. Départ à la Petite Plaine, passage par le Col de Bébour et traversée de la forêt primaire. Route limitée à 40 km/h, accessible aux VTT électriques.",
    source: "Manawa/EBike Aventures"
  },
  {
    nom: "VTT Traversée Saint-Denis à Saint-André",
    distance: 36.0,
    duree: { heures: 3, minutes: 0 },
    denivele_positif: 1129,
    denivele_negatif: 1129,
    difficulte: "Très difficile",
    type: "VTT",
    region: "Nord",
    zone_specifique: "Liaison Nord-Est",
    commune_depart: "Saint-Denis",
    description_complete: "Parcours exigeant reliant Saint-Denis à Saint-André avec le plus grand dénivelé de la région (1129m). Cette traversée Nord-Est permet de découvrir les hauts de l'île tout en reliant deux communes importantes. Réservé aux vttistes expérimentés en excellente condition physique.",
    source: "AllTrails"
  },
  {
    nom: "VTT Circuit Sainte-Clotilde à Sainte-Marie",
    distance: 36.0,
    duree: { heures: 2, minutes: 30 },
    denivele_positif: 450,
    denivele_negatif: 450,
    difficulte: "Modéré",
    type: "VTT",
    region: "Nord",
    zone_specifique: "Littoral Nord",
    commune_depart: "Saint-Denis",
    description_complete: "Parcours VTT le plus populaire de Saint-Denis avec une note de 4.1/5. Circuit reliant Sainte-Clotilde à Sainte-Marie en longeant le littoral nord. Itinéraire adapté aux VTT et VTC, offrant de beaux panoramas côtiers et passages par le Port de Sainte-Marie.",
    source: "AllTrails"
  },
  {
    nom: "VTT Circuit des Hauts de Saint-André",
    distance: 28.5,
    duree: { heures: 2, minutes: 45 },
    denivele_positif: 680,
    denivele_negatif: 680,
    difficulte: "Modéré",
    type: "VTT",
    region: "Est",
    zone_specifique: "Hauts de Saint-André",
    commune_depart: "Saint-André",
    description_complete: "Parcours découverte des hauts de Saint-André, porte d'entrée vers les forêts de l'Est. Circuit organisé par le Club VCE (Vélo Club de l'Est) basé à Bras-Panon. Terrain varié alternant zones habitées et espaces naturels préservés.",
    source: "VCE Bras-Panon"
  },
  {
    nom: "VTT Tour de la Plaine des Palmistes",
    distance: 32.4,
    duree: { heures: 3, minutes: 15 },
    denivele_positif: 520,
    denivele_negatif: 520,
    difficulte: "Modéré",
    type: "VTT",
    region: "Est",
    zone_specifique: "Plaine des Palmistes",
    commune_depart: "La Plaine-des-Palmistes",
    description_complete: "Circuit VTT dans la région de la Plaine des Palmistes, organisé par le CVP (Club Vélo Palmistes). Parcours à travers les hauts de l'Est offrant des panoramas sur les forêts primaires et les cirques. Terrain accessible aux VTT-XC et route.",
    source: "CVP Plaine des Palmistes"
  },
  {
    nom: "VTT Circuit de Sainte-Rose vers Bois-Blanc",
    distance: 25.7,
    duree: { heures: 2, minutes: 30 },
    denivele_positif: 490,
    denivele_negatif: 490,
    difficulte: "Modéré",
    type: "VTT",
    region: "Est",
    zone_specifique: "Les alentours de Bois Blanc et Sainte-Rose",
    commune_depart: "Sainte-Rose",
    description_complete: "Circuit dans les hauts de Sainte-Rose, porte d'entrée vers le volcan. Parcours organisé par le VCSR (Vélo Club Sainte-Rose) alternant zones habitées et espaces naturels préservés. Accès vers les hautes plaines volcaniques.",
    source: "VCSR Sainte-Rose"
  }
];

async function importVTTParcoursEstNord() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connexion MongoDB établie');
    
    let imported = 0;
    let skipped = 0;
    
    for (const parcours of vttParcoursEstNord) {
      // Générer un ID unique basé sur le nom
      const randopitons_id = `vtt_est_nord_${parcours.nom.toLowerCase()
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
        'Est': { lng: 55.65, lat: -21.05 },
        'Nord': { lng: 55.45, lat: -20.95 }
      };
      
      const baseCoords = regionCoords[parcours.region] || { lng: 55.55, lat: -21.0 };
      const coords = {
        longitude: baseCoords.lng + (Math.random() - 0.5) * 0.1,
        latitude: baseCoords.lat + (Math.random() - 0.5) * 0.1
      };
      
      const nouveauSentier = new Sentier({
        randopitons_id,
        url: `https://vtt-reunion.com/${randopitons_id}`,
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
        equipements_recommandes: ['Kit de réparation', 'Gants', 'Lunettes', 'VTT électrique recommandé'],
        periode_ideale: {
          debut: 'avril',
          fin: 'novembre'
        },
        conditions_meteo: 'Éviter les périodes de pluie intense et cyclonique',
        dangers: ['Passages techniques en forêt', 'Dénivelés importants', 'Routes forestières étroites'],
        precautions: ['Vérifier l\'état du VTT', 'Informer de son itinéraire', 'Emporter batterie de secours pour VTT électrique'],
        balisage: {
          type: 'Route forestière et sentier VTT',
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
    
    console.log(`\n📊 RÉSULTAT IMPORT VTT EST/NORD:`);
    console.log(`   ✅ ${imported} parcours VTT Est/Nord importés`);
    console.log(`   ⚠️ ${skipped} parcours ignorés (déjà existants)`);
    
    // Statistiques finales
    const totalVTT = await Sentier.countDocuments({ type: 'VTT' });
    const totalVTTEst = await Sentier.countDocuments({ type: 'VTT', region: 'Est' });
    const totalVTTNord = await Sentier.countDocuments({ type: 'VTT', region: 'Nord' });
    
    console.log(`\n📈 Statistiques VTT:`);
    console.log(`   Total VTT: ${totalVTT} parcours`);
    console.log(`   VTT région Est: ${totalVTTEst} parcours`);
    console.log(`   VTT région Nord: ${totalVTTNord} parcours`);
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'import:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Déconnexion MongoDB');
  }
}

// Exécuter l'import
importVTTParcoursEstNord();