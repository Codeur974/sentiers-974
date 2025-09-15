const { MongoClient } = require('mongodb');

async function analyzeAllSessions() {
  const client = new MongoClient('mongodb://localhost:27017');
  try {
    await client.connect();
    const db = client.db('sentiers974');

    console.log('📊 === ANALYSE DES 14 SESSIONS MONGODB ===');
    const sessions = await db.collection('sessions').find({}).sort({createdAt: -1}).toArray();
    console.log(`Nombre total: ${sessions.length}`);
    console.log();

    // Grouper par date
    const sessionsByDate = {};
    sessions.forEach((session, index) => {
      const date = new Date(session.createdAt).toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      if (!sessionsByDate[date]) {
        sessionsByDate[date] = [];
      }

      sessionsByDate[date].push({
        index: index + 1,
        sessionId: session.sessionId,
        sport: session.sport?.nom || 'N/A',
        distance: session.distance?.toFixed(2) || '0',
        duration: Math.round(session.duration / 1000) || 0,
        createdAt: session.createdAt
      });
    });

    // Afficher par jour
    Object.keys(sessionsByDate).forEach(date => {
      const sessionsThisDay = sessionsByDate[date];
      console.log(`📅 ${date} (${sessionsThisDay.length} session${sessionsThisDay.length > 1 ? 's' : ''})`);

      sessionsThisDay.forEach(s => {
        console.log(`  ${s.index}. ${s.sessionId}`);
        console.log(`     Sport: ${s.sport}, Distance: ${s.distance}km, Durée: ${s.duration}s`);
        console.log(`     Créé: ${s.createdAt}`);
      });
      console.log();
    });

    // Statistiques
    const totalDistance = sessions.reduce((sum, s) => sum + (s.distance || 0), 0);
    const activeSessions = sessions.filter(s => s.distance > 0);
    const emptySessions = sessions.filter(s => s.distance === 0);

    console.log('📈 === STATISTIQUES ===');
    console.log(`Sessions actives (distance > 0): ${activeSessions.length}`);
    console.log(`Sessions vides (distance = 0): ${emptySessions.length}`);
    console.log(`Distance totale: ${totalDistance.toFixed(2)}km`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await client.close();
  }
}

analyzeAllSessions();