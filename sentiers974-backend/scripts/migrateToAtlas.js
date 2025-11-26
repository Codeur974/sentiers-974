/**
 * Script de migration de MongoDB local vers MongoDB Atlas
 */
const mongoose = require('mongoose');
require('dotenv').config();

const LOCAL_URI = 'mongodb://localhost:27017/sentiers974';
const ATLAS_URI = process.env.MONGODB_URI;

async function migrateData() {
  try {
    console.log('🔄 Début de la migration vers Atlas...\n');

    console.log('📍 Connexion à MongoDB local...');
    const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
    console.log('✅ Connecté à MongoDB local\n');

    console.log('☁️  Connexion à MongoDB Atlas...');
    const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
    console.log('✅ Connecté à MongoDB Atlas\n');

    const collections = ['sentiers', 'sessions', 'users', 'posts', 'comments'];

    for (const collectionName of collections) {
      try {
        console.log(`📦 Migration de "${collectionName}"...`);

        const localCollections = await localConn.db.listCollections().toArray();
        const collectionExists = localCollections.some(c => c.name === collectionName);

        if (!collectionExists) {
          console.log(`⚠️  "${collectionName}" n'existe pas en local\n`);
          continue;
        }

        const localCollection = localConn.db.collection(collectionName);
        const documents = await localCollection.find({}).toArray();

        if (documents.length === 0) {
          console.log(`⚠️  "${collectionName}" vide\n`);
          continue;
        }

        const atlasCollection = atlasConn.db.collection(collectionName);
        await atlasCollection.deleteMany({});
        await atlasCollection.insertMany(documents);

        console.log(`✅ ${documents.length} documents migrés\n`);
      } catch (error) {
        console.error(`❌ Erreur "${collectionName}":`, error.message, '\n');
      }
    }

    await localConn.close();
    await atlasConn.close();

    console.log('🎉 Migration terminée !');
    console.log('✅ Vos données sont sur Atlas\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

migrateData();
