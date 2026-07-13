import { NextResponse } from 'next/server';
import { authorizeTeamMember } from '@/lib/server/team-auth';
import { DOCUMENTS_BUCKET } from '@/lib/documents';
import type { TeamDocument } from '@/lib/types';

export async function DELETE(
  _request: Request,
  { params }: { params: { teamId: string; documentId: string } }
) {
  try {
    const { teamId, documentId } = params;
    const auth = await authorizeTeamMember(teamId);
    if (auth.error) return auth.error;

    const { data: document } = await auth.admin
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('team_id', teamId)
      .maybeSingle<TeamDocument>();

    if (!document) {
      return NextResponse.json({ error: 'Döküman bulunamadı' }, { status: 404 });
    }

    const canDelete =
      document.uploaded_by === auth.user.id || auth.membership.role === 'admin';

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Bu dökümanı sadece yükleyen kişi veya yönetici silebilir' },
        { status: 403 }
      );
    }

    // Önce storage nesnesi, sonra kayıt; storage silinemezse kayıt da kalsın
    // ki liste ile depo tutarlı kalsın.
    const { error: storageError } = await auth.admin.storage
      .from(DOCUMENTS_BUCKET)
      .remove([document.file_path]);

    if (storageError) {
      return NextResponse.json({ error: 'Dosya depodan silinemedi' }, { status: 500 });
    }

    const { error: deleteError } = await auth.admin
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
