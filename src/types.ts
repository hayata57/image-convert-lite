export type OutputFormat = 'jpeg' | 'png' | 'webp';

export type ImageStatus = 'pending' | 'converting' | 'done' | 'error';

export interface ConversionSettings {
  outputFormat: OutputFormat;
  quality: number;
  targetWidth: number | null;
  /** ZIP 内のファイル名を英数字にする（文字化け対策の代替手段） */
  zipAsciiFileNames: boolean;
}

export interface ConversionResultRecord {
  id: string;
  completedAt: string;
  successCount: number;
  errorCount: number;
  skipCount: number;
  skipReasons: string[];
  errorReasons: string[];
  settings: ConversionSettings;
}

export interface SessionSkipState {
  count: number;
  reasons: string[];
}

export interface ImageItem {
  id: string;
  file: File;
  /** 読み込み時の元パス（フォルダ構造を含む） */
  originalName: string;
  /** 画面表示用ファイル名 */
  displayName: string;
  originalFormat: string;
  originalSize: number;
  originalWidth: number;
  originalHeight: number;
  previewUrl: string;
  status: ImageStatus;
  errorMessage?: string;
  convertedBlob?: Blob;
  /** 個別ダウンロード用の完成ファイル名 */
  outputFileName?: string;
  /** ZIP 内のパス（サブフォルダ構造を含む） */
  outputZipPath?: string;
  convertedFormat?: string;
  convertedSize?: number;
  convertedWidth?: number;
  convertedHeight?: number;
}
