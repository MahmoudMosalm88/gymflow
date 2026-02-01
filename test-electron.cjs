const electron = require('electron');
console.log('electron module type:', typeof electron);
console.log('electron.app type:', typeof electron.app);
console.log('electron keys:', Object.keys(electron));
if (electron.app) {
  console.log('app.whenReady exists:', typeof electron.app.whenReady);
}
process.exit(0);
