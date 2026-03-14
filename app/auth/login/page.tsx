"use client"

import type React from "react"
import { loginAction } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useState, Suspense, useTransition } from "react"
import { Lock, AlertTriangle, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

function ForgotPasswordLink() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [show, setShow] = useState(false)
  const [isSending, startSending] = useTransition()

  const handleReset = () => {
    if (!email) return
    startSending(async () => {
      const supabase = createClient()
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      setSent(true)
    })
  }

  if (!show) {
    return (
      <button
        type="button"
        onClick={() => setShow(true)}
        className="text-xs text-muted-foreground hover:text-primary font-mono transition-colors"
      >
        FORGOT PASSWORD?
      </button>
    )
  }

  if (sent) {
    return (
      <div className="flex items-center justify-center gap-2 text-xs text-secondary font-mono">
        <CheckCircle2 className="w-4 h-4" />
        Reset link sent — check your email
      </div>
    )
  }

  return (
    <div className="space-y-2 mt-2">
      <p className="text-xs text-muted-foreground font-mono">Enter your email to receive a reset link:</p>
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="admin@example.com.au"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-muted/50 border-border font-mono text-xs h-8"
        />
        <Button
          type="button"
          size="sm"
          onClick={handleReset}
          disabled={isSending || !email}
          className="font-mono text-xs h-8"
        >
          {isSending ? <Loader2 className="w-3 h-3 animate-spin" /> : "SEND"}
        </Button>
      </div>
    </div>
  )
}

function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const searchParams = useSearchParams()
  // Validate redirect to prevent open redirect attacks — only allow known relative paths
  const allowedRedirects = ["/admin", "/admin/voicemails", "/admin/settings", "/admin/agents", "/quote"]
  const rawRedirect = searchParams.get("redirect") || "/admin"
  const redirectTo = allowedRedirects.includes(rawRedirect) ? rawRedirect : "/admin"

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
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  AUTHENTICATING...
                </>
              ) : (
                "LOGIN"
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <ForgotPasswordLink />
          </div>

          <div className="mt-4 pt-4 border-t border-border">
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
