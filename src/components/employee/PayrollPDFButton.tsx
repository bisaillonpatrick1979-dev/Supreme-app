'use client'

import { Download } from 'lucide-react'

interface PayslipData {
  employeeName: string
  employeeType: string
  period: string
  hourlyRate: number | null
  monthHours: number
  monthOT: number
  monthGross: number
  deductions: {
    federal_tax: number
    provincial_tax: number
    ei: number
    qpp: number
    total: number
  }
  monthNet: number
  ytdGross: number
  ytdHours: number
}

export function PayrollPDFButton({ data }: { data: PayslipData }) {
  const handleDownload = async () => {
    const jsPDF = (await import('jspdf')).default
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const W = 210
    const margin = 20

    // Header
    doc.setFillColor(255, 140, 0)
    doc.rect(0, 0, W, 28, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('HAILITE XTERIORS', margin, 13)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Relevé de paie', margin, 21)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('BULLETIN DE PAIE', W - margin, 13, { align: 'right' })
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(data.period, W - margin, 21, { align: 'right' })

    let y = 38
    const col2 = W / 2

    // Employee info
    doc.setFillColor(245, 245, 250)
    doc.rect(margin, y, W - margin * 2, 18, 'F')
    doc.setTextColor(100, 100, 115)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text('EMPLOYÉ', margin + 4, y + 5)
    doc.text('TYPE', col2, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(25, 25, 35)
    doc.setFontSize(10)
    doc.text(data.employeeName, margin + 4, y + 13)
    doc.text(
      data.employeeType === 'salaried' ? 'Salarié' : `Horaire — ${new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(data.hourlyRate ?? 0)}/h`,
      col2, y + 13
    )
    y += 26

    const money = (n: number) => new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(n)

    // Section title helper
    const section = (title: string) => {
      doc.setFillColor(255, 140, 0)
      doc.rect(margin, y, W - margin * 2, 7, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.text(title, margin + 3, y + 4.5)
      y += 10
    }

    // Row helper
    const row = (label: string, value: string, bold = false, color?: [number, number, number]) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal')
      doc.setFontSize(9)
      doc.setTextColor(color ? color[0] : 60, color ? color[1] : 60, color ? color[2] : 70)
      doc.text(label, margin + 3, y)
      doc.setTextColor(color ? color[0] : 25, color ? color[1] : 25, color ? color[2] : 35)
      doc.text(value, W - margin - 3, y, { align: 'right' })
      y += 7
    }

    // Hours
    section('HEURES TRAVAILLÉES')
    row('Heures régulières', `${(data.monthHours - data.monthOT).toFixed(2)} h`)
    row('Heures supplémentaires (×1.5)', `${data.monthOT.toFixed(2)} h`)
    row('Total heures', `${data.monthHours.toFixed(2)} h`, true)
    y += 2

    // Earnings
    section('GAINS BRUTS')
    row('Salaire brut', money(data.monthGross), true)
    y += 2

    // Deductions
    section('RETENUES')
    row('Impôt fédéral', money(data.deductions.federal_tax))
    row('Impôt provincial (QC)', money(data.deductions.provincial_tax))
    row("Assurance-emploi (AE)", money(data.deductions.ei))
    row('Régime de rentes (RRQ)', money(data.deductions.qpp))
    row('Total retenues', money(data.deductions.total), true, [200, 50, 50])
    y += 4

    // Net pay (highlighted)
    doc.setFillColor(16, 185, 129)
    doc.roundedRect(margin, y, W - margin * 2, 14, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('SALAIRE NET', margin + 4, y + 9)
    doc.text(money(data.monthNet), W - margin - 3, y + 9, { align: 'right' })
    y += 22

    // YTD
    section('CUMUL ANNUEL (DEPUIS JANVIER)')
    row('Heures travaillées', `${data.ytdHours.toFixed(2)} h`)
    row('Gains bruts cumulatifs', money(data.ytdGross))

    // Footer
    doc.setDrawColor(200, 200, 210)
    doc.setLineWidth(0.3)
    doc.line(margin, 282, W - margin, 282)
    doc.setTextColor(160, 160, 170)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(
      'Ce relevé est généré automatiquement par HailiteManager. Pour toute question, contactez votre administrateur.',
      W / 2, 286, { align: 'center' }
    )

    doc.save(`Releve_paye_${data.employeeName.replace(/\s+/g, '_')}_${data.period.replace(/\s+/g, '_')}.pdf`)
  }

  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
      style={{
        background: 'rgb(var(--color-primary-muted))',
        color: 'rgb(var(--color-primary))',
        border: '1px solid rgb(var(--color-primary) / 0.3)',
      }}
    >
      <Download className="w-4 h-4" />
      Télécharger relevé
    </button>
  )
}
