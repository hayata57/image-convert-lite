import { resolveSourceMimeType } from './formatHelpers';
import type { ConversionSettings, OutputFormat } from '../types';
import type { ImageConversionTiming } from './conversionTiming';
import type {
  WorkerConvertRequest,
  WorkerConvertResponse,
} from '../workers/conversionWorker';

export interface WorkerConversionResult {
  blob: Blob;
  outputFormat: OutputFormat;
  width: number;
  height: number;
  timing: ImageConversionTiming;
}

let workerInstance: Worker | null = null;
let workerEnabled: boolean | null = null;

function canUseConversionWorker(): boolean {
  if (workerEnabled === false) {
    return false;
  }

  return typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined';
}

function getWorkerInstance(): Worker | null {
  if (!canUseConversionWorker()) {
    return null;
  }

  if (workerInstance) {
    return workerInstance;
  }

  try {
    workerInstance = new Worker(
      new URL('../workers/conversionWorker.ts', import.meta.url),
      { type: 'module' },
    );
    return workerInstance;
  } catch {
    workerEnabled = false;
    return null;
  }
}

function disableWorker(): void {
  workerEnabled = false;
  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
  }
}

function createRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function convertImageViaWorker(
  file: File,
  settings: ConversionSettings,
  displayName: string,
): Promise<WorkerConversionResult | null> {
  const worker = getWorkerInstance();
  if (!worker) {
    return null;
  }

  const roundtripStart = performance.now();
  const id = createRequestId();
  const buffer = await file.arrayBuffer();

  const request: WorkerConvertRequest = {
    id,
    displayName,
    settings,
    buffer,
    sourceMimeType: resolveSourceMimeType(file),
  };

  return new Promise((resolve) => {
    const handleMessage = (event: MessageEvent<WorkerConvertResponse>) => {
      if (event.data.id !== id) {
        return;
      }

      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);

      const workerRoundtripMs = performance.now() - roundtripStart;

      if (event.data.type === 'error') {
        disableWorker();
        resolve(null);
        return;
      }

      resolve({
        blob: event.data.blob,
        outputFormat: event.data.outputFormat,
        width: event.data.width,
        height: event.data.height,
        timing: {
          ...event.data.timing,
          processMethod: 'worker',
          workerRoundtripMs: Math.round(workerRoundtripMs * 10) / 10,
        },
      });
    };

    const handleError = () => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      disableWorker();
      resolve(null);
    };

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);

    try {
      worker.postMessage(request, [buffer]);
    } catch {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      disableWorker();
      resolve(null);
    }
  });
}

export function isConversionWorkerEnabled(): boolean {
  return canUseConversionWorker();
}
