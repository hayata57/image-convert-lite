import type { SlowdownWarningReason } from './encodingSlowDetection';
import { formatSlowdownWarningReason } from './encodingSlowDetection';

export const SLOW_PHASE_THRESHOLD_MS = 2000;

export type DecodeMethod = 'image-bitmap' | 'html-image';
export type EncodeMethod = 'offscreen-canvas' | 'html-canvas';
export type ProcessMethod = 'main-thread' | 'worker';

export interface ImageConversionTiming {
  fileName: string;
  sourceWidth: number;
  sourceHeight: number;
  outputWidth: number;
  outputHeight: number;
  decodeMs: number;
  drawMs: number;
  encodeMs: number;
  totalMs: number;
  decodeMethod: DecodeMethod;
  encodeMethod: EncodeMethod;
  processMethod: ProcessMethod;
  workerRoundtripMs: number;
}

export interface DecodeModeSummary {
  label: string;
  imageBitmapCount: number;
  htmlImageCount: number;
}

export interface EncodeModeSummary {
  label: string;
  offscreenCanvasCount: number;
  htmlCanvasCount: number;
}

export interface ProcessModeSummary {
  label: string;
  workerCount: number;
  mainThreadCount: number;
}

export interface ConversionTimingSummary {
  avgDecodeMs: number;
  avgDrawMs: number;
  avgToBlobMs: number;
  avgTotalMs: number;
  avgWorkerRoundtripMs: number;
  maxDecodeMs: number;
  maxDrawMs: number;
  maxToBlobMs: number;
  maxTotalMs: number;
  maxWorkerRoundtripMs: number;
  maxDecodeFileName: string | null;
  maxDrawFileName: string | null;
  maxToBlobFileName: string | null;
  maxTotalFileName: string | null;
  slowDecodeCount: number;
  slowDrawCount: number;
  slowToBlobCount: number;
}

export interface EncodingSlowdownDiagnostics {
  baselineToBlobMs: number | null;
  currentToBlobMs: number | null;
  slowdownRatio: number | null;
  averageToBlobMs: number | null;
  slowToBlobCount: number;
  encodingSlowWarningShown: boolean;
  warningReasons: SlowdownWarningReason[];
}

export interface ConversionTimingReport {
  id: string;
  startedAt: string;
  completedAt: string;
  totalMs: number;
  imageCount: number;
  successCount: number;
  errorCount: number;
  records: ImageConversionTiming[];
  summary: ConversionTimingSummary;
  slowWarnings: string[];
  encodingSlowdown: EncodingSlowdownDiagnostics;
  decodeMode: DecodeModeSummary;
  encodeMode: EncodeModeSummary;
  processMode: ProcessModeSummary;
}

