const mongoose = require('mongoose');
const Sentier = require('./models/Sentier');
require('dotenv').config();

async function checkRemaining() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const remaining = await Sentier.find({ 'duree.minutes': { $gt: 59 } });
    
    console.log(`Sentiers restants avec minutes > 59:`);
    remaining.forEach(s => {
      console.log(`- ${s.nom}: ${s.duree.heures}h${s.duree.minutes}m`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.connection.close();
  }
}

checkRemaining();