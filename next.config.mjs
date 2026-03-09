/** @type {import('next').NextConfig} */

// Content Security Policy — start in report-only mode to surface violations
// before switching to enforcing mode (remove "Report-Only" from the key).
// Tune allowed sources based on CSP violation reports before enforcing.
const cspDirectives = [
  "default-src 'self'",
  // Scripts: Next.js chunks + Stripe JS + Vercel Analytics
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://va.vercel-scripts.com",
  // Styles: self + inline (required for Tailwind/Radix)
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Fonts
  "font-src 'self' https://fonts.gstatic.com",
  // Images: self + data URIs + Stripe
  "img-src 'self' data: https://js.stripe.com",
  // Frames: Stripe embeds only
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  // Connections: Supabase + OpenAI + Stripe + Vercel Analytics
  [
    "connect-src 'self'",
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://*.supabase.co",
    "https://api.openai.com",
    "https://api.stripe.com",
    "https://va.vercel-scripts.com",
    "wss://*.supabase.co",
  ].join(" "),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ")

const nextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // Report-Only: remove "Report-Only" from key to enforce once violations are cleared
          { key: "Content-Security-Policy-Report-Only", value: cspDirectives },
        ],
      },
    ]
  },
}

export default nextConfig
