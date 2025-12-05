import React, { type ReactNode } from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, beforeEach, vi } from "vitest"

import { QuoteBuilder } from "@/components/quote-builder"
import { submitLead } from "@/app/actions/leads"
import { createDepositCheckoutSession } from "@/app/actions/stripe"

process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = ""

vi.mock("@/app/actions/leads", () => ({
  submitLead: vi.fn(),
}))

vi.mock("@/app/actions/stripe", () => ({
  createDepositCheckoutSession: vi.fn(),
  markDepositPaid: vi.fn(),
}))

vi.mock("@stripe/react-stripe-js", () => ({
  EmbeddedCheckoutProvider: ({ children }: { children: ReactNode }) => (
    <div data-testid="embedded-checkout">{children}</div>
  ),
  EmbeddedCheckout: () => <div data-testid="embedded-checkout-form" />,
}))

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: vi.fn().mockResolvedValue({}),
}))

describe("QuoteBuilder", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("allows users to complete the instant quote flow", async () => {
    const user = userEvent.setup()
    vi.mocked(submitLead).mockResolvedValueOnce({ success: true, lead: { id: "lead_123" } })

    render(<QuoteBuilder />)

    await user.click(screen.getByRole("button", { name: /office relocation/i }))
    await user.click(screen.getByRole("button", { name: /continue/i }))

    await user.type(screen.getByPlaceholderText(/melbourne cbd/i), "Melbourne CBD")
    await user.type(screen.getByPlaceholderText(/richmond/i), "Richmond")
    await user.type(screen.getByPlaceholderText(/e\.g\.\s*15/i), "15")

    await user.click(screen.getByRole("button", { name: /continue/i }))

    await user.type(screen.getByPlaceholderText(/you@company\.com/i), "ops@acme.com")
    await user.type(screen.getByPlaceholderText(/04XX XXX XXX/i), "0412345678")
    await user.type(screen.getByPlaceholderText(/John Smith/i), "Alex Operations")
    await user.type(screen.getByPlaceholderText(/Acme Pty Ltd/i), "Acme Pty Ltd")

    await user.click(screen.getByRole("button", { name: /confirm & book/i }))

    await waitFor(() => {
      expect(submitLead).toHaveBeenCalled()
    })

    expect(submitLead).toHaveBeenCalledWith(
      expect.objectContaining({
        lead_type: "instant_quote",
        email: "ops@acme.com",
        contact_name: "Alex Operations",
        company_name: "Acme Pty Ltd",
        origin_suburb: "Melbourne CBD",
        destination_suburb: "Richmond",
        distance_km: 15,
        square_meters: 100,
        estimated_total: 7120,
      }),
    )

    expect(await screen.findByText(/Quote Submitted/i)).toBeInTheDocument()
  })

  it("prevents confirmation until a contact email is provided", async () => {
    const user = userEvent.setup()
    render(<QuoteBuilder />)

    await user.click(screen.getByRole("button", { name: /office relocation/i }))
    await user.click(screen.getByRole("button", { name: /continue/i }))
    await user.click(screen.getByRole("button", { name: /continue/i }))

    const confirmButton = screen.getByRole("button", { name: /confirm & book/i })
    expect(confirmButton).toBeDisabled()
  })

  it("surfaces a safe error when Stripe deposits are unavailable", async () => {
    const user = userEvent.setup()
    vi.mocked(submitLead).mockResolvedValueOnce({ success: true, lead: { id: "lead_deposit" } })

    render(<QuoteBuilder />)

    await user.click(screen.getByRole("button", { name: /office relocation/i }))
    await user.click(screen.getByRole("button", { name: /continue/i }))
    await user.click(screen.getByRole("button", { name: /continue/i }))

    await user.type(screen.getByPlaceholderText(/you@company\.com/i), "ops@acme.com")
    await user.click(screen.getByRole("button", { name: /confirm & book/i }))
    await screen.findByText(/Quote Submitted/i)

    await user.click(screen.getByRole("button", { name: /pay deposit now/i }))

    expect(createDepositCheckoutSession).not.toHaveBeenCalled()
    expect(
      await screen.findByText(/Online payments are not configured yet\. Please contact our team to pay the deposit\./i),
    ).toBeInTheDocument()
  })
})
