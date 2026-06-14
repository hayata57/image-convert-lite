import { getFileExtension } from './formatHelpers';

const INVALID_FILE_NAME_CHARS = /[\\/:*?"<>|]/g;
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

/** 変換時に1回だけ適用するパス正規化。ダウンロード時に再適用しないこと。 */
export function sanitizeOutputPath(fileName: string): string {
  const normalized = fileName.normalize('NFC').replace(/\\/g, '/');
  const parts = normalized
    .split('/')
    .map((part) => part.replace(INVALID_FILE_NAME_CHARS, '_').replace(CONTROL_CHARS, '').trim())
    .filter((part) => part.length > 0 && part !== '.' && part !== '..');

  return parts.join('/');
}

export function isValidDownloadFileName(fileName: string): boolean {
  if (!fileName || fileName.trim().length === 0) {
    return false;
  }

  if (CONTROL_CHARS.test(fileName) || INVALID_FILE_NAME_CHARS.test(fileName)) {
    return false;
  }

  return !fileName.endsWith('/') && !fileName.endsWith('\\');
}

export function createFallbackFileName(index: number, extension: string): string {
  const safeExtension = extension.replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
  return `image_${String(index).padStart(3, '0')}.${safeExtension}`;
}

export function resolveDownloadFileName(
  preferredName: string,
  fallbackIndex: number,
): { fileName: string; usedFallback: boolean } {
  const normalized = sanitizeOutputPath(preferredName);

  if (isValidDownloadFileName(normalized)) {
    return { fileName: normalized, usedFallback: false };
  }

  const basename = normalized.split('/').pop() ?? '';
  const extension = getFileExtension(basename) || 'jpg';

  return {
    fileName: createFallbackFileName(fallbackIndex, extension),
    usedFallback: true,
  };
}

export function resolveDownloadZipPath(
  preferredPath: string,
  fallbackIndex: number,
): { zipPath: string; downloadName: string; usedFallback: boolean } {
  const normalized = sanitizeOutputPath(preferredPath);

  if (isValidDownloadFileName(normalized)) {
    return {
      zipPath: normalized,
      downloadName: normalized.split('/').pop() ?? normalized,
      usedFallback: false,
    };
  }

  const basename = normalized.split('/').pop() ?? '';
  const extension = getFileExtension(basename) || 'jpg';
  const fallbackName = createFallbackFileName(fallbackIndex, extension);

  return {
    zipPath: fallbackName,
    downloadName: fallbackName,
    usedFallback: false,
  };
}
