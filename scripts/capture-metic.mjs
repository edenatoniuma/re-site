import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Archive the public homepage and its presentation assets; subpage links stay at the source.
const origin = 'https://metic.studio';
const base = '/demos/metic';
const root = new URL('../public/demos/metic/', import.meta.url).pathname;
const pending = new Set();
const done = new Set();
const failed = [];
const isAsset = p => /^\/(?:_next\/static\/|img\/|api\/media\/file\/)/.test(p) || /^\/(?:favicon\.(?:svg|ico)|apple-touch-icon\.png|icon-512\.png)$/.test(p);
function collect(source, from = '/en') {
  const s = source.replaceAll('\\"', '"').replaceAll('&amp;', '&');
  for (const m of s.matchAll(/(?:\/_next\/static\/|\/img\/|\/api\/media\/file\/)[^\s"'<>\\`?)}]+/g)) {
    if (/\.(?:js|css|woff2?|png|jpe?g|webp|avif|svg|ico|mp[34]|ogg)$/.test(m[0])) pending.add(m[0]);
  }
  for (const m of s.matchAll(/static\/chunks\/([\w.-]+\.js)/g)) pending.add('/_next/static/chunks/' + m[1]);
  for (const m of s.matchAll(/url\(["']?([^\s)'";]+)["']?\)/g)) {
    if (m[1].startsWith('data:')) continue;
    const u = new URL(m[1], origin + from);
    if (u.origin === origin && isAsset(u.pathname) && /\.(?:woff2?|png|jpe?g|webp|svg|css|js)$/.test(u.pathname)) pending.add(u.pathname);
  }
  for (const m of s.matchAll(/\/_next\/image\?url=([^&\s"<>\\]+)/g)) {
    const u = decodeURIComponent(m[1]);
    if (isAsset(u)) pending.add(u);
  }
}
function rewrite(source, filename) {
  let s = source;
  if (filename.endsWith('2zys3xupyppzf.js')) {
    s = s.replace(/return`\$\{e\.path\}\?url=\$\{encodeURIComponent\(t\)\}[^;]+(?=}i\.__next_img_default)/, 'return t');
  }
  s = s.replace(/\/_next\/image\?url=([^&\s"<>\\]+)(?:&amp;|&)w=\d+(?:&amp;|&)q=\d+/g, (_, url) => decodeURIComponent(url));
  for (const prefix of ['/_next/', '/img/', '/api/media/', '/lens/']) {
    s = s.replaceAll(origin + prefix, prefix);
    s = s.replaceAll(prefix, base + prefix);
  }
  s = s.replaceAll('/manifest.webmanifest', base + '/manifest.webmanifest');
  s = s.replaceAll('"metic-', '"replica-metic-').replaceAll('"umami.disabled"', '"replica-umami.disabled"');
  if (filename.endsWith('2p924abyzoizt.js')) s = s.replaceAll('.test(window.location.pathname)', '.test("/en")');
  return s;
}
const htmlResponse = await fetch(origin + '/en');
if (!htmlResponse.ok) throw new Error(`Homepage: ${htmlResponse.status}`);
const original = await htmlResponse.text();
collect(original);
for (const icon of ['/favicon.svg', '/favicon.ico', '/apple-touch-icon.png', '/icon-512.png']) pending.add(icon);
while (pending.size) {
  const batch = [...pending].filter(p => !done.has(p)).slice(0, 6);
  if (!batch.length) break;
  await Promise.all(batch.map(async asset => {
    done.add(asset); pending.delete(asset);
    const response = await fetch(origin + asset);
    if (!response.ok) { failed.push(`${asset}: ${response.status}`); return; }
    const file = path.join(root, asset);
    await mkdir(path.dirname(file), { recursive: true });
    if (/\.(?:css|js|svg)$/.test(asset)) {
      const body = await response.text();
      collect(body, asset);
      await writeFile(file, rewrite(body, asset));
    } else await writeFile(file, Buffer.from(await response.arrayBuffer()));
  }));
  console.log(`Archived ${done.size} resources`);
}
await mkdir(path.join(root, 'lens'), { recursive: true });
await writeFile(path.join(root, 'lens/script.js'), '// Analytics intentionally omitted in the local replica.\n');
let html = rewrite(original, 'index.html');
html = html.replace('<head>', '<head><script src="/demos/metic/local.js"></script>');
html = html.replace(/<link[^>]+rel="(?:canonical|alternate|manifest)"[^>]*>/g, '');
html = html.replace(/(href=")(\/(?:favicon\.[^"?]+|apple-touch-icon.png|icon-512.png))[^\"]*"/g, `$1${base}$2"`);
await writeFile(new URL('../src/data/metic.html', import.meta.url), html);
await writeFile(path.join(root, 'capture.json'), JSON.stringify({ source: origin + '/en', captured: new Date().toISOString(), resources: done.size, failed }, null, 2));
console.log({ resources: done.size, failed });
