import { Phone, Globe, Key, CheckCircle, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function SettingsPage() {
  const hasTwilioConfig = !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FORWARD_NUMBER_1
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl">M</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground font-mono">SYSTEM_SETTINGS</h1>
                <p className="text-sm text-muted-foreground">M&M Commercial Moving - Configuration</p>
              </div>
            </div>
            <nav className="flex items-center gap-2">
              <Link
                href="/admin"
                className="flex items-center gap-2 px-4 py-2 border border-border hover:bg-muted transition-colors font-mono text-sm"
              >
                LEADS
              </Link>
              <Link
                href="/admin/voicemails"
                className="flex items-center gap-2 px-4 py-2 border border-border hover:bg-muted transition-colors font-mono text-sm"
              >
                VOICEMAILS
              </Link>
              <Link
                href="/admin/settings"
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-mono text-sm"
              >
                SETTINGS
              </Link>
            </nav>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Twilio Configuration */}
        <Card className="border-border bg-card">
          <CardHeader className="border-b border-border">
            <CardTitle className="font-mono text-lg flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary" />
              TWILIO_PHONE_SYSTEM
              {hasTwilioConfig ? (
                <span className="ml-auto flex items-center gap-1 text-green-500 text-sm">
                  <CheckCircle className="w-4 h-4" /> Configured
                </span>
              ) : (
                <span className="ml-auto flex items-center gap-1 text-yellow-500 text-sm">
                  <AlertCircle className="w-4 h-4" /> Setup Required
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="prose prose-invert max-w-none">
              <p className="text-muted-foreground">
                Twilio handles incoming phone calls with business hours routing (7am-5pm Melbourne time), simultaneous
                ring to two mobile numbers, and voicemail with transcription for after-hours calls.
              </p>
            </div>

            <div className="bg-muted/50 border border-border p-4 space-y-4">
              <h3 className="font-mono text-sm text-foreground">// SETUP_INSTRUCTIONS</h3>

              <div className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <span className="text-primary font-mono">01.</span>
                  <div>
                    <p className="text-foreground">Create a Twilio account</p>
                    <a
                      href="https://www.twilio.com/try-twilio"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-xs"
                    >
                      https://www.twilio.com/try-twilio
                    </a>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="text-primary font-mono">02.</span>
                  <div>
                    <p className="text-foreground">Purchase an Australian phone number</p>
                    <p className="text-green-500 text-xs font-mono">✓ Current: +61 3 8820 1801</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="text-primary font-mono">03.</span>
                  <div>
                    <p className="text-foreground">Configure the voice webhook URL</p>
                    <code className="bg-background px-2 py-1 text-xs block mt-1">
                      https://your-domain.com/api/voice/incoming
                    </code>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="text-primary font-mono">04.</span>
                  <div>
                    <p className="text-foreground">Add environment variables to Vercel:</p>
                    <div className="bg-background p-3 mt-2 space-y-1 font-mono text-xs">
                      <div>
                        <span className="text-muted-foreground">TWILIO_ACCOUNT_SID=</span>
                        <span className="text-yellow-500">your_account_sid</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">TWILIO_AUTH_TOKEN=</span>
                        <span className="text-yellow-500">your_auth_token</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">TWILIO_FORWARD_NUMBER_1=</span>
                        <span className="text-yellow-500">+61412345678</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">TWILIO_FORWARD_NUMBER_2=</span>
                        <span className="text-yellow-500">+61498765432</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-muted/30 border border-border p-4">
                <h4 className="font-mono text-xs text-muted-foreground mb-2">BUSINESS_HOURS</h4>
                <p className="text-foreground">7:00 AM - 5:00 PM</p>
                <p className="text-muted-foreground text-sm">Monday - Friday (Melbourne Time)</p>
              </div>
              <div className="bg-muted/30 border border-border p-4">
                <h4 className="font-mono text-xs text-muted-foreground mb-2">CALL_ROUTING</h4>
                <p className="text-foreground">Simultaneous Ring</p>
                <p className="text-muted-foreground text-sm">
                  Both numbers ring at once, first to answer gets the call
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Webhook URLs */}
        <Card className="border-border bg-card">
          <CardHeader className="border-b border-border">
            <CardTitle className="font-mono text-lg flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              WEBHOOK_ENDPOINTS
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3 font-mono text-sm">
              <div className="flex items-center justify-between bg-muted/30 p-3 border border-border">
                <div>
                  <span className="text-muted-foreground">Voice Incoming:</span>
                  <code className="ml-2 text-foreground">/api/voice/incoming</code>
                </div>
                <span className="text-xs text-green-500">POST</span>
              </div>
              <div className="flex items-center justify-between bg-muted/30 p-3 border border-border">
                <div>
                  <span className="text-muted-foreground">Call Status:</span>
                  <code className="ml-2 text-foreground">/api/voice/status</code>
                </div>
                <span className="text-xs text-green-500">POST</span>
              </div>
              <div className="flex items-center justify-between bg-muted/30 p-3 border border-border">
                <div>
                  <span className="text-muted-foreground">Voicemail:</span>
                  <code className="ml-2 text-foreground">/api/voice/voicemail</code>
                </div>
                <span className="text-xs text-green-500">POST</span>
              </div>
              <div className="flex items-center justify-between bg-muted/30 p-3 border border-border">
                <div>
                  <span className="text-muted-foreground">Transcription:</span>
                  <code className="ml-2 text-foreground">/api/voice/transcription</code>
                </div>
                <span className="text-xs text-green-500">POST</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Environment Variables Status */}
        <Card className="border-border bg-card">
          <CardHeader className="border-b border-border">
            <CardTitle className="font-mono text-lg flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              ENVIRONMENT_VARIABLES
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-2">
              {[
                { name: "TWILIO_ACCOUNT_SID", configured: !!process.env.TWILIO_ACCOUNT_SID },
                { name: "TWILIO_AUTH_TOKEN", configured: !!process.env.TWILIO_AUTH_TOKEN },
                { name: "TWILIO_FORWARD_NUMBER_1", configured: !!process.env.TWILIO_FORWARD_NUMBER_1 },
                { name: "TWILIO_FORWARD_NUMBER_2", configured: !!process.env.TWILIO_FORWARD_NUMBER_2 },
                { name: "SUPABASE_URL", configured: !!process.env.SUPABASE_URL },
                { name: "SUPABASE_ANON_KEY", configured: !!process.env.SUPABASE_ANON_KEY },
                { name: "STRIPE_SECRET_KEY", configured: !!process.env.STRIPE_SECRET_KEY },
              ].map((env) => (
                <div
                  key={env.name}
                  className="flex items-center justify-between bg-muted/30 p-3 border border-border font-mono text-sm"
                >
                  <span className="text-foreground">{env.name}</span>
                  {env.configured ? (
                    <span className="text-green-500 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> SET
                    </span>
                  ) : (
                    <span className="text-yellow-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> MISSING
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
