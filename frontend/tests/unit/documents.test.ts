import { describe, expect, it } from 'vitest';
import {
  formatFileSize,
  getFileExtension,
  isAllowedDocumentName,
  sanitizeFileName,
} from '@/lib/documents';

describe('documents helpers', () => {
  it('extracts file extensions case-insensitively', () => {
    expect(getFileExtension('rapor.PDF')).toBe('pdf');
    expect(getFileExtension('arsiv.tar.gz')).toBe('gz');
    expect(getFileExtension('uzantisiz')).toBe('');
  });

  it('allows whitelisted document types only', () => {
    expect(isAllowedDocumentName('rapor.pdf')).toBe(true);
    expect(isAllowedDocumentName('tablo.xlsx')).toBe(true);
    expect(isAllowedDocumentName('resim.webp')).toBe(true);
    expect(isAllowedDocumentName('zararli.exe')).toBe(false);
    expect(isAllowedDocumentName('script.js')).toBe(false);
    expect(isAllowedDocumentName('sayfa.html')).toBe(false);
    expect(isAllowedDocumentName('uzantisiz')).toBe(false);
  });

  it('sanitizes Turkish characters and path separators for storage keys', () => {
    expect(sanitizeFileName('Yıllık Rapor (Şubat).pdf')).toMatch(/^[a-zA-Z0-9._-]+$/);
    expect(sanitizeFileName('Yıllık Rapor.pdf')).toContain('.pdf');
    expect(sanitizeFileName('../../etc/passwd')).not.toContain('/');
    expect(sanitizeFileName('..\\gizli.txt')).not.toContain('\\');
    expect(sanitizeFileName('')).toBe('dosya');
  });

  it('formats file sizes', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2048)).toBe('2.0 KB');
    expect(formatFileSize(3 * 1024 * 1024)).toBe('3.0 MB');
  });
});
