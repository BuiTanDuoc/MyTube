// Verifies that en.json and vi.json define the same keys and that every literal t('...') key used in src/ exists.
// Dynamic keys (t(`status.${x}`)) cannot be checked statically and are skipped.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) => (typeof v === 'object' && v !== null ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
const base = (key) => key.replace(/_(one|other|zero|few|many|two)$/, '');

const load = (lang) => new Set(flatten(JSON.parse(readFileSync(`src/i18n/${lang}.json`, 'utf8'))).map(base));
const en = load('en');
const vi = load('vi');

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f) ? [p] : [];
  });

const used = new Set();
for (const file of walk('src')) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(/\bt\(\s*'([^']+)'/g)) used.add(m[1]);
}

const problems = [];
for (const k of en) if (!vi.has(k)) problems.push(`missing in vi.json: ${k}`);
for (const k of vi) if (!en.has(k)) problems.push(`missing in en.json: ${k}`);
for (const k of used) if (!en.has(k)) problems.push(`used in code but not defined: ${k}`);

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`i18n OK: ${en.size} keys, ${used.size} literal keys used`);
