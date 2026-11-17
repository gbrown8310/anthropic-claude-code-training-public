"use client"

import { Button } from "@/components/Button"
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/Drawer"
import type { ExportColumn } from "@/lib/csv"
import { Download } from "lucide-react"
import { useState } from "react"

const COLUMN_LABELS: Record<ExportColumn, string> = {
  id: "Payment ID",
  created_at: "Created at (UTC)",
  merchant: "Merchant",
  description: "Description",
  status: "Status",
  method: "Method",
  card_brand: "Card brand",
  last4: "Card last four",
  amount: "Amount",
  currency: "Currency",
}

type Scope = "filtered" | "all"

export function ExportDialog({
  columns,
  defaultColumns,
  query,
  filteredCount,
  totalCount,
}: {
  columns: readonly ExportColumn[]
  defaultColumns: readonly ExportColumn[]
  /** The page's current filter params, passed through to the route. */
  query: string
  filteredCount: number
  totalCount: number
}) {
  const [selected, setSelected] = useState<Set<ExportColumn>>(
    () => new Set(defaultColumns),
  )
  const [scope, setScope] = useState<Scope>("filtered")
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rowCount = scope === "all" ? totalCount : filteredCount
  // Keep the file's column order stable regardless of click order.
  const chosen = columns.filter((column) => selected.has(column))

  const href = (() => {
    const params = new URLSearchParams(query)
    params.set("scope", scope)
    params.set("columns", chosen.join(","))
    return `/api/payments/export?${params.toString()}`
  })()

  const toggle = (column: ExportColumn) => {
    setError(null)
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(column)) next.delete(column)
      else next.add(column)
      return next
    })
  }

  const downloadLabel = `Download ${rowCount.toLocaleString()} ${rowCount === 1 ? "row" : "rows"}`
  const canDownload = chosen.length > 0 && rowCount > 0 && !downloading

  // Fetch rather than a plain link, so a failed export shows a message
  // instead of saving the error body as a file.
  const download = async () => {
    setError(null)
    setDownloading(true)
    try {
      const response = await fetch(href)
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        setError(body?.error ?? "The export failed. Try again.")
        return
      }
      const disposition = response.headers.get("content-disposition") ?? ""
      const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? "payments.csv"
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      setError("The export failed. Check your connection and try again.")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="secondary" className="w-full gap-2 py-1.5 sm:w-fit">
          <Download
            className="-ml-0.5 size-4 shrink-0 text-gray-400 dark:text-gray-600"
            aria-hidden="true"
          />
          Export
        </Button>
      </DrawerTrigger>
      <DrawerContent className="sm:max-w-md">
        <DrawerHeader>
          <DrawerTitle>Export payments</DrawerTitle>
          <DrawerDescription>
            Choose what goes into the CSV before you download it.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="space-y-6">
          <fieldset>
            <legend className="text-sm font-medium text-gray-900 dark:text-gray-50">
              Scope
            </legend>
            <div className="mt-2 space-y-2">
              {(
                [
                  ["filtered", "Current filter", filteredCount],
                  ["all", "All payments", totalCount],
                ] as const
              ).map(([value, label, count]) => (
                <label
                  key={value}
                  className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <input
                    type="radio"
                    name="export-scope"
                    value={value}
                    checked={scope === value}
                    onChange={() => {
                      setError(null)
                      setScope(value)
                    }}
                    className="size-4 accent-blue-600"
                  />
                  {label}
                  <span className="text-gray-500">
                    ({count.toLocaleString()} rows)
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium text-gray-900 dark:text-gray-50">
              Columns
            </legend>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {columns.map((column) => (
                <label
                  key={column}
                  className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(column)}
                    onChange={() => toggle(column)}
                    className="size-4 accent-blue-600"
                  />
                  {COLUMN_LABELS[column]}
                </label>
              ))}
            </div>
            {chosen.length === 0 && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-500">
                Select at least one column to download.
              </p>
            )}
          </fieldset>
          {rowCount === 0 && (
            <p className="text-sm text-gray-500">
              No payments in this scope, so there is nothing to export.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-500">
              {error}
            </p>
          )}
        </DrawerBody>
        <DrawerFooter>
          <Button
            variant="primary"
            className="py-1.5"
            disabled={!canDownload}
            isLoading={downloading}
            onClick={download}
          >
            {downloadLabel}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
