const fs = require('fs');
const path = require('path');

function getFiles(dir, exts = ['.ts', '.tsx', '.sql']) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === 'node_modules' || file === 'dist' || file === '.git') continue;
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(getFiles(full, exts));
    } else if (exts.includes(path.extname(file))) {
      results.push(full);
    }
  }
  return results;
}

console.log('=== 1. SOURCE CODE INVENTORY ===');
const srcFiles = getFiles('src');
console.log(`Total source files: ${srcFiles.length}`);

const components = srcFiles.filter(f => f.includes('components'));
const services = srcFiles.filter(f => f.includes('services'));
const hooks = srcFiles.filter(f => f.includes('hooks'));

console.log('\nComponents:');
components.forEach(c => console.log('  -', c));

console.log('\nServices / API layer:');
services.forEach(s => console.log('  -', s));

console.log('\nHooks:');
hooks.forEach(h => console.log('  -', h));

console.log('\n=== 2. SUPABASE MIGRATIONS & TABLES INVENTORY ===');
const sqlFiles = getFiles('supabase');
sqlFiles.forEach(f => {
  console.log(`\nMigration File: ${f}`);
  const content = fs.readFileSync(f, 'utf8');
  const tableMatches = content.match(/CREATE TABLE IF NOT EXISTS public\.([a-z_]+)/g) || [];
  const rpcMatches = content.match(/CREATE OR REPLACE FUNCTION public\.([a-z_]+)/g) || [];
  const policyMatches = content.match(/CREATE POLICY "([^"]+)"\s+ON public\.([a-z_]+)/g) || [];
  
  console.log('  Tables:');
  tableMatches.forEach(t => console.log('    ', t.replace('CREATE TABLE IF NOT EXISTS public.', '')));
  console.log('  Functions/RPCs:');
  rpcMatches.forEach(r => console.log('    ', r.replace('CREATE OR REPLACE FUNCTION public.', '')));
  console.log(`  Policies count: ${policyMatches.length}`);
});

