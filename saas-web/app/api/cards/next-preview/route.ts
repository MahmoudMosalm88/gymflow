import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { ok, routeError } from '@/lib/http';
import { getNextCardPreview } from '@/lib/card-batch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const next = await getNextCardPreview(auth.organizationId, auth.branchId);
    return ok({ next });
  } catch (error) {
    return routeError(error);
  }
}
