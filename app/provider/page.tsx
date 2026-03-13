import Link from 'next/link'
import { CheckCircle, Truck, DollarSign, Star, Zap, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = {
  title: 'Become a Provider | M2M Marketplace',
  description: 'Join the M2M Moving Marketplace. Connect with commercial moving jobs across Australia.',
}

const BENEFITS = [
  {
    icon: Zap,
    title: 'Instant Job Matching',
    description: 'Our AI automatically matches you to suitable commercial moving jobs in your service area.',
  },
  {
    icon: DollarSign,
    title: 'Guaranteed Payments',
    description: 'Funds are held in escrow and automatically released to your bank account after job completion.',
  },
  {
    icon: BarChart3,
    title: 'Grow Your Business',
    description: 'Access a steady stream of commercial jobs without the cost of lead generation or sales teams.',
  },
  {
    icon: Star,
    title: 'Build Your Reputation',
    description: 'Collect verified reviews and ratings that attract more high-value jobs over time.',
  },
]

const STEPS = [
  { step: '1', title: 'Register your company', description: 'Enter your ABN, company details, service areas and insurance info.' },
  { step: '2', title: 'Verify your account', description: 'Our team reviews your registration within 1 business day.' },
  { step: '3', title: 'Connect your bank', description: 'Link your bank account via Stripe for secure, automated payouts.' },
  { step: '4', title: 'Start accepting jobs', description: 'Receive job matches via SMS and email. Accept with one tap.' },
]

export default function ProviderLandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Truck className="h-8 w-8" />
            <span className="text-lg font-semibold">M2M Marketplace for Providers</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Turn your fleet into a commercial moving powerhouse
          </h1>
          <p className="text-xl mb-8 opacity-90">
            Join Australia&apos;s leading B2B moving marketplace. Connect with office relocations,
            warehouse moves, and datacenter migrations — all matched to you automatically.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/provider/signup">Apply to Join</Link>
            </Button>
            <Button size="lg" variant="outline" className="bg-transparent text-primary-foreground border-primary-foreground hover:bg-primary-foreground/10" asChild>
              <Link href="#how-it-works">How it works</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm opacity-75">15% platform commission · No setup fees · Get paid within 24h</p>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Why join the M2M Marketplace?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {BENEFITS.map((benefit) => (
              <Card key={benefit.title}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <benefit.icon className="h-6 w-6 text-primary" />
                    {benefit.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
          <div className="space-y-6">
            {STEPS.map((s) => (
              <div key={s.step} className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                  {s.step}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  <p className="text-muted-foreground">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">What you need to join</h2>
          <div className="space-y-3">
            {[
              'Valid ABN (Australian Business Number)',
              'Public liability insurance ($20M minimum)',
              'Commercial vehicle fleet (any size)',
              'Australian bank account for payouts',
              'At least one full-time driver/mover on staff',
            ].map((req) => (
              <div key={req} className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span>{req}</span>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button size="lg" asChild>
              <Link href="/provider/signup">Start your application</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
