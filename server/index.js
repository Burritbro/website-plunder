/**
 * Website Plunder - Main Server
 *
 * A simple Express server that:
 * - Serves the pirate-themed frontend
 * - Exposes POST /replicate endpoint for website replication
 *
 * Design Decision: Minimal Express setup with just the essentials.
 * No middleware bloat, no unnecessary dependencies.
 */

const express = require('express');
const path = require('path');
const { replicate } = require('./routes/replicate');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware: Parse JSON request bodies
app.use(express.json({ limit: '50mb' }));

// Middleware: Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Route: POST /replicate - Main replication endpoint
app.post('/replicate', replicate);

// Route: GET / - Serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('⚓ ═══════════════════════════════════════════════════ ⚓');
  console.log('   🏴‍☠️  WEBSITE PLUNDER - Ready to Set Sail!  🏴‍☠️');
  console.log('⚓ ═══════════════════════════════════════════════════ ⚓');
  console.log('');
  console.log(`   ⚓ Server running on: http://localhost:${PORT}`);
  console.log('   ⚓ Ready to plunder websites!');
  console.log('');
  console.log('⚓ ═══════════════════════════════════════════════════ ⚓');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  process.exit(0);
});
