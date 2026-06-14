import type { ImageItem } from '../types';

import { releaseImageElement } from './imageResourceCleanup';

import {
  detectFormatFromFile,
  getAcceptedInputFormatLabel,
  isAcceptedImageFile,
} from './formatHelpers';

import { trackCreateObjectURL, trackRevokeObjectURL } from './objectUrlRegistry';



function createId(): string {

  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {

    return crypto.randomUUID();

  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;

}



function loadImageDimensions(file: File): Promise<{ width: number; height: number }> {

  return new Promise((resolve, reject) => {

    const image = new Image();

    const objectUrl = trackCreateObjectURL(file);



    image.onload = () => {

      const dimensions = {

        width: image.naturalWidth,

        height: image.naturalHeight,

      };

      trackRevokeObjectURL(objectUrl);

      releaseImageElement(image);

      resolve(dimensions);

    };



    image.onerror = () => {

      trackRevokeObjectURL(objectUrl);

      releaseImageElement(image);

      reject(new Error('画像の読み込みに失敗しました。'));

    };



    image.src = objectUrl;

  });

}



export async function createImageItemFromFile(

  file: File,

  relativePath?: string,

): Promise<ImageItem> {

  if (!isAcceptedImageFile(file)) {

    throw new Error(`「${file.name}」は対応していない形式です。${getAcceptedInputFormatLabel()} のみ追加できます。`);

  }



  const dimensions = await loadImageDimensions(file);

  const pathName = relativePath ?? file.name;



  return {

    id: createId(),

    file,

    originalName: pathName,

    displayName: pathName,

    originalFormat: detectFormatFromFile(file),

    originalSize: file.size,

    originalWidth: dimensions.width,

    originalHeight: dimensions.height,

    previewUrl: trackCreateObjectURL(file),

    status: 'pending',

  };

}



export function revokeImageItemPreview(item: ImageItem): void {

  trackRevokeObjectURL(item.previewUrl);

}


