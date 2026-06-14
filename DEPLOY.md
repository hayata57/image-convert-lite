# Cloudflare Pages デプロイ手順

Image Convert Lite を Cloudflare Pages に公開するための設定メモです。

## 前提

- 画像変換は **すべてブラウザ内** で完結します（サーバーへ画像は送信されません）
- ビルド成果物は静的ファイルのみ（`dist/`）
- Web Worker は Vite ビルド時に別チャンクとして `dist/assets/` に出力されます

## Cloudflare Pages 設定

| 項目 | 値 |
|------|-----|
| **Framework preset** | `Vite`（なければ `None`） |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory** | リポジトリ直下（`package.json` がある場所） |
| **Environment variables** | なし |

### Node.js バージョン

Cloudflare Pages のビルド環境で Node.js 18 以上が使えることを確認してください。  
必要に応じて環境変数 `NODE_VERSION` に `20` などを指定できます。

## ローカルでの本番確認

```bash
npm install
npm run build
npm run preview
```

ブラウザで `http://localhost:4173/` を開き、以下を確認してください。

- 画面が表示される
- 画像の読み込み・変換（JPG / PNG / WebP）
- ZIP / 個別ダウンロード
- 変換時間診断で `process mode: worker`
- ブラウザコンソールにエラーがない

## SPA リダイレクト

本アプリは React Router を使用していないため、`public/_redirects` は **不要** です。

## 公開後に差し替えるファイル

独自ドメイン決定後、以下を更新してください。

| ファイル | 更新内容 |
|---------|---------|
| `public/sitemap.xml` | `<loc>` の URL を本番ドメインに変更 |
| `index.html` | `og:url` を本番 URL に変更 |

## 参考：package.json scripts

```json
{
  "build": "tsc -b && vite build",
  "preview": "vite preview"
}
```

`npm run build` は TypeScript の型チェックの後に Vite 本番ビルドを実行し、出力先は `dist/` です。
