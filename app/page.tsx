import { HeroSection } from "@/components/hero-section"
import { TrustBar } from "@/components/trust-bar"
import { ServicesSection } from "@/components/services-section"
import { StatsSection } from "@/components/stats-section"
import { TechFeaturesSection } from "@/components/tech-features-section"
import { TestimonialsSection } from "@/components/testimonials-section"
import { CTASection } from "@/components/cta-section"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { FloatingCTA } from "@/components/floating-cta"

export default function HomePage() {
  return (
    <main id="main-content" className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <TrustBar />
      <StatsSection />
      <ServicesSection />
      <TechFeaturesSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
      <FloatingCTA />
    </main>
  )
}
