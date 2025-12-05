/**
 * Script pour nettoyer la collection users corrompue
 * À exécuter avec : node scripts/cleanUsers.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function cleanUsers() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    const db = mongoose.connection.db;

    // Supprimer tous les users
    console.log('🗑️ Suppression de tous les users...');
    const result = await db.collection('users').deleteMany({});
    console.log(`✅ ${result.deletedCount} users supprimés`);

    console.log('✅ Nettoyage terminé !');
    console.log('👉 Les utilisateurs peuvent maintenant créer de nouveaux comptes');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

cleanUsers();
