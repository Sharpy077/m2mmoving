import { HeroSection } from "@/components/hero-section"
import { ServicesSection } from "@/components/services-section"
import { StatsSection } from "@/components/stats-section"
import { TechFeaturesSection } from "@/components/tech-features-section"
import { TestimonialsSection } from "@/components/testimonials-section"
import { CTASection } from "@/components/cta-section"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <ServicesSection />
      <TechFeaturesSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </main>
  )
}
