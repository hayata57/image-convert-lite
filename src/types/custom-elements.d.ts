import type { DetailedHTMLProps, HTMLAttributes } from 'react';

/**
 * Sakutio共通グローバルヘッダー
 * （Sakutio Homeが配信する https://sakutio.com/shared/sakutio-global-header.js）を
 * JSXで利用するためのカスタム要素型定義。
 * React 19のautomatic JSX runtimeは "react" モジュールが export する
 * JSX名前空間（React.JSX）を参照するため、モジュール拡張で追加する。
 */
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'sakutio-global-header': DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      'sakutio-global-footer': DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}

export {};
