import type { ImageItem } from '../types';
import { trackRevokeObjectURL } from './objectUrlRegistry';

export function releaseCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = 0;
  canvas.height = 0;
}

export function releaseCanvasAndImage(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
): void {
  releaseCanvas(canvas);
  image.src = '';
  image.removeAttribute('src');
}

export function releaseImageElement(image: HTMLImageElement): void {
  image.src = '';
  image.removeAttribute('src');
}

export function revokeItemPreviewUrl(item: ImageItem): void {
  if (item.previewUrl) {
    trackRevokeObjectURL(item.previewUrl);
  }
}

export function releaseItemResources(item: ImageItem): void {
  revokeItemPreviewUrl(item);
}

export function releaseAllItemResources(items: ImageItem[]): void {
  for (const item of items) {
    releaseItemResources(item);
  }
}

export function stripConvertedResults(item: ImageItem): ImageItem {
  return {
    ...item,
    status: 'pending',
    errorMessage: undefined,
    convertedBlob: undefined,
    outputFileName: undefined,
    outputZipPath: undefined,
    convertedFormat: undefined,
    convertedSize: undefined,
    convertedWidth: undefined,
    convertedHeight: undefined,
  };
}

export function prepareItemsForReconversion(items: ImageItem[]): ImageItem[] {
  return items.map(stripConvertedResults);
}
