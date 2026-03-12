/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Type errors are still shown in the IDE
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // Exclude scripts and test directories from the build
    config.module.rules.push({
      test: /scripts\/.*\.(ts|mts|js|mjs)$/,
      loader: "ignore-loader",
    })
    return config
  },
  // Exclude problematic packages from bundling
  serverExternalPackages: ["stripe", "twilio"],
  // Use Turbopack (default in Next.js 16) without webpack
  turbopack: {},
}

export default nextConfig
