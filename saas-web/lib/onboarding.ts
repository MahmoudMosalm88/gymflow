import { query } from '@/lib/db';

type SettingRow = {
  key: string;
  value: unknown;
};

function readBooleanSetting(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  return false;
}

export type OwnerOnboardingStatus = {
  onboardingCompleted: boolean;
  hasMeaningfulData: boolean;
  hasPendingImport: boolean;
  shouldRedirect: boolean;
};

export async function getOwnerOnboardingStatus(
  organizationId: string,
  branchId: string
): Promise<OwnerOnboardingStatus> {
  const rows = await query<{
    onboarding_completed: unknown;
    has_members: boolean;
    has_subscriptions: boolean;
    has_logs: boolean;
    has_guest_passes: boolean;
    has_payments: boolean;
    has_import_artifacts: boolean;
  }>(
    `SELECT
        (
          SELECT value
            FROM settings
           WHERE organization_id = $1
             AND branch_id = $2
             AND key = 'onboarding_completed'
           LIMIT 1
        ) AS onboarding_completed,
        EXISTS(
          SELECT 1
            FROM members
           WHERE organization_id = $1
             AND branch_id = $2
             AND deleted_at IS NULL
        ) AS has_members,
        EXISTS(
          SELECT 1
            FROM subscriptions
           WHERE organization_id = $1
             AND branch_id = $2
        ) AS has_subscriptions,
        EXISTS(
          SELECT 1
            FROM logs
           WHERE organization_id = $1
             AND branch_id = $2
        ) AS has_logs,
        EXISTS(
          SELECT 1
            FROM guest_passes
           WHERE organization_id = $1
             AND branch_id = $2
        ) AS has_guest_passes,
        EXISTS(
          SELECT 1
            FROM payments
           WHERE organization_id = $1
             AND branch_id = $2
        ) AS has_payments,
        EXISTS(
          SELECT 1
            FROM import_artifacts
           WHERE organization_id = $1
             AND branch_id = $2
        ) AS has_import_artifacts`,
    [organizationId, branchId]
  );

  const summary = rows[0];
  const onboardingCompleted = readBooleanSetting(summary?.onboarding_completed) === true;

  const hasMeaningfulData = [
    summary?.has_members,
    summary?.has_subscriptions,
    summary?.has_logs,
    summary?.has_guest_passes,
    summary?.has_payments
  ].some(Boolean);

  const hasPendingImport = Boolean(summary?.has_import_artifacts);
  const shouldRedirect = !onboardingCompleted && (hasPendingImport || !hasMeaningfulData);

  return {
    onboardingCompleted,
    hasMeaningfulData,
    hasPendingImport,
    shouldRedirect
  };
}
