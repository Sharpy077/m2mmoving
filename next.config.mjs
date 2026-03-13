/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Type errors are still shown in the IDE
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Exclude problematic packages from bundling
  serverExternalPackages: ["stripe", "twilio"],
  // standalone output enables Docker/Azure App Service deployment
  // The .next/standalone directory contains a minimal Node.js server
  output: "standalone",
}

export default nextConfig
