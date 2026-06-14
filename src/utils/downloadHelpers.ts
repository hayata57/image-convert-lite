import JSZip from 'jszip';
import type { ImageItem } from '../types';
import { getFileExtension } from './formatHelpers';
import { getPathBasename } from './outputFileName';
import { trackCreateObjectURL, trackRevokeObjectURL } from './objectUrlRegistry';
import {
  createFallbackFileName,
  isValidDownloadFileName,
  resolveDownloadFileName,
} from './safeFileName';
import { encodeZipEntryNameForWindows } from './zipEncoding';

function downloadBlobWithNativeAnchor(blob: Blob, fileName: string): void {
  const url = trackCreateObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => {
    trackRevokeObjectURL(url);
  }, 1000);
}

export function downloadSingleImage(item: ImageItem, fallbackIndex: number): void {
  if (!item.convertedBlob || !item.outputFileName) {
    return;
  }

  const fileName = isValidDownloadFileName(item.outputFileName)
    ? item.outputFileName
    : resolveDownloadFileName(item.outputFileName, fallbackIndex).fileName;

  downloadBlobWithNativeAnchor(item.convertedBlob, fileName);
}

function buildAsciiZipEntryPath(item: ImageItem, index: number): string {
  const extension = getFileExtension(item.outputFileName ?? '')
    || item.convertedFormat
    || 'jpg';
  return createFallbackFileName(index + 1, extension);
}

function resolveZipEntryPath(
  item: ImageItem,
  index: number,
  zipAsciiFileNames: boolean,
  usedZipPaths: Set<string>,
): string {
  if (zipAsciiFileNames) {
    let zipPath = buildAsciiZipEntryPath(item, index);
    let counter = index + 1;
    while (usedZipPaths.has(zipPath)) {
      counter += 1;
      const extension = getFileExtension(zipPath) || 'jpg';
      zipPath = createFallbackFileName(counter, extension);
    }
    return zipPath;
  }

  const storedPath = item.outputZipPath ?? item.outputFileName;
  if (!storedPath) {
    return buildAsciiZipEntryPath(item, index);
  }

  if (!isValidDownloadFileName(storedPath)) {
    return resolveDownloadFileName(getPathBasename(storedPath), index + 1).fileName;
  }

  return storedPath;
}

export async function downloadImagesAsZip(
  items: ImageItem[],
  zipAsciiFileNames: boolean,
): Promise<void> {
  const convertedItems = items.filter(
    (item) => item.status === 'done' && item.convertedBlob && item.outputZipPath,
  );

  if (convertedItems.length === 0) {
    throw new Error('ダウンロード可能な変換済み画像がありません。');
  }

  const zip = new JSZip();
  const usedZipPaths = new Set<string>();

  convertedItems.forEach((item, index) => {
    const zipPath = resolveZipEntryPath(item, index, zipAsciiFileNames, usedZipPaths);
    usedZipPaths.add(zipPath);
    zip.file(zipPath, item.convertedBlob as Blob);
  });

  const generateOptions: Parameters<JSZip['generateAsync']>[0] = {
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
    platform: 'DOS',
  };

  if (!zipAsciiFileNames) {
    const encodedPaths = new Map<string, string>();
    for (const zipPath of usedZipPaths) {
      encodedPaths.set(zipPath, await encodeZipEntryNameForWindows(zipPath));
    }

    generateOptions.encodeFileName = (name: string) => encodedPaths.get(name) ?? name;
  }

  const zipBlob = await zip.generateAsync(generateOptions);

  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  downloadBlobWithNativeAnchor(zipBlob, `converted-images-${timestamp}.zip`);
}
