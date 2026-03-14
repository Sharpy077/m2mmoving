import { describe, expect, it, vi } from "vitest"

describe("suppress-baseline-warning", () => {
  it("filters only baseline-browser-mapping stale-data warnings", () => {
    const originalWarn = console.warn
    const warnSpy = vi.fn()

    console.warn = warnSpy
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("../scripts/suppress-baseline-warning.cjs")

    console.warn("[baseline-browser-mapping] The data in this module is over two months old.  To ensure accurate Baseline data, please update: `npm i baseline-browser-mapping@latest -D`")
    console.warn("different warning")

    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy).toHaveBeenCalledWith("different warning")

    console.warn = originalWarn
  })
})
