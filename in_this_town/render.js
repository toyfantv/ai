#!/usr/bin/env node
// Deterministic frame renderer.
//   node render.js stills <ep> <scale> t1 t2 ...        -> build/<ep>/stills/t_<t>.jpg
//   node render.js frames <ep> <fps> <start> <end> [scale] -> build/<ep>/frames/%05d.jpg for frame indices [start,end)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = __dirname;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css' };

function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/web/index.html';
      if (p.startsWith('/episodes/') || p.startsWith('/engine/')) p = '/web' + p;
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); rsp.end(); return; }
      rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rsp);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

async function openPage(ep, scale) {
  const srv = await serve();
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: scale });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text().slice(0, 400)); });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  await page.goto(`http://127.0.0.1:${srv.address().port}/?ep=${ep}`);
  await page.waitForFunction(() => window.__ready !== undefined);
  const info = await page.evaluate(() => window.__ready);
  return { srv, browser, page, info };
}

async function shoot(page, t, file) {
  await page.evaluate((t) => window.__render(t), t);
  await page.screenshot({ path: file, type: 'jpeg', quality: 93, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
}

(async () => {
  const [mode, ep, a, ...rest] = process.argv.slice(2);
  const out = path.join(ROOT, 'build', ep);
  if (mode === 'stills') {
    const scale = parseFloat(a);
    const { srv, browser, page, info } = await openPage(ep, scale);
    fs.writeFileSync(path.join(out, 'events.json'), JSON.stringify(info, null, 1));
    fs.mkdirSync(path.join(out, 'stills'), { recursive: true });
    for (const t of rest.map(Number)) {
      const t0 = Date.now();
      await shoot(page, t, path.join(out, 'stills', `t_${t.toFixed(2)}.jpg`));
      console.log('still', t, Date.now() - t0, 'ms');
    }
    await browser.close(); srv.close();
  } else if (mode === 'thumb') {
    const { srv, browser, page } = await openPage(ep, 1);
    await page.evaluate((txt) => window.__thumb(txt), rest.join(' ') || a);
    await page.screenshot({ path: path.join(out, 'thumbnail.jpg'), type: 'jpeg', quality: 94, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
    await browser.close(); srv.close();
  } else if (mode === 'frames') {
    const fps = parseFloat(a); const [s, e, sc] = rest.map(Number);
    const { srv, browser, page, info } = await openPage(ep, sc || 1);
    fs.writeFileSync(path.join(out, 'events.json'), JSON.stringify(info, null, 1));
    const dir = path.join(out, 'frames'); fs.mkdirSync(dir, { recursive: true });
    const last = Math.min(e, Math.ceil(info.duration * fps));
    const t0 = Date.now();
    for (let i = s; i < last; i++) {
      const f = path.join(dir, `${String(i).padStart(5, '0')}.jpg`);
      if (fs.existsSync(f)) continue;
      await shoot(page, i / fps, f + '.tmp.jpg');
      fs.renameSync(f + '.tmp.jpg', f);
      if (i % 30 === 0) console.log(`frame ${i}/${last} ${((Date.now() - t0) / (i - s + 1)).toFixed(0)}ms/frame`);
    }
    await browser.close(); srv.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
