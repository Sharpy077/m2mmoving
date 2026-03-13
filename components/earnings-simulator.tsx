'use client'

import { useState, useMemo } from 'react'
import { calculateEarningsSimulation } from '@/lib/marketplace/earnings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { TrendingUp, DollarSign, Percent } from 'lucide-react'

function fmt(n: number) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(n)
}

export function EarningsSimulator() {
  const [jobsPerMonth, setJobsPerMonth] = useState(8)
  const [avgJobValue, setAvgJobValue] = useState(2800)

  const result = useMemo(
    () => calculateEarningsSimulation({ jobs_per_month: jobsPerMonth, avg_job_value: avgJobValue }),
    [jobsPerMonth, avgJobValue]
  )

  const tierColour = {
    Standard: 'text-blue-600 bg-blue-50 border-blue-200',
    Growth: 'text-purple-700 bg-purple-50 border-purple-200',
    Pro: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  }[result.tier.label] ?? 'text-gray-600 bg-gray-50 border-gray-200'

  return (
    <Card className="shadow-lg border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <TrendingUp className="h-5 w-5 text-primary" />
          Earnings Simulator
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Slide to estimate your monthly take-home on the M2M platform
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sliders */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Jobs per month</span>
              <span className="font-bold text-primary">{jobsPerMonth} jobs</span>
            </div>
            <Slider
              min={1}
              max={50}
              step={1}
              value={[jobsPerMonth]}
              onValueChange={([v]) => setJobsPerMonth(v)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>1</span>
              <span>50</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Average job value</span>
              <span className="font-bold text-primary">{fmt(avgJobValue)}</span>
            </div>
            <Slider
              min={1000}
              max={20000}
              step={100}
              value={[avgJobValue]}
              onValueChange={([v]) => setAvgJobValue(v)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{fmt(1000)}</span>
              <span>{fmt(20000)}</span>
            </div>
          </div>
        </div>

        {/* Tier badge */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${tierColour}`}>
          <Percent className="h-4 w-4" />
          <span>{result.tier.label} tier — {(result.commission_rate * 100).toFixed(0)}% commission</span>
          {result.tier.max_jobs !== null ? (
            <span className="ml-auto text-xs font-normal opacity-75">
              {result.tier.min_jobs}–{result.tier.max_jobs} jobs/mo
            </span>
          ) : (
            <span className="ml-auto text-xs font-normal opacity-75">{result.tier.min_jobs}+ jobs/mo</span>
          )}
        </div>

        {/* Result breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Gross revenue</span>
            <span>{fmt(result.gross_revenue)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Platform fee ({(result.commission_rate * 100).toFixed(0)}%)</span>
            <span className="text-red-500">−{fmt(result.platform_fee)}</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-bold text-lg">
            <span className="flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              Your take-home
            </span>
            <span className="text-emerald-700">{fmt(result.take_home)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Estimated monthly. Actual earnings depend on job completion and platform fees.
          </p>
        </div>

        {/* Tier progression hint */}
        {result.tier.max_jobs !== null && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
            💡 Complete {result.tier.max_jobs + 1}+ jobs/month to unlock the next tier and save more on commission.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
