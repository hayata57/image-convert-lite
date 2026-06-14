export const ACCEPTED_INPUT_EXTENSIONS = [
  'jpg',
  'jpeg',
  'jpe',
  'jfif',
  'png',
  'webp',
  'bmp',
  'avif',
  'ico',
] as const;

export type AcceptedInputExtension = (typeof ACCEPTED_INPUT_EXTENSIONS)[number];

const ACCEPTED_EXTENSION_SET = new Set<string>(ACCEPTED_INPUT_EXTENSIONS);

const ACCEPTED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/bmp',
  'image/x-ms-bmp',
  'image/avif',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);

const EXTENSION_TO_MIME: Record<AcceptedInputExtension, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jpe: 'image/jpeg',
  jfif: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  bmp: 'image/bmp',
  avif: 'image/avif',
  ico: 'image/x-icon',
};

const FORMAT_LABELS: Record<string, string> = {
  jpeg: 'JPG',
  jpg: 'JPG',
  jpe: 'JPG',
  jfif: 'JPG',
  png: 'PNG',
  webp: 'WebP',
  bmp: 'BMP',
  avif: 'AVIF',
  ico: 'ICO',
};

/** file input / folder input の accept 属性用 */
export const FILE_INPUT_ACCEPT = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/bmp',
  'image/avif',
  'image/x-icon',
  '.jpg',
  '.jpeg',
  '.jpe',
  '.jfif',
  '.png',
  '.webp',
  '.bmp',
  '.avif',
  '.ico',
].join(',');

export function getAcceptedInputFormatLabel(): string {
  return 'JPG / JPEG / JPE / JFIF / PNG / WebP / BMP / AVIF / ICO';
}

export function isAcceptedImageFile(file: File): boolean {
  if (file.type && ACCEPTED_MIME_TYPES.has(file.type)) {
    return true;
  }

  const extension = getFileExtension(file.name).toLowerCase();
  return ACCEPTED_EXTENSION_SET.has(extension);
}

export function resolveSourceMimeType(file: File): string {
  if (file.type && ACCEPTED_MIME_TYPES.has(file.type)) {
    return file.type;
  }

  const extension = getFileExtension(file.name).toLowerCase();
  if (ACCEPTED_EXTENSION_SET.has(extension)) {
    return EXTENSION_TO_MIME[extension as AcceptedInputExtension];
  }

  return file.type || 'application/octet-stream';
}

export function getFileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return '';
  }
  return fileName.slice(lastDotIndex + 1);
}

export function getBaseName(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return fileName;
  }
  return fileName.slice(0, lastDotIndex);
}

export function getFormatLabel(format: string): string {
  const normalized = format.toLowerCase();
  return FORMAT_LABELS[normalized] ?? format.toUpperCase();
}

export function getOutputExtension(outputFormat: string): string {
  if (outputFormat === 'jpeg') {
    return 'jpg';
  }
  return outputFormat;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatDimensions(width: number, height: number): string {
  return `${width} × ${height}`;
}

export function detectFormatFromFile(file: File): string {
  if (file.type === 'image/jpeg') {
    return 'jpeg';
  }
  if (file.type === 'image/png') {
    return 'png';
  }
  if (file.type === 'image/webp') {
    return 'webp';
  }
  if (file.type === 'image/bmp' || file.type === 'image/x-ms-bmp') {
    return 'bmp';
  }
  if (file.type === 'image/avif') {
    return 'avif';
  }
  if (file.type === 'image/x-icon' || file.type === 'image/vnd.microsoft.icon') {
    return 'ico';
  }

  const extension = getFileExtension(file.name).toLowerCase();
  if (extension === 'jpg' || extension === 'jpeg' || extension === 'jpe' || extension === 'jfif') {
    return 'jpeg';
  }
  if (extension === 'png') {
    return 'png';
  }
  if (extension === 'webp') {
    return 'webp';
  }
  if (extension === 'bmp') {
    return 'bmp';
  }
  if (extension === 'avif') {
    return 'avif';
  }
  if (extension === 'ico') {
    return 'ico';
  }

  return 'unknown';
}
