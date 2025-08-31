// Script de test pour vérifier les APIs sportives de La Réunion
const axios = require('axios');

async function testReunionSportsAPIs() {
  console.log('🏝️ Test des APIs sportives de La Réunion...\n');
  
  const apis = [
    {
      name: 'IRT - Île Réunion Tourisme',
      url: 'https://www.reunion.fr/api/agenda',
      params: { category: 'sport', limit: 20 }
    },
    {
      name: 'Open Data Région Réunion',
      url: 'https://data.regionreunion.com/api/records/1.0/search',
      params: { dataset: 'evenements-sportifs', rows: 20 }
    },
    {
      name: 'CROS Réunion (hypothétique)',
      url: 'https://api.cros-reunion.com/events',
      params: { format: 'json', limit: 20 }
    },
    {
      name: 'Département 974',
      url: 'https://www.departement974.fr/api/agenda',
      params: { type: 'sport', limit: 20 }
    },
    {
      name: 'Réunion Sport',
      url: 'https://www.reunionsport.com/api/events',
      params: { format: 'json' }
    }
  ];

  for (const api of apis) {
    console.log(`\n🔍 Test: ${api.name}`);
    console.log(`📡 URL: ${api.url}`);
    
    try {
      const response = await axios.get(api.url, {
        params: api.params,
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      console.log(`✅ Succès! Status: ${response.status}`);
      console.log(`📊 Type de données: ${typeof response.data}`);
      
      if (response.data) {
        // Analyser la structure
        if (Array.isArray(response.data)) {
          console.log(`📋 ${response.data.length} éléments dans le tableau`);
        } else if (response.data.records) {
          console.log(`📋 ${response.data.records.length} records trouvés`);
        } else if (response.data.events) {
          console.log(`📋 ${response.data.events.length} events trouvés`);
        } else {
          console.log(`📋 Structure: ${Object.keys(response.data).slice(0, 5).join(', ')}`);
        }

        // Échantillon de données
        const sample = response.data.records?.[0] || response.data.events?.[0] || response.data[0] || response.data;
        if (sample && typeof sample === 'object') {
          console.log(`🔬 Échantillon clés: ${Object.keys(sample).slice(0, 8).join(', ')}`);
        }
      }
      
    } catch (error) {
      if (error.response) {
        console.log(`❌ Erreur HTTP ${error.response.status}: ${error.response.statusText}`);
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        console.log(`🚫 API non accessible (${error.code})`);
      } else {
        console.log(`⚠️ Erreur: ${error.message}`);
      }
    }
  }

  console.log('\n🎯 Test des APIs alternatives...');
  
  // Test des APIs génériques qui pourraient avoir des données Réunion
  const genericApis = [
    {
      name: 'data.gouv.fr - Équipements sportifs',
      url: 'https://www.data.gouv.fr/api/1/datasets/equipements-sportifs/resources',
      params: {}
    },
    {
      name: 'OpenAgenda - Recherche Réunion',
      url: 'https://api.openagenda.com/v2/agendas',
      params: { 
        key: process.env.EXPO_PUBLIC_OPENAGENDA_KEY || '7ff0f31080424f389fece1f2fdb6cba8',
        q: 'Réunion 974 sport',
        size: 10
      }
    }
  ];

  for (const api of genericApis) {
    console.log(`\n🔍 Test: ${api.name}`);
    
    try {
      const response = await axios.get(api.url, {
        params: api.params,
        timeout: 10000
      });

      console.log(`✅ Succès! ${api.name}`);
      
      if (api.name.includes('OpenAgenda') && response.data.agendas) {
        const reunionAgendas = response.data.agendas.filter(agenda => 
          agenda.title?.toLowerCase().includes('réunion') ||
          agenda.location?.name?.includes('974') ||
          agenda.location?.name?.toLowerCase().includes('réunion')
        );
        console.log(`🏝️ ${reunionAgendas.length} agendas Réunion trouvés`);
        
        if (reunionAgendas.length > 0) {
          console.log('📋 Agendas Réunion:');
          reunionAgendas.slice(0, 3).forEach(agenda => {
            console.log(`  - ${agenda.title} (${agenda.location?.name || 'Lieu non spécifié'})`);
          });
        }
      }
      
    } catch (error) {
      console.log(`❌ Erreur ${api.name}: ${error.message}`);
    }
  }

  console.log('\n🏁 Test terminé!');
  console.log('💡 Prochaines étapes:');
  console.log('  1. Identifier les APIs qui fonctionnent');
  console.log('  2. Analyser la structure des données');
  console.log('  3. Créer les transformateurs appropriés');
  console.log('  4. Intégrer dans l\'application');
}

testReunionSportsAPIs().catch(console.error);