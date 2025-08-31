// Test corrigé de l'API reunionsport.com
const axios = require('axios');

async function testReunionSportAPIFixed() {
  console.log('🏃 Test API reunionsport.com (version corrigée)...\n');
  
  const baseURL = 'https://reunionsport.com/wp-json/wp/v2';
  
  try {
    // 1. Récupérer seulement les posts récents (limité)
    console.log('📰 Récupération des posts récents (limités)...');
    const postsResponse = await axios.get(`${baseURL}/posts`, {
      params: {
        per_page: 10, // Limiter à 10 posts
        orderby: 'date',
        order: 'desc',
        _embed: true // Inclure les métadonnées
      },
      timeout: 15000
    });
    
    console.log(`✅ ${postsResponse.data.length} posts récupérés`);
    console.log(`📊 Structure du premier post:`, Object.keys(postsResponse.data[0] || {}));
    
    const sportsEvents = [];
    
    // Analyser chaque post avec vérification des propriétés
    for (const post of postsResponse.data) {
      try {
        const title = post.title?.rendered || post.title || 'Titre non disponible';
        const content = (post.content?.rendered || post.content || '').replace(/<[^>]*>/g, '');
        const excerpt = (post.excerpt?.rendered || post.excerpt || '').replace(/<[^>]*>/g, '');
        const date = post.date ? new Date(post.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        const link = post.link || post.guid?.rendered || '#';
        
        console.log(`\n📄 Post: ${title}`);
        console.log(`📅 Date: ${date}`);
        console.log(`🔗 Lien: ${link}`);
        console.log(`📝 Extrait: ${excerpt.substring(0, 100)}...`);
        
        // Détecter les événements sportifs
        const eventKeywords = [
          'compétition', 'championnat', 'tournoi', 'course', 'trail', 'marathon',
          'semi-marathon', '10km', 'triathlon', 'match', 'finale', 'coupe',
          'challenge', 'meeting', 'rallye', 'randonnée', 'cyclisme', 'natation'
        ];
        
        const titleLower = title.toLowerCase();
        const contentLower = (content + ' ' + excerpt).toLowerCase();
        
        const hasEventKeyword = eventKeywords.some(keyword => 
          titleLower.includes(keyword) || contentLower.includes(keyword)
        );
        
        if (hasEventKeyword) {
          console.log(`🏆 → Événement sportif détecté!`);
          
          // Extraire localisation
          const locations = ['saint-denis', 'saint-pierre', 'saint-paul', 'saint-louis', 'cilaos', 'salazie'];
          const foundLocation = locations.find(loc => contentLower.includes(loc));
          
          const event = {
            id: `reunionsport_${post.id || Math.random()}`,
            title: title,
            date: date,
            location: foundLocation ? foundLocation.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'La Réunion',
            description: excerpt.substring(0, 200) + '...',
            source: 'reunionsport.com',
            link: link,
            sport: 'Sport',
            emoji: '🏃‍♀️'
          };
          
          sportsEvents.push(event);
        } else {
          console.log(`📰 → Actualité générale`);
        }
        
      } catch (postError) {
        console.log(`❌ Erreur traitement post: ${postError.message}`);
      }
    }
    
    console.log(`\n🏆 RÉSULTAT: ${sportsEvents.length} événements sportifs identifiés`);
    
    if (sportsEvents.length > 0) {
      console.log('\n📋 ÉVÉNEMENTS TROUVÉS:');
      sportsEvents.forEach((event, index) => {
        console.log(`\n${index + 1}. ${event.title}`);
        console.log(`   📅 ${event.date}`);
        console.log(`   📍 ${event.location}`);
        console.log(`   📝 ${event.description.substring(0, 80)}...`);
        console.log(`   🔗 ${event.link}`);
      });
      
      // Sauvegarder
      const fs = require('fs');
      fs.writeFileSync('reunionsport-events-fixed.json', JSON.stringify({
        metadata: {
          source: 'reunionsport.com WordPress API',
          fetchDate: new Date().toISOString(),
          totalEvents: sportsEvents.length
        },
        events: sportsEvents
      }, null, 2));
      
      console.log('\n💾 Événements sauvegardés dans reunionsport-events-fixed.json');
    }
    
    // 2. Test des catégories pour mieux filtrer
    console.log('\n\n🏷️ Test des catégories...');
    try {
      const categoriesResponse = await axios.get(`${baseURL}/categories`, {
        params: { per_page: 20 }
      });
      
      console.log(`✅ ${categoriesResponse.data.length} catégories trouvées`);
      const sportCategories = categoriesResponse.data.filter(cat => {
        const name = (cat.name || '').toLowerCase();
        return name.includes('sport') || name.includes('course') || 
               name.includes('compétition') || name.includes('trail') ||
               name.includes('marathon') || name.includes('cyclisme');
      });
      
      if (sportCategories.length > 0) {
        console.log('🏷️ Catégories sport trouvées:');
        sportCategories.forEach(cat => {
          console.log(`   - ${cat.name} (ID: ${cat.id}) - ${cat.count} posts`);
        });
        
        // Récupérer les posts de la première catégorie sport
        if (sportCategories[0]) {
          console.log(`\n📊 Test posts de la catégorie "${sportCategories[0].name}"...`);
          try {
            const categoryPostsResponse = await axios.get(`${baseURL}/posts`, {
              params: {
                categories: sportCategories[0].id,
                per_page: 5
              }
            });
            
            console.log(`✅ ${categoryPostsResponse.data.length} posts dans cette catégorie`);
            categoryPostsResponse.data.forEach(post => {
              const title = post.title?.rendered || 'Titre non disponible';
              console.log(`   📄 ${title}`);
            });
          } catch (catError) {
            console.log(`❌ Erreur posts catégorie: ${catError.message}`);
          }
        }
      } else {
        console.log('❌ Aucune catégorie sport trouvée');
      }
      
    } catch (catError) {
      console.log(`❌ Erreur catégories: ${catError.message}`);
    }
    
    console.log('\n🎯 CONCLUSION:');
    if (sportsEvents.length > 0) {
      console.log(`✅ API reunionsport.com exploitable`);
      console.log(`📊 ${sportsEvents.length} événements trouvés dans les posts récents`);
      console.log(`💡 Possibilité d'intégrer cette source dans l'app`);
    } else {
      console.log(`⚠️ Peu d'événements détectés dans les posts récents`);
      console.log(`💡 Peut-être que les événements sont dans des catégories spécifiques`);
    }
    
    return sportsEvents;
    
  } catch (error) {
    console.error(`❌ Erreur générale: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, error.response.data?.slice(0, 200));
    }
    return [];
  }
}

testReunionSportAPIFixed().catch(console.error);