function roundMs(value: number): number {
  return Math.round(value * 10) / 10;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function findMaxRecord(
  records: ImageConversionTiming[],
  pick: (record: ImageConversionTiming) => number,
): { fileName: string | null; value: number } {
  if (records.length === 0) {
    return { fileName: null, value: 0 };
  }

  let maxRecord = records[0];
  let maxValue = pick(maxRecord);

  for (const record of records) {
    const value = pick(record);
    if (value > maxValue) {
      maxValue = value;
      maxRecord = record;
    }
  }

  return { fileName: maxRecord.fileName, value: maxValue };
}

export function buildTimingSummary(records: ImageConversionTiming[]): ConversionTimingSummary {
  const maxDecode = findMaxRecord(records, (record) => record.decodeMs);
  const maxDraw = findMaxRecord(records, (record) => record.drawMs);
  const maxToBlob = findMaxRecord(records, (record) => record.encodeMs);
  const maxTotal = findMaxRecord(records, (record) => record.totalMs);
  const workerRecords = records.filter((record) => record.processMethod === 'worker');
  const maxWorkerRoundtrip = workerRecords.length > 0
    ? findMaxRecord(workerRecords, (record) => record.workerRoundtripMs)
    : { fileName: null, value: 0 };

  return {
    avgDecodeMs: roundMs(average(records.map((record) => record.decodeMs))),
    avgDrawMs: roundMs(average(records.map((record) => record.drawMs))),
    avgToBlobMs: roundMs(average(records.map((record) => record.encodeMs))),
    avgTotalMs: roundMs(average(records.map((record) => record.totalMs))),
    avgWorkerRoundtripMs: workerRecords.length > 0
      ? roundMs(average(workerRecords.map((record) => record.workerRoundtripMs)))
      : 0,
    maxDecodeMs: roundMs(maxDecode.value),
    maxDrawMs: roundMs(maxDraw.value),
    maxToBlobMs: roundMs(maxToBlob.value),
    maxTotalMs: roundMs(maxTotal.value),
    maxWorkerRoundtripMs: roundMs(maxWorkerRoundtrip.value),
    maxDecodeFileName: maxDecode.fileName,
    maxDrawFileName: maxDraw.fileName,
    maxToBlobFileName: maxToBlob.fileName,
    maxTotalFileName: maxTotal.fileName,
    slowDecodeCount: records.filter((record) => record.decodeMs >= SLOW_PHASE_THRESHOLD_MS).length,
    slowDrawCount: records.filter((record) => record.drawMs >= SLOW_PHASE_THRESHOLD_MS).length,
    slowToBlobCount: records.filter((record) => record.encodeMs >= SLOW_PHASE_THRESHOLD_MS).length,
  };
}

export function collectSlowWarnings(records: ImageConversionTiming[]): string[] {
  const warnings: string[] = [];

  for (const record of records) {
    const baseName = record.fileName.split('/').pop() ?? record.fileName;
    if (record.decodeMs >= SLOW_PHASE_THRESHOLD_MS) {
      warnings.push(`[decode slow] ${baseName}: ${Math.round(record.decodeMs)}ms`);
    }
    if (record.drawMs >= SLOW_PHASE_THRESHOLD_MS) {
      warnings.push(`[draw slow] ${baseName}: ${Math.round(record.drawMs)}ms`);
    }
    if (record.encodeMs >= SLOW_PHASE_THRESHOLD_MS) {
      warnings.push(`[encode slow] ${baseName}: ${Math.round(record.encodeMs)}ms`);
    }
  }

  return warnings;
}

export function logSlowPhases(record: ImageConversionTiming): void {
  const baseName = record.fileName.split('/').pop() ?? record.fileName;
  if (record.decodeMs >= SLOW_PHASE_THRESHOLD_MS) {
    console.warn(`[decode slow] ${baseName}: ${Math.round(record.decodeMs)}ms`);
  }
  if (record.drawMs >= SLOW_PHASE_THRESHOLD_MS) {
    console.warn(`[draw slow] ${baseName}: ${Math.round(record.drawMs)}ms`);
  }
  if (record.encodeMs >= SLOW_PHASE_THRESHOLD_MS) {
    console.warn(`[encode slow] ${baseName}: ${Math.round(record.encodeMs)}ms`);
  }
}

export function buildEncodeModeSummary(records: ImageConversionTiming[]): EncodeModeSummary {
  const offscreenCanvasCount = records.filter(
    (record) => record.encodeMethod === 'offscreen-canvas',
  ).length;
  const htmlCanvasCount = records.filter(
    (record) => record.encodeMethod === 'html-canvas',
  ).length;

  if (records.length === 0) {
    return { label: '-', offscreenCanvasCount: 0, htmlCanvasCount: 0 };
  }

  if (htmlCanvasCount === 0) {
    return { label: 'offscreenCanvas', offscreenCanvasCount, htmlCanvasCount };
  }

  if (offscreenCanvasCount === 0) {
    return { label: 'htmlCanvas', offscreenCanvasCount, htmlCanvasCount };
  }

  return {
    label: `mixed (offscreenCanvas ${offscreenCanvasCount}, htmlCanvas ${htmlCanvasCount})`,
    offscreenCanvasCount,
    htmlCanvasCount,
  };
}

export function buildProcessModeSummary(records: ImageConversionTiming[]): ProcessModeSummary {
  const workerCount = records.filter((record) => record.processMethod === 'worker').length;
  const mainThreadCount = records.filter((record) => record.processMethod === 'main-thread').length;

  if (records.length === 0) {
    return { label: '-', workerCount: 0, mainThreadCount: 0 };
  }

  if (mainThreadCount === 0) {
    return { label: 'worker', workerCount, mainThreadCount };
  }

  if (workerCount === 0) {
    return { label: 'mainThread', workerCount, mainThreadCount };
  }

  return {
    label: `mixed (worker ${workerCount}, mainThread ${mainThreadCount})`,
    workerCount,
    mainThreadCount,
  };
}

export function buildDecodeModeSummary(records: ImageConversionTiming[]): DecodeModeSummary {
  const imageBitmapCount = records.filter((record) => record.decodeMethod === 'image-bitmap').length;
  const htmlImageCount = records.filter((record) => record.decodeMethod === 'html-image').length;

  if (records.length === 0) {
    return { label: '-', imageBitmapCount: 0, htmlImageCount: 0 };
  }

  if (htmlImageCount === 0) {
    return { label: 'imageBitmap', imageBitmapCount, htmlImageCount };
  }

  if (imageBitmapCount === 0) {
    return { label: 'htmlImage', imageBitmapCount, htmlImageCount };
  }

  return {
    label: `mixed (imageBitmap ${imageBitmapCount}, htmlImage ${htmlImageCount})`,
    imageBitmapCount,
    htmlImageCount,
  };
}

export function buildConversionTimingReport(params: {
  startedAt: string;
  completedAt: string;
  totalMs: number;
  imageCount: number;
  successCount: number;
  errorCount: number;
  records: ImageConversionTiming[];
  encodingSlowdown: EncodingSlowdownDiagnostics;
}): ConversionTimingReport {
  const summary = buildTimingSummary(params.records);
  const slowWarnings = collectSlowWarnings(params.records);
  const decodeMode = buildDecodeModeSummary(params.records);
  const encodeMode = buildEncodeModeSummary(params.records);
  const processMode = buildProcessModeSummary(params.records);

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    startedAt: params.startedAt,
    completedAt: params.completedAt,
    totalMs: roundMs(params.totalMs),
    imageCount: params.imageCount,
    successCount: params.successCount,
    errorCount: params.errorCount,
    records: params.records,
    summary,
    slowWarnings,
    encodingSlowdown: params.encodingSlowdown,
    decodeMode,
    encodeMode,
    processMode,
  };
}

