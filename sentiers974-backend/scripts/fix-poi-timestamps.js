const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

const SessionSchema = new mongoose.Schema({
  sessionId: String,
  userId: mongoose.Schema.Types.Mixed,
  createdAt: Date,
  pois: [{
    id: String,
    title: String,
    timestamp: Number,
    photo: String,
  }],
}, { strict: false });

const Session = mongoose.model('Session', SessionSchema);

async function fixPOITimestamps() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Trouver toutes les sessions avec des POIs
    const sessions = await Session.find({
      pois: { $exists: true, $ne: [] }
    });

    console.log(`📊 Trouvé ${sessions.length} sessions avec POIs`);

    let fixedCount = 0;

    for (const session of sessions) {
      let needsUpdate = false;
      const sessionCreatedAt = new Date(session.createdAt).getTime();

      session.pois.forEach((poi, idx) => {
        const poiTimestamp = poi.timestamp;

        // Vérifier si le timestamp est invalide (< année 2000 = 946684800000 ms)
        if (poiTimestamp < 946684800000) {
          console.log(`\n🔧 Correction POI "${poi.title}" dans session ${session.sessionId}`);
          console.log(`   Ancien timestamp: ${poiTimestamp} (${new Date(poiTimestamp).toISOString()})`);

          // Le timestamp POI est en millisecondes depuis le début de la session
          // On l'ajoute au createdAt de la session pour avoir un timestamp absolu
          const newTimestamp = sessionCreatedAt + poiTimestamp;

          console.log(`   Nouveau timestamp: ${newTimestamp} (${new Date(newTimestamp).toISOString()})`);

          session.pois[idx].timestamp = newTimestamp;
          needsUpdate = true;
          fixedCount++;
        }
      });

      if (needsUpdate) {
        await session.save();
        console.log(`✅ Session ${session.sessionId} mise à jour`);
      }
    }

    console.log(`\n🎉 Terminé ! ${fixedCount} POI(s) corrigé(s)`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Déconnecté de MongoDB');
  }
}

fixPOITimestamps();
