const fs = require('fs');

// Read current index.html
const html = fs.readFileSync('C:/Users/Usuario/Desktop/Tableros/Insumos/public/index.html', 'utf8');

// Read recovered data
const data = JSON.parse(fs.readFileSync('C:/Users/Usuario/Desktop/Tableros/Insumos/recovered_data.json', 'utf8'));
console.log('Recovered articles:', data.length);

// Find DATA array in html
const startMarker = 'const DATA = [';
const startIdx = html.indexOf(startMarker);
if (startIdx < 0) { console.log('DATA not found in HTML'); process.exit(1); }
const arrStart = startIdx + 'const DATA = '.length;

// Find matching ]
let depth = 0, i = arrStart, inStr = false;
const BS = String.fromCharCode(92);
while (i < html.length) {
  const ch = html[i];
  if (inStr) {
    if (ch === BS) i++;
    else if (ch === '"') inStr = false;
  } else {
    if (ch === '"') inStr = true;
    else if (ch === '[') depth++;
    else if (ch === ']') { depth--; if (depth === 0) break; }
  }
  i++;
}

const before = html.substring(0, arrStart);
const after = html.substring(i+1);
const newDataStr = JSON.stringify(data);
const newHtml = before + newDataStr + after;

fs.writeFileSync('C:/Users/Usuario/Desktop/Tableros/Insumos/public/index.html', newHtml);
console.log('Done! New HTML size:', newHtml.length, 'chars');

// Verify
const check = newHtml.indexOf('ADHESIVO HOT MELT');
console.log('ADHESIVO HOT MELT found:', check > 0);
