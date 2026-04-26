import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TEMPLATE_HEADERS = [
  'member_name',
  'phone',
  'gender',
  'joined_at',
  'card_code',
  'subscription_start',
  'subscription_end',
  'plan_months',
  'sessions_per_month',
  'amount_paid',
  'notes'
];

const TEMPLATE_SAMPLE_ROWS = [
  {
    member_name: 'Ahmed Ali',
    phone: '+201001234567',
    gender: 'male',
    joined_at: '2026-04-01',
    card_code: 'A-1001',
    subscription_start: '2026-04-01',
    subscription_end: '2026-05-01',
    plan_months: 1,
    sessions_per_month: '',
    amount_paid: 500,
    notes: 'Imported from previous software'
  },
  {
    member_name: 'Mona Samir',
    phone: '+201001234568',
    gender: 'female',
    joined_at: '2026-04-03',
    card_code: 'A-1002',
    subscription_start: '2026-04-03',
    subscription_end: '2026-07-03',
    plan_months: 3,
    sessions_per_month: '',
    amount_paid: 1200,
    notes: 'Example quarterly plan'
  }
];

export async function GET() {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(TEMPLATE_SAMPLE_ROWS, {
    header: TEMPLATE_HEADERS
  });

  XLSX.utils.book_append_sheet(workbook, worksheet, 'GymFlow Import Template');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buffer, {
    headers: {
      'content-type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': 'attachment; filename="gymflow-import-template.xlsx"'
    }
  });
}
