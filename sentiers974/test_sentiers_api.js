// Test rapide pour vérifier l'API OpenStreetMap
const https = require('https');

const REUNION_BBOX = {
  south: -21.3896,
  west: 55.2164,
  north: -20.8717,
  east: 55.8369
};

const overpassQuery = `[out:json][timeout:30];
(
  way["highway"="path"]["name"](bbox:${REUNION_BBOX.south},${REUNION_BBOX.west},${REUNION_BBOX.north},${REUNION_BBOX.east});
  way["highway"="footway"]["name"](bbox:${REUNION_BBOX.south},${REUNION_BBOX.west},${REUNION_BBOX.north},${REUNION_BBOX.east});
  way["route"="hiking"]["name"](bbox:${REUNION_BBOX.south},${REUNION_BBOX.west},${REUNION_BBOX.north},${REUNION_BBOX.east});
);
out geom;`;

console.log('🔍 Test de l\'API Overpass pour La Réunion...');
console.log('Requête:', overpassQuery.substring(0, 100) + '...');

const data = JSON.stringify(overpassQuery);

const options = {
  hostname: 'overpass-api.de',
  port: 443,
  path: '/api/interpreter',
  method: 'POST',
  headers: {
    'Content-Type': 'text/plain',
    'Content-Length': Buffer.byteLength(data),
    'User-Agent': 'Sentiers974App-Test/1.0.0'
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    try {
      const json = JSON.parse(responseData);
      console.log(`✅ Réponse reçue: ${json.elements?.length || 0} éléments trouvés`);
      
      if (json.elements && json.elements.length > 0) {
        console.log('\n📊 Premiers résultats:');
        json.elements.slice(0, 3).forEach((element, index) => {
          console.log(`${index + 1}. ${element.tags?.name || 'Sans nom'}`);
          console.log(`   Type: ${element.tags?.highway || element.tags?.route || 'N/A'}`);
          console.log(`   Géométrie: ${element.geometry?.length || 0} points`);
        });
      } else {
        console.log('❌ Aucun sentier trouvé - vérifier la requête');
      }
    } catch (error) {
      console.error('❌ Erreur parsing JSON:', error.message);
      console.log('Réponse brute:', responseData.substring(0, 200));
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erreur requête:', error.message);
});

req.write(data);
req.end();