import { PDFDocument, StandardFonts } from 'pdf-lib'
import * as QRCode from 'qrcode'
import { join } from 'path'
import { mkdirSync, writeFileSync } from 'fs'
import { getUserDataPath } from '../database/connection'

const A4_WIDTH = 595
const A4_HEIGHT = 842
const GRID_COLUMNS = 2
const GRID_ROWS = 5
const PAGE_MARGIN = 28
const TEXT_SIZE = 12
const TEXT_MARGIN = 6
const MAX_QR_SIZE = 130

export async function generateCardBatchFiles(codes: string[], from: string, to: string): Promise<{
  pdfPath: string
  csvPath: string
}> {
  if (!codes.length) {
    throw new Error('No codes provided')
  }

  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const cellWidth = (A4_WIDTH - PAGE_MARGIN * 2) / GRID_COLUMNS
  const cellHeight = (A4_HEIGHT - PAGE_MARGIN * 2) / GRID_ROWS
  const qrSize = Math.min(
    MAX_QR_SIZE,
    cellWidth - 20,
    cellHeight - (TEXT_SIZE + TEXT_MARGIN * 2 + 10)
  )

  for (let i = 0; i < codes.length; i++) {
    const pageIndex = Math.floor(i / (GRID_COLUMNS * GRID_ROWS))
    const indexInPage = i % (GRID_COLUMNS * GRID_ROWS)

    if (indexInPage === 0) {
      pdfDoc.addPage([A4_WIDTH, A4_HEIGHT])
    }

    const page = pdfDoc.getPage(pageIndex)
    const row = Math.floor(indexInPage / GRID_COLUMNS)
    const col = indexInPage % GRID_COLUMNS
    const cellLeft = PAGE_MARGIN + col * cellWidth
    const cellTop = A4_HEIGHT - PAGE_MARGIN - row * cellHeight

    const code = codes[i]
    const dataUrl = await QRCode.toDataURL(code, {
      width: 300,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    })
    const pngBytes = Buffer.from(dataUrl.split(',')[1], 'base64')
    const pngImage = await pdfDoc.embedPng(pngBytes)

    const qrX = cellLeft + (cellWidth - qrSize) / 2
    const qrY = cellTop - TEXT_MARGIN - qrSize
    page.drawImage(pngImage, { x: qrX, y: qrY, width: qrSize, height: qrSize })

    const textWidth = font.widthOfTextAtSize(code, TEXT_SIZE)
    const textX = cellLeft + (cellWidth - textWidth) / 2
    const textY = qrY - TEXT_MARGIN - TEXT_SIZE
    page.drawText(code, { x: textX, y: textY, size: TEXT_SIZE, font })
  }

  const pdfBytes = await pdfDoc.save()

  const outputDir = join(getUserDataPath(), 'print-batches')
  mkdirSync(outputDir, { recursive: true })

  const pdfPath = join(outputDir, `GymFlow-Cards-${from}-to-${to}.pdf`)
  writeFileSync(pdfPath, pdfBytes)

  const csvPath = join(outputDir, `GymFlow-Cards-${from}-to-${to}.csv`)
  const csvContent = ['card_code', ...codes].join('\n')
  writeFileSync(csvPath, csvContent, 'utf8')

  return { pdfPath, csvPath }
}
