/**
 * グローバルヘッダーの実装本体は、Sakutio Homeが配信する共通Web Component
 * （https://sakutio.com/shared/sakutio-global-header.js、
 * カスタム要素: <sakutio-global-header>）に一元化されている。
 * このコンポーネントは、そのカスタム要素を描画するホストに過ぎない。
 *
 * home-context属性は付けないため、リンクは常にSakutio Homeの絶対URLになる
 * （https://sakutio.com/、https://sakutio.com/#tools、https://sakutio.com/#about、
 * https://sakutio.com/contact）。
 *
 * 子要素（sakutio-header-fallback）は、共通スクリプトが読み込めなかった場合に
 * のみブラウザに表示される最低限のフォールバックリンク。
 */
export function SakutioHeader() {
  return (
    <sakutio-global-header>
      <div className="sakutio-header-fallback">
        <a href="https://sakutio.com/">Sakutio</a>
        <nav>
          <a href="https://sakutio.com/#tools">ツール一覧</a>
          <a href="https://sakutio.com/#about">Sakutioについて</a>
          <a href="https://sakutio.com/contact">お問い合わせ</a>
        </nav>
      </div>
    </sakutio-global-header>
  );
}
