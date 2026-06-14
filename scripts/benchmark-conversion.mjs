import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const IMAGE_DIR = path.join(ROOT, 'benchmark-images');
const APP_URL = process.env.APP_URL ?? 'http://localhost:5175/';
const YOUTUBE_URL = process.env.YOUTUBE_URL ?? 'https://www.youtube.com/watch?v=jNQXAC9IVRw';
const YOUTUBE_SECONDS = Number(process.env.YOUTUBE_SECONDS ?? 45);

const imagePaths = fs.readdirSync(IMAGE_DIR)
  .filter((name) => /\.jpe?g$/i.test(name))
  .sort()
  .map((name) => path.join(IMAGE_DIR, name));

if (imagePaths.length === 0) {
  throw new Error(`No benchmark images found in ${IMAGE_DIR}`);
}

async function readDiagnostics(page) {
  return page.evaluate(() => {
    const details = document.querySelector('.resource-diagnostics');
    if (details && !details.open) {
      details.open = true;
    }

    const result = {
      imageCount: null,
      convertedBlobCount: null,
      createdObjectUrlCount: null,
      revokedObjectUrlCount: null,
      activeObjectUrlCount: null,
      usedJSHeapSize: null,
      jsHeapSizeLimit: null,
    };

    document.querySelectorAll('.resource-diagnostics__row').forEach((row) => {
      const label = row.querySelector('dt')?.textContent?.trim() ?? '';
      const value = row.querySelector('dd')?.textContent?.trim() ?? '';
      if (label === '画像数') result.imageCount = Number(value);
      if (label === '変換済み Blob 数') result.convertedBlobCount = Number(value);
      if (label === '作成済み Object URL 数') result.createdObjectUrlCount = Number(value);
      if (label === 'revoke 済み Object URL 数') result.revokedObjectUrlCount = Number(value);
      if (label === '有効な Object URL 数') result.activeObjectUrlCount = Number(value);
      if (label === 'JS ヒープ使用量') {
        const match = value.match(/^([\d.]+)\s*(KB|MB)\s*\/\s*([\d.]+)\s*(KB|MB)$/);
        if (match) {
          const toBytes = (num, unit) => {
            const n = Number(num);
            return unit === 'MB' ? Math.round(n * 1024 * 1024) : Math.round(n * 1024);
          };
          result.usedJSHeapSize = toBytes(match[1], match[2]);
          result.jsHeapSizeLimit = toBytes(match[3], match[4]);
        }
      }
    });

    const memory = performance.memory;
    if (memory) {
      result.usedJSHeapSize = memory.usedJSHeapSize;
      result.jsHeapSizeLimit = memory.jsHeapSizeLimit;
    }

    return result;
  });
}

async function loadImages(page) {
  const fileInput = page.locator('input.drop-zone__input').first();
  await fileInput.setInputFiles(imagePaths);
  await page.waitForFunction(
    (count) => {
      const text = document.body.textContent ?? '';
      return text.includes(`画像数: ${count}`);
    },
    imagePaths.length,
    { timeout: 120000 },
  );
  await page.waitForTimeout(500);
}

async function runConversion(page, label) {
  const before = await readDiagnostics(page);
  const convertButton = page.getByRole('button', { name: '一括変換' });
  await convertButton.waitFor({ state: 'visible', timeout: 10000 });
  await convertButton.click();

  const start = Date.now();
  await page.locator('.action-bar-status__result--success').waitFor({ timeout: 300000 });
  const totalMs = Date.now() - start;

  await page.waitForTimeout(1000);
  const after = await readDiagnostics(page);

  return {
    label,
    totalMs,
    totalSec: Number((totalMs / 1000).toFixed(2)),
    before,
    after,
  };
}

async function enableReconvert(page) {
  const quality = page.locator('#quality');
  const current = Number(await quality.inputValue());
  const next = current === 85 ? 84 : 85;
  await quality.fill(String(next));
  await page.waitForTimeout(300);
}

async function playYouTube(context, appPage) {
  const ytPage = await context.newPage();
  await ytPage.goto(YOUTUBE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

  try {
    const acceptButton = ytPage.getByRole('button', { name: /同意|Accept|同意する/i }).first();
    if (await acceptButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await acceptButton.click();
    }
  } catch {
    // ignore cookie banner differences
  }

  try {
    await ytPage.locator('video').click({ timeout: 10000 });
  } catch {
    await ytPage.keyboard.press('Space');
  }

  await ytPage.waitForTimeout(YOUTUBE_SECONDS * 1000);

  try {
    await ytPage.keyboard.press('Space');
  } catch {
    // ignore
  }

  await ytPage.close();
  await appPage.bringToFront();
  await appPage.waitForTimeout(1000);
}

async function main() {
  console.log(`App URL: ${APP_URL}`);
  console.log(`Images: ${imagePaths.length}`);
  console.log(`YouTube soak: ${YOUTUBE_SECONDS}s`);

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  const results = [];

  try {
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 60000 });

    // Test 1: baseline conversion
    await loadImages(page);
    results.push(await runConversion(page, '1_baseline'));

    // Test 2: after YouTube, re-convert in same session
    await enableReconvert(page);
    await playYouTube(context, page);
    results.push(await runConversion(page, '2_after_youtube'));

    // Test 3: after page reload
    await page.reload({ waitUntil: 'networkidle' });
    await loadImages(page);
    results.push(await runConversion(page, '3_after_reload'));
  } finally {
    await browser.close();
  }

  const output = {
    measuredAt: new Date().toISOString(),
    appUrl: APP_URL,
    imageCount: imagePaths.length,
    youtubeSeconds: YOUTUBE_SECONDS,
    results,
  };

  const outPath = path.join(ROOT, 'benchmark-results.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(JSON.stringify(output, null, 2));
  console.log(`Saved: ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
