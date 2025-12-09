import type React from "react"
import type { Metadata } from "next"

import { Analytics } from "@vercel/analytics/next"
import { SkipLink } from "@/components/skip-link"
import "./globals.css"

import { Oxanium, Source_Code_Pro, Source_Serif_4 } from "next/font/google"

// Initialize fonts
const _oxanium = Oxanium({ subsets: ["latin"], weight: ["200", "300", "400", "500", "600", "700", "800"] })
const _sourceCodePro = Source_Code_Pro({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
})
const _sourceSerif4 = Source_Serif_4({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
})

export const metadata: Metadata = {
  title: "M&M Commercial Moving | Tech-Powered Business Relocation",
  description:
    "Precision commercial moving services for offices, data centers, and IT equipment. Zero downtime relocation with real-time tracking and AI-optimized logistics.",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        <SkipLink />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
