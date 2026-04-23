import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { fail, ok, routeError } from '@/lib/http';
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

    const fileName = parsed.data.format === 'pdf' ? files.pdfFileName : files.csvFileName;
    const mimeType = parsed.data.format === 'pdf' ? 'application/pdf' : 'text/csv;charset=utf-8';
    const fileBase64 = parsed.data.format === 'pdf'
      ? files.pdfBase64
      : Buffer.from(files.csvText, 'utf8').toString('base64');

    return ok({
      from: range.from,
      to: range.to,
      count: range.codes.length,
      format: parsed.data.format,
      fileName,
      mimeType,
      fileBase64,
    });
  } catch (error) {
    return routeError(error);
  }
}
