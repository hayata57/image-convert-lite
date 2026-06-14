import type { ImageItem } from '../types';
import {
  formatDimensions,
  formatFileSize,
  getFormatLabel,
} from '../utils/formatHelpers';

interface ImageListProps {
  items: ImageItem[];
  onRemove: (id: string) => void;
  onDownload: (id: string) => void;
  disabled?: boolean;
}

function getStatusLabel(status: ImageItem['status']): string {
  switch (status) {
    case 'pending':
      return '待機中';
    case 'converting':
      return '変換中';
    case 'done':
      return '完了';
    case 'error':
      return 'エラー';
    default:
      return status;
  }
}

export function ImageList({
  items,
  onRemove,
  onDownload,
  disabled = false,
}: ImageListProps) {
  if (items.length === 0) {
    return (
      <section className="image-list image-list--empty" aria-label="画像一覧">
        <p>まだ画像が追加されていません。上のエリアから画像を追加してください。</p>
      </section>
    );
  }

  return (
    <section className="image-list" aria-label="画像一覧">
      <h2 className="section-title">画像一覧</h2>

      <div className="table-wrapper">
        <table className="image-table">
          <thead>
            <tr>
              <th scope="col">プレビュー</th>
              <th scope="col">変換前</th>
              <th scope="col">変換後</th>
              <th scope="col">状態</th>
              <th scope="col">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className={item.status === 'error' ? 'image-table__row--error' : ''}>
                <td>
                  <img
                    src={item.previewUrl}
                    alt={`${item.originalName} のプレビュー`}
                    className="image-table__preview"
                  />
                </td>
                <td>
                  <div className="image-table__info">
                    <p><strong>ファイル名:</strong> {item.displayName ?? item.originalName}</p>
                    <p><strong>形式:</strong> {getFormatLabel(item.originalFormat)}</p>
                    <p><strong>サイズ:</strong> {formatFileSize(item.originalSize)}</p>
                    <p><strong>解像度:</strong> {formatDimensions(item.originalWidth, item.originalHeight)}</p>
                  </div>
                </td>
                <td>
                  {item.status === 'done' && item.outputFileName ? (
                    <div className="image-table__info">
                      <p><strong>ファイル名:</strong> {item.outputFileName}</p>
                      {item.outputZipPath && item.outputZipPath !== item.outputFileName && (
                        <p><strong>ZIP内パス:</strong> {item.outputZipPath}</p>
                      )}
                      <p><strong>形式:</strong> {getFormatLabel(item.convertedFormat ?? '')}</p>
                      <p><strong>サイズ:</strong> {formatFileSize(item.convertedSize ?? 0)}</p>
                      <p>
                        <strong>解像度:</strong>{' '}
                        {formatDimensions(item.convertedWidth ?? 0, item.convertedHeight ?? 0)}
                      </p>
                    </div>
                  ) : item.status === 'error' ? (
                    <p className="image-table__error">{item.errorMessage}</p>
                  ) : (
                    <p className="image-table__pending">変換後に表示されます</p>
                  )}
                </td>
                <td>
                  <span className={`status-badge status-badge--${item.status}`}>
                    {getStatusLabel(item.status)}
                  </span>
                </td>
                <td>
                  <div className="image-table__actions">
                    <button
                      type="button"
                      className="button button--secondary button--small"
                      onClick={() => onDownload(item.id)}
                      disabled={disabled || item.status !== 'done'}
                    >
                      ダウンロード
                    </button>
                    <button
                      type="button"
                      className="button button--ghost button--small"
                      onClick={() => onRemove(item.id)}
                      disabled={disabled}
                    >
                      削除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
