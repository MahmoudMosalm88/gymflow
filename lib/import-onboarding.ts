import type { ImportPreviewResponse } from '@/lib/imports';

export type ImportExecutionChecks = {
  reviewedRows: boolean;
  understoodSafety: boolean;
};

export function hasBlockingInvalidRows(preview: ImportPreviewResponse | null | undefined) {
  return Boolean(preview && preview.summary.invalidRows > 0);
}

export function hasBlockingWarningRows(preview: ImportPreviewResponse | null | undefined) {
  return Boolean(preview && preview.summary.warningRows > 0);
}

export function hasBlockingRows(preview: ImportPreviewResponse | null | undefined) {
  return hasBlockingInvalidRows(preview) || hasBlockingWarningRows(preview);
}

export function canExecuteImportedMembers(
  preview: ImportPreviewResponse | null | undefined,
  checks: ImportExecutionChecks
) {
  if (!preview) return false;
  if (hasBlockingRows(preview)) return false;
  if (preview.summary.estimatedMembersToCreate <= 0) return false;
  return checks.reviewedRows && checks.understoodSafety;
}
