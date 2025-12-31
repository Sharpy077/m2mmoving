import Link from "next/link"
import { ShieldX, ArrowLeft, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 bg-destructive/10 border border-destructive mb-6">
          <ShieldX className="w-10 h-10 text-destructive" />
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold font-sans tracking-tight mb-2">ACCESS DENIED</h1>
        <p className="text-muted-foreground font-mono text-sm mb-6">
          You do not have permission to access the admin portal.
        </p>

        {/* Info Box */}
        <div className="bg-card border border-border p-6 text-left mb-6">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
            <div className="w-2 h-2 bg-secondary" />
            <span className="font-mono text-xs text-muted-foreground">AUTHORIZATION REQUIRED</span>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Your account exists but is not authorized for admin access. Please contact your administrator to request
            access.
          </p>

          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <a
              href="mailto:admin@mmcommercial.com.au?subject=Admin Access Request"
              className="text-primary hover:underline font-mono text-xs"
            >
              admin@mmcommercial.com.au
            </a>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button asChild variant="outline" className="w-full font-mono bg-transparent">
            <Link href="/auth/login">
              <ArrowLeft className="w-4 h-4 mr-2" />
              TRY DIFFERENT ACCOUNT
            </Link>
          </Button>

          <Button asChild variant="ghost" className="w-full font-mono text-muted-foreground">
            <Link href="/">RETURN TO MAIN SITE</Link>
          </Button>
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground font-mono mt-8">M&M COMMERCIAL MOVING // SECURE PORTAL</p>
      </div>
    </div>
  )
}
