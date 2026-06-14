import { useState } from 'react';
import type { ConversionTimingReport } from '../utils/conversionTiming';
import { formatSlowdownWarningReason } from '../utils/encodingSlowDetection';
import {
  formatSeconds,
  formatTimingReportForCopy,
  identifyDominantSlowPhase,
} from '../utils/conversionTiming';

interface ConversionTimingPanelProps {
  reports: ConversionTimingReport[];
  isConverting: boolean;
  currentTimingCount: number;
}

function formatReportLabel(report: ConversionTimingReport, index: number): string {
  const time = new Date(report.completedAt).toLocaleString('ja-JP');
  return `#${index + 1} ${time} (${formatSeconds(report.totalMs)} / ${report.successCount}枚)`;
}

export function ConversionTimingPanel({
  reports,
  isConverting,
  currentTimingCount,
}: ConversionTimingPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const selectedReport = reports.find((report) => report.id === selectedId)
    ?? reports[reports.length - 1]
    ?? null;

  const handleCopy = async () => {
    if (!selectedReport) {
      return;
    }

    const text = formatTimingReportForCopy(selectedReport);
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage('診断結果をコピーしました。');
    } catch {
      setCopyMessage('コピーに失敗しました。');
    }

    window.setTimeout(() => {
      setCopyMessage(null);
    }, 2000);
  };

  return (
    <details className="conversion-timing" open={isConverting || reports.length > 0}>
      <summary className="conversion-timing__summary">
        変換時間診断（開発用）
        {isConverting && (
          <span className="conversion-timing__badge">計測中… {currentTimingCount} 枚</span>
        )}
      </summary>

      {isConverting && (
        <p className="conversion-timing__live">
          変換中に decode / draw / toBlob を計測しています。2000ms 以上はコンソールに警告します。
        </p>
      )}

      {!isConverting && reports.length === 0 && (
        <p className="conversion-timing__empty">変換完了後に診断結果が表示されます。</p>
      )}

      {selectedReport && (
        <div className="conversion-timing__body">
          {reports.length > 1 && (
            <div className="conversion-timing__selector">
              <label htmlFor="timing-report-select" className="conversion-timing__selector-label">
                比較対象
              </label>
              <select
                id="timing-report-select"
                className="conversion-timing__selector-control"
                value={selectedReport.id}
                onChange={(event) => {
                  setSelectedId(event.target.value);
                }}
              >
                {reports.map((report, index) => (
                  <option key={report.id} value={report.id}>
                    {formatReportLabel(report, index)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <dl className="conversion-timing__stats">
            <div className="conversion-timing__row">
              <dt>総変換時間</dt>
              <dd>{formatSeconds(selectedReport.totalMs)}</dd>
            </div>
            <div className="conversion-timing__row">
              <dt>成功 / エラー</dt>
              <dd>{selectedReport.successCount} / {selectedReport.errorCount}</dd>
            </div>
            <div className="conversion-timing__row">
              <dt>process mode</dt>
              <dd>{selectedReport.processMode.label}</dd>
            </div>
            <div className="conversion-timing__row">
              <dt>decode mode</dt>
              <dd>{selectedReport.decodeMode.label}</dd>
            </div>
            <div className="conversion-timing__row">
              <dt>encode mode</dt>
              <dd>{selectedReport.encodeMode.label}</dd>
            </div>
            <div className="conversion-timing__row">
              <dt>平均 decode</dt>
              <dd>{selectedReport.summary.avgDecodeMs}ms</dd>
            </div>
            <div className="conversion-timing__row">
              <dt>平均 draw</dt>
              <dd>{selectedReport.summary.avgDrawMs}ms</dd>
            </div>
            <div className="conversion-timing__row">
              <dt>平均 toBlob (encode)</dt>
              <dd>{selectedReport.summary.avgToBlobMs}ms</dd>
            </div>
            <div className="conversion-timing__row">
              <dt>平均 worker roundtrip</dt>
              <dd>{selectedReport.summary.avgWorkerRoundtripMs}ms</dd>
            </div>
            <div className="conversion-timing__row">
              <dt>最大 toBlob (encode)</dt>
              <dd>
                {selectedReport.summary.maxToBlobMs}ms
                {' '}
                ({selectedReport.summary.maxToBlobFileName ?? '-'})
              </dd>
            </div>
            <div className="conversion-timing__row">
              <dt>最大 decode</dt>
              <dd>
                {selectedReport.summary.maxDecodeMs}ms
                {' '}
                ({selectedReport.summary.maxDecodeFileName ?? '-'})
              </dd>
            </div>
            <div className="conversion-timing__row">
              <dt>最大 draw</dt>
              <dd>
                {selectedReport.summary.maxDrawMs}ms
                {' '}
                ({selectedReport.summary.maxDrawFileName ?? '-'})
              </dd>
            </div>
            <div className="conversion-timing__row">
              <dt>遅延警告 (≥2000ms)</dt>
              <dd>
                decode {selectedReport.summary.slowDecodeCount}
                {' / '}
                draw {selectedReport.summary.slowDrawCount}
                {' / '}
                toBlob {selectedReport.summary.slowToBlobCount}
              </dd>
            </div>
            <div className="conversion-timing__row">
              <dt>encode slow count</dt>
              <dd>{selectedReport.summary.slowToBlobCount}</dd>
            </div>
            <div className="conversion-timing__row">
              <dt>baselineToBlobMs</dt>
              <dd>
                {selectedReport.encodingSlowdown.baselineToBlobMs ?? '-'}
                ms
              </dd>
            </div>
            <div className="conversion-timing__row">
              <dt>currentToBlobMs</dt>
              <dd>
                {selectedReport.encodingSlowdown.currentToBlobMs ?? '-'}
                ms
              </dd>
            </div>
            <div className="conversion-timing__row">
              <dt>slowdownRatio</dt>
              <dd>
                {selectedReport.encodingSlowdown.slowdownRatio ?? '-'}
                {selectedReport.encodingSlowdown.encodingSlowWarningShown && (
                  <span className="conversion-timing__warn-badge"> 警告表示</span>
                )}
              </dd>
            </div>
            <div className="conversion-timing__row">
              <dt>slowdown warning reason</dt>
              <dd>
                {formatSlowdownWarningReason(selectedReport.encodingSlowdown.warningReasons)}
              </dd>
            </div>
            <div className="conversion-timing__row">
              <dt>低速化警告</dt>
              <dd>
                {selectedReport.encodingSlowdown.encodingSlowWarningShown ? 'あり' : 'なし'}
              </dd>
            </div>
          </dl>

          <p className="conversion-timing__dominant">
            {identifyDominantSlowPhase(selectedReport.summary)}
          </p>

          {selectedReport.slowWarnings.length > 0 && (
            <div className="conversion-timing__warnings">
              <p className="conversion-timing__warnings-title">警告ログ（先頭20件）</p>
              <ul>
                {selectedReport.slowWarnings.slice(0, 20).map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="conversion-timing__actions">
            <button
              type="button"
              className="button button--secondary button--small"
              onClick={() => {
                void handleCopy();
              }}
            >
              この診断結果をコピー
            </button>
            {copyMessage && (
              <span className="conversion-timing__copy-message" role="status">{copyMessage}</span>
            )}
          </div>

          <p className="conversion-timing__hint">
            通常時・YouTube後・再読み込み後でそれぞれ変換し、コピーした結果を並べて比較してください。
          </p>
        </div>
      )}
    </details>
  );
}
