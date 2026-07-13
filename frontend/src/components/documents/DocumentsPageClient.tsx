'use client';

import { useRef, useState } from 'react';
import {
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useDeleteDocument,
  useDocuments,
  useUploadDocument,
  openDocument,
} from '@/hooks/useDocuments';
import {
  ALLOWED_DOCUMENT_EXTENSIONS,
  formatFileSize,
  getFileExtension,
} from '@/lib/documents';
import { formatDate } from '@/lib/utils';
import type { TeamDocument } from '@/lib/types';

const FILE_ACCEPT = ALLOWED_DOCUMENT_EXTENSIONS.map((extension) => `.${extension}`).join(',');

function DocumentIcon({ document }: { document: TeamDocument }) {
  const extension = getFileExtension(document.name);
  const className = 'h-5 w-5 flex-shrink-0 text-muted-foreground';

  if (['png', 'jpg', 'jpeg', 'webp'].includes(extension)) return <FileImage className={className} />;
  if (['xls', 'xlsx', 'csv'].includes(extension)) return <FileSpreadsheet className={className} />;
  if (extension === 'zip') return <FileArchive className={className} />;
  return <FileText className={className} />;
}

export function DocumentsPageClient({
  teamId,
  currentUserId,
  isAdmin,
}: {
  teamId: string;
  currentUserId: string | null;
  isAdmin: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingDelete, setPendingDelete] = useState<TeamDocument | null>(null);

  const { data: documents, isLoading } = useDocuments(teamId);
  const { mutate: uploadDocument, isPending: isUploading } = useUploadDocument(teamId);
  const { mutate: deleteDocument, isPending: isDeleting } = useDeleteDocument(teamId);

  const documentList = documents ?? [];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) uploadDocument(file);
    // Aynı dosya arka arkaya seçilebilsin diye input sıfırlanır.
    event.target.value = '';
  };

  const canDelete = (document: TeamDocument) =>
    isAdmin || (currentUserId !== null && document.uploaded_by === currentUserId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" data-testid="team-documents-heading">
            Dökümanlar
          </h2>
          <p className="text-sm text-muted-foreground">{documentList.length} döküman</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={FILE_ACCEPT}
          className="hidden"
          onChange={handleFileChange}
          data-testid="document-file-input"
        />
        <Button
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          data-testid="document-upload-button"
        >
          {isUploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Yükle
        </Button>
      </div>

      {!isLoading && documentList.length === 0 && (
        <EmptyState
          icon={FileText}
          title="Henüz döküman yok"
          description="İlk dökümanı bilgisayarınızdan yükleyin. (En fazla 20MB)"
        />
      )}

      {documentList.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <div className="divide-y divide-border">
            {documentList.map((document) => (
              <div
                key={document.id}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50/60"
              >
                <DocumentIcon document={document} />
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => openDocument(document)}
                    className="block max-w-full truncate text-left text-sm font-medium hover:underline"
                    title={`${document.name} dosyasını aç`}
                  >
                    {document.name}
                  </button>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(document.size_bytes)}
                    {document.profiles?.full_name ? ` · ${document.profiles.full_name}` : ''}
                    {` · ${formatDate(document.created_at)}`}
                  </p>
                </div>
                {canDelete(document) && (
                  <button
                    type="button"
                    onClick={() => setPendingDelete(document)}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                    aria-label={`${document.name} dosyasını sil`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dökümanı sil</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `"${pendingDelete.name}" kalıcı olarak silinecek. Bu işlem geri alınamaz.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)} disabled={isDeleting}>
              Vazgeç
            </Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={() => {
                if (!pendingDelete) return;
                deleteDocument(pendingDelete.id, {
                  onSettled: () => setPendingDelete(null),
                });
              }}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
