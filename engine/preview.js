import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { exists } from './loader.js';

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml' };

export async function preview({ root = process.cwd(), port = 4173 } = {}) {
  const output = path.join(root, 'dist');
  if (!(await exists(output))) throw new Error('dist does not exist. Run npm run build first.');
  const server = http.createServer(async (request, response) => {
    try {
      const requestPath = decodeURIComponent((request.url || '/').split('?')[0]);
      const relative = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
      const filePath = path.resolve(output, relative);
      const rel = path.relative(output, filePath);
      if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) { response.writeHead(403); response.end('Forbidden'); return; }
      let target = filePath;
      const stat = await fs.stat(target).catch(() => null);
      if (stat?.isDirectory()) target = path.join(target, 'index.html');
      const status = await exists(target) ? 200 : 404;
      if (status === 404) target = path.join(output, '404.html');
      response.setHeader('Content-Type', types[path.extname(target).toLowerCase()] || 'application/octet-stream');
      response.writeHead(status);
      response.end(await fs.readFile(target));
    } catch (error) {
      response.writeHead(500); response.end(error.message);
    }
  });
  await new Promise((resolve, reject) => server.listen(port, '127.0.0.1', resolve).on('error', reject));
  console.log(`Preview running at http://127.0.0.1:${port}`);
  return server;
}
