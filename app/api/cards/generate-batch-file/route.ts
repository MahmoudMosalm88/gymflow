import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { fail, routeError } from '@/lib/http';
import { allocateCardRange, buildCardBatchFiles } from '@/lib/card-batch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  count: z.number().int().min(1).max(2000),
  format: z.enum(['pdf', 'csv']),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const parsed = bodySchema.safeParse(await request.json());

    if (!parsed.success) {
      return fail('Count must be an integer between 1 and 2000.', 400);
    }

    const range = await allocateCardRange(auth.organizationId, auth.branchId, parsed.data.count);
    const files = await buildCardBatchFiles(range);

    const isPdf = parsed.data.format === 'pdf';
    const fileName = isPdf ? files.pdfFileName : files.csvFileName;
    const mimeType = isPdf ? 'application/pdf' : 'text/csv; charset=utf-8';
    const payload = isPdf
      ? Buffer.from(files.pdfBase64, 'base64')
      : Buffer.from(files.csvText, 'utf8');

    return new Response(payload, {
      status: 200,
      headers: {
        'content-type': mimeType,
        'content-disposition': `attachment; filename="${fileName}"`,
        'cache-control': 'no-store',
        'x-card-from': range.from,
        'x-card-to': range.to,
        'x-card-count': String(range.codes.length),
      },
    });
  } catch (error) {
    return routeError(error);
  }
}
