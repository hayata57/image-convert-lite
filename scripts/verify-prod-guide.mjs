import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const base = 'https://image.sakutio.com';
const log = (msg) => console.log(msg);

const convertMeta = {
  title: 'Image Convert Lite - 無料画像変換ツール',
  description:
    'Image Convert Liteは、JPG、PNG、WebP、BMP、AVIF、ICOなどをブラウザ内で変換できる無料画像変換ツールです。画像はサーバーへ送信されません。',
  canonical: 'https://image.sakutio.com/',
};

const guideMeta = {
  title: 'Image Convert Liteの使い方・よくある質問 | Sakutio',
  description:
    'Image Convert Liteの画像変換方法、対応形式、画質・横幅設定、ZIP保存、変換できない場合の対処方法、よくある質問を紹介します。',
  canonical: 'https://image.sakutio.com/guide',
};

async function checkMeta(page, expected) {
  const title = await page.title();
  const description = await page.locator('meta[name="description"]').getAttribute('content');
  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
  log(`title=${title}`);
  log(`description=${description}`);
  log(`canonical=${canonical}`);
  if (title !== expected.title) throw new Error(`title mismatch: ${title}`);
  if (description !== expected.description) throw new Error('description mismatch');
  if (canonical !== expected.canonical) throw new Error(`canonical mismatch: ${canonical}`);
}

const browser = await chromium.launch({ headless: true });

{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  log('=== prod / ===');
  await checkMeta(page, convertMeta);
  if (!(await page.locator('.guide-cta').isVisible())) throw new Error('guide CTA missing');
  if (await page.locator('.conversion-timing').count()) throw new Error('dev panel visible');
  await page.locator('sakutio-global-header, .sakutio-header-fallback').first().waitFor({ timeout: 10000 });

  await page.locator('a.guide-cta__link').click();
  await page.waitForURL('**/guide');
  await page.waitForFunction((t) => document.title === t, guideMeta.title, { timeout: 5000 });
  log('=== prod /guide via nav ===');
  await checkMeta(page, guideMeta);
  if (!(await page.getByRole('heading', { level: 1, name: 'Image Convert Liteの使い方' }).isVisible())) {
    throw new Error('guide h1 missing');
  }

  await page.locator('a.guide-back-link').first().click();
  await page.waitForURL((url) => url.pathname === '/');
  await page.waitForFunction((t) => document.title === t, convertMeta.title, { timeout: 5000 });

  const files = fs
    .readdirSync('e2e-test-images')
    .filter((f) => f.endsWith('.jpg'))
    .slice(0, 3)
    .map((f) => path.resolve('e2e-test-images', f));
  await page.setInputFiles('input[type=file]:not([webkitdirectory])', files);
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: '一括変換' }).click();
  await page.waitForFunction(() => {
    const zip = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('ZIP'));
    return zip && !zip.disabled;
  }, null, { timeout: 60000 });
  log('conversion + zip ready');
  const downloads = await page.getByRole('button', { name: 'ダウンロード' }).count();
  log(`individual downloads: ${downloads}`);
  if (!downloads) throw new Error('download missing');

  if (errors.length) throw new Error(`console errors: ${errors.join(' | ')}`);
  await page.close();
}

{
  const page = await browser.newPage();
  await page.goto(`${base}/guide`, { waitUntil: 'networkidle' });
  log('=== direct /guide ===');
  await page.waitForFunction((t) => document.title === t, guideMeta.title, { timeout: 5000 });
  await checkMeta(page, guideMeta);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction((t) => document.title === t, guideMeta.title, { timeout: 5000 });
  log('reload /guide ok');
  await page.close();
}

{
  const page = await browser.newPage();
  await page.goto(`${base}/?dev=1`, { waitUntil: 'networkidle' });
  log('=== ?dev=1 ===');
  const timing = await page.locator('.conversion-timing').count();
  const diag = await page.locator('.resource-diagnostics').count();
  if (!timing || !diag) throw new Error('dev panels missing');
  log('dev panels visible');
  await page.close();
}

{
  const page = await browser.newPage({ viewport: { width: 375, height: 800 } });
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  log(`375 / ${JSON.stringify(overflow)}`);
  if (overflow.scrollWidth > overflow.clientWidth + 1) throw new Error('h-scroll on 375 /');
  await page.goto(`${base}/guide`, { waitUntil: 'networkidle' });
  const overflow2 = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  log(`375 /guide ${JSON.stringify(overflow2)}`);
  if (overflow2.scrollWidth > overflow2.clientWidth + 1) throw new Error('h-scroll on 375 /guide');
  await page.close();
}

for (const p of ['/sitemap.xml', '/robots.txt']) {
  const res = await fetch(`${base}${p}`);
  const text = await res.text();
  log(`${p} ${res.status} ${res.headers.get('content-type')}`);
  if (!res.ok) throw new Error(`${p} failed`);
  if (p === '/sitemap.xml' && !text.includes('/guide')) throw new Error('sitemap missing guide');
  if (p === '/robots.txt' && !text.includes('sitemap.xml')) throw new Error('robots missing sitemap');
}

await browser.close();
log('ALL PRODUCTION CHECKS PASSED');
