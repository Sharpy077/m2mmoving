import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, ArrowLeft, AlertTriangle } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-24 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden="true" />
          </div>
          <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
          <p className="text-muted-foreground mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild>
              <Link href="/">
                <Home className="h-4 w-4 mr-2" aria-hidden="true" />
                Go Home
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/quote">
                Get Quote
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.history.back()
                }
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}
