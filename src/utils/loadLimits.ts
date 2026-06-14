import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB, MAX_FILES } from '../constants';
import type { SelectedImageFile } from './folderLoader';

export interface LoadLimitResult {
  accepted: SelectedImageFile[];
  skippedTooLarge: string[];
  skippedMaxFiles: number;
}

export function applyLoadLimits(
  imageFiles: SelectedImageFile[],
  currentItemCount: number,
): LoadLimitResult {
  const accepted: SelectedImageFile[] = [];
  const skippedTooLarge: string[] = [];
  let skippedMaxFiles = 0;
  let availableSlots = MAX_FILES - currentItemCount;

  for (const entry of imageFiles) {
    if (entry.file.size > MAX_FILE_SIZE_BYTES) {
      skippedTooLarge.push(entry.relativePath);
      continue;
    }

    if (availableSlots <= 0) {
      skippedMaxFiles += 1;
      continue;
    }

    accepted.push(entry);
    availableSlots -= 1;
  }

  return {
    accepted,
    skippedTooLarge,
    skippedMaxFiles,
  };
}

export function buildLoadLimitSkipMessages(result: LoadLimitResult): string[] {
  const messages: string[] = [];

  for (const path of result.skippedTooLarge) {
    messages.push(`「${path}」: ${MAX_FILE_SIZE_MB}MBを超えるためスキップしました`);
  }

  if (result.skippedMaxFiles > 0) {
    messages.push(`最大${MAX_FILES}枚を超えたため、${result.skippedMaxFiles}枚をスキップしました`);
  }

  return messages;
}

export function getRemainingFileSlots(currentItemCount: number): number {
  return Math.max(0, MAX_FILES - currentItemCount);
}
