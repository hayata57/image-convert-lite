import { useState } from 'react';
import type { ConversionResultRecord } from '../types';
import {
  formatCompletedAt,
  getOutputFormatLabel,
} from '../utils/conversionResult';

interface ConversionProgressState {
  current: number;
  total: number;
}

interface ActionBarProps {
  imageCount: number;
  convertedCount: number;
  isConverting: boolean;
  isStopped: boolean;
  conversionProgress: ConversionProgressState | null;
  lastConversionResult: ConversionResultRecord | null;
  previousConversionResult: ConversionResultRecord | null;
  canConvert: boolean;
  canResume: boolean;
  showReconvertHint: boolean;
  onConvert: () => void;
  onStop: () => void;
  onResume: () => void;
  onDownloadZip: () => void;
  onClearAll: () => void;
}

type StatusMode = 'idle' | 'converting' | 'stopped' | 'completed';

function getStatusMode(
  isConverting: boolean,
  isStopped: boolean,
  lastConversionResult: ConversionResultRecord | null,
  canConvert: boolean,
  canResume: boolean,
): StatusMode {
  if (isConverting) {
    return 'converting';
  }
  if (isStopped) {
    return 'stopped';
  }
  if (lastConversionResult && !canConvert && !canResume) {
    return 'completed';
  }
  return 'idle';
}

function ActionBarStatus({
  mode,
  imageCount,
  convertedCount,
  conversionProgress,
  lastConversionResult,
}: {
  mode: StatusMode;
  imageCount: number;
  convertedCount: number;
  conversionProgress: ConversionProgressState | null;
  lastConversionResult: ConversionResultRecord | null;
}) {
  if (mode === 'converting' && conversionProgress) {
    const { current, total } = conversionProgress;
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

    return (
      <div className="action-bar-status action-bar-status--converting" aria-live="polite">
        <p className="action-bar-status__progress-text">
          {current} / {total}
          <span className="action-bar-status__percentage">{percentage}%</span>
        </p>
        <div
          className="action-bar-status__bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={current}
          aria-label={`${current}枚目を変換中`}
        >
          <div
            className="action-bar-status__bar-fill"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }

  if (mode === 'stopped') {
    return (
      <div className="action-bar-status action-bar-status--stopped" aria-live="polite">
        <span className="action-bar-status__stopped-label">停止しました</span>
        <span>変換済み: {convertedCount} / {imageCount} 枚</span>
      </div>
    );
  }

  if (mode === 'completed' && lastConversionResult) {
    return (
      <div className="action-bar-status action-bar-status--completed" aria-live="polite">
        <span className="action-bar-status__result action-bar-status__result--success">
          成功: {lastConversionResult.successCount}枚
        </span>
        <span className="action-bar-status__result action-bar-status__result--skip">
          スキップ: {lastConversionResult.skipCount}枚
        </span>
        <span className="action-bar-status__result action-bar-status__result--error">
          エラー: {lastConversionResult.errorCount}枚
        </span>
      </div>
    );
  }

  return (
    <div className="action-bar-status action-bar-status--idle">
      <span>画像数: {imageCount}</span>
      <span>変換済み: {convertedCount}</span>
    </div>
  );
}

function PreviousConversionDetails({ result }: { result: ConversionResultRecord }) {
  return (
    <div className="action-bar__history-body">
      <p><strong>日時:</strong> {formatCompletedAt(result.completedAt)}</p>
      <p><strong>成功:</strong> {result.successCount}枚</p>
      <p><strong>スキップ:</strong> {result.skipCount}枚</p>
      <p><strong>エラー:</strong> {result.errorCount}枚</p>
      <p>
        <strong>変換設定:</strong>{' '}
        {getOutputFormatLabel(result.settings.outputFormat)}
        {' / '}
        画質 {result.settings.quality}
        {' / '}
        横幅 {result.settings.targetWidth ? `${result.settings.targetWidth}px` : '元サイズ'}
      </p>
    </div>
  );
}

export function ActionBar({
  imageCount,
  convertedCount,
  isConverting,
  isStopped,
  conversionProgress,
  lastConversionResult,
  previousConversionResult,
  canConvert,
  canResume,
  showReconvertHint,
  onConvert,
  onStop,
  onResume,
  onDownloadZip,
  onClearAll,
}: ActionBarProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const canDownloadZip = convertedCount > 0 && !isConverting;
  const statusMode = getStatusMode(
    isConverting,
    isStopped,
    lastConversionResult,
    canConvert,
    canResume,
  );

  const primaryLabel = isConverting
    ? '停止'
    : canResume
      ? '再開'
      : '一括変換';

  const primaryAction = isConverting
    ? onStop
    : canResume
      ? onResume
      : onConvert;

  const primaryDisabled = isConverting
    ? false
    : canResume
      ? false
      : !canConvert;

  const primaryClassName = isConverting
    ? 'button button--danger'
    : 'button button--primary';

  return (
    <section className="action-bar" aria-label="操作ボタン">
      <div className="action-bar__main">
        <ActionBarStatus
          mode={statusMode}
          imageCount={imageCount}
          convertedCount={convertedCount}
          conversionProgress={conversionProgress}
          lastConversionResult={lastConversionResult}
        />

        <div className="action-bar__controls">
          <div className="action-bar__buttons">
            <button
              type="button"
              className={primaryClassName}
              onClick={primaryAction}
              disabled={primaryDisabled}
            >
              {primaryLabel}
            </button>

            <button
              type="button"
              className={`button button--secondary${canDownloadZip ? ' button--zip-ready' : ''}`}
              onClick={onDownloadZip}
              disabled={!canDownloadZip}
            >
              ZIP でまとめてダウンロード
            </button>

            <button
              type="button"
              className="button button--ghost"
              onClick={onClearAll}
              disabled={imageCount === 0 || isConverting}
            >
              すべてクリア
            </button>
          </div>

          {showReconvertHint && (
            <p className="action-bar__hint">
              設定または画像を変更すると再変換できます。
            </p>
          )}
        </div>
      </div>

      {previousConversionResult && (
        <details
          className="action-bar__history"
          open={historyOpen}
          onToggle={(event) => {
            setHistoryOpen(event.currentTarget.open);
          }}
        >
          <summary className="action-bar__history-summary">
            {historyOpen ? '▼' : '▶'} 前回の変換結果
          </summary>
          <PreviousConversionDetails result={previousConversionResult} />
        </details>
      )}
    </section>
  );
}
