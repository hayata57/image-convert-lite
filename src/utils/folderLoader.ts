import { isAcceptedImageFile } from './formatHelpers';

export interface SelectedImageFile {
  file: File;
  relativePath: string;
}

interface DirectoryPickerFileHandle {
  readonly kind: 'file';
  readonly name: string;
  getFile(): Promise<File>;
}

export interface DirectoryPickerDirectoryHandle {
  readonly kind: 'directory';
  readonly name: string;
  entries(): AsyncIterableIterator<
    [string, DirectoryPickerFileHandle | DirectoryPickerDirectoryHandle]
  >;
}

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: {
    mode?: 'read' | 'readwrite';
  }) => Promise<DirectoryPickerDirectoryHandle>;
};

function getDirectoryPickerWindow(): DirectoryPickerWindow | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window as DirectoryPickerWindow;
}

export function canUseShowDirectoryPicker(): boolean {
  return typeof getDirectoryPickerWindow()?.showDirectoryPicker === 'function';
}

export function openDirectoryPicker(): Promise<DirectoryPickerDirectoryHandle> {
  const picker = getDirectoryPickerWindow()?.showDirectoryPicker;
  if (typeof picker !== 'function') {
    return Promise.reject(new Error('showDirectoryPicker is not available'));
  }

  return picker.call(window, { mode: 'read' });
}

export async function extractImageFilesFromDirectoryHandle(
  directoryHandle: DirectoryPickerDirectoryHandle,
  pathPrefix: string = directoryHandle.name,
): Promise<FilterImageFilesResult> {
  const imageFiles: SelectedImageFile[] = [];
  let skippedCount = 0;

  for await (const [name, handle] of directoryHandle.entries()) {
    if (handle.kind === 'file') {
      const file = await handle.getFile();
      if (isAcceptedImageFile(file)) {
        imageFiles.push({
          file,
          relativePath: pathPrefix ? `${pathPrefix}/${file.name}` : file.name,
        });
      } else {
        skippedCount += 1;
      }
      continue;
    }

    if (handle.kind === 'directory') {
      const nestedPrefix = pathPrefix ? `${pathPrefix}/${name}` : name;
      const nested = await extractImageFilesFromDirectoryHandle(handle, nestedPrefix);
      imageFiles.push(...nested.imageFiles);
      skippedCount += nested.skippedCount;
    }
  }

  return { imageFiles, skippedCount };
}

export interface FilterImageFilesResult {
  imageFiles: SelectedImageFile[];
  skippedCount: number;
}

export function filterImageFilesFromList(
  fileList: FileList | File[],
): FilterImageFilesResult {
  const files = Array.from(fileList);
  const imageFiles: SelectedImageFile[] = [];
  let skippedCount = 0;

  for (const file of files) {
    if (isAcceptedImageFile(file)) {
      imageFiles.push({
        file,
        relativePath: file.webkitRelativePath || file.name,
      });
    } else {
      skippedCount += 1;
    }
  }

  return { imageFiles, skippedCount };
}

async function readAllDirectoryEntries(
  directoryReader: FileSystemDirectoryReader,
): Promise<FileSystemEntry[]> {
  const entries: FileSystemEntry[] = [];

  const readBatch = (): Promise<FileSystemEntry[]> => new Promise((resolve, reject) => {
    directoryReader.readEntries(resolve, reject);
  });

  let batch = await readBatch();
  while (batch.length > 0) {
    entries.push(...batch);
    batch = await readBatch();
  }

  return entries;
}

async function traverseFileTreeEntry(
  entry: FileSystemEntry,
  pathPrefix: string,
): Promise<{ imageFiles: SelectedImageFile[]; skippedCount: number }> {
  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry;
    const file = await new Promise<File | null>((resolve) => {
      fileEntry.file(
        (loadedFile) => resolve(loadedFile),
        () => resolve(null),
      );
    });

    if (!file) {
      return { imageFiles: [], skippedCount: 0 };
    }

    if (!isAcceptedImageFile(file)) {
      return { imageFiles: [], skippedCount: 1 };
    }

    const relativePath = pathPrefix ? `${pathPrefix}/${file.name}` : file.name;
    return {
      imageFiles: [{ file, relativePath }],
      skippedCount: 0,
    };
  }

  if (entry.isDirectory) {
    const directoryEntry = entry as FileSystemDirectoryEntry;
    const reader = directoryEntry.createReader();
    const entries = await readAllDirectoryEntries(reader);
    const nextPrefix = pathPrefix ? `${pathPrefix}/${entry.name}` : entry.name;

    const nestedResults = await Promise.all(
      entries.map((childEntry) => traverseFileTreeEntry(childEntry, nextPrefix)),
    );

    return {
      imageFiles: nestedResults.flatMap((result) => result.imageFiles),
      skippedCount: nestedResults.reduce((total, result) => total + result.skippedCount, 0),
    };
  }

  return { imageFiles: [], skippedCount: 0 };
}

export async function extractImageFilesFromDataTransfer(
  dataTransfer: DataTransfer,
): Promise<FilterImageFilesResult> {
  const items = Array.from(dataTransfer.items);
  const hasDirectoryEntry = items.some((item) => {
    const entry = item.webkitGetAsEntry?.();
    return entry?.isDirectory;
  });

  if (hasDirectoryEntry) {
    const imageFiles: SelectedImageFile[] = [];
    let skippedCount = 0;

    for (const item of items) {
      const entry = item.webkitGetAsEntry?.();
      if (!entry) {
        continue;
      }

      if (entry.isDirectory) {
        const result = await traverseFileTreeEntry(entry, entry.name);
        imageFiles.push(...result.imageFiles);
        skippedCount += result.skippedCount;
        continue;
      }

      if (entry.isFile) {
        const file = item.getAsFile();
        if (!file) {
          continue;
        }

        if (isAcceptedImageFile(file)) {
          imageFiles.push({
            file,
            relativePath: file.name,
          });
        } else {
          skippedCount += 1;
        }
      }
    }

    return { imageFiles, skippedCount };
  }

  return filterImageFilesFromList(dataTransfer.files);
}
