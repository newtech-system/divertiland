// Publica a versão pronta (pasta dist/) no ramo gh-pages do GitHub → site no GitHub Pages.
// Uso: npm run deploy   (o build é feito antes automaticamente)
import { execSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = join(process.cwd(), 'dist');
if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/ não encontrado — rode "npm run build" primeiro.');
  process.exit(1);
}

const run = (cmd, cwd = process.cwd()) => execSync(cmd, { cwd, stdio: 'inherit' });
const remote = execSync('git remote get-url origin').toString().trim();
const sha = execSync('git rev-parse --short HEAD').toString().trim();

// Sem Jekyll: o GitHub serve os arquivos exatamente como estão.
writeFileSync(join(dist, '.nojekyll'), '');

run('git init -q', dist);
run('git checkout -q -B gh-pages', dist);
run('git add -A', dist);
run(`git commit -q -m "Publicação do site (${sha})"`, dist);
run(`git push -q --force ${remote} gh-pages`, dist);
console.log('\n✅ Publicado! Em 1–2 minutos o site estará atualizado no GitHub Pages.');
