"use client"

import { useEffect } from "react"

export function ScrollToTop() {
  useEffect(() => {
    const activeElement = document.activeElement as HTMLElement
    if (activeElement && activeElement.blur) {
      activeElement.blur()
    }

    // Scroll to top on mount
    window.scrollTo({ top: 0, left: 0, behavior: "instant" })

    // Also handle any hash navigation
    if (!window.location.hash) {
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }

    const timeoutId = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" })
      // Blur any element that might have been focused
      const focused = document.activeElement as HTMLElement
      if (focused && focused.blur && focused !== document.body) {
        focused.blur()
      }
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [])

  return null
}
