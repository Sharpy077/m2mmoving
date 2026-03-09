import "@testing-library/jest-dom/vitest"
import React from "react"

// Ensure React is available for components compiled with the classic runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).React = React

// Polyfill pointer capture APIs expected by Radix UI components in tests.
// Guard with typeof check since these APIs only exist in browser/dom environments.
if (typeof Element !== "undefined") {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {}
  }
}
