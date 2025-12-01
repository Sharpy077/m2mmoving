"use client"

import { CheckCircle2, Mail, Clock, FileText, Phone } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface PaymentConfirmationProps {
  referenceId: string
  depositAmount: number
  estimatedTotal: number
  scheduledDate?: string
  moveType?: string
}

export function PaymentConfirmation({
  referenceId,
  depositAmount,
  estimatedTotal,
  scheduledDate,
  moveType
}: PaymentConfirmationProps) {
  return (
    <div className="space-y-6">
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">
          Booking Confirmed!
        </h3>
        <p className="text-muted-foreground">
          Your deposit has been processed successfully.
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Booking Details
            </h4>
            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reference:</span>
                <span className="font-bold">{referenceId}</span>
              </div>
              {moveType && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service Type:</span>
                  <span>{moveType}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deposit Paid:</span>
                <span className="text-green-500">${depositAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remaining Balance:</span>
                <span>${(estimatedTotal - depositAmount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Estimate:</span>
                <span className="font-bold">${estimatedTotal.toLocaleString()}</span>
              </div>
              {scheduledDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scheduled Date:</span>
                  <span>{new Date(scheduledDate).toLocaleDateString('en-AU', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
              )}
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Confirmation Email</p>
                <p className="text-sm text-muted-foreground">
                  You'll receive a detailed confirmation email within 5 minutes with:
                </p>
                <ul className="text-sm text-muted-foreground mt-1 list-disc list-inside space-y-1">
                  <li>Booking reference number</li>
                  <li>Move details and timeline</li>
                  <li>Contact information for your move coordinator</li>
                  <li>Payment receipt</li>
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">What Happens Next?</p>
                <ol className="text-sm text-muted-foreground mt-1 space-y-1">
                  <li className="flex gap-2">
                    <span className="font-bold">1.</span>
                    <span>Our team will contact you within 24 hours to confirm details</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold">2.</span>
                    <span>We'll schedule a site assessment (if needed)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold">3.</span>
                    <span>You'll receive a final confirmation 48 hours before your move</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Questions?</strong> Contact us at{" "}
              <a href="tel:+61388201801" className="text-primary hover:underline">
                03 8820 1801
              </a>{" "}
              or{" "}
              <a href="mailto:sales@m2mmoving.au" className="text-primary hover:underline">
                sales@m2mmoving.au
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
