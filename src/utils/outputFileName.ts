import { getBaseName, getFileExtension } from './formatHelpers';

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

export function buildConvertedOutputPath(
  sourcePath: string,
  outputExtension: string,
): string {
  const normalized = normalizePath(sourcePath);
  const lastSlash = normalized.lastIndexOf('/');
  const fileName = lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized;
  const directory = lastSlash >= 0 ? normalized.slice(0, lastSlash + 1) : '';
  const baseName = getBaseName(fileName);

  return `${directory}${baseName}.${outputExtension}`;
}

export function resolveUniqueOutputPath(
  desiredPath: string,
  usedPaths: Set<string>,
): string {
  const normalized = normalizePath(desiredPath);

  if (!usedPaths.has(normalized)) {
    usedPaths.add(normalized);
    return normalized;
  }

  const lastSlash = normalized.lastIndexOf('/');
  const fileName = lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized;
  const directory = lastSlash >= 0 ? normalized.slice(0, lastSlash + 1) : '';
  const baseName = getBaseName(fileName);
  const extension = getFileExtension(fileName);

  let counter = 2;
  while (true) {
    const candidate = `${directory}${baseName}_${counter}.${extension}`;
    if (!usedPaths.has(candidate)) {
      usedPaths.add(candidate);
      return candidate;
    }
    counter += 1;
  }
}

export function getPathBasename(filePath: string): string {
  const normalized = normalizePath(filePath);
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized;
}

export function resolveUniqueBasename(
  desiredName: string,
  usedNames: Set<string>,
): string {
  if (!usedNames.has(desiredName)) {
    usedNames.add(desiredName);
    return desiredName;
  }

  const baseName = getBaseName(desiredName);
  const extension = getFileExtension(desiredName);

  let counter = 2;
  while (true) {
    const candidate = `${baseName}_${counter}.${extension}`;
    if (!usedNames.has(candidate)) {
      usedNames.add(candidate);
      return candidate;
    }
    counter += 1;
  }
}
