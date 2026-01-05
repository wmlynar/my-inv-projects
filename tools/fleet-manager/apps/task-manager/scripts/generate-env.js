const fs = require('fs');
const path = require('path');

const { renderEnvExample } = require('../config_schema');

const outPath = path.resolve(__dirname, '..', '.env.example');
const content = `${renderEnvExample()}\n`;
fs.writeFileSync(outPath, content, 'utf8');
console.log(`wrote ${outPath}`);
