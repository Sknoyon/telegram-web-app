// EMERGENCY REDIRECT TO SIMPLIFIED SERVER
// This file redirects to server-simple.js to force Railway deployment

console.log('🚨 EMERGENCY: Redirecting to simplified server...');
console.log('📁 Loading server-simple.js instead of server.js');

// Load and start the simplified server
const SimpleServer = require('./server-simple');

const server = new SimpleServer();
server.start();

console.log('✅ Emergency redirect completed - now running simplified server');