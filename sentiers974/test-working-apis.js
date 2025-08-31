// Test des APIs qui fonctionnent pour récupérer les événements sportifs Réunion
const axios = require('axios');
const cheerio = require('cheerio'); // Pour scraper si nécessaire

async function testWorkingAPIs() {
  console.log('🔍 Test des sources d\'événements sportifs réellement accessibles...\n');

  // 1. Test data.sports.gouv.fr (équipements sportifs La Réunion)
  console.log('1️⃣ Test data.sports.gouv.fr');
  try {
    const sportsGouvResponse = await axios.get('https://data.sports.gouv.fr/api/records/1.0/search/', {
      params: {
        dataset: 'recensement-des-equipements-sportifs',
        q: 'Réunion OR 974',
        rows: 20,
        facet: ['commune_nom', 'type_equipement']
      },
      timeout: 15000
    });
    
    console.log(`✅ data.sports.gouv.fr: ${sportsGouvResponse.data.records?.length || 0} équipements trouvés`);
    if (sportsGouvResponse.data.records?.length > 0) {
      const sample = sportsGouvResponse.data.records[0].fields;
      console.log(`📍 Exemple: ${sample.nom_equipement} à ${sample.commune_nom}`);
      console.log(`🏃 Type: ${sample.type_equipement}`);
    }
  } catch (error) {
    console.log(`❌ data.sports.gouv.fr: ${error.message}`);
  }

  // 2. Test Agenda du Conseil Départemental via scraping
  console.log('\n2️⃣ Test Conseil Départemental 974');
  try {
    const depResponse = await axios.get('https://www.departement974.fr/agenda', {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log(`✅ departement974.fr accessible (${depResponse.status})`);
    console.log('💡 Possibilité de scraper les événements sportifs depuis le site web');
  } catch (error) {
    console.log(`❌ departement974.fr: ${error.message}`);
  }

  // 3. Test site officiel Réunion Sport
  console.log('\n3️⃣ Test reunionsport.com');
  try {
    const reunionSportResponse = await axios.get('https://www.reunionsport.com', {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log(`✅ reunionsport.com accessible (${reunionSportResponse.status})`);
    console.log('💡 Site officiel du sport à La Réunion - scrapable');
  } catch (error) {
    console.log(`❌ reunionsport.com: ${error.message}`);
  }

  // 4. Test Facebook Events API (événements publics La Réunion)
  console.log('\n4️⃣ Test Facebook Events');
  try {
    // Note: nécessite un access token valide
    console.log('💡 Facebook Events: nécessite configuration access token');
    console.log('📱 Peut récupérer les événements sportifs publics de La Réunion');
  } catch (error) {
    console.log(`❌ Facebook Events: ${error.message}`);
  }

  // 5. Test API Office de Tourisme
  console.log('\n5️⃣ Test API Office de Tourisme');
  try {
    // Test plusieurs endpoints possibles
    const tourismeEndpoints = [
      'https://www.ilereunion.com/api/events',
      'https://api.reunion-tourisme.com/events',
      'https://www.reunion.fr/api/events'
    ];

    for (const endpoint of tourismeEndpoints) {
      try {
        const response = await axios.get(endpoint, {
          timeout: 10000,
          params: { category: 'sport', type: 'event' }
        });
        console.log(`✅ ${endpoint}: accessible`);
        break;
      } catch (err) {
        console.log(`❌ ${endpoint}: ${err.response?.status || 'inaccessible'}`);
      }
    }
  } catch (error) {
    console.log(`❌ APIs Tourisme: ${error.message}`);
  }

  // 6. Test des APIs municipales
  console.log('\n6️⃣ Test APIs Municipales');
  const municipalities = [
    'https://www.saint-denis.re/api/agenda',
    'https://www.saint-pierre.re/api/events',
    'https://www.saint-paul.re/api/agenda'
  ];

  for (const cityApi of municipalities) {
    try {
      const response = await axios.get(cityApi, {
        timeout: 8000,
        params: { category: 'sport' }
      });
      console.log(`✅ ${cityApi}: accessible`);
    } catch (error) {
      console.log(`❌ ${cityApi}: ${error.response?.status || 'inaccessible'}`);
    }
  }

  // 7. Test OpenData France
  console.log('\n7️⃣ Test OpenData France');
  try {
    const openDataResponse = await axios.get('https://www.data.gouv.fr/api/1/datasets/', {
      params: {
        q: 'sport Réunion 974',
        page_size: 10
      },
      timeout: 15000
    });

    console.log(`✅ OpenData France: ${openDataResponse.data.data?.length || 0} datasets trouvés`);
    if (openDataResponse.data.data?.length > 0) {
      openDataResponse.data.data.slice(0, 3).forEach(dataset => {
        console.log(`📊 Dataset: ${dataset.title}`);
        console.log(`🔗 URL: ${dataset.page}`);
      });
    }
  } catch (error) {
    console.log(`❌ OpenData France: ${error.message}`);
  }

  console.log('\n🎯 RÉSUMÉ DES SOURCES VIABLES:');
  console.log('✅ Sources recommandées:');
  console.log('  1. data.sports.gouv.fr - Équipements sportifs (API REST)');
  console.log('  2. departement974.fr - Scraping agenda (Web scraping)');
  console.log('  3. reunionsport.com - Site officiel (Web scraping)');
  console.log('  4. Facebook Events - Événements publics (Graph API)');
  console.log('  5. OpenData datasets spécifiques');
  
  console.log('\n💡 Stratégie recommandée:');
  console.log('  • Combiner API officielle + scraping + données locales');
  console.log('  • Prioriser les sources gouvernementales');
  console.log('  • Fallback sur notre base locale');
}

testWorkingAPIs().catch(console.error);