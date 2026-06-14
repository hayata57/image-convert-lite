import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SAMPLE_DIR = path.join(ROOT, 'format-test-samples');
const APP_URL = process.env.APP_URL ?? 'http://localhost:5173/';

function writeBmp1x1(filePath) {
  const fileSize = 58;
  const buf = Buffer.alloc(fileSize);
  buf.write('BM', 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(54, 10);
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(1, 18);
  buf.writeInt32LE(1, 22);
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(32, 28);
  buf.writeUInt32LE(4, 34);
  buf[54] = 0xff;
  buf[55] = 0x00;
  buf[56] = 0x00;
  buf[57] = 0xff;
  fs.writeFileSync(filePath, buf);
}

function writeMinimalIco(filePath) {
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const png = Buffer.from(pngBase64, 'base64');
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry.writeUInt8(1, 0);
  entry.writeUInt8(1, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(22, 12);
  fs.writeFileSync(filePath, Buffer.concat([header, entry, png]));
}

async function writeAvifSample(page, filePath) {
  const avifBytes = await page.evaluate(async () => {
    const canvas = new OffscreenCanvas(2, 2);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2266aa';
    ctx.fillRect(0, 0, 2, 2);
    const avifBlob = await canvas.convertToBlob({ type: 'image/avif', quality: 0.8 });
    canvas.width = 0;
    canvas.height = 0;
    return Array.from(new Uint8Array(await avifBlob.arrayBuffer()));
  });
  fs.writeFileSync(filePath, Buffer.from(avifBytes));
}

async function prepareSamples(page) {
  fs.mkdirSync(SAMPLE_DIR, { recursive: true });
  const jpegSrc = path.join(ROOT, 'e2e-test-images', 'test-01.jpg');
  if (!fs.existsSync(jpegSrc)) {
    throw new Error(`Missing ${jpegSrc}. Run v03-stable-verify first or add a JPEG sample.`);
  }
  fs.copyFileSync(jpegSrc, path.join(SAMPLE_DIR, 'sample.jpe'));
  fs.copyFileSync(jpegSrc, path.join(SAMPLE_DIR, 'sample.jfif'));
  writeBmp1x1(path.join(SAMPLE_DIR, 'sample.bmp'));
  await writeAvifSample(page, path.join(SAMPLE_DIR, 'sample.avif'));
  writeMinimalIco(path.join(SAMPLE_DIR, 'sample.ico'));
}

async function probeCreateImageBitmap(page, filePath) {
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1).toLowerCase();
  return page.evaluate(async ({ bytes, extension }) => {
    const mimeMap = {
      jpe: 'image/jpeg',
      jfif: 'image/jpeg',
      bmp: 'image/bmp',
      avif: 'image/avif',
      ico: 'image/x-icon',
    };
    const mimeType = mimeMap[extension] ?? 'application/octet-stream';
    const blob = new Blob([new Uint8Array(bytes)], { type: mimeType });
    try {
      const bitmap = await createImageBitmap(blob);
      const width = bitmap.width;
      const height = bitmap.height;
      const offscreen = new OffscreenCanvas(width, height);
      const ctx = offscreen.getContext('2d');
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
      const out = await offscreen.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
      offscreen.width = 0;
      offscreen.height = 0;
      return { ok: true, width, height, outSize: out.size };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }, { bytes: Array.from(buffer), extension: ext });
}

async function probeAppConversion(page, filePath) {
  await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 60000 });
  const fileInput = page.locator('input.drop-zone__input').first();
  await fileInput.setInputFiles(filePath);
  await page.waitForFunction(
    () => (document.body.textContent ?? '').includes('画像数: 1'),
    { timeout: 30000 },
  );
  await page.getByRole('button', { name: '一括変換' }).click();
  await page.locator('.action-bar-status__result--success').waitFor({ timeout: 120000 });
  const processMode = await page.evaluate(() => {
    const details = document.querySelector('.conversion-timing');
    if (details) details.open = true;
    for (const row of document.querySelectorAll('.conversion-timing__row')) {
      const dt = row.querySelector('dt')?.textContent?.trim();
      const dd = row.querySelector('dd')?.textContent?.trim();
      if (dt === 'process mode') return dd ?? '';
    }
    return '';
  });
  return { ok: true, processMode };
}

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  const results = [];

  try {
    await page.goto('about:blank');
    await prepareSamples(page);

    for (const name of ['sample.jpe', 'sample.jfif', 'sample.bmp', 'sample.avif', 'sample.ico']) {
      const filePath = path.join(SAMPLE_DIR, name);
      const probe = await probeCreateImageBitmap(page, filePath);
      let appResult = { ok: false, processMode: 'skipped' };
      if (probe.ok) {
        try {
          appResult = await probeAppConversion(page, filePath);
        } catch (error) {
          appResult = { ok: false, processMode: error instanceof Error ? error.message : String(error) };
        }
      }
      results.push({ file: name, createImageBitmap: probe, app: appResult });
      console.log(JSON.stringify({ file: name, createImageBitmap: probe, app: appResult }));
    }
  } finally {
    await browser.close();
  }

  const outPath = path.join(ROOT, 'format-verify-results.json');
  fs.writeFileSync(outPath, JSON.stringify({ measuredAt: new Date().toISOString(), results }, null, 2));
  console.log(`Saved: ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
