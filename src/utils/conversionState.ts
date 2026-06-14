import type { ConversionSettings, ImageItem } from '../types';

export function areConversionSettingsEqual(
  left: ConversionSettings,
  right: ConversionSettings,
): boolean {
  return (
    left.outputFormat === right.outputFormat
    && left.quality === right.quality
    && left.targetWidth === right.targetWidth
  );
}

export function canPerformBatchConversion(params: {
  items: ImageItem[];
  settings: ConversionSettings;
  lastConvertedSettings: ConversionSettings | null;
  lastConvertedItemIds: Set<string>;
  isConverting: boolean;
  isStopped: boolean;
}): boolean {
  const {
    items,
    settings,
    lastConvertedSettings,
    lastConvertedItemIds,
    isConverting,
    isStopped,
  } = params;

  if (items.length === 0 || isConverting || isStopped) {
    return false;
  }

  const hasUnconvertedItems = items.some(
    (item) => item.status === 'pending' || item.status === 'error',
  );
  if (hasUnconvertedItems) {
    return true;
  }

  const hasNewItems = items.some((item) => !lastConvertedItemIds.has(item.id));
  if (hasNewItems) {
    return true;
  }

  if (lastConvertedSettings === null) {
    return true;
  }

  if (!areConversionSettingsEqual(settings, lastConvertedSettings)) {
    return true;
  }

  return false;
}

export function canResumeConversion(params: {
  items: ImageItem[];
  settings: ConversionSettings;
  lastConvertedSettings: ConversionSettings | null;
  isStopped: boolean;
  isConverting: boolean;
}): boolean {
  const {
    items,
    settings,
    lastConvertedSettings,
    isStopped,
    isConverting,
  } = params;

  if (!isStopped || isConverting) {
    return false;
  }

  if (!lastConvertedSettings) {
    return false;
  }

  if (!areConversionSettingsEqual(settings, lastConvertedSettings)) {
    return false;
  }

  return items.some((item) => item.status === 'pending' || item.status === 'error');
}

export function shouldShowReconvertHint(params: {
  items: ImageItem[];
  canConvert: boolean;
  canResume: boolean;
  isConverting: boolean;
  isStopped: boolean;
}): boolean {
  const { items, canConvert, canResume, isConverting, isStopped } = params;
  return items.length > 0 && !canConvert && !canResume && !isConverting && !isStopped;
}
