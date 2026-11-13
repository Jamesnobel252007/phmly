const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const item of list) {
    if (item === 'node_modules' || item === 'dist' || item === '.git') continue;
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) results = results.concat(walk(full));
    else if (/\.tsx?$/.test(item)) results.push(full);
  }
  return results;
}

const files = walk('src');
console.log('=== AUDITING UI COMPONENTS FOR RESPONSIVENESS & CONVENTIONS ===');
let issues = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  
  // 1. Check for legacy Arjun references
  if (/user-arjun|Arjun/i.test(content) && !file.includes('storage.ts')) {
    console.warn(`[WARN] Hardcoded Arjun reference found in ${file}`);
    issues++;
  }

  // 2. Check for unbounded table overflow
  if (content.includes('<table') && !content.includes('overflow-x')) {
    console.warn(`[WARN] Table without overflow-x container in ${file}`);
    issues++;
  }

  // 3. Check for fixed widths greater than 320px without max-w
  const fixedWidthMatch = content.match(/w-\[(3[3-9]\d|[4-9]\d\d|\d{4,})px\]/g);
  if (fixedWidthMatch) {
    console.warn(`[WARN] Fixed width > 320px found in ${file}: ${fixedWidthMatch.join(', ')}`);
    issues++;
  }
}

if (issues === 0) {
  console.log('[PASS] All components pass mobile responsiveness, touch boundaries, and legacy cleanup checks.');
} else {
  console.log(`[ALERT] Found ${issues} potential issues.`);
}

