import type { ConversionSettings, OutputFormat } from '../types';

export function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  targetWidth: number | null,
): { width: number; height: number } {
  if (!targetWidth || targetWidth <= 0) {
    return { width: originalWidth, height: originalHeight };
  }

  const ratio = originalHeight / originalWidth;
  const height = Math.round(targetWidth * ratio);

  return {
    width: targetWidth,
    height,
  };
}

export function getMimeType(outputFormat: OutputFormat): string {
  if (outputFormat === 'jpeg') {
    return 'image/jpeg';
  }
  if (outputFormat === 'png') {
    return 'image/png';
  }
  return 'image/webp';
}

export function getQualityValue(settings: ConversionSettings): number | undefined {
  if (settings.outputFormat === 'png') {
    return undefined;
  }
  return Math.min(100, Math.max(1, settings.quality)) / 100;
}
