const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
require('dotenv').config();

async function fixLastSentier() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const sentier = await Sentier.findOne({ 'duree.minutes': { $gte: 60 } });
    
    if (sentier) {
      console.log(`🔧 Correction du dernier sentier: ${sentier.nom}`);
      console.log(`Avant: ${sentier.duree.heures}h${sentier.duree.minutes}m`);
      
      // 2h60m = 3h0m
      const totalMinutes = sentier.duree.heures * 60 + sentier.duree.minutes;
      const nouvelleheure = Math.floor(totalMinutes / 60);
      const nouvelleMinute = totalMinutes % 60;
      
      sentier.duree = { heures: nouvelleheure, minutes: nouvelleMinute };
      await sentier.save();
      
      console.log(`Après: ${sentier.duree.heures}h${sentier.duree.minutes}m`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.connection.close();
  }
}

fixLastSentier();