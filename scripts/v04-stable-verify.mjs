import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SAMPLE_DIR = path.join(ROOT, 'format-test-samples');
const APP_URL = process.env.APP_URL ?? 'http://localhost:5173/';

const results = [];

function record(id, pass, detail = '') {
  results.push({ id, pass, detail });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${id}${detail ? `: ${detail}` : ''}`);
}

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

async function writeJpegSample(page, filePath) {
  const bytes = await page.evaluate(async () => {
    const canvas = new OffscreenCanvas(80, 60);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#44aa88';
    ctx.fillRect(0, 0, 80, 60);
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
    canvas.width = 0;
    canvas.height = 0;
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  fs.writeFileSync(filePath, Buffer.from(bytes));
}

async function writeAvifSample(page, filePath) {
  const bytes = await page.evaluate(async () => {
    const canvas = new OffscreenCanvas(4, 4);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2266aa';
    ctx.fillRect(0, 0, 4, 4);
    const blob = await canvas.convertToBlob({ type: 'image/avif', quality: 0.8 });
    canvas.width = 0;
    canvas.height = 0;
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  fs.writeFileSync(filePath, Buffer.from(bytes));
}

async function prepareSamples(page) {
  fs.mkdirSync(SAMPLE_DIR, { recursive: true });
  const jpegPath = path.join(SAMPLE_DIR, '_base.jpg');
  await writeJpegSample(page, jpegPath);
  fs.copyFileSync(jpegPath, path.join(SAMPLE_DIR, 'sample.jpe'));
  fs.copyFileSync(jpegPath, path.join(SAMPLE_DIR, 'sample.jfif'));
  writeBmp1x1(path.join(SAMPLE_DIR, 'sample.bmp'));
  await writeAvifSample(page, path.join(SAMPLE_DIR, 'sample.avif'));
  writeMinimalIco(path.join(SAMPLE_DIR, 'sample.ico'));
}

async function gotoApp(page) {
  await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 60000 });
}

async function clearAll(page) {
  const btn = page.getByRole('button', { name: 'すべてクリア' });
  if (await btn.isEnabled()) {
    await btn.click();
    await page.locator('.image-list--empty').waitFor({ timeout: 10000 });
  }
}

async function loadFiles(page, filePaths) {
  const fileInput = page.locator('input.drop-zone__input').first();
  await fileInput.setInputFiles(filePaths);
  await page.waitForFunction(
    (count) => (document.body.textContent ?? '').includes(`画像数: ${count}`),
    filePaths.length,
    { timeout: 60000 },
  );
  await page.waitForTimeout(300);
}

async function setOutputFormat(page, format) {
  await page.locator('#output-format').selectOption(format);
  await page.waitForTimeout(200);
}

async function runConversion(page) {
  await page.getByRole('button', { name: '一括変換' }).click();
  await page.locator('.action-bar-status__result--success').waitFor({ timeout: 120000 });
  await page.waitForTimeout(300);
}

async function getConversionSummary(page) {
  return page.evaluate(() => {
    const successEl = document.querySelector('.action-bar-status__result--success');
    const successText = successEl?.textContent?.trim() ?? '';
    const done = document.querySelectorAll('.status-badge--done').length;
    const errors = document.querySelectorAll('.status-badge--error').length;
    const outputs = Array.from(document.querySelectorAll('.image-table__info')).map((el) => el.textContent ?? '');
    return { successText, done, errors, outputs };
  });
}

async function copyTimingReport(page) {
  const details = page.locator('.conversion-timing');
  await details.evaluate((el) => { el.open = true; });
  await page.getByRole('button', { name: 'この診断結果をコピー' }).click();
  await page.waitForTimeout(300);
  return page.evaluate(async () => navigator.clipboard.readText());
}

const OUTPUT_FORMATS = [
  { key: 'jpeg', label: 'JPG', ext: 'jpg' },
  { key: 'png', label: 'PNG', ext: 'png' },
  { key: 'webp', label: 'WebP', ext: 'webp' },
];

const INPUT_SAMPLES = [
  { id: '2', label: 'JPE', file: 'sample.jpe' },
  { id: '1', label: 'JFIF', file: 'sample.jfif' },
  { id: '3', label: 'BMP', file: 'sample.bmp' },
  { id: '4', label: 'AVIF', file: 'sample.avif' },
  { id: '5', label: 'ICO', file: 'sample.ico' },
];

async function testFormatToAllOutputs(page, sample) {
  const filePath = path.join(SAMPLE_DIR, sample.file);
  const subResults = [];

  for (const output of OUTPUT_FORMATS) {
    await gotoApp(page);
    await clearAll(page);
    await loadFiles(page, [filePath]);
    await setOutputFormat(page, output.key);
    await runConversion(page);
    const summary = await getConversionSummary(page);
    const hasOutputExt = summary.outputs.some((text) =>
      text.includes(`.${output.ext}`) || text.toUpperCase().includes(output.label),
    );
    const pass = summary.done === 1 && summary.errors === 0 && hasOutputExt;
    subResults.push({ output: output.label, pass, detail: `done=${summary.done}, ${summary.successText}` });
    record(`${sample.id}. ${sample.label} → ${output.label}`, pass, summary.successText);
  }

  return subResults.every((item) => item.pass);
}

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await context.newPage();

  try {
    await page.goto('about:blank');
    await prepareSamples(page);

    for (const sample of INPUT_SAMPLES) {
      await testFormatToAllOutputs(page, sample);
    }

    await gotoApp(page);
    await clearAll(page);
    const mixedPaths = INPUT_SAMPLES.map((s) => path.join(SAMPLE_DIR, s.file));
    await loadFiles(page, mixedPaths);
    await setOutputFormat(page, 'jpeg');
    await runConversion(page);
    const mixed = await getConversionSummary(page);
    const mixedOk = mixed.done === 5 && mixed.errors === 0;
    record('6. 複数形式混在一括変換', mixedOk, `done=${mixed.done}, errors=${mixed.errors}, ${mixed.successText}`);

    const zipDownload = page.waitForEvent('download', { timeout: 30000 });
    await page.getByRole('button', { name: 'ZIP でまとめてダウンロード' }).click();
    const zipFile = await zipDownload;
    const zipName = zipFile.suggestedFilename();
    record('7. ZIPダウンロード', zipName.endsWith('.zip'), zipName);

    const singleDownload = page.waitForEvent('download', { timeout: 30000 });
    await page.locator('.image-table__actions button', { hasText: 'ダウンロード' }).first().click();
    const singleFile = await singleDownload;
    record('8. 個別ダウンロード', Boolean(singleFile.suggestedFilename()), singleFile.suggestedFilename());

    const copyText = await copyTimingReport(page);
    const workerOk = copyText.includes('process mode: worker');
    record('9. 診断コピー process mode: worker', workerOk, copyText.split('\n').find((l) => l.includes('process mode'))?.trim() ?? '');
  } finally {
    await browser.close();
  }

  let buildOk = false;
  let buildDetail = '';
  try {
    buildDetail = execSync('npm run build', { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    buildOk = true;
  } catch (error) {
    buildDetail = error.stdout?.toString?.() ?? '' + error.stderr?.toString?.() ?? error.message;
  }
  record('10. npm run build', buildOk, buildOk ? 'success' : buildDetail.slice(-200));

  const allPass = results.every((item) => item.pass);
  const outPath = path.join(ROOT, 'v04-stable-verify-results.json');
  fs.writeFileSync(outPath, JSON.stringify({ allPass, measuredAt: new Date().toISOString(), results }, null, 2));
  console.log(`\nSaved: ${outPath}`);
  console.log(`Overall: ${allPass ? 'ALL PASS' : 'SOME FAILURES'}`);

  if (!allPass) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
