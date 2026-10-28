/** Public URL for an uploaded file key such as logos/uuid.png. Returns null when there is no file. */
export function assetUrl(key: string | null | undefined): string | null {
  return key ? `/api/v1/public/files/${key}` : null;
}

/** Builds a multipart body containing a single file part. */
export function fileForm(file: File, field = 'file'): FormData {
  const form = new FormData();
  form.append(field, file);
  return form;
}

/** Downloads a blob using the given file name. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Opens a blob (for example a PDF) in a new browser tab. */
export function openBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
