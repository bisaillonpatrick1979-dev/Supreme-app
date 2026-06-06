// Payroll calculation utilities for Quebec, Canada

const OVERTIME_THRESHOLD_DAILY = 8   // hours/day
const OVERTIME_THRESHOLD_WEEKLY = 40 // hours/week
const OVERTIME_MULTIPLIER = 1.5

// Quebec 2024 tax rates (simplified)
const QC_FEDERAL_TAX_RATES = [
  { min: 0, max: 57375, rate: 0.15 },
  { min: 57375, max: 114750, rate: 0.205 },
  { min: 114750, max: 158519, rate: 0.26 },
  { min: 158519, max: 220000, rate: 0.29 },
  { min: 220000, max: Infinity, rate: 0.33 },
]

const QC_PROVINCIAL_TAX_RATES = [
  { min: 0, max: 51780, rate: 0.14 },
  { min: 51780, max: 103545, rate: 0.19 },
  { min: 103545, max: 126000, rate: 0.24 },
  { min: 126000, max: Infinity, rate: 0.2575 },
]

const EI_RATE_EMPLOYEE = 0.0166
const EI_MAX_INSURABLE = 63200
const EI_MAX_PREMIUM = 1049.12

const QPP_RATE = 0.054
const QPP_EXEMPTION = 3500
const QPP_MAX_EARNINGS = 68500

export function calculateOvertimeHours(
  regularHours: number,
  weeklyHours: number
): { regular: number; overtime: number } {
  const dailyOvertime = Math.max(0, regularHours - OVERTIME_THRESHOLD_DAILY)
  const weeklyOvertime = Math.max(0, weeklyHours - OVERTIME_THRESHOLD_WEEKLY)
  const overtime = Math.max(dailyOvertime, weeklyOvertime)
  const regular = regularHours - overtime
  return { regular, overtime }
}

export function calculateGrossPay(
  regularHours: number,
  overtimeHours: number,
  hourlyRate: number
): number {
  const regular = regularHours * hourlyRate
  const overtime = overtimeHours * hourlyRate * OVERTIME_MULTIPLIER
  return Math.round((regular + overtime) * 100) / 100
}

export function estimateTax(annualIncome: number, rates: typeof QC_FEDERAL_TAX_RATES): number {
  let tax = 0
  for (const bracket of rates) {
    if (annualIncome <= bracket.min) break
    const taxable = Math.min(annualIncome, bracket.max) - bracket.min
    tax += taxable * bracket.rate
  }
  return tax
}

export function calculateDeductions(grossPay: number, annualGross: number): {
  federal_tax: number
  provincial_tax: number
  ei: number
  qpp: number
  total: number
} {
  const federalTax = estimateTax(annualGross, QC_FEDERAL_TAX_RATES) / 26
  const provincialTax = estimateTax(annualGross, QC_PROVINCIAL_TAX_RATES) / 26

  const eiInsurable = Math.min(grossPay, (EI_MAX_INSURABLE / 26))
  const ei = Math.min(eiInsurable * EI_RATE_EMPLOYEE, EI_MAX_PREMIUM / 26)

  const qppEarnings = Math.max(0, Math.min(annualGross, QPP_MAX_EARNINGS) - QPP_EXEMPTION) / 26
  const qpp = qppEarnings * QPP_RATE

  const payPeriodFederal = Math.round((federalTax * (grossPay / (annualGross / 26))) * 100) / 100
  const payPeriodProvincial = Math.round((provincialTax * (grossPay / (annualGross / 26))) * 100) / 100
  const eiRounded = Math.round(ei * 100) / 100
  const qppRounded = Math.round(qpp * 100) / 100

  return {
    federal_tax: payPeriodFederal,
    provincial_tax: payPeriodProvincial,
    ei: eiRounded,
    qpp: qppRounded,
    total: payPeriodFederal + payPeriodProvincial + eiRounded + qppRounded,
  }
}

export function calculateNetPay(grossPay: number, totalDeductions: number): number {
  return Math.max(0, Math.round((grossPay - totalDeductions) * 100) / 100)
}

// Tax rates for Quebec (GST + QST)
export const TAX_RATES = {
  GST: 0.05,
  QST: 0.09975,
} as const

export function calculateTaxes(subtotal: number): { gst: number; qst: number; total: number } {
  const gst = Math.round(subtotal * TAX_RATES.GST * 100) / 100
  const qst = Math.round(subtotal * TAX_RATES.QST * 100) / 100
  return { gst, qst, total: subtotal + gst + qst }
}
