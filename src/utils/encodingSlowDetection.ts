export const BASELINE_TOBLOB_SAMPLE_COUNT = 10;
export const CURRENT_TOBLOB_SAMPLE_COUNT = 10;
export const MIN_EFFECTIVE_BASELINE_MS = 100;
export const MIN_CURRENT_TOBLOB_MS = 1000;
export const SLOWDOWN_RATIO_THRESHOLD = 3;
export const ABSOLUTE_SLOW_ENCODE_THRESHOLD_MS = 2000;
export const ABSOLUTE_SLOW_ENCODE_COUNT = 10;

export type SlowdownWarningReason = 'relative' | 'absolute-average' | 'slow-count';

export interface EncodingSlowdownEvaluation {
  shouldWarn: boolean;
  baselineToBlobMs: number | null;
  currentToBlobMs: number | null;
  slowdownRatio: number | null;
  averageToBlobMs: number | null;
  slowToBlobCount: number;
  warningReasons: SlowdownWarningReason[];
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundRatio(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundMs(value: number): number {
  return Math.round(value * 10) / 10;
}

export function computeBaselineToBlobMs(samples: number[]): number | null {
  if (samples.length < BASELINE_TOBLOB_SAMPLE_COUNT) {
    return null;
  }

  return roundMs(average(samples.slice(0, BASELINE_TOBLOB_SAMPLE_COUNT)));
}

export function computeCurrentToBlobMs(samples: number[]): number | null {
  if (samples.length < CURRENT_TOBLOB_SAMPLE_COUNT) {
    return null;
  }

  return roundMs(average(samples.slice(-CURRENT_TOBLOB_SAMPLE_COUNT)));
}

export function evaluateEncodingSlowdown(samples: number[]): EncodingSlowdownEvaluation {
  const baselineToBlobMs = computeBaselineToBlobMs(samples);
  const currentToBlobMs = computeCurrentToBlobMs(samples);
  const averageToBlobMs = samples.length > 0
    ? roundMs(average(samples))
    : null;
  const slowToBlobCount = samples.filter(
    (sample) => sample >= ABSOLUTE_SLOW_ENCODE_THRESHOLD_MS,
  ).length;

  const warningReasons: SlowdownWarningReason[] = [];

  if (
    baselineToBlobMs !== null
    && currentToBlobMs !== null
    && samples.length > BASELINE_TOBLOB_SAMPLE_COUNT
  ) {
    const effectiveBaseline = Math.max(baselineToBlobMs, MIN_EFFECTIVE_BASELINE_MS);
    if (
      currentToBlobMs >= effectiveBaseline * SLOWDOWN_RATIO_THRESHOLD
      && currentToBlobMs >= MIN_CURRENT_TOBLOB_MS
    ) {
      warningReasons.push('relative');
    }
  }

  if (averageToBlobMs !== null && averageToBlobMs >= ABSOLUTE_SLOW_ENCODE_THRESHOLD_MS) {
    warningReasons.push('absolute-average');
  }

  if (slowToBlobCount >= ABSOLUTE_SLOW_ENCODE_COUNT) {
    warningReasons.push('slow-count');
  }

  const slowdownRatio = (
    baselineToBlobMs !== null
    && currentToBlobMs !== null
    && samples.length > BASELINE_TOBLOB_SAMPLE_COUNT
  )
    ? roundRatio(currentToBlobMs / Math.max(baselineToBlobMs, MIN_EFFECTIVE_BASELINE_MS))
    : null;

  return {
    shouldWarn: warningReasons.length > 0,
    baselineToBlobMs,
    currentToBlobMs,
    slowdownRatio,
    averageToBlobMs,
    slowToBlobCount,
    warningReasons,
  };
}

export function formatSlowdownWarningReason(
  reasons: SlowdownWarningReason[],
): string {
  if (reasons.length === 0) {
    return 'none';
  }
  return reasons.join(', ');
}
