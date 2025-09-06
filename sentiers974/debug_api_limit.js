const http = require('http');

// Test avec différentes limites
const testLimits = [100, 200, 500, 1000];

function testLimit(limit) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api/sentiers?limit=${limit}`,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            requestedLimit: limit,
            actualLimit: response.pagination?.limit,
            returned: response.data?.length || 0,
            total: response.pagination?.total
          });
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('🔍 Test des différentes limites API...\n');
  
  for (const limit of testLimits) {
    try {
      const result = await testLimit(limit);
      console.log(`Limite ${result.requestedLimit}:`);
      console.log(`  - API limite: ${result.actualLimit}`);
      console.log(`  - Sentiers retournés: ${result.returned}`);
      console.log(`  - Total en base: ${result.total}`);
      console.log();
    } catch (error) {
      console.error(`❌ Erreur limite ${limit}:`, error.message);
    }
  }
}

runTests();