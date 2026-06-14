import type { ConversionResultRecord, ConversionSettings, ImageItem, SessionSkipState } from '../types';

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function buildNonImageSkipReasons(count: number): string[] {
  if (count <= 0) {
    return [];
  }

  if (count === 1) {
    return ['非画像ファイル 1 件をスキップしました'];
  }

  return [`非画像ファイル ${count} 件をスキップしました`];
}

export function appendSessionSkips(
  current: SessionSkipState,
  addedCount: number,
  addedReasons: string[],
): SessionSkipState {
  if (addedCount <= 0 && addedReasons.length === 0) {
    return current;
  }

  return {
    count: current.count + addedCount,
    reasons: [...current.reasons, ...addedReasons],
  };
}

export function collectErrorReasons(items: ImageItem[]): string[] {
  return items
    .filter((item) => item.status === 'error' && item.errorMessage)
    .map((item) => `「${item.originalName}」: ${item.errorMessage}`);
}

export function buildConversionResultRecord(params: {
  successCount: number;
  errorCount: number;
  sessionSkips: SessionSkipState;
  errorReasons: string[];
  settings: ConversionSettings;
}): ConversionResultRecord {
  const {
    successCount,
    errorCount,
    sessionSkips,
    errorReasons,
    settings,
  } = params;

  return {
    id: createId(),
    completedAt: new Date().toISOString(),
    successCount,
    errorCount,
    skipCount: sessionSkips.count,
    skipReasons: [...sessionSkips.reasons],
    errorReasons,
    settings,
  };
}

export function formatCompletedAt(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getOutputFormatLabel(format: ConversionSettings['outputFormat']): string {
  switch (format) {
    case 'jpeg':
      return 'JPG';
    case 'png':
      return 'PNG';
    case 'webp':
      return 'WebP';
    default:
      return format;
  }
}
