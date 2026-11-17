import { describe, expect, it } from "vitest"
import { sortPayments } from "./queries"
import { Payment } from "./types"

const withAmount = (id: string, amount: number): Payment => ({
  id,
  merchantId: "mch_01",
  amount,
  currency: "USD",
  status: "captured",
  method: "card",
  cardBrand: "visa",
  last4: "4242",
  createdAt: "2026-03-14T10:15:00.000Z",
  description: "Order",
})

describe("sortPayments", () => {
  it("sorts amounts as numbers, not text", () => {
    const payments = [withAmount("a", 48000), withAmount("b", 9000), withAmount("c", 100000)]
    expect(sortPayments(payments, "amount", "asc").map((p) => p.amount)).toEqual([
      9000, 48000, 100000,
    ])
    expect(sortPayments(payments, "amount", "desc").map((p) => p.amount)).toEqual([
      100000, 48000, 9000,
    ])
  })
})
