// Script pour supprimer tous les users de la base de données
const mongoose = require('mongoose');
require('dotenv').config();

async function cleanUsers() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Supprimer tous les users
    const result = await mongoose.connection.collection('users').deleteMany({});
    console.log(`🗑️ ${result.deletedCount} users supprimés`);

    await mongoose.disconnect();
    console.log('✅ Terminé !');
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

cleanUsers();