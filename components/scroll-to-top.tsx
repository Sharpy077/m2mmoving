"use client"

import { useEffect } from "react"

export function ScrollToTop() {
  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0)

    // Also handle any hash navigation
    if (!window.location.hash) {
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }
  }, [])

  return null
}
