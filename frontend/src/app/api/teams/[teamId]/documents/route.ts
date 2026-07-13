import { NextResponse } from 'next/server';
import { authorizeTeamMember } from '@/lib/server/team-auth';
import { createDocumentSchema } from '@/lib/validations/documents';
import { isAllowedDocumentName } from '@/lib/documents';
import type { TeamDocument } from '@/lib/types';

export async function POST(
  request: Request,
  { params }: { params: { teamId: string } }
) {
  try {
    const { teamId } = params;
    const auth = await authorizeTeamMember(teamId);
    if (auth.error) return auth.error;

    const body = await request.json();
    const parsed = createDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Geçersiz döküman verisi' },
        { status: 400 }
      );
    }

    const { name, file_path, mime_type, size_bytes } = parsed.data;

    // Dosya bu ekibin klasörü altında olmalı — başka ekibin yoluna kayıt engellenir.
    if (!file_path.startsWith(`${teamId}/`)) {
      return NextResponse.json({ error: 'Geçersiz dosya yolu' }, { status: 400 });
    }

    if (!isAllowedDocumentName(name) || !isAllowedDocumentName(file_path)) {
      return NextResponse.json({ error: 'Bu dosya türü desteklenmiyor' }, { status: 400 });
    }

    const { data: document, error: insertError } = await auth.admin
      .from('documents')
      .insert({
        team_id: teamId,
        name: name.trim(),
        file_path,
        mime_type: mime_type ?? null,
        size_bytes,
        uploaded_by: auth.user.id,
      })
      .select('*, profiles(*)')
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({ document: document as TeamDocument }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
