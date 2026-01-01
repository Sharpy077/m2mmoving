/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Type errors are still shown in the IDE
    ignoreBuildErrors: true,
  },
  eslint: {
    // Linting is still done in the IDE
    ignoreDuringBuilds: true,
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
  // Exclude problematic directories
  experimental: {
    serverComponentsExternalPackages: ["stripe", "twilio"],
  },
}

export default nextConfig
