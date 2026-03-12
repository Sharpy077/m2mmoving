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
}

export default nextConfig
