const fs = require('fs');
const filepath = 'C:/Users/Usuario/.claude/projects/C--Users-Usuario-Desktop-Tableros-Envasadora/64b55db6-18c0-4584-9218-eacce1067950/tool-results/b1bikc84g.txt';
const content = fs.readFileSync(filepath, 'utf8');

const startIdx = content.indexOf('const DATA = [');
if (startIdx < 0) { console.log('Not found'); process.exit(1); }
const arrStart = startIdx + 'const DATA = '.length;

// Find matching ] 
let depth = 0, i = arrStart, inStr = false;
const BS = String.fromCharCode(92);
while (i < content.length) {
  const ch = content[i];
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
const dataStr = content.substring(arrStart, i+1);
try {
  const data = JSON.parse(dataStr);
  console.log('Articles:', data.length);
  console.log('First:', data[0].articulo, '- stock:', data[0].stock);
  console.log('Last:', data[data.length-1].articulo);
  fs.writeFileSync('C:/Users/Usuario/Desktop/Tableros/Insumos/recovered_data.json', JSON.stringify(data));
  console.log('Saved to recovered_data.json!');
} catch(e) {
  console.log('Parse error:', e.message);
  console.log('End of extracted:', dataStr.substring(dataStr.length-200));
}
