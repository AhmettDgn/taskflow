import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve('src');
const files = [];
(function walk(d){ for(const e of fs.readdirSync(d,{withFileTypes:true})){ const p=path.join(d,e.name); if(e.isDirectory()) walk(p); else if(/\.(ts|tsx)$/.test(e.name)) files.push(p);} })(ROOT);
function resolveImport(fromFile, spec){
  let base;
  if(spec.startsWith('@/')) base = path.join(ROOT, spec.slice(2));
  else if(spec.startsWith('.')) base = path.resolve(path.dirname(fromFile), spec);
  else return null; // external
  const cands = [base+'.tsx', base+'.ts', path.join(base,'index.tsx'), path.join(base,'index.ts')];
  for(const c of cands) if(fs.existsSync(c)) return c;
  return null;
}
const graph = new Map();
for(const f of files){
  const src = fs.readFileSync(f,'utf8');
  const deps = new Set();
  const re = /(?:import|export)[^'"]*?from\s*['"]([^'"]+)['"]/g;
  let m;
  while((m=re.exec(src))){ const r=resolveImport(f,m[1]); if(r) deps.add(r); }
  graph.set(f, deps);
}
// DFS cycle detection
const WHITE=0,GRAY=1,BLACK=2; const color=new Map(); const stack=[]; const cycles=[];
function dfs(u){
  color.set(u,GRAY); stack.push(u);
  for(const v of graph.get(u)||[]){
    if(color.get(v)===GRAY){ const i=stack.indexOf(v); cycles.push(stack.slice(i).concat(v)); }
    else if((color.get(v)||WHITE)===WHITE) dfs(v);
  }
  stack.pop(); color.set(u,BLACK);
}
for(const f of files) if((color.get(f)||WHITE)===WHITE) dfs(f);
const rel=(p)=>path.relative(ROOT,p).split(path.sep).join('/');
if(!cycles.length) console.log('NO CYCLES FOUND');
else { console.log('CYCLES:', cycles.length); const seen=new Set(); for(const c of cycles){ const key=c.map(rel).sort().join('|'); if(seen.has(key))continue; seen.add(key); console.log('  '+c.map(rel).join('  ->  ')); } }
