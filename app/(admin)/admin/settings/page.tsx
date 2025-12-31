import type React from "react"
import type { Metadata } from "next"
import { Bell, Mail, Shield, Database, Zap, Globe, CreditCard, Phone } from "lucide-react"

export const metadata: Metadata = {
  title: "Settings | M&M Admin",
  description: "System configuration",
}

function SettingCard({
  icon: Icon,
  title,
  description,
  children,
  color = "white",
}: {
  icon: any
  title: string
  description: string
  children?: React.ReactNode
  color?: string
}) {
  return (
    <div className="bg-white/[0.02] rounded-xl border border-white/10 p-6">
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl bg-${color}-500/10`}>
          <Icon className={`w-6 h-6 text-${color}-400`} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-white/40 mt-1">{description}</p>
          {children && <div className="mt-4">{children}</div>}
        </div>
      </div>
    </div>
  )
}

function Toggle({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm">{label}</span>
      <div className={`w-11 h-6 rounded-full transition-colors ${enabled ? "bg-emerald-500" : "bg-white/20"}`}>
        <div
          className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"} mt-0.5`}
        />
      </div>
    </label>
  )
}

export default function SettingsPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-white/50 mt-1">System configuration and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SettingCard icon={Bell} title="Notifications" description="Configure email and SMS alerts" color="amber">
          <div className="space-y-3">
            <Toggle enabled={true} label="New lead notifications" />
            <Toggle enabled={true} label="Payment confirmations" />
            <Toggle enabled={false} label="Daily summary reports" />
            <Toggle enabled={true} label="Escalation alerts" />
          </div>
        </SettingCard>

        <SettingCard icon={Mail} title="Email Settings" description="Configure email delivery" color="cyan">
          <div className="space-y-3">
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider">From Address</label>
              <input
                type="email"
                defaultValue="notifications@m2mmoving.au"
                className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm"
                readOnly
              />
            </div>
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider">Notification Recipients</label>
              <input
                type="text"
                defaultValue="sales@m2mmoving.au"
                className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm"
                readOnly
              />
            </div>
          </div>
        </SettingCard>

        <SettingCard icon={Shield} title="Security" description="Authentication and access control" color="violet">
          <div className="space-y-3">
            <Toggle enabled={true} label="Two-factor authentication" />
            <Toggle enabled={true} label="Session timeout (30 min)" />
            <Toggle enabled={true} label="IP whitelist" />
          </div>
        </SettingCard>

        <SettingCard icon={Database} title="Data & Storage" description="Database and backup settings" color="emerald">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/60">Database</span>
              <span className="text-emerald-400">Connected</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Storage Used</span>
              <span>2.4 GB / 10 GB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Last Backup</span>
              <span>Today, 3:00 AM</span>
            </div>
          </div>
        </SettingCard>

        <SettingCard
          icon={CreditCard}
          title="Payments (Stripe)"
          description="Payment gateway configuration"
          color="blue"
        >
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/60">Mode</span>
              <span className="text-amber-400">Test Mode</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Webhook Status</span>
              <span className="text-emerald-400">Active</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Deposit Amount</span>
              <span>$200 AUD</span>
            </div>
          </div>
        </SettingCard>

        <SettingCard icon={Phone} title="Twilio Integration" description="SMS and voice call settings" color="rose">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/60">Status</span>
              <span className="text-emerald-400">Connected</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Phone Number</span>
              <span>+61 3 8820 1801</span>
            </div>
            <Toggle enabled={true} label="Voicemail transcription" />
          </div>
        </SettingCard>

        <SettingCard icon={Zap} title="AI Agents" description="Maya and agent configuration" color="fuchsia">
          <div className="space-y-3">
            <Toggle enabled={true} label="Maya (Sales Assistant)" />
            <Toggle enabled={true} label="Auto-escalation" />
            <Toggle enabled={false} label="Hunter (Lead Gen)" />
            <Toggle enabled={false} label="Sentinel (Support)" />
          </div>
        </SettingCard>

        <SettingCard icon={Globe} title="Business Hours" description="Operating schedule" color="slate">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/60">Mon - Fri</span>
              <span>8:00 AM - 6:00 PM AEST</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Saturday</span>
              <span>9:00 AM - 1:00 PM AEST</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Sunday</span>
              <span className="text-white/40">Closed</span>
            </div>
          </div>
        </SettingCard>
      </div>
    </div>
  )
}
