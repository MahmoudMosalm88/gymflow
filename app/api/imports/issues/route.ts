import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireRoles } from '@/lib/auth';
import { fail, routeError } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ImportRowIssueRecord = {
  row_number: number;
  status: string;
  raw_row: Record<string, string>;
  issues: Array<{ message?: string }>;
};

function escapeCsv(value: unknown) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRoles(request, ['owner']);
    const artifactId = request.nextUrl.searchParams.get('artifactId');
    if (!artifactId) return fail('artifactId is required', 400);

    const rows = await query<ImportRowIssueRecord>(
      `SELECT row_number, status, raw_row, issues
         FROM import_row_results
        WHERE artifact_id = $1
          AND organization_id = $2
          AND branch_id = $3
          AND status IN ('warning', 'invalid', 'duplicate', 'failed', 'skipped')
        ORDER BY row_number ASC`,
      [artifactId, auth.organizationId, auth.branchId]
    );

    if (rows.length === 0) {
      return fail('No issue rows found for this artifact', 404);
    }

    const dynamicHeaders = Array.from(
      new Set(rows.flatMap((row) => Object.keys(row.raw_row || {})))
    ).sort((a, b) => a.localeCompare(b));

    const csvHeaders = ['row_number', 'status', 'issues', ...dynamicHeaders];
    const csvLines = rows.map((row) => {
      const issueText = (row.issues || [])
        .map((issue) => issue.message || '')
        .filter(Boolean)
        .join(' | ');
      return [
        row.row_number,
        row.status,
        issueText,
        ...dynamicHeaders.map((header) => row.raw_row?.[header] || '')
      ]
        .map(escapeCsv)
        .join(',');
    });

    const csv = [csvHeaders.map(escapeCsv).join(','), ...csvLines].join('\n');

    return new NextResponse(csv, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="import-issues-${artifactId}.csv"`
      }
    });
  } catch (error) {
    return routeError(error);
  }
}
