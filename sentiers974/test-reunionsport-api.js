// Test de l'API WordPress de reunionsport.com
const axios = require('axios');

async function testReunionSportAPI() {
  console.log('🏃 Test API reunionsport.com (WordPress)...\n');
  
  const baseURL = 'https://reunionsport.com/wp-json/wp/v2';
  
  try {
    // 1. Récupérer les posts récents
    console.log('📰 Récupération des posts récents...');
    const postsResponse = await axios.get(`${baseURL}/posts`, {
      params: {
        per_page: 20,
        orderby: 'date',
        order: 'desc'
      },
      timeout: 15000
    });
    
    console.log(`✅ ${postsResponse.data.length} posts récupérés`);
    
    const sportsEvents = [];
    
    // Analyser chaque post
    for (const post of postsResponse.data) {
      const title = post.title.rendered;
      const content = post.content.rendered.replace(/<[^>]*>/g, ''); // Supprimer HTML
      const excerpt = post.excerpt.rendered.replace(/<[^>]*>/g, '');
      const date = new Date(post.date).toISOString().split('T')[0];
      const link = post.link;
      
      // Détecter les événements sportifs
      const eventKeywords = [
        'compétition', 'championnat', 'tournoi', 'course', 'trail', 'marathon',
        'semi-marathon', '10km', 'triathlon', 'match', 'finale', 'coupe',
        'challenge', 'meeting', 'rallye', 'randonnée', 'rando', 'trek',
        'natation', 'cyclisme', 'vtt', 'surf', 'escalade', 'volley', 'basket',
        'football', 'rugby', 'tennis', 'badminton', 'judo', 'karaté',
        'octobre', 'novembre', 'décembre', 'janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre',
        '2024', '2025', 'dimanche', 'samedi', 'vendredi'
      ];
      
      const titleLower = title.toLowerCase();
      const contentLower = (content + ' ' + excerpt).toLowerCase();
      
      const hasEventKeyword = eventKeywords.some(keyword => 
        titleLower.includes(keyword) || contentLower.includes(keyword)
      );
      
      // Vérifier si c'est un événement futur ou récent
      const recentKeywords = ['prochaine', 'prochain', 'à venir', 'inscription', 'participer', 'rendez-vous'];
      const isUpcoming = recentKeywords.some(keyword => contentLower.includes(keyword));
      
      if (hasEventKeyword || isUpcoming) {
        // Extraire des informations supplémentaires
        const dateMatches = content.match(/(\d{1,2}\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4})/gi);
        const locationMatches = content.match(/(saint-denis|saint-pierre|saint-paul|saint-louis|le-port|la-possession|cilaos|salazie|saint-benoit|saint-joseph|saint-leu|trois-bassins|entre-deux|petite-île|saint-philippe|sainte-marie|sainte-suzanne|bras-panon|plaine-des-palmistes|tampon|avirons)/gi);
        
        const event = {
          id: `reunionsport_${post.id}`,
          title: title,
          date: dateMatches?.[0] || 'À définir',
          location: locationMatches?.[0]?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'La Réunion',
          description: excerpt.substring(0, 200) + '...',
          source: 'reunionsport.com',
          originalDate: date,
          link: link,
          sport: 'Sport',
          type: hasEventKeyword ? 'Événement' : 'Actualité'
        };
        
        sportsEvents.push(event);
      }
    }
    
    console.log(`🏆 ${sportsEvents.length} événements/actualités sportifs identifiés:`);
    
    sportsEvents.slice(0, 10).forEach((event, index) => {
      console.log(`\n${index + 1}. ${event.title}`);
      console.log(`   📅 ${event.date}`);
      console.log(`   📍 ${event.location}`);
      console.log(`   🏷️ ${event.type}`);
      console.log(`   📝 ${event.description.substring(0, 100)}...`);
      console.log(`   🔗 ${event.link}`);
    });
    
    // 2. Tester d'autres endpoints WordPress
    console.log('\n\n🔍 Test des autres endpoints...');
    
    const endpoints = [
      '/categories',
      '/tags', 
      '/pages',
      '/media',
      '/users'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${baseURL}${endpoint}`, {
          params: { per_page: 5 },
          timeout: 8000
        });
        console.log(`✅ ${endpoint}: ${response.data.length} éléments`);
        
        if (endpoint === '/categories') {
          const sportCategories = response.data.filter(cat => 
            cat.name.toLowerCase().includes('sport') ||
            cat.name.toLowerCase().includes('course') ||
            cat.name.toLowerCase().includes('compétition')
          );
          if (sportCategories.length > 0) {
            console.log(`   🏷️ Catégories sport trouvées: ${sportCategories.map(c => c.name).join(', ')}`);
          }
        }
        
      } catch (error) {
        console.log(`❌ ${endpoint}: ${error.response?.status || 'erreur'}`);
      }
    }
    
    // 3. Sauvegarder les données
    const fs = require('fs');
    
    const processedEvents = sportsEvents.map(event => ({
      id: event.id,
      title: event.title,
      sport: event.sport,
      emoji: '🏃‍♀️', // À déterminer selon le contenu
      date: new Date().toISOString().split('T')[0], // Aujourd'hui par défaut
      time: '10:00',
      location: event.location,
      description: event.description,
      difficulty: 'moyen',
      organizer: 'Voir reunionsport.com',
      registration: 'Voir site web',
      price: 'Voir site web',
      website: event.link
    }));
    
    fs.writeFileSync('reunionsport-events.json', JSON.stringify({
      metadata: {
        source: 'reunionsport.com WordPress API',
        fetchDate: new Date().toISOString(),
        totalEvents: processedEvents.length
      },
      events: processedEvents
    }, null, 2));
    
    console.log('\n💾 Événements sauvegardés dans reunionsport-events.json');
    
    console.log('\n🎯 RÉSUMÉ:');
    console.log(`✅ API reunionsport.com fonctionnelle`);
    console.log(`📊 ${sportsEvents.length} événements/actualités sportifs trouvés`);
    console.log(`🔄 Données exploitables pour l'app`);
    console.log(`📅 Mise à jour possible en temps réel`);
    
    return processedEvents;
    
  } catch (error) {
    console.error(`❌ Erreur API reunionsport.com: ${error.message}`);
    return [];
  }
}

testReunionSportAPI().catch(console.error);