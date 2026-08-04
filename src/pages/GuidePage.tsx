import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SakutioHeader } from '../components/SakutioHeader';
import { MAX_FILE_SIZE_MB, MAX_FILES } from '../constants';

const FAQ_ITEMS: { question: string; answer: ReactNode }[] = [
  {
    question: '無料で使えますか？',
    answer: (
      <p>
        はい。Image Convert Lite は無料で利用できます。アカウント登録やインストールは不要です。
      </p>
    ),
  },
  {
    question: '画像はサーバーへ送信されますか？',
    answer: (
      <p>
        いいえ。変換処理はお使いのブラウザ内で行われます。画像ファイルは Sakutio のサーバーへアップロードされません。
      </p>
    ),
  },
  {
    question: '元の画像ファイルは変更されますか？',
    answer: (
      <p>
        いいえ。元のファイルはそのまま残ります。変換結果は新しいファイルとしてダウンロードされます。
      </p>
    ),
  },
  {
    question: '複数の画像をまとめて変換できますか？',
    answer: (
      <p>
        はい。複数の画像やフォルダを追加し、一括変換できます。変換後は個別ダウンロード、または ZIP でまとめて保存できます。
        1回あたり最大 {MAX_FILES} 枚まで追加できます。
      </p>
    ),
  },
  {
    question: 'スマートフォンでも使えますか？',
    answer: (
      <p>
        はい。スマートフォンやタブレットのブラウザからも利用できます。機種やブラウザによっては、フォルダ選択や大量ファイルの処理に制限がある場合があります。
      </p>
    ),
  },
  {
    question: '変換すると画質が低下しますか？',
    answer: (
      <>
        <p>
          出力形式と設定によって異なります。JPG や WebP へ変換する場合は、画質（1〜100）の設定が圧縮に影響します。
          PNG へ変換する場合、画質設定は使用されません。
        </p>
        <p>
          横幅を小さくリサイズした場合も、見た目の解像度は下がります。元サイズのまま高画質で出力すれば、劣化を抑えやすくなります。
        </p>
      </>
    ),
  },
  {
    question: 'PNGの透明部分をJPGへ変換するとどうなりますか？',
    answer: (
      <p>
        JPG は透過を扱えないため、透明部分は白背景で塗りつぶされて変換されます。透過を残したい場合は PNG または WebP を選んでください。
      </p>
    ),
  },
  {
    question: '変換した画像を商用利用できますか？',
    answer: (
      <>
        <p>
          Image Convert Lite の利用自体に用途の制限はありません。個人利用・商用利用のいずれでもツールを使えます。
        </p>
        <p>
          ただし、元画像や変換後画像の著作権・利用許諾は利用者自身が確認する必要があります。
          他者の著作物を無断で利用できるという意味ではありません。
        </p>
      </>
    ),
  },
  {
    question: '対応していない形式を追加してほしい場合はどうすればよいですか？',
    answer: (
      <p>
        Sakutio のお問い合わせフォームから、ご要望の形式や利用シーンをお知らせください。
        実装可否を確認のうえ、対応を検討します。
      </p>
    ),
  },
];

