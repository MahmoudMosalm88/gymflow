import { BRANCH_ID_KEY, SESSION_PROFILE_KEY, SESSION_TOKEN_KEY, type SessionProfile } from '@/lib/session';
import { getDefaultPathForRole } from '@/lib/permissions';

type OnboardingStatusResponse = {
  shouldRedirect: boolean;
  targetPath: string;
};

type OnboardingChecklistNavLockState = {
  href: string;
  path: string;
  expiresAt: number;
};

type OnboardingChecklistKey =
  | 'reviewImportedMembers'
  | 'addFirstMember'
  | 'connectWhatsapp'
  | 'addTeam'
  | 'testCheckIn'
  | 'reviewReminders'
  | 'rememberImportLater';

type PersistedOnboardingResumeState = {
  checklist?: Partial<Record<OnboardingChecklistKey, boolean>>;
};

const ONBOARDING_NAV_BYPASS_TTL_MS = 2 * 60 * 60 * 1000;
const ONBOARDING_STATE_EVENT = 'gymflow:onboarding-state-changed';

function readStoredProfile() {
  try {
    const raw = localStorage.getItem(SESSION_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionProfile;
  } catch {
    return null;
  }
}

function getStoredBranchId() {
  const direct = localStorage.getItem(BRANCH_ID_KEY);
  if (direct) return direct;
  const profile = readStoredProfile();
  return typeof profile?.branchId === "string" ? profile.branchId : null;
}

function getOnboardingNavBypassKey() {
  if (typeof window === 'undefined') return null;
  const branchId = getStoredBranchId();
  if (!branchId) return null;
  return `gymflow:onboarding-nav-bypass:${branchId}`;
}

function getOnboardingChecklistLockKey() {
  if (typeof window === 'undefined') return null;
  const branchId = getStoredBranchId();
  if (!branchId) return null;
  return `gymflow:onboarding-checklist-lock:${branchId}`;
}

function normalizeLockPath(href: string) {
  try {
    return new URL(href, 'http://localhost').pathname;
  } catch {
    return href.split('?')[0] || href;
  }
}

function getOnboardingResumeStorageKey() {
  if (typeof window === 'undefined') return null;
  const branchId = getStoredBranchId();
  if (!branchId) return null;
  return `gymflow:onboarding-resume:onboarding:${branchId}`;
}

function emitOnboardingStateChange() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ONBOARDING_STATE_EVENT));
}

function readOnboardingResumeState(): PersistedOnboardingResumeState | null {
  if (typeof window === 'undefined') return null;
  const storageKey = getOnboardingResumeStorageKey();
  if (!storageKey) return null;

  const raw = window.sessionStorage.getItem(storageKey);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as PersistedOnboardingResumeState;
  } catch {
    return null;
  }
}

export function setOnboardingNavigationBypass() {
  if (typeof window === 'undefined') return;
  const storageKey = getOnboardingNavBypassKey();
  if (!storageKey) return;
  window.sessionStorage.setItem(storageKey, String(Date.now() + ONBOARDING_NAV_BYPASS_TTL_MS));
  emitOnboardingStateChange();
}

export function clearOnboardingNavigationBypass() {
  if (typeof window === 'undefined') return;
  const storageKey = getOnboardingNavBypassKey();
  if (!storageKey) return;
  window.sessionStorage.removeItem(storageKey);
  emitOnboardingStateChange();
}

export function setOnboardingChecklistNavLock(href: string) {
  if (typeof window === 'undefined') return;
  const storageKey = getOnboardingChecklistLockKey();
  if (!storageKey) return;
  const payload: OnboardingChecklistNavLockState = {
    href,
    path: normalizeLockPath(href),
    expiresAt: Date.now() + ONBOARDING_NAV_BYPASS_TTL_MS,
  };
  window.sessionStorage.setItem(storageKey, JSON.stringify(payload));
  emitOnboardingStateChange();
}

export function clearOnboardingChecklistNavLock() {
  if (typeof window === 'undefined') return;
  const storageKey = getOnboardingChecklistLockKey();
  if (!storageKey) return;
  window.sessionStorage.removeItem(storageKey);
  emitOnboardingStateChange();
}

export function getOnboardingChecklistNavLock() {
  if (typeof window === 'undefined') return null;
  const storageKey = getOnboardingChecklistLockKey();
  if (!storageKey) return null;

  const raw = window.sessionStorage.getItem(storageKey);
  if (!raw) return null;

  try {
    const payload = JSON.parse(raw) as Partial<OnboardingChecklistNavLockState>;
    if (
      typeof payload.href !== 'string' ||
      typeof payload.path !== 'string' ||
      typeof payload.expiresAt !== 'number'
    ) {
      window.sessionStorage.removeItem(storageKey);
      return null;
    }

    if (!Number.isFinite(payload.expiresAt) || payload.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(storageKey);
      return null;
    }

    return payload as OnboardingChecklistNavLockState;
  } catch {
    window.sessionStorage.removeItem(storageKey);
    return null;
  }
}

export function hasOnboardingChecklistNavLock() {
  return getOnboardingChecklistNavLock() !== null;
}

export function syncOnboardingChecklistProgress(updates: Partial<Record<OnboardingChecklistKey, boolean>>) {
  if (typeof window === 'undefined') return null;
  const storageKey = getOnboardingResumeStorageKey();
  if (!storageKey) return null;

  const current = readOnboardingResumeState();
  if (!current) return null;
  const next = {
    ...current,
    checklist: {
      ...(current.checklist ?? {}),
      ...updates,
    },
  };

  window.sessionStorage.setItem(storageKey, JSON.stringify(next));
  emitOnboardingStateChange();
  return next.checklist ?? {};
}

export function getOnboardingChecklistProgress() {
  return readOnboardingResumeState()?.checklist ?? {};
}

export function hasCompletedRequiredOnboardingChecklist(variant: 'imported' | 'manual' = 'imported') {
  const checklist = getOnboardingChecklistProgress();
  const requiredKeys =
    variant === 'manual'
      ? ['addFirstMember', 'connectWhatsapp', 'addTeam']
      : ['reviewImportedMembers', 'connectWhatsapp', 'addTeam'];

  return requiredKeys.every((key) => checklist[key as OnboardingChecklistKey] === true);
}

export function subscribeToOnboardingStateChanges(listener: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(ONBOARDING_STATE_EVENT, listener);
  return () => {
    window.removeEventListener(ONBOARDING_STATE_EVENT, listener);
  };
}

export function hasOnboardingNavigationBypass() {
  if (typeof window === 'undefined') return false;
  const storageKey = getOnboardingNavBypassKey();
  if (!storageKey) return false;

  const raw = window.sessionStorage.getItem(storageKey);
  if (!raw) return false;

  const expiresAt = Number(raw);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    window.sessionStorage.removeItem(storageKey);
    return false;
  }

  return true;
}

export function getStoredDefaultPath() {
  const profile = readStoredProfile();
  return profile ? getDefaultPathForRole(profile.role) : '/dashboard';
}

export async function fetchOnboardingRedirectTarget() {
  const token = localStorage.getItem(SESSION_TOKEN_KEY);
  const branchId = getStoredBranchId();
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
