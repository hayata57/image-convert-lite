import type { ConversionSettings, ImageItem } from '../types';
import type { ImageConversionTiming } from './conversionTiming';
import { getOutputExtension } from './formatHelpers';
import { convertImage } from './imageConverter';
import {
  buildConvertedOutputPath,
  getPathBasename,
  resolveUniqueOutputPath,
} from './outputFileName';
import { sanitizeOutputPath } from './safeFileName';

const ITEMS_FLUSH_INTERVAL = 5;
const PROGRESS_UPDATE_INTERVAL_MS = 100;

export interface ConversionLoopCallbacks {
  onProgress: (current: number, total: number) => void;
  onItemsFlush: (items: ImageItem[]) => void;
  onImageTiming?: (timing: ImageConversionTiming) => void;
  shouldStop: () => boolean;
}

export interface ConversionLoopResult {
  items: ImageItem[];
  runSuccessCount: number;
  runErrorCount: number;
  stopped: boolean;
  timingRecords: ImageConversionTiming[];
}

function collectUsedOutputPaths(items: ImageItem[]): Set<string> {
  const usedPaths = new Set<string>();
  for (const item of items) {
    if (item.status === 'done' && item.outputZipPath) {
      usedPaths.add(item.outputZipPath);
    }
  }
  return usedPaths;
}

function assignConvertedOutputPaths(
  item: ImageItem,
  outputFormat: string,
  usedOutputPaths: Set<string>,
): { outputZipPath: string; outputFileName: string } {
  const extension = getOutputExtension(outputFormat);
  const desiredPath = sanitizeOutputPath(
    buildConvertedOutputPath(item.originalName, extension),
  );
  const outputZipPath = resolveUniqueOutputPath(desiredPath, usedOutputPaths);
  const outputFileName = getPathBasename(outputZipPath);
  return { outputZipPath, outputFileName };
}

export async function runConversionLoop(
  items: ImageItem[],
  settings: ConversionSettings,
  resumeMode: boolean,
  callbacks: ConversionLoopCallbacks,
): Promise<ConversionLoopResult> {
  const updatedItems = [...items];
  const usedOutputPaths = resumeMode
    ? collectUsedOutputPaths(updatedItems)
    : new Set<string>();

  let runSuccessCount = 0;
  let runErrorCount = 0;
  let processedCount = 0;
  let lastProgressTime = 0;
  const total = updatedItems.length;
  const timingRecords: ImageConversionTiming[] = [];

  const reportProgress = (current: number, force = false) => {
    const now = Date.now();
    if (force || now - lastProgressTime >= PROGRESS_UPDATE_INTERVAL_MS) {
      lastProgressTime = now;
      callbacks.onProgress(current, total);
    }
  };

  reportProgress(0, true);

  for (let index = 0; index < updatedItems.length; index += 1) {
    const item = updatedItems[index];

    if (resumeMode && item.status === 'done') {
      continue;
    }

    reportProgress(index + 1);

    try {
      const result = await convertImage(item.file, settings, item.displayName ?? item.originalName);
      timingRecords.push(result.timing);
      callbacks.onImageTiming?.(result.timing);

      const { outputZipPath, outputFileName } = assignConvertedOutputPaths(
        item,
        result.outputFormat,
        usedOutputPaths,
      );

      updatedItems[index] = {
        ...item,
        status: 'done',
        errorMessage: undefined,
        convertedBlob: result.blob,
        outputFileName,
        outputZipPath,
        convertedFormat: result.outputFormat,
        convertedSize: result.blob.size,
        convertedWidth: result.width,
        convertedHeight: result.height,
      };
      runSuccessCount += 1;
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : '画像の変換中に不明なエラーが発生しました。';

      updatedItems[index] = {
        ...item,
        status: 'error',
        errorMessage: message,
      };
      runErrorCount += 1;
    }

    processedCount += 1;

    if (processedCount % ITEMS_FLUSH_INTERVAL === 0) {
      callbacks.onItemsFlush([...updatedItems]);
    }

    if (callbacks.shouldStop()) {
      break;
    }
  }

  reportProgress(
    updatedItems.filter((item) => item.status === 'done' || item.status === 'error').length,
    true,
  );
  callbacks.onItemsFlush([...updatedItems]);

  return {
    items: updatedItems,
    runSuccessCount,
    runErrorCount,
    stopped: callbacks.shouldStop(),
    timingRecords,
  };
}
