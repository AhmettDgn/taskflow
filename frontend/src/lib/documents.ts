// Döküman yükleme kuralları — hem client (erken doğrulama) hem API route (asıl kontrol)
// tarafından kullanılır.

export const DOCUMENTS_BUCKET = 'team-documents';
export const MAX_DOCUMENT_SIZE_BYTES = 20 * 1024 * 1024; // bucket file_size_limit ile aynı

export const ALLOWED_DOCUMENT_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
  'csv',
  'md',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'zip',
] as const;

export function getFileExtension(fileName: string) {
  const match = /\.([^.]+)$/.exec(fileName);
  return match ? match[1].toLowerCase() : '';
}

export function isAllowedDocumentName(fileName: string) {
  return (ALLOWED_DOCUMENT_EXTENSIONS as readonly string[]).includes(getFileExtension(fileName));
}

// Storage key'leri ASCII olmalı: Türkçe karakterleri sadeleştir, yol ayraçlarını
// ve güvensiz karakterleri temizle. Orijinal ad DB'deki `name` kolonunda kalır.
export function sanitizeFileName(fileName: string) {
  const base = fileName.replace(/[/\\]/g, '_');
  const ascii = base
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I');
  const cleaned = ascii.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/_+/g, '_');
  return cleaned.replace(/^[_\.]+/, '') || 'dosya';
}

export function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
