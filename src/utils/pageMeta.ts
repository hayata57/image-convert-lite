export interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  ogTitle?: string;
  ogDescription?: string;
}

const SITE_ORIGIN = 'https://image.sakutio.com';

export const CONVERT_PAGE_META: PageMeta = {
  title: 'Image Convert Lite - 無料画像変換ツール',
  description:
    'Image Convert Liteは、JPG、PNG、WebP、BMP、AVIF、ICOなどをブラウザ内で変換できる無料画像変換ツールです。画像はサーバーへ送信されません。',
  canonical: `${SITE_ORIGIN}/`,
};

export const GUIDE_PAGE_META: PageMeta = {
  title: 'Image Convert Liteの使い方・よくある質問 | Sakutio',
  description:
    'Image Convert Liteの画像変換方法、対応形式、画質・横幅設定、ZIP保存、変換できない場合の対処方法、よくある質問を紹介します。',
  canonical: `${SITE_ORIGIN}/guide`,
};

function upsertMetaByName(name: string, content: string): void {
  let element = document.querySelector(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('name', name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertMetaByProperty(property: string, content: string): void {
  let element = document.querySelector(`meta[property="${property}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('property', property);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertCanonical(href: string): void {
  let element = document.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

/** ページ遷移時に title / description / canonical / OG・Twitter を更新する。 */
export function applyPageMeta(meta: PageMeta): void {
  const ogTitle = meta.ogTitle ?? meta.title;
  const ogDescription = meta.ogDescription ?? meta.description;

  document.title = meta.title;
  upsertMetaByName('description', meta.description);
  upsertCanonical(meta.canonical);

  upsertMetaByProperty('og:type', 'website');
  upsertMetaByProperty('og:title', ogTitle);
  upsertMetaByProperty('og:description', ogDescription);
  upsertMetaByProperty('og:url', meta.canonical);
  upsertMetaByProperty('og:locale', 'ja_JP');

  upsertMetaByName('twitter:card', 'summary');
  upsertMetaByName('twitter:title', ogTitle);
  upsertMetaByName('twitter:description', ogDescription);
}
