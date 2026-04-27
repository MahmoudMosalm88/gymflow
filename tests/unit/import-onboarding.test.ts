import {
  canExecuteImportedMembers,
  hasBlockingInvalidRows,
  hasBlockingRows,
  hasBlockingWarningRows,
} from '@/lib/import-onboarding';
import type { ImportPreviewResponse } from '@/lib/imports';

function buildPreview(summary: Partial<ImportPreviewResponse['summary']>): ImportPreviewResponse {
  return {
    artifactId: 'artifact-1',
    summary: {
      totalRows: 4,
      validRows: 2,
      warningRows: 0,
      invalidRows: 0,
      duplicateRows: 1,
      estimatedMembersToCreate: 2,
      estimatedSubscriptionsToCreate: 1,
      sampleIssues: [],
      ...summary,
    },
    rows: [],
  };
}

describe('lib/import-onboarding', () => {
  it('treats warning rows as blocking', () => {
    const preview = buildPreview({ warningRows: 1 });
    expect(hasBlockingWarningRows(preview)).toBe(true);
    expect(hasBlockingRows(preview)).toBe(true);
    expect(
      canExecuteImportedMembers(preview, {
        reviewedRows: true,
        understoodSafety: true,
      })
    ).toBe(false);
  });

  it('treats invalid rows as blocking', () => {
    const preview = buildPreview({ invalidRows: 1 });
    expect(hasBlockingInvalidRows(preview)).toBe(true);
    expect(hasBlockingRows(preview)).toBe(true);
  });

  it('allows import when rows are clean and duplicates are only safe skips', () => {
    const preview = buildPreview({
      warningRows: 0,
      invalidRows: 0,
      duplicateRows: 3,
      estimatedMembersToCreate: 2,
    });

    expect(hasBlockingRows(preview)).toBe(false);
    expect(
      canExecuteImportedMembers(preview, {
        reviewedRows: true,
        understoodSafety: true,
      })
    ).toBe(true);
  });

  it('blocks import when nothing new would be created', () => {
    const preview = buildPreview({
      estimatedMembersToCreate: 0,
      duplicateRows: 4,
      validRows: 0,
    });

    expect(
      canExecuteImportedMembers(preview, {
        reviewedRows: true,
        understoodSafety: true,
      })
    ).toBe(false);
  });
});
