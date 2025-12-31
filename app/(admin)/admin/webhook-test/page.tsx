"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  RefreshCw,
  Trash2,
  CreditCard,
  Webhook,
  Database,
  AlertTriangle,
} from "lucide-react"

import dynamic from "next/dynamic"

const StripeCheckoutSection = dynamic(
  () =>
    import("@/components/stripe-checkout-wrapper").then((mod) => {
      return { default: mod.default }
    }),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
  },
)

interface TestState {
  status: "idle" | "creating" | "paying" | "verifying" | "complete" | "error"
  testId?: string
  leadId?: string
  sessionId?: string
  clientSecret?: string
  error?: string
  verification?: {
    webhookReceived: boolean
    paymentUpdated: boolean
    leadUpdated: boolean
    allChecksPass: boolean
  }
}

export default function WebhookTestPage() {
  const [state, setState] = useState<TestState>({ status: "idle" })
  const [polling, setPolling] = useState(false)
  const [stripeReady, setStripeReady] = useState(false)

  useEffect(() => {
    // Check if Stripe key is available
    if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      setStripeReady(true)
    }
  }, [])

  async function startTest() {
    setState({ status: "creating" })

    try {
      const response = await fetch("/api/stripe/webhook/test", {
        method: "POST",
      })
      const data = await response.json()

      if (!data.success) {
        setState({
          status: "error",
          error: data.error || "Failed to create test session",
        })
        return
      }

      setState({
        status: "paying",
        testId: data.testId,
        leadId: data.leadId,
        sessionId: data.sessionId,
        clientSecret: data.clientSecret,
      })
    } catch (error) {
      setState({
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  const checkVerification = useCallback(async () => {
    if (!state.leadId) return

    try {
      const response = await fetch(`/api/stripe/webhook/test?leadId=${state.leadId}`)
      const data = await response.json()

      if (data.success && data.verification) {
        setState((prev) => ({
          ...prev,
          status: data.verification.allChecksPass ? "complete" : prev.status,
          verification: data.verification,
        }))

        if (data.verification.allChecksPass) {
          setPolling(false)
        }
      }
    } catch {
      // Silent fail for polling
    }
  }, [state.leadId])

  function onPaymentComplete() {
    setState((prev) => ({ ...prev, status: "verifying" }))
    setPolling(true)
  }

  useEffect(() => {
    if (!polling || !state.leadId) return

    const interval = setInterval(checkVerification, 2000)
    return () => clearInterval(interval)
  }, [polling, state.leadId, checkVerification])

  async function cleanup() {
    if (!state.leadId) return

    try {
      await fetch(`/api/stripe/webhook/test?leadId=${state.leadId}`, {
        method: "DELETE",
      })
      setState({ status: "idle" })
    } catch {
      // Silent fail
    }
  }

  function reset() {
    setPolling(false)
    setState({ status: "idle" })
  }

  if (!stripeReady && state.status === "idle") {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Stripe Webhook Verification</h1>
          <p className="text-muted-foreground mt-2">Automated end-to-end test of the Stripe webhook integration</p>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Stripe Not Configured</AlertTitle>
          <AlertDescription>
            The NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable is not set. Please configure Stripe in your
            environment variables.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Stripe Webhook Verification</h1>
        <p className="text-muted-foreground mt-2">Automated end-to-end test of the Stripe webhook integration</p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatusCard
          title="Create Session"
          icon={<CreditCard className="h-5 w-5" />}
          status={
            state.status === "idle"
              ? "pending"
              : state.status === "creating"
                ? "loading"
                : state.sessionId
                  ? "success"
                  : "pending"
          }
        />
        <StatusCard
          title="Process Payment"
          icon={<CreditCard className="h-5 w-5" />}
          status={
            state.status === "paying"
              ? "active"
              : state.status === "verifying" || state.status === "complete"
                ? "success"
                : "pending"
          }
        />
        <StatusCard
          title="Webhook Delivery"
          icon={<Webhook className="h-5 w-5" />}
          status={
            state.status === "verifying" ? "loading" : state.verification?.webhookReceived ? "success" : "pending"
          }
        />
        <StatusCard
          title="Database Updated"
          icon={<Database className="h-5 w-5" />}
          status={state.verification?.allChecksPass ? "success" : "pending"}
        />
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {state.status === "idle" && "Ready to Test"}
            {state.status === "creating" && "Creating Test Session..."}
            {state.status === "paying" && "Complete Test Payment"}
            {state.status === "verifying" && "Verifying Webhook Delivery..."}
            {state.status === "complete" && "Verification Complete!"}
            {state.status === "error" && "Test Failed"}
          </CardTitle>
          <CardDescription>
            {state.status === "idle" && "Click Start Test to create a $1.00 test checkout session"}
            {state.status === "creating" && "Setting up test data and Stripe session"}
            {state.status === "paying" && "Use test card 4242 4242 4242 4242 to complete payment"}
            {state.status === "verifying" && "Waiting for webhook to update database"}
            {state.status === "complete" && "All verification checks passed successfully"}
            {state.status === "error" && state.error}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Idle State */}
          {state.status === "idle" && (
            <div className="text-center py-8">
              <Button size="lg" onClick={startTest}>
                <Play className="mr-2 h-4 w-4" />
                Start Webhook Test
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                This will create a test checkout session for $1.00 AUD
              </p>
            </div>
          )}

          {/* Creating State */}
          {state.status === "creating" && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Payment State - Use dynamic import */}
          {state.status === "paying" && state.clientSecret && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Test Payment</AlertTitle>
                <AlertDescription>
                  Use card number <code className="bg-muted px-1 rounded">4242 4242 4242 4242</code> with any future
                  expiry and CVC
                </AlertDescription>
              </Alert>

              <div className="border rounded-lg p-4 bg-white">
                <StripeCheckoutSection clientSecret={state.clientSecret} onComplete={onPaymentComplete} />
              </div>
            </div>
          )}

          {/* Verifying State */}
          {state.status === "verifying" && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span>Waiting for webhook delivery...</span>
              </div>

              <div className="space-y-2">
                <VerificationItem label="Webhook received" status={state.verification?.webhookReceived} />
                <VerificationItem label="Payment record updated" status={state.verification?.paymentUpdated} />
                <VerificationItem label="Lead record updated" status={state.verification?.leadUpdated} />
              </div>

              <div className="flex justify-center gap-2 pt-4">
                <Button variant="outline" onClick={checkVerification}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Check Now
                </Button>
              </div>
            </div>
          )}

          {/* Complete State */}
          {state.status === "complete" && (
            <div className="space-y-4 py-4">
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Webhook Verified!</AlertTitle>
                <AlertDescription className="text-green-700">
                  The Stripe webhook is working correctly. Payments will update lead records and send confirmation
                  emails.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <VerificationItem label="Webhook received" status={true} />
                <VerificationItem label="Payment record updated" status={true} />
                <VerificationItem label="Lead record updated" status={true} />
              </div>

              <div className="flex justify-center gap-2 pt-4">
                <Button variant="outline" onClick={cleanup}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Cleanup Test Data
                </Button>
                <Button onClick={reset}>Run Another Test</Button>
              </div>
            </div>
          )}

          {/* Error State */}
          {state.status === "error" && (
            <div className="space-y-4 py-4">
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Test Failed</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>

              <div className="flex justify-center">
                <Button onClick={reset}>Try Again</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Details */}
      {state.testId && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-sm">Test Details</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1 font-mono">
            <p>
              <span className="text-muted-foreground">Test ID:</span> {state.testId}
            </p>
            <p>
              <span className="text-muted-foreground">Lead ID:</span> {state.leadId}
            </p>
            <p>
              <span className="text-muted-foreground">Session ID:</span> {state.sessionId}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StatusCard({
  title,
  icon,
  status,
}: {
  title: string
  icon: React.ReactNode
  status: "pending" | "loading" | "active" | "success" | "error"
}) {
  return (
    <Card
      className={
        status === "success"
          ? "border-green-500 bg-green-50"
          : status === "active"
            ? "border-blue-500 bg-blue-50"
            : status === "loading"
              ? "border-yellow-500 bg-yellow-50"
              : status === "error"
                ? "border-red-500 bg-red-50"
                : ""
      }
    >
      <CardContent className="pt-4 text-center">
        <div className="flex justify-center mb-2">
          {status === "loading" ? (
            <Loader2 className="h-5 w-5 animate-spin text-yellow-600" />
          ) : status === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : status === "error" ? (
            <XCircle className="h-5 w-5 text-red-600" />
          ) : (
            <div className={status === "active" ? "text-blue-600" : "text-muted-foreground"}>{icon}</div>
          )}
        </div>
        <p className="text-xs font-medium">{title}</p>
      </CardContent>
    </Card>
  )
}

function VerificationItem({
  label,
  status,
}: {
  label: string
  status?: boolean
}) {
  return (
    <div className="flex items-center justify-between p-2 rounded bg-muted/50">
      <span>{label}</span>
      {status === undefined ? (
        <Badge variant="outline">Pending</Badge>
      ) : status ? (
        <Badge className="bg-green-500">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Pass
        </Badge>
      ) : (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Fail
        </Badge>
      )}
    </div>
  )
}
