import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const IMAGE_DIR = path.join(ROOT, 'e2e-test-images');
const FOLDER_A = path.join(ROOT, 'e2e-test-folder-a');
const FOLDER_B = path.join(ROOT, 'e2e-test-folder-b');
const APP_URL = process.env.APP_URL ?? 'http://localhost:5173/';
const YOUTUBE_URL = process.env.YOUTUBE_URL ?? 'https://www.youtube.com/watch?v=jNQXAC9IVRw';
const YOUTUBE_SECONDS = Number(process.env.YOUTUBE_SECONDS ?? 15);
const IMAGE_COUNT = Number(process.env.E2E_IMAGE_COUNT ?? 12);

const results = [];

function record(id, pass, detail = '') {
  results.push({ id, pass, detail });
  const mark = pass ? 'PASS' : 'FAIL';
  console.log(`[${mark}] ${id}${detail ? `: ${detail}` : ''}`);
}

async function generateTestImages(page) {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
  fs.mkdirSync(FOLDER_A, { recursive: true });
  fs.mkdirSync(FOLDER_B, { recursive: true });

  for (let i = 0; i < IMAGE_COUNT; i += 1) {
    const fileName = `test-${String(i + 1).padStart(2, '0')}.jpg`;
    const filePath = path.join(IMAGE_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      const bytes = await page.evaluate(async (index) => {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 120;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = `hsl(${index * 27}, 65%, 55%)`;
        ctx.fillRect(0, 0, 160, 120);
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px sans-serif';
        ctx.fillText(`E2E #${index + 1}`, 12, 24);
        const blob = await new Promise((resolve) => {
          canvas.toBlob(resolve, 'image/jpeg', 0.92);
        });
        const buffer = await blob.arrayBuffer();
        return Array.from(new Uint8Array(buffer));
      }, i);
      fs.writeFileSync(filePath, Buffer.from(bytes));
    }

    const half = Math.floor(IMAGE_COUNT / 2);
    const targetDir = i < half ? FOLDER_A : FOLDER_B;
    const targetPath = path.join(targetDir, fileName);
    if (!fs.existsSync(targetPath)) {
      fs.copyFileSync(filePath, targetPath);
    }
  }
}

function getImagePaths() {
  return fs.readdirSync(IMAGE_DIR)
    .filter((name) => /\.jpe?g$/i.test(name))
    .sort()
    .map((name) => path.join(IMAGE_DIR, name));
}

async function loadImages(page, imagePaths) {
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
  await page.waitForTimeout(300);
}

async function loadFolderFromDirectory(page, dirPath, acceptDialog = false) {
  if (acceptDialog) {
    page.once('dialog', (dialog) => {
      void dialog.accept();
    });
  }
  const folderInput = page.locator('input.drop-zone__input').nth(1);
  await folderInput.setInputFiles(dirPath);
  await page.waitForTimeout(1000);
}

async function waitForConversionComplete(page, timeoutMs = 180000) {
  await page.locator('.action-bar-status__result--success').waitFor({ timeout: timeoutMs });
  await page.waitForTimeout(500);
}

async function getConvertedCount(page) {
  return page.evaluate(() => {
    const rows = document.querySelectorAll('.status-badge--done');
    return rows.length;
  });
}

async function getPendingCount(page) {
  return page.evaluate(() => {
    return document.querySelectorAll('.status-badge--pending').length;
  });
}

async function readResourceDiagnostics(page) {
  return page.evaluate(() => {
    const details = document.querySelector('.resource-diagnostics');
    if (details && !details.open) {
      details.open = true;
    }
    const read = (label) => {
      let value = null;
      document.querySelectorAll('.resource-diagnostics__row').forEach((row) => {
        const dt = row.querySelector('dt')?.textContent?.trim();
        const dd = row.querySelector('dd')?.textContent?.trim();
        if (dt === label) {
          value = dd;
        }
      });
      return value;
    };
    return {
      imageCount: read('画像数'),
      convertedBlobCount: read('変換済み Blob 数'),
      activeObjectUrlCount: read('有効な Object URL 数'),
    };
  });
}

