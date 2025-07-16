#!/usr/bin/env node

const app = require('../api/index.js');
const request = require('http');

// Test the API app
const server = app.listen(3001, () => {
  console.log('Testing API endpoints on port 3001...');
  
  // Test /api/health endpoint
  const healthReq = request.get('http://localhost:3001/api/health', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        if (result.status === 'OK') {
          console.log('✅ /api/health endpoint working');
        } else {
          console.log('❌ /api/health endpoint failed');
        }
      } catch (e) {
        console.log('❌ /api/health response parsing failed');
      }
      
      // Test /api/test endpoint
      const testReq = request.get('http://localhost:3001/api/test', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (result.status === 'success') {
              console.log('✅ /api/test endpoint working');
            } else {
              console.log('❌ /api/test endpoint failed');
            }
          } catch (e) {
            console.log('❌ /api/test response parsing failed');
          }
          
          console.log('✅ API testing completed');
          server.close();
        });
      });
      
      testReq.on('error', (e) => {
        console.log('❌ Error testing /api/test:', e.message);
        server.close();
      });
    });
  });
  
  healthReq.on('error', (e) => {
    console.log('❌ Error testing /api/health:', e.message);
    server.close();
  });
});

server.on('error', (e) => {
  console.log('❌ Server error:', e.message);
});