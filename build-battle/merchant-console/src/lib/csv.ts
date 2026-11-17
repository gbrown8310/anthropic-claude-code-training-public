import { merchantById } from "@/data/merchants"
import { Payment } from "@/data/types"
import { formatMoney } from "./money"

/**
 * CSV export for the payments table.
 *
 * Ops chooses the columns (NWP-101). The card last four is off unless
 * someone asks for it, because these files go to merchants.
 */

export const EXPORT_COLUMNS = [
  "id",
  "created_at",
  "merchant",
  "description",
  "status",
  "method",
  "card_brand",
  "last4",
  "amount",
  "currency",
] as const

export type ExportColumn = (typeof EXPORT_COLUMNS)[number]

/** What ships when nobody chose: everything except the card last four. */
export const DEFAULT_EXPORT_COLUMNS: readonly ExportColumn[] = EXPORT_COLUMNS.filter(
  (column) => column !== "last4",
)

/**
 * Column names arrive from the client, so they are checked against
 * EXPORT_COLUMNS and nothing else. Absent means the default set; an empty
 * list or any unknown name is rejected (null) rather than silently dropped.
 */
export function parseExportColumns(value: string | null): ExportColumn[] | null {
  if (value === null) return [...DEFAULT_EXPORT_COLUMNS]

  const requested = value
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
  if (requested.length === 0) return null
  if (!requested.every((name) => EXPORT_COLUMNS.includes(name as ExportColumn))) {
    return null
  }
  return [...new Set(requested)] as ExportColumn[]
}

function escapeCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function cell(payment: Payment, column: ExportColumn): string {
  switch (column) {
    case "id":
      return payment.id
    case "created_at":
      return payment.createdAt
    case "merchant":
      return merchantById(payment.merchantId)?.name ?? payment.merchantId
    case "description":
      return payment.description
    case "status":
      return payment.status
    case "method":
      return payment.method
    case "card_brand":
      return payment.cardBrand ?? ""
    case "last4":
      return payment.last4 ?? ""
    case "amount":
      return formatMoney(payment.amount, payment.currency)
    case "currency":
      return payment.currency
  }
}

export function toCsv(
  payments: Payment[],
  columns: readonly ExportColumn[] = EXPORT_COLUMNS,
): string {
  const header = columns.join(",")
  const rows = payments.map((payment) =>
    columns.map((column) => escapeCell(cell(payment, column))).join(","),
  )
  return [header, ...rows].join("\n")
}

/** `scope` must come from an allowlist; it is written into the filename as is. */
export function exportFilename(date = new Date(), scope?: string): string {
  const prefix = scope ? `payments-${scope}` : "payments"
  return `${prefix}-${date.toISOString().slice(0, 10)}.csv`
}
