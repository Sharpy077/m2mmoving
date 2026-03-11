// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...filterProps(props)}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...filterProps(props)}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Filter out framer-motion-specific props
function filterProps(props: Record<string, any>) {
  const filtered = { ...props }
  delete filtered.initial
  delete filtered.animate
  delete filtered.exit
  delete filtered.transition
  delete filtered.whileHover
  delete filtered.whileTap
  return filtered
}

vi.mock("@/lib/agents", () => ({
  AGENT_REGISTRY: {
    MAYA: { name: "Maya", codename: "MAYA_SALES", category: "sales", description: "AI Sales Agent" },
    SENTINEL: { name: "Sentinel", codename: "SENTINEL_CS", category: "support", description: "AI Support Agent" },
    HUNTER: { name: "Hunter", codename: "HUNTER_LG", category: "lead_gen", description: "AI Lead Gen Agent" },
  },
}))

describe("AgentDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the command center title", async () => {
    const { AgentDashboard } = await import("@/components/admin/agent-dashboard")
    render(<AgentDashboard />)
    expect(screen.getByText("AI Salesforce Command Center")).toBeInTheDocument()
  })

  it("renders agent fleet section", async () => {
    const { AgentDashboard } = await import("@/components/admin/agent-dashboard")
    render(<AgentDashboard />)
    expect(screen.getByText("Agent Fleet")).toBeInTheDocument()
  })

  it("renders live activity section", async () => {
    const { AgentDashboard } = await import("@/components/admin/agent-dashboard")
    render(<AgentDashboard />)
    expect(screen.getByText("Live Activity")).toBeInTheDocument()
  })

  it("renders agents from registry", async () => {
    const { AgentDashboard } = await import("@/components/admin/agent-dashboard")
    render(<AgentDashboard />)
    expect(screen.getAllByText("Maya").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("Sentinel").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("Hunter").length).toBeGreaterThanOrEqual(1)
  })

  it("renders key metrics cards", async () => {
    const { AgentDashboard } = await import("@/components/admin/agent-dashboard")
    render(<AgentDashboard />)
    expect(screen.getByText("Total Conversations")).toBeInTheDocument()
    expect(screen.getByText("Success Rate")).toBeInTheDocument()
    expect(screen.getByText("Quotes Generated")).toBeInTheDocument()
  })

  it("has live/paused toggle button", async () => {
    const { AgentDashboard } = await import("@/components/admin/agent-dashboard")
    render(<AgentDashboard />)
    expect(screen.getByText("Live")).toBeInTheDocument()
  })

  it("toggles between live and paused", async () => {
    const user = userEvent.setup()
    const { AgentDashboard } = await import("@/components/admin/agent-dashboard")
    render(<AgentDashboard />)

    const liveButton = screen.getByText("Live")
    await user.click(liveButton)
    expect(screen.getByText("Paused")).toBeInTheDocument()
  })
})
