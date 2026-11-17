import { describe, expect, it } from "vitest"
import { NextRequest } from "next/server"
import {
  filterPayments,
  parseFilters,
  sortPayments,
  totalPayments,
} from "@/data/queries"
import { GET } from "./route"

const exportCsv = (query: string) =>
  GET(new NextRequest(`http://localhost/api/payments/export?${query}`))

const rowsOf = async (response: Response) =>
  (await response.text()).split("\n").slice(1)

describe("GET /api/payments/export", () => {
  it("rejects an empty or unknown column list with a 400", async () => {
    for (const query of ["columns=", "columns=id,password"]) {
      const response = await exportCsv(query)
      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({
        error: "Choose at least one valid column.",
      })
    }
  })

  it("leaves out the card last four when no columns are given", async () => {
    const response = await exportCsv("status=disputed")
    const header = (await response.text()).split("\n")[0]
    expect(header.split(",")).not.toContain("last4")
  })

  it("names the status in the filename for a filtered export", async () => {
    const response = await exportCsv("status=disputed&columns=id")
    expect(response.headers.get("content-disposition")).toMatch(
      /filename="payments-disputed-\d{4}-\d{2}-\d{2}\.csv"/,
    )
  })

  it("exports every payment for scope=all, ignoring filters", async () => {
    const response = await exportCsv("scope=all&status=disputed&columns=id")
    expect(await rowsOf(response)).toHaveLength(totalPayments())
    expect(response.headers.get("content-disposition")).toContain("payments-all-")
  })

  it("keeps the requested sort order for scope=all", async () => {
    const response = await exportCsv("scope=all&status=disputed&sort=amount&direction=asc&columns=id")
    const expected = sortPayments(
      filterPayments(parseFilters(new URLSearchParams())),
      "amount",
      "asc",
    ).map((payment) => payment.id)
    expect(await rowsOf(response)).toEqual(expected)
  })
})
