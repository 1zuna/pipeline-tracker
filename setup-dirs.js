const fs = require('fs');
const path = require('path');

const dirs = ['src', 'src/utils', 'src/services', 'src/renderer'];
dirs.forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
});
console.log('Directories created successfully!');
