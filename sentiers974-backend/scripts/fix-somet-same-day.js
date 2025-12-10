const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function fixSometSameDay() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    const db = mongoose.connection.db;
    const sessionsCollection = db.collection('sessions');

    const session = await sessionsCollection.findOne({
      sessionId: 'session_1765282631814_iebp4wchm'
    });

    if (!session) {
      console.log('❌ Session non trouvée');
      return;
    }

    const sessionCreatedAt = new Date(session.createdAt).getTime();

    console.log('\n📊 Session actuelle:');
    console.log('Date session:', new Date(sessionCreatedAt).toISOString());
    console.log('Date session (jour):', new Date(sessionCreatedAt).toISOString().split('T')[0]);

    // POI créé 44 secondes après le début de session
    const newTimestamp = sessionCreatedAt + (44 * 1000); // 44 secondes en ms

    console.log('\n🔧 Correction POI "Somet":');
    console.log('Nouveau timestamp:', newTimestamp);
    console.log('Nouvelle date:', new Date(newTimestamp).toISOString());
    console.log('Nouveau jour:', new Date(newTimestamp).toISOString().split('T')[0]);
    console.log('✅ MÊME JOUR que la session !');

    // Mettre à jour
    const result = await sessionsCollection.updateOne(
      {
        sessionId: 'session_1765282631814_iebp4wchm',
        'pois.id': 'poi_1765282676248_hhw9s1c9n'
      },
      {
        $set: {
          'pois.$.timestamp': newTimestamp
        }
      }
    );

    console.log('\n✅ Mise à jour:', result.modifiedCount, 'POI modifié(s)');

    // Vérification
    const updated = await sessionsCollection.findOne({
      sessionId: 'session_1765282631814_iebp4wchm'
    });

    console.log('\n📋 Vérification finale:');
    updated.pois.forEach((poi, idx) => {
      const poiDate = new Date(poi.timestamp).toISOString();
      const poiDay = poiDate.split('T')[0];
      const sessionDay = new Date(updated.createdAt).toISOString().split('T')[0];
      const sameDay = poiDay === sessionDay ? '✅' : '❌';
      console.log(`POI ${idx + 1}: "${poi.title}" - ${poiDate} ${sameDay} (${poiDay})`);
    });
    console.log('Session:', new Date(updated.createdAt).toISOString(), `(${new Date(updated.createdAt).toISOString().split('T')[0]})`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Déconnecté');
  }
}

fixSometSameDay();
