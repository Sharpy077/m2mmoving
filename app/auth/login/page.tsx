"use client"

import type React from "react"
import { loginAction } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useState, Suspense, useTransition } from "react"
import { Lock, AlertTriangle, ArrowLeft } from "lucide-react"

function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "/admin"

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await loginAction(formData)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 border border-primary mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-sans tracking-tight">ADMIN ACCESS</h1>
          <p className="text-muted-foreground font-mono text-sm mt-2">M&M COMMERCIAL MOVING // SECURE PORTAL</p>
        </div>

        {/* Login Form */}
        <div className="bg-card border border-border p-6">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border">
            <div className="w-2 h-2 bg-secondary" />
            <span className="font-mono text-xs text-muted-foreground">AUTHENTICATION REQUIRED</span>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-mono text-xs">
                EMAIL
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@mmcommercial.com.au"
                required
                className="bg-muted/50 border-border font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="font-mono text-xs">
                PASSWORD
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="bg-muted/50 border-border font-mono"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive text-destructive text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-mono text-xs">{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-mono"
              disabled={isPending}
            >
              {isPending ? "AUTHENTICATING..." : "LOGIN"}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-border">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground text-sm font-mono transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              RETURN TO MAIN SITE
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground font-mono mt-6">AUTHORIZED PERSONNEL ONLY</p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-muted-foreground font-mono">Loading...</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
