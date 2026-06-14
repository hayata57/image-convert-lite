import { useEffect, useState } from 'react';
import type { ImageItem } from '../types';
import {
  collectResourceDiagnostics,
  formatBytes,
  type ResourceDiagnosticsSnapshot,
} from '../utils/resourceDiagnostics';

interface ResourceDiagnosticsPanelProps {
  items: ImageItem[];
}

const EMPTY_SNAPSHOT: ResourceDiagnosticsSnapshot = {
  imageCount: 0,
  convertedBlobCount: 0,
  createdObjectUrlCount: 0,
  revokedObjectUrlCount: 0,
  activeObjectUrlCount: 0,
  usedJSHeapSize: null,
  jsHeapSizeLimit: null,
};

export function ResourceDiagnosticsPanel({ items }: ResourceDiagnosticsPanelProps) {
  const [snapshot, setSnapshot] = useState<ResourceDiagnosticsSnapshot>(EMPTY_SNAPSHOT);

  useEffect(() => {
    const update = () => {
      setSnapshot(collectResourceDiagnostics(items));
    };

    update();
    const intervalId = window.setInterval(update, 1000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [items]);

  return (
    <details className="resource-diagnostics">
      <summary className="resource-diagnostics__summary">リソース診断（開発用）</summary>
      <dl className="resource-diagnostics__list">
        <div className="resource-diagnostics__row">
          <dt>画像数</dt>
          <dd>{snapshot.imageCount}</dd>
        </div>
        <div className="resource-diagnostics__row">
          <dt>変換済み Blob 数</dt>
          <dd>{snapshot.convertedBlobCount}</dd>
        </div>
        <div className="resource-diagnostics__row">
          <dt>作成済み Object URL 数</dt>
          <dd>{snapshot.createdObjectUrlCount}</dd>
        </div>
        <div className="resource-diagnostics__row">
          <dt>revoke 済み Object URL 数</dt>
          <dd>{snapshot.revokedObjectUrlCount}</dd>
        </div>
        <div className="resource-diagnostics__row">
          <dt>有効な Object URL 数</dt>
          <dd>{snapshot.activeObjectUrlCount}</dd>
        </div>
        {snapshot.usedJSHeapSize !== null && snapshot.jsHeapSizeLimit !== null && (
          <div className="resource-diagnostics__row">
            <dt>JS ヒープ使用量</dt>
            <dd>
              {formatBytes(snapshot.usedJSHeapSize)}
              {' / '}
              {formatBytes(snapshot.jsHeapSizeLimit)}
            </dd>
          </div>
        )}
      </dl>
      <p className="resource-diagnostics__hint">
        有効な Object URL 数が画像数より多い場合、解放漏れの可能性があります。
      </p>
    </details>
  );
}
