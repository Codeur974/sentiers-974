// Test des données officielles disponibles
const axios = require('axios');

async function testOfficialData() {
  console.log('🔍 Recherche des données officielles...\n');

  // 1. Test API data.gouv.fr avec différents datasets
  console.log('1️⃣ Test data.gouv.fr - Recherche datasets Réunion');
  try {
    const searchResponse = await axios.get('https://www.data.gouv.fr/api/1/datasets/', {
      params: {
        q: 'sport 974 réunion',
        page_size: 20
      }
    });

    console.log(`📊 ${searchResponse.data.data.length} datasets trouvés`);
    
    const relevantDatasets = searchResponse.data.data.filter(d => 
      d.title.toLowerCase().includes('sport') || 
      d.title.toLowerCase().includes('974') ||
      d.title.toLowerCase().includes('réunion')
    );
    
    console.log(`🎯 ${relevantDatasets.length} datasets pertinents:`);
    relevantDatasets.slice(0, 5).forEach(dataset => {
      console.log(`  📁 ${dataset.title}`);
      console.log(`     🔗 ${dataset.page}`);
      console.log(`     📝 ${dataset.description?.substring(0, 100)}...`);
      
      // Essayer d'accéder aux ressources
      if (dataset.resources && dataset.resources.length > 0) {
        const csvResource = dataset.resources.find(r => r.format === 'CSV' || r.format === 'JSON');
        if (csvResource) {
          console.log(`     💾 Ressource: ${csvResource.url}`);
        }
      }
      console.log('');
    });
    
  } catch (error) {
    console.log(`❌ data.gouv.fr: ${error.message}`);
  }

  // 2. Test API INSEE - Données démographiques/sportives
  console.log('2️⃣ Test API INSEE');
  try {
    const inseeResponse = await axios.get('https://api.insee.fr/metadonnees/V1/concepts/definition/c1963', {
      timeout: 10000
    });
    console.log('✅ API INSEE accessible');
  } catch (error) {
    console.log(`❌ API INSEE: ${error.message}`);
  }

  // 3. Test OpenAgenda avec recherche précise
  console.log('3️⃣ Test OpenAgenda - Recherche précise La Réunion');
  try {
    // Test avec différentes recherches
    const searches = [
      'la réunion sport',
      '974 course',
      'réunion trail marathon',
      'saint-denis sport',
      'saint-pierre course'
    ];

    for (const search of searches) {
      try {
        const response = await axios.get('https://api.openagenda.com/v2/agendas', {
          params: {
            key: '7ff0f31080424f389fece1f2fdb6cba8',
            q: search,
            size: 20
          }
        });

        if (response.data.agendas && response.data.agendas.length > 0) {
          console.log(`🔍 "${search}": ${response.data.agendas.length} agendas trouvés`);
          
          // Analyser les agendas trouvés
          for (const agenda of response.data.agendas.slice(0, 3)) {
            console.log(`  📅 ${agenda.title}`);
            console.log(`     📍 ${agenda.location?.name || 'Lieu non spécifié'}`);
            
            // Essayer de récupérer les événements de cet agenda
            try {
              const eventsResponse = await axios.get(`https://api.openagenda.com/v2/agendas/${agenda.uid}/events`, {
                params: {
                  key: '7ff0f31080424f389fece1f2fdb6cba8',
                  size: 10,
                  when: 'upcoming'
                }
              });
              
              if (eventsResponse.data.events?.length > 0) {
                console.log(`     🎉 ${eventsResponse.data.events.length} événements dans cet agenda:`);
                eventsResponse.data.events.slice(0, 3).forEach(event => {
                  console.log(`       - ${event.title?.fr || event.title || 'Événement'}`);
                  console.log(`         📅 ${event.dateRange?.fr || 'Date non spécifiée'}`);
                });
              } else {
                console.log(`     📭 Aucun événement à venir dans cet agenda`);
              }
            } catch (eventError) {
              console.log(`     ❌ Impossible de récupérer les événements: ${eventError.message}`);
            }
          }
        } else {
          console.log(`🔍 "${search}": aucun agenda trouvé`);
        }
      } catch (searchError) {
        console.log(`❌ Recherche "${search}": ${searchError.message}`);
      }
    }
    
  } catch (error) {
    console.log(`❌ OpenAgenda: ${error.message}`);
  }

  // 4. Test de sources spécifiques à La Réunion
  console.log('\n4️⃣ Test sources spécifiques Réunion');
  
  // Listes des URLs potentielles d'APIs
  const reunionAPIs = [
    'https://www.departement974.fr/wp-json/wp/v2/posts?categories=sport',
    'https://reunionsport.com/wp-json/wp/v2/posts',
    'https://www.linfo.re/api/sport',
    'https://www.clicanoo.re/api/sport',
    'https://api.reunion974.fr/events'
  ];

  for (const apiUrl of reunionAPIs) {
    try {
      const response = await axios.get(apiUrl, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SportBot/1.0)',
          'Accept': 'application/json'
        }
      });
      
      console.log(`✅ ${apiUrl}: accessible (${response.status})`);
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`   📊 ${response.data.length} éléments retournés`);
        if (response.data.length > 0) {
          const sample = response.data[0];
          console.log(`   🔬 Structure: ${Object.keys(sample).slice(0, 5).join(', ')}`);
        }
      } else if (response.data && typeof response.data === 'object') {
        console.log(`   📊 Objet retourné avec clés: ${Object.keys(response.data).slice(0, 5).join(', ')}`);
      }
      
    } catch (error) {
      console.log(`❌ ${apiUrl}: ${error.response?.status || 'inaccessible'}`);
    }
  }

  console.log('\n🎯 RECOMMANDATIONS FINALES:');
  console.log('💡 Solutions viables identifiées:');
  console.log('  1. ✅ Conserver notre base locale riche (25+ événements authentiques)');
  console.log('  2. 🔄 Compléter avec OpenAgenda si agendas spécifiques trouvés');
  console.log('  3. 📊 Utiliser data.gouv.fr pour équipements/infrastructures');
  console.log('  4. 🕷️ Scraping ciblé sur les sites d\'actualités sportives');
  console.log('  5. 📱 Intégration Facebook Events pour événements populaires');
  
  console.log('\n📈 STRATÉGIE RECOMMANDÉE:');
  console.log('  • BASE: Notre database locale (garantie de qualité)');
  console.log('  • COMPLÉMENT: APIs externes quand disponibles');
  console.log('  • MISE À JOUR: Scraping hebdomadaire des sites actualités');
  console.log('  • CROWDSOURCING: Permettre aux utilisateurs d\'ajouter des événements');
}

testOfficialData().catch(console.error);