import { resolveSourceMimeType } from './formatHelpers';
import { releaseImageElement } from './imageResourceCleanup';
import { trackCreateObjectURL, trackRevokeObjectURL } from './objectUrlRegistry';

export type DecodeMethod = 'image-bitmap' | 'html-image';

export interface DecodedImageSource {
  method: DecodeMethod;
  width: number;
  height: number;
  drawToCanvas(context: CanvasRenderingContext2D, width: number, height: number): void;
  release(): void;
}

function isCreateImageBitmapAvailable(): boolean {
  return typeof createImageBitmap === 'function';
}

async function decodeFileToImageBitmap(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    const buffer = await file.arrayBuffer();
    const blob = new Blob([buffer], { type: resolveSourceMimeType(file) });
    return createImageBitmap(blob);
  }
}

function loadHtmlImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = trackCreateObjectURL(file);

    image.onload = () => {
      trackRevokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      trackRevokeObjectURL(objectUrl);
      releaseImageElement(image);
      reject(new Error('画像の読み込みに失敗しました。ファイルが破損している可能性があります。'));
    };

    image.src = objectUrl;
  });
}

async function decodeWithImageBitmap(file: File): Promise<DecodedImageSource> {
  const bitmap = await decodeFileToImageBitmap(file);

  return {
    method: 'image-bitmap',
    width: bitmap.width,
    height: bitmap.height,
    drawToCanvas(context, width, height) {
      context.drawImage(bitmap, 0, 0, width, height);
    },
    release() {
      bitmap.close();
    },
  };
}

async function decodeWithHtmlImage(file: File): Promise<DecodedImageSource> {
  const image = await loadHtmlImageFromFile(file);

  return {
    method: 'html-image',
    width: image.naturalWidth,
    height: image.naturalHeight,
    drawToCanvas(context, width, height) {
      context.drawImage(image, 0, 0, width, height);
    },
    release() {
      releaseImageElement(image);
    },
  };
}

export async function decodeImageFromFile(file: File): Promise<DecodedImageSource> {
  if (isCreateImageBitmapAvailable()) {
    try {
      return await decodeWithImageBitmap(file);
    } catch {
      return decodeWithHtmlImage(file);
    }
  }

  return decodeWithHtmlImage(file);
}

export function formatDecodeMethodLabel(method: DecodeMethod): string {
  return method === 'image-bitmap' ? 'imageBitmap' : 'htmlImage';
}
