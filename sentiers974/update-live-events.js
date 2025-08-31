#!/usr/bin/env node

/**
 * Script de mise à jour périodique des événements sportifs en temps réel
 * À exécuter quotidiennement via cron ou automatiquement
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Mise à jour des événements sportifs La Réunion...');

async function updateLiveEvents() {
  try {
    // Import dynamique du service (nécessaire pour les modules TypeScript)
    const { liveEventsApi } = require('./src/services/liveEventsApi.ts');
    
    console.log('📡 Récupération des nouveaux événements...');
    
    // Récupérer tous les événements live
    const liveEvents = await liveEventsApi.getAllLiveEvents();
    
    console.log(`✅ ${liveEvents.length} événements live récupérés`);
    
    // Sauvegarder dans un fichier JSON pour cache
    const cacheFile = path.join(__dirname, 'live-events-cache.json');
    const cacheData = {
      lastUpdated: new Date().toISOString(),
      events: liveEvents,
      count: liveEvents.length
    };
    
    fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));
    console.log(`💾 Cache mis à jour: ${cacheFile}`);
    
    // Statistiques
    const sportTypes = [...new Set(liveEvents.map(e => e.sport))];
    console.log(`🏃 Sports trouvés: ${sportTypes.join(', ')}`);
    
    // Événements des 7 prochains jours
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    const upcomingEvents = liveEvents.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= today && eventDate <= nextWeek;
    });
    
    console.log(`📅 ${upcomingEvents.length} événements dans les 7 prochains jours`);
    
    if (upcomingEvents.length > 0) {
      console.log('\n🎯 Prochains événements:');
      upcomingEvents.slice(0, 5).forEach(event => {
        console.log(`  • ${event.date} - ${event.title} (${event.sport})`);
      });
    }
    
    return {
      success: true,
      totalEvents: liveEvents.length,
      upcomingEvents: upcomingEvents.length,
      sports: sportTypes.length
    };
    
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Fonction pour nettoyer les anciens événements
function cleanupOldEvents() {
  try {
    const cacheFile = path.join(__dirname, 'live-events-cache.json');
    
    if (fs.existsSync(cacheFile)) {
      const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      const today = new Date().toISOString().split('T')[0];
      
      // Garder seulement les événements futurs
      const futureEvents = cacheData.events.filter(event => event.date >= today);
      
      if (futureEvents.length !== cacheData.events.length) {
        cacheData.events = futureEvents;
        cacheData.count = futureEvents.length;
        cacheData.lastCleaned = new Date().toISOString();
        
        fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));
        
        const removedCount = cacheData.events.length - futureEvents.length;
        console.log(`🧹 ${removedCount} événements passés supprimés du cache`);
      }
    }
  } catch (error) {
    console.warn('⚠️ Erreur nettoyage cache:', error.message);
  }
}

// Fonction principale
async function main() {
  const startTime = Date.now();
  
  console.log(`🚀 Démarrage mise à jour - ${new Date().toLocaleString('fr-FR')}`);
  
  // 1. Nettoyer les anciens événements
  cleanupOldEvents();
  
  // 2. Récupérer nouveaux événements
  const result = await updateLiveEvents();
  
  const duration = Math.round((Date.now() - startTime) / 1000);
  
  if (result.success) {
    console.log(`\n🎉 SUCCÈS - Terminé en ${duration}s`);
    console.log(`📊 ${result.totalEvents} événements, ${result.upcomingEvents} à venir, ${result.sports} sports`);
    
    // Log pour monitoring
    const logEntry = {
      timestamp: new Date().toISOString(),
      success: true,
      duration: duration,
      totalEvents: result.totalEvents,
      upcomingEvents: result.upcomingEvents,
      sports: result.sports
    };
    
    // Ajouter au log (optionnel)
    const logFile = path.join(__dirname, 'update-log.json');
    let logs = [];
    
    if (fs.existsSync(logFile)) {
      logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    }
    
    logs.push(logEntry);
    
    // Garder seulement les 50 derniers logs
    if (logs.length > 50) {
      logs = logs.slice(-50);
    }
    
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
    
  } else {
    console.log(`\n💥 ÉCHEC - Erreur après ${duration}s`);
    console.log(`❌ ${result.error}`);
    process.exit(1);
  }
}

// Exécution si appelé directement
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { updateLiveEvents, cleanupOldEvents };