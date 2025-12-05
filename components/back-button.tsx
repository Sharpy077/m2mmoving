"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export function BackButton() {
  const handleBack = () => {
    if (typeof window !== "undefined") {
      window.history.back()
    }
  }

  return (
    <Button variant="ghost" onClick={handleBack}>
      <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
      Go Back
    </Button>
  )
}
