// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"

// Polyfill scrollIntoView for jsdom
Element.prototype.scrollIntoView = vi.fn()

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const filtered = { ...props }
      delete filtered.initial
      delete filtered.animate
      delete filtered.exit
      delete filtered.transition
      return <div {...filtered}>{children}</div>
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

import { AgentChat } from "@/components/admin/agent-chat"

describe("AgentChat", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ response: "Hello from Maya!" }),
    })
  })

  it("renders the chat interface for the selected agent", () => {
    render(<AgentChat agentCodename="MAYA_SALES" agentName="Maya" />)
    expect(screen.getByText("Maya")).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/message/i)).toBeInTheDocument()
  })

  it("renders send button", () => {
    render(<AgentChat agentCodename="MAYA_SALES" agentName="Maya" />)
    expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument()
  })

  it("sends a message when the user types and clicks send", async () => {
    const user = userEvent.setup()
    render(<AgentChat agentCodename="MAYA_SALES" agentName="Maya" />)

    const input = screen.getByPlaceholderText(/message/i)
    await user.type(input, "How many quotes today?")
    await user.click(screen.getByRole("button", { name: /send/i }))

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/agents/chat",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("How many quotes today?"),
      })
    )
  })

  it("displays user message in chat history", async () => {
    const user = userEvent.setup()
    render(<AgentChat agentCodename="SENTINEL_CS" agentName="Sentinel" />)

    const input = screen.getByPlaceholderText(/message/i)
    await user.type(input, "Check booking status")
    await user.click(screen.getByRole("button", { name: /send/i }))

    expect(screen.getByText("Check booking status")).toBeInTheDocument()
  })

  it("clears input after sending", async () => {
    const user = userEvent.setup()
    render(<AgentChat agentCodename="MAYA_SALES" agentName="Maya" />)

    const input = screen.getByPlaceholderText(/message/i) as HTMLInputElement
    await user.type(input, "Test message")
    await user.click(screen.getByRole("button", { name: /send/i }))

    expect(input.value).toBe("")
  })

  it("shows agent codename in the header", () => {
    render(<AgentChat agentCodename="HUNTER_LG" agentName="Hunter" />)
    expect(screen.getByText("HUNTER_LG")).toBeInTheDocument()
  })
})
