import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SAMPLE_DIR = path.join(ROOT, 'format-test-samples');
const APP_URL = process.env.APP_URL ?? 'http://localhost:4173/';

const results = [];
const consoleErrors = [];

function record(id, pass, detail = '') {
  results.push({ id, pass, detail });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${id}${detail ? `: ${detail}` : ''}`);
}

async function main() {
  const sample = path.join(SAMPLE_DIR, 'sample.jfif');
  if (!fs.existsSync(sample)) {
    throw new Error(`Missing ${sample}. Run scripts/verify-input-formats.mjs first.`);
  }

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (error) => {
    consoleErrors.push(error.message);
  });

  try {
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 60000 });
    const title = await page.title();
    record('画面表示', title.includes('Image Convert Lite'), title);

    const privacy = await page.locator('.app-privacy-notice').textContent();
    record(
      'プライバシー表示',
      privacy?.includes('サーバーへアップロードされません') ?? false,
      privacy?.trim() ?? '',
    );

    const fileInput = page.locator('input.drop-zone__input').first();
    await fileInput.setInputFiles(sample);
    await page.waitForFunction(
      () => (document.body.textContent ?? '').includes('画像数: 1'),
      { timeout: 30000 },
    );
    record('画像読み込み', true, 'sample.jfif');

    for (const format of ['jpeg', 'png', 'webp']) {
      await page.locator('#output-format').selectOption(format);
      await page.getByRole('button', { name: '一括変換' }).click();
      await page.locator('.action-bar-status__result--success').waitFor({ timeout: 120000 });
      const success = await page.locator('.action-bar-status__result--success').textContent();
      record(`変換 (${format})`, success?.includes('成功: 1') ?? false, success ?? '');
      await page.locator('#output-format').selectOption(format === 'jpeg' ? 'png' : 'jpeg');
      await page.waitForTimeout(200);
    }

    const zipDownload = page.waitForEvent('download', { timeout: 30000 });
    await page.getByRole('button', { name: 'ZIP でまとめてダウンロード' }).click();
    const zipFile = await zipDownload;
    record('ZIPダウンロード', zipFile.suggestedFilename().endsWith('.zip'), zipFile.suggestedFilename());

    const singleDownload = page.waitForEvent('download', { timeout: 30000 });
    await page.locator('.image-table__actions button', { hasText: 'ダウンロード' }).first().click();
    const singleFile = await singleDownload;
    record('個別ダウンロード', Boolean(singleFile.suggestedFilename()), singleFile.suggestedFilename());

    const details = page.locator('.conversion-timing');
    await details.evaluate((el) => { el.open = true; });
    await page.getByRole('button', { name: 'この診断結果をコピー' }).click();
    await page.waitForTimeout(300);
    const copyText = await page.evaluate(async () => navigator.clipboard.readText());
    record('Worker本番動作', copyText.includes('process mode: worker'), copyText.split('\n').find((l) => l.includes('process mode'))?.trim() ?? '');

    const workerAssetExists = fs.readdirSync(path.join(ROOT, 'dist', 'assets')).some((name) => name.includes('conversionWorker'));
    record('dist workerファイル', workerAssetExists, workerAssetExists ? 'found' : 'missing');

    record('コンソールエラーなし', consoleErrors.length === 0, consoleErrors.join(' | ') || 'none');
  } finally {
    await browser.close();
  }

  const allPass = results.every((item) => item.pass);
  const outPath = path.join(ROOT, 'preview-verify-results.json');
  fs.writeFileSync(outPath, JSON.stringify({ allPass, results, consoleErrors }, null, 2));
  console.log(`Saved: ${outPath}`);
  process.exit(allPass ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
