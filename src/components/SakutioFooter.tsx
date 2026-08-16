/**
 * グローバルフッターの実装本体は、Sakutio Homeが配信する共通Web Component
 * （https://sakutio.com/shared/sakutio-global-footer.js、
 * カスタム要素: <sakutio-global-footer>）に一元化されている。
 * このコンポーネントは、そのカスタム要素を描画するホストに過ぎない。
 *
 * home-context属性は付けない。リンクは常にSakutio Homeの絶対URLになる。
 */
export function SakutioFooter() {
  return (
    <sakutio-global-footer>
      <div className="sakutio-footer-fallback">
        <a href="https://sakutio.com/">Sakutio</a>
      </div>
    </sakutio-global-footer>
  );
}
