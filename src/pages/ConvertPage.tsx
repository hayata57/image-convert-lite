import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ActionBar } from '../components/ActionBar';
import { DropZone } from '../components/DropZone';
import { ImageList } from '../components/ImageList';
import { ConversionTimingPanel } from '../components/ConversionTimingPanel';
import { EncodingSlowWarning } from '../components/EncodingSlowWarning';
import { ResourceDiagnosticsPanel } from '../components/ResourceDiagnosticsPanel';
import { SakutioHeader } from '../components/SakutioHeader';
import { SettingsPanel } from '../components/SettingsPanel';
import { MAX_FILES } from '../constants';
import type {
  ConversionResultRecord,
  ConversionSettings,
  ImageItem,
  SessionSkipState,
} from '../types';
import {
  canPerformBatchConversion,
  canResumeConversion,
  shouldShowReconvertHint,
} from '../utils/conversionState';
import { runConversionLoop } from '../utils/conversionLoop';
import { evaluateEncodingSlowdown, formatSlowdownWarningReason } from '../utils/encodingSlowDetection';
import {
  buildConversionTimingReport,
  identifyDominantSlowPhase,
  type ConversionTimingReport,
} from '../utils/conversionTiming';
import {
  appendSessionSkips,
  buildConversionResultRecord,
  buildNonImageSkipReasons,
  collectErrorReasons,
} from '../utils/conversionResult';
import { downloadImagesAsZip, downloadSingleImage } from '../utils/downloadHelpers';
import { isDeveloperModeEnabled } from '../utils/developerMode';
import type { SelectedImageFile } from '../utils/folderLoader';
import {
  prepareItemsForReconversion,
  releaseAllItemResources,
  releaseItemResources,
} from '../utils/imageResourceCleanup';
import { createImageItemFromFile } from '../utils/imageLoader';
import {
  applyLoadLimits,
  buildLoadLimitSkipMessages,
} from '../utils/loadLimits';

const DEFAULT_SETTINGS: ConversionSettings = {
  outputFormat: 'jpeg',
  quality: 85,
  targetWidth: null,
  zipAsciiFileNames: false,
};

const EMPTY_SESSION_SKIPS: SessionSkipState = { count: 0, reasons: [] };

interface ConversionProgressState {
  current: number;
  total: number;
}

function buildLoadMessage(
  loadedCount: number,
  nonImageSkippedCount: number,
  sourceLabel: 'file' | 'folder' | 'drop',
): string {
  const sourceText = sourceLabel === 'folder'
    ? 'フォルダから'
    : sourceLabel === 'drop'
      ? 'ドロップした内容から'
      : '';

  if (loadedCount === 0) {
    if (nonImageSkippedCount > 0) {
      return `画像ファイルが見つかりませんでした（${nonImageSkippedCount} 件の非画像ファイルをスキップしました）。`;
    }
    return '読み込める画像ファイルがありませんでした。';
  }

  const loadedText = sourceText
    ? `${sourceText} ${loadedCount} 枚の画像を読み込みました。`
    : `${loadedCount} 枚の画像を読み込みました。`;

  if (nonImageSkippedCount > 0) {
    return `${loadedText}（${nonImageSkippedCount} 件の非画像ファイルをスキップしました）`;
  }

  return loadedText;
}

const REPLACE_LOAD_CONFIRM_MESSAGE =
  '新しい画像を読み込むと、前回の変換結果は削除されます。続行しますか？';

function buildReplacedLoadMessage(loadedCount: number, nonImageSkippedCount: number): string {
  const base = `前回の変換結果をクリアして、新しい画像を ${loadedCount} 枚読み込みました。`;
  if (nonImageSkippedCount > 0) {
    return `${base}（${nonImageSkippedCount} 件の非画像ファイルをスキップしました）`;
  }
  return base;
}

