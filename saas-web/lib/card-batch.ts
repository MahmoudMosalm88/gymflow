import { PDFDocument, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import { withTransaction } from '@/lib/db';

const SERIAL_PAD = 5;
const SETTING_KEY = 'next_card_serial';
const MIN_COUNT = 1;
const MAX_COUNT = 2000;

const A4_WIDTH = 595;
const A4_HEIGHT = 842;
const GRID_COLUMNS = 2;
const GRID_ROWS = 5;
const PAGE_MARGIN = 28;
const TEXT_SIZE = 12;
const TEXT_MARGIN = 6;
const MAX_QR_SIZE = 130;

export type CardBatchRange = {
  codes: string[];
  from: string;
  to: string;
  startNumber: number;
  endNumber: number;
};

export type CardBatchFiles = {
  pdfBase64: string;
  csvText: string;
  pdfFileName: string;
  csvFileName: string;
};

function formatSerial(num: number): string {
  return String(num).padStart(SERIAL_PAD, '0');
}

function parseJsonNumber(input: unknown): number | null {
  if (typeof input === 'number' && Number.isFinite(input)) return input;
  if (typeof input === 'string') {
    const parsed = Number(input);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (input && typeof input === 'object') {
    const record = input as Record<string, unknown>;
    if ('value' in record) return parseJsonNumber(record.value);
  }
  return null;
}

function assertCount(count: number) {
  if (!Number.isInteger(count) || count < MIN_COUNT || count > MAX_COUNT) {
    throw new Error(`Count must be between ${MIN_COUNT} and ${MAX_COUNT}`);
  }
}

export async function getNextCardPreview(organizationId: string, branchId: string): Promise<string> {
  return withTransaction(async (client) => {
    const [settingRow] = (
      await client.query<{ value: unknown }>(
        `SELECT value
           FROM settings
          WHERE organization_id = $1
            AND branch_id = $2
            AND key = $3
          LIMIT 1`,
        [organizationId, branchId, SETTING_KEY]
      )
    ).rows;

    const fromSetting = parseJsonNumber(settingRow?.value);
    const next = Math.max(1, fromSetting ?? 1);

    return formatSerial(next);
  });
}

export async function allocateCardRange(
  organizationId: string,
  branchId: string,
  count: number
): Promise<CardBatchRange> {
  assertCount(count);

  return withTransaction(async (client) => {
    const [settingRow] = (
      await client.query<{ value: unknown }>(
        `SELECT value
           FROM settings
          WHERE organization_id = $1
            AND branch_id = $2
            AND key = $3
          FOR UPDATE`,
        [organizationId, branchId, SETTING_KEY]
      )
    ).rows;

    const fromSetting = parseJsonNumber(settingRow?.value);
    const startNumber = Math.max(1, fromSetting ?? 1);
    const endNumber = startNumber + count - 1;

    await client.query(
      `INSERT INTO settings (organization_id, branch_id, key, value)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (organization_id, branch_id, key)
       DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [organizationId, branchId, SETTING_KEY, JSON.stringify(endNumber + 1)]
    );

    const codes = Array.from({ length: count }, (_, index) => formatSerial(startNumber + index));

    return {
      codes,
      from: formatSerial(startNumber),
      to: formatSerial(endNumber),
      startNumber,
      endNumber,
    };
  });
}

export async function buildCardBatchFiles(range: CardBatchRange): Promise<CardBatchFiles> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const cellWidth = (A4_WIDTH - PAGE_MARGIN * 2) / GRID_COLUMNS;
  const cellHeight = (A4_HEIGHT - PAGE_MARGIN * 2) / GRID_ROWS;
  const qrSize = Math.min(MAX_QR_SIZE, cellWidth - 20, cellHeight - (TEXT_SIZE + TEXT_MARGIN * 2 + 10));

  for (let i = 0; i < range.codes.length; i += 1) {
    const pageIndex = Math.floor(i / (GRID_COLUMNS * GRID_ROWS));
    const indexInPage = i % (GRID_COLUMNS * GRID_ROWS);

    if (indexInPage === 0) {
      pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    }

    const page = pdfDoc.getPage(pageIndex);
    const row = Math.floor(indexInPage / GRID_COLUMNS);
    const col = indexInPage % GRID_COLUMNS;
    const cellLeft = PAGE_MARGIN + col * cellWidth;
    const cellTop = A4_HEIGHT - PAGE_MARGIN - row * cellHeight;

    const code = range.codes[i];
    const dataUrl = await QRCode.toDataURL(code, {
      width: 300,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    });

    const pngBytes = Buffer.from(dataUrl.split(',')[1], 'base64');
    const pngImage = await pdfDoc.embedPng(pngBytes);

    const qrX = cellLeft + (cellWidth - qrSize) / 2;
    const qrY = cellTop - TEXT_MARGIN - qrSize;
    page.drawImage(pngImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });

    const textWidth = font.widthOfTextAtSize(code, TEXT_SIZE);
    const textX = cellLeft + (cellWidth - textWidth) / 2;
    const textY = qrY - TEXT_MARGIN - TEXT_SIZE;
    page.drawText(code, { x: textX, y: textY, size: TEXT_SIZE, font });
  }

  const pdfBytes = await pdfDoc.save();
  const csvText = ['card_code', ...range.codes].join('\n');

  return {
    pdfBase64: Buffer.from(pdfBytes).toString('base64'),
    csvText,
    pdfFileName: `GymFlow-Cards-${range.from}-to-${range.to}.pdf`,
    csvFileName: `GymFlow-Cards-${range.from}-to-${range.to}.csv`,
  };
}
