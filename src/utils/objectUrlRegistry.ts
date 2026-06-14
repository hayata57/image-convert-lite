const activeUrls = new Set<string>();
let createdCount = 0;
let revokedCount = 0;

export function trackCreateObjectURL(blob: Blob): string {
  const url = URL.createObjectURL(blob);
  createdCount += 1;
  activeUrls.add(url);
  return url;
}

export function trackRevokeObjectURL(url: string): void {
  if (!url) {
    return;
  }

  if (activeUrls.has(url)) {
    activeUrls.delete(url);
  }

  URL.revokeObjectURL(url);
  revokedCount += 1;
}

export function getObjectUrlStats(): {
  createdCount: number;
  revokedCount: number;
  activeCount: number;
} {
  return {
    createdCount,
    revokedCount,
    activeCount: activeUrls.size,
  };
}
