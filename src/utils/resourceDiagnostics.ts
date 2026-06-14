import type { ImageItem } from '../types';
import { getObjectUrlStats } from './objectUrlRegistry';

export interface ResourceDiagnosticsSnapshot {
  imageCount: number;
  convertedBlobCount: number;
  createdObjectUrlCount: number;
  revokedObjectUrlCount: number;
  activeObjectUrlCount: number;
  usedJSHeapSize: number | null;
  jsHeapSizeLimit: number | null;
}

interface PerformanceMemory {
  usedJSHeapSize: number;
  jsHeapSizeLimit: number;
}

function getPerformanceMemory(): { usedJSHeapSize: number; jsHeapSizeLimit: number } | null {
  const memory = (performance as Performance & { memory?: PerformanceMemory }).memory;
  if (!memory) {
    return null;
  }

  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
  };
}

export function collectResourceDiagnostics(items: ImageItem[]): ResourceDiagnosticsSnapshot {
  const objectUrlStats = getObjectUrlStats();
  const memory = getPerformanceMemory();

  return {
    imageCount: items.length,
    convertedBlobCount: items.filter((item) => item.convertedBlob !== undefined).length,
    createdObjectUrlCount: objectUrlStats.createdCount,
    revokedObjectUrlCount: objectUrlStats.revokedCount,
    activeObjectUrlCount: objectUrlStats.activeCount,
    usedJSHeapSize: memory?.usedJSHeapSize ?? null,
    jsHeapSizeLimit: memory?.jsHeapSizeLimit ?? null,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
