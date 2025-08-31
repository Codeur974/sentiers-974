// Script de test pour vérifier la connexion OpenAgenda
const axios = require('axios');

// Votre clé API OpenAgenda
const API_KEY = '7ff0f31080424f389fece1f2fdb6cba8';

async function testOpenAgenda() {
  console.log('🔍 Test de connexion OpenAgenda...\n');
  
  try {
    // Test 1: Vérifier la clé API
    const response = await axios.get('https://api.openagenda.com/v2/agendas', {
      params: {
        key: API_KEY,
        size: 5,
      },
    });

    console.log('✅ Connexion réussie !');
    console.log(`📊 ${response.data.agendas?.length || 0} agendas trouvés`);
    
    // Test 2: Rechercher spécifiquement La Réunion
    const reunionResponse = await axios.get('https://api.openagenda.com/v2/agendas', {
      params: {
        key: API_KEY,
        q: 'Réunion',
        size: 10,
      },
    });

    console.log(`🏝️ ${reunionResponse.data.agendas?.length || 0} agendas trouvés pour "Réunion"`);
    
    if (reunionResponse.data.agendas?.length > 0) {
      console.log('\n📋 Agendas contenant "Réunion" :');
      reunionResponse.data.agendas.slice(0, 5).forEach(agenda => {
        console.log(`  - ${agenda.title} (${agenda.location?.name || 'Lieu non spécifié'})`);
      });
    }

    // Test 3: Rechercher sport + Réunion
    const sportReunionResponse = await axios.get('https://api.openagenda.com/v2/agendas', {
      params: {
        key: API_KEY,
        q: 'sport Réunion trail course',
        size: 10,
      },
    });

    console.log(`\n🏃‍♀️ ${sportReunionResponse.data.agendas?.length || 0} agendas trouvés pour "sport Réunion"`);
    
    if (sportReunionResponse.data.agendas?.length > 0) {
      console.log('\n📋 Agendas sport + Réunion :');
      sportReunionResponse.data.agendas.slice(0, 5).forEach(agenda => {
        console.log(`  - ${agenda.title} (${agenda.location?.name || 'Lieu non spécifié'})`);
      });
    }

    console.log('\n🎉 Votre API OpenAgenda est configurée correctement !');
    console.log('💡 Vous pouvez maintenant lancer votre app Sentiers974');
    
  } catch (error) {
    console.error('❌ Erreur de connexion :');
    console.error('Message :', error.message);
    
    if (error.response?.status === 401) {
      console.error('🔑 Clé API invalide - Vérifiez votre clé dans le fichier .env');
    } else if (error.response?.status === 403) {
      console.error('🚫 Accès refusé - Vérifiez les permissions de votre clé API');
    } else {
      console.error('🌐 Problème de connexion - Vérifiez votre internet');
    }
  }
}

testOpenAgenda();