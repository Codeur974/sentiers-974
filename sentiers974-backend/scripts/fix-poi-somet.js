const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function fixPOISomet() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    const db = mongoose.connection.db;
    const sessionsCollection = db.collection('sessions');

    // Trouver la session spécifique
    const session = await sessionsCollection.findOne({
      sessionId: 'session_1765282631814_iebp4wchm'
    });

    if (!session) {
      console.log('❌ Session non trouvée');
      return;
    }

    console.log('\n📊 Session trouvée:');
    console.log('SessionId:', session.sessionId);
    console.log('CreatedAt:', new Date(session.createdAt).toISOString());
    console.log('POIs:', session.pois.length);

    // Calculer le bon timestamp pour "Somet"
    const sessionCreatedAt = new Date(session.createdAt).getTime();
    const relativeTime = 44071000; // temps relatif en ms

    const newTimestamp = sessionCreatedAt + relativeTime;

    console.log('\n🔧 Correction du POI "Somet":');
    console.log('Session createdAt:', sessionCreatedAt, '→', new Date(sessionCreatedAt).toISOString());
    console.log('Temps relatif:', relativeTime, 'ms (12h 14min)');
    console.log('Nouveau timestamp:', newTimestamp, '→', new Date(newTimestamp).toISOString());

    // Mettre à jour directement avec updateOne
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

    console.log('\n✅ Résultat de la mise à jour:');
    console.log('Matched:', result.matchedCount);
    console.log('Modified:', result.modifiedCount);

    // Vérifier la mise à jour
    const updatedSession = await sessionsCollection.findOne({
      sessionId: 'session_1765282631814_iebp4wchm'
    });

    const poiSomet = updatedSession.pois.find(p => p.id === 'poi_1765282676248_hhw9s1c9n');
    console.log('\n✅ Vérification après mise à jour:');
    console.log('POI Somet timestamp:', poiSomet.timestamp, '→', new Date(poiSomet.timestamp).toISOString());

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Déconnecté de MongoDB');
  }
}

fixPOISomet();
