// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"

Element.prototype.scrollIntoView = vi.fn()

const mockFetch = vi.fn()
global.fetch = mockFetch

describe("CustomerChatWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ response: "How can I help?" }),
    })
  })

  it("renders a floating chat button", async () => {
    const { CustomerChatWidget } = await import("@/components/customer-chat-widget")
    render(<CustomerChatWidget />)
    expect(screen.getByRole("button", { name: /chat/i })).toBeInTheDocument()
  })

  it("opens chat panel when button is clicked", async () => {
    const user = userEvent.setup()
    const { CustomerChatWidget } = await import("@/components/customer-chat-widget")
    render(<CustomerChatWidget />)

    await user.click(screen.getByRole("button", { name: /chat/i }))
    expect(screen.getByPlaceholderText(/message/i)).toBeInTheDocument()
  })

  it("shows Sentinel agent greeting", async () => {
    const user = userEvent.setup()
    const { CustomerChatWidget } = await import("@/components/customer-chat-widget")
    render(<CustomerChatWidget />)

    await user.click(screen.getByRole("button", { name: /chat/i }))
    expect(screen.getByText(/help/i)).toBeInTheDocument()
  })

  it("sends message to Sentinel agent endpoint", async () => {
    const user = userEvent.setup()
    const { CustomerChatWidget } = await import("@/components/customer-chat-widget")
    render(<CustomerChatWidget />)

    await user.click(screen.getByRole("button", { name: /chat/i }))
    const input = screen.getByPlaceholderText(/message/i)
    await user.type(input, "What is my booking status?")
    await user.click(screen.getByRole("button", { name: /send/i }))

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/agents/chat",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("SENTINEL_CS"),
      })
    )
  })
})
