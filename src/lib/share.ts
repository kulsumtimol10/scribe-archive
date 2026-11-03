import { IMAGE_TYPE } from './render';

/** Whether this device can hand an image to the share sheet (phones, mostly). */
export function canShareImages(): boolean {
  try {
    const probe = new File([new Uint8Array(1)], 'probe.jpg', { type: IMAGE_TYPE });
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

export function saveFile(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Opens the share sheet; resolves false if the reader closed it. */
export async function shareFile(file: File, title: string, text?: string): Promise<boolean> {
  try {
    await navigator.share({ files: [file], title, text });
    return true;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return false;
    throw err;
  }
}
