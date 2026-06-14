type EncodingModule = typeof import('encoding-japanese');

let encodingModulePromise: Promise<EncodingModule> | null = null;

async function loadEncodingModule(): Promise<EncodingModule> {
  if (!encodingModulePromise) {
    encodingModulePromise = import('encoding-japanese');
  }
  return encodingModulePromise;
}

/**
 * JSZip の ZIP ヘッダ用ファイル名エンコード。
 * デフォルトの utf8encode は UTF-8 バイト列をヘッダに書き込むため、
 * 日本語 Windows の標準解凍が CP932 として解釈し文字化けする。
 * Shift_JIS (CP932) バイト列に変換してヘッダへ書き込む。
 */
export async function encodeZipEntryNameForWindows(fileName: string): Promise<string> {
  const Encoding = await loadEncodingModule();
  const unicodeArray = Encoding.stringToCode(fileName);
  const sjisArray = Encoding.convert(unicodeArray, 'SJIS', 'UNICODE');
  return Encoding.codeToString(sjisArray);
}