export function ConvertPage() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [settings, setSettings] = useState<ConversionSettings>(DEFAULT_SETTINGS);
  const [lastConvertedSettings, setLastConvertedSettings] = useState<ConversionSettings | null>(null);
  const [lastConvertedItemIds, setLastConvertedItemIds] = useState<Set<string>>(new Set());
  const [isConverting, setIsConverting] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [conversionProgress, setConversionProgress] = useState<ConversionProgressState | null>(null);
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [skipWarnings, setSkipWarnings] = useState<string[]>([]);
  const [sessionSkips, setSessionSkips] = useState<SessionSkipState>(EMPTY_SESSION_SKIPS);
  const [conversionHistory, setConversionHistory] = useState<ConversionResultRecord[]>([]);
  const [timingReports, setTimingReports] = useState<ConversionTimingReport[]>([]);
  const [currentTimingCount, setCurrentTimingCount] = useState(0);
  const [showEncodingSlowWarning, setShowEncodingSlowWarning] = useState(false);
  const [isDeveloperMode] = useState(() => isDeveloperModeEnabled());

  const stopRequestedRef = useRef(false);
  const recentToBlobMsRef = useRef<number[]>([]);
  const encodingSlowWarningShownRef = useRef(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const lastConversionResult = conversionHistory.length > 0
    ? conversionHistory[conversionHistory.length - 1]
    : null;

  const previousConversionResult = conversionHistory.length >= 2
    ? conversionHistory[conversionHistory.length - 2]
    : null;

  const convertedCount = useMemo(
    () => items.filter((item) => item.status === 'done').length,
    [items],
  );

  const canConvert = useMemo(
    () => canPerformBatchConversion({
      items,
      settings,
      lastConvertedSettings,
      lastConvertedItemIds,
      isConverting,
      isStopped,
    }),
    [items, settings, lastConvertedSettings, lastConvertedItemIds, isConverting, isStopped],
  );

  const canResume = useMemo(
    () => canResumeConversion({
      items,
      settings,
      lastConvertedSettings,
      isStopped,
      isConverting,
    }),
    [items, settings, lastConvertedSettings, isStopped, isConverting],
  );

  const showReconvertHint = useMemo(
    () => shouldShowReconvertHint({
      items,
      canConvert,
      canResume,
      isConverting,
      isStopped,
    }),
    [items, canConvert, canResume, isConverting, isStopped],
  );

  const resetConversionControlState = () => {
    stopRequestedRef.current = false;
    setIsStopped(false);
    setConversionProgress(null);
    setIsConverting(false);
  };

  const resetLoadedSession = () => {
    releaseAllItemResources(itemsRef.current);
    setItems([]);
    setLastConvertedSettings(null);
    setLastConvertedItemIds(new Set());
    setConversionHistory([]);
    setSessionSkips(EMPTY_SESSION_SKIPS);
    setSkipWarnings([]);
    resetConversionControlState();
  };

  const recordLoadSkips = (
    nonImageSkippedCount: number,
    limitResult: ReturnType<typeof applyLoadLimits>,
  ) => {
    const limitSkipMessages = buildLoadLimitSkipMessages(limitResult);
    const nonImageSkipReasons = buildNonImageSkipReasons(nonImageSkippedCount);
    const addedCount = nonImageSkippedCount
      + limitResult.skippedTooLarge.length
      + limitResult.skippedMaxFiles;
    const addedReasons = [...limitSkipMessages, ...nonImageSkipReasons];

    setSessionSkips((current) => appendSessionSkips(current, addedCount, addedReasons));

    const immediateWarnings = [...limitSkipMessages, ...nonImageSkipReasons];
    if (immediateWarnings.length > 0) {
      setSkipWarnings((current) => [...current, ...immediateWarnings]);
    }
  };

  const finalizeConversionRun = (
    updatedItems: ImageItem[],
    stopped: boolean,
  ) => {
    const totalSuccessCount = updatedItems.filter((item) => item.status === 'done').length;
    const totalErrorCount = updatedItems.filter((item) => item.status === 'error').length;

    setItems(updatedItems);
    setLastConvertedSettings({ ...settings });
    setLastConvertedItemIds(new Set(updatedItems.map((item) => item.id)));

    if (stopped) {
      setIsStopped(true);
      setConversionProgress(null);
      setGlobalMessage(`変換を停止しました。（${totalSuccessCount} 枚変換済み）`);
      return;
    }

    const resultRecord = buildConversionResultRecord({
      successCount: totalSuccessCount,
      errorCount: totalErrorCount,
      sessionSkips,
      errorReasons: collectErrorReasons(updatedItems),
      settings: { ...settings },
    });

    setConversionHistory((current) => [...current, resultRecord]);
    setSessionSkips(EMPTY_SESSION_SKIPS);
    setGlobalMessage(null);
    setIsStopped(false);
    setConversionProgress(null);
  };

  const executeConversion = async (resumeMode: boolean) => {
    if (resumeMode) {
      if (!canResume) {
        return;
      }
    } else if (!canConvert || isConverting) {
      return;
    }

    stopRequestedRef.current = false;
    setIsConverting(true);
    setIsStopped(false);
    setGlobalError(null);
    setSkipWarnings([]);
    setConversionProgress({ current: 0, total: itemsRef.current.length });
    setCurrentTimingCount(0);
    setShowEncodingSlowWarning(false);
    recentToBlobMsRef.current = [];
    encodingSlowWarningShownRef.current = false;

    const conversionStartedAt = new Date().toISOString();
    const conversionStartMs = performance.now();

    const itemsForConversion = resumeMode
      ? itemsRef.current
      : prepareItemsForReconversion(itemsRef.current);

    if (!resumeMode) {
      setItems(itemsForConversion);
    }

    const loopResult = await runConversionLoop(
      itemsForConversion,
      settings,
      resumeMode,
      {
        onProgress: (current, total) => {
          setConversionProgress({ current, total });
        },
        onItemsFlush: (flushedItems) => {
          setItems(flushedItems);
        },
        onImageTiming: (timing) => {
          setCurrentTimingCount((current) => current + 1);
          recentToBlobMsRef.current.push(timing.encodeMs);

          if (encodingSlowWarningShownRef.current) {
            return;
          }

          const evaluation = evaluateEncodingSlowdown(recentToBlobMsRef.current);
          if (evaluation.shouldWarn) {
            encodingSlowWarningShownRef.current = true;
            setShowEncodingSlowWarning(true);
          }
        },
        shouldStop: () => stopRequestedRef.current,
      },
    );

    const finalSlowdown = evaluateEncodingSlowdown(
      loopResult.timingRecords.map((record) => record.encodeMs),
    );

    const timingReport = buildConversionTimingReport({
      startedAt: conversionStartedAt,
      completedAt: new Date().toISOString(),
      totalMs: performance.now() - conversionStartMs,
      imageCount: itemsForConversion.length,
      successCount: loopResult.runSuccessCount,
      errorCount: loopResult.runErrorCount,
      records: loopResult.timingRecords,
      encodingSlowdown: {
        baselineToBlobMs: finalSlowdown.baselineToBlobMs,
        currentToBlobMs: finalSlowdown.currentToBlobMs,
        slowdownRatio: finalSlowdown.slowdownRatio,
        averageToBlobMs: finalSlowdown.averageToBlobMs,
        slowToBlobCount: finalSlowdown.slowToBlobCount,
        encodingSlowWarningShown: encodingSlowWarningShownRef.current
          || finalSlowdown.shouldWarn,
        warningReasons: finalSlowdown.warningReasons,
      },
    });

    setTimingReports((current) => [...current.slice(-4), timingReport]);
    setCurrentTimingCount(0);

    console.info(
      [
        `[conversion timing] total=${Math.round(timingReport.totalMs)}ms`,
        `process mode=${timingReport.processMode.label}`,
        `decode mode=${timingReport.decodeMode.label}`,
        `encode mode=${timingReport.encodeMode.label}`,
        `avg decode=${timingReport.summary.avgDecodeMs}ms`,
        `avg draw=${timingReport.summary.avgDrawMs}ms`,
        `avg encode=${timingReport.summary.avgToBlobMs}ms`,
        `max encode=${timingReport.summary.maxToBlobMs}ms`,
        `avg worker roundtrip=${timingReport.summary.avgWorkerRoundtripMs}ms`,
        `encode slow count=${timingReport.summary.slowToBlobCount}`,
        `slowdown warning=${timingReport.encodingSlowdown.encodingSlowWarningShown ? 'yes' : 'no'}`,
        `warning reason=${formatSlowdownWarningReason(timingReport.encodingSlowdown.warningReasons)}`,
        identifyDominantSlowPhase(timingReport.summary),
      ].join(' | '),
    );
    if (timingReport.slowWarnings.length > 0) {
      console.info(`[conversion timing] slow warnings: ${timingReport.slowWarnings.length}`);
    }

    finalizeConversionRun(loopResult.items, loopResult.stopped);

    setIsConverting(false);
  };

  const handleFilesSelected = async (result: {
    imageFiles: SelectedImageFile[];
    skippedCount: number;
    sourceLabel: 'file' | 'folder' | 'drop';
  }) => {
    if (isConverting) {
      return;
    }

    const { imageFiles, skippedCount, sourceLabel } = result;

    if (imageFiles.length === 0) {
      setGlobalError(null);
      setGlobalMessage(null);
      if (skippedCount > 0) {
        recordLoadSkips(skippedCount, {
          accepted: [],
          skippedTooLarge: [],
          skippedMaxFiles: 0,
        });
      }
      setGlobalMessage(buildLoadMessage(0, skippedCount, sourceLabel));
      return;
    }

    const shouldReplaceExisting = lastConversionResult !== null || isStopped;

    if (shouldReplaceExisting) {
      const confirmed = window.confirm(REPLACE_LOAD_CONFIRM_MESSAGE);
      if (!confirmed) {
        return;
      }
      resetLoadedSession();
    }

    setGlobalError(null);
    setGlobalMessage(null);

    const currentItemCount = shouldReplaceExisting ? 0 : items.length;
    const limitResult = applyLoadLimits(imageFiles, currentItemCount);
    recordLoadSkips(skippedCount, limitResult);

    if (limitResult.accepted.length === 0) {
      setGlobalMessage(
        shouldReplaceExisting
          ? buildReplacedLoadMessage(0, skippedCount)
          : buildLoadMessage(0, skippedCount, sourceLabel),
      );
      return;
    }

    const newItems: ImageItem[] = [];
    const errors: string[] = [];

    for (const { file, relativePath } of limitResult.accepted) {
      try {
        const item = await createImageItemFromFile(file, relativePath);
        newItems.push(item);
      } catch (error) {
        const message = error instanceof Error ? error.message : '画像の追加に失敗しました。';
        errors.push(message);
      }
    }

    if (newItems.length > 0) {
      if (shouldReplaceExisting) {
        setItems(newItems);
      } else {
        setItems((current) => [...current, ...newItems]);
      }
    }

    if (shouldReplaceExisting) {
      setGlobalMessage(buildReplacedLoadMessage(newItems.length, skippedCount));
    } else {
      setGlobalMessage(buildLoadMessage(newItems.length, skippedCount, sourceLabel));
    }

    if (errors.length > 0) {
      setGlobalError(errors.join('\n'));
    }
  };

  const handleConvert = () => {
    void executeConversion(false);
  };

  const handleResume = () => {
    void executeConversion(true);
  };

  const handleStop = useCallback(() => {
    stopRequestedRef.current = true;
  }, []);

  const handleDownload = useCallback((id: string) => {
    if (isConverting) {
      return;
    }

    const item = itemsRef.current.find((current) => current.id === id);
    if (!item) {
      return;
    }

    try {
      const doneItems = itemsRef.current.filter((current) => current.status === 'done');
      const fallbackIndex = doneItems.findIndex((current) => current.id === id) + 1;
      downloadSingleImage(item, fallbackIndex > 0 ? fallbackIndex : 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ダウンロードに失敗しました。';
      setGlobalError(message);
    }
  }, [isConverting]);

  const handleDownloadZip = useCallback(async () => {
    if (isConverting) {
      return;
    }

    setGlobalError(null);

    try {
      await downloadImagesAsZip(itemsRef.current, settings.zipAsciiFileNames);
      setGlobalMessage('ZIP ファイルのダウンロードを開始しました。');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ZIP の作成に失敗しました。';
      setGlobalError(message);
    }
  }, [isConverting, settings.zipAsciiFileNames]);

  const handleRemove = useCallback((id: string) => {
    if (isConverting) {
      return;
    }

    setItems((current) => {
      const target = current.find((item) => item.id === id);
      if (target) {
        releaseItemResources(target);
      }
      return current.filter((item) => item.id !== id);
    });
    setLastConvertedItemIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    if (isStopped) {
      setIsStopped(false);
    }
  }, [isConverting, isStopped]);

  const handleClearAll = useCallback(() => {
    if (isConverting) {
      return;
    }

    resetLoadedSession();
    setGlobalMessage(null);
    setGlobalError(null);
  }, [isConverting]);

  const handleSettingsChange = useCallback((nextSettings: ConversionSettings) => {
    setSettings(nextSettings);
    if (isStopped && lastConvertedSettings && (
      nextSettings.outputFormat !== lastConvertedSettings.outputFormat
      || nextSettings.quality !== lastConvertedSettings.quality
      || nextSettings.targetWidth !== lastConvertedSettings.targetWidth
    )) {
      setIsStopped(false);
    }
  }, [isStopped, lastConvertedSettings]);

  useEffect(() => {
    return () => {
      releaseAllItemResources(itemsRef.current);
    };
  }, []);

  return (
    <div className="app">
      <SakutioHeader />
      <header className="app-header">
        <div className="app-header__content">
          <h1 className="app-title">Image Convert Lite</h1>
          <p className="app-description">
            JPG・PNG・WebPなどの画像を、ブラウザ内でまとめて変換できます。
          </p>
          <p className="app-privacy-notice" role="note">
            画像はサーバーへアップロードされません。すべての変換処理はお使いのブラウザ内で実行されます。
          </p>
        </div>
      </header>

      <main className="app-main">
        <aside className="guide-cta" aria-label="使い方ガイドへの案内">
          <div className="guide-cta__text">
            <p className="guide-cta__title">初めて使う方へ</p>
            <p className="guide-cta__description">
              対応形式、設定方法、よくある質問をガイドにまとめています。
            </p>
          </div>
          <Link to="/guide" className="guide-cta__link">
            使い方・よくある質問を見る
            <span className="guide-cta__arrow" aria-hidden="true">→</span>
          </Link>
        </aside>

        {globalMessage && (
          <div className="message message--info" role="status">
            {globalMessage}
          </div>
        )}

        {skipWarnings.length > 0 && (
          <div className="message message--warning" role="status">
            {skipWarnings.map((line, index) => (
              <p key={`${line}-${index}`}>{line}</p>
            ))}
          </div>
        )}

        {globalError && (
          <div className="message message--error" role="alert">
            {globalError.split('\n').map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        )}

        <EncodingSlowWarning visible={showEncodingSlowWarning} />

        <DropZone onFilesSelected={handleFilesSelected} disabled={isConverting} />

        <SettingsPanel
          settings={settings}
          onChange={handleSettingsChange}
          disabled={isConverting}
        />

        <ActionBar
          imageCount={items.length}
          convertedCount={convertedCount}
          isConverting={isConverting}
          isStopped={isStopped}
          conversionProgress={conversionProgress}
          lastConversionResult={lastConversionResult}
          previousConversionResult={previousConversionResult}
          canConvert={canConvert}
          canResume={canResume}
          showReconvertHint={showReconvertHint}
          onConvert={handleConvert}
          onStop={handleStop}
          onResume={handleResume}
          onDownloadZip={handleDownloadZip}
          onClearAll={handleClearAll}
        />

        <ImageList
          items={items}
          onRemove={handleRemove}
          onDownload={handleDownload}
          disabled={isConverting}
        />
      </main>

      <footer className="app-footer">
        <p>
          すべての処理はお使いのブラウザ内で行われます。画像は外部に送信されません。
          （1回あたり最大 {MAX_FILES} 枚・1ファイル最大 25MB）
        </p>
        {isDeveloperMode && (
          <ConversionTimingPanel
            reports={timingReports}
            isConverting={isConverting}
            currentTimingCount={currentTimingCount}
          />
        )}
        {isDeveloperMode && (
          <ResourceDiagnosticsPanel items={items} />
        )}
      </footer>
    </div>
  );
}
