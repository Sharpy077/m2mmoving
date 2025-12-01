import { Truck, Phone, Mail } from "lucide-react"
import Link from "next/link"

export function Footer() {
  return (
    <footer className="py-12 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-primary flex items-center justify-center">
                <Truck className="w-6 h-6 text-primary-foreground" aria-hidden="true" />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">
                M&M<span className="text-primary">_MOVING</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-4">
              Melbourne's tech-powered commercial relocation services. Moving businesses forward with precision,
              security, and zero downtime across Victoria and Australia.
            </p>
            <a
              href="tel:+61388201801"
              className="flex items-center gap-2 text-foreground hover:text-primary transition-colors mb-2"
            >
              <Phone className="w-4 h-4" aria-hidden="true" />
              <span className="font-mono">03 8820 1801</span>
            </a>
            <a
              href="mailto:sales@m2mmoving.au"
              className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
            >
              <Mail className="w-4 h-4" aria-hidden="true" />
              <span className="font-mono">sales@m2mmoving.au</span>
            </a>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-4 uppercase text-sm tracking-wider">Services</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="/#services" className="hover:text-primary transition-colors">
                  Office Relocation
                </a>
              </li>
              <li>
                <a href="/#services" className="hover:text-primary transition-colors">
                  Data Center Migration
                </a>
              </li>
              <li>
                <a href="/#services" className="hover:text-primary transition-colors">
                  IT Equipment
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-4 uppercase text-sm tracking-wider">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="mailto:sales@m2mmoving.au?subject=About Us Inquiry" className="hover:text-primary transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="mailto:sales@m2mmoving.au?subject=Careers Inquiry" className="hover:text-primary transition-colors">
                  Careers
                </a>
              </li>
              <li>
                <a href="/#contact" className="hover:text-primary transition-colors">
                  Contact
                </a>
              </li>
              <li>
                <a href="mailto:sales@m2mmoving.au?subject=Blog Inquiry" className="hover:text-primary transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <Link href="/admin" className="hover:text-primary transition-colors">
                  Admin Portal
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground font-mono">
            © 2025 M&M Commercial Moving Services. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            SYS_VERSION: 2.4.1 | STATUS: <span className="text-primary">OPERATIONAL</span>
          </p>
        </div>

        <div className="border-t border-border mt-6 pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            * A subsidiary of <span className="text-foreground font-medium">Sharp Horizons Technology Pty Ltd</span> |
            ABN: 71 661 027 309
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Website built by{" "}
            <a
              href="https://www.sharphorizons.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground font-medium hover:text-primary transition-colors"
            >
              Sharp Horizons Technology
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
