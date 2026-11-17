import { filterPayments, parseFilters, sortPayments } from "@/data/queries"
import { exportFilename, parseExportColumns, toCsv } from "@/lib/csv"
import { NextRequest, NextResponse } from "next/server"

function sortOnly(params: URLSearchParams): URLSearchParams {
  const kept = new URLSearchParams()
  for (const key of ["sort", "direction"]) {
    const value = params.get(key)
    if (value) kept.set(key, value)
  }
  return kept
}

/**
 * Exports the payments table as CSV.
 *
 * Scope is the current filter (default) or all payments; columns are checked
 * against the allowlist in csv.ts. Every matching row ships, not one page.
 */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams

  const columns = parseExportColumns(params.get("columns"))
  if (!columns) {
    return NextResponse.json(
      { error: "Choose at least one valid column." },
      { status: 400 },
    )
  }

  // "All payments" drops the filters but keeps the order the user is viewing.
  const scopeAll = params.get("scope") === "all"
  const filters = parseFilters(scopeAll ? sortOnly(params) : params)
  const rows = sortPayments(
    filterPayments(filters),
    filters.sort,
    filters.direction,
  )

  // Both labels come from allowlists: "all", "filtered", or a parsed status.
  const scopeLabel = scopeAll
    ? "all"
    : filters.status && filters.status !== "all"
      ? filters.status
      : "filtered"

  return new Response(toCsv(rows, columns), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${exportFilename(new Date(), scopeLabel)}"`,
    },
  })
}
