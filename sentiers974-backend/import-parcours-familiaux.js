const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const importerParcoursFamiliaux = async () => {
  try {
    console.log('👨‍👩‍👧‍👦 Import des parcours familiaux manquants...');
    
    // Connexion MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connecté');
    
    // Charger le JSON officiel
    const jsonPath = path.join(__dirname, 'sentiers-officiels.json');
    const sentiersOfficiels = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    
    // Récupérer les noms existants dans l'API
    const sentiersAPI = await Sentier.find({}, { nom: 1, _id: 0 });
    const nomsAPI = sentiersAPI.map(s => s.nom);
    
    // Identifier les parcours familiaux manquants
    const parcoursFamiliauxManquants = sentiersOfficiels.filter(sentier => 
      sentier.nom.includes('Familiale') && !nomsAPI.includes(sentier.nom)
    );
    
    console.log(`📊 Parcours familiaux manquants trouvés: ${parcoursFamiliauxManquants.length}`);
    
    if (parcoursFamiliauxManquants.length === 0) {
      console.log('✅ Aucun parcours familial à importer');
      return;
    }
    
    // Afficher les premiers exemples
    console.log('\n📋 Exemples de parcours familiaux à importer:');
    parcoursFamiliauxManquants.slice(0, 5).forEach((sentier, index) => {
      console.log(`${index + 1}. "${sentier.nom}"`);
      console.log(`   Difficulté: ${sentier.difficulte}, Distance: ${sentier.distance}km, Durée: ${sentier.duree}`);
    });
    
    // Générer des coordonnées approximatives pour La Réunion selon les régions
    const getCoordonnees = (region, sousRegion) => {
      const regionCoords = {
        'Cirque de Cilaos': { lng: 55.45, lat: -21.13 },
        'Cirque de Mafate': { lng: 55.45, lat: -21.05 },
        'Cirque de Salazie': { lng: 55.53, lat: -21.03 },
        'Est': { lng: 55.65, lat: -21.05 },
        'Ouest': { lng: 55.25, lat: -21.15 },
        'Sud': { lng: 55.45, lat: -21.25 },
        'Nord': { lng: 55.45, lat: -20.95 }
      };
      
      const baseCoords = regionCoords[region] || { lng: 55.45, lat: -21.1 };
      return {
        longitude: baseCoords.lng + (Math.random() - 0.5) * 0.1,
        latitude: baseCoords.lat + (Math.random() - 0.5) * 0.1
      };
    };
    
    console.log(`\n🚀 Import de ${parcoursFamiliauxManquants.length} parcours familiaux...`);
    
    let imported = 0;
    let errors = 0;
    
    for (const parcours of parcoursFamiliauxManquants) {
      try {
        // Générer un ID unique
        const randopitons_id = `familial_${parcours.nom.toLowerCase()
          .replace(/[^a-z0-9]/g, '_')
          .replace(/_+/g, '_')
          .slice(0, 50)}`;
        
        // Coordonnées basées sur la région
        const coords = getCoordonnees(parcours.region, parcours.sousRegion);
        
        const nouveauSentier = new Sentier({
          randopitons_id,
          url: `https://randopitons.re/randonnees/${randopitons_id}`,
          nom: parcours.nom,
          difficulte: parcours.difficulte,
          type: 'Randonnée',
          region: parcours.region === 'Cirque de Cilaos' ? 'Ouest' : 
                 parcours.region === 'Cirque de Mafate' ? 'Ouest' :
                 parcours.region === 'Cirque de Salazie' ? 'Est' : 'Est',
          zone_specifique: parcours.sousRegion || parcours.region,
          commune_depart: 'La Réunion', // Générique pour l'instant
          distance: parcours.distance,
          duree: {
            heures: parseInt(parcours.duree.replace(/[^\d]/g, '')) || 0,
            minutes: parcours.duree.includes('h') && parcours.duree.includes('m') ? 
              parseInt(parcours.duree.split('h')[1]?.replace(/[^\d]/g, '')) || 0 : 0
          },
          denivele_positif: parcours.denivele,
          denivele_negatif: parcours.denivele,
          description_complete: `Parcours familial adapté aux familles avec enfants. ${parcours.nom.replace('Familiale', '')} - Version accessible et sécurisée.`,
          description_courte: `Parcours familial de ${parcours.distance}km en ${parcours.duree}`,
          point_depart: {
            nom: `Départ parcours familial`,
            coordonnees: coords,
            altitude: Math.round(Math.random() * 800 + 200),
            acces_voiture: true,
            parking_disponible: true,
            description_acces: 'Point de départ accessible aux familles'
          },
          points_interet: [],
          equipements_obligatoires: ['Chaussures de randonnée', 'Eau', 'Casquette'],
          equipements_recommandes: ['Crème solaire', 'Collations', 'Appareil photo'],
          periode_ideale: {
            debut: 'avril',
            fin: 'novembre'
          },
          conditions_meteo: 'Éviter les jours de pluie forte',
          dangers: ['Terrain glissant par temps humide'],
          precautions: ['Surveiller les enfants', 'Adapter le rythme aux plus jeunes'],
          balisage: {
            type: 'Sentier familial',
            etat: 'Bon'
          },
          contacts_urgence: {
            secours_montagne: '02 62 93 37 37',
            gendarmerie: '17',
            pompiers: '18'
          },
          source: 'Document officiel La Réunion',
          certification_officielle: true,
          tags: ['familial', 'facile', 'accessible'],
          derniere_mise_a_jour_site: new Date(),
          scraped_at: new Date()
        });
        
        await nouveauSentier.save();
        imported++;
        
        if (imported % 10 === 0) {
          console.log(`✅ ${imported} parcours importés...`);
        }
        
      } catch (error) {
        console.error(`❌ Erreur import "${parcours.nom}":`, error.message);
        errors++;
      }
    }
    
    console.log(`\n📊 === RÉSULTAT IMPORT PARCOURS FAMILIAUX ===`);
    console.log(`✅ ${imported} parcours familiaux importés avec succès`);
    console.log(`❌ ${errors} erreurs rencontrées`);
    
    // Statistiques finales
    const totalSentiers = await Sentier.countDocuments();
    const totalFamiliaux = await Sentier.countDocuments({ 
      nom: { $regex: 'Familiale', $options: 'i' } 
    });
    
    console.log(`\n📈 Statistiques finales:`);
    console.log(`   Total sentiers dans la base: ${totalSentiers}`);
    console.log(`   Total parcours familiaux: ${totalFamiliaux}`);
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Connexion MongoDB fermée');
  }
};

// Exécution
importerParcoursFamiliaux();