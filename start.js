// start.js
// 1) Force production if nothing is set by IIS
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// 2) Start your compiled Nest app
require('./dist/main.js'); // adjust if your entry is elsewhere
