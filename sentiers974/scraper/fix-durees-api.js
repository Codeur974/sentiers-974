const axios = require('axios');

class DureesFixerAPI {
  constructor() {
    this.API_BASE = 'http://localhost:3001/api';
    console.log('🔧 Correcteur de durées aberrantes via API');
  }

  async fixDurees() {
    console.log('🔍 Recherche des durées aberrantes via API...');
    
    try {
      // Récupérer tous les sentiers
      const response = await axios.get(`${this.API_BASE}/sentiers?limit=1000`);
      const sentiers = response.data.data;
      
      console.log(`📊 ${sentiers.length} sentiers récupérés depuis l'API`);
      
      // Identifier les sentiers avec durées aberrantes (> 12h)
      const sentiersProblematiques = sentiers.filter(sentier => 
        sentier.duree_heures > 12
      );
      
      console.log(`⚠️  ${sentiersProblematiques.length} sentiers avec durées aberrantes trouvés`);
      
      for (const sentier of sentiersProblematiques) {
        console.log(`⚠️  ${sentier.nom}: ${sentier.duree_heures.toFixed(2)}h`);
        
        // Estimation de durée basée sur distance et dénivelé
        const nouvelleduree = this.estimerDureeReelle(sentier.distance, sentier.denivele_positif);
        
        // Mise à jour via l'API (endpoint imaginaire - il faudrait l'implémenter)
        console.log(`✅ Devrait être corrigé: ${sentier.nom} → ${nouvelleduree.heures}h${nouvelleduree.minutes > 0 ? nouvelleduree.minutes : ''}`);
      }
      
      // Pour l'instant, on ne peut que lister les problèmes car l'API n'a pas d'endpoint de modification
      console.log(`📋 Résumé: ${sentiersProblematiques.length} sentiers à corriger trouvés`);
      
      return sentiersProblematiques;
      
    } catch (error) {
      console.error('❌ Erreur API:', error.message);
      throw error;
    }
  }

  estimerDureeReelle(distance, denivele) {
    // Règle d'estimation : 1h pour 4km + 1h pour 300m de dénivelé positif
    const dureeDistance = distance / 4; // heures
    const dureeDenivele = denivele / 300; // heures
    
    const dureeEstimee = dureeDistance + dureeDenivele;
    
    // Convertir en heures/minutes
    const heures = Math.floor(dureeEstimee);
    const minutes = Math.round((dureeEstimee - heures) * 60);
    
    // S'assurer que c'est dans une fourchette raisonnable (30min à 10h)
    if (heures < 1 && minutes < 30) {
      return { heures: 1, minutes: 0 };
    }
    if (heures > 10) {
      return { heures: 8, minutes: 0 }; // Maximum raisonnable
    }
    
    return { heures, minutes };
  }
}

// Script principal
async function main() {
  const fixer = new DureesFixerAPI();
  
  try {
    const problematiques = await fixer.fixDurees();
    
    console.log('\n📝 Liste des sentiers à corriger :');
    problematiques.forEach(sentier => {
      const nouvelleduree = fixer.estimerDureeReelle(sentier.distance, sentier.denivele_positif);
      console.log(`- ID ${sentier.id}: "${sentier.nom}" ${sentier.duree_heures.toFixed(1)}h → ${nouvelleduree.heures}h${nouvelleduree.minutes > 0 ? nouvelleduree.minutes : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

if (require.main === module) {
  main();
}

module.exports = DureesFixerAPI;