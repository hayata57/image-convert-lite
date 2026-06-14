interface EncodingSlowWarningProps {
  visible: boolean;
}

export function EncodingSlowWarning({ visible }: EncodingSlowWarningProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="message message--warning encoding-slow-warning" role="alert">
      <p>画像エンコード処理が低速化しています。</p>
      <p>
        同じブラウザで動画再生を行うと、
        変換速度が低下する場合があります。
      </p>
      <p>改善しない場合は、</p>
      <ul className="encoding-slow-warning__list">
        <li>ページを再読み込みして動画を停止した状態で変換する</li>
        <li>動画再生と変換処理を別々のブラウザで実行する</li>
      </ul>
      <p>ことをお試しください。</p>
      <p>
        停止後は「ZIPでまとめてダウンロード」から、
        変換済みの画像のみダウンロードできます。
      </p>
    </div>
  );
}
