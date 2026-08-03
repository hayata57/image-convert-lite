/**
 * URL クエリ `?dev=1` が付与されている場合のみ true。
 * 診断表示など、開発・性能確認用 UI の表示可否の判定に使用する。
 * 計測処理自体の有効/無効の判定には使用しない。
 */
export function isDeveloperModeEnabled(search: string = window.location.search): boolean {
  return new URLSearchParams(search).get('dev') === '1';
}
