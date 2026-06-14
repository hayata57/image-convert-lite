declare module 'encoding-japanese' {
  type EncodingType = 'UNICODE' | 'SJIS' | 'UTF8';

  export function stringToCode(str: string): number[];
  export function convert(
    code: number[],
    to: EncodingType,
    from: EncodingType,
  ): number[];
  export function codeToString(code: number[]): string;
}