export function GuidePage() {
  return (
    <div className="app">
      <SakutioHeader />

      <header className="app-header">
        <div className="app-header__content">
          <h1 className="app-title">Image Convert Liteの使い方</h1>
          <p className="app-description">
            Image Convert Liteの基本的な使い方、対応形式、各設定の意味、変換できない場合の確認方法をまとめています。
          </p>
          <p className="guide-back-link-wrap">
            <Link to="/" className="guide-back-link">
              画像変換ツールへ戻る
            </Link>
          </p>
        </div>
      </header>

      <main className="app-main guide-page">
        <section className="guide-section" aria-labelledby="guide-about">
          <h2 id="guide-about" className="section-title">Image Convert Liteとは</h2>
          <p>
            Image Convert Lite は、ブラウザで使える無料の画像変換ツールです。インストールは不要で、複数の画像をまとめて変換できます。
          </p>
          <p>
            画像処理は利用者のブラウザ内で行われ、画像ファイルは Sakutio のサーバーへアップロードされません。
          </p>
        </section>

        <section className="guide-section" aria-labelledby="guide-formats">
          <h2 id="guide-formats" className="section-title">対応形式</h2>

          <div className="guide-cards">
            <div className="guide-card">
              <h3 className="guide-card__title">入力形式</h3>
              <ul>
                <li>JPG</li>
                <li>JPEG</li>
                <li>JPE</li>
                <li>JFIF</li>
                <li>PNG</li>
                <li>WebP</li>
                <li>BMP</li>
                <li>AVIF</li>
                <li>ICO</li>
              </ul>
            </div>
            <div className="guide-card">
              <h3 className="guide-card__title">出力形式</h3>
              <ul>
                <li>JPG</li>
                <li>PNG</li>
                <li>WebP</li>
              </ul>
              <p className="guide-card__note">
                WebP は、お使いのブラウザが WebP 出力に対応している場合のみ選択できます。
              </p>
            </div>
            <div className="guide-card">
              <h3 className="guide-card__title">制限</h3>
              <ul>
                <li>1回あたり最大 {MAX_FILES} 枚まで追加できます</li>
                <li>1ファイルあたり最大 {MAX_FILE_SIZE_MB}MB までです（合計容量ではなく、各ファイルごとの上限です）</li>
                <li>上限を超えたファイルはスキップされます</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="guide-section" aria-labelledby="guide-howto">
          <h2 id="guide-howto" className="section-title">基本的な使い方</h2>
          <ol className="guide-steps">
            <li>
              <strong>画像を追加する</strong>
              <p>
                ドラッグ＆ドロップ、または「画像ファイルを選択」「フォルダを選択」から画像を追加します。
                フォルダ選択やドロップでは、サブフォルダ内の画像も読み込めます。対応形式以外のファイルはスキップされます。
              </p>
            </li>
            <li>
              <strong>出力形式を選択する</strong>
              <p>変換設定で、出力形式（JPG / PNG / WebP）を選びます。</p>
            </li>
            <li>
              <strong>必要に応じて画質や横幅を設定する</strong>
              <p>
                画質（1〜100）や横幅リサイズ（px）を設定できます。横幅を空欄にすると元サイズのまま変換します。
              </p>
            </li>
            <li>
              <strong>変換を開始する</strong>
              <p>
                「一括変換」を押すと変換が始まります。変換中は「停止」で途中停止でき、停止後は「再開」で続きから変換できます。
              </p>
            </li>
            <li>
              <strong>ダウンロードする</strong>
              <p>
                変換が完了した画像は、一覧から個別にダウンロードできます。まとめて保存する場合は「ZIP でまとめてダウンロード」を使います。
                読み込んだ内容を取り消すときは「すべてクリア」を使います。
              </p>
            </li>
          </ol>
        </section>

        <section className="guide-section" aria-labelledby="guide-settings">
          <h2 id="guide-settings" className="section-title">各設定の説明</h2>
          <dl className="guide-dl">
            <div className="guide-dl__item">
              <dt>出力形式</dt>
              <dd>変換後のファイル形式です。JPG・PNG・WebP から選べます。ブラウザが WebP 出力に非対応の場合、WebP は選択できません。</dd>
            </div>
            <div className="guide-dl__item">
              <dt>画質（1〜100）</dt>
              <dd>
                JPG または WebP 出力時に使われる圧縮品質です。数値が大きいほど高画質・大容量寄りになります。
                PNG 出力時は画質設定は使用されません。
              </dd>
            </div>
            <div className="guide-dl__item">
              <dt>横幅リサイズ（px）</dt>
              <dd>
                指定した横幅（ピクセル）へリサイズします。空欄の場合は元サイズのままです。
                指定した場合は縦横比を維持して高さが自動計算されます。
              </dd>
            </div>
            <div className="guide-dl__item">
              <dt>縦横比の扱い</dt>
              <dd>横幅を指定してリサイズする場合、縦横比は維持されます。縦だけを独立して指定する設定はありません。</dd>
            </div>
            <div className="guide-dl__item">
              <dt>JPG へ変換した場合の透過部分</dt>
              <dd>
                JPG は透過情報を持てないため、透明部分は白背景で塗りつぶされます。透過を残したい場合は PNG または WebP を選んでください。
              </dd>
            </div>
            <div className="guide-dl__item">
              <dt>ZIP内のファイル名を英数字にする</dt>
              <dd>
                有効にすると、ZIP 内のファイル名が image_001.jpg のような英数字形式になります（文字化け対策）。
                画面上の表示名は変わりません。
              </dd>
            </div>
            <div className="guide-dl__item">
              <dt>停止と再開</dt>
              <dd>
                変換中に「停止」を押すと処理を止められます。停止後は「再開」で未変換の画像から続けられます。
                設定や画像を変更すると、再変換の操作に切り替わります。
              </dd>
            </div>
            <div className="guide-dl__item">
              <dt>個別ダウンロード</dt>
              <dd>画像一覧の各行から、変換が完了した画像を1枚ずつダウンロードできます。</dd>
            </div>
            <div className="guide-dl__item">
              <dt>ZIP ダウンロード</dt>
              <dd>変換済みの画像を1つの ZIP ファイルにまとめてダウンロードできます。変換中はダウンロードできません。</dd>
            </div>
          </dl>
        </section>

        <section className="guide-section" aria-labelledby="guide-privacy">
          <h2 id="guide-privacy" className="section-title">プライバシーと画像の扱い</h2>
          <div className="guide-callout guide-callout--info" role="note">
            <ul>
              <li>画像変換処理はブラウザ内で行われます。</li>
              <li>画像ファイルは Sakutio のサーバーへアップロードされません。</li>
              <li>Sakutio が変換対象画像を保存・閲覧することはありません。</li>
              <li>共有 PC では、変換後にダウンロードしたファイルの管理にご注意ください。</li>
            </ul>
          </div>
        </section>

        <section className="guide-section" aria-labelledby="guide-troubleshoot">
          <h2 id="guide-troubleshoot" className="section-title">変換できない場合</h2>
          <p>うまく変換できないときは、次を確認してください。</p>
          <ul>
            <li>対応形式（JPG / JPEG / JPE / JFIF / PNG / WebP / BMP / AVIF / ICO）かどうかを確認する</li>
            <li>ファイルの拡張子と実際のデータ形式が一致しているか確認する</li>
            <li>ファイル数（最大 {MAX_FILES} 枚）や 1ファイルあたりの容量（最大 {MAX_FILE_SIZE_MB}MB）の上限を超えていないか確認する</li>
            <li>メモリ不足の可能性があるため、一度に処理する枚数を減らす</li>
            <li>ブラウザを再読み込みする</li>
            <li>Chrome、Brave、Edge など別の最新ブラウザで試す</li>
            <li>特殊な ICO、AVIF、破損画像など、ブラウザが読み込めない画像が含まれていないか確認する</li>
          </ul>
          <div className="guide-callout guide-callout--warn" role="note">
            <p>
              ブラウザが対応していない形式への出力（例: 非対応環境での WebP）や、読み込めない画像はエラーになります。
              エラーになった画像は一覧の状態とメッセージを確認してください。
            </p>
          </div>
        </section>

        <section className="guide-section" aria-labelledby="guide-faq">
          <h2 id="guide-faq" className="section-title">よくある質問</h2>
          <div className="guide-faq">
            {FAQ_ITEMS.map((item) => (
              <article key={item.question} className="guide-faq__item">
                <h3 className="guide-faq__question">Q. {item.question}</h3>
                <div className="guide-faq__answer">{item.answer}</div>
              </article>
            ))}
          </div>
        </section>

        <section className="guide-section" aria-labelledby="guide-contact">
          <h2 id="guide-contact" className="section-title">お問い合わせ</h2>
          <p>
            不具合の報告や機能のご要望は、Sakutio のお問い合わせフォームからご連絡ください。
          </p>
          <p>
            <a href="https://sakutio.com/contact" className="guide-contact-link">
              不具合の報告・機能のご要望
            </a>
          </p>
          <p className="guide-back-link-wrap guide-back-link-wrap--footer">
            <Link to="/" className="guide-back-link">
              画像変換ツールへ戻る
            </Link>
          </p>
        </section>
      </main>

      <footer className="app-footer">
        <p>
          すべての処理はお使いのブラウザ内で行われます。画像は外部に送信されません。
          （1回あたり最大 {MAX_FILES} 枚・1ファイル最大 {MAX_FILE_SIZE_MB}MB）
        </p>
      </footer>
    </div>
  );
}
