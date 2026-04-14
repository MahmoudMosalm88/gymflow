import { BRANCH_ID_KEY, SESSION_PROFILE_KEY, SESSION_TOKEN_KEY, type SessionProfile } from '@/lib/session';
import { getDefaultPathForRole } from '@/lib/permissions';

type OnboardingStatusResponse = {
  shouldRedirect: boolean;
  targetPath: string;
};

function readStoredProfile() {
  try {
    const raw = localStorage.getItem(SESSION_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionProfile;
  } catch {
    return null;
  }
}

export function getStoredDefaultPath() {
  const profile = readStoredProfile();
  return profile ? getDefaultPathForRole(profile.role) : '/dashboard';
}

export async function fetchOnboardingRedirectTarget() {
  const token = localStorage.getItem(SESSION_TOKEN_KEY);
  const branchId = localStorage.getItem(BRANCH_ID_KEY);
  if (!token) return getStoredDefaultPath();

  try {
    const response = await fetch('/api/onboarding/status', {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(branchId ? { 'x-branch-id': branchId } : {})
      },
      cache: 'no-store'
    });
    const payload = (await response.json().catch(() => null)) as
      | { success?: boolean; data?: OnboardingStatusResponse }
      | null;

    if (!response.ok || !payload?.data?.targetPath) {
      return getStoredDefaultPath();
    }
    return payload.data.targetPath;
  } catch {
    return getStoredDefaultPath();
  }
}
