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
  const [settingsRows, membersRows, subscriptionsRows, logsRows, guestRows, paymentsRows, artifactsRows] =
    await Promise.all([
      query<SettingRow>(
        `SELECT key, value
           FROM settings
          WHERE organization_id = $1
            AND branch_id = $2
            AND key IN ('onboarding_completed', 'onboarding_mode')`,
        [organizationId, branchId]
      ),
      query<{ exists: boolean }>(
        `SELECT EXISTS(
           SELECT 1
             FROM members
            WHERE organization_id = $1
              AND branch_id = $2
              AND deleted_at IS NULL
         ) AS exists`,
        [organizationId, branchId]
      ),
      query<{ exists: boolean }>(
        `SELECT EXISTS(
           SELECT 1
             FROM subscriptions
            WHERE organization_id = $1
              AND branch_id = $2
         ) AS exists`,
        [organizationId, branchId]
      ),
      query<{ exists: boolean }>(
        `SELECT EXISTS(
           SELECT 1
             FROM logs
            WHERE organization_id = $1
              AND branch_id = $2
         ) AS exists`,
        [organizationId, branchId]
      ),
      query<{ exists: boolean }>(
        `SELECT EXISTS(
           SELECT 1
             FROM guest_passes
            WHERE organization_id = $1
              AND branch_id = $2
         ) AS exists`,
        [organizationId, branchId]
      ),
      query<{ exists: boolean }>(
        `SELECT EXISTS(
           SELECT 1
             FROM payments
            WHERE organization_id = $1
              AND branch_id = $2
         ) AS exists`,
        [organizationId, branchId]
      ),
      query<{ exists: boolean }>(
        `SELECT EXISTS(
           SELECT 1
             FROM import_artifacts
            WHERE organization_id = $1
              AND branch_id = $2
         ) AS exists`,
        [organizationId, branchId]
      )
    ]);

  const onboardingCompleted =
    readBooleanSetting(settingsRows.find((row) => row.key === 'onboarding_completed')?.value) === true;

  const hasMeaningfulData = [
    membersRows[0]?.exists,
    subscriptionsRows[0]?.exists,
    logsRows[0]?.exists,
    guestRows[0]?.exists,
    paymentsRows[0]?.exists
  ].some(Boolean);

  const hasPendingImport = Boolean(artifactsRows[0]?.exists);
  const shouldRedirect = !onboardingCompleted && (hasPendingImport || !hasMeaningfulData);

  return {
    onboardingCompleted,
    hasMeaningfulData,
    hasPendingImport,
    shouldRedirect
  };
}
