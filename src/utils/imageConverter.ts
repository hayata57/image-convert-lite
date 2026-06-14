import type { ConversionSettings, OutputFormat } from '../types';
import type { ImageConversionTiming } from './conversionTiming';
import {
  calculateDimensions,
  getMimeType,
  getQualityValue,
} from './conversionCore';
import { encodeCanvasToBlob } from './canvasEncode';
import { logSlowPhases } from './conversionTiming';
import { decodeImageFromFile } from './imageDecodeSource';
import { convertImageViaWorker } from './conversionWorkerClient';
import { releaseCanvas } from './imageResourceCleanup';

let webpSupportCache: boolean | null = null;

function nowMs(): number {
  return performance.now();
}

export function isWebPSupported(): boolean {
  if (webpSupportCache !== null) {
    return webpSupportCache;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  webpSupportCache = canvas.toDataURL('image/webp').startsWith('data:image/webp');
  releaseCanvas(canvas);
  return webpSupportCache;
}

export interface ConversionResult {
  blob: Blob;
  outputFormat: OutputFormat;
  width: number;
  height: number;
  timing: ImageConversionTiming;
}

async function convertImageOnMainThread(
  file: File,
  settings: ConversionSettings,
  displayName?: string,
): Promise<ConversionResult> {
  const totalStart = nowMs();
  const fileName = displayName ?? file.name;

  const decodeStart = nowMs();
  const source = await decodeImageFromFile(file);
  const decodeMs = nowMs() - decodeStart;

  const { width, height } = calculateDimensions(
    source.width,
    source.height,
    settings.targetWidth,
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    source.release();
    releaseCanvas(canvas);
    throw new Error('Canvas の初期化に失敗しました。');
  }

  if (settings.outputFormat === 'jpeg') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
  }

  const drawStart = nowMs();
  source.drawToCanvas(context, width, height);
  const drawMs = nowMs() - drawStart;

  const mimeType = getMimeType(settings.outputFormat);
  const qualityValue = getQualityValue(settings);

  try {
    const encodeResult = await encodeCanvasToBlob(canvas, mimeType, qualityValue);
    const totalMs = nowMs() - totalStart;

    const timing: ImageConversionTiming = {
      fileName,
      sourceWidth: source.width,
      sourceHeight: source.height,
      outputWidth: width,
      outputHeight: height,
      decodeMs,
      drawMs,
      encodeMs: encodeResult.encodeMs,
      totalMs,
      decodeMethod: source.method,
      encodeMethod: encodeResult.method,
      processMethod: 'main-thread',
      workerRoundtripMs: 0,
    };

    logSlowPhases(timing);

    return {
      blob: encodeResult.blob,
      outputFormat: settings.outputFormat,
      width,
      height,
      timing,
    };
  } finally {
    source.release();
    releaseCanvas(canvas);
  }
}

export async function convertImage(
  file: File,
  settings: ConversionSettings,
  displayName?: string,
): Promise<ConversionResult> {
  if (settings.outputFormat === 'webp' && !isWebPSupported()) {
    throw new Error('お使いのブラウザは WebP 出力に対応していません。JPG または PNG を選択してください。');
  }

  const name = displayName ?? file.name;
  const workerResult = await convertImageViaWorker(file, settings, name);
  if (workerResult) {
    logSlowPhases(workerResult.timing);
    return workerResult;
  }

  return convertImageOnMainThread(file, settings, name);
}
