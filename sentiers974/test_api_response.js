const https = require('http');

// Test de l'API
const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/sentiers?limit=500',
  method: 'GET'
};

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('✅ API Response:');
      console.log('- Success:', response.success);
      console.log('- Sentiers retournés:', response.data?.length || 0);
      console.log('- Pagination:', JSON.stringify(response.pagination, null, 2));
      
      if (response.data && response.data.length > 0) {
        console.log('- Exemple de sentier:');
        const example = response.data[0];
        console.log(`  * ${example.nom} (${example.region})`);
      }
    } catch (error) {
      console.error('❌ Erreur parsing JSON:', error);
      console.log('Réponse brute:', data.substring(0, 500));
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erreur requête:', error);
});

req.end();