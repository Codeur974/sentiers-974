// Test du nombre d'événements par filtre
const fs = require('fs');

console.log('🔢 TEST NOMBRE D\'ÉVÉNEMENTS PAR FILTRE\n');

// Simuler les données (en réalité elles viennent de reunionEvents.ts)
const events = [
  { id: 'diagonale-fous-2025', title: 'Diagonale des Fous', date: '2025-10-23' },
  { id: 'trail-bourbon-2025', title: 'Trail de Bourbon', date: '2025-06-14' },
  { id: 'madere-trail-2025', title: 'Madère Trail', date: '2025-08-09' },
  { id: 'marathon-reunion-2025', title: 'Marathon International', date: '2025-09-28' },
  { id: '10km-saint-denis-2025', title: '10km de Saint-Denis', date: '2025-09-14' },
  { id: 'course-saint-paul-2025', title: 'Course des Hauts de Saint-Paul', date: '2025-09-21' },
  { id: 'rando-piton-neiges-2025', title: 'Ascension Piton des Neiges', date: '2025-09-07' },
  { id: 'rando-mafate-2025', title: 'Traversée de Mafate', date: '2025-09-20' },
  { id: 'rando-takamaka-2025', title: 'Bassin la Paix et Takamaka', date: '2025-09-15' },
  { id: 'tour-reunion-2025', title: 'Tour de La Réunion Cycliste', date: '2025-07-19' },
  { id: 'vtt-maido-2025', title: 'VTT Descente du Maïdo', date: '2025-09-28' },
  { id: 'natation-hermitage-2025', title: 'Traversée du Lagon', date: '2025-09-13' },
  { id: 'surf-contest-2025', title: 'Réunion Surf Pro', date: '2025-05-10' },
  { id: 'sup-tour-2025', title: 'SUP Tour du Lagon Ouest', date: '2025-09-16' },
  { id: 'kayak-langevin-2025', title: 'Descente Kayak Rivière Langevin', date: '2025-10-05' },
  { id: 'escalade-manapany-2025', title: 'Festival d\'Escalade de Manapany', date: '2025-10-11' },
  { id: 'marche-nordique-2025', title: 'Marche Nordique Forêt de Bélouve', date: '2025-09-06' }
];

console.log('📊 ANALYSE DES FILTRES:\n');

const today = new Date().toISOString().split('T')[0];
const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 30);
const future30Days = futureDate.toISOString().split('T')[0];

console.log(`📅 Aujourd'hui: ${today}`);
console.log(`📅 Dans 30 jours: ${future30Days}\n`);

// Filtre "Aujourd'hui"
const todayEvents = events.filter(e => e.date === today);
console.log(`🔍 FILTRE "AUJOURD'HUI":`);
console.log(`   → ${todayEvents.length} événement${todayEvents.length > 1 ? 's' : ''} trouvé${todayEvents.length > 1 ? 's' : ''}`);
if (todayEvents.length > 0) {
  todayEvents.forEach(e => console.log(`     • ${e.title} (${e.date})`));
} else {
  console.log('     • Aucun événement aujourd\'hui');
}
console.log('');

// Filtre "À venir (30j)"
const upcomingEvents = events.filter(e => e.date > today && e.date <= future30Days);
console.log(`🔍 FILTRE "À VENIR (30 JOURS)":`);
console.log(`   → ${upcomingEvents.length} événement${upcomingEvents.length > 1 ? 's' : ''}`);
upcomingEvents.forEach(e => {
  const daysUntil = Math.ceil((new Date(e.date) - new Date()) / (1000 * 60 * 60 * 24));
  console.log(`     • ${e.title} - Dans ${daysUntil} jours (${e.date})`);
});
console.log('');

// Filtre "Tous"
console.log(`🔍 FILTRE "TOUS LES ÉVÉNEMENTS":`);
console.log(`   → ${events.length} événements au total`);
console.log('   • Tous les événements 2025 visibles');
console.log('');

// Événements par période
const pastEvents = events.filter(e => e.date < today);
const todayEventsCount = todayEvents.length;
const futureEvents = events.filter(e => e.date > today);

console.log('📈 RÉPARTITION TEMPORELLE:');
console.log(`   📅 Passés: ${pastEvents.length}`);
console.log(`   📅 Aujourd'hui: ${todayEventsCount}`);  
console.log(`   📅 À venir: ${futureEvents.length}`);
console.log(`   📅 TOTAL: ${events.length}\n`);

console.log('🎯 PROBLÈME IDENTIFIÉ:\n');

console.log('❌ SI VOUS VOYEZ SEULEMENT 5 ÉVÉNEMENTS:');
console.log('   1. Problème de limite de hauteur (max-h-96)');
console.log('   2. Problème de ScrollView imbriqué');
console.log('   3. Problème de rendu des EventCard\n');

console.log('✅ SOLUTIONS APPLIQUÉES:');
console.log('   1. Suppression de max-h-96');
console.log('   2. Ajout de nestedScrollEnabled={true}');
console.log('   3. Affichage de TOUS les filteredEvents\n');

console.log('🔬 VÉRIFICATION ATTENDUE:');
console.log('┌─────────────────────────────────────────────────┐');
console.log('│ Filtre "Tous" devrait afficher:                │');
console.log('│   → 17 événements (tous les événements 2025)   │');
console.log('│                                                 │');
console.log('│ Filtre "À venir" devrait afficher:             │');
console.log(`│   → ${upcomingEvents.length} événements (prochains 30 jours)        │`);
console.log('│                                                 │');  
console.log('│ Filtre "Aujourd\'hui" devrait afficher:         │');
console.log(`│   → ${todayEvents.length} événement${todayEvents.length > 1 ? 's' : ''} (${todayEvents.length === 0 ? 'aucun' : 'événements du jour'})          │`);
console.log('└─────────────────────────────────────────────────┘\n');

console.log('🐛 SI LE PROBLÈME PERSISTE:');
console.log('   → Vérifiez les dates dans reunionEvents.ts');
console.log('   → Vérifiez le fonctionnement des filtres');
console.log('   → Vérifiez si EventCard s\'affiche correctement');

console.log('\n🎯 Normalement vous devriez voir TOUS les 17 événements avec le filtre "Tous" !');