async function copyTimingReport(page) {
  const details = page.locator('.conversion-timing');
  await details.evaluate((el) => {
    el.open = true;
  });
  await page.getByRole('button', { name: 'この診断結果をコピー' }).click();
  await page.waitForTimeout(300);
  return page.evaluate(async () => {
    try {
      return await navigator.clipboard.readText();
    } catch {
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.focus();
      document.execCommand('paste');
      const text = textarea.value;
      textarea.remove();
      return text;
    }
  });
}

async function readTimingStats(page) {
  const details = page.locator('.conversion-timing');
  await details.evaluate((el) => {
    el.open = true;
  });
  return page.evaluate(() => {
    const readRow = (label) => {
      let value = '';
      document.querySelectorAll('.conversion-timing__row').forEach((row) => {
        const dt = row.querySelector('dt')?.textContent?.trim();
        const dd = row.querySelector('dd')?.textContent?.trim();
        if (dt === label) {
          value = dd ?? '';
        }
      });
      return value;
    };
    return {
      processMode: readRow('process mode'),
      avgEncode: readRow('平均 toBlob (encode)'),
    };
  });
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
    // ignore
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
  await appPage.waitForTimeout(500);
}

async function enableReconvert(page) {
  const quality = page.locator('#quality');
  const current = Number(await quality.inputValue());
  const next = current === 85 ? 84 : 85;
  await quality.fill(String(next));
  await page.waitForTimeout(300);
}

