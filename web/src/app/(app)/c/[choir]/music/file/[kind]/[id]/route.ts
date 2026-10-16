import { NextResponse } from 'next/server';
import { z } from 'zod';
import { demoPieceFor, isDemoPath } from '@/lib/demoMusic';
import { buildDemoScorePdf } from '@/lib/demoScore';
import { getChoirContext } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

// Opens a score or learning track the member may see. Real files get a
// short-lived signed link; demo scores are drawn on the fly.
export async function GET(_request: Request, { params }: RouteContext<'/c/[choir]/music/file/[kind]/[id]'>) {
  const { choir, kind, id } = await params;
  const ctx = await getChoirContext(choir);
  if (!ctx || !z.uuid().safeParse(id).success || (kind !== 'score' && kind !== 'track')) {
    return new NextResponse('Not found', { status: 404 });
  }
  const supabase = await createClient();
  const row =
    kind === 'score'
      ? (await supabase.from('score_files').select('storage_path, pieces(title, composer)').eq('id', id).maybeSingle()).data
      : (await supabase.from('learning_tracks').select('storage_path, pieces(title, composer)').eq('id', id).maybeSingle()).data;
  if (!row) return new NextResponse('Not found', { status: 404 });

  if (isDemoPath(row.storage_path)) {
    const piece = demoPieceFor(row.storage_path);
    if (kind !== 'score' || !piece) return new NextResponse('Not found', { status: 404 });
    const pdf = buildDemoScorePdf(piece, row.pieces?.title ?? 'Score', row.pieces?.composer ?? '');
    return new NextResponse(pdf as unknown as BodyInit, {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="score.pdf"', 'Cache-Control': 'private, max-age=3600' },
    });
  }

  const { data } = await supabase.storage.from(kind === 'score' ? 'scores' : 'tracks').createSignedUrl(row.storage_path, 600);
  if (!data?.signedUrl) return new NextResponse('Not found', { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
