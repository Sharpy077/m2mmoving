import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, Server, MonitorDot, Package, ArrowRight } from "lucide-react"
import Link from "next/link"

const services = [
  {
    icon: Building2,
    title: "Office Relocation",
    description:
      "Complete office moves with furniture, equipment, and IT infrastructure. Minimal disruption to your operations.",
    code: "OFC_REL",
    id: "office",
  },
  {
    icon: Server,
    title: "Data Center Migration",
    description:
      "Secure server rack and infrastructure relocation with anti-static handling and careful coordination for mission-critical systems.",
    code: "DC_MIG",
    id: "datacenter",
  },
  {
    icon: MonitorDot,
    title: "IT Equipment Transfer",
    description: "Specialized handling for sensitive electronics, networking gear, and mission-critical hardware.",
    code: "IT_TRF",
    id: "it-equipment",
  },
  {
    icon: Package,
    title: "Asset Management",
    description: "Full asset tagging, tracking, and documentation throughout the entire relocation process.",
    code: "AST_MGT",
    id: "asset-management",
  },
]

export function ServicesSection() {
  return (
    <section id="services" className="w-full py-16 md:py-24">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 max-w-16 bg-primary" />
            <span className="text-xs uppercase tracking-widest text-primary font-mono">// Services</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">OPERATIONAL_MODULES</h2>
          <p className="text-muted-foreground max-w-2xl">
            Comprehensive commercial moving solutions engineered for modern businesses. Select your required service
            module.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <Card key={index} className="group hover:border-primary/50 transition-colors bg-card">
              <CardHeader>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-primary/10 border border-primary/30 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    {service.icon && <service.icon className="w-6 h-6 text-primary" aria-hidden="true" />}
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">[{service.code}]</span>
                </div>
                <CardTitle className="text-lg font-bold text-foreground">{service.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{service.description}</p>
                <Button asChild variant="outline" size="sm" className="w-full group/btn bg-transparent">
                  <Link href={`/quote?service=${service.id}`}>
                    Get Quote
                    <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
