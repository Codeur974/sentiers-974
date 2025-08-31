// Scraper pour récupérer les vrais événements sportifs de La Réunion
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeReunionSportsEvents() {
  console.log('🕷️ Scraping des événements sportifs de La Réunion...\n');
  
  const events = [];
  
  // 1. Scraper departement974.fr
  console.log('🏛️ Scraping Conseil Départemental 974...');
  try {
    const response = await axios.get('https://www.departement974.fr/agenda', {
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    console.log('✅ Page chargée, analyse du contenu...');
    
    // Chercher les événements sportifs
    $('.agenda-item, .event-item, .event, article').each((i, element) => {
      const $el = $(element);
      const title = $el.find('h2, h3, .title, .event-title').text().trim();
      const date = $el.find('.date, .event-date, time').text().trim();
      const location = $el.find('.location, .lieu, .place').text().trim();
      const description = $el.find('p, .description, .excerpt').text().trim();
      
      // Filtrer les événements sportifs
      const isSportEvent = title.toLowerCase().match(/(sport|trail|course|marathon|vélo|vtt|natation|surf|escalade|rando)/);
      
      if (isSportEvent && title.length > 0) {
        events.push({
          source: 'departement974.fr',
          title: title,
          date: date || 'Date à définir',
          location: location || 'La Réunion',
          description: description.substring(0, 200) + '...',
          type: 'événement départemental'
        });
      }
    });
    
    console.log(`📅 ${events.filter(e => e.source === 'departement974.fr').length} événements trouvés sur le site départemental`);
    
  } catch (error) {
    console.log(`❌ Erreur departement974.fr: ${error.message}`);
  }
  
  // 2. Scraper reunionsport.com
  console.log('\n🏃 Scraping reunionsport.com...');
  try {
    const response = await axios.get('https://www.reunionsport.com', {
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    console.log('✅ Page reunionsport.com chargée');
    
    // Chercher les événements/actualités sportifs
    $('.post, .article, .event, .news-item').each((i, element) => {
      const $el = $(element);
      const title = $el.find('h1, h2, h3, .title').text().trim();
      const date = $el.find('.date, time, .published').text().trim();
      const description = $el.find('p, .excerpt, .summary').first().text().trim();
      const link = $el.find('a').attr('href');
      
      if (title.length > 10) {
        events.push({
          source: 'reunionsport.com',
          title: title,
          date: date || 'À venir',
          location: 'La Réunion',
          description: description.substring(0, 200) + '...',
          link: link,
          type: 'actualité sportive'
        });
      }
    });
    
    console.log(`🏃 ${events.filter(e => e.source === 'reunionsport.com').length} actualités/événements trouvés sur reunionsport.com`);
    
  } catch (error) {
    console.log(`❌ Erreur reunionsport.com: ${error.message}`);
  }
  
  // 3. Tenter de scraper d'autres sources
  console.log('\n🔍 Test d\'autres sources...');
  
  const otherSources = [
    'https://www.clicanoo.re/sport',
    'https://www.ipreunion.com/sport',
    'https://www.zinfos974.com/sport'
  ];
  
  for (const source of otherSources) {
    try {
      console.log(`📰 Test ${source}...`);
      const response = await axios.get(source, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      
      // Recherche générique d'articles sportifs
      $('.article, .post, .news-item, article').each((i, element) => {
        if (i > 10) return; // Limiter à 10 par source
        
        const $el = $(element);
        const title = $el.find('h1, h2, h3, .title, .headline').text().trim();
        const date = $el.find('.date, time, .published').text().trim();
        const description = $el.find('p').first().text().trim();
        
        // Filtrer les contenus sportifs avec événements
        const hasEventKeywords = title.toLowerCase().match(/(compétition|tournoi|championnat|marathon|trail|course|match|finale|coupe)/);
        
        if (hasEventKeywords && title.length > 10) {
          events.push({
            source: new URL(source).hostname,
            title: title,
            date: date || 'À confirmer',
            location: 'La Réunion',
            description: description.substring(0, 150) + '...',
            type: 'événement médiatisé'
          });
        }
      });
      
      console.log(`✅ ${source}: analysé`);
      
    } catch (error) {
      console.log(`❌ ${source}: non accessible`);
    }
  }
  
  // 4. Affichage des résultats
  console.log('\n📊 RÉSULTATS DU SCRAPING:');
  console.log(`🏆 Total: ${events.length} événements/actualités sportifs trouvés`);
  
  // Grouper par source
  const bySource = events.reduce((acc, event) => {
    if (!acc[event.source]) acc[event.source] = [];
    acc[event.source].push(event);
    return acc;
  }, {});
  
  Object.entries(bySource).forEach(([source, sourceEvents]) => {
    console.log(`\n📡 ${source}: ${sourceEvents.length} éléments`);
    sourceEvents.slice(0, 3).forEach((event, i) => {
      console.log(`  ${i + 1}. ${event.title}`);
      console.log(`     📅 ${event.date}`);
      console.log(`     📍 ${event.location}`);
    });
  });
  
  // 5. Sauvegarder les résultats
  const fs = require('fs');
  fs.writeFileSync('scraped-events.json', JSON.stringify(events, null, 2));
  console.log('\n💾 Événements sauvegardés dans scraped-events.json');
  
  console.log('\n💡 PROCHAINES ÉTAPES:');
  console.log('1. Analyser les événements scrapés');
  console.log('2. Normaliser les données (dates, lieux, types)');
  console.log('3. Créer un transformateur pour l\'app');
  console.log('4. Mettre en place un système de mise à jour régulière');
  
  return events;
}

scrapeReunionSportsEvents().catch(console.error);