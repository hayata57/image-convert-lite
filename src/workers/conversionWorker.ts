import type { ConversionSettings, OutputFormat } from '../types';
import {
  calculateDimensions,
  getMimeType,
  getQualityValue,
} from '../utils/conversionCore';

type DecodeMethod = 'image-bitmap' | 'html-image';
type EncodeMethod = 'offscreen-canvas' | 'html-canvas';

export interface WorkerConvertRequest {
  id: string;
  displayName: string;
  settings: ConversionSettings;
  buffer: ArrayBuffer;
  sourceMimeType: string;
}

export interface WorkerTimingPayload {
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
}

export interface WorkerConvertSuccess {
  id: string;
  type: 'success';
  blob: Blob;
  outputFormat: OutputFormat;
  width: number;
  height: number;
  timing: WorkerTimingPayload;
}

export interface WorkerConvertError {
  id: string;
  type: 'error';
  message: string;
}

export type WorkerConvertResponse = WorkerConvertSuccess | WorkerConvertError;

function roundMs(value: number): number {
  return Math.round(value * 10) / 10;
}

async function convertInWorker(request: WorkerConvertRequest): Promise<WorkerConvertSuccess> {
  const { displayName, settings, buffer, sourceMimeType } = request;
  const totalStart = performance.now();

  const decodeStart = performance.now();
  const sourceBlob = new Blob([buffer], { type: sourceMimeType });
  const bitmap = await createImageBitmap(sourceBlob);
  const decodeMs = performance.now() - decodeStart;

  const sourceWidth = bitmap.width;
  const sourceHeight = bitmap.height;
  const { width, height } = calculateDimensions(
    sourceWidth,
    sourceHeight,
    settings.targetWidth,
  );

  const offscreen = new OffscreenCanvas(width, height);
  const context = offscreen.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('OffscreenCanvas の初期化に失敗しました。');
  }

  if (settings.outputFormat === 'jpeg') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
  }

  const drawStart = performance.now();
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const drawMs = performance.now() - drawStart;

  const mimeType = getMimeType(settings.outputFormat);
  const quality = getQualityValue(settings);

  const encodeStart = performance.now();
  const encodeOptions: ImageEncodeOptions = { type: mimeType };
  if (quality !== undefined) {
    encodeOptions.quality = quality;
  }

  const resultBlob = await offscreen.convertToBlob(encodeOptions);
  offscreen.width = 0;
  offscreen.height = 0;
  const encodeMs = performance.now() - encodeStart;
  const totalMs = performance.now() - totalStart;

  return {
    id: request.id,
    type: 'success',
    blob: resultBlob,
    outputFormat: settings.outputFormat,
    width,
    height,
    timing: {
      fileName: displayName,
      sourceWidth,
      sourceHeight,
      outputWidth: width,
      outputHeight: height,
      decodeMs: roundMs(decodeMs),
      drawMs: roundMs(drawMs),
      encodeMs: roundMs(encodeMs),
      totalMs: roundMs(totalMs),
      decodeMethod: 'image-bitmap',
      encodeMethod: 'offscreen-canvas',
    },
  };
}

self.onmessage = (event: MessageEvent<WorkerConvertRequest>) => {
  void (async () => {
    try {
      const response = await convertInWorker(event.data);
      self.postMessage(response);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Worker での画像変換中に不明なエラーが発生しました。';

      const response: WorkerConvertError = {
        id: event.data.id,
        type: 'error',
        message,
      };
      self.postMessage(response);
    }
  })();
};

export {};
