const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DIRECTORY = path.join(__dirname, 'dist');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.bin': 'application/octet-stream'
};

const server = http.createServer((req, res) => {
  // Security headers for SharedArrayBuffer (Ultra-fast AI)
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Access-Control-Allow-Origin', '*');

  let reqUrl = req.url === '/' ? 'index.html' : req.url;
  // WebLLM automatically appends /resolve/main/ to model URLs thinking they are Hugging Face links.
  // We strip it out so it correctly serves our local files!
  reqUrl = reqUrl.replace(/\/resolve\/main\//g, '/');
  
  let filePath = path.join(DIRECTORY, reqUrl);
  let extname = String(path.extname(filePath)).toLowerCase();

  // Handle SPA routing (fallback to index.html if file not found)
  if (!fs.existsSync(filePath) && !extname) {
    filePath = path.join(DIRECTORY, 'index.html');
    extname = '.html';
  }

  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File Not Found', 'utf-8');
      } else {
        res.writeHead(500);
        res.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/ with COOP/COEP headers enabled for fast AI!`);
});