export function formatTimingReportForCopy(report: ConversionTimingReport): string {
  const lines = [
    '=== 変換時間診断 ===',
    `計測開始: ${report.startedAt}`,
    `計測終了: ${report.completedAt}`,
    `総変換時間: ${(report.totalMs / 1000).toFixed(2)}s (${Math.round(report.totalMs)}ms)`,
    `対象画像数: ${report.imageCount}`,
    `成功: ${report.successCount} / エラー: ${report.errorCount}`,
    '',
    '--- 処理方式 ---',
    `process mode: ${report.processMode.label}`,
    `worker: ${report.processMode.workerCount} 枚`,
    `mainThread: ${report.processMode.mainThreadCount} 枚`,
    '',
    '--- デコード方式 ---',
    `decode mode: ${report.decodeMode.label}`,
    `imageBitmap: ${report.decodeMode.imageBitmapCount} 枚`,
    `htmlImage: ${report.decodeMode.htmlImageCount} 枚`,
    '',
    '--- エンコード方式 ---',
    `encode mode: ${report.encodeMode.label}`,
    `offscreenCanvas: ${report.encodeMode.offscreenCanvasCount} 枚`,
    `htmlCanvas: ${report.encodeMode.htmlCanvasCount} 枚`,
    '',
    '--- フェーズ別平均 ---',
    `平均 decode: ${report.summary.avgDecodeMs}ms`,
    `平均 draw: ${report.summary.avgDrawMs}ms`,
    `平均 encode (表示: toBlob): ${report.summary.avgToBlobMs}ms`,
    `平均 worker roundtrip: ${report.summary.avgWorkerRoundtripMs}ms`,
    `平均 1枚合計: ${report.summary.avgTotalMs}ms`,
    '',
    '--- フェーズ別最大 ---',
    `最大 decode: ${report.summary.maxDecodeMs}ms (${report.summary.maxDecodeFileName ?? '-'})`,
    `最大 draw: ${report.summary.maxDrawMs}ms (${report.summary.maxDrawFileName ?? '-'})`,
    `最大 encode (表示: toBlob): ${report.summary.maxToBlobMs}ms (${report.summary.maxToBlobFileName ?? '-'})`,
    `最大 worker roundtrip: ${report.summary.maxWorkerRoundtripMs}ms`,
    `最大 1枚合計: ${report.summary.maxTotalMs}ms (${report.summary.maxTotalFileName ?? '-'})`,
    '',
    '--- 遅延警告 (>=2000ms) ---',
    `decode 遅延: ${report.summary.slowDecodeCount} 枚`,
    `draw 遅延: ${report.summary.slowDrawCount} 枚`,
    `encode 遅延: ${report.summary.slowToBlobCount} 枚`,
    '',
    '--- 低速化判定 ---',
    `baselineToBlobMs: ${report.encodingSlowdown.baselineToBlobMs ?? '-'}ms`,
    `currentToBlobMs: ${report.encodingSlowdown.currentToBlobMs ?? '-'}ms`,
    `slowdownRatio: ${report.encodingSlowdown.slowdownRatio ?? '-'}`,
    `avg encode: ${report.encodingSlowdown.averageToBlobMs ?? '-'}ms`,
    `encode slow count: ${report.encodingSlowdown.slowToBlobCount}`,
    `slowdown warning reason: ${formatSlowdownWarningReason(report.encodingSlowdown.warningReasons)}`,
    `画面上の低速化警告: ${report.encodingSlowdown.encodingSlowWarningShown ? '表示' : 'なし'}`,
  ];

  if (report.slowWarnings.length > 0) {
    lines.push('', '--- 警告ログ ---');
    lines.push(...report.slowWarnings.slice(0, 50));
    if (report.slowWarnings.length > 50) {
      lines.push(`... 他 ${report.slowWarnings.length - 50} 件`);
    }
  }

  const dominant = identifyDominantSlowPhase(report.summary);
  lines.push('', `--- 推定ボトルネック ---`, dominant);

  return lines.join('\n');
}

export function identifyDominantSlowPhase(summary: ConversionTimingSummary): string {
  const phases = [
    { name: 'decode（画像読み込み）', avg: summary.avgDecodeMs, slow: summary.slowDecodeCount },
    { name: 'draw（canvas描画）', avg: summary.avgDrawMs, slow: summary.slowDrawCount },
    { name: 'toBlob（エンコード）', avg: summary.avgToBlobMs, slow: summary.slowToBlobCount },
  ];

  phases.sort((left, right) => {
    if (right.slow !== left.slow) {
      return right.slow - left.slow;
    }
    return right.avg - left.avg;
  });

  const top = phases[0];
  return `${top.name} が最も遅い可能性が高い（平均 ${top.avg}ms / 遅延 ${top.slow} 枚）`;
}

export function formatSeconds(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}
