import jsPDF from 'jspdf'

export interface PDFDocumentData {
  type: 'invoice' | 'quote'
  number: string
  issue_date: string
  due_date?: string | null
  expiry_date?: string | null
  client: {
    name: string
    address?: string | null
    city?: string | null
    province?: string | null
    email?: string | null
    phone?: string | null
  }
  project?: string | null
  items: Array<{
    description: string
    quantity: number
    unit: string
    unit_price: number
    total: number
  }>
  subtotal: number
  tax_gst: number
  tax_qst: number
  total: number
  notes?: string | null
  terms?: string | null
}

function money(amount: number): string {
  return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(amount)
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-CA', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

export function generatePDF(data: PDFDocumentData): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const margin = 15
  const cW = W - margin * 2

  // ── Header ─────────────────────────────────────────────────
  doc.setFillColor(255, 140, 0)
  doc.rect(0, 0, W, 32, 'F')

  // Logo box (darker orange)
  doc.setFillColor(220, 115, 0)
  doc.roundedRect(margin, 7, 17, 17, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('HX', margin + 8.5, 18.5, { align: 'center' })

  // Company name
  doc.setFontSize(15)
  doc.text('HAILITE XTERIORS', margin + 22, 15)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Revêtement & Toiture — Rive-Sud', margin + 22, 21)

  // Document type
  const docLabel = data.type === 'invoice' ? 'FACTURE' : 'SOUMISSION'
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(docLabel, W - margin, 14, { align: 'right' })
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`N° ${data.number}`, W - margin, 22, { align: 'right' })

  // ── Billing info ──────────────────────────────────────────
  let y = 42

  // Left: client
  doc.setTextColor(120, 120, 130)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.text('FACTURÉ À', margin, y)

  // Right: document details
  const rightX = margin + cW * 0.58
  doc.text(data.type === 'invoice' ? 'DÉTAILS FACTURE' : 'DÉTAILS SOUMISSION', rightX, y)

  y += 5
  doc.setTextColor(25, 25, 35)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(data.client.name, margin, y)

  // Details right column
  let detailY = y
  const detailItems: [string, string][] = [
    ['Date:', fmtDate(data.issue_date)],
  ]
  if (data.due_date) detailItems.push(['Échéance:', fmtDate(data.due_date)])
  if (data.expiry_date) detailItems.push(['Valide jusqu\'au:', fmtDate(data.expiry_date)])
  if (data.project) detailItems.push(['Chantier:', data.project])

  detailItems.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 130)
    doc.text(label, rightX, detailY)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(25, 25, 35)
    doc.text(value, rightX + 32, detailY)
    detailY += 5
  })

  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 70)
  const clientLines = [
    data.client.address,
    [data.client.city, data.client.province].filter(Boolean).join(', '),
    data.client.email,
    data.client.phone,
  ].filter(Boolean) as string[]
  clientLines.forEach(line => { doc.text(line, margin, y); y += 4.5 })

  y = Math.max(y, detailY) + 8

  // ── Divider ───────────────────────────────────────────────
  doc.setDrawColor(255, 140, 0)
  doc.setLineWidth(0.4)
  doc.line(margin, y, W - margin, y)
  y += 5

  // ── Line items table ──────────────────────────────────────
  // Header
  doc.setFillColor(245, 245, 250)
  doc.rect(margin, y, cW, 7, 'F')
  doc.setTextColor(100, 100, 115)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  const colDesc = margin + 2
  const colQty = margin + cW * 0.58
  const colUnit = margin + cW * 0.67
  const colUP = margin + cW * 0.82
  const colTotal = margin + cW
  doc.text('DESCRIPTION', colDesc, y + 4.5)
  doc.text('QTÉ', colQty, y + 4.5, { align: 'right' })
  doc.text('UNITÉ', colUnit + 5, y + 4.5, { align: 'center' })
  doc.text('P.U.', colUP, y + 4.5, { align: 'right' })
  doc.text('TOTAL', colTotal, y + 4.5, { align: 'right' })
  y += 9

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  data.items.forEach((item, i) => {
    if (i % 2 === 1) {
      doc.setFillColor(250, 250, 253)
      doc.rect(margin, y - 3, cW, 8, 'F')
    }
    doc.setTextColor(25, 25, 35)
    const desc = doc.splitTextToSize(item.description, cW * 0.55)
    const rowH = desc.length > 1 ? desc.length * 4 + 2 : 8
    doc.text(desc, colDesc, y + 1.5)
    doc.text(item.quantity.toString(), colQty, y + 1.5, { align: 'right' })
    doc.text(item.unit, colUnit + 5, y + 1.5, { align: 'center' })
    doc.text(money(item.unit_price), colUP, y + 1.5, { align: 'right' })
    doc.text(money(item.total), colTotal, y + 1.5, { align: 'right' })
    y += rowH
  })

  y += 4
  doc.setDrawColor(230, 230, 240)
  doc.setLineWidth(0.2)
  doc.line(margin, y, W - margin, y)
  y += 6

  // ── Totals ────────────────────────────────────────────────
  const totX = W - margin - 75
  const valX = W - margin

  const totRows: [string, string][] = [
    ['Sous-total', money(data.subtotal)],
    ['TPS (5 %)', money(data.tax_gst)],
    ['TVQ (9,975 %)', money(data.tax_qst)],
  ]
  totRows.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 115)
    doc.text(label, totX, y)
    doc.setTextColor(25, 25, 35)
    doc.text(val, valX, y, { align: 'right' })
    y += 6
  })

  y += 2
  doc.setFillColor(255, 140, 0)
  doc.roundedRect(totX - 4, y - 4, W - margin - totX + 4, 10, 1.5, 1.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255)
  doc.text('TOTAL', totX, y + 2.5)
  doc.text(money(data.total), valX, y + 2.5, { align: 'right' })
  y += 15

  // ── Notes & Terms ─────────────────────────────────────────
  const addSection = (title: string, text: string) => {
    if (y > 260) return
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 130)
    doc.text(title, margin, y)
    y += 4
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(60, 60, 70)
    const lines = doc.splitTextToSize(text, cW)
    doc.text(lines, margin, y)
    y += lines.length * 4 + 6
  }

  if (data.notes) addSection('NOTES', data.notes)
  if (data.terms) addSection('CONDITIONS DE PAIEMENT', data.terms)

  // ── Footer ────────────────────────────────────────────────
  doc.setDrawColor(255, 140, 0)
  doc.setLineWidth(0.3)
  doc.line(margin, 288, W - margin, 288)
  doc.setTextColor(150, 150, 160)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text(
    'Hailite Xteriors Inc.  •  hailiteexteriors@gmail.com  •  Merci de votre confiance!',
    W / 2, 292, { align: 'center' }
  )

  const filename = `${data.type === 'invoice' ? 'Facture' : 'Soumission'}_${data.number}.pdf`
  doc.save(filename)
}
