const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
require('dotenv').config();

async function testAPI() {
  try {
    console.log('🔗 Connexion à MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/randopitons');
    
    console.log('📊 Tests de requêtes...');
    
    const total = await Sentier.countDocuments();
    console.log('Total sentiers en DB:', total);
    
    const sentiers = await Sentier.find({}).limit(500);
    console.log('Sentiers retournés avec limit(500):', sentiers.length);
    
    const sentiersWithRegion = await Sentier.find({region: { $ne: null }}).limit(500);
    console.log('Sentiers avec région définie:', sentiersWithRegion.length);
    
    const regions = await Sentier.aggregate([
      { $group: { _id: '$region', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    console.log('Répartition par région:');
    regions.forEach(r => console.log(`  - ${r._id || 'NULL'}: ${r.count} sentiers`));
    
    // Test toClientFormat
    if (sentiers.length > 0) {
      console.log('\n✅ Test toClientFormat sur premier sentier:');
      const formatted = sentiers[0].toClientFormat();
      console.log('ID:', formatted.id);
      console.log('Nom:', formatted.nom);
      console.log('Région:', formatted.region);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

testAPI();