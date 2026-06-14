import type { EncodeMethod } from './conversionTiming';

export interface EncodeCanvasResult {
  blob: Blob;
  encodeMs: number;
  method: EncodeMethod;
}

/** メインスレッド fallback 用。HTMLCanvasElement.toBlob のみ使用する。 */
export function encodeCanvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number | undefined,
): Promise<EncodeCanvasResult> {
  const encodeStart = performance.now();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('画像の変換に失敗しました。ブラウザがこの形式に対応していない可能性があります。'));
          return;
        }
        resolve({
          blob,
          encodeMs: performance.now() - encodeStart,
          method: 'html-canvas',
        });
      },
      mimeType,
      quality,
    );
  });
}
