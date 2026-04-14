import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { ok, routeError } from '@/lib/http';
import { getOwnerOnboardingStatus } from '@/lib/onboarding';
import { getDefaultPathForRole } from '@/lib/permissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);

    if (auth.role !== 'owner') {
      return ok({
        shouldRedirect: false,
        targetPath: getDefaultPathForRole(auth.role),
        reason: 'non_owner'
      });
    }

    const status = await getOwnerOnboardingStatus(auth.organizationId, auth.branchId);
    return ok({
      ...status,
      targetPath: status.shouldRedirect ? '/dashboard/onboarding' : '/dashboard'
    });
  } catch (error) {
    return routeError(error);
  }
}
