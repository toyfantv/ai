// Tiny static file server for the pod's output folder: node serve.js <dir> <port>
const http = require('http'), fs = require('fs'), path = require('path');
const [dir, port] = process.argv.slice(2);
http.createServer((req, res) => {
  const f = path.join(dir, path.basename(decodeURIComponent(req.url.split('?')[0])) || 'status.txt');
  if (!fs.existsSync(f)) { res.writeHead(404); res.end('missing'); return; }
  res.writeHead(200, { 'Content-Length': fs.statSync(f).size }); fs.createReadStream(f).pipe(res);
}).listen(+port, '0.0.0.0');
