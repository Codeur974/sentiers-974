// Test de l'API Strava pour récupérer les événements de La Réunion
const axios = require('axios');

async function testStravaAPI() {
  console.log('🚴 Test API Strava pour événements La Réunion...\n');
  
  // Configuration Strava API
  const STRAVA_BASE_URL = 'https://www.strava.com/api/v3';
  
  // Note: Strava nécessite OAuth pour la plupart des endpoints
  console.log('📋 INFORMATIONS STRAVA API:');
  console.log('• Strava API nécessite authentification OAuth');
  console.log('• Étapes requises: Client ID + Client Secret');
  console.log('• Endpoints principaux: /clubs, /events, /segments');
  
  // 1. Test des endpoints publics/semi-publics
  console.log('\n1️⃣ Test endpoints publics Strava...');
  
  // Endpoint pour les clubs publics (peut contenir des événements)
  const publicEndpoints = [
    '/clubs/search',
    '/segments/explore',
    '/routes',
    '/events'
  ];
  
  for (const endpoint of publicEndpoints) {
    try {
      console.log(`🔍 Test: GET ${STRAVA_BASE_URL}${endpoint}`);
      
      // Test sans authentification (attendu: 401 mais structure visible)
      const response = await axios.get(`${STRAVA_BASE_URL}${endpoint}`, {
        params: endpoint === '/segments/explore' ? {
          bounds: '-21.4,-55.8,-20.8,-55.2', // Bounding box La Réunion
          activity_type: 'running'
        } : {
          location: 'La Réunion',
          country: 'France'
        },
        timeout: 10000,
        validateStatus: () => true // Accepter toutes les réponses
      });
      
      console.log(`   Status: ${response.status}`);
      if (response.status === 401) {
        console.log('   ✅ Endpoint exists (authentication required)');
      } else if (response.status === 200) {
        console.log('   🎉 Endpoint accessible!');
        console.log(`   📊 Response: ${JSON.stringify(response.data).substring(0, 200)}...`);
      } else {
        console.log(`   ❌ Status ${response.status}: ${response.statusText}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  // 2. Test de l'API Web Strava (scraping léger)
  console.log('\n2️⃣ Test Strava Web (public pages)...');
  
  try {
    // Page publique des événements/clubs
    const webResponse = await axios.get('https://www.strava.com/clubs/search', {
      params: {
        keywords: 'reunion'
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    console.log(`✅ Strava web search accessible (${webResponse.status})`);
    
    // Chercher des clubs réunionnais dans le HTML
    const htmlContent = webResponse.data;
    const reunionClubs = [];
    
    // Pattern matching pour trouver les clubs
    const clubMatches = htmlContent.match(/\/clubs\/\d+/g) || [];
    const titleMatches = htmlContent.match(/>([^<]*réunion[^<]*)</gi) || [];
    
    console.log(`🔍 ${clubMatches.length} liens clubs trouvés`);
    console.log(`🏝️ ${titleMatches.length} mentions "Réunion" trouvées`);
    
    if (titleMatches.length > 0) {
      console.log('📋 Clubs potentiels La Réunion:');
      titleMatches.slice(0, 5).forEach((match, i) => {
        const cleanTitle = match.replace(/<[^>]*>/g, '').replace(/>/g, '');
        console.log(`   ${i + 1}. ${cleanTitle}`);
      });
    }
    
  } catch (error) {
    console.log(`❌ Strava web search: ${error.message}`);
  }
  
  // 3. Test des segments populaires La Réunion
  console.log('\n3️⃣ Test segments populaires La Réunion...');
  
  try {
    // Segments explore endpoint (parfois accessible)
    const segmentsResponse = await axios.get('https://www.strava.com/api/v3/segments/explore', {
      params: {
        bounds: '-21.4,-55.8,-20.8,-55.2', // La Réunion bounding box
        activity_type: 'running',
        min_cat: 0,
        max_cat: 5
      },
      headers: {
        'Accept': 'application/json'
      },
      timeout: 10000,
      validateStatus: () => true
    });
    
    if (segmentsResponse.status === 200 && segmentsResponse.data.segments) {
      console.log(`✅ ${segmentsResponse.data.segments.length} segments trouvés à La Réunion`);
      
      segmentsResponse.data.segments.slice(0, 3).forEach((segment, i) => {
        console.log(`   ${i + 1}. ${segment.name}`);
        console.log(`      📍 ${segment.start_latlng?.[0]}, ${segment.start_latlng?.[1]}`);
        console.log(`      📏 ${segment.distance}m, ${segment.avg_grade}% gradient`);
      });
    } else {
      console.log(`❌ Segments API: Status ${segmentsResponse.status}`);
    }
    
  } catch (error) {
    console.log(`❌ Segments explore: ${error.message}`);
  }
  
  // 4. Guide pour configurer l'authentification
  console.log('\n4️⃣ CONFIGURATION AUTHENTIFICATION STRAVA:');
  console.log('');
  console.log('🔑 Étapes pour configurer Strava API:');
  console.log('1. Créer app sur https://www.strava.com/settings/api');
  console.log('2. Obtenir Client ID + Client Secret');
  console.log('3. Implémenter OAuth flow');
  console.log('4. Récupérer Access Token');
  console.log('');
  console.log('📋 Endpoints utiles avec auth:');
  console.log('• GET /clubs/search?location=La+Réunion');
  console.log('• GET /clubs/{id}/events');  
  console.log('• GET /segments/explore?bounds=-21.4,-55.8,-20.8,-55.2');
  console.log('• GET /athlete/clubs (clubs de l\'utilisateur authentifié)');
  console.log('');
  console.log('🏃 Types d\'événements récupérables:');
  console.log('• Club events / Group activities');
  console.log('• Segments populaires (courses virtuelles)');
  console.log('• Routes partagées par la communauté');
  console.log('• Challenges/competitions');
  
  // 5. Exemple de configuration
  console.log('\n5️⃣ EXEMPLE CONFIGURATION .env:');
  console.log('');
  console.log('# Ajout dans .env');
  console.log('EXPO_PUBLIC_STRAVA_CLIENT_ID=your_client_id_here');
  console.log('EXPO_PUBLIC_STRAVA_CLIENT_SECRET=your_client_secret_here');
  console.log('EXPO_PUBLIC_STRAVA_ACCESS_TOKEN=your_access_token_here');
  
  console.log('\n🎯 CONCLUSION:');
  console.log('✅ Strava API est la solution idéale pour récupérer les vrais événements');
  console.log('🔐 Nécessite configuration OAuth (étapes simples)');
  console.log('🏝️ Données réelles des clubs et événements de La Réunion');
  console.log('📊 Complément parfait à notre base locale');
  
  return {
    recommendation: 'Configure Strava API for real events',
    nextSteps: [
      'Create Strava application',
      'Implement OAuth authentication', 
      'Fetch La Réunion clubs and events',
      'Integrate with existing event system'
    ]
  };
}

testStravaAPI().catch(console.error);