async function main() {
  console.log(`App URL: ${APP_URL}`);
  console.log(`Images: ${IMAGE_COUNT}, YouTube soak: ${YOUTUBE_SECONDS}s`);

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });

  const context = await browser.newContext({ acceptDownloads: true });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await context.newPage();

  try {
    await page.goto('about:blank');
    await generateTestImages(page);
    const imagePaths = getImagePaths();
    if (imagePaths.length < IMAGE_COUNT) {
      throw new Error(`Expected ${IMAGE_COUNT} images, found ${imagePaths.length}`);
    }

    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 60000 });

    // 1. Normal conversion
    await loadImages(page, imagePaths);
    await page.getByRole('button', { name: '一括変換' }).click();
    await waitForConversionComplete(page);
    const successText = await page.locator('.action-bar-status__result--success').textContent();
    record('1. 通常変換', successText?.includes(`成功: ${IMAGE_COUNT}`) ?? false, successText ?? '');

    // 10. process mode worker in diagnostics (from completed run)
    let copyText = await copyTimingReport(page);
    const hasWorkerMode = copyText.includes('process mode: worker');
    record('10. 診断コピー process mode: worker', hasWorkerMode, copyText.split('\n').find((l) => l.includes('process mode')) ?? '');

    // Prepare for stop/resume: reload and load fresh
    await page.reload({ waitUntil: 'networkidle' });
    await loadImages(page, imagePaths);

    // 2-6. Stop, ZIP, individual DL, resume
    await page.getByRole('button', { name: '一括変換' }).click();
    await page.waitForFunction(
      () => document.querySelectorAll('.status-badge--done').length >= 3,
      { timeout: 120000 },
    );
    await page.getByRole('button', { name: '停止' }).click();
    await page.locator('.action-bar-status__stopped-label').waitFor({ timeout: 60000 });
    record('2. 停止', true, '停止しました を確認');

    const convertedAfterStop = await getConvertedCount(page);
    const pendingAfterStop = await getPendingCount(page);
    record(
      '2b. 停止時点の部分変換',
      convertedAfterStop > 0 && pendingAfterStop > 0,
      `done=${convertedAfterStop}, pending=${pendingAfterStop}`,
    );

    const zipDownload = page.waitForEvent('download', { timeout: 30000 });
    await page.getByRole('button', { name: 'ZIP でまとめてダウンロード' }).click();
    const zipFile = await zipDownload;
    const zipOk = (await zipFile.suggestedFilename()).endsWith('.zip');
    record('3. 停止後 ZIP DL', zipOk, await zipFile.suggestedFilename());

    const singleDownload = page.waitForEvent('download', { timeout: 30000 });
    await page.locator('.image-table__actions button', { hasText: 'ダウンロード' }).first().click();
    const singleFile = await singleDownload;
    record('4. 停止後 個別DL', Boolean(await singleFile.suggestedFilename()), await singleFile.suggestedFilename());

    await page.getByRole('button', { name: '再開' }).click();
    record('5. 再開', true, '再開ボタン押下');

    await waitForConversionComplete(page);
    const convertedAfterResume = await getConvertedCount(page);
    record(
      '6. 再開後 残り変換',
      convertedAfterResume === IMAGE_COUNT,
      `done=${convertedAfterResume}/${IMAGE_COUNT}`,
    );

    // 7. Clear all (wait for download URL revoke before checking)
    await page.waitForTimeout(1500);
    const beforeClear = await readResourceDiagnostics(page);
    const previewCountBefore = await page.locator('.image-table__preview').count();
    await page.getByRole('button', { name: 'すべてクリア' }).click();
    await page.locator('.image-list--empty').waitFor({ timeout: 10000 });
    await page.waitForTimeout(1500);
    const afterClear = await readResourceDiagnostics(page);
    const previewCountAfter = await page.locator('.image-table__preview').count();
    const clearOk = afterClear.imageCount === '0'
      && afterClear.convertedBlobCount === '0'
      && previewCountAfter === 0;
    record(
      '7. すべてクリア',
      clearOk,
      `preview ${previewCountBefore}->${previewCountAfter}, image=${afterClear.imageCount}, blob=${afterClear.convertedBlobCount}, activeURL=${afterClear.activeObjectUrlCount}`,
    );

    // 8. New folder load clears previous results
    const half = Math.floor(IMAGE_COUNT / 2);
    await loadFolderFromDirectory(page, FOLDER_A);
    await page.waitForFunction(
      (count) => (document.body.textContent ?? '').includes(`画像数: ${count}`),
      half,
      { timeout: 120000 },
    );
    await page.getByRole('button', { name: '一括変換' }).click();
    await waitForConversionComplete(page);
    const firstBatchDone = await getConvertedCount(page);
    await loadFolderFromDirectory(page, FOLDER_B, true);
    await page.waitForFunction(
      () => {
        const text = document.body.textContent ?? '';
        return text.includes('前回の変換結果をクリア') || text.includes('枚読み込みました');
      },
      { timeout: 30000 },
    );
    const afterReplaceDone = await getConvertedCount(page);
    const replaceMessage = await page.locator('.message--info').first().textContent().catch(() => '');
    const replaceOk = afterReplaceDone === 0
      && firstBatchDone === half
      && (replaceMessage?.includes('前回の変換結果をクリア') ?? false);
    record(
      '8. 新フォルダ投入で前回結果クリア',
      replaceOk,
      `prevDone=${firstBatchDone}, afterLoad done=${afterReplaceDone}, msg=${replaceMessage?.trim()}`,
    );

    // 9. YouTube then re-convert without slowdown warning
    await page.getByRole('button', { name: 'すべてクリア' }).click();
    await page.locator('.image-list--empty').waitFor({ timeout: 10000 });
    await loadImages(page, imagePaths);
    await page.getByRole('button', { name: '一括変換' }).click();
    await waitForConversionComplete(page);
    await enableReconvert(page);
    await playYouTube(context, page);
    await page.getByRole('button', { name: '一括変換' }).click();
    await waitForConversionComplete(page, 300000);
    const slowWarningVisible = await page.locator('.encoding-slow-warning').isVisible().catch(() => false);
    const ytStats = await readTimingStats(page);
    const avgEncodeMs = Number.parseFloat(ytStats.avgEncode);
    const ytOk = !slowWarningVisible && Number.isFinite(avgEncodeMs) && avgEncodeMs < 500;
    record(
      '9. YouTube後も速度維持',
      ytOk,
      `warning=${slowWarningVisible}, processMode=${ytStats.processMode}, avgEncode=${ytStats.avgEncode}`,
    );

    copyText = await copyTimingReport(page);
    if (!copyText.includes('process mode: worker')) {
      record('10b. YouTube後も worker', false, copyText.split('\n').find((l) => l.includes('process mode')) ?? '');
    }
  } finally {
    await browser.close();
  }

  const allPass = results.every((item) => item.pass);
  const outPath = path.join(ROOT, 'v03-stable-verify-results.json');
  fs.writeFileSync(outPath, JSON.stringify({ allPass, measuredAt: new Date().toISOString(), results }, null, 2));
  console.log(`\nSaved: ${outPath}`);
  console.log(`Overall: ${allPass ? 'ALL PASS' : 'SOME FAILURES'}`);
  process.exit(allPass